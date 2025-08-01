/**
 * WAHA WhatsApp Service - HTTP API Wrapper
 * Replaces the complex WhatsAppBaileysService with simple HTTP calls to WAHA microservice
 */

import axios from 'axios';
import type { AxiosInstance } from 'axios';
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
  private httpClient: AxiosInstance;
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
      const response = await this.httpClient.get('/api/health');
      console.log('[WAHA Service] ✅ Health check passed');
      return true;
    } catch (error) {
      console.error('[WAHA Service] ❌ Health check failed:', error);
      throw new Error('WAHA service is not available');
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
      const response = await this.httpClient.get(`/api/screenshot`, {
        params: { session: sessionName },
        responseType: 'arraybuffer'
      });
      
      const base64 = Buffer.from(response.data).toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error(`[WAHA Service] ❌ Failed to get QR code for '${sessionName}':`, error);
      throw error;
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
}

export default WAHAService;