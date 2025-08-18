/**
 * WAHA WhatsApp Service - HTTP API Wrapper
 * Replaces the complex WhatsAppBaileysService with simple HTTP calls to WAHA microservice
 */

import axios from 'axios';
import { EventEmitter } from 'events';

export interface WAHAMessage {
  id: string;
  body: string;
  from: string;
  fromMe: boolean;
  timestamp: number;
  type: string;
  isGroup: boolean;
  groupName?: string;
  contactName: string;
  chatId: string;
  time: string;
  isMedia: boolean;
}

export interface WAHAChat {
  id: string;
  name: string;
  lastMessage?: string;
  timestamp?: number;
  isGroup: boolean;
  participantCount?: number;
  description?: string;
}

export interface WAHAStatus {
  status: string;
  isReady: boolean;
  qrAvailable: boolean;
  timestamp: string;
}

export interface WAHASession {
  name: string;
  status: 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'STOPPED' | 'FAILED';
  config?: any;
}

class WAHAService extends EventEmitter {
  private static instance: WAHAService | null = null;
  private httpClient: any;
  private wahaBaseUrl: string;
  private defaultSession: string = 'default';
  private isReady = false;
  private connectionStatus = 'disconnected';
  private statusMonitorInterval: NodeJS.Timeout | null = null;
  private lastQrDataUrl: string | null = null;
  private lastQrGeneratedAt: number | null = null;
  private readonly qrReuseWindowMs = 25000; // reuse same QR for up to ~25s
  private readonly qrRequestCooldownMs = 5000; // avoid hammering WAHA

  private constructor() {
    super();
    
    this.wahaBaseUrl = process.env.WAHA_SERVICE_URL || 'https://synapse-waha.onrender.com';
    
    // Get WAHA API key from environment variables
    const wahaApiKey = process.env.WAHA_API_KEY;
    
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    // Add API key authentication if provided
    if (wahaApiKey) {
      headers['X-API-Key'] = wahaApiKey;
      console.log('[WAHA Service] ✅ API key authentication configured');
    } else {
      console.warn('[WAHA Service] ⚠️ No WAHA_API_KEY found - API requests may fail with 401');
    }

    this.httpClient = axios.create({
      baseURL: this.wahaBaseUrl,
      timeout: 30000,
      headers,
    });

    // Setup request interceptors for logging
    this.httpClient.interceptors.request.use((config: any) => {
      console.log(`[WAHA API] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    this.httpClient.interceptors.response.use(
      (response: any) => {
        console.log(`[WAHA API] ✅ ${response.status} ${response.config.url}`);
        return response;
      },
      (error: any) => {
        console.error(`[WAHA API] ❌ ${error.response?.status || 'NETWORK_ERROR'} ${error.config?.url}:`, error.message);
        return Promise.reject(error);
      }
    );

    console.log(`[WAHA Service] Initialized with base URL: ${this.wahaBaseUrl}`);
    
    // Set up event listeners for authentication
    this.on('authenticated', this.handleAuthentication.bind(this));
  }

  /**
   * Handle authentication event - fetch chats automatically
   */
  private async handleAuthentication(authData: any): Promise<void> {
    try {
      console.log('[WAHA Service] 🎉 Handling authentication event:', authData);
      
      // Wait a moment for the session to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to fetch chats to verify the connection is working
      console.log('[WAHA Service] Fetching chats after authentication...');
      const chats = await this.getChats();
      console.log(`[WAHA Service] Successfully fetched ${chats.length} chats after authentication`);
      
      // Emit chats updated event
      this.emit('chats_updated', {
        groups: chats.filter(chat => chat.isGroup),
        privateChats: chats.filter(chat => !chat.isGroup),
        totalCount: chats.length
      });
      
      // Broadcast via Socket.IO if available
      const io_instance = (global as any).io;
      if (io_instance) {
        console.log('[WAHA Service] Broadcasting chats update via Socket.IO');
        io_instance.emit('whatsapp:chats_updated', {
          groups: chats.filter(chat => chat.isGroup),
          privateChats: chats.filter(chat => !chat.isGroup),
          totalCount: chats.length
        });
      }
      
    } catch (error) {
      console.error('[WAHA Service] ❌ Error handling authentication:', error);
    }
  }

  public static getInstance(): WAHAService {
    if (!WAHAService.instance) {
      WAHAService.instance = new WAHAService();
    }
    return WAHAService.instance;
  }

  /**
   * Initialize WAHA service - starts the default session
   */
  async initialize(): Promise<void> {
    try {
      console.log('[WAHA Service] Initializing...');
      
      // Check if WAHA service is running
      await this.healthCheck();
      
      // Start default session (don't fail initialization if this fails)
      try {
        await this.startSession();
        
        // Check session status
        const status = await this.getSessionStatus();
        this.connectionStatus = status.status;
        this.isReady = status.status === 'WORKING';
        
        console.log(`[WAHA Service] ✅ Initialized. Status: ${status.status}`);
      } catch (sessionError) {
        console.warn('[WAHA Service] ⚠️ Failed to start/check session during initialization:', sessionError);
        // Service is healthy but session failed - still usable for QR generation
        this.connectionStatus = 'session_failed';
        this.isReady = true; // Still mark as ready for basic operations
      }
      
      this.emit('ready');
      
      // Start status monitoring after successful initialization
      this.startStatusMonitoring();
      
      // Try to initialize default session immediately
      this.initializeDefaultSession();
      
    } catch (error) {
      console.error('[WAHA Service] ❌ Initialization failed:', error);
      this.connectionStatus = 'failed';
      this.isReady = false;
      this.emit('error', error);
      
      // Don't throw initialization errors - allow fallback to Baileys
      console.log('[WAHA Service] 🔄 Will allow fallback to Baileys service');
    }
  }

  /**
   * Start periodic status monitoring
   */
  public startStatusMonitoring(): void {
    // Clear any existing monitor
    this.stopStatusMonitoring();
    
    console.log('[WAHA Service] Starting periodic status monitoring');
    this.statusMonitorInterval = setInterval(async () => {
      try {
        await this.getStatus(); // This will emit events if status changes
      } catch (error) {
        console.error('[WAHA Service] Error during status monitoring:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Stop periodic status monitoring
   */
  public stopStatusMonitoring(): void {
    if (this.statusMonitorInterval) {
      console.log('[WAHA Service] Stopping periodic status monitoring');
      clearInterval(this.statusMonitorInterval);
      this.statusMonitorInterval = null;
    }
  }

  /**
   * Initialize default session (create if doesn't exist)
   */
  private async initializeDefaultSession(): Promise<void> {
    try {
      console.log('[WAHA Service] Initializing default session...');
      
      // Wait a moment for WAHA service to be fully ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const session = await this.startSession();
      console.log(`[WAHA Service] ✅ Default session initialized with status: ${session.status}`);
    } catch (error) {
      console.error('[WAHA Service] ⚠️ Could not initialize default session (will try again later):', error);
      
      // Retry after 10 seconds
      setTimeout(() => {
        this.initializeDefaultSession();
      }, 10000);
    }
  }

  /**
   * Health check - verify WAHA service is running
   */
  async healthCheck(): Promise<boolean> {
    console.log(`[WAHA Service] 🔍 Starting health check for: ${this.wahaBaseUrl}`);
    
    // Try multiple health check endpoints with longer timeouts for network stability
    const healthEndpoints = ['/api/version', '/api/sessions', '/ping', '/'];
    let lastError = null;
    
    for (const endpoint of healthEndpoints) {
      try {
        console.log(`[WAHA Service] Trying health check: ${this.wahaBaseUrl}${endpoint}`);
        const response = await this.httpClient.get(endpoint, {
          timeout: 20000, // Increased timeout for Render.com network delays
          validateStatus: (status: number) => status < 500, // Accept 4xx as "service is running"
        });
        
        console.log(`[WAHA Service] Response from ${endpoint}: ${response.status} - ${response.statusText}`);
        
        if (response.status < 500) { // Service is running even if endpoint doesn't exist
          console.log(`[WAHA Service] ✅ Health check passed using ${endpoint} (status: ${response.status})`);
          this.isReady = true;
          this.connectionStatus = 'connected';
          return true;
        }
      } catch (error: any) {
        lastError = error;
        const errorMsg = error?.response?.status 
          ? `HTTP ${error.response.status}: ${error.response.statusText}`
          : error.code 
          ? `Network Error: ${error.code}`
          : error.message || 'Unknown error';
        
        console.log(`[WAHA Service] Health check ${endpoint} failed: ${errorMsg}`);
        
        // If we get a 404 or 405, service is running but endpoint doesn't exist
        if (error?.response?.status === 404 || error?.response?.status === 405) {
          console.log(`[WAHA Service] ✅ Service is running (got ${error.response.status} for ${endpoint})`);
          this.isReady = true;
          this.connectionStatus = 'connected';
          return true;
        }
      }
    }
    
    console.error('[WAHA Service] ❌ All health check endpoints failed');
    console.error('[WAHA Service] Last error:', lastError?.message || lastError);
    
    this.isReady = false;
    this.connectionStatus = 'disconnected';
    throw new Error(`WAHA service is not responding: ${lastError?.message || 'All health checks failed'}`);
  }

  /**
   * Start a WhatsApp session
   */
  async startSession(sessionName: string = this.defaultSession): Promise<WAHASession> {
    try {
      console.log(`[WAHA Service] Starting session management for '${sessionName}'`);
      
      // Prepare webhook URL at the top level to avoid scope issues
      const webhookUrl = process.env.BACKEND_URL || 'https://synapse-backend-7lq6.onrender.com';
      const fullWebhookUrl = `${webhookUrl}/api/v1/waha/webhook`;
      console.log(`[WAHA Service] 🔧 FIXED: Using BACKEND webhook URL: ${fullWebhookUrl}`);
      
      // First, try to get existing session and check its status
      let sessionExists = false;
      let sessionData = null;
      
      try {
        const existingSession = await this.httpClient.get(`/api/sessions/${sessionName}`);
        sessionExists = true;
        sessionData = existingSession.data;
        console.log(`[WAHA Service] Session '${sessionName}' exists with status: ${sessionData?.status || 'unknown'}`);
        
        // If session is stopped, we need to start it
        if (sessionData?.status === 'STOPPED') {
          console.log(`[WAHA Service] Session '${sessionName}' is stopped, attempting to start...`);
          await this.httpClient.post(`/api/sessions/${sessionName}/start`);
          console.log(`[WAHA Service] ✅ Session '${sessionName}' started from stopped state`);
          return sessionData;
        } else if (sessionData?.status === 'WORKING' || sessionData?.status === 'SCAN_QR_CODE' || sessionData?.status === 'STARTING') {
          console.log(`[WAHA Service] ✅ Session '${sessionName}' is already active (${sessionData?.status})`);
          return sessionData;
        }
      } catch (getError: any) {
        if (getError.response?.status === 404) {
          console.log(`[WAHA Service] Session '${sessionName}' doesn't exist, will create new one`);
          sessionExists = false;
        } else {
          console.error(`[WAHA Service] Unexpected error checking session:`, getError);
          throw getError;
        }
      }

      // If session doesn't exist, create it
      if (!sessionExists) {
        console.log(`[WAHA Service] Creating new session '${sessionName}'...`);
        const engine = process.env.WAHA_ENGINE?.trim();
        const createPayload: any = { name: sessionName };
        if (engine) {
          createPayload.engine = engine;
          console.log(`[WAHA Service] Using configured WAHA engine: ${engine}`);
        }
        console.log(`[WAHA Service] Making POST request to /api/sessions with payload:`, createPayload);
        
        // Create session (minimal payload; webhooks added after successful start)
        const response = await this.httpClient.post('/api/sessions', createPayload);
        
        console.log(`[WAHA Service] ✅ Session creation response:`, response.status);
        console.log(`[WAHA Service] 📋 Full response data:`, JSON.stringify(response.data, null, 2));
        sessionData = response.data;
        sessionExists = true;
        
        // CRITICAL: Wait for WAHA to initialize the session
        console.log(`[WAHA Service] ⏳ Waiting 3 seconds for WAHA to initialize session...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verify session was actually created by listing all sessions
        try {
          const allSessions = await this.httpClient.get('/api/sessions');
          console.log(`[WAHA Service] 📋 All sessions after creation:`, allSessions.data);
        } catch (listError) {
          console.log(`[WAHA Service] ⚠️ Could not list sessions:`, listError);
        }
      }
      
      // Always try to start the session after creation with retry logic
      if (sessionExists) {
        let startSuccess = false;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (!startSuccess && attempts < maxAttempts) {
          attempts++;
          try {
            console.log(`[WAHA Service] 🚀 Starting session '${sessionName}' (attempt ${attempts}/${maxAttempts}) with POST /api/sessions/${sessionName}/start`);
            
            // First verify session exists before starting
            const sessionCheck = await this.httpClient.get(`/api/sessions/${sessionName}`);
            console.log(`[WAHA Service] ✅ Session exists before start attempt:`, sessionCheck.data);
            
            const startResponse = await this.httpClient.post(`/api/sessions/${sessionName}/start`);
            console.log(`[WAHA Service] ✅ Session '${sessionName}' start response:`, startResponse.status, startResponse.data);
            startSuccess = true;
            
          } catch (startError: any) {
            console.error(`[WAHA Service] ❌ Failed to start session '${sessionName}' (attempt ${attempts}):`, startError.message);
            console.error(`[WAHA Service] Start error details:`, {
              status: startError?.response?.status,
              statusText: startError?.response?.statusText,
              data: startError?.response?.data
            });
            
            if (attempts < maxAttempts) {
              console.log(`[WAHA Service] ⏳ Waiting 2 seconds before retry...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
        
        if (!startSuccess) {
          console.error(`[WAHA Service] ❌ Failed to start session after ${maxAttempts} attempts`);
        } else {
          // After successful start, add webhooks
          try {
            console.log(`[WAHA Service] 🔗 Adding webhooks to session '${sessionName}'...`);
            await this.httpClient.post(`/api/sessions/${sessionName}/config`, {
              webhooks: [
                {
                  url: fullWebhookUrl,
                  events: ['session.status', 'message'],
                  hmac: null,
                  retries: {
                    delaySeconds: 2,
                    attempts: 15
                  }
                }
              ]
            });
            console.log(`[WAHA Service] ✅ Webhooks added successfully`);
          } catch (webhookError) {
            console.error(`[WAHA Service] ⚠️ Failed to add webhooks (non-critical):`, webhookError);
          }
        }
      }
      
      // Ensure we return proper session data
      if (!sessionData || !sessionData.name) {
        console.log(`[WAHA Service] ⚠️ Session data incomplete, fetching fresh status...`);
        try {
          sessionData = await this.getSessionStatus(sessionName);
        } catch (fetchError) {
          console.error(`[WAHA Service] ❌ Could not fetch session status:`, fetchError);
          // Return minimal session data
          sessionData = { name: sessionName, status: 'STARTING' };
        }
      }
      
      return sessionData;
    } catch (error: any) {
      // Handle "already exists" error gracefully
      if (error.response?.status === 422 && error.response?.data?.message?.includes('already exists')) {
        console.log(`[WAHA Service] ✅ Session '${sessionName}' already exists (422 handled)`);
        // Try to get the existing session and start it if needed
        try {
          const existingSession = await this.httpClient.get(`/api/sessions/${sessionName}`);
          const sessionData = existingSession.data;
          
          // If it's stopped, start it
          if (sessionData?.status === 'STOPPED') {
            await this.httpClient.post(`/api/sessions/${sessionName}/start`);
            console.log(`[WAHA Service] ✅ Restarted stopped session '${sessionName}'`);
          }
          
          return sessionData;
        } catch (getError) {
          console.error(`[WAHA Service] ❌ Could not retrieve existing session:`, getError);
        }
      }
      
      console.error(`[WAHA Service] ❌ Failed to start session '${sessionName}':`, error);
      throw error;
    }
  }

  /**
   * Get session status
   */
  async getSessionStatus(sessionName: string = this.defaultSession): Promise<WAHASession> {
    try {
      const response = await this.httpClient.get(`/api/sessions/${sessionName}`);
      return response.data;
    } catch (error: any) {
      // If session doesn't exist (404), return a default status indicating it needs to be created
      if (error.response?.status === 404) {
        console.log(`[WAHA Service] Session '${sessionName}' does not exist, needs to be created`);
        return {
          name: sessionName,
          status: 'STOPPED'
        };
      }
      // Treat transient upstream failures (5xx, network errors) as non-fatal: report STOPPED
      const statusCode = error.response?.status;
      if (!statusCode || statusCode >= 500) {
        console.warn(`[WAHA Service] ⚠️ Transient error getting session '${sessionName}' (status: ${statusCode || 'NETWORK_ERROR'}) → returning STOPPED`);
        return {
          name: sessionName,
          status: 'STOPPED'
        };
      }
      console.error(`[WAHA Service] ❌ Failed to get session status for '${sessionName}':`, error);
      throw error;
    }
  }

  /**
   * Get QR code for session (following WAHA API documentation)
   */
  async getQRCode(sessionName: string = this.defaultSession, force: boolean = false): Promise<string> {
    console.log(`[WAHA Service] Starting QR code generation for session '${sessionName}', force=${force}`);
    
    try {
      // Throttle QR requests to avoid device-link rate limits
      const now = Date.now();
      if (!force && this.lastQrGeneratedAt && now - this.lastQrGeneratedAt < this.qrRequestCooldownMs) {
        console.log('[WAHA Service] ⏳ Throttling QR requests; returning recent QR');
        if (this.lastQrDataUrl) return this.lastQrDataUrl;
      }

      // Reuse a fresh QR within a short window to avoid regenerating constantly
      if (!force && this.lastQrGeneratedAt && now - this.lastQrGeneratedAt < this.qrReuseWindowMs && this.lastQrDataUrl) {
        console.log('[WAHA Service] 🔁 Reusing cached QR within reuse window');
        return this.lastQrDataUrl;
      }

      // Ensure session exists and is in a proper state for QR
      console.log(`[WAHA Service] Ensuring session '${sessionName}' exists and is configured...`);
      let current = await this.getSessionStatus(sessionName);
      if (current.status === 'STOPPED' || current.status === 'FAILED') {
        await this.startSession(sessionName);
        current = await this.getSessionStatus(sessionName);
      }
      
      // Wait for session to reach SCAN_QR_CODE state with longer timeout
      console.log(`[WAHA Service] Waiting for session '${sessionName}' to reach QR ready state...`);
      await this.waitForSessionState(sessionName, ['SCAN_QR_CODE'], 30000); // 30 seconds for stability
      
      // Get QR code using WAHA's proper endpoint: GET /api/{session}/auth/qr (per official docs)
      console.log(`[WAHA Service] Requesting QR code from GET /api/${sessionName}/auth/qr`);
      const response = await this.httpClient.get(`/api/${sessionName}/auth/qr`, {
        responseType: 'arraybuffer',
        timeout: 15000, // 15 second timeout for QR generation
        validateStatus: (status: number) => status === 200 // Only accept 200 status
      });
      
      console.log(`[WAHA Service] QR code response received, status: ${response.status}`);
      
      if (response.data && response.data.byteLength > 0) {
        const base64 = Buffer.from(response.data).toString('base64');
        console.log(`[WAHA Service] ✅ QR code converted to base64, length: ${base64.length}`);
        const dataUrl = `data:image/png;base64,${base64}`;
        this.lastQrDataUrl = dataUrl;
        this.lastQrGeneratedAt = Date.now();
        return dataUrl;
      } else {
        throw new Error('Empty QR code response from WAHA service');
      }
    } catch (error: any) {
      console.error(`[WAHA Service] ❌ Failed to get QR code for '${sessionName}':`, error);
      console.error(`[WAHA Service] Error details:`, {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data?.toString?.() || error?.response?.data
      });
      
      // Handle specific error cases
      if (error?.response?.status === 422) {
        throw new Error('Session is not ready for QR code generation. Please restart the session.');
      } else if (error?.response?.status === 404) {
        throw new Error('QR code endpoint not found. Please check WAHA service configuration.');
      } else if (error?.response?.status === 502) {
        throw new Error('WAHA service is not responding. Please check service availability.');
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get QR code: ${errorMessage}`);
    }
  }

  /**
   * Send text message
   */
  async sendMessage(chatId: string, text: string, sessionName: string = this.defaultSession): Promise<any> {
    try {
      console.log(`[WAHA Service] Sending message to ${chatId} in session '${sessionName}'...`);
      
      // WAHA API structure: POST /api/{session}/sendText
      const response = await this.httpClient.post(`/api/${sessionName}/sendText`, {
        chatId,
        text
      });
      
      console.log(`[WAHA Service] ✅ Message sent to ${chatId}`);
      return response.data;
    } catch (error: any) {
      console.error(`[WAHA Service] ❌ Failed to send message to ${chatId}:`, error.response?.status, error.response?.data);
      throw error;
    }
  }

  /**
   * Send media message
   */
  async sendMedia(chatId: string, mediaUrl: string, caption?: string, sessionName: string = this.defaultSession): Promise<any> {
    try {
      console.log(`[WAHA Service] Sending media to ${chatId} in session '${sessionName}'...`);
      
      // WAHA API structure: POST /api/{session}/sendFile
      const response = await this.httpClient.post(`/api/${sessionName}/sendFile`, {
        chatId,
        file: {
          url: mediaUrl
        },
        caption
      });
      
      console.log(`[WAHA Service] ✅ Media sent to ${chatId}`);
      return response.data;
    } catch (error: any) {
      console.error(`[WAHA Service] ❌ Failed to send media to ${chatId}:`, error.response?.status, error.response?.data);
      throw error;
    }
  }

  /**
   * Get chats
   */
  async getChats(sessionName: string = this.defaultSession): Promise<WAHAChat[]> {
    try {
      console.log(`[WAHA Service] Getting chats for session '${sessionName}'...`);
      
      // Check session status first
      const sessionStatus = await this.getSessionStatus(sessionName);
      console.log(`[WAHA Service] Session '${sessionName}' status: ${sessionStatus.status}`);
      
      if (sessionStatus.status !== 'WORKING') {
        console.log(`[WAHA Service] Session not in WORKING status (${sessionStatus.status}), returning empty chats`);
        return [];
      }
      
      // Prefer overview endpoint first for richer data (per WAHA docs)
      let response: any;
      try {
        response = await this.httpClient.get(`/api/${sessionName}/chats/overview`, {
          timeout: 15000
        });
        console.log(`[WAHA Service] Using chats overview endpoint`);
      } catch (e) {
        console.log(`[WAHA Service] Chats overview not available, falling back to /chats`);
        response = await this.httpClient.get(`/api/${sessionName}/chats`, {
          timeout: 15000
        });
      }
      
      console.log(`[WAHA Service] Received ${response.data.length} chats`);
      
      return response.data.map((chat: any) => ({
        id: chat.id,
        name: chat.name || chat.subject || chat.title || chat.id,
        // Robust group detection: WAHA may omit isGroup. Treat *@g.us as group.
        isGroup: Boolean(chat.isGroup) || (typeof chat.id === 'string' && chat.id.includes('@g.us')),
        lastMessage: chat.lastMessage?.body,
        timestamp: chat.lastMessage?.timestamp,
        participantCount: chat.participantCount
      }));
    } catch (error: any) {
      console.error(`[WAHA Service] ❌ Failed to get chats for '${sessionName}':`, error.response?.status, error.response?.data);
      
      // Handle specific 422 error for session not ready
      if (error.response?.status === 422) {
        console.log(`[WAHA Service] Session not ready (422), returning empty chats`);
        return [];
      }
      
      // Return empty array instead of throwing to prevent 500 errors
      return [];
    }
  }

  /**
   * Get groups using WAHA groups endpoint (compliant), fallback to filtering chats
   */
  async getGroups(sessionName: string = this.defaultSession): Promise<WAHAChat[]> {
    try {
      // Ensure session is working
      const sessionStatus = await this.getSessionStatus(sessionName);
      if (sessionStatus.status !== 'WORKING') {
        return [];
      }
      try {
        const res = await this.httpClient.get(`/api/${sessionName}/groups`);
        console.log(`[WAHA Service] Received ${res.data.length} groups`);
        return res.data.map((g: any) => ({
          id: g.id || g.chatId || g.groupId,
          name: g.name || g.subject || g.title || g.id,
          isGroup: true,
          lastMessage: g.lastMessage?.body,
          timestamp: g.lastMessage?.timestamp,
          participantCount: g.participants?.length || g.participantCount
        }));
      } catch (e: any) {
        if (e.response?.status === 404) {
          console.log(`[WAHA Service] /groups endpoint not available, falling back to chats filter`);
        } else {
          console.warn(`[WAHA Service] Groups endpoint error, falling back to chats filter`, e.message);
        }
        const chats = await this.getChats(sessionName);
        return chats.filter(c => c.isGroup || (typeof c.id === 'string' && c.id.includes('@g.us')));
      }
    } catch (err) {
      console.error('[WAHA Service] Failed to get groups:', err);
      return [];
    }
  }

  /**
   * Request WAHA to refresh groups (best effort)
   */
  async refreshGroups(sessionName: string = this.defaultSession): Promise<void> {
    try {
      await this.httpClient.post(`/api/${sessionName}/groups/refresh`);
      console.log('[WAHA Service] Groups refresh requested');
    } catch (e) {
      console.log('[WAHA Service] Groups refresh not available, skipping');
    }
  }

  /**
   * Get messages from chat
   */
  async getMessages(chatId: string, limit: number = 50, sessionName: string = this.defaultSession): Promise<WAHAMessage[]> {
    try {
      console.log(`[WAHA Service] Getting messages for chat '${chatId}' in session '${sessionName}'...`);
      
      // Check session status first
      const sessionStatus = await this.getSessionStatus(sessionName);
      console.log(`[WAHA Service] Session '${sessionName}' status: ${sessionStatus.status}`);
      
      if (sessionStatus.status !== 'WORKING') {
        console.log(`[WAHA Service] Session not in WORKING status (${sessionStatus.status}), returning empty messages`);
        return [];
      }
      
      // WAHA API endpoint structure: /api/{session}/chats/{chatId}/messages
      const response = await this.httpClient.get(`/api/${sessionName}/chats/${encodeURIComponent(chatId)}/messages`, {
        params: { limit },
        timeout: 20000
      });
      
      console.log(`[WAHA Service] Received ${response.data.length} messages`);
      
      return response.data.map((msg: any) => ({
        id: msg.id,
        body: msg.body || '',
        from: msg.from,
        fromMe: msg.fromMe || false,
        timestamp: msg.timestamp,
        type: msg.type || 'text',
        isGroup: msg.chatId?.includes('@g.us') || false,
        contactName: msg.notifyName || msg.from,
        chatId: msg.chatId,
        time: new Date(msg.timestamp * 1000).toLocaleTimeString(),
        isMedia: msg.type !== 'text'
      }));
    } catch (error: any) {
      console.error(`[WAHA Service] ❌ Failed to get messages for ${chatId}:`, error.response?.status, error.response?.data);
      
      // Handle specific 422 error for session not ready
      if (error.response?.status === 422) {
        console.log(`[WAHA Service] Session not ready (422), returning empty messages`);
        return [];
      }
      
      // Return empty array instead of throwing to prevent 500 errors
      return [];
    }
  }

  /**
   * Get recent messages from all chats
   */
  async getRecentMessages(limit: number = 50, sessionName: string = this.defaultSession): Promise<WAHAMessage[]> {
    try {
      console.log(`[WAHA Service] Getting recent messages from all chats in session '${sessionName}'...`);
      
      // Check session status first
      const sessionStatus = await this.getSessionStatus(sessionName);
      console.log(`[WAHA Service] Session '${sessionName}' status: ${sessionStatus.status}`);
      
      if (sessionStatus.status !== 'WORKING') {
        console.log(`[WAHA Service] Session not in WORKING status (${sessionStatus.status}), returning empty messages`);
        return [];
      }
      
      // Get all chats first
      const chats = await this.getChats(sessionName);
      
      if (!chats || chats.length === 0) {
        console.log(`[WAHA Service] No chats found, returning empty messages`);
        return [];
      }
      
      // Get messages from each chat (limit per chat to avoid overwhelming)
      const messagesPerChat = Math.max(1, Math.floor(limit / Math.min(chats.length, 10)));
      const allMessages: WAHAMessage[] = [];
      
      // Process first 10 chats with most recent activity
      const sortedChats = chats
        .filter(chat => chat.timestamp) // Only chats with recent activity
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 10);
      
      console.log(`[WAHA Service] Getting messages from ${sortedChats.length} most active chats (${messagesPerChat} messages per chat)`);
      
      for (const chat of sortedChats) {
        try {
          const chatMessages = await this.getMessages(chat.id, messagesPerChat, sessionName);
          allMessages.push(...chatMessages);
          
          // Stop if we've reached the limit
          if (allMessages.length >= limit) {
            break;
          }
        } catch (chatError) {
          console.warn(`[WAHA Service] Failed to get messages from chat ${chat.id}:`, chatError);
          // Continue with other chats
        }
      }
      
      // Sort by timestamp descending and limit results
      const sortedMessages = allMessages
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
      
      console.log(`[WAHA Service] Collected ${sortedMessages.length} recent messages from ${sortedChats.length} chats`);
      return sortedMessages;
      
    } catch (error: any) {
      console.error(`[WAHA Service] ❌ Failed to get recent messages:`, error.response?.status, error.response?.data);
      return [];
    }
  }

  /**
   * Stop session
   */
  async stopSession(sessionName: string = this.defaultSession): Promise<void> {
    try {
      await this.httpClient.delete(`/api/sessions/${sessionName}`);
      console.log(`[WAHA Service] ✅ Session '${sessionName}' stopped`);
      this.connectionStatus = 'disconnected';
      this.isReady = false;
      // Invalidate cached QR on stop
      this.lastQrDataUrl = null;
      this.lastQrGeneratedAt = null;
    } catch (error: any) {
      // Don't throw error if session doesn't exist (404)
      if (error?.response?.status === 404) {
        console.log(`[WAHA Service] Session '${sessionName}' was already deleted`);
        this.connectionStatus = 'disconnected';
        this.isReady = false;
        this.lastQrDataUrl = null;
        this.lastQrGeneratedAt = null;
        return;
      }
      console.error(`[WAHA Service] ❌ Failed to stop session '${sessionName}':`, error);
      throw error;
    }
  }

  /**
   * Restart session by stopping and starting it
   */
  async restartSession(sessionName: string = this.defaultSession): Promise<WAHASession> {
    try {
      console.log(`[WAHA Service] Restarting session '${sessionName}'...`);
      
      // Stop existing session (ignore errors if it doesn't exist)
      try {
        await this.stopSession(sessionName);
        console.log(`[WAHA Service] Session '${sessionName}' stopped for restart`);
      } catch (stopError) {
        console.log(`[WAHA Service] Stop failed during restart (session may not exist):`, stopError);
      }
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Start new session
      const newSession = await this.startSession(sessionName);
      console.log(`[WAHA Service] ✅ Session '${sessionName}' restarted with status: ${newSession.status}`);
      // Invalidate cached QR on restart
      this.lastQrDataUrl = null;
      this.lastQrGeneratedAt = null;
      
      return newSession;
    } catch (error) {
      console.error(`[WAHA Service] ❌ Failed to restart session '${sessionName}':`, error);
      throw error;
    }
  }

  /**
   * Get service status (compatible with old interface)
   */
  async getStatus(): Promise<WAHAStatus> {
    try {
      // Get real-time session status from WAHA
      let sessionStatus = await this.getSessionStatus();
      const previousConnectionStatus = this.connectionStatus;
      const previousIsReady = this.isReady;
      
      // If session doesn't exist (STOPPED status from our 404 handler), try to create it
      if (sessionStatus.status === 'STOPPED' && sessionStatus.name === this.defaultSession) {
        console.log('[WAHA Service] 🚀 Session is STOPPED (404), FORCE creating session now...');
        try {
          const createdSession = await this.startSession();
          sessionStatus = createdSession;
          console.log(`[WAHA Service] ✅ FORCE session created/started with status: ${sessionStatus.status}`);
        } catch (createError: any) {
          console.error('[WAHA Service] ❌ FORCE session creation failed:', createError);
          console.error('[WAHA Service] Create error details:', {
            status: createError?.response?.status,
            statusText: createError?.response?.statusText,
            data: createError?.response?.data,
            message: createError?.message
          });
          // Continue with STOPPED status
        }
      }
      
      this.connectionStatus = sessionStatus.status;
      this.isReady = sessionStatus.status === 'WORKING';
      
      // Detect authentication state change
      if (!previousIsReady && this.isReady && sessionStatus.status === 'WORKING') {
        console.log('[WAHA Service] 🎉 Authentication detected! Session transitioned to WORKING');
        this.emit('authenticated', {
          method: 'qr',
          sessionStatus: sessionStatus.status,
          timestamp: new Date().toISOString()
        });
        
        // Also emit general status change
        this.emit('status_change', {
          status: sessionStatus.status,
          authenticated: true,
          connected: true,
          isReady: true,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        status: sessionStatus.status,
        isReady: sessionStatus.status === 'WORKING',
        qrAvailable: sessionStatus.status === 'SCAN_QR_CODE',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[WAHA Service] Error getting status:', error);
      return {
        status: 'FAILED',
        isReady: false,
        qrAvailable: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Webhook handler for WAHA events (following WAHA documentation event structure)
   */
  handleWebhook(payload: any): void {
    try {
      console.log('[WAHA Service] Webhook received:', payload);
      
      // WAHA event structure: { id, timestamp, event, session, payload }
      const eventType = payload.event;
      const sessionName = payload.session;
      const eventData = payload.payload;
      const eventId = payload.id;
      const eventTimestamp = payload.timestamp;
      
      console.log(`[WAHA Service] Processing event '${eventType}' for session '${sessionName}'`);
      
      switch (eventType) {
        case 'message':
          this.emit('message', eventData);
          // Process image messages for group monitoring
          this.processImageForGroupMonitoring(eventData);
          break;
          
        case 'session.status':
          const previousIsReady = this.isReady;
          const newStatus = eventData.status;
          
          this.connectionStatus = newStatus;
          this.isReady = newStatus === 'WORKING';
          
          console.log('[WAHA Service] Session status change:', {
            eventId,
            sessionName,
            previousIsReady,
            newStatus,
            isNowReady: this.isReady,
            timestamp: eventTimestamp
          });
          
          // Emit authentication event if we just became authenticated
          if (!previousIsReady && this.isReady && newStatus === 'WORKING') {
            console.log('[WAHA Service] 🎉 Authentication detected via webhook! Session is now WORKING');
            this.emit('authenticated', {
              method: 'qr',
              sessionStatus: newStatus,
              sessionName: sessionName,
              eventId: eventId,
              timestamp: new Date().toISOString()
            });
            
            // Broadcast to Socket.IO if available
            const io_instance = (global as any).io;
            if (io_instance) {
              console.log('[WAHA Service] Broadcasting authentication via Socket.IO');
              io_instance.emit('whatsapp:status', {
                connected: true,
                authenticated: true,
                isReady: true,
                authMethod: 'qr',
                serviceType: 'waha',
                sessionName: sessionName,
                timestamp: new Date().toISOString()
              });
            }
          }
          
          this.emit('status_change', {
            ...eventData,
            authenticated: this.isReady,
            connected: this.isReady,
            sessionName: sessionName,
            eventId: eventId,
            timestamp: new Date().toISOString()
          });
          break;
          
        default:
          console.log(`[WAHA Service] Unknown webhook event: ${eventType}`, payload);
      }
    } catch (error) {
      console.error('[WAHA Service] ❌ Webhook handling error:', error);
    }
  }

  /**
   * Process image messages for group monitoring
   */
  private async processImageForGroupMonitoring(messageData: any): Promise<void> {
    try {
      // Check if message is an image and from a group
      if (!messageData.isMedia || 
          messageData.type !== 'image' || 
          !messageData.isGroup ||
          !messageData.mediaUrl) {
        return;
      }

      console.log('[WAHA Service] Processing image for group monitoring:', {
        messageId: messageData.id,
        groupId: messageData.chatId,
        groupName: messageData.groupName,
        from: messageData.from,
        mediaUrl: messageData.mediaUrl
      });

      // Send to group monitor webhook (fire and forget)
      const axios = require('axios');
      const baseUrl = process.env.FRONTEND_URL || 'https://synapse-backend-7lq6.onrender.com';
      
      axios.post(`${baseUrl}/api/v1/group-monitor/webhook/whatsapp-message`, {
        messageId: messageData.id,
        groupId: messageData.chatId,
        senderId: messageData.from,
        senderName: messageData.contactName || messageData.from,
        imageUrl: messageData.mediaUrl,
        caption: messageData.body
      }, {
        timeout: 5000
      }).catch((error: any) => {
        console.error('[WAHA Service] ❌ Failed to send image to group monitor:', error.message);
      });

    } catch (error) {
      console.error('[WAHA Service] ❌ Error processing image for group monitoring:', error);
    }
  }

  /**
   * Request phone authentication code (using WAHA API - may not be available in all engines)
   */
  async requestPhoneCode(phoneNumber: string, sessionName: string = this.defaultSession): Promise<{ success: boolean; code?: string; error?: string }> {
    try {
      console.log(`[WAHA Service] Requesting phone verification code for: ${phoneNumber}`);
      
      // Ensure session is created first
      await this.startSession(sessionName);
      
      // Use WAHA's phone authentication endpoint (may not be supported by all engines)
      const response = await this.httpClient.post(`/api/${sessionName}/auth/request-code`, {
        phoneNumber: phoneNumber.replace(/\D/g, '') // Remove non-digits
      });
      
      // Some WAHA engines return the pairing code to be entered on the phone.
      // Try to extract it from multiple possible shapes to be robust across versions.
      const data: any = response?.data || {};
      const possibleCode = data.code || data.pairingCode || data.pair_code || data?.data?.code || data?.payload?.code || undefined;
      
      if (data.success || response.status === 200) {
        console.log(`[WAHA Service] ✅ Phone verification code requested successfully${possibleCode ? ` (code: ${possibleCode})` : ''}`);
        return { success: true, code: possibleCode };
      } else {
        console.error(`[WAHA Service] ❌ Phone code request failed:`, data);
        return { success: false, error: data.message || 'Failed to request phone code' };
      }
      
    } catch (error: any) {
      console.error(`[WAHA Service] ❌ Error requesting phone code:`, error);
      
      // Check if it's a known error that means phone auth is not supported
      if (error.response?.status === 404 || error.response?.status === 501 || error.response?.status === 405) {
        return { 
          success: false, 
          error: 'Phone number authentication is not available with the current WAHA engine. Please use QR code authentication instead.' 
        };
      }
      
      return { success: false, error: error.message || 'Failed to request phone code' };
    }
  }
  
  /**
   * Verify phone authentication code (using WAHA API - may not be available in all engines)
   */
  async verifyPhoneCode(phoneNumber: string, code: string, sessionName: string = this.defaultSession): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[WAHA Service] Verifying phone code for: ${phoneNumber}`);
      
      // Use WAHA's phone verification endpoint (may not be supported by all engines)
      const response = await this.httpClient.post(`/api/${sessionName}/auth/authorize-code`, {
        phoneNumber: phoneNumber.replace(/\D/g, ''),
        code: code
      });
      
      if (response.data.success || response.status === 200) {
        console.log(`[WAHA Service] ✅ Phone verification successful`);
        this.connectionStatus = 'WORKING';
        this.isReady = true;
        this.emit('authenticated', { 
          method: 'phone', 
          phoneNumber,
          sessionName,
          timestamp: new Date().toISOString()
        });
        return { success: true };
      } else {
        console.error(`[WAHA Service] ❌ Phone verification failed:`, response.data);
        return { success: false, error: response.data.message || 'Invalid verification code' };
      }
      
    } catch (error: any) {
      console.error(`[WAHA Service] ❌ Error verifying phone code:`, error);
      
      // Check if it's a known error that means phone auth is not supported
      if (error.response?.status === 404 || error.response?.status === 501 || error.response?.status === 405) {
        return { 
          success: false, 
          error: 'Phone number authentication is not available with the current WAHA engine. Please use QR code authentication instead.' 
        };
      }
      
      return { success: false, error: error.message || 'Failed to verify phone code' };
    }
  }

  /**
   * Wait for session to reach expected state
   */
  private async waitForSessionState(sessionName: string, expectedStates: string[], timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 2000; // Check every 2 seconds
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const sessionStatus = await this.getSessionStatus(sessionName);
        console.log(`[WAHA Service] Session '${sessionName}' current state: ${sessionStatus.status}`);
        
        if (expectedStates.includes(sessionStatus.status)) {
          console.log(`[WAHA Service] ✅ Session '${sessionName}' reached expected state: ${sessionStatus.status}`);
          return;
        }
        
        if (sessionStatus.status === 'FAILED' || sessionStatus.status === 'STOPPED') {
          throw new Error(`Session failed or stopped: ${sessionStatus.status}`);
        }
        
        console.log(`[WAHA Service] Waiting for session '${sessionName}' to transition from ${sessionStatus.status} to one of [${expectedStates.join(', ')}]...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error(`[WAHA Service] Error checking session state:`, error);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    throw new Error(`Timeout waiting for session '${sessionName}' to reach state [${expectedStates.join(', ')}]`);
  }
}

export default WAHAService;