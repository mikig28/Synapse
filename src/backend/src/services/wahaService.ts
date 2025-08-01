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

  private constructor() {
    super();
    
    this.wahaBaseUrl = process.env.WAHA_SERVICE_URL || 'http://localhost:3000';
    
    this.httpClient = axios.create({
      baseURL: this.wahaBaseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
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
      
      // Start default session
      await this.startSession();
      
      // Check session status
      const status = await this.getSessionStatus();
      this.connectionStatus = status.status;
      this.isReady = status.status === 'WORKING';
      
      console.log(`[WAHA Service] ✅ Initialized. Status: ${status.status}`);
      this.emit('ready');
      
    } catch (error) {
      console.error('[WAHA Service] ❌ Initialization failed:', error);
      this.connectionStatus = 'failed';
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Health check - verify WAHA service is running
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Use /api/version instead of /health (which requires Plus license)
      const response = await this.httpClient.get('/api/version');
      
      if (response.data && response.status === 200) {
        console.log('[WAHA Service] ✅ Health check passed (using /api/version)');
        return true;
      } else {
        throw new Error('Invalid version response');
      }
    } catch (error) {
      console.error('[WAHA Service] ❌ Health check failed:', error);
      // Try fallback to sessions endpoint
      try {
        await this.httpClient.get('/api/sessions');
        console.log('[WAHA Service] ✅ Health check passed (using /api/sessions fallback)');
        return true;
      } catch (fallbackError) {
        console.error('[WAHA Service] ❌ All health checks failed');
        throw new Error('WAHA service is not available');
      }
    }
  }

  /**
   * Start a WhatsApp session
   */
  async startSession(sessionName: string = this.defaultSession): Promise<WAHASession> {
    try {
      const response = await this.httpClient.post('/api/sessions', {
        name: sessionName,
        config: {
          webhook: {
            url: `${process.env.FRONTEND_URL || 'https://synapse-backend-7lq6.onrender.com'}/api/v1/whatsapp/webhook`,
            events: ['message', 'session.status'],
            retries: 3,
          }
        }
      });
      
      console.log(`[WAHA Service] ✅ Session '${sessionName}' started`);
      return response.data;
    } catch (error) {
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
    } catch (error) {
      console.error(`[WAHA Service] ❌ Failed to get session status for '${sessionName}':`, error);
      throw error;
    }
  }

  /**
   * Get QR code for session
   */
  async getQRCode(sessionName: string = this.defaultSession): Promise<string> {
    try {
      // First ensure session is started
      await this.startSession(sessionName);
      
      // Get QR code using WAHA's auth endpoint
      const response = await this.httpClient.get(`/api/${sessionName}/auth/qr`, {
        responseType: 'arraybuffer'
      });
      
      const base64 = Buffer.from(response.data).toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error(`[WAHA Service] ❌ Failed to get QR code for '${sessionName}':`, error);
      // Try alternative screenshot endpoint as fallback
      try {
        console.log('[WAHA Service] Trying screenshot endpoint as fallback...');
        const response = await this.httpClient.get(`/api/screenshot`, {
          params: { session: sessionName },
          responseType: 'arraybuffer'
        });
        
        const base64 = Buffer.from(response.data).toString('base64');
        return `data:image/png;base64,${base64}`;
      } catch (fallbackError) {
        console.error(`[WAHA Service] ❌ Both QR endpoints failed:`, fallbackError);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to get QR code: ${errorMessage}`);
      }
    }
  }

  /**
   * Send text message
   */
  async sendMessage(chatId: string, text: string, sessionName: string = this.defaultSession): Promise<any> {
    try {
      const response = await this.httpClient.post('/api/sendText', {
        chatId,
        text,
        session: sessionName
      });
      
      console.log(`[WAHA Service] ✅ Message sent to ${chatId}`);
      return response.data;
    } catch (error) {
      console.error(`[WAHA Service] ❌ Failed to send message to ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Send media message
   */
  async sendMedia(chatId: string, mediaUrl: string, caption?: string, sessionName: string = this.defaultSession): Promise<any> {
    try {
      const response = await this.httpClient.post('/api/sendFile', {
        chatId,
        file: {
          url: mediaUrl
        },
        caption,
        session: sessionName
      });
      
      console.log(`[WAHA Service] ✅ Media sent to ${chatId}`);
      return response.data;
    } catch (error) {
      console.error(`[WAHA Service] ❌ Failed to send media to ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Get chats
   */
  async getChats(sessionName: string = this.defaultSession): Promise<WAHAChat[]> {
    try {
      const response = await this.httpClient.get('/api/chats', {
        params: { session: sessionName }
      });
      
      return response.data.map((chat: any) => ({
        id: chat.id,
        name: chat.name || chat.id,
        isGroup: chat.isGroup || false,
        lastMessage: chat.lastMessage?.body,
        timestamp: chat.lastMessage?.timestamp,
        participantCount: chat.participantCount
      }));
    } catch (error) {
      console.error(`[WAHA Service] ❌ Failed to get chats for '${sessionName}':`, error);
      throw error;
    }
  }

  /**
   * Get messages from chat
   */
  async getMessages(chatId: string, limit: number = 50, sessionName: string = this.defaultSession): Promise<WAHAMessage[]> {
    try {
      const response = await this.httpClient.get('/api/messages', {
        params: { 
          chatId,
          limit,
          session: sessionName 
        }
      });
      
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
    } catch (error) {
      console.error(`[WAHA Service] ❌ Failed to get messages for ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Stop session
   */
  async stopSession(sessionName: string = this.defaultSession): Promise<void> {
    try {
      await this.httpClient.delete(`/api/sessions/${sessionName}`);
      console.log(`[WAHA Service] ✅ Session '${sessionName}' stopped`);
    } catch (error) {
      console.error(`[WAHA Service] ❌ Failed to stop session '${sessionName}':`, error);
      throw error;
    }
  }

  /**
   * Get service status (compatible with old interface)
   */
  getStatus(): WAHAStatus {
    return {
      status: this.connectionStatus,
      isReady: this.isReady,
      qrAvailable: this.connectionStatus === 'SCAN_QR_CODE',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Webhook handler for WAHA events
   */
  handleWebhook(payload: any): void {
    try {
      console.log('[WAHA Service] Webhook received:', payload.event);
      
      switch (payload.event) {
        case 'message':
          this.emit('message', payload.data);
          // Process image messages for group monitoring
          this.processImageForGroupMonitoring(payload.data);
          break;
        case 'session.status':
          this.connectionStatus = payload.data.status;
          this.isReady = payload.data.status === 'WORKING';
          this.emit('status_change', payload.data);
          break;
        default:
          console.log(`[WAHA Service] Unknown webhook event: ${payload.event}`);
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
}

export default WAHAService;