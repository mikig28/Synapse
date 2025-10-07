/**
 * WAHA WhatsApp Service - HTTP API Wrapper
 * Replaces the complex WhatsAppBaileysService with simple HTTP calls to WAHA microservice
 */

import axios from 'axios';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { WhatsAppMediaService, whatsappMediaService, MediaFileInfo } from './whatsappMediaService';
import WhatsAppMessage from '../models/WhatsAppMessage';
import WhatsAppContact from '../models/WhatsAppContact';
import GroupMonitorService from './groupMonitorService';
import { transcribeAudio } from './transcriptionService';
import { analyzeTranscription } from './analysisService';
import { locationExtractionService } from './locationExtractionService';
import { whatsappImageGridFSService } from './whatsappImageGridFSService';
import Task from '../models/Task';
import Note from '../models/Note';
import Idea from '../models/Idea';
import { io } from '../server';

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
  mimeType?: string;
  hasMedia?: boolean;
  mediaUrl?: string; // Added for compatibility
  caption?: string; // Caption for media messages
  media?: {
    url?: string;
    mimetype?: string;
    filename?: string;
    error?: string;
  };
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
  // NOTE: No longer a singleton! Each user gets their own instance
  private httpClient: any;
  private wahaBaseUrl: string;
  private defaultSession: string; // Set per-user via constructor
  private isReady = false;
  private connectionStatus = 'disconnected';
  private statusMonitorInterval: NodeJS.Timeout | null = null;
  private lastQrDataUrl: string | null = null;
  private lastQrGeneratedAt: number | null = null;
  private readonly qrReuseWindowMs = 25000; // reuse same QR for up to ~25s
  private readonly qrRequestCooldownMs = 5000; // avoid hammering WAHA
  private mediaService: WhatsAppMediaService;
  
  // Session status cache
  private sessionStatusCache: {
    data: any;
    timestamp: number;
  } = {
    data: null,
    timestamp: 0
  };
  private readonly SESSION_CACHE_DURATION = 10000; // 10 seconds

  // Health check cache
  private lastHealthCheckResult: { healthy: boolean; details: any } | null = null;
  private lastHealthCheckTimestamp: number = 0;
  
  // Groups endpoint circuit breaker
  private groupsEndpointFailures = 0;
  private groupsEndpointLastFailure = 0;
  private readonly GROUPS_CIRCUIT_BREAKER_THRESHOLD = 3;
  private readonly GROUPS_CIRCUIT_BREAKER_RESET_TIME = 300000; // 5 minutes

  private groupMonitorService: GroupMonitorService;

  /**
   * Persist a WAHA message item to MongoDB with summary metadata
   */
  private async persistWAHAMessage(item: any): Promise<void> {
    try {
      if (!item) return;

      // Extract fields with fallbacks
      const chatIdRaw = item.chatId || item.chat?.id || item.chat?.chatId || item.chat || item.to;
      if (!chatIdRaw) return;
      let chatId: string = String(chatIdRaw);
      if (!chatId.includes('@')) {
        chatId = chatId.includes('-') ? `${chatId}@g.us` : `${chatId}@s.whatsapp.net`;
      }

      const messageId = item.id || item.messageId || `${chatId}-${item.timestamp || Date.now()}`;
      const fromJid = item.from || item.author || item.sender?.id || item.participant || '';
      const fromMe: boolean = Boolean(item.fromMe);
      const isIncoming = !fromMe;
      const notifyName = item.notifyName || item.senderName || item.sender?.name || item.pushname || '';
      const type = item.type || (item.mimeType ? (item.mimeType.startsWith('image/') ? 'image' : item.mimeType.startsWith('video/') ? 'video' : item.mimeType.startsWith('audio/') ? 'audio' : 'media') : 'text');
      const body = item.body || item.text || item.message || item.caption || '';

      const tsNum = typeof item.timestamp === 'number' ? item.timestamp : (typeof item.ts === 'number' ? item.ts : Date.now());
      const ts = tsNum < 2e10 ? new Date(tsNum * 1000) : new Date(tsNum);

      const isGroup = chatId.includes('@g.us');
      const groupName = isGroup ? (item.chat?.name || item.groupName || notifyName) : undefined;

      // TODO: MULTI-USER SUPPORT NEEDED
      // This method is called from webhooks which don't have userId context yet
      // Temporarily disabled to prevent data corruption
      // Will be re-enabled once webhook routing passes userId
      console.warn('[WAHA Service] persistWAHAMessage: Temporarily disabled pending userId context from webhook routing');
      return;
    } catch (err) {
      console.warn('[WAHA Service] ⚠️ Persist WAHA message failed:', (err as any)?.message || err);
    }
  }

  /**
   * Handle WAHA webhook events to persist messages and react to status
   */
  public async handleWebhook(body: any): Promise<void> {
    try {
      const event = body?.event || body?.type;
      const payload = body?.payload ?? body?.message ?? body?.data ?? body;

      // Persist messages for common event names
      if (event && typeof event === 'string') {
        const e = event.toLowerCase();
        if (e.includes('message')) {
          if (Array.isArray(payload)) {
            for (const item of payload) {
              await this.persistWAHAMessage(item);
              // Forward to group monitor & update stats for each message
              try {
                await this.processMessageForGroupMonitoring(item);
              } catch (error) {
                console.error('[WAHA Service] ❌ Error processing message for group monitoring:', error);
              }
              try {
                this.updateMonitoringStats(item);
              } catch (error) {
                console.error('[WAHA Service] ❌ Error updating monitoring stats:', error);
              }
              // Process media messages (including voice) from webhooks
              try {
                const hasMedia = item.hasMedia || item.isMedia || item.type === 'ptt' || item.type === 'audio' || item.type === 'voice' || item.type === 'image' || item.type === 'video';
                if (hasMedia) {
                  console.log('[WAHA Service] 📡 Webhook media message detected, processing:', {
                    messageId: item.id,
                    type: item.type,
                    hasMedia: item.hasMedia,
                    mediaUrl: item.media?.url ? 'present' : 'absent'
                  });
                  await this.processMediaMessage(item);
                }
              } catch (error) {
                console.error('[WAHA Service] ❌ Error processing webhook media message:', error);
              }
            }
          } else {
            await this.persistWAHAMessage(payload);
            try {
              await this.processMessageForGroupMonitoring(payload);
            } catch (error) {
              console.error('[WAHA Service] ❌ Error processing message for group monitoring:', error);
            }
            try {
              this.updateMonitoringStats(payload);
            } catch (error) {
              console.error('[WAHA Service] ❌ Error updating monitoring stats:', error);
            }
            // Process media messages (including voice) from webhooks
            try {
              const hasMedia = payload.hasMedia || payload.isMedia || payload.type === 'ptt' || payload.type === 'audio' || payload.type === 'voice' || payload.type === 'image' || payload.type === 'video';
              if (hasMedia) {
                console.log('[WAHA Service] 📡 Webhook media message detected, processing:', {
                  messageId: payload.id,
                  type: payload.type,
                  hasMedia: payload.hasMedia,
                  mediaUrl: payload.media?.url ? 'present' : 'absent'
                });
                await this.processMediaMessage(payload);
              }
            } catch (error) {
              console.error('[WAHA Service] ❌ Error processing webhook media message:', error);
            }
          }
          return;
        }
        if (e === 'messages.upsert' || e === 'messages' || e === 'chat.message' || e === 'chat.messages') {
          if (Array.isArray(payload)) {
            for (const item of payload) {
              await this.persistWAHAMessage(item);
              try {
                await this.processMessageForGroupMonitoring(item);
              } catch (error) {
                console.error('[WAHA Service] ❌ Error processing message for group monitoring:', error);
              }
              try {
                this.updateMonitoringStats(item);
              } catch (error) {
                console.error('[WAHA Service] ❌ Error updating monitoring stats:', error);
              }
              // Process media messages (including voice) from webhooks
              try {
                const hasMedia = item.hasMedia || item.isMedia || item.type === 'ptt' || item.type === 'audio' || item.type === 'voice' || item.type === 'image' || item.type === 'video';
                if (hasMedia) {
                  console.log('[WAHA Service] 📡 Webhook media message detected, processing:', {
                    messageId: item.id,
                    type: item.type,
                    hasMedia: item.hasMedia,
                    mediaUrl: item.media?.url ? 'present' : 'absent'
                  });
                  await this.processMediaMessage(item);
                }
              } catch (error) {
                console.error('[WAHA Service] ❌ Error processing webhook media message:', error);
              }
            }
          } else {
            await this.persistWAHAMessage(payload);
            try {
              await this.processMessageForGroupMonitoring(payload);
            } catch (error) {
              console.error('[WAHA Service] ❌ Error processing message for group monitoring:', error);
            }
            try {
              this.updateMonitoringStats(payload);
            } catch (error) {
              console.error('[WAHA Service] ❌ Error updating monitoring stats:', error);
            }
            // Process media messages (including voice) from webhooks
            try {
              const hasMedia = payload.hasMedia || payload.isMedia || payload.type === 'ptt' || payload.type === 'audio' || payload.type === 'voice' || payload.type === 'image' || payload.type === 'video';
              if (hasMedia) {
                console.log('[WAHA Service] 📡 Webhook media message detected, processing:', {
                  messageId: payload.id,
                  type: payload.type,
                  hasMedia: payload.hasMedia,
                  mediaUrl: payload.media?.url ? 'present' : 'absent'
                });
                await this.processMediaMessage(payload);
              }
            } catch (error) {
              console.error('[WAHA Service] ❌ Error processing webhook media message:', error);
            }
          }
          return;
        }
        // Ignore other events (session.status handled in controller)
        return;
      }

      // If no event field, attempt to persist if payload looks like a message
      if (payload && (payload.chatId || payload.id || payload.from)) {
        if (Array.isArray(payload)) {
          for (const item of payload) {
            await this.persistWAHAMessage(item);
            // Process media if present
            try {
              const hasMedia = item.hasMedia || item.isMedia || item.type === 'ptt' || item.type === 'audio' || item.type === 'voice' || item.type === 'image' || item.type === 'video';
              if (hasMedia) {
                await this.processMediaMessage(item);
              }
            } catch (error) {
              console.error('[WAHA Service] ❌ Error processing webhook media message:', error);
            }
          }
        } else {
          await this.persistWAHAMessage(payload);
          // Process media if present
          try {
            const hasMedia = payload.hasMedia || payload.isMedia || payload.type === 'ptt' || payload.type === 'audio' || payload.type === 'voice' || payload.type === 'image' || payload.type === 'video';
            if (hasMedia) {
              await this.processMediaMessage(payload);
            }
          } catch (error) {
            console.error('[WAHA Service] ❌ Error processing webhook media message:', error);
          }
        }
      }
    } catch (err) {
      console.warn('[WAHA Service] ⚠️ handleWebhook error:', (err as any)?.message || err);
    }
  }

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

  /**
   * Constructor now accepts a sessionId parameter for multi-user support
   * @param sessionId - Unique session identifier for this user (e.g., 'user_123abc')
   */
  constructor(sessionId: string = 'default') {
    super();
    
    // Set the user-specific session as the default for this instance
    this.defaultSession = sessionId;
    console.log(`[WAHA Service] Creating instance for session: ${sessionId}`);
    
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
      timeout: 180000, // Increased to 3 minutes for Railway deployment and large chat lists
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
        const status = error.response?.status;
        const url = error.config?.url || '';

        // Don't log 404 as error for known unsupported endpoints (expected behavior)
        if (status === 404 && (url.includes('/groups') || url.includes('/groups/refresh'))) {
          console.log(`[WAHA API] ℹ️  ${status} ${url}: Endpoint not available (expected for some WAHA engines)`);
        } else {
          console.error(`[WAHA API] ❌ ${status || 'NETWORK_ERROR'} ${url}:`, error.message);
        }
        return Promise.reject(error);
      }
    );

    // Initialize media service for downloading files
    this.mediaService = whatsappMediaService;

    console.log(`[WAHA Service] Initialized with base URL: ${this.wahaBaseUrl}`);

    // Set up event listeners for authentication
    this.on('authenticated', this.handleAuthentication.bind(this));

    this.groupMonitorService = new GroupMonitorService();
    this.on('voice-message', this.handleVoiceMessage.bind(this));
  }

  /**
   * Extract a WhatsApp JID string from any WAHA id shape.
   * Handles objects like { _serialized }, { id }, or { user, server }.
   * Returns null for invalid values (including the literal "[object Object]").
   */
  private extractJidFromAny(rawId: any): string | null {
    try {
      if (!rawId) return null;
      if (typeof rawId === 'string') {
        const trimmed = rawId.trim();
        if (!trimmed || trimmed === '[object Object]' || trimmed.includes('[object')) return null;
        return trimmed;
      }
      if (typeof rawId === 'object') {
        if (typeof (rawId as any)._serialized === 'string') {
          const v = String((rawId as any)._serialized).trim();
          return v && v !== '[object Object]' && !v.includes('[object') ? v : null;
        }
        if (typeof (rawId as any).id === 'string') {
          const v = String((rawId as any).id).trim();
          return v && v !== '[object Object]' && !v.includes('[object') ? v : null;
        }
        if (typeof (rawId as any).user === 'string' && typeof (rawId as any).server === 'string') {
          return `${(rawId as any).user}@${(rawId as any).server}`;
        }
        const stringified = String(rawId).trim();
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

  /**
   * DEPRECATED: No longer needed - instances are created per-user via WhatsAppSessionManager
   * Kept for backward compatibility but will be removed in future versions
   */
  public static getInstance(sessionId: string = 'default'): WAHAService {
    console.warn('[WAHA Service] WARNING: getInstance() is deprecated. Use WhatsAppSessionManager instead.');
    return new WAHAService(sessionId);
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
      
      // Initialize polling timestamp to capture recent messages (last 1 hour for better debugging)
      this.lastPolledTimestamp = Date.now() - (1 * 60 * 60 * 1000); // 1 hour ago
      console.log(`[WAHA Service] 📅 Set polling timestamp to capture last 1 hour: ${new Date(this.lastPolledTimestamp)}`);
      
      // Start automatic message polling as fallback for webhooks
      this.startMessagePolling(30000); // Poll every 30 seconds
      console.log('[WAHA Service] 🔄 Started automatic message polling fallback');
      
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
        
        // If session is FAILED, delete and recreate it
        if (sessionData?.status === 'FAILED') {
          console.log(`[WAHA Service] ⚠️ Session '${sessionName}' is in FAILED state, deleting and recreating...`);
          try {
            await this.httpClient.delete(`/api/sessions/${sessionName}`);
            console.log(`[WAHA Service] ✅ Deleted failed session '${sessionName}'`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s for cleanup
            sessionExists = false; // Force recreation
          } catch (deleteErr: any) {
            console.error(`[WAHA Service] ❌ Failed to delete session '${sessionName}':`, deleteErr.message);
            // Continue anyway - will try to create
            sessionExists = false;
          }
        }
        // If session is stopped, we need to start it
        else if (sessionData?.status === 'STOPPED') {
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
          console.log(`[WAHA Service] ✅ Session '${sessionName}' start command sent, waiting for state transition...`);

          // Wait for session to transition from STOPPED to STARTING/SCAN_QR_CODE/WORKING
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Fetch updated session status
          try {
            const updatedSession = await this.httpClient.get(`/api/sessions/${sessionName}`);
            sessionData = updatedSession.data;
            console.log(`[WAHA Service] ✅ Session '${sessionName}' transitioned to: ${sessionData.status}`);
          } catch (fetchErr) {
            console.warn(`[WAHA Service] Could not fetch updated session status after start:`, fetchErr);
          }

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
        
        // Initialize config object
        if (!createPayload.config) {
          createPayload.config = {};
        }
        
        // Add webhook configuration - use environment variables if available
        const webhookEvents = process.env.WHATSAPP_HOOK_EVENTS ? 
          process.env.WHATSAPP_HOOK_EVENTS.split(',').map(e => e.trim()) : 
          ['session.status', 'message', 'message.any'];
        
        createPayload.config.webhooks = [
          {
            url: process.env.WHATSAPP_HOOK_URL || fullWebhookUrl,
            events: webhookEvents,
            hmac: process.env.WHATSAPP_HOOK_HMAC ? { key: process.env.WHATSAPP_HOOK_HMAC } : null,
            retries: {
              delaySeconds: 2,
              attempts: 15
            },
            customHeaders: this.parseCustomHeaders(process.env.WHATSAPP_HOOK_CUSTOM_HEADERS)
          }
        ];
        console.log(`[WAHA Service] 🔗 Adding webhook configuration to session: ${process.env.WHATSAPP_HOOK_URL || fullWebhookUrl}`);
        console.log(`[WAHA Service] 📡 Webhook events: ${webhookEvents.join(', ')}`);
        
        if (engine && engine.toUpperCase() === 'NOWEB' && nowebStoreEnabledEnv) {
          createPayload.config.noweb = {
            store: {
              enabled: true,
              fullSync: nowebFullSyncEnv
            }
          };
          console.log(`[WAHA Service] Enabling NOWEB store in session create (enabled=true, fullSync=${nowebFullSyncEnv})`);
        } else if (engine && engine.toUpperCase() === 'WEBJS' && webjsStoreEnabledEnv) {
          createPayload.config.webjs = {
            store: {
              enabled: true
            }
          };
          console.log(`[WAHA Service] Enabling WEBJS store in session create (enabled=true)`);
        }
        console.log(`[WAHA Service] Making POST request to /api/sessions with payload:`, createPayload);
        
        try {
          // Create session (minimal payload; webhooks added after successful start)
          const response = await this.httpClient.post('/api/sessions', createPayload);
          console.log(`[WAHA Service] ✅ Session creation response:`, response.status);
          console.log(`[WAHA Service] 📋 Full response data:`, JSON.stringify(response.data, null, 2));
          sessionData = response.data;
          sessionExists = true;
        } catch (createErr: any) {
          const status = createErr?.response?.status;
          console.warn(`[WAHA Service] ⚠️ Session create via /api/sessions failed (${status}). Falling back to /api/${sessionName}/start`);
          // Fallback path (supported by some WAHA versions): create+start in one call
          const fallbackPayload: any = { name: sessionName, start: true };
          if (engine) fallbackPayload.engine = engine;
          
          // Initialize config object for fallback
          if (!fallbackPayload.config) {
            fallbackPayload.config = {};
          }
          
          // Add webhook configuration to fallback
          fallbackPayload.config.webhooks = [
            {
              url: fullWebhookUrl,
              events: ['session.status', 'message'],
              hmac: null,
              retries: {
                delaySeconds: 2,
                attempts: 15
              }
            }
          ];
          console.log(`[WAHA Service] 🔗 Adding webhook configuration to fallback session: ${fullWebhookUrl}`);
          
          if (engine && engine.toUpperCase() === 'NOWEB' && nowebStoreEnabledEnv) {
            fallbackPayload.config.noweb = {
              store: {
                enabled: true,
                fullSync: nowebFullSyncEnv
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
          console.log(`[WAHA Service] ✅ Webhooks configured during session creation - no need to add separately`);
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
  async getSessionStatus(sessionName: string = this.defaultSession): Promise<any> {
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
      sortBy?: 'id'; // This WAHA instance only supports 'id'
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
          options.sortBy || 'id',
          'id'  // This WAHA instance only supports 'id' sortBy
        ]));

        for (const sortBy of candidates) {
          try {
            console.log(`[WAHA Service] Trying chats overview with sortBy='${sortBy}' and 180s timeout...`);
            // Use WAHA sessions-based endpoint first (modern WAHA)
            const res = await this.httpClient.get(`/api/sessions/${sessionName}/chats/overview`, { 
              timeout: 60000,
              params: {
                limit: Math.min(options.limit || 100, 30), // Use smaller pages
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
                  timeout: 60000,
                  params: {
                    limit: Math.min(options.limit || 100, 30),
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
          options.sortBy || 'id',
          'id'  // This WAHA instance only supports 'id' sortBy
        ]));

        for (const sortBy of candidates) {
          try {
            // Build WAHA-compliant query parameters with performance optimizations
            const params = new URLSearchParams();
            const effectiveLimit = Math.min(options.limit || 100, 50); // keep smaller to avoid timeouts
            params.append('limit', effectiveLimit.toString());
            if (options.offset) params.append('offset', options.offset.toString());
            params.append('sortBy', sortBy);
            params.append('sortOrder', options.sortOrder || 'desc');
            if (options.exclude?.length) params.append('exclude', options.exclude.join(','));

            const queryString = params.toString();
            // Prefer legacy path first for maximum compatibility, then sessions path
            const legacyEndpoint = `/api/${sessionName}/chats${queryString ? `?${queryString}` : ''}`;
            const sessionsEndpoint = `/api/sessions/${sessionName}/chats${queryString ? `?${queryString}` : ''}`;

            console.log(`[WAHA Service] Trying direct /chats (legacy-first) with sortBy='${sortBy}' and ${timeoutMs/1000}s timeout...`);
            console.log(`[WAHA Service] Using legacy endpoint: ${legacyEndpoint}`);
            let res = await this.httpClient.get(legacyEndpoint, { timeout: Math.min(timeoutMs, 60000) });
            const items = normalizeChats(res.data);
            console.log(`[WAHA Service] ✅ Direct /chats successful; got ${items.length} items (sortBy='${sortBy}')`);
            return mapChats(items);
          } catch (e: any) {
            const status = e?.response?.status;
            const errorMsg = e?.message || e;
            console.log(`[WAHA Service] ❌ /chats failed (sortBy='${sortBy}', ${timeoutMs/1000}s): ${errorMsg}`);
            // If legacy path 404s, try sessions path
            if (status === 404) {
              try {
                const params2 = new URLSearchParams();
                const effectiveLimit2 = Math.min(options.limit || 100, 50);
                params2.append('limit', effectiveLimit2.toString());
                if (options.offset) params2.append('offset', options.offset.toString());
                params2.append('sortBy', sortBy);
                params2.append('sortOrder', options.sortOrder || 'desc');
                if (options.exclude?.length) params2.append('exclude', options.exclude.join(','));
                const queryString2 = params2.toString();
                const sessionsEndpoint2 = `/api/sessions/${sessionName}/chats${queryString2 ? `?${queryString2}` : ''}`;
                console.log(`[WAHA Service] Trying sessions /chats endpoint: ${sessionsEndpoint2}`);
                const resSessions = await this.httpClient.get(sessionsEndpoint2, { timeout: Math.min(timeoutMs, 60000) });
                const itemsSessions = normalizeChats(resSessions.data);
                console.log(`[WAHA Service] ✅ Sessions /chats successful; got ${itemsSessions.length} items (sortBy='${sortBy}')`);
                return mapChats(itemsSessions);
              } catch (legacyErr: any) {
                console.log(`[WAHA Service] ❌ Sessions /chats failed:`, legacyErr?.response?.status || legacyErr?.message || legacyErr);
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
        // Minimal-parameter fallback: try legacy, then sessions without params
        try {
          const minimalLegacy = `/api/${sessionName}/chats`;
          console.log(`[WAHA Service] Trying minimal legacy /chats without params: ${minimalLegacy}`);
          const resMinLegacy = await this.httpClient.get(minimalLegacy, { timeout: 45000 });
          const itemsMinLegacy = normalizeChats(resMinLegacy.data);
          console.log(`[WAHA Service] ✅ Minimal legacy /chats successful; got ${itemsMinLegacy.length} items`);
          if (itemsMinLegacy.length > 0) return mapChats(itemsMinLegacy);
        } catch (e1: any) {
          console.log(`[WAHA Service] ❌ Minimal legacy /chats failed:`, e1?.response?.status || e1?.message || e1);
          try {
            const minimalSessions = `/api/sessions/${sessionName}/chats`;
            console.log(`[WAHA Service] Trying minimal sessions /chats without params: ${minimalSessions}`);
            const resMinSessions = await this.httpClient.get(minimalSessions, { timeout: 45000 });
            const itemsMinSessions = normalizeChats(resMinSessions.data);
            console.log(`[WAHA Service] ✅ Minimal sessions /chats successful; got ${itemsMinSessions.length} items`);
            if (itemsMinSessions.length > 0) return mapChats(itemsMinSessions);
          } catch (e2: any) {
            console.log(`[WAHA Service] ❌ Minimal sessions /chats failed:`, e2?.response?.status || e2?.message || e2);
          }
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
      // Reduce timeouts to fit platform proxy limits (avoid 502/120s timeouts). Use shorter retries instead.
      const baseTimeout = isWebJS ? 110000 : 90000; // ~110s WEBJS, 90s others
      
      console.log(`[WAHA Service] Starting ${engineName}-optimized chat loading sequence for session '${sessionName}'...`);
      if (isWebJS) {
        console.log(`[WAHA Service] Using extended timeouts for WEBJS engine (initial sync can take 5+ minutes)`);
      }
      
      // Skip overview endpoint (not supported on many builds); use direct /chats path
      let chats: WAHAChat[] | null = await tryChats(baseTimeout);
      
      if (!chats || chats.length === 0) {
        console.log(`[WAHA Service] First /chats attempt failed, retrying with reduced limit...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        chats = await tryChats(Math.floor(baseTimeout * 0.6));
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
        const endpoint = `/api/sessions/${sessionName}/groups${queryString ? `?${queryString}` : ''}`;
        
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
      const response = await this.httpClient.post(`/api/sessions/${sessionName}/groups/refresh`, {}, { timeout: 15000 });
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
   * Get a specific message by ID with optional media download
   */
  async getMessage(messageId: string, downloadMedia: boolean = false, sessionName: string = this.defaultSession): Promise<any | null> {
    try {
      // URL-encode message ID since it contains special characters like @ and -
      const encodedMessageId = encodeURIComponent(messageId);
      const response = await this.httpClient.get(`/api/messages/${encodedMessageId}`, {
        params: {
          session: sessionName,
          downloadMedia: downloadMedia ? 'true' : 'false'
        },
        timeout: 30000
      });

      console.log(`[WAHA Service] ✅ Retrieved message ${messageId} (downloadMedia: ${downloadMedia})`);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        console.warn(`[WAHA Service] Message ${messageId} not found`);
        return null;
      }
      console.error('[WAHA Service] ❌ Error getting message:', error?.message || error);
      throw error;
    }
  }

  /**
   * Download media directly from WAHA using alternative endpoint
   * Used when getMessage doesn't return media URL (common with NOWEB engine)
   */
  /**
   * Helper to determine media subdirectory, file extension, and prefix based on mimeType
   */
  private getMediaStorageInfo(mimeType: string): { subdir: string; extension: string; prefix: string; icon: string } {
    const mime = mimeType.toLowerCase();
    
    if (mime.startsWith('image/')) {
      const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      return { subdir: 'images', extension: ext, prefix: 'image', icon: '🖼️' };
    } else if (mime.startsWith('video/')) {
      const ext = mime.split('/')[1] || 'mp4';
      return { subdir: 'videos', extension: ext, prefix: 'video', icon: '🎥' };
    } else if (mime.startsWith('audio/') || mime.includes('ogg') || mime.includes('opus')) {
      let ext = 'oga';
      if (mime.includes('ogg')) ext = 'ogg';
      else if (mime.includes('mp3')) ext = 'mp3';
      else if (mime.includes('mp4')) ext = 'mp4';
      else if (mime.includes('mpeg')) ext = 'mp3';
      return { subdir: 'voice', extension: ext, prefix: 'voice', icon: '🎙️' };
    } else {
      // Documents and other files
      let ext = mime.split('/')[1] || 'bin';
      if (mime.includes('pdf')) ext = 'pdf';
      else if (mime.includes('document')) ext = 'doc';
      return { subdir: 'documents', extension: ext, prefix: 'doc', icon: '📄' };
    }
  }

  async downloadMediaDirect(messageId: string, chatId: string, sessionName: string = this.defaultSession): Promise<{ localPath: string; mimeType: string } | null> {
    try {
      console.log('[WAHA Service] 📥 Attempting direct media download via WAHA endpoints:', {
        messageId,
        chatId,
        session: sessionName
      });

      // WORKAROUND: Fetch recent messages from the chat to find this specific message with media URL
      // WAHA webhooks don't include media URLs, but the /chats/{chatId}/messages endpoint does
      console.log('[WAHA Service] 🔍 Fetching recent messages from chat to find media URL...');
      try {
        const recentMessages = await this.httpClient.get(`/api/${sessionName}/chats/${encodeURIComponent(chatId)}/messages`, {
          params: { limit: 10, downloadMedia: 'true' }, // CRITICAL: Must be true to get media URLs
          timeout: 30000 // Increased timeout since downloading media
        });

        if (recentMessages.data && Array.isArray(recentMessages.data)) {
          // Find our message by ID
          const targetMessage = recentMessages.data.find((msg: any) => msg.id === messageId);

          if (targetMessage && targetMessage.media && targetMessage.media.url) {
            console.log('[WAHA Service] ✅ Found media URL from recent messages:', targetMessage.media.url);

            // Download the media from the URL
            const mediaResponse = await this.httpClient.get(targetMessage.media.url, {
              responseType: 'arraybuffer',
              timeout: 30000
            });

            if (mediaResponse.data && mediaResponse.data.byteLength > 0) {
              const mimeType = targetMessage.media.mimetype || mediaResponse.headers['content-type'] || 'application/octet-stream';
              const storageInfo = this.getMediaStorageInfo(mimeType);

              const filename = `${storageInfo.prefix}_${messageId.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${storageInfo.extension}`;
              const storageDir = path.join(process.cwd(), 'storage', 'whatsapp-media', storageInfo.subdir);

              if (!fs.existsSync(storageDir)) {
                fs.mkdirSync(storageDir, { recursive: true });
              }

              const localPath = path.join(storageDir, filename);
              fs.writeFileSync(localPath, mediaResponse.data);

              console.log(`[WAHA Service] ${storageInfo.icon} ✅ Media download successful from chat messages:`, {
                localPath,
                fileSize: mediaResponse.data.byteLength,
                mimeType,
                mediaType: storageInfo.prefix
              });

              return { localPath, mimeType };
            }
          } else {
            console.log('[WAHA Service] ⚠️ Message found in recent messages but no media URL:', {
              messageFound: !!targetMessage,
              hasMedia: targetMessage?.media ? 'yes' : 'no',
              hasUrl: targetMessage?.media?.url ? 'yes' : 'no'
            });
          }
        }
      } catch (chatMessagesError: any) {
        console.log('[WAHA Service] ⚠️ Failed to fetch recent messages from chat:', chatMessagesError.response?.status || chatMessagesError.message);
      }

      // Fallback: Try multiple WAHA download endpoints
      // URL-encode IDs since they contain special characters
      const encodedMessageId = encodeURIComponent(messageId);
      const encodedChatId = encodeURIComponent(chatId);

      const endpoints = [
        // Endpoint 1: WAHA's proper download endpoint for messages (WEBJS/NOWEB)
        `/api/${sessionName}/chats/${encodedChatId}/messages/${encodedMessageId}/download`,
        // Endpoint 2: Alternative direct download
        `/api/${sessionName}/messages/${encodedMessageId}/download`,
        // Endpoint 3: Standard messages endpoint
        `/api/${sessionName}/messages/${encodedMessageId}/media`,
        // Endpoint 4: Alternative format for WEBJS
        `/api/messages/${encodedMessageId}/media?session=${sessionName}`
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`[WAHA Service] 🔄 Trying endpoint: ${endpoint}`);
          const response = await this.httpClient.get(endpoint, {
            responseType: 'arraybuffer',
            timeout: 30000,
            validateStatus: (status) => status === 200
          });

          if (response.data && response.data.byteLength > 0) {
            const mimeType = response.headers['content-type'] || 'application/octet-stream';
            const storageInfo = this.getMediaStorageInfo(mimeType);

            const filename = `${storageInfo.prefix}_${messageId.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${storageInfo.extension}`;
            const storageDir = path.join(process.cwd(), 'storage', 'whatsapp-media', storageInfo.subdir);

            if (!fs.existsSync(storageDir)) {
              fs.mkdirSync(storageDir, { recursive: true });
            }

            const localPath = path.join(storageDir, filename);
            fs.writeFileSync(localPath, response.data);

            console.log(`[WAHA Service] ${storageInfo.icon} ✅ Direct media download successful:`, {
              endpoint,
              localPath,
              fileSize: response.data.byteLength,
              mimeType,
              mediaType: storageInfo.prefix
            });

            return { localPath, mimeType };
          }
        } catch (endpointError: any) {
          console.log(`[WAHA Service] ⚠️ Endpoint ${endpoint} failed: ${endpointError.response?.status || endpointError.message}`);
          // Continue to next endpoint
        }
      }

      console.log('[WAHA Service] ❌ All download methods failed');
      return null;
    } catch (error: any) {
      console.error('[WAHA Service] 🎙️ ❌ Direct media download failed:', error?.message || error);
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
      // Request downloadMedia=true to get full message details including type, MIME, and media URLs
      let response = await this.httpClient.get('/api/messages', {
        params: {
          session: sessionName,
          chatId: chatId,
          limit,
          downloadMedia: 'true' // Required for voice messages and other media to have downloadable URLs
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
              limit,
              downloadMedia: 'true' // Include media URLs
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
  // Duplicate handleWebhook removed; use the primary handleWebhook(body) above
  /* async handleWebhook(payload: any): Promise<void> {
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
          // Save message to WhatsApp messages database
          this.saveMessageToDatabase(eventData);
          // Forward message data for group monitoring
          this.processMessageForGroupMonitoring(eventData);
          // Process media messages and download files
          this.processMediaMessage(eventData);
          // Update monitoring statistics
          this.updateMonitoringStats(eventData);
          // Persist to Mongo so summarization can query it
          try {
            const WhatsAppMessageModel = require('../models/WhatsAppMessage').default;
            const WhatsAppContactModel = require('../models/WhatsAppContact').default;
            const fromPhone = String(eventData.from || '').split('@')[0] || '';
            if (fromPhone) {
              let contact = await WhatsAppContactModel.findOne({ phoneNumber: fromPhone });
              if (!contact) {
                contact = new WhatsAppContactModel({
                  phoneNumber: fromPhone,
                  name: eventData.contactName || `Contact ${fromPhone}`,
                  isOnline: true,
                  lastSeen: new Date(),
                  unreadCount: 1,
                  isBusinessContact: !!eventData.isGroup,
                  totalMessages: 1,
                  totalIncomingMessages: 1,
                  totalOutgoingMessages: 0
                });
                await contact.save();
              } else {
                contact.lastSeen = new Date();
                contact.unreadCount += 1;
                contact.isOnline = true;
                contact.lastMessage = eventData.body || '[Media]';
                contact.lastMessageTimestamp = new Date();
                contact.totalMessages += 1;
                contact.totalIncomingMessages += 1;
                await contact.save();
              }

              const chatId = eventData.chatId || eventData.to || undefined;
              const isGroupMsg = !!eventData.isGroup || (typeof chatId === 'string' && chatId.endsWith('@g.us'));
              const doc = new WhatsAppMessageModel({
                messageId: eventData.id,
                from: fromPhone,
                to: chatId || 'business',
                message: eventData.body || '',
                timestamp: new Date((eventData.timestamp || Date.now()) * (String(eventData.timestamp).length < 13 ? 1000 : 1)),
                type: eventData.type || 'text',
                status: 'received',
                isIncoming: true,
                contactId: contact._id,
                metadata: {
                  isGroup: isGroupMsg,
                  groupId: isGroupMsg ? chatId : undefined,
                  groupName: isGroupMsg ? (eventData.groupName || eventData.chatName || undefined) : undefined
                }
              });
              await doc.save().catch(() => {});
            }
          } catch (persistError) {
            console.log('[WAHA Service] Persistence warning:', (persistError as Error).message);
          }
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
  } */

  /**
   * Save message to WhatsApp messages database
   */
  private async saveMessageToDatabase(messageData: any): Promise<void> {
    try {
      console.log('[WAHA Service] Saving message to database:', {
        messageId: messageData.id,
        chatId: messageData.chatId,
        from: messageData.from,
        body: messageData.body?.substring(0, 100) + (messageData.body?.length > 100 ? '...' : ''),
        isGroup: messageData.isGroup,
        type: messageData.type,
        timestamp: messageData.timestamp
      });

      // Convert WAHA timestamp to Date (WAHA uses Unix timestamp in seconds)
      let timestamp: Date;
      if (messageData.timestamp) {
        // WAHA timestamps are in seconds, convert to milliseconds
        const tsNumber = Number(messageData.timestamp);
        // Check if it's already in milliseconds (>1000000000000) or seconds
        timestamp = tsNumber > 1000000000000 ? new Date(tsNumber) : new Date(tsNumber * 1000);
      } else {
        timestamp = new Date();
      }
      
      console.log(`[WAHA Service] 📅 Message timestamp: ${messageData.timestamp} → ${timestamp.toISOString()}`);

      // Create or find contact
      let contact = await WhatsAppContact.findOne({ phoneNumber: messageData.from });
      if (!contact) {
        contact = new WhatsAppContact({
          name: messageData.contactName || messageData.from,
          phoneNumber: messageData.from,
          lastMessageTimestamp: timestamp
        });
        await contact.save();
        console.log('[WAHA Service] Created new contact:', contact._id);
      } else {
        // Update last message timestamp
        contact.lastMessageTimestamp = timestamp;
        await contact.save();
      }

      // Prepare message data
      // Determine media type for descriptive placeholder
      const detectedMediaType = messageData.hasMedia || messageData.isMedia ?
        this.getMediaType(messageData.media?.mimetype || messageData.mimeType, messageData.type) : undefined;

      // For media messages without body text, use descriptive placeholder
      let messageText = messageData.body || messageData.caption || '';
      if (!messageText && (messageData.isMedia || messageData.hasMedia || detectedMediaType)) {
        const mediaTypeLabel = detectedMediaType === 'voice' ? 'Voice Message' :
                              detectedMediaType === 'image' ? 'Image' :
                              detectedMediaType === 'video' ? 'Video' :
                              detectedMediaType === 'document' ? 'Document' : 'Media';
        messageText = `[${mediaTypeLabel}]`;
      }

      const messageDoc = {
        messageId: messageData.id,
        from: messageData.from,
        to: messageData.chatId,
        message: messageText || '[Message]',
        timestamp: timestamp,
        type: this.mapMessageType(messageData.type),
        status: messageData.fromMe ? 'sent' : 'received',
        isIncoming: !messageData.fromMe,
        contactId: contact._id,

        // Media information
        mediaId: messageData.media?.id,
        mediaUrl: messageData.media?.url || messageData.mediaUrl,
        mimeType: messageData.media?.mimetype || messageData.mimeType,
        caption: messageData.body,
        mediaType: detectedMediaType,
        
        // Metadata
        metadata: {
          forwarded: messageData.forwarded || false,
          forwardedMany: messageData.forwardedMany || false,
          isGroup: messageData.isGroup || false,
          groupId: messageData.isGroup ? messageData.chatId : undefined,
          groupName: messageData.isGroup ? messageData.groupName : undefined
        }
      };

      // Check if message already exists
      const existingMessage = await WhatsAppMessage.findOne({ messageId: messageData.id });
      if (existingMessage) {
        console.log('[WAHA Service] Message already exists, skipping:', messageData.id);
        return;
      }

      // Save message
      const message = new WhatsAppMessage(messageDoc);
      await message.save();
      console.log('[WAHA Service] ✅ Message saved to database:', messageData.id);

    } catch (error) {
      console.error('[WAHA Service] ❌ Error saving message to database:', error);
    }
  }

  /**
   * Save image to WhatsAppImage database for images page
   */
  private async saveImageToDatabase(messageData: any): Promise<void> {
    try {
      const WhatsAppImage = require('../models/WhatsAppImage').default;
      const GroupMonitor = require('../models/GroupMonitor').default;
      
      console.log('[WAHA Service] 📸 Saving image to WhatsAppImage database:', {
        messageId: messageData.messageId,
        chatId: messageData.chatId,
        localPath: messageData.localPath,
        fileSize: messageData.fileSize
      });

      // Check if image already exists
      const existingImage = await WhatsAppImage.findOne({ messageId: messageData.messageId });
      if (existingImage) {
        console.log('[WAHA Service] Image already exists in database, skipping:', messageData.messageId);
        return;
      }

      // Find the user who owns this group monitor
      const monitor = await GroupMonitor.findOne({ 
        groupId: messageData.chatId,
        isActive: true 
      }).populate('userId');
      
      if (!monitor) {
        console.warn('[WAHA Service] ⚠️ No active group monitor found for chatId:', messageData.chatId);
        return;
      }

      const user = monitor.userId;
      console.log('[WAHA Service] ✅ Found monitoring user:', user.email, 'for group:', messageData.chatName);

      // Extract filename from localPath
      const path = require('path');
      const filename = path.basename(messageData.localPath);

      // Create image record
      const imageDoc = {
        messageId: messageData.messageId,
        chatId: messageData.chatId,
        chatName: messageData.chatName,
        userId: user._id,
        senderId: messageData.senderId,
        senderName: messageData.senderName,
        caption: messageData.caption,
        filename: filename,
        localPath: messageData.localPath,
        size: messageData.fileSize || 0,
        mimeType: messageData.mimeType || 'image/jpeg',
        extractionMethod: 'waha-plus',
        extractedAt: new Date(),
        extractedBy: user._id,
        isGroup: Boolean(messageData.isGroup),
        status: 'extracted',
        tags: [],
        isBookmarked: false,
        isArchived: false
      };

      const image = new WhatsAppImage(imageDoc);
      await image.save();
      
      console.log('[WAHA Service] ✅ Image saved to WhatsAppImage database:', {
        imageId: image._id,
        messageId: messageData.messageId,
        filename: filename,
        userId: user._id
      });

      // Emit event for real-time frontend update
      const io_instance = (global as any).io;
      if (io_instance) {
        io_instance.emit('whatsapp:new-image', {
          imageId: image._id.toString(),
          messageId: messageData.messageId,
          chatId: messageData.chatId,
          chatName: messageData.chatName,
          caption: messageData.caption,
          timestamp: messageData.timestamp
        });
        console.log('[WAHA Service] 📡 Emitted whatsapp:new-image event to frontend');
      }

      // Send confirmation message back to the WhatsApp group (only if enabled)
      if (monitor.settings?.sendFeedbackMessages) {
        try {
          const confirmMessage = `✅ תמונה נשמרה בהצלחה!
📸 התמונה נוספה לגלריה שלך ב-Synapse`;
          await this.sendMessage(messageData.chatId, confirmMessage);
          console.log('[WAHA Service] ✅ Sent confirmation message to group:', messageData.chatId);
        } catch (sendError) {
          console.error('[WAHA Service] ❌ Failed to send confirmation to group:', sendError);
        }
      } else {
        console.log('[WAHA Service] ℹ️ Feedback disabled, skipping image confirmation');
      }

    } catch (error) {
      console.error('[WAHA Service] ❌ Error saving image to database:', error);
    }
  }

  /**
   * Forward messages to group monitor service
   */
  private async processMessageForGroupMonitoring(messageData: any): Promise<void> {
    const rawChatCandidates = [
      messageData.chatId,
      messageData.chat?.id,
      messageData.chat?.chatId,
      messageData.groupId,
      messageData.remoteJid,
      messageData.to,
      typeof messageData.id === 'string' && messageData.id.includes('@') ? messageData.id.split('_')[1] : undefined
    ];

    const chatId = rawChatCandidates
      .map(candidate => this.extractJidFromAny(candidate))
      .find((candidate): candidate is string => Boolean(candidate));

    const fromJid = this.extractJidFromAny(messageData.from);
    const authorJid = this.extractJidFromAny(
      messageData.author ||
      messageData.participant ||
      messageData.sender?.id ||
      messageData.senderId
    );
    let groupId = this.extractJidFromAny(messageData.groupId || messageData.group?.id);

    if (!groupId) {
      if (chatId && chatId.endsWith('@g.us')) {
        groupId = chatId;
      } else if (fromJid && fromJid.endsWith('@g.us')) {
        groupId = fromJid;
      }
    }

    const derivedChatId = chatId || groupId || fromJid || messageData.chatId;
    let isGroupMessage = typeof messageData.isGroup === 'boolean' ? messageData.isGroup : false;

    if (!isGroupMessage) {
      if (groupId && groupId.endsWith('@g.us')) {
        isGroupMessage = true;
      } else if (fromJid && fromJid.endsWith('@g.us')) {
        isGroupMessage = true;
      } else if (typeof messageData.id === 'string' && messageData.id.includes('@g.us')) {
        isGroupMessage = true;
      }

      // Enhanced group detection for WAHA messages
      // Check if message has group indicators even with @c.us format
      if (!isGroupMessage && messageData.id) {
        // Look for group patterns in message ID (format: false_sender@c.us_id)
        const idParts = messageData.id.split('_');
        if (idParts.length >= 3) {
          // Try to extract potential group ID from message context
          const potentialGroupId = idParts[1];
          if (potentialGroupId && potentialGroupId.includes('-') && potentialGroupId.includes('@')) {
            // This might be a group message with individual sender format
            isGroupMessage = true;
            // Try to construct the group ID
            if (!groupId) {
              const groupBase = potentialGroupId.replace('@c.us', '');
              if (groupBase.includes('-')) {
                groupId = groupBase + '@g.us';
              }
            }
          }
        }
      }

      // Additional check: if we have multiple participants or specific message patterns
      if (!isGroupMessage && (messageData.author || messageData.participant)) {
        // Message has author/participant data, likely from a group
        isGroupMessage = true;
      }
    }

    console.log('[WAHA Service] ?? Processing message for group monitoring:', {
      id: messageData.id,
      chatId: derivedChatId,
      originalChatId: messageData.chatId,
      from: messageData.from,
      author: messageData.author,
      participant: messageData.participant,
      resolvedGroupId: groupId,
      resolvedSenderId: authorJid || fromJid,
      hasMedia: Boolean(messageData.hasMedia || messageData.isMedia || messageData.mediaUrl || messageData.media),
      type: messageData.type,
      isGroupOriginal: messageData.isGroup,
      isGroupDerived: isGroupMessage,
      // Additional debug fields
      rawMessageFields: {
        groupId: messageData.groupId,
        group: messageData.group,
        remoteJid: messageData.remoteJid,
        to: messageData.to
      }
    });

    try {
      if (!groupId || !isGroupMessage) {
        console.log('[WAHA Service] ?? Skipping message - unable to confirm group context', {
          messageId: messageData.id,
          derivedChatId,
          groupId,
          isGroupMessage
        });
        return;
      }

      const senderId = authorJid || fromJid || groupId;
      const senderName =
        messageData.pushName ||
        messageData.senderName ||
        messageData.contactName ||
        messageData.notifyName ||
        senderId;

      const caption = messageData.caption ?? messageData.body ?? messageData.text ?? '';

      const payload: any = {
        messageId: messageData.id,
        groupId,
        chatId: derivedChatId,
        senderId,
        senderName,
        caption
      };

      let mediaUrl = messageData.mediaUrl || messageData.media?.url || null;
      let hasMedia = Boolean(messageData.hasMedia || messageData.isMedia || mediaUrl);

      // NOWEB engine workaround: if message claims hasMedia but no URL, try to get message with downloadMedia=true
      if ((messageData.hasMedia === true || messageData.isMedia === true) && !mediaUrl) {
        console.log('[WAHA Service] 🔄 NOWEB workaround: Re-fetching message with downloadMedia=true for:', messageData.id);
        try {
          const refetchedMessage = await this.getMessage(messageData.id, true); // downloadMedia=true
          if (refetchedMessage?.media?.url) {
            mediaUrl = refetchedMessage.media.url;
            hasMedia = true;
            console.log('[WAHA Service] ✅ Media URL recovered via re-fetch:', mediaUrl);
          }
        } catch (refetchError) {
          console.warn('[WAHA Service] ⚠️ Failed to re-fetch message for media:', refetchError);
        }
      }

      const isImage = Boolean(
        hasMedia &&
        (
          messageData.type === 'image' ||
          (typeof messageData.mimeType === 'string' && messageData.mimeType.startsWith('image/')) ||
          (typeof messageData.media?.mimetype === 'string' && messageData.media.mimetype.startsWith('image/'))
        )
      );
      if (isImage && mediaUrl) {
        payload.imageUrl = mediaUrl;
        console.log('[WAHA Service] ?? Adding image URL to payload:', mediaUrl);
      }

      const webhookOnly = String(process.env.GROUP_MONITOR_WEBHOOK_ONLY || '').toLowerCase() === 'true';
      const forwardWebhook = String(process.env.GROUP_MONITOR_FORWARD_WEBHOOK || '').toLowerCase() === 'true';
      let processedDirectly = false;
      let directProcessingError: unknown = null;

      if (!webhookOnly) {
        try {
          await this.groupMonitorService.processGroupMessage(
            payload.messageId,
            payload.groupId,
            payload.senderId,
            payload.senderName,
            {
              imageUrl: payload.imageUrl,
              caption: payload.caption,
              text: payload.caption,
            }
          );
          processedDirectly = true;
          console.log('[WAHA Service] ? Message processed via internal group monitor service:', {
            messageId: payload.messageId,
            groupId: payload.groupId
          });
        } catch (serviceError) {
          directProcessingError = serviceError;
          console.error('[WAHA Service] ? Internal group monitor processing failed, will fall back to webhook:', serviceError);
        }
      }

      if (processedDirectly && !forwardWebhook) {
        return;
      }

      const webhookUrl = this.getGroupMonitorWebhookUrl();
      if (!webhookUrl) {
        if (processedDirectly) {
          return;
        }

        console.warn('[WAHA Service] ?? No webhook URL configured for group monitor forwarding');
        if (directProcessingError) {
          throw directProcessingError;
        }
        return;
      }

      const response = await axios.post(webhookUrl, payload, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('[WAHA Service] ? Successfully sent message to group monitor webhook:', {
        status: response.status,
        messageId: messageData.id,
        groupId: payload.groupId,
        webhookUrl
      });
    } catch (error: any) {
      console.error('[WAHA Service] ? Error processing message for group monitoring:', {
        messageId: messageData.id,
        groupId,
        error: error?.message || error,
        status: error?.response?.status,
        response: error?.response?.data
      });
      throw error;
    }
  }

  /**
   * Process media messages and download files from WAHA
   */
  private async processMediaMessage(messageData: any): Promise<void> {
    try {
      // Check if message contains media OR is a PTT (push-to-talk) voice note
      const isPTT = messageData.type === 'ptt' || 
                    messageData.type === 'audio' || 
                    messageData.type === 'voice' ||
                    (messageData.type && String(messageData.type).toLowerCase().includes('voice')) ||
                    (messageData.type && String(messageData.type).toLowerCase().includes('audio'));
      if (!messageData.hasMedia && !messageData.isMedia && !messageData.media && !isPTT) {
        return;
      }

      // Enhanced logging for voice/PTT detection
      if (isPTT) {
        console.log('[WAHA Service] 🎙️ PTT/Voice message detected:', {
          messageId: messageData.id,
          type: messageData.type,
          chatId: messageData.chatId,
          mimeType: messageData.mimeType,
          hasMedia: messageData.hasMedia,
          media: messageData.media,
          hasMediaUrl: !!messageData.mediaUrl
        });

        // For voice messages without media URL, try multiple approaches
        if (!messageData.media?.url && !messageData.mediaUrl) {
          console.log('[WAHA Service] 🎙️ Voice message missing media URL, trying multiple download approaches...');
          
          // Approach 1: Try to fetch full message details with downloadMedia=true
          try {
            const fullMessage = await this.getMessage(messageData.id, true);
            if (fullMessage?.media?.url) {
              console.log('[WAHA Service] 🎙️ ✅ Retrieved voice media URL from WAHA via getMessage:', fullMessage.media.url);
              messageData.media = fullMessage.media;
              messageData.mediaUrl = fullMessage.media.url;
              messageData.mimeType = fullMessage.media.mimetype || fullMessage.mimeType || messageData.mimeType;
            } else {
              // Approach 2: Try direct media download endpoint
              console.log('[WAHA Service] 🎙️ getMessage didn\'t provide URL, trying direct download...');
              const directDownload = await this.downloadMediaDirect(messageData.id, messageData.chatId);
              if (directDownload) {
                console.log('[WAHA Service] 🎙️ ✅ Direct download successful, setting up media data');
                // Create a pseudo media URL pointing to our local file
                messageData.localPath = directDownload.localPath;
                messageData.mimeType = directDownload.mimeType;
                // Skip the normal download process since we already have the file
                messageData.skipNormalDownload = true;
              } else {
                console.warn('[WAHA Service] 🎙️ ⚠️ Could not retrieve or download voice message media');
              }
            }
          } catch (fetchError) {
            console.error('[WAHA Service] 🎙️ ❌ Failed to fetch voice message details:', fetchError);
            // Try direct download as fallback
            try {
              const directDownload = await this.downloadMediaDirect(messageData.id, messageData.chatId);
              if (directDownload) {
                console.log('[WAHA Service] 🎙️ ✅ Fallback direct download successful');
                messageData.localPath = directDownload.localPath;
                messageData.mimeType = directDownload.mimeType;
                messageData.skipNormalDownload = true;
              }
            } catch (directError) {
              console.error('[WAHA Service] 🎙️ ❌ All download approaches failed:', directError);
            }
          }
        }
      }

      console.log('[WAHA Service] Processing media message:', {
        messageId: messageData.id,
        chatId: messageData.chatId,
        hasMedia: messageData.hasMedia,
        isMedia: messageData.isMedia,
        media: messageData.media,
        type: messageData.type,
        mimeType: messageData.mimeType,
        isPTT
      });

      // Check if we have media information from WAHA webhook
      let mediaInfo: MediaFileInfo | null = null;

      if (messageData.media && messageData.media.url) {
        // New WAHA format with media object
        // Validate URL format - NOWEB sometimes provides invalid URLs like "Hahs"
        const isValidUrl = messageData.media.url.startsWith('http://') || messageData.media.url.startsWith('https://');

        if (!isValidUrl) {
          console.log(`[WAHA Service] 🔄 Invalid media URL "${messageData.media.url}" - attempting re-fetch for message:`, messageData.id);
          try {
            const refetchedMessage = await this.getMessage(messageData.id, true);
            if (refetchedMessage?.media?.url && (refetchedMessage.media.url.startsWith('http://') || refetchedMessage.media.url.startsWith('https://'))) {
              console.log(`[WAHA Service] ✅ Valid URL recovered via re-fetch:`, refetchedMessage.media.url);
              mediaInfo = {
                url: refetchedMessage.media.url,
                mimetype: refetchedMessage.media.mimetype || messageData.mimeType || 'application/octet-stream',
                filename: refetchedMessage.media.filename || null,
                error: refetchedMessage.media.error || null
              };
            } else {
              console.warn(`[WAHA Service] ⚠️ Re-fetch did not provide valid URL, skipping media download`);
              return;
            }
          } catch (refetchError) {
            console.error(`[WAHA Service] ❌ Failed to re-fetch message for valid URL:`, refetchError);
            return;
          }
        } else {
          mediaInfo = {
            url: messageData.media.url,
            mimetype: messageData.media.mimetype || messageData.mimeType || 'application/octet-stream',
            filename: messageData.media.filename || null,
            error: messageData.media.error || null
          };
        }
      } else if (messageData.mediaUrl) {
        // Legacy format or polling format
        const isValidUrl = messageData.mediaUrl.startsWith('http://') || messageData.mediaUrl.startsWith('https://');

        if (!isValidUrl) {
          console.log(`[WAHA Service] 🔄 Invalid mediaUrl "${messageData.mediaUrl}" - attempting re-fetch for message:`, messageData.id);
          try {
            const refetchedMessage = await this.getMessage(messageData.id, true);
            if (refetchedMessage?.media?.url && (refetchedMessage.media.url.startsWith('http://') || refetchedMessage.media.url.startsWith('https://'))) {
              console.log(`[WAHA Service] ✅ Valid URL recovered via re-fetch:`, refetchedMessage.media.url);
              mediaInfo = {
                url: refetchedMessage.media.url,
                mimetype: refetchedMessage.media.mimetype || messageData.mimeType || 'application/octet-stream',
                filename: refetchedMessage.media.filename || null
              };
            } else {
              console.warn(`[WAHA Service] ⚠️ Re-fetch did not provide valid URL, skipping media download`);
              return;
            }
          } catch (refetchError) {
            console.error(`[WAHA Service] ❌ Failed to re-fetch message for valid URL:`, refetchError);
            return;
          }
        } else {
          mediaInfo = {
            url: messageData.mediaUrl,
            mimetype: messageData.mimeType || 'application/octet-stream',
            filename: null
          };
        }
      }

      // Prepare base message data for frontend
      const baseMessageData = {
        messageId: messageData.id,
        chatId: messageData.chatId,
        chatName: messageData.isGroup ? messageData.groupName : messageData.contactName,
        senderId: messageData.from,
        senderName: messageData.contactName || messageData.from,
        caption: messageData.body || null,
        isGroup: Boolean(messageData.isGroup),
        timestamp: messageData.timestamp || Date.now(),
        mimeType: messageData.mimeType || messageData.media?.mimetype || 'application/octet-stream',
        hasMedia: true,
        mediaType: this.getMediaType(messageData.mimeType || messageData.media?.mimetype, messageData.type),
        mediaUrl: mediaInfo?.url || null,
        localPath: messageData.localPath || null, // Use direct download path if available
        fileSize: messageData.localPath && fs.existsSync(messageData.localPath) ? fs.statSync(messageData.localPath).size : null,
        filename: mediaInfo?.filename || null
      };

      let downloadResult = null;

      // Skip download if we already downloaded it directly (for NOWEB voice messages)
      if (messageData.skipNormalDownload && messageData.localPath) {
        console.log('[WAHA Service] 🎙️ Skipping normal download - already downloaded directly:', messageData.localPath);
        downloadResult = { success: true, localPath: messageData.localPath };
      }
      // Attempt to download media if we have a URL - with retry logic
      else if (mediaInfo && mediaInfo.url && !mediaInfo.error) {
        const maxRetries = 2;
        let retryCount = 0;
        let lastError: any = null;

        while (retryCount <= maxRetries && !downloadResult?.success) {
          try {
            if (retryCount > 0) {
              console.log(`[WAHA Service] 🔄 Retrying media download (attempt ${retryCount + 1}/${maxRetries + 1}) for message ${messageData.id}`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
            } else {
              console.log(`[WAHA Service] Downloading media file for message ${messageData.id}`);
            }

            downloadResult = await this.mediaService.downloadMedia(mediaInfo, messageData.id, messageData.chatId);

            if (downloadResult.success) {
              baseMessageData.localPath = downloadResult.localPath!;
              baseMessageData.fileSize = downloadResult.fileSize!;

              console.log(`[WAHA Service] ✅ Media downloaded successfully${retryCount > 0 ? ` (after ${retryCount} retries)` : ''}:`, {
                messageId: messageData.id,
                localPath: downloadResult.localPath,
                fileSize: downloadResult.fileSize,
                mediaType: baseMessageData.mediaType
              });
              break; // Success, exit retry loop
            } else {
              lastError = downloadResult.error;
              console.warn(`[WAHA Service] ⚠️ Media download failed (attempt ${retryCount + 1}):`, downloadResult.error);
            }
          } catch (downloadError: any) {
            lastError = downloadError;
            console.error(`[WAHA Service] ❌ Error downloading media (attempt ${retryCount + 1}):`, downloadError.message || downloadError);
          }
          retryCount++;
        }

        // Final check after all retries
        if (!downloadResult?.success) {
          console.error(`[WAHA Service] ❌ Media download failed after ${maxRetries + 1} attempts for message ${messageData.id}:`, lastError);
          baseMessageData.localPath = null;
        }
      } else if (mediaInfo?.error) {
        console.warn(`[WAHA Service] ⚠️ Media has error from WAHA:`, mediaInfo.error);
      } else {
        console.log(`[WAHA Service] No media URL available for message ${messageData.id} - media may need to be downloaded on-demand`);
      }

      // Save message with media information to database
      const mediaInfoForDB = {
        localPath: baseMessageData.localPath,
        fileSize: baseMessageData.fileSize,
        mediaType: baseMessageData.mediaType,
        downloadStatus: (baseMessageData.localPath ? 'completed' : downloadResult?.success === false ? 'failed' : 'pending') as 'pending' | 'downloading' | 'completed' | 'failed',
        downloadError: downloadResult?.success === false ? downloadResult.error : undefined
      };

      await this.saveMessageWithMedia(messageData, mediaInfoForDB);

      // Emit to Socket.IO for real-time frontend updates
      const io_instance = (global as any).io;
      if (io_instance) {
        console.log('[WAHA Service] Broadcasting media message to frontend via Socket.IO');
        io_instance.emit('whatsapp:media-message', baseMessageData);
      }

      // Also emit as a general event for other listeners
      this.emit('media-message', baseMessageData);

      // Emit specific event based on media type for specialized handling
      const mediaType = baseMessageData.mediaType;
      if (mediaType === 'image') {
        this.emit('image-message', baseMessageData);
        
        // Save to WhatsAppImage model if successfully downloaded
        if (baseMessageData.localPath && downloadResult?.success) {
          try {
            await this.saveImageToDatabase(baseMessageData);
            console.log('[WAHA Service] ✅ Image saved to WhatsAppImage database');
          } catch (saveError) {
            console.error('[WAHA Service] ❌ Failed to save image to database:', saveError);
          }
        }

        // 🆕 AUTO-SAVE IMAGE TO GRIDFS for permanent storage
        // This prevents images from breaking when WAHA URLs expire
        try {
          // Find the message in database
          const message = await WhatsAppMessage.findOne({ messageId: messageData.id });
          if (message && (message.mediaUrl || baseMessageData.mediaUrl)) {
            console.log('[WAHA Service] 🗄️ Auto-saving WhatsApp image to GridFS:', messageData.id);
            
            // Ensure message has mediaUrl if baseMessageData has it
            if (!message.mediaUrl && baseMessageData.mediaUrl) {
              message.mediaUrl = baseMessageData.mediaUrl;
              await message.save();
            }
            
            // Auto-save to GridFS in background (non-blocking)
            whatsappImageGridFSService.autoSaveImageToGridFS(message).then(result => {
              if (result.success) {
                console.log('[WAHA Service] ✅ Image auto-saved to GridFS:', result.filename);
              } else {
                console.warn('[WAHA Service] ⚠️ GridFS auto-save failed:', result.error);
              }
            }).catch(err => {
              console.error('[WAHA Service] ❌ GridFS auto-save error:', err);
            });
          }
        } catch (gridfsError) {
          console.error('[WAHA Service] ❌ Error in GridFS auto-save:', gridfsError);
        }
      } else if (mediaType === 'document') {
        this.emit('document-message', baseMessageData);
      } else if (mediaType === 'voice') {
        console.log('[WAHA Service] 🎙️ ===== VOICE MESSAGE DETECTED =====');
        console.log('[WAHA Service] 🎙️ Emitting voice-message event with data:', {
          messageId: baseMessageData.messageId,
          chatId: baseMessageData.chatId,
          hasLocalPath: !!baseMessageData.localPath,
          localPath: baseMessageData.localPath,
          fileSize: baseMessageData.fileSize,
          downloadStatus: mediaInfoForDB.downloadStatus
        });
        this.emit('voice-message', baseMessageData);
        console.log('[WAHA Service] 🎙️ ===== VOICE MESSAGE EVENT EMITTED =====');
      } else if (mediaType === 'video') {
        this.emit('video-message', baseMessageData);
      }

    } catch (error) {
      console.error('[WAHA Service] ❌ Error processing media message:', error);
    }
  }

  private async handleVoiceMessage(messageData: any): Promise<void> {
    console.log('[WAHA Service] 🎙️ handleVoiceMessage called with data:', {
      messageId: messageData.messageId,
      chatId: messageData.chatId,
      groupId: messageData.groupId,
      isGroup: messageData.isGroup,
      localPath: messageData.localPath,
      mediaUrl: messageData.mediaUrl,
      hasLocalPath: !!messageData.localPath,
      localPathExists: messageData.localPath ? fs.existsSync(messageData.localPath) : false,
      senderName: messageData.senderName
    });

    // Extract chat ID and ensure it's properly formatted
    const chatId = this.extractJidFromAny(messageData.chatId || messageData.groupId);
    const groupId = this.extractJidFromAny(messageData.groupId || messageData.chatId);
    const targetChatId = chatId || groupId;

    if (!targetChatId || !targetChatId.endsWith('@g.us')) {
      console.log('[WAHA Service] 🎙️ Skipping voice message – not a group chat or chatId missing', {
        messageId: messageData.messageId,
        chatId: messageData.chatId,
        groupId: messageData.groupId,
        extractedChatId: chatId,
        extractedGroupId: groupId
      });
      return;
    }

    // Fetch monitors early to determine if we should send feedback messages
    let monitors;
    try {
      monitors = await this.groupMonitorService.getActiveMonitorsForGroup(targetChatId);
    } catch (error) {
      console.error('[WAHA Service] 🎙️ Failed to fetch monitors for voice processing', {
        groupId: targetChatId,
        error: (error as Error).message
      });
      return;
    }

    const eligibleMonitors = monitors.filter(monitor => monitor.settings?.processVoiceNotes !== false);
    const shouldSendFeedback = eligibleMonitors.some(m => m.settings?.sendFeedbackMessages === true);
    
    if (eligibleMonitors.length === 0) {
      console.log('[WAHA Service] 🎙️ No monitors enabled for voice processing in this group', {
        groupId: targetChatId,
        totalMonitors: monitors.length,
        eligibleMonitors: 0
      });
      return;
    }

    const localPath: string | null = messageData.localPath || null;
    const mediaUrl: string | null = messageData.mediaUrl || null;

    if (!localPath || !fs.existsSync(localPath)) {
      console.error('[WAHA Service] 🎙️ ❌ Voice message missing local file – cannot transcribe', {
        messageId: messageData.messageId,
        chatId: targetChatId,
        localPath,
        localPathExists: localPath ? fs.existsSync(localPath) : false,
        mediaUrl,
        hasMediaUrl: !!mediaUrl,
        messageDataKeys: Object.keys(messageData)
      });

      // Determine error cause for better user feedback
      let errorMsg = '❌ מצטער, לא הצלחתי לעבד את ההודעה הקולית.\n\n';

      if (!mediaUrl && !messageData.mediaUrl) {
        errorMsg += '📍 הבעיה: WAHA לא סיפק קישור להורדת הקובץ. זה יכול לקרות עם NOWEB engine.\n';
        errorMsg += '💡 פתרון: אנא נסה שוב, או שקול להשתמש ב-WEBJS engine במקום NOWEB.\n\n';
        errorMsg += '---\n\n';
        errorMsg += '❌ Sorry, I couldn\'t process the voice message.\n\n';
        errorMsg += '📍 Issue: WAHA did not provide a download URL. This can happen with NOWEB engine.\n';
        errorMsg += '💡 Solution: Please try again, or consider using WEBJS engine instead of NOWEB.';
      } else if (mediaUrl && !localPath) {
        errorMsg += '📍 הבעיה: הורדת הקובץ נכשלה למרות שיש קישור.\n';
        errorMsg += '💡 פתרון: בדוק את החיבור לאינטרנט או את הגדרות ה-WAHA.\n\n';
        errorMsg += '---\n\n';
        errorMsg += '❌ Sorry, I couldn\'t process the voice message.\n\n';
        errorMsg += '📍 Issue: File download failed despite having URL.\n';
        errorMsg += '💡 Solution: Check internet connection or WAHA settings.';
      } else {
        errorMsg += 'הקובץ לא נמצא במערכת.\n\n';
        errorMsg += 'File not found in system.';
      }

      // Attempt to send error notification to group
      if (shouldSendFeedback) {
        try {
          await this.sendMessage(targetChatId, errorMsg);
        } catch (sendError) {
          console.error('[WAHA Service] 🎙️ Failed to send error notification:', (sendError as Error).message);
        }
      }
      return;
    }

    console.log('[WAHA Service] 🎙️ ===== STARTING VOICE TRANSCRIPTION =====');
    console.log('[WAHA Service] 🎙️ File details:', {
      localPath,
      fileExists: fs.existsSync(localPath),
      fileSize: fs.existsSync(localPath) ? fs.statSync(localPath).size : 0,
      eligibleMonitors: eligibleMonitors.length
    });

    let transcription = '';
    try {
      console.log('[WAHA Service] 🎙️ Calling transcribeAudio service...');
      transcription = await transcribeAudio(localPath);
      console.log('[WAHA Service] 🎙️ ===== TRANSCRIPTION SUCCESSFUL =====');
      console.log('[WAHA Service] 🎙️ Transcription result:', {
        messageId: messageData.messageId,
        groupId: targetChatId,
        transcriptionLength: transcription.length,
        transcriptionPreview: transcription.substring(0, 120),
        fullTranscription: transcription
      });
    } catch (error: any) {
      console.error('[WAHA Service] 🎙️ Voice transcription failed', {
        messageId: messageData.messageId,
        groupId: targetChatId,
        error: error?.message || error
      });

      const failureMessage = 'מצטער, לא הצלחתי לתמלל את ההודעה הקולית הזו.';
      if (shouldSendFeedback) {
        try {
          await this.sendMessage(targetChatId, failureMessage);
        } catch (sendError) {
          console.error('[WAHA Service] 🎙️ Failed to notify chat about transcription failure', {
            chatId: targetChatId,
            error: (sendError as Error).message
          });
        }
      }
      return;
    }

    const isHebrew = /[\u0590-\u05FF]/.test(transcription);
    const senderName = messageData.senderName || 'Unknown';

    try {
      console.log('[WAHA Service] 🎙️ ===== ANALYZING TRANSCRIPTION =====');
      console.log('[WAHA Service] 🎙️ Checking for location extraction...');
      const locationExtraction = await locationExtractionService.extractLocationFromText(transcription);
      console.log('[WAHA Service] 🎙️ Location extraction result:', {
        success: locationExtraction.success,
        hasLocation: !!locationExtraction.location,
        confidence: locationExtraction.confidence,
        extractedText: locationExtraction.extractedText
      });

      if (locationExtraction.success && locationExtraction.location) {
        console.log('[WAHA Service] 🎙️ ===== LOCATION DETECTED =====');
        const locationData = locationExtraction.location;
        const locationName = locationData.name || locationData.address || 'מיקום לא ידוע';
        const confidence = locationExtraction.confidence;

        console.log('[WAHA Service] 🎙️ Creating location notes for monitors...');
        for (const monitor of eligibleMonitors) {
          try {
            const note = await Note.create({
              userId: monitor.userId,
              title: `Location: ${locationData.name || locationData.address}`,
              content: `Added via WhatsApp voice: "${transcription}"`,
              location: locationData,
              source: 'whatsapp_voice_location',
              rawTranscription: transcription,
            });

            console.log('[WAHA Service] 🎙️ ✅ Location note created:', {
              noteId: note._id,
              userId: monitor.userId.toString(),
              locationName
            });

            if (io) {
              io.emit('new_location_item', {
                userId: monitor.userId.toString(),
                location: locationData,
                noteId: note._id,
              });
              io.emit('new_note_item', { userId: monitor.userId.toString() });
            }
          } catch (noteError) {
            console.error('[WAHA Service] 🎙️ Failed to create location note for monitor', {
              monitorId: monitor._id,
              error: (noteError as Error).message
            });
          }
        }

        const locationMessage = isHebrew
          ? `📍 מיקום נוסף למפה!\n\n🏷️ שם: ${locationName}\n📍 כתובת: ${locationData.address || 'לא זמין'}\n🎤 הודעה: "${transcription}"\n🎯 דיוק: ${confidence}\n\n✅ המיקום נשמר בהצלחה ויופיע במפה שלך.`
          : `📍 Location added to the map!\n\n🏷️ Name: ${locationName}\n📍 Address: ${locationData.address || 'Not available'}\n🎤 Voice: "${transcription}"\n🎯 Confidence: ${confidence}\n\n✅ Location saved successfully and will appear on your map.`;

        console.log('[WAHA Service] 🎙️ Sending location confirmation to WhatsApp group...');
        if (shouldSendFeedback) {
          try {
            await this.sendMessage(targetChatId, locationMessage);
            console.log('[WAHA Service] 🎙️ ✅ Location confirmation sent successfully');
          } catch (sendError) {
            console.error('[WAHA Service] 🎙️ Failed to send location confirmation to chat', {
              chatId: targetChatId,
              error: (sendError as Error).message
            });
          }
        }

        return;
      }

      if (locationExtraction.extractedText && locationExtraction.confidence !== 'low') {
        const debugMessage = isHebrew
          ? `🤔 זיהיתי אולי בקשה למיקום אבל לא הצלחתי למצוא "${locationExtraction.extractedText}". נסה שוב עם שם מדויק יותר.`
          : `🤔 I detected a possible location request but couldn't find "${locationExtraction.extractedText}". Try again with a more specific name.`;

        if (shouldSendFeedback) {
          try {
            await this.sendMessage(targetChatId, debugMessage);
          } catch (sendError) {
            console.warn('[WAHA Service] 🎙️ Failed to send location debug message', {
              chatId: targetChatId,
              error: (sendError as Error).message
            });
          }
        }
      }

      console.log('[WAHA Service] 🎙️ Analyzing transcription for tasks/notes/ideas...');
      const { tasks = [], notes = [], ideas = [] } = await analyzeTranscription(transcription);
      console.log('[WAHA Service] 🎙️ Analysis complete:', {
        tasksFound: tasks.length,
        notesFound: notes.length,
        ideasFound: ideas.length,
        tasks: tasks,
        notes: notes,
        ideas: ideas
      });

      if (tasks.length === 0 && notes.length === 0 && ideas.length === 0) {
        console.log('[WAHA Service] 🎙️ No tasks/notes/ideas detected, sending neutral message');
        const neutralMessage = isHebrew
          ? 'נותח תמלול אך לא זוהו משימות, הערות או רעיונות ספציפיים.'
          : 'Transcription analyzed but no specific tasks, notes, or ideas were identified.';
        if (shouldSendFeedback) {
          try {
            await this.sendMessage(targetChatId, neutralMessage);
            console.log('[WAHA Service] 🎙️ ✅ Neutral message sent');
          } catch (sendError) {
            console.warn('[WAHA Service] 🎙️ Failed to send neutral voice memo summary', {
              chatId: targetChatId,
              error: (sendError as Error).message
            });
          }
        }
      } else {
        console.log('[WAHA Service] 🎙️ ===== CREATING ITEMS =====');
        for (const monitor of eligibleMonitors) {
          const userId = monitor.userId;
          console.log('[WAHA Service] 🎙️ Processing items for user:', userId.toString());

          if (tasks.length > 0) {
            console.log('[WAHA Service] 🎙️ Creating tasks...');
            for (const taskTitle of tasks) {
              try {
                const task = await Task.create({
                  userId,
                  title: taskTitle,
                  source: 'whatsapp_voice_memo',
                  rawTranscription: transcription,
                });
                console.log('[WAHA Service] 🎙️ ✅ Task created:', {
                  taskId: task._id,
                  title: taskTitle
                });
              } catch (taskError) {
                console.error('[WAHA Service] 🎙️ Failed to create task from voice memo', {
                  monitorId: monitor._id,
                  error: (taskError as Error).message
                });
              }
            }
            if (io) {
              io.emit('new_task_item', { userId: userId.toString() });
            }
          }

          if (notes.length > 0) {
            console.log('[WAHA Service] 🎙️ Creating notes...');
            for (const noteContent of notes) {
              try {
                const note = await Note.create({
                  userId,
                  content: noteContent,
                  source: 'whatsapp_voice_memo',
                  rawTranscription: transcription,
                });
                console.log('[WAHA Service] 🎙️ ✅ Note created:', {
                  noteId: note._id,
                  contentPreview: noteContent.substring(0, 50)
                });
              } catch (noteError) {
                console.error('[WAHA Service] 🎙️ Failed to create note from voice memo', {
                  monitorId: monitor._id,
                  error: (noteError as Error).message
                });
              }
            }
            if (io) {
              io.emit('new_note_item', { userId: userId.toString() });
            }
          }

          if (ideas.length > 0) {
            console.log('[WAHA Service] 🎙️ Creating ideas...');
            for (const ideaContent of ideas) {
              try {
                const idea = await Idea.create({
                  userId,
                  content: ideaContent,
                  source: 'whatsapp_voice_memo',
                  rawTranscription: transcription,
                });
                console.log('[WAHA Service] 🎙️ ✅ Idea created:', {
                  ideaId: idea._id,
                  contentPreview: ideaContent.substring(0, 50)
                });
              } catch (ideaError) {
                console.error('[WAHA Service] 🎙️ Failed to create idea from voice memo', {
                  monitorId: monitor._id,
                  error: (ideaError as Error).message
                });
              }
            }
            if (io) {
              io.emit('new_idea_item', { userId: userId.toString() });
            }
          }
        }

        console.log('[WAHA Service] 🎙️ ===== ITEMS CREATION COMPLETE =====');
        console.log('[WAHA Service] 🎙️ Summary: Created', {
          tasks: tasks.length,
          notes: notes.length,
          ideas: ideas.length
        });

        let summaryMessage = isHebrew ? 'ההודעה נותחה:' : 'Voice memo processed:';
        if (tasks.length > 0) {
          summaryMessage += isHebrew ? `\n- נוספו ${tasks.length} משימות.` : `\n- Added ${tasks.length} tasks.`;
        }
        if (notes.length > 0) {
          summaryMessage += isHebrew ? `\n- נוספו ${notes.length} הערות.` : `\n- Added ${notes.length} notes.`;
        }
        if (ideas.length > 0) {
          summaryMessage += isHebrew ? `\n- נוספו ${ideas.length} רעיונות.` : `\n- Added ${ideas.length} ideas.`;
        }

        console.log('[WAHA Service] 🎙️ Sending summary to WhatsApp group:', summaryMessage);
        if (shouldSendFeedback) {
          try {
            await this.sendMessage(targetChatId, summaryMessage);
            console.log('[WAHA Service] 🎙️ ✅ Summary message sent successfully');
            console.log('[WAHA Service] 🎙️ ===== VOICE MEMO PROCESSING COMPLETE =====');
          } catch (sendError) {
            console.warn('[WAHA Service] 🎙️ Failed to send voice memo summary', {
              chatId: targetChatId,
              error: (sendError as Error).message
            });
          }
        }
      }

    } catch (error) {
      console.error('[WAHA Service] 🎙️ Unexpected error during voice memo processing', {
        messageId: messageData.messageId,
        groupId: targetChatId,
        error: (error as Error).message
      });
    } finally {
      try {
        if (localPath && fs.existsSync(localPath)) {
          fs.unlink(localPath, (unlinkError) => {
            if (unlinkError) {
              console.warn('[WAHA Service] 🎙️ Failed to remove temporary voice file', {
                filePath: localPath,
                error: unlinkError.message
              });
            }
          });
        }
      } catch (cleanupError) {
        console.warn('[WAHA Service] 🎙️ Cleanup error for voice memo file', {
          filePath: localPath,
          error: (cleanupError as Error).message
        });
      }
    }
  }

  private getGroupMonitorWebhookUrl(): string | null {
    const normalize = (url: string) => url.replace(/\/+$/, '');
    const ensurePath = (base: string) => {
      const normalized = normalize(base);

      if (/\/group-monitor\/webhook\/whatsapp-message$/i.test(normalized)) {
        return normalized;
      }

      if (/\/api\/v1$/i.test(normalized)) {
        return `${normalized}/group-monitor/webhook/whatsapp-message`;
      }

      if (/\/api$/i.test(normalized)) {
        return `${normalized}/v1/group-monitor/webhook/whatsapp-message`;
      }

      return `${normalized}/api/v1/group-monitor/webhook/whatsapp-message`;
    };

    const explicit = process.env.GROUP_MONITOR_WEBHOOK_URL?.trim();
    if (explicit && /^https?:\/\//i.test(explicit)) {
      return ensurePath(explicit);
    }

    const candidates = [
      process.env.INTERNAL_API_BASE_URL,
      process.env.BACKEND_URL,
      process.env.RENDER_EXTERNAL_URL,
      process.env.PUBLIC_BACKEND_URL,
      process.env.API_BASE_URL
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      const trimmed = candidate.trim();
      if (!/^https?:\/\//i.test(trimmed)) continue;
      return ensurePath(trimmed);
    }

    const port = process.env.PORT || '3001';
    return ensurePath(`http://127.0.0.1:${port}`);
  }

  /**
   * Parse custom headers from environment variable format
   */
  private parseCustomHeaders(customHeadersEnv: string | undefined): { [key: string]: string } | undefined {
    if (!customHeadersEnv) return undefined;
    
    const headers: { [key: string]: string } = {};
    const pairs = customHeadersEnv.split(';');
    
    for (const pair of pairs) {
      const [key, value] = pair.split(':');
      if (key && value) {
        headers[key.trim()] = value.trim();
      }
    }
    
    return Object.keys(headers).length > 0 ? headers : undefined;
  }

  /**
   * Map WAHA message type to WhatsApp message type
   */
  private mapMessageType(wahaType: string): string {
    const typeMap: { [key: string]: string } = {
      'text': 'text',
      'image': 'image',
      'video': 'video',
      'audio': 'audio',
      'voice': 'audio',
      'document': 'document',
      'sticker': 'stickerMessage',
      'location': 'location',
      'contact': 'contact',
      'poll': 'pollCreationMessage',
      'reaction': 'reactionMessage',
      'group_invite': 'groupInviteMessage',
      'buttons': 'buttonsMessage',
      'list': 'listMessage',
      'template': 'templateMessage',
      'order': 'orderMessage',
      'payment': 'paymentMessage'
    };
    
    return typeMap[wahaType] || 'text';
  }

  /**
   * Determine media type from MIME type and message type
   * Enhanced to detect WhatsApp PTT (push-to-talk) voice messages
   * PRIORITY: mimeType is more reliable than messageType field
   */
  private getMediaType(mimetype: string | undefined, messageType?: string): string {
    // PRIORITY 1: Check MIME type first (most reliable indicator)
    if (mimetype) {
      const type = mimetype.toLowerCase();

      if (type.startsWith('image/')) {
        console.log('[WAHA Service] 🖼️ Image detected via MIME type:', mimetype);
        return 'image';
      } else if (type.startsWith('audio/') || type.includes('voice') || type.includes('ogg') || type.includes('opus')) {
        console.log('[WAHA Service] 🎙️ Voice message detected via MIME type:', mimetype);
        return 'voice';
      } else if (type.startsWith('video/')) {
        return 'video';
      } else if (type.startsWith('application/') || type.startsWith('text/')) {
        return 'document';
      }
    }

    // PRIORITY 2: Fall back to message type only if mimeType is not available or unclear
    if (messageType) {
      const typeStr = String(messageType).toLowerCase();
      if (typeStr === 'ptt' || typeStr === 'voice' || typeStr.includes('voice') || typeStr.includes('ptt')) {
        console.log('[WAHA Service] 🎙️ Voice message detected via message type (fallback):', messageType);
        return 'voice';
      }
    }

    return 'unknown';
  }

  /**
   * Save message with media information to database
   */
  private async saveMessageWithMedia(messageData: any, mediaInfo: {
    localPath?: string;
    fileSize?: number;
    mediaType: string;
    downloadStatus: 'pending' | 'downloading' | 'completed' | 'failed';
    downloadError?: string;
  }): Promise<void> {
    try {
      console.log(`[WAHA Service] Saving media message:`, {
        messageId: messageData.id,
        from: messageData.from,
        chatId: messageData.chatId,
        hasChatId: !!messageData.chatId
      });

      // Find or create contact
      let contact = await WhatsAppContact.findOne({ phoneNumber: messageData.from });
      if (!contact) {
        contact = new WhatsAppContact({
          phoneNumber: messageData.from,
          name: messageData.contactName || messageData.from,
          isGroup: Boolean(messageData.isGroup),
          groupName: messageData.isGroup ? messageData.groupName : undefined,
          lastMessageAt: new Date(messageData.timestamp || Date.now())
        });
        await contact.save();
      } else {
        // Update last message timestamp
        contact.lastMessageTimestamp = new Date(messageData.timestamp || Date.now());
        await contact.save();
      }

      // Check if message already exists
      const existingMessage = await WhatsAppMessage.findOne({ messageId: messageData.id });
      if (existingMessage) {
        console.log(`[WAHA Service] Message ${messageData.id} already exists, updating media info`);

        // Update existing message with media information
        existingMessage.mediaUrl = messageData.media?.url || messageData.mediaUrl;
        existingMessage.mimeType = messageData.media?.mimetype || messageData.mimeType;
        existingMessage.caption = messageData.body || null;
        existingMessage.localPath = mediaInfo.localPath;
        existingMessage.fileSize = mediaInfo.fileSize;
        existingMessage.mediaType = mediaInfo.mediaType as any;
        existingMessage.filename = messageData.media?.filename;
        existingMessage.downloadStatus = mediaInfo.downloadStatus;
        existingMessage.downloadError = mediaInfo.downloadError;

        await existingMessage.save();
        return;
      }

      // Determine if this is a group message and extract group info
      const isGroup = !!messageData.chatId && (
        messageData.chatId.endsWith('@g.us') || 
        messageData.isGroup === true ||
        !!messageData.groupName
      );
      
      // Create new message
      // For media messages without body text, use descriptive placeholder
      let messageText = messageData.body || messageData.caption || '';
      if (!messageText && (messageData.isMedia || messageData.hasMedia || mediaInfo.mediaType !== 'unknown')) {
        const mediaTypeLabel = mediaInfo.mediaType === 'voice' ? 'Voice Message' :
                              mediaInfo.mediaType === 'image' ? 'Image' :
                              mediaInfo.mediaType === 'video' ? 'Video' :
                              mediaInfo.mediaType === 'document' ? 'Document' : 'Media';
        messageText = `[${mediaTypeLabel}]`;
      }

      const newMessage = new WhatsAppMessage({
        messageId: messageData.id,
        from: messageData.from,
        to: isGroup ? messageData.chatId : 'business', // For groups, use chatId; for DMs, use business
        message: messageText || '[Message]',
        timestamp: new Date(messageData.timestamp || Date.now()),
        type: messageData.type || 'text',
        status: 'received',
        isIncoming: true,
        contactId: contact._id,

        // Metadata for group identification
        metadata: {
          isGroup: isGroup,
          groupId: isGroup ? messageData.chatId : undefined,
          groupName: isGroup && messageData.groupName ? messageData.groupName : undefined,
          forwarded: false,
          forwardedMany: false
        },

        // Media fields
        mediaUrl: messageData.media?.url || messageData.mediaUrl,
        mimeType: messageData.media?.mimetype || messageData.mimeType,
        caption: messageData.body || null,
        localPath: mediaInfo.localPath,
        fileSize: mediaInfo.fileSize,
        mediaType: mediaInfo.mediaType as any,
        filename: messageData.media?.filename,
        downloadStatus: mediaInfo.downloadStatus,
        downloadError: mediaInfo.downloadError
      });

      await newMessage.save();
      console.log(`[WAHA Service] Saved message ${messageData.id} with media to database`);

    } catch (error) {
      console.error(`[WAHA Service] ❌ Error saving message with media to database:`, error);
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
    let stoppedCount = 0;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const sessionStatus = await this.getSessionStatus(sessionName);
        console.log(`[WAHA Service] Session '${sessionName}' current state: ${sessionStatus.status}`);

        if (expectedStates.includes(sessionStatus.status)) {
          console.log(`[WAHA Service] ✅ Session '${sessionName}' reached expected state: ${sessionStatus.status}`);
          return;
        }

        // Only fail if session has been STOPPED for multiple consecutive checks (not just transitioning)
        if (sessionStatus.status === 'STOPPED') {
          stoppedCount++;
          if (stoppedCount >= 3) { // Allow 3 consecutive STOPPED checks before failing
            throw new Error(`Session stuck in STOPPED state after ${stoppedCount} checks`);
          }
          console.log(`[WAHA Service] ⚠️ Session in STOPPED state (check ${stoppedCount}/3), waiting for transition...`);
        } else {
          stoppedCount = 0; // Reset counter if not STOPPED
        }

        if (sessionStatus.status === 'FAILED') {
          throw new Error(`Session failed: ${sessionStatus.status}`);
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
  private updateMonitoringStats(messageData: any): void {
    try {
      // Initialize or update global monitoring stats
      let stats = (global as any).wahaMonitoringStats || {
        messagesCount: 0,
        imagesCount: 0,
        groupsCount: 0,
        privateChatsCount: 0,
        lastActivity: new Date().toISOString(),
        timestamp: Date.now()
      };
      
      // Increment message count
      stats.messagesCount += 1;
      
      // Check if it's an image message
      if (messageData.isMedia && messageData.type === 'image') {
        stats.imagesCount += 1;
        console.log(`[WAHA Service] 📊 Image count updated: ${stats.imagesCount}`);
      }
      
      // Update last activity
      stats.lastActivity = new Date().toISOString();
      stats.timestamp = Date.now();
      
      // Store globally
      (global as any).wahaMonitoringStats = stats;
      
      // Emit monitoring stats via Socket.IO for real-time updates
      const io_instance = (global as any).io;
      if (io_instance) {
        io_instance.emit('whatsapp:monitoring-stats', {
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

  /**
   * Start polling for new messages to forward to group monitoring
   * Since this WAHA instance doesn't support webhooks, we need to poll
   */
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastPolledTimestamp: number = Date.now();

  startMessagePolling(intervalMs: number = 30000): void {
    if (this.pollingInterval) {
      console.log('[WAHA Service] Message polling already running');
      return;
    }

    console.log(`[WAHA Service] 🔄 Starting message polling every ${intervalMs/1000}s for group monitoring`);
    
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollForNewMessages();
      } catch (error) {
        console.error('[WAHA Service] ❌ Error during message polling:', error);
      }
    }, intervalMs);
  }

  stopMessagePolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('[WAHA Service] ⏹️ Stopped message polling');
    }
  }

  private async pollForNewMessages(): Promise<void> {
    try {
      const sessionName = this.defaultSession;

      const activeGroupIds = await this.groupMonitorService.getActiveMonitorGroupIds();
      const activeGroupIdSet = new Set(activeGroupIds.map(id => id.toLowerCase()));

      if (activeGroupIdSet.size === 0) {
        console.log('[WAHA Service] Skipping message polling because no group monitors are active.');
        return;
      }

      // Check if session is authenticated before polling
      try {
        const sessionStatus = await this.getSessionStatus(sessionName);
        if (sessionStatus.status !== 'WORKING') {
          console.log(`[WAHA Service] Skipping message polling - session '${sessionName}' not authenticated (status: ${sessionStatus.status})`);
          return;
        }
      } catch (error) {
        console.log(`[WAHA Service] Skipping message polling - session '${sessionName}' not found or unavailable`);
        return;
      }

      console.log('[WAHA Service] Polling active group monitors:', Array.from(activeGroupIdSet));

      const chats = await this.getChats(sessionName, { limit: 50 });

      const monitoredChats = chats.filter(chat => {
        if (!chat.isGroup) {
          return false;
        }

        const normalizedChatId = this.extractJidFromAny(chat.id)?.toLowerCase();
        return Boolean(normalizedChatId && activeGroupIdSet.has(normalizedChatId));
      });

      if (monitoredChats.length === 0) {
        console.log('[WAHA Service] No monitored WhatsApp chats found in the WAHA chat list.');
        return;
      }

      for (const chat of monitoredChats) {
        const normalizedChatId = this.extractJidFromAny(chat.id)?.toLowerCase() || chat.id;

        console.log('[WAHA Service] Polling monitored chat:', {
          chatId: chat.id,
          normalizedChatId,
          chatName: chat.name,
          isGroup: chat.isGroup
        });

        try {
          const messages = await this.getMessages(chat.id, 10, sessionName);

          for (const message of messages) {
            const rawTimestamp = message.timestamp || 0;
            const messageTimestamp = rawTimestamp > 1e12 ? rawTimestamp : rawTimestamp * 1000;

            if (messageTimestamp > this.lastPolledTimestamp) {
              console.log('[WAHA Service] Processing new monitored message:', {
                messageId: message.id,
                chatId: chat.id,
                messageTimestamp,
                lastPolledTimestamp: this.lastPolledTimestamp,
                isNewer: messageTimestamp > this.lastPolledTimestamp,
                rawMessageType: message.type,
                rawMimeType: message.mimeType,
                rawIsMedia: message.isMedia,
                rawHasMedia: message.hasMedia,
                rawMessageKeys: Object.keys(message)
              });

              // Determine if message has media (including voice/audio/ptt)
              const potentiallyHasMedia = message.isMedia || message.hasMedia || 
                                         message.type === 'image' || 
                                         message.type === 'video' || 
                                         message.type === 'document' ||
                                         message.type === 'ptt' ||
                                         message.type === 'audio' ||
                                         message.type === 'voice' ||
                                         (message.mimeType && (
                                           message.mimeType.startsWith('image/') ||
                                           message.mimeType.startsWith('video/') ||
                                           message.mimeType.startsWith('audio/') ||
                                           message.mimeType.includes('ogg') ||
                                           message.mimeType.includes('opus')
                                         ));

              // Always fetch full details for media messages to ensure we have downloadable URLs
              let fullMessage = message;
              if (potentiallyHasMedia) {
                console.log('[WAHA Service] 🔍 Media message detected, fetching full details with downloadMedia=true...');
                try {
                  const detailedMessage = await this.getMessage(message.id, true);
                  if (detailedMessage) {
                    fullMessage = { ...message, ...detailedMessage };
                    console.log('[WAHA Service] ✅ Got full message details:', {
                      type: fullMessage.type,
                      mimeType: fullMessage.mimeType || (fullMessage.media && (fullMessage.media as any).mimetype),
                      hasMedia: fullMessage.hasMedia,
                      mediaUrl: fullMessage.media?.url || fullMessage.mediaUrl
                    });
                  } else {
                    // If getMessage returns null (404), try alternative approach
                    console.warn('[WAHA Service] ⚠️ getMessage returned null (404) - will try to infer media type from available data');
                    // For voice messages, WAHA NOWEB sometimes doesn't provide the message via getMessage
                    // but we can still detect it from the polling data
                    if (!fullMessage.type && fullMessage.isMedia && !fullMessage.body) {
                      // Empty body + isMedia = likely voice message
                      console.log('[WAHA Service] 🎙️ Inferring voice message type from isMedia=true + empty body');
                      fullMessage.type = 'ptt'; // Assume PTT voice note
                    }
                  }
                } catch (fetchError) {
                  console.warn('[WAHA Service] ⚠️ Failed to fetch full message details:', (fetchError as Error).message);
                  // Try to infer type from available data
                  if (!fullMessage.type && fullMessage.isMedia && !fullMessage.body) {
                    console.log('[WAHA Service] 🎙️ Inferring voice message type after fetch error');
                    fullMessage.type = 'ptt';
                  }
                }
              }

              // Determine final media status (including voice/audio)
              const hasMediaContent = fullMessage.hasMedia || fullMessage.isMedia || 
                                     fullMessage.media?.url || fullMessage.mediaUrl ||
                                     fullMessage.type === 'image' || fullMessage.type === 'video' ||
                                     fullMessage.type === 'ptt' || fullMessage.type === 'audio' || fullMessage.type === 'voice';

              const messageData = {
                id: fullMessage.id,
                chatId: chat.id,
                from: fullMessage.from,
                body: fullMessage.body || fullMessage.caption || '',
                timestamp: messageTimestamp,
                isGroup: true,
                isMedia: hasMediaContent,
                mediaUrl: fullMessage.media?.url || fullMessage.mediaUrl,
                type: fullMessage.type,
                mimeType: fullMessage.mimeType || fullMessage.media?.mimetype,
                hasMedia: hasMediaContent,
                media: fullMessage.media,
                contactName: fullMessage.contactName,
                groupName: chat.name
              };

              console.log('[WAHA Service] 📋 Final message data for processing:', {
                messageId: messageData.id,
                hasMedia: messageData.hasMedia,
                isMedia: messageData.isMedia,
                type: messageData.type,
                mimeType: messageData.mimeType,
                mediaUrl: messageData.mediaUrl ? 'present' : 'none',
                mediaObject: messageData.media ? 'present' : 'none'
              });

              await this.saveMessageToDatabase(messageData);
              await this.processMessageForGroupMonitoring(messageData);
              
              // Process media if detected
              if (hasMediaContent) {
                console.log('[WAHA Service] 🖼️ Processing media message...');
                await this.processMediaMessage(messageData);
              }
            }
          }
        } catch (messageError: unknown) {
          console.error('[WAHA Service] Error while polling monitored chat:', {
            chatId: chat.id,
            error: messageError instanceof Error ? messageError.message : messageError
          });
        }
      }

      this.lastPolledTimestamp = Date.now();
    } catch (error: unknown) {
      console.error('[WAHA Service] Error polling for new messages:', error);
    }
  }
}

export default WAHAService;
