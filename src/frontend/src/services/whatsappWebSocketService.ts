/**
 * WhatsApp WebSocket Service
 * Enhanced WebSocket connection with auto-reconnect, heartbeat, and message queuing
 */

import { optimizedPollingService } from './optimizedPollingService';

interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  messageTimeout: number;
}

interface QueuedMessage {
  id: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

interface WebSocketStats {
  connected: boolean;
  reconnectAttempts: number;
  messagesReceived: number;
  messagesSent: number;
  lastHeartbeat: Date | null;
  uptime: number;
  connectionStartTime: Date | null;
}

export class WhatsAppWebSocketService {
  private static instance: WhatsAppWebSocketService | null = null;
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private messageQueue: QueuedMessage[] = [];
  private messageCallbacks = new Map<string, (error?: Error, data?: any) => void>();
  private eventListeners = new Map<string, Set<(data: any) => void>>();
  private stats: WebSocketStats;
  private isIntentionallyDisconnected = false;

  private constructor() {
    this.config = {
      url: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/whatsapp`,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      messageTimeout: 15000,
    };

    this.stats = {
      connected: false,
      reconnectAttempts: 0,
      messagesReceived: 0,
      messagesSent: 0,
      lastHeartbeat: null,
      uptime: 0,
      connectionStartTime: null,
    };
  }

  public static getInstance(): WhatsAppWebSocketService {
    if (!WhatsAppWebSocketService.instance) {
      WhatsAppWebSocketService.instance = new WhatsAppWebSocketService();
    }
    return WhatsAppWebSocketService.instance;
  }

  /**
   * Connect to WhatsApp WebSocket
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          console.log('[WhatsApp WS] Already connected');
          resolve();
          return;
        }

        this.isIntentionallyDisconnected = false;
        console.log(`[WhatsApp WS] Connecting to ${this.config.url}...`);

        this.ws = new WebSocket(this.config.url);
        
        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.ws.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000); // 10 second connection timeout

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('[WhatsApp WS] Connected successfully');
          
          this.stats.connected = true;
          this.stats.connectionStartTime = new Date();
          this.reconnectAttempts = 0;
          this.stats.reconnectAttempts = 0;

          this.startHeartbeat();
          this.processQueuedMessages();
          this.emit('connected', { connected: true });

          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          this.handleClose(event);
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('[WhatsApp WS] Connection error:', error);
          this.emit('error', error);
          
          if (this.stats.connectionStartTime) {
            // Only reject if we're in the initial connection attempt
            if (Date.now() - this.stats.connectionStartTime.getTime() < 15000) {
              reject(error);
            }
          } else {
            reject(error);
          }
        };

      } catch (error) {
        console.error('[WhatsApp WS] Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  public disconnect(): void {
    this.isIntentionallyDisconnected = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Intentional disconnect');
      this.ws = null;
    }

    this.stats.connected = false;
    console.log('[WhatsApp WS] Disconnected');
  }

  /**
   * Send message through WebSocket
   */
  public sendMessage(type: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const messageId = this.generateMessageId();
      const message: QueuedMessage = {
        id: messageId,
        data: { id: messageId, type, data, timestamp: Date.now() },
        timestamp: Date.now(),
        retryCount: 0,
      };

      // Set up timeout for response
      const timeout = setTimeout(() => {
        this.messageCallbacks.delete(messageId);
        reject(new Error(`Message timeout: ${type}`));
      }, this.config.messageTimeout);

      this.messageCallbacks.set(messageId, (error, responseData) => {
        clearTimeout(timeout);
        if (error) {
          reject(error);
        } else {
          resolve(responseData);
        }
      });

      if (this.isConnected()) {
        this.sendQueuedMessage(message);
      } else {
        this.messageQueue.push(message);
        console.log(`[WhatsApp WS] Queued message (${type}) - not connected`);
        
        // Try to reconnect if not intentionally disconnected
        if (!this.isIntentionallyDisconnected) {
          this.reconnect();
        }
      }
    });
  }

  /**
   * Subscribe to WebSocket events
   */
  public subscribe(event: string, callback: (data: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    this.eventListeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  /**
   * Get connection status
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get WebSocket statistics
   */
  public getStats(): WebSocketStats {
    if (this.stats.connectionStartTime) {
      this.stats.uptime = Date.now() - this.stats.connectionStartTime.getTime();
    }
    return { ...this.stats };
  }

  /**
   * Force reconnect
   */
  public reconnect(): void {
    if (this.isIntentionallyDisconnected) {
      console.log('[WhatsApp WS] Ignoring reconnect - intentionally disconnected');
      return;
    }

    if (this.reconnectTimer) {
      console.log('[WhatsApp WS] Reconnect already scheduled');
      return;
    }

    console.log(`[WhatsApp WS] Scheduling reconnect attempt ${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts}`);
    
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts), // Exponential backoff
      60000 // Max 1 minute delay
    );

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      
      if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
        console.error('[WhatsApp WS] Max reconnect attempts reached');
        this.emit('maxReconnectAttemptsReached', { attempts: this.reconnectAttempts });
        
        // Fall back to polling if WebSocket fails completely
        this.fallbackToPolling();
        return;
      }

      this.reconnectAttempts++;
      this.stats.reconnectAttempts = this.reconnectAttempts;

      try {
        await this.connect();
      } catch (error) {
        console.error(`[WhatsApp WS] Reconnect attempt ${this.reconnectAttempts} failed:`, error);
        this.reconnect(); // Schedule next attempt
      }
    }, delay);
  }

  /**
   * Update WebSocket configuration
   */
  public updateConfig(newConfig: Partial<WebSocketConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[WhatsApp WS] Configuration updated:', this.config);
  }

  // Private methods

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      this.stats.messagesReceived++;

      // Handle heartbeat response
      if (message.type === 'heartbeat') {
        this.stats.lastHeartbeat = new Date();
        return;
      }

      // Handle message responses
      if (message.id && this.messageCallbacks.has(message.id)) {
        const callback = this.messageCallbacks.get(message.id)!;
        this.messageCallbacks.delete(message.id);
        
        if (message.error) {
          callback(new Error(message.error));
        } else {
          callback(undefined, message.data);
        }
        return;
      }

      // Handle event messages
      if (message.type) {
        console.log(`[WhatsApp WS] Received event: ${message.type}`);
        this.emit(message.type, message.data);
      }

    } catch (error) {
      console.error('[WhatsApp WS] Failed to parse message:', error, event.data);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log(`[WhatsApp WS] Connection closed: ${event.code} - ${event.reason}`);
    
    this.stats.connected = false;
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.emit('disconnected', { 
      code: event.code, 
      reason: event.reason,
      wasClean: event.wasClean 
    });

    // Only attempt reconnect if not intentionally disconnected
    if (!this.isIntentionallyDisconnected && event.code !== 1000) {
      this.reconnect();
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        try {
          this.ws!.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
        } catch (error) {
          console.error('[WhatsApp WS] Heartbeat failed:', error);
        }
      }
    }, this.config.heartbeatInterval);
  }

  private processQueuedMessages(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`[WhatsApp WS] Processing ${this.messageQueue.length} queued messages`);
    
    const messagesToProcess = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of messagesToProcess) {
      if (message.retryCount < 3) { // Max 3 retries per message
        this.sendQueuedMessage(message);
      } else {
        console.warn(`[WhatsApp WS] Dropping message after 3 retries:`, message.data.type);
        const callback = this.messageCallbacks.get(message.id);
        if (callback) {
          callback(new Error('Message dropped after max retries'));
          this.messageCallbacks.delete(message.id);
        }
      }
    }
  }

  private sendQueuedMessage(message: QueuedMessage): void {
    if (!this.isConnected()) {
      this.messageQueue.push(message);
      return;
    }

    try {
      this.ws!.send(JSON.stringify(message.data));
      this.stats.messagesSent++;
      message.retryCount++;
    } catch (error) {
      console.error('[WhatsApp WS] Failed to send message:', error);
      if (message.retryCount < 3) {
        this.messageQueue.push(message);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WhatsApp WS] Error in ${event} listener:`, error);
        }
      });
    }
  }

  private generateMessageId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private fallbackToPolling(): void {
    console.log('[WhatsApp WS] Falling back to optimized polling due to WebSocket failure');
    
    this.emit('fallbackToPolling', { 
      reason: 'WebSocket connection failed',
      maxReconnectAttemptsReached: true
    });

    // You can integrate with your existing polling service here
    // For example, automatically start status polling if WebSocket fails
  }
}

// Singleton instance
export const whatsappWebSocketService = WhatsAppWebSocketService.getInstance();

// Integration with optimized polling as fallback
export const createHybridWhatsAppService = () => {
  const wsService = WhatsAppWebSocketService.getInstance();
  
  // Auto-fallback to polling when WebSocket fails
  wsService.subscribe('maxReconnectAttemptsReached', () => {
    console.log('[Hybrid Service] WebSocket failed, enabling fallback polling...');
    
    // Start fallback polling with longer intervals
    optimizedPollingService.startPolling(
      'whatsapp-fallback-status',
      async () => {
        // Implement your status check here
        return { connected: false, fallbackMode: true };
      },
      (status) => {
        wsService.emit('status', status);
      },
      (error) => {
        console.error('Fallback polling error:', error);
      },
      {
        baseInterval: 60000,     // 1 minute
        maxInterval: 300000,     // 5 minutes
        maxRetries: 3,
        backoffMultiplier: 2,
        enableAdaptivePolling: true,
        enableCircuitBreaker: true
      }
    );
  });

  // Stop fallback polling when WebSocket reconnects
  wsService.subscribe('connected', () => {
    console.log('[Hybrid Service] WebSocket reconnected, stopping fallback polling...');
    optimizedPollingService.stopPolling('whatsapp-fallback-status');
  });

  return wsService;
};