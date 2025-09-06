/**
 * WAHA WhatsApp Service - HTTP API Wrapper
 * Replaces the complex WhatsAppBaileysService with simple HTTP calls to WAHA microservice
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
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
  // Enhanced WAHA group metadata
  inviteCode?: string;
  picture?: string;
  role?: 'ADMIN' | 'MEMBER' | 'SUPERADMIN';
  settings?: {
    messagesAdminOnly?: boolean;
    infoAdminOnly?: boolean;
  };
}

interface WAHAMonitoringStats {
  messagesCount: number;
  imagesCount: number;
  groupsCount: number;
  privateChatsCount: number;
  lastActivity: string;
  timestamp: number;
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
  config?: unknown;
}

export type WAHAWebhookEvent = {
  id: string;
  timestamp: number | string;
  event: 'message' | 'session.status' | string;
  session: string;
  payload: unknown;
};

export type WAHAWebhookMessagePayload = {
  id: string;
  chatId?: string;
  from?: string;
  body?: string;
  type?: string;
  mimeType?: string;
  isMedia?: boolean;
  mediaUrl?: string;
  notifyName?: string;
  contactName?: string;
  isGroup?: boolean;
  groupName?: string;
  timestamp?: number;
};

class WAHAService extends EventEmitter {
  private static instance: WAHAService | null = null;
  private httpClient: AxiosInstance;
  private wahaBaseUrl: string;
  private defaultSession: string = 'default';
  private isReady = false;
  private connectionStatus = 'disconnected';
  private statusMonitorInterval: NodeJS.Timeout | null = null;
  private lastQrDataUrl: string | null = null;
  private lastQrGeneratedAt: number | null = null;
  private readonly qrReuseWindowMs = 25000; // reuse same QR for up to ~25s
  private readonly qrRequestCooldownMs = 5000; // avoid hammering WAHA
  
  // Session status cache
  private sessionStatusCache: {
    data: unknown;
    timestamp: number;
  } = {
    data: null,
    timestamp: 0
  };
  private readonly SESSION_CACHE_DURATION = 10000; // 10 seconds

  // Health check cache
  private lastHealthCheckResult: { healthy: boolean; details: unknown } | null = null;
  private lastHealthCheckTimestamp: number = 0;
  
  // Groups endpoint circuit breaker
  private groupsEndpointFailures = 0;
  private groupsEndpointLastFailure = 0;
  private readonly GROUPS_CIRCUIT_BREAKER_THRESHOLD = 3;
  private readonly GROUPS_CIRCUIT_BREAKER_RESET_TIME = 300000; // 5 minutes

  /**
   * Clear all caches to force fresh status check
   */
  public clearAllCaches(): void {
    console.log('[WAHA Service] 🗑️ Clearing all caches to force fresh status');
    this.sessionStatusCache.data = null;
    this.sessionStatusCache.timestamp = 0;
    this.lastHealthCheckResult = null;
    this.lastHealthCheckTimestamp = 0;
  }

  private constructor() {
    super();
    
    this.wahaBaseUrl = process.env.WAHA_SERVICE_URL || 'https://synapse-waha.onrender.com';
    // Normalize base URL: ensure scheme and no trailing slash
    try {
      let normalized = (this.wahaBaseUrl || '').trim();
      if (normalized && !/^https?:\/\//i.test(normalized)) {
        normalized = `https://${normalized}`;
      }
      // Remove trailing slashes to avoid double slashes in requests
      normalized = normalized.replace(/\/+$|\/$/g, '');
      this.wahaBaseUrl = normalized || 'https://synapse-waha.onrender.com';
    } catch (e) {
      console.error('[WAHA Service] ⚠️ Invalid WAHA_SERVICE_URL, falling back to default:', e);
      this.wahaBaseUrl = 'https://synapse-waha.onrender.com';
    }
    
    // Get WAHA API key from environment variables
    const wahaApiKey = process.env.WAHA_API_KEY;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
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
      timeout: 180000, // Increased to 3 minutes for Railway deployment and large chat lists
      headers,
    });

    // Setup request interceptors for logging
    this.httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      console.log(`[WAHA API] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    this.httpClient.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`[WAHA API] ✅ ${response.status} ${response.config.url}`);
        return response;
      },
      (error: AxiosError) => {
        console.error(`[WAHA API] ❌ ${error.response?.status || 'NETWORK_ERROR'} ${error.config?.url}:`, error.message);
        return Promise.reject(error);
      }
    );

    console.log(`[WAHA Service] Initialized with base URL: ${this.wahaBaseUrl}`);
    
    // Set up event listeners for authentication
    this.on('authenticated', this.handleAuthentication.bind(this));
  }

  /**
   * Extract a WhatsApp JID string from any WAHA id shape.
   * Handles objects like { _serialized }, { id }, or { user, server }.
   * Returns null for invalid values (including the literal "[object Object]").
   */
  private extractJidFromAny(rawId: unknown): string | null {
    try {
      if (!rawId) return null;
      if (typeof rawId === 'string') {
        const trimmed = rawId.trim();
        if (!trimmed || trimmed === '[object Object]' || trimmed.includes('[object')) return null;
        return trimmed;
      }
      if (typeof rawId === 'object' && rawId !== null) {
        const obj = rawId as Record<string, unknown>;
        if (typeof obj._serialized === 'string') {
          const v = String(obj._serialized).trim();
          return v && v !== '[object Object]' && !v.includes('[object') ? v : null;
        }
        if (typeof obj.id === 'string') {
          const v = String(obj.id).trim();
          return v && v !== '[object Object]' && !v.includes('[object') ? v : null;
        }
        if (typeof obj.user === 'string' && typeof obj.server === 'string') {
          return `${obj.user}@${obj.server}`;
        }
        const stringified = String(rawId as object).trim();
        if (!stringified || stringified === '[object Object]' || stringified.includes('[object')) return null;
        return stringified;
      }
      return String(rawId);
    } catch {
      return null;
    }
  }

  /**
   * Handle authentication event - fetch chats automatically with retry logic
   */
  private async handleAuthentication(authData: any): Promise<void> {
    try {
      console.log('[WAHA Service] 🎉 Handling authentication event:', authData);
      
      // Wait for the session to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to fetch chats with retry logic since WAHA might need time to sync
      console.log('[WAHA Service] Fetching chats after authentication...');
      let chats: any[] = [];
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts && chats.length === 0) {
        attempts++;
        try {
          chats = await this.getChats();
          console.log(`[WAHA Service] Attempt ${attempts}: fetched ${chats.length} chats`);
          
          if (chats.length === 0 && attempts < maxAttempts) {
            console.log(`[WAHA Service] No chats found, waiting 3s before retry ${attempts + 1}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } catch (error) {
          console.error(`[WAHA Service] Chat fetch attempt ${attempts} failed:`, error);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      console.log(`[WAHA Service] ✅ Authentication handling complete: ${chats.length} chats after ${attempts} attempts`);
      
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
          totalCount: chats.length,
          fetchAttempts: attempts
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
      const healthCheckResult = await this.healthCheck();
      this.isReady = healthCheckResult.healthy;
      this.connectionStatus = healthCheckResult.healthy ? 'connected' : 'disconnected';
      
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
   * Start periodic status monitoring (enhanced version)
   */
  public startStatusMonitoring(): void {
    // Use the enhanced monitoring
    this.startEnhancedStatusMonitoring();
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
   * Perform a health check on the WAHA service
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      // Check if we've done a health check recently
      const now = Date.now();
      if (this.lastHealthCheckResult && 
          (now - this.lastHealthCheckTimestamp) < 30000) { // 30 seconds cache
        console.log('[WAHA Service] Returning cached health check');
        return this.lastHealthCheckResult;
      }
      
      const healthEndpoints = ['/api/version', '/api/sessions', '/ping', '/'];
      const results: any[] = [];
      
      for (const endpoint of healthEndpoints) {
        try {
          const response = await this.httpClient.get(endpoint, {
            timeout: 5000,
            validateStatus: (status) => status < 500
          });
          
          results.push({
            endpoint,
            status: response.status,
            success: response.status < 400
          });
          
          // If we get a successful response from any endpoint, consider service healthy
          if (response.status < 400) {
            const result = {
              healthy: true,
              details: {
                endpoints: results,
                lastCheck: new Date().toISOString()
              }
            };
            
            // Cache the result
            this.lastHealthCheckResult = result;
            this.lastHealthCheckTimestamp = now;
            
            return result;
          }
        } catch (error) {
          results.push({
            endpoint,
            status: 0,
            success: false,
            error: error.message
          });
        }
      }
      
      // If we get here, all endpoints failed
      const result = {
        healthy: false,
        details: {
          endpoints: results,
          lastCheck: new Date().toISOString()
        }
      };
      
      // Cache even failed results to prevent hammering
      this.lastHealthCheckResult = result;
      this.lastHealthCheckTimestamp = now;
      
      return result;
    } catch (error) {
      console.error('[WAHA Service] Health check error:', error);
      
      const result = {
        healthy: false,
        details: {
          error: error.message,
          lastCheck: new Date().toISOString()
        }
      };
      
      // Cache the error result
      this.lastHealthCheckResult = result;
      this.lastHealthCheckTimestamp = Date.now();
      
      return result;
    }
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
        let existingSession;
        try {
          existingSession = await this.httpClient.get(`/api/sessions/${sessionName}`);
        } catch (primaryCheckErr: any) {
          // Fallback to legacy status path if primary path is 404
          if (primaryCheckErr?.response?.status === 404) {
            console.warn(`[WAHA Service] /api/sessions/${sessionName} returned 404. Trying legacy /api/${sessionName} status path...`);
            try {
              existingSession = await this.httpClient.get(`/api/${sessionName}`);
            } catch (legacyStatusErr: any) {
              // Some versions expose explicit status endpoint
              if (legacyStatusErr?.response?.status === 404) {
                console.warn(`[WAHA Service] Legacy /api/${sessionName} also 404. Trying /api/${sessionName}/status...`);
                existingSession = await this.httpClient.get(`/api/${sessionName}/status`);
              } else {
                throw legacyStatusErr;
              }
            }
          } else {
            throw primaryCheckErr;
          }
        }
        sessionExists = true;
        sessionData = existingSession.data;
        console.log(`[WAHA Service] Session '${sessionName}' exists with status: ${sessionData?.status || 'unknown'}`);

        // If engine changed vs env, recreate with the configured engine
        try {
          const configuredEngine = (process.env.WAHA_ENGINE || '').trim().toUpperCase();
          const currentEngine = String(sessionData?.engine?.engine || '').toUpperCase();
          if (configuredEngine && currentEngine && configuredEngine !== currentEngine) {
            console.log(`[WAHA Service] ⚙️ Engine mismatch detected (current=${currentEngine}, configured=${configuredEngine}), recreating session with new engine...`);
            await this.recreateSessionWithEngine(sessionName);
            // Brief delay then refetch status
            await new Promise(resolve => setTimeout(resolve, 1000));
            const refreshed = await this.httpClient.get(`/api/sessions/${sessionName}`);
            sessionData = refreshed.data;
            console.log(`[WAHA Service] ✅ Session recreated with engine: ${sessionData?.engine?.engine}`);
          }
        } catch (engineCheckErr) {
          console.warn('[WAHA Service] Engine mismatch handling failed (non-fatal):', engineCheckErr);
        }
        
        // If session is stopped, we need to start it
        if (sessionData?.status === 'STOPPED') {
          console.log(`[WAHA Service] Session '${sessionName}' is stopped, attempting to start...`);
          try {
            await this.httpClient.post(`/api/sessions/${sessionName}/start`);
          } catch (startStoppedErr: any) {
            if (startStoppedErr?.response?.status === 404) {
              console.warn(`[WAHA Service] Start via /api/sessions/${sessionName}/start 404. Trying legacy /api/${sessionName}/start...`);
              await this.httpClient.post(`/api/${sessionName}/start`);
            } else {
              throw startStoppedErr;
            }
          }
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
        const createPayload: any = { name: sessionName, start: true };
        if (engine) {
          createPayload.engine = engine;
          console.log(`[WAHA Service] Using configured WAHA engine: ${engine}`);
        }
        // Engine-specific configuration for WAHA compliance
        const nowebStoreEnabledEnv = String(process.env.WAHA_NOWEB_STORE_ENABLED || '').toLowerCase() === 'true';
        const nowebFullSyncEnv = String(process.env.WAHA_NOWEB_STORE_FULLSYNC || '').toLowerCase() === 'true';
        const webjsStoreEnabledEnv = String(process.env.WAHA_WEBJS_STORE_ENABLED || '').toLowerCase() === 'true';
        
        if (engine && engine.toUpperCase() === 'NOWEB' && nowebStoreEnabledEnv) {
          createPayload.config = {
            noweb: {
              store: {
                enabled: true,
                fullSync: nowebFullSyncEnv
              }
            }
          };
          console.log(`[WAHA Service] Enabling NOWEB store in session create (enabled=true, fullSync=${nowebFullSyncEnv})`);
        } else if (engine && engine.toUpperCase() === 'WEBJS' && webjsStoreEnabledEnv) {
          createPayload.config = {
            webjs: {
              store: {
                enabled: true
              }
            }
          };
          console.log(`[WAHA Service] Enabling WEBJS store in session create (enabled=true)`);
        }
        console.log(`[WAHA Service] Making POST request to /api/sessions with payload:`, createPayload);
        
        try {
          // Create session (minimal payload; webhooks added after successful start)
          const response = await this.httpClient.post('/api/sessions', createPayload);
          console.log(`[WAHA Service] ✅ Session creation response:`, response.status);
          if (process.env.DEBUG === 'true') {
            console.log(`[WAHA Service] 📋 Full response data:`, JSON.stringify(response.data, null, 2));
          }
          sessionData = response.data;
          sessionExists = true;
        } catch (createErr: any) {
          const status = createErr?.response?.status;
          console.warn(`[WAHA Service] ⚠️ Session create via /api/sessions failed (${status}). Falling back to /api/${sessionName}/start`);
          // Fallback path (supported by some WAHA versions): create+start in one call
          const fallbackPayload: any = { name: sessionName, start: true };
          if (engine) fallbackPayload.engine = engine;
          if (engine && engine.toUpperCase() === 'NOWEB' && nowebStoreEnabledEnv) {
            fallbackPayload.config = {
              noweb: {
                store: {
                  enabled: true,
                  fullSync: nowebFullSyncEnv
                }
              }
            };
          }
          const startRes = await this.httpClient.post(`/api/${sessionName}/start`, fallbackPayload);
          console.log(`[WAHA Service] ✅ Fallback start created/started session '${sessionName}':`, startRes.status);
          sessionData = { name: sessionName, status: 'STARTING' };
          sessionExists = true;
        }
        
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
            try {
              const sessionCheck = await this.httpClient.get(`/api/sessions/${sessionName}`);
              console.log(`[WAHA Service] ✅ Session exists before start attempt (primary path)`);
            } catch (checkErr: any) {
              if (checkErr?.response?.status === 404) {
                console.warn(`[WAHA Service] Session check 404 at /api/sessions/${sessionName}. Trying legacy /api/${sessionName}...`);
                try {
                  await this.httpClient.get(`/api/${sessionName}`);
                  console.log(`[WAHA Service] ✅ Session exists via legacy path`);
                } catch (legacyCheckErr: any) {
                  if (legacyCheckErr?.response?.status === 404) {
                    console.warn(`[WAHA Service] Session not found on both paths. Proceeding to start which may create implicitly...`);
                  } else {
                    throw legacyCheckErr;
                  }
                }
              } else {
                throw checkErr;
              }
            }

            // Try primary start endpoint, then legacy fallback on 404
            let startResponse;
            try {
              startResponse = await this.httpClient.post(`/api/sessions/${sessionName}/start`);
              console.log(`[WAHA Service] ✅ Session '${sessionName}' start response (primary):`, startResponse.status);
            } catch (startPrimaryErr: any) {
              if (startPrimaryErr?.response?.status === 404) {
                console.warn(`[WAHA Service] Start 404 on /api/sessions/${sessionName}/start. Trying legacy /api/${sessionName}/start...`);
                startResponse = await this.httpClient.post(`/api/${sessionName}/start`);
                console.log(`[WAHA Service] ✅ Session '${sessionName}' start response (legacy):`, startResponse.status);
              } else {
                throw startPrimaryErr;
              }
            }
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
            // Try primary config endpoint, then legacy
            const configPayload = {
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
            } as any;
            try {
              await this.httpClient.post(`/api/sessions/${sessionName}/config`, configPayload);
            } catch (configErr: any) {
              if (configErr?.response?.status === 404) {
                console.warn(`[WAHA Service] Config 404 on /api/sessions/${sessionName}/config. Trying legacy /api/${sessionName}/config...`);
                await this.httpClient.post(`/api/${sessionName}/config`, configPayload);
              } else {
                throw configErr;
              }
            }
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
   * Get session status (with caching to reduce API calls)
   */
  async getSessionStatus(sessionName: string = 'default'): Promise<any> {
    try {
      // Check cache first
      const now = Date.now();
      if (this.sessionStatusCache.data && 
          (now - this.sessionStatusCache.timestamp) < this.SESSION_CACHE_DURATION) {
        console.log('[WAHA Service] Returning cached session status');
        return this.sessionStatusCache.data;
      }
      let response;
      try {
        response = await this.httpClient.get(`/api/sessions/${sessionName}`);
      } catch (primaryErr: any) {
        if (primaryErr?.response?.status === 404) {
          console.warn(`[WAHA Service] getSessionStatus 404 on /api/sessions/${sessionName}. Trying legacy paths...`);
          try {
            response = await this.httpClient.get(`/api/${sessionName}`);
          } catch (legacyErr: any) {
            if (legacyErr?.response?.status === 404) {
              response = await this.httpClient.get(`/api/${sessionName}/status`);
            } else {
              throw legacyErr;
            }
          }
        } else {
          throw primaryErr;
        }
      }
      
      // Cache the response
      this.sessionStatusCache.data = response.data;
      this.sessionStatusCache.timestamp = now;
      
      console.log(`[WAHA Service] Session '${sessionName}' status:`, {
        status: response.data?.status,
        me: response.data?.me,
        engine: response.data?.engine
      });
      
      return response.data;
    } catch (error: any) {
      // Return cached data if available on error
      if (this.sessionStatusCache.data) {
        console.warn('[WAHA Service] Error fetching session status, returning cached data:', error.message);
        return this.sessionStatusCache.data;
      }
      
      if (error.response?.status === 404) {
        console.warn(`[WAHA Service] Session '${sessionName}' not found on all paths. Attempting auto-create/start...`);
        try {
          // Reuse robust start flow (has fallback to /api/{session}/start)
          await this.startSession(sessionName);
          // Brief delay then retry status fetch
          await new Promise(resolve => setTimeout(resolve, 1000));
          let retry;
          try {
            retry = await this.httpClient.get(`/api/sessions/${sessionName}`);
          } catch (retryErr: any) {
            if (retryErr?.response?.status === 404) {
              // Try legacy again
              try {
                retry = await this.httpClient.get(`/api/${sessionName}`);
              } catch (retryLegacyErr: any) {
                if (retryLegacyErr?.response?.status === 404) {
                  retry = await this.httpClient.get(`/api/${sessionName}/status`);
                } else {
                  throw retryLegacyErr;
                }
              }
            } else {
              throw retryErr;
            }
          }
          // Cache and return
          this.sessionStatusCache.data = retry.data;
          this.sessionStatusCache.timestamp = Date.now();
          console.log(`[WAHA Service] ✅ Auto-created session '${sessionName}', status: ${retry.data?.status}`);
          return retry.data;
        } catch (autoErr: any) {
          console.error(`[WAHA Service] ❌ Auto-create failed for '${sessionName}':`, autoErr?.response?.status || autoErr?.message);
          throw new Error('Session not found. Please create a new session.');
        }
      }
      
      console.error('[WAHA Service] Error getting session status:', error.message);
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
      console.log(`[WAHA Service] Requesting QR code from GET /api/sessions/${sessionName}/auth/qr (with legacy fallback)`);
      let response;
      try {
        response = await this.httpClient.get(`/api/sessions/${sessionName}/auth/qr`, {
          responseType: 'arraybuffer',
          timeout: 15000, // 15 second timeout for QR generation
          validateStatus: (status: number) => status === 200 // Only accept 200 status
        });
      } catch (qrErr: any) {
        if (qrErr?.response?.status === 404) {
          console.warn(`[WAHA Service] QR 404 on /api/sessions/${sessionName}/auth/qr. Trying legacy /api/${sessionName}/auth/qr...`);
          response = await this.httpClient.get(`/api/${sessionName}/auth/qr`, {
            responseType: 'arraybuffer',
            timeout: 15000,
            validateStatus: (status: number) => status === 200
          });
        } else {
          throw qrErr;
        }
      }
      
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
      console.log(`[WAHA Service] Message details:`, {
        chatId,
        textLength: text.length,
        textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        sessionName,
        wahaBaseUrl: this.wahaBaseUrl
      });
      
      // Check session status first
      try {
        const sessionStatus = await this.getSessionStatus(sessionName);
        console.log(`[WAHA Service] Session status before send:`, sessionStatus);
        
        if (sessionStatus.status !== 'WORKING') {
          throw new Error(`Session not ready for sending. Status: ${sessionStatus.status}`);
        }
      } catch (statusError) {
        console.warn(`[WAHA Service] Could not check session status before send:`, statusError);
        // Continue anyway - might still work
      }
      
      // WAHA API structure: POST /api/sendText (with session in payload)
      const endpoint = `/api/sendText`;
      const payload = { session: sessionName, chatId, text };
      
      console.log(`[WAHA Service] Making request to: ${this.wahaBaseUrl}${endpoint}`);
      console.log(`[WAHA Service] Request payload:`, payload);
      
      const response = await this.httpClient.post(endpoint, payload);
      
      console.log(`[WAHA Service] ✅ Message sent to ${chatId}. Response:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`[WAHA Service] ❌ Failed to send message to ${chatId}:`, {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
          timeout: error.config?.timeout
        }
      });
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
      const response = await this.httpClient.post(`/api/sessions/${sessionName}/sendFile`, {
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
   * Get chats with WAHA-compliant pagination and filtering
   */
  async getChats(
    sessionName: string = this.defaultSession,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: 'conversationTimestamp' | 'id' | 'name';
      sortOrder?: 'desc' | 'asc';
      exclude?: string[];
    } = {}
  ): Promise<WAHAChat[]> {
    try {
      console.log(`[WAHA Service] Getting chats for session '${sessionName}'...`);
      
      // Check session status first
      const sessionStatus = await this.getSessionStatus(sessionName);
      console.log(`[WAHA Service] Session '${sessionName}' status: ${sessionStatus.status}`);
      const engineName = String(sessionStatus?.engine?.engine || '').toUpperCase();
      const nowebStoreEnabledEnv = String(process.env.WAHA_NOWEB_STORE_ENABLED || '').toLowerCase() === 'true';
      const webjsStoreEnabledEnv = String(process.env.WAHA_WEBJS_STORE_ENABLED || '').toLowerCase() === 'true';
      
      console.log(`[WAHA Service DEBUG] Engine: ${engineName}, WAHA_NOWEB_STORE_ENABLED: ${process.env.WAHA_NOWEB_STORE_ENABLED}, WAHA_WEBJS_STORE_ENABLED: ${process.env.WAHA_WEBJS_STORE_ENABLED}`);
      
      if (engineName === 'NOWEB' && !nowebStoreEnabledEnv) {
        console.log(`[WAHA Service] ⚠️ CRITICAL: Engine NOWEB without store: skipping chats listing`);
        console.log(`[WAHA Service] ⚠️ SOLUTION: Set WAHA_NOWEB_STORE_ENABLED=true in your backend environment variables`);
        return [];
      }
      
      if (engineName === 'WEBJS' && !webjsStoreEnabledEnv) {
        console.log(`[WAHA Service] ⚠️ CRITICAL: Engine WEBJS without store: skipping chats listing`);
        console.log(`[WAHA Service] ⚠️ SOLUTION: Set WAHA_WEBJS_STORE_ENABLED=true in your backend environment variables`);
        return [];
      }
      
      if (sessionStatus.status === 'STOPPED' || sessionStatus.status === 'FAILED') {
        console.log(`[WAHA Service] Session not ready (${sessionStatus.status}), returning empty chats`);
        return [];
      }
      
      if (sessionStatus.status === 'STARTING') {
        console.log(`[WAHA Service] ⚠️ WEBJS session still starting (${sessionStatus.status}), this may take a few minutes for full sync...`);
        console.log(`[WAHA Service] Attempting to fetch chats anyway - some may be incomplete during initial sync`);
      }
      
      const normalizeChats = (raw: any): any[] => {
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.chats)) return raw.chats;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      };

      const mapChats = (items: any[]): WAHAChat[] => {
        return (items || []).map((chat: any) => {
          const extractedId = this.extractJidFromAny(chat.id);
          const safeId = extractedId ?? String(chat.id ?? '');
          return {
            id: safeId,
            name: chat.name || chat.subject || chat.title || safeId,
            // Robust group detection: WAHA may omit isGroup. Treat *@g.us as group.
            isGroup: Boolean(chat.isGroup) || (typeof safeId === 'string' && safeId.includes('@g.us')),
            lastMessage: chat.lastMessage?.body,
            timestamp: chat.lastMessage?.timestamp,
            participantCount: chat.participantCount
          };
        });
      };

      const tryOverview = async (): Promise<WAHAChat[] | null> => {
        const candidates = Array.from(new Set([
          options.sortBy || 'conversationTimestamp',
          'messageTimestamp',
          'id',
          'name'
        ]));

        for (const sortBy of candidates) {
          try {
            console.log(`[WAHA Service] Trying chats overview with sortBy='${sortBy}' and 180s timeout...`);
            // Use WAHA-recommended pagination for better performance
            const res = await this.httpClient.get(`/api/${sessionName}/chats/overview`, { 
              timeout: 180000,
              params: {
                limit: options.limit || 100, // Start with smaller chunks
                offset: options.offset || 0,
                sortBy,
                sortOrder: options.sortOrder || 'desc'
              }
            });
            const items = normalizeChats(res.data);
            console.log(`[WAHA Service] ✅ Chats overview successful; got ${items.length} items (sortBy='${sortBy}')`);
            if (items.length > 0) {
              return mapChats(items);
            }
          } catch (e: any) {
            const status = e?.response?.status;
            const errorMsg = status === 404 ? 'Overview endpoint not available (404)' : `${e?.message || e}`;
            console.log(`[WAHA Service] ❌ Chats overview failed for sortBy='${sortBy}': ${errorMsg}`);
            // Legacy path fallback if 404
            if (status === 404) {
              try {
                console.log(`[WAHA Service] Trying legacy overview path: /api/${sessionName}/chats/overview`);
                const resLegacy = await this.httpClient.get(`/api/${sessionName}/chats/overview`, {
                  timeout: 180000,
                  params: {
                    limit: options.limit || 100,
                    offset: options.offset || 0,
                    sortBy,
                    sortOrder: options.sortOrder || 'desc'
                  }
                });
                const itemsLegacy = normalizeChats(resLegacy.data);
                console.log(`[WAHA Service] ✅ Legacy overview successful; got ${itemsLegacy.length} items (sortBy='${sortBy}')`);
                if (itemsLegacy.length > 0) {
                  return mapChats(itemsLegacy);
                }
              } catch (legacyErr: any) {
                console.log(`[WAHA Service] ❌ Legacy overview failed:`, legacyErr?.response?.status || legacyErr?.message || legacyErr);
              }
            }
            if (errorMsg.includes('timeout')) {
              console.log(`[WAHA Service] Overview endpoint timed out after 180s (sortBy='${sortBy}')`);
            }
            if (status && status !== 400) {
              // For non-400 errors, no need to try more values
              break;
            }
          }
        }
        console.log('[WAHA Service] Overview endpoint returned no usable result, will try direct /chats');
        return null;
      };

      const tryChats = async (timeoutMs: number): Promise<WAHAChat[] | null> => {
        const candidates = Array.from(new Set([
          options.sortBy || 'conversationTimestamp',
          'messageTimestamp',
          'id',
          'name'
        ]));

        for (const sortBy of candidates) {
          try {
            // Build WAHA-compliant query parameters with performance optimizations
            const params = new URLSearchParams();
            const effectiveLimit = options.limit || 100; // Increased default as per WAHA docs
            params.append('limit', effectiveLimit.toString());
            if (options.offset) params.append('offset', options.offset.toString());
            params.append('sortBy', sortBy);
            params.append('sortOrder', options.sortOrder || 'desc');
            if (options.exclude?.length) params.append('exclude', options.exclude.join(','));

            const queryString = params.toString();
            const endpoint = `/api/${sessionName}/chats${queryString ? `?${queryString}` : ''}`;
            
            console.log(`[WAHA Service] Trying direct /chats with sortBy='${sortBy}' and ${timeoutMs/1000}s timeout...`);
            console.log(`[WAHA Service] Using WAHA-compliant endpoint: ${endpoint}`);
            const res = await this.httpClient.get(endpoint, { timeout: timeoutMs });
            const items = normalizeChats(res.data);
            console.log(`[WAHA Service] ✅ Direct /chats successful; got ${items.length} items (sortBy='${sortBy}')`);
            return mapChats(items);
          } catch (e: any) {
            const status = e?.response?.status;
            const errorMsg = e?.message || e;
            console.log(`[WAHA Service] ❌ /chats failed (sortBy='${sortBy}', ${timeoutMs/1000}s): ${errorMsg}`);
            // Legacy path fallback if 404
            if (status === 404) {
              try {
                const params = new URLSearchParams();
                const effectiveLimit = options.limit || 100;
                params.append('limit', effectiveLimit.toString());
                if (options.offset) params.append('offset', options.offset.toString());
                params.append('sortBy', sortBy);
                params.append('sortOrder', options.sortOrder || 'desc');
                if (options.exclude?.length) params.append('exclude', options.exclude.join(','));
                const queryString = params.toString();
                const legacyEndpoint = `/api/${sessionName}/chats${queryString ? `?${queryString}` : ''}`;
                console.log(`[WAHA Service] Trying legacy /chats endpoint: ${legacyEndpoint}`);
                const resLegacy = await this.httpClient.get(legacyEndpoint, { timeout: timeoutMs });
                const itemsLegacy = normalizeChats(resLegacy.data);
                console.log(`[WAHA Service] ✅ Legacy /chats successful; got ${itemsLegacy.length} items (sortBy='${sortBy}')`);
                return mapChats(itemsLegacy);
              } catch (legacyErr: any) {
                console.log(`[WAHA Service] ❌ Legacy /chats failed:`, legacyErr?.response?.status || legacyErr?.message || legacyErr);
              }
            }
            if (errorMsg.includes('timeout')) {
              console.log(`[WAHA Service] Direct chats endpoint timed out after ${timeoutMs/1000}s (sortBy='${sortBy}')`);
            }
            if (status && status !== 400) {
              // For non-400 errors, no point trying other sortBy values with this timeout
              break;
            }
          }
        }
        // Minimal-parameter fallback: no query params
        try {
          const minimalEndpoint = `/api/${sessionName}/chats`;
          console.log(`[WAHA Service] Trying minimal /chats without params: ${minimalEndpoint}`);
          const res = await this.httpClient.get(minimalEndpoint, { timeout: timeoutMs });
          const items = normalizeChats(res.data);
          console.log(`[WAHA Service] ✅ Minimal /chats successful; got ${items.length} items`);
          if (items.length > 0) return mapChats(items);
        } catch (e: any) {
          console.log(`[WAHA Service] ❌ Minimal /chats failed:`, e?.response?.status || e?.message || e);
        }

        // Alternate endpoint fallback: global endpoint with session param
        try {
          const altParams = new URLSearchParams();
          altParams.append('session', sessionName);
          const altQuery = altParams.toString();
          const altEndpoint = `/api/chats${altQuery ? `?${altQuery}` : ''}`;
          console.log(`[WAHA Service] Trying alternate endpoint: ${altEndpoint}`);
          const res = await this.httpClient.get(altEndpoint, { timeout: timeoutMs });
          const items = normalizeChats(res.data);
          console.log(`[WAHA Service] ✅ Alternate /api/chats successful; got ${items.length} items`);
          if (items.length > 0) return mapChats(items);
        } catch (e: any) {
          console.log(`[WAHA Service] ❌ Alternate /api/chats failed:`, e?.response?.status || e?.message || e);
        }

        return null;
      };

      // WEBJS-optimized attempt sequence with extended timeouts for initial sync
      const isWebJS = engineName === 'WEBJS';
      const baseTimeout = isWebJS ? 300000 : 180000; // 5min for WEBJS, 3min for others
      
      console.log(`[WAHA Service] Starting ${engineName}-optimized chat loading sequence for session '${sessionName}'...`);
      if (isWebJS) {
        console.log(`[WAHA Service] Using extended timeouts for WEBJS engine (initial sync can take 5+ minutes)`);
      }
      
      let chats: WAHAChat[] | null = await tryOverview();
      
      if (!chats || chats.length === 0) {
        console.log(`[WAHA Service] Overview failed or empty, trying direct /chats with extended timeout...`);
        chats = await tryChats(baseTimeout); // Extended timeout for WEBJS initial sync
      }
      
      if (!chats || chats.length === 0) {
        console.log(`[WAHA Service] First /chats attempt failed, retrying with reduced limit...`);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Longer delay for WEBJS to stabilize
        chats = await tryChats(baseTimeout * 0.6); // Reduced timeout for retry
      }

      if (!chats || chats.length === 0) {
        console.warn('[WAHA Service] ⚠️ No chats retrieved from any endpoint after multiple attempts');
        console.warn('[WAHA Service] Possible causes:');
        console.warn('[WAHA Service] 1) WhatsApp session not fully synchronized with WAHA service');
        console.warn('[WAHA Service] 2) No WhatsApp chats exist for this account');  
        console.warn('[WAHA Service] 3) WAHA service is experiencing heavy load (Render.com cold start)');
        console.warn('[WAHA Service] 4) Network connectivity issues between backend and WAHA service');
        console.warn('[WAHA Service] Suggestion: Wait a few moments and try refreshing, or check WAHA service logs');
        return [];
      }

      // Validate that we have meaningful chat data
      const validChats = chats.filter(chat => chat.id && chat.name);
      if (validChats.length !== chats.length) {
        console.warn(`[WAHA Service] Filtered out ${chats.length - validChats.length} invalid chats`);
      }

      // Enforce a hard cap to reduce memory usage when WAHA returns huge lists
      const limit = Math.max(1, parseInt(process.env.WAHA_CHATS_LIMIT || '300', 10));
      if (validChats.length > limit) {
        console.log(`[WAHA Service] Capping chats from ${validChats.length} to ${limit} (WAHA_CHATS_LIMIT)`);
        return validChats.slice(0, limit);
      }

      console.log(`[WAHA Service] ✅ Successfully retrieved ${validChats.length} valid chats`);
      return validChats;
    } catch (error: any) {
      console.error(`[WAHA Service] ❌ Failed to get chats for '${sessionName}':`, error.response?.status, error.response?.data);
      
      // Handle specific 422 error for session not ready
      if (error.response?.status === 422) {
        console.log(`[WAHA Service] Session not ready (422), returning empty chats`);
        return [];
      }
      
      // Handle 500 server errors by triggering recovery
      if (error.response?.status === 500 || error.response?.status === 502 || error.response?.status === 503) {
        console.log(`[WAHA Service] 🚨 Server error (${error.response?.status}) in getChats, triggering recovery`);
        // Don't await recovery to avoid blocking the current request
        this.handleConnectionFailure(sessionName, error).catch(recoveryError => {
          console.error(`[WAHA Service] Recovery failed:`, recoveryError);
        });
      }
      
      // Return empty array instead of throwing to prevent cascading errors
      return [];
    }
  }

  /**
   * Get groups using WAHA groups endpoint (compliant), fallback to filtering chats
   */
  async getGroups(
    sessionName: string = this.defaultSession,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: 'id' | 'subject';
      sortOrder?: 'desc' | 'asc';
      exclude?: string[];
    } = {}
  ): Promise<WAHAChat[]> {
    try {
      // Ensure session is working - but be more lenient
      const sessionStatus = await this.getSessionStatus(sessionName);
      console.log(`[WAHA Service] getGroups - Session status: ${sessionStatus.status}`);
      const engineName = String(sessionStatus?.engine?.engine || '').toUpperCase();
      const nowebStoreEnabledEnv = String(process.env.WAHA_NOWEB_STORE_ENABLED || '').toLowerCase() === 'true';
      const webjsStoreEnabledEnv = String(process.env.WAHA_WEBJS_STORE_ENABLED || '').toLowerCase() === 'true';
      
      if (engineName === 'NOWEB' && !nowebStoreEnabledEnv) {
        console.log(`[WAHA Service] getGroups - NOWEB without store: skipping groups listing (set WAHA_NOWEB_STORE_ENABLED=true)`);
        return [];
      }
      
      if (engineName === 'WEBJS' && !webjsStoreEnabledEnv) {
        console.log(`[WAHA Service] getGroups - WEBJS without store: skipping groups listing (set WAHA_WEBJS_STORE_ENABLED=true)`);
        return [];
      }
      
      // Allow groups to be fetched if session is in a working state
      if (sessionStatus.status === 'STOPPED' || sessionStatus.status === 'FAILED') {
        console.log(`[WAHA Service] getGroups - Session not ready (${sessionStatus.status}), returning empty array`);
        return [];
      }
      
      // For other statuses (STARTING, SCAN_QR_CODE, WORKING, etc.), try to fetch groups anyway
      console.log(`[WAHA Service] getGroups - Session status ${sessionStatus.status}, attempting to fetch groups`);
      
      // Check circuit breaker for groups endpoint
      const now = Date.now();
      const isCircuitBreakerOpen = this.groupsEndpointFailures >= this.GROUPS_CIRCUIT_BREAKER_THRESHOLD &&
                                   (now - this.groupsEndpointLastFailure) < this.GROUPS_CIRCUIT_BREAKER_RESET_TIME;

      if (isCircuitBreakerOpen) {
        console.log(`[WAHA Service] Groups endpoint circuit breaker is open (${this.groupsEndpointFailures} failures), skipping direct endpoint and using chats filter`);
        const chats = await this.getChats(sessionName);
        return chats.filter(c => c.isGroup || (typeof c.id === 'string' && c.id.includes('@g.us')));
      }

      try {
        // Build WAHA-compliant query parameters for groups with performance optimizations
        const params = new URLSearchParams();
        // Use WAHA-recommended pagination and exclude heavy data
        params.append('limit', (options.limit || 100).toString()); // Default to 100 as per WAHA docs
        params.append('offset', (options.offset || 0).toString());
        params.append('sortBy', options.sortBy || 'subject'); // Use WAHA-recommended sorting
        params.append('sortOrder', options.sortOrder || 'desc');
        params.append('exclude', 'participants'); // Exclude participants for better performance as per WAHA docs
        if (options.exclude?.length) {
          const allExcludes = ['participants', ...options.exclude];
          params.set('exclude', allExcludes.join(','));
        }

        const queryString = params.toString();
        const endpoint = `/api/${sessionName}/groups${queryString ? `?${queryString}` : ''}`;
        
        console.log(`[WAHA Service] Using WAHA-compliant groups endpoint with performance opts: ${endpoint}`);
        const res = await this.httpClient.get(endpoint, { timeout: 180000 }); // Use 3min timeout
        
        // Normalize response to array shape
        const items = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.groups)
            ? res.data.groups
            : Array.isArray(res.data?.data)
              ? res.data.data
              : [];

        // Reset circuit breaker on success
        this.groupsEndpointFailures = 0;
        console.log(`[WAHA Service] Received ${items.length} groups`);
        return items.map((g: any) => ({
          id: this.extractJidFromAny(g.id || g.chatId || g.groupId) || String(g.id || g.chatId || g.groupId || ''),
          name: String(g.name || g.subject || g.title || g.id || 'Unnamed Group'),
          description: g.description ? String(g.description) : undefined,
          isGroup: true,
          lastMessage: g.lastMessage?.body ? String(g.lastMessage.body) : undefined,
          timestamp: g.lastMessage?.timestamp,
          participantCount: g.participants?.length || g.participantCount || 0,
          // Enhanced WAHA group metadata
          inviteCode: g.invite || g.inviteCode,
          picture: g.picture,
          role: g.role, // 'ADMIN', 'MEMBER', etc.
          settings: {
            messagesAdminOnly: g.settings?.messagesAdminOnly,
            infoAdminOnly: g.settings?.infoAdminOnly
          }
        }));
      } catch (e: any) {
        const status = e.response?.status;
        
        // Increment circuit breaker for 500 errors
        if (status === 500) {
          this.groupsEndpointFailures++;
          this.groupsEndpointLastFailure = Date.now();
          console.log(`[WAHA Service] /groups endpoint server error (500) - likely engine compatibility issue, circuit breaker: ${this.groupsEndpointFailures}/${this.GROUPS_CIRCUIT_BREAKER_THRESHOLD}, falling back to chats filter`);
        } else if (status === 404) {
          console.log(`[WAHA Service] /groups endpoint not available (404), falling back to chats filter`);
        } else {
          console.warn(`[WAHA Service] Groups endpoint error (${status}), falling back to chats filter:`, e.message);
        }
        
        try {
          const chats = await this.getChats(sessionName);
          return chats.filter(c => c.isGroup || (typeof c.id === 'string' && c.id.includes('@g.us')));
        } catch (fallbackError: any) {
          console.error('[WAHA Service] Fallback getChats also failed:', fallbackError.message);
          return [];
        }
      }
    } catch (err: any) {
      console.error('[WAHA Service] Failed to get groups:', err.response?.status, err.message);
      
      // Handle 500 server errors by triggering recovery
      if (err.response?.status === 500 || err.response?.status === 502 || err.response?.status === 503) {
        console.log(`[WAHA Service] 🚨 Server error (${err.response?.status}) in getGroups, triggering recovery`);
        // Don't await recovery to avoid blocking the current request
        this.handleConnectionFailure(sessionName, err).catch(recoveryError => {
          console.error(`[WAHA Service] Recovery failed:`, recoveryError);
        });
      }
      
      return [];
    }
  }

  /**
   * Request WAHA to refresh groups (WAHA-compliant implementation)
   */
  async refreshGroups(sessionName: string = this.defaultSession): Promise<{ success: boolean; message?: string }> {
    console.log(`[WAHA Service] Refreshing groups for session '${sessionName}'`);
    
    // Try WAHA-compliant refresh endpoint first
    try {
      const status = await this.getSessionStatus(sessionName);
      const engineName = String(status?.engine?.engine || '').toUpperCase();
      if (engineName === 'NOWEB') {
        console.log(`[WAHA Service] Groups refresh not supported by NOWEB engine`);
        return { success: true, message: 'Groups refresh not supported by NOWEB engine' };
      }
      // WEBJS engine supports groups refresh
      if (engineName === 'WEBJS') {
        console.log(`[WAHA Service] Using WEBJS engine - groups refresh supported`);
      }
      const response = await this.httpClient.post(`/api/${sessionName}/groups/refresh`, {}, { timeout: 15000 });
      console.log(`[WAHA Service] ✅ Groups refreshed successfully`);
      return { success: true, message: 'Groups refreshed successfully' };
    } catch (refreshError: any) {
      const status = refreshError.response?.status;
      // If refresh endpoint doesn't exist (404) or is not supported (422), that's expected for many WAHA engines
      if (status === 404) {
        console.log(`[WAHA Service] Groups refresh endpoint not available (404) - this is normal for some WAHA engines`);
        console.log(`[WAHA Service] Groups are automatically refreshed by the WAHA service`);
        return { success: true, message: 'Groups are automatically refreshed by WAHA service (no manual refresh needed)' };
      } else if (status === 422) {
        console.log(`[WAHA Service] Groups refresh endpoint not supported (422) - likely engine compatibility issue (NOWEB engine doesn't support this)`);
        console.log(`[WAHA Service] Groups are automatically refreshed by the WAHA service`);
        return { success: true, message: 'Groups refresh not supported by current engine (NOWEB) - groups are automatically managed' };
      } else if (refreshError.code === 'ECONNABORTED' || refreshError.message?.includes('timeout')) {
        console.log(`[WAHA Service] Groups refresh timed out - this may indicate heavy processing`);
        return { success: true, message: 'Groups refresh initiated (may take time to complete)' };
      } else {
        console.warn(`[WAHA Service] Groups refresh failed:`, refreshError.message);
        return { success: false, message: `Groups refresh failed: ${refreshError.message}` };
      }
    }
  }

  /**
   * Get group participants (WAHA-compliant)
   */
  async getGroupParticipants(groupId: string, sessionName: string = this.defaultSession): Promise<any[]> {
    try {
      console.log(`[WAHA Service] Getting participants for group '${groupId}'`);
      const response = await this.httpClient.get(`/api/${sessionName}/groups/${encodeURIComponent(groupId)}/participants`);
      return response.data || [];
    } catch (error: any) {
      console.error(`[WAHA Service] ❌ Failed to get group participants:`, error);
      return [];
    }
  }

  /**
   * Get specific group details (WAHA-compliant)
   */
  async getGroupDetails(groupId: string, sessionName: string = this.defaultSession): Promise<any> {
    try {
      console.log(`[WAHA Service] Getting details for group '${groupId}'`);
      const response = await this.httpClient.get(`/api/${sessionName}/groups/${encodeURIComponent(groupId)}`);
      return response.data;
    } catch (error: any) {
      console.error(`[WAHA Service] ❌ Failed to get group details:`, error);
      return null;
    }
  }

  /**
   * Get messages from chat
   */
  async getMessages(chatId: string, limit: number = 50, sessionName: string = this.defaultSession): Promise<WAHAMessage[]> {
    try {
      // Validate chatId to prevent [object Object] errors
      if (!chatId || typeof chatId !== 'string') {
        console.error(`[WAHA Service] ❌ Invalid chatId type:`, typeof chatId, chatId);
        return [];
      }
      
      // Check for literal "[object Object]" string
      if (chatId === '[object Object]' || chatId.includes('[object')) {
        console.error(`[WAHA Service] ❌ Received invalid chatId "[object Object]"`);
        return [];
      }
      
      // Normalize chatId: add domain suffix if missing (group vs private)
      if (!chatId.includes('@')) {
        const inferred = chatId.includes('-') ? `${chatId}@g.us` : `${chatId}@s.whatsapp.net`;
        console.warn(`[WAHA Service] ⚠️ chatId missing domain, inferring:`, { original: chatId, inferred });
        chatId = inferred;
      }
      
      console.log(`[WAHA Service] Getting messages for chat '${chatId}' in session '${sessionName}'...`);
      
      // Check session status first
      const sessionStatus = await this.getSessionStatus(sessionName);
      console.log(`[WAHA Service] Session '${sessionName}' status: ${sessionStatus.status}`);
      
      if (sessionStatus.status !== 'WORKING') {
        console.log(`[WAHA Service] Session not in WORKING status (${sessionStatus.status}), returning empty messages`);
        return [];
      }
      
      // WAHA 2025.9.1 API endpoint structure: /api/messages?session={session}&chatId={chatId}
      let response = await this.httpClient.get('/api/messages', {
        params: { 
          session: sessionName,
          chatId: chatId,
          limit 
        },
        timeout: 180000 // Increased to 3 minutes for Railway deployment
      });
      
      console.log(`[WAHA Service] Received ${response.data.length} messages`);
      
      return response.data.map((msg: any) => ({
        id: msg.id,
        body: msg.body || '',
        from: msg.from,
        fromMe: msg.fromMe || false,
        timestamp: msg.timestamp,
        type: msg.type !== 'text' ? msg.type : 
              (msg.mimeType?.startsWith('image/') ? 'image' :
               msg.mimeType?.startsWith('video/') ? 'video' :
               msg.mimeType?.startsWith('audio/') ? 'audio' :
               msg.hasMedia || msg.mediaUrl ? 'media' : 'text'),
        isGroup: msg.chatId?.includes('@g.us') || false,
        contactName: msg.notifyName || msg.from,
        chatId: msg.chatId,
        time: new Date(msg.timestamp * 1000).toLocaleTimeString(),
        isMedia: msg.type !== 'text' || Boolean(msg.hasMedia || msg.mediaUrl || msg.mimeType)
      }));
    } catch (error: any) {
      console.error(`[WAHA Service] ❌ Failed to get messages for ${chatId}:`, error.response?.status, error.response?.data);
      
      // If invalid chatId and private suffix might be wrong, try alternate domain once
      const status = error.response?.status;
      const bodyText = typeof error.response?.data === 'string' ? error.response?.data : JSON.stringify(error.response?.data || {});
      const looksInvalid = status === 400 || status === 404;
      if (looksInvalid && chatId && /@s\.whatsapp\.net$/.test(chatId)) {
        const altId = chatId.replace(/@s\.whatsapp\.net$/, '@c.us');
        try {
          console.warn(`[WAHA Service] Retrying with alternate private JID: ${altId}`);
          const retryRes = await this.httpClient.get('/api/messages', {
            params: { 
              session: sessionName,
              chatId: altId,
              limit 
            },
            timeout: 180000
          });
          return retryRes.data.map((msg: any) => ({
            id: msg.id,
            body: msg.body || '',
            from: msg.from,
            fromMe: msg.fromMe || false,
            timestamp: msg.timestamp,
            type: msg.type !== 'text' ? msg.type : 
              (msg.mimeType?.startsWith('image/') ? 'image' :
               msg.mimeType?.startsWith('video/') ? 'video' :
               msg.mimeType?.startsWith('audio/') ? 'audio' :
               msg.hasMedia || msg.mediaUrl ? 'media' : 'text'),
            isGroup: msg.chatId?.includes('@g.us') || false,
            contactName: msg.notifyName || msg.from,
            chatId: msg.chatId,
            time: new Date(msg.timestamp * 1000).toLocaleTimeString(),
            isMedia: msg.type !== 'text' || Boolean(msg.hasMedia || msg.mediaUrl || msg.mimeType)
          }));
        } catch (retryErr: any) {
          console.error('[WAHA Service] Alternate JID retry failed:', retryErr.response?.status, retryErr.response?.data);
        }
      } else if (looksInvalid && chatId && /@c\.us$/.test(chatId)) {
        const altId = chatId.replace(/@c\.us$/, '@s.whatsapp.net');
        try {
          console.warn(`[WAHA Service] Retrying with alternate private JID: ${altId}`);
          const retryRes = await this.httpClient.get('/api/messages', {
            params: { 
              session: sessionName,
              chatId: altId,
              limit 
            },
            timeout: 180000
          });
          return retryRes.data.map((msg: any) => ({
            id: msg.id,
            body: msg.body || '',
            from: msg.from,
            fromMe: msg.fromMe || false,
            timestamp: msg.timestamp,
            type: msg.type !== 'text' ? msg.type : 
              (msg.mimeType?.startsWith('image/') ? 'image' :
               msg.mimeType?.startsWith('video/') ? 'video' :
               msg.mimeType?.startsWith('audio/') ? 'audio' :
               msg.hasMedia || msg.mediaUrl ? 'media' : 'text'),
            isGroup: msg.chatId?.includes('@g.us') || false,
            contactName: msg.notifyName || msg.from,
            chatId: msg.chatId,
            time: new Date(msg.timestamp * 1000).toLocaleTimeString(),
            isMedia: msg.type !== 'text' || Boolean(msg.hasMedia || msg.mediaUrl || msg.mimeType)
          }));
        } catch (retryErr: any) {
          console.error('[WAHA Service] Alternate JID retry failed:', retryErr.response?.status, retryErr.response?.data);
        }
      }
      
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
   * Force recreate session with new engine configuration
   */
  async recreateSessionWithEngine(sessionName: string = this.defaultSession): Promise<any> {
    try {
      console.log(`[WAHA Service] 🔄 Force recreating session '${sessionName}' with new engine configuration...`);
      
      // First, delete the existing session
      try {
        await this.httpClient.delete(`/api/sessions/${sessionName}`);
        console.log(`[WAHA Service] ✅ Deleted existing session '${sessionName}'`);
      } catch (deleteError: any) {
        if (deleteError.response?.status === 404) {
          console.log(`[WAHA Service] Session '${sessionName}' doesn't exist (404) - proceeding to create new one`);
        } else {
          console.warn(`[WAHA Service] ⚠️ Could not delete session:`, deleteError.response?.status);
        }
      }
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Clear cache
      this.sessionStatusCache.data = null;
      this.sessionStatusCache.timestamp = 0;
      this.connectionStatus = 'disconnected';
      this.isReady = false;
      
      // Create new session with current engine configuration
      const engine = process.env.WAHA_ENGINE?.trim();
      const createPayload: any = { name: sessionName };
      if (engine) {
        createPayload.engine = engine;
        console.log(`[WAHA Service] 🔧 Creating session with engine: ${engine}`);
      }
      
      let responseData: any = null;
      try {
        const response = await this.httpClient.post('/api/sessions', createPayload);
        console.log(`[WAHA Service] ✅ Session recreated with engine configuration`);
        responseData = response.data;
      } catch (createErr: any) {
        const status = createErr?.response?.status;
        console.warn(`[WAHA Service] ⚠️ Recreate via /api/sessions failed (${status}). Falling back to /api/${sessionName}/start`);
        const fallbackPayload: any = { name: sessionName, start: true };
        if (engine) fallbackPayload.engine = engine;
        const startRes = await this.httpClient.post(`/api/${sessionName}/start`, fallbackPayload);
        console.log(`[WAHA Service] ✅ Fallback start created/started session '${sessionName}':`, startRes.status);
        responseData = { name: sessionName, status: 'STARTING' };
      }
      
      // Start the new session (idempotent; safe if already started by fallback)
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.httpClient.post(`/api/sessions/${sessionName}/start`);
        console.log(`[WAHA Service] ✅ New session '${sessionName}' started`);
      } catch (startErr: any) {
        const st = startErr?.response?.status;
        console.log(`[WAHA Service] ℹ️ Start call returned ${st}. It may already be started (expected on fallback path).`);
      }
      
      return responseData;
    } catch (error: any) {
      console.error(`[WAHA Service] ❌ Error recreating session:`, error);
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
   * Get overall service status
   */
  async getStatus(): Promise<any> {
    try {
      // Quick health check with caching
      const healthResult = await this.healthCheck();
      const isHealthy = healthResult.healthy;
      
      let sessionStatus = null;
      let sessionDetails = null;
      
      // Only check session if service is healthy
      if (isHealthy) {
        try {
          sessionDetails = await this.getSessionStatus();
          sessionStatus = sessionDetails?.status || 'STOPPED';
        } catch (error) {
          console.warn('[WAHA Service] Could not get session status:', error.message);
          sessionStatus = 'STOPPED';
        }
      }
      
      return {
        isReady: isHealthy && sessionStatus === 'WORKING',
        status: sessionStatus || 'disconnected',
        qrAvailable: sessionStatus === 'SCAN_QR_CODE',
        timestamp: new Date().toISOString(),
        healthCheck: healthResult.details
      };
    } catch (error) {
      console.error('[WAHA Service] Error getting status:', error);
      return {
        isReady: false,
        status: 'error',
        qrAvailable: false,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Webhook handler for WAHA events (following WAHA documentation event structure)
   */
  handleWebhook(payload: WAHAWebhookEvent): void {
    try {
      console.log('[WAHA Service] Webhook received:', {
        id: payload.id,
        event: payload.event,
        session: payload.session
      });

      const eventType = payload.event;
      const sessionName = payload.session;
      const eventData = payload.payload;
      const eventId = payload.id;
      const eventTimestamp = payload.timestamp;

      console.log(`[WAHA Service] Processing event '${eventType}' for session '${sessionName}'`);

      switch (eventType) {
        case 'message': {
          if (!eventData || typeof eventData !== 'object') {
            console.warn('[WAHA Service] Skipping message event with empty payload');
            break;
          }
          const messagePayload = eventData as WAHAWebhookMessagePayload;
          // WAHA sometimes omits the isGroup flag. Derive it from the chat id.
          messagePayload.isGroup = this.isGroupMessage(messagePayload);

          this.emit('message', messagePayload);
          void this.processMessageForGroupMonitoring(messagePayload).catch(err =>
            console.error('[WAHA Service] processMessageForGroupMonitoring error:', err)
          );
          setImmediate(() => {
            this.updateMonitoringStats(messagePayload);
          });
          break;
        }

        case 'session.status': {
          const statusData = eventData as { status?: string };
          const previousIsReady = this.isReady;
          const newStatus = statusData?.status;

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

          if (!previousIsReady && this.isReady && newStatus === 'WORKING') {
            console.log('[WAHA Service] 🎉 Authentication detected via webhook! Session is now WORKING');
            this.emit('authenticated', {
              method: 'qr',
              sessionStatus: newStatus,
              sessionName,
              eventId,
              timestamp: new Date().toISOString()
            });

            const io_instance = (global as any).io;
            if (io_instance) {
              console.log('[WAHA Service] Broadcasting authentication via Socket.IO');
              io_instance.emit('whatsapp:status', {
                connected: true,
                authenticated: true,
                isReady: true,
                authMethod: 'qr',
                serviceType: 'waha',
                sessionName,
                timestamp: new Date().toISOString()
              });
            }
          }

          this.emit('status_change', {
            ...statusData,
            authenticated: this.isReady,
            connected: this.isReady,
            sessionName,
            eventId,
            timestamp: new Date().toISOString()
          });
          break;
        }

        default:
          console.log(`[WAHA Service] Unknown webhook event: ${eventType}`, {
            id: payload.id,
            event: payload.event
          });
      }
    } catch (error) {
      console.error('[WAHA Service] ❌ Webhook handling error:', error);
    }
  }

  /**
   * Determine if message payload is from a group chat
   */
  private isGroupMessage(data: Partial<WAHAWebhookMessagePayload> | null | undefined): boolean {
    if (!data) return false;
    if (typeof data.isGroup === 'boolean') return data.isGroup;
    const jid = data.chatId || data.from || data.id || '';
    if (typeof jid !== 'string') return false;
    return jid.includes('@g.us') || (!jid.includes('@') && jid.includes('-'));
  }

  /**
   * Forward messages to group monitor service
   */
  private async processMessageForGroupMonitoring(messageData: WAHAWebhookMessagePayload): Promise<void> {
    try {
      // Only process group messages
      if (!this.isGroupMessage(messageData)) {
        return;
      }

      const payload: {
        messageId: string;
        groupId: string;
        senderId: string;
        senderName: string;
        caption?: string;
        imageUrl?: string;
      } = {
        messageId: messageData.id,
        groupId: messageData.chatId || messageData.from || '',
        senderId: messageData.from || '',
        senderName: messageData.contactName || messageData.from || 'Unknown',
        caption: messageData.body
      };

      const imageUrl = messageData.mediaUrl;
      if (imageUrl && (messageData.type === 'image' || messageData.mimeType?.startsWith('image/'))) {
        payload.imageUrl = imageUrl;
      }

      console.log('[WAHA Service] Forwarding message for group monitoring:', {
        messageId: payload.messageId,
        groupId: payload.groupId,
        hasImage: Boolean(payload.imageUrl)
      });

      const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
      const secret = process.env.GROUP_MONITOR_WEBHOOK_SECRET;
      if (!secret) {
        console.warn('[WAHA Service] GROUP_MONITOR_WEBHOOK_SECRET not set; skipping group-monitor forward to avoid 403 spam');
        return;
      }
      axios.post(`${baseUrl}/api/v1/group-monitor/webhook/whatsapp-message`, payload, {
        timeout: 5000,
        headers: { 'X-Webhook-Secret': secret }
      }).catch((error: unknown) => {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[WAHA Service] ❌ Failed to send message to group monitor:', msg);
      });

    } catch (error) {
      console.error('[WAHA Service] ❌ Error processing message for group monitoring:', error);
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
      const response = await this.httpClient.post(`/api/sessions/${sessionName}/auth/request-code`, {
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
      const response = await this.httpClient.post(`/api/sessions/${sessionName}/auth/authorize-code`, {
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

  /**
   * Restart failed WAHA session - handles FAILED session states
   */
  async restartFailedSession(sessionName: string = this.defaultSession): Promise<boolean> {
    try {
      console.log(`[WAHA Service] 🔄 Attempting to restart session '${sessionName}'...`);
      
      // First, delete the failed session
      try {
        await this.httpClient.delete(`/api/sessions/${sessionName}`);
        console.log(`[WAHA Service] ✅ Deleted failed session '${sessionName}'`);
      } catch (deleteError: any) {
        console.log(`[WAHA Service] ⚠️ Could not delete session (might not exist):`, deleteError.response?.status);
      }
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Start new session
      const response = await this.httpClient.post(`/api/sessions/${sessionName}/start`, {
        name: sessionName
      });
      
      console.log(`[WAHA Service] ✅ Started new session '${sessionName}':`, response.data);
      
      // Reset connection status
      this.connectionStatus = 'disconnected';
      this.emit('session_restarted', { session: sessionName });
      
      return true;
    } catch (error: any) {
      console.error(`[WAHA Service] ❌ Failed to restart session '${sessionName}':`, error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Auto-recover from FAILED session state
   */
  async autoRecoverSession(sessionName: string = this.defaultSession): Promise<boolean> {
    try {
      const status = await this.getSessionStatus(sessionName);
      
      if (status.status === 'FAILED') {
        console.log(`[WAHA Service] 🔄 Auto-recovering FAILED session '${sessionName}'...`);
        return await this.restartFailedSession(sessionName);
      }
      
      return true;
    } catch (error: any) {
      console.error(`[WAHA Service] ❌ Auto-recovery failed for '${sessionName}':`, error.message);
      return false;
    }
  }

  /**
   * Handle connection failure recovery with exponential backoff
   * Specifically for 405 "Method Not Allowed" and rate limiting errors
   */
  async handleConnectionFailure(sessionName: string = this.defaultSession, error: any): Promise<boolean> {
    try {
      console.log(`[WAHA Service] 🔄 Handling connection failure for '${sessionName}':`, error.message);
      
      // Check if it's a rate limiting error (405, 429, etc.) or server error (500)
      const isRateLimited = error.response?.status === 405 ||
                           error.response?.status === 429 ||
                           error.message?.includes('Connection Failure');
      
      const isServerError = error.response?.status === 500 ||
                           error.response?.status === 502 ||
                           error.response?.status === 503;
      
      if (isServerError) {
        console.log(`[WAHA Service] 🚨 Server error detected (${error.response?.status})`);
        
        // For server errors, try immediate session restart
        console.log(`[WAHA Service] 🔄 Server error detected, attempting immediate session restart...`);
        const restartResult = await this.restartFailedSession(sessionName);
        
        if (restartResult) {
          // Wait longer for server error recovery
          await new Promise(resolve => setTimeout(resolve, 45000)); // 45s stabilization
          this.startEnhancedStatusMonitoring();
          console.log(`[WAHA Service] ✅ Server error recovery completed`);
        }
        
        return restartResult;
      }
      
      if (isRateLimited) {
        console.log(`[WAHA Service] 🚨 Rate limiting detected (${error.response?.status || 'Connection Failure'})`);
        
        // Stop status monitoring to reduce requests
        if (this.statusMonitorInterval) {
          clearInterval(this.statusMonitorInterval);
          this.statusMonitorInterval = null;
          console.log('[WAHA Service] 🛑 Stopped status monitoring due to rate limiting');
        }
        
        // Wait for extended cooldown period
        const cooldownSeconds = 60; // 1 minute cooldown
        console.log(`[WAHA Service] ⏳ Entering ${cooldownSeconds}s cooldown period...`);
        await new Promise(resolve => setTimeout(resolve, cooldownSeconds * 1000));
        
        // Check if session recovered naturally
        try {
          const status = await this.getSessionStatus(sessionName);
          if (status.status === 'WORKING') {
            console.log(`[WAHA Service] ✅ Session recovered naturally after cooldown`);
            this.startEnhancedStatusMonitoring(); // Resume monitoring
            return true;
          }
        } catch (statusError) {
          console.log('[WAHA Service] Session status check failed after cooldown, will restart');
        }
        
        // If not recovered, restart session
        console.log(`[WAHA Service] 🔄 Session didn't recover naturally, attempting restart...`);
        const restartResult = await this.restartFailedSession(sessionName);
        
        if (restartResult) {
          // Wait for session to stabilize before resuming monitoring
          await new Promise(resolve => setTimeout(resolve, 30000)); // 30s stabilization
          this.startEnhancedStatusMonitoring(); // Resume monitoring with reduced frequency
          console.log(`[WAHA Service] ✅ Connection failure recovery completed successfully`);
        }
        
        return restartResult;
      }
      
      // For other errors, just try session recovery
      return await this.autoRecoverSession(sessionName);
      
    } catch (recoveryError: any) {
      console.error(`[WAHA Service] ❌ Connection failure recovery failed:`, recoveryError.message);
      return false;
    }
  }

  /**
   * Enhanced status monitoring with connection failure detection
   */
  public startEnhancedStatusMonitoring(): void {
    if (this.statusMonitorInterval) {
      clearInterval(this.statusMonitorInterval);
    }
    
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 3;
    
    const monitoringInterval = 45000; // Increased to 45 seconds to reduce load
    console.log(`[WAHA Service] 🔍 Starting enhanced status monitoring (${monitoringInterval/1000}s interval)...`);
    
    this.statusMonitorInterval = setInterval(async () => {
      try {
        const status = await this.getStatus();
        
        if (status.isReady) {
          consecutiveFailures = 0; // Reset failure counter on success
        } else {
          consecutiveFailures++;
          console.log(`[WAHA Service] ⚠️ Status monitoring failure ${consecutiveFailures}/${maxConsecutiveFailures}`);
          
          if (consecutiveFailures >= maxConsecutiveFailures) {
            console.log(`[WAHA Service] 🚨 ${maxConsecutiveFailures} consecutive failures, triggering recovery...`);
            consecutiveFailures = 0; // Reset to avoid endless recovery loops
            await this.handleConnectionFailure(this.defaultSession, new Error('Multiple consecutive status failures'));
          }
        }
      } catch (error: any) {
        consecutiveFailures++;
        console.error(`[WAHA Service] Status monitoring error ${consecutiveFailures}/${maxConsecutiveFailures}:`, error.message);
        
        // Handle specific connection failures (rate limiting and server errors)
        if (error.response?.status === 405 || error.response?.status === 500 || error.response?.status === 502 || error.response?.status === 503 || error.message?.includes('Connection Failure')) {
          console.log(`[WAHA Service] 🚨 Connection/Server failure detected during monitoring (${error.response?.status})`);
          consecutiveFailures = 0; // Reset to avoid double-handling
          await this.handleConnectionFailure(this.defaultSession, error);
        } else if (consecutiveFailures >= maxConsecutiveFailures) {
          console.log(`[WAHA Service] 🚨 ${maxConsecutiveFailures} consecutive monitoring errors, triggering recovery...`);
          consecutiveFailures = 0;
          await this.handleConnectionFailure(this.defaultSession, error);
        }
      }
    }, monitoringInterval);
  }

  /**
   * Stop status monitoring
   */
  public stopStatusMonitoring(): void {
    if (this.statusMonitorInterval) {
      clearInterval(this.statusMonitorInterval);
      this.statusMonitorInterval = null;
      console.log('[WAHA Service] 🛑 Status monitoring stopped');
    }
  }

  /**
   * Update global monitoring statistics
   */
  private updateMonitoringStats(messageData: WAHAWebhookMessagePayload): void {
    try {
      const g = global as { wahaMonitoringStats?: WAHAMonitoringStats; io?: { emit: (event: string, data: unknown) => void } };
      let stats: WAHAMonitoringStats = g.wahaMonitoringStats || {
        messagesCount: 0,
        imagesCount: 0,
        groupsCount: 0,
        privateChatsCount: 0,
        lastActivity: new Date().toISOString(),
        timestamp: Date.now()
      };

      stats.messagesCount += 1;

      if (messageData.isMedia && (messageData.type === 'image' || messageData.mimeType?.startsWith('image/'))) {
        stats.imagesCount += 1;
        console.log(`[WAHA Service] 📊 Image count updated: ${stats.imagesCount}`);
      }

      stats.lastActivity = new Date().toISOString();
      stats.timestamp = Date.now();

      g.wahaMonitoringStats = stats;

      const ioInstance = g.io;
      if (ioInstance) {
        ioInstance.emit('whatsapp:monitoring-stats', {
          totalMessages: stats.messagesCount,
          totalImages: stats.imagesCount,
          active: true,
          lastActivity: stats.lastActivity
        });
      }

    } catch (error) {
      console.error('[WAHA Service] Error updating monitoring stats:', error);
    }
  }

  /**
   * Extract image from WhatsApp message (Shula-style functionality)
   */
  public async extractImageFromMessage(messageId: string, sessionName?: string): Promise<any> {
    try {
      const session = sessionName || this.defaultSession;
      console.log(`[WAHA Service] 📷 Extracting image from message: ${messageId} (session: ${session})`);
      
      // First, get the message details to verify it contains media
      const messageUrl = `${this.wahaBaseUrl}/api/messages/${messageId}`;
      console.log(`[WAHA Service] Getting message details: ${messageUrl}`);
      
      const messageResponse = await this.httpClient.get(messageUrl, {
        params: { session }
      });
      
      if (!messageResponse.data) {
        return {
          success: false,
          error: 'Message not found'
        };
      }
      
      const messageData = messageResponse.data;
      
      // Check if message has media
      if (!messageData.hasMedia || messageData.type !== 'image') {
        return {
          success: false,
          error: 'Message does not contain an image'
        };
      }
      
      // Download the image using WAHA API
      const mediaUrl = `${this.wahaBaseUrl}/api/files/${messageId}`;
      console.log(`[WAHA Service] Downloading image: ${mediaUrl}`);
      
      const mediaResponse = await this.httpClient.get(mediaUrl, {
        params: { session },
        responseType: 'stream'
      });
      
      // Create images directory if it doesn't exist
      const fs = require('fs');
      const path = require('path');
      const crypto = require('crypto');
      
      const imagesDir = path.join(process.cwd(), 'public', 'images', 'whatsapp');
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }
      
      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const hash = crypto.createHash('md5').update(messageId).digest('hex').substring(0, 8);
      const extension = messageData.mimeType === 'image/jpeg' ? 'jpg' : 
                       messageData.mimeType === 'image/png' ? 'png' : 
                       messageData.mimeType === 'image/gif' ? 'gif' : 'jpg';
      
      const filename = `whatsapp-${timestamp}-${hash}.${extension}`;
      const filePath = path.join(imagesDir, filename);
      
      // Save the image
      const writer = fs.createWriteStream(filePath);
      mediaResponse.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          const stats = fs.statSync(filePath);
          console.log(`[WAHA Service] ✅ Image extracted successfully: ${filename} (${stats.size} bytes)`);
          
          resolve({
            success: true,
            filename,
            filePath: `/public/images/whatsapp/${filename}`,
            fileSize: stats.size,
            mimeType: messageData.mimeType || 'image/jpeg',
            originalMessageId: messageId,
            extractedAt: new Date().toISOString()
          });
        });
        
        writer.on('error', (error) => {
          console.error(`[WAHA Service] ❌ Error saving image:`, error);
          reject({
            success: false,
            error: 'Failed to save image: ' + error.message
          });
        });
      });
      
    } catch (error: any) {
      console.error(`[WAHA Service] ❌ Error extracting image from message ${messageId}:`, error);
      
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Message or media not found'
        };
      } else if (error.response?.status === 403) {
        return {
          success: false,
          error: 'Not authorized to access media'
        };
      } else {
        return {
          success: false,
          error: error.message || 'Failed to extract image'
        };
      }
    }
  }
}

export default WAHAService;