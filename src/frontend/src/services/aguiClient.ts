import {
  AGUIEvent,
  IAGUIClient,
  AGUIClientConfig,
  AGUIEventHandler,
  AGUISubscription,
  AGUIEventType
} from '../types/aguiTypes';

/**
 * AG-UI Client Implementation for Frontend
 * Provides both SSE and WebSocket connectivity following AG-UI protocol
 */
export class AGUIClient implements IAGUIClient {
  private config: AGUIClientConfig;
  private eventSource: EventSource | null = null;
  private socket: WebSocket | null = null;
  private subscribers: Map<string, Set<AGUIEventHandler>> = new Map();
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastEventTime = Date.now();
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(config: AGUIClientConfig) {
    this.config = {
      reconnectAttempts: 5,
      heartbeatInterval: 30000,
      ...config
    };
  }

  async connect(): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    this.connectionState = 'connecting';
    console.log('[AGUIClient] Connecting to AG-UI protocol endpoint...');
    console.log('[AGUIClient] Backend URL:', this.config.endpoint);

    try {
      // Primary connection via SSE
      await this.connectSSE();
      
      // Fallback to WebSocket if available
      this.connectWebSocket();
      
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      
      // Start heartbeat monitoring
      this.startHeartbeat();
      
      console.log('[AGUIClient] ✅ Connected to AG-UI protocol');
    } catch (error) {
      console.error('[AGUIClient] ❌ Failed to connect:', error);
      this.connectionState = 'error';
      this.scheduleReconnect();
    }
  }

  private async connectSSE(): Promise<void> {
    return new Promise((resolve, reject) => {
      let connectionTimeout: NodeJS.Timeout | null = null;
      
      try {
        // Build SSE URL with parameters
        const url = new URL(`${this.config.endpoint}/api/v1/ag-ui/events`);
        if (this.config.userId) {
          url.searchParams.set('userId', this.config.userId);
        }
        if (this.config.sessionId) {
          url.searchParams.set('sessionId', this.config.sessionId);
        }

        console.log('[AGUIClient] Creating EventSource:', url.toString());
        this.eventSource = new EventSource(url.toString());

        this.eventSource.onopen = () => {
          console.log('[AGUIClient SSE] Connected successfully');
          // Clear the connection timeout since we've successfully connected
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
          }
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          this.handleSSEMessage(event);
        };

        this.eventSource.onerror = (error) => {
          console.error('[AGUIClient SSE] Connection error:', error);
          console.error('[AGUIClient SSE] ReadyState:', this.eventSource?.readyState);
          
          if (this.eventSource?.readyState === EventSource.CLOSED) {
            // Clear timeout on error
            if (connectionTimeout) {
              clearTimeout(connectionTimeout);
              connectionTimeout = null;
            }
            reject(new Error('SSE connection failed'));
          } else if (this.eventSource?.readyState === EventSource.CONNECTING) {
            console.log('[AGUIClient SSE] Still connecting...');
          }
        };

        // Set a timeout for initial connection
        connectionTimeout = setTimeout(() => {
          if (this.eventSource?.readyState !== EventSource.OPEN) {
            console.error('[AGUIClient SSE] Connection timeout. ReadyState:', this.eventSource?.readyState);
            connectionTimeout = null;
            reject(new Error('SSE connection timeout'));
          }
        }, 15000); // Increased timeout for production
      } catch (error) {
        console.error('[AGUIClient SSE] Setup error:', error);
        // Clear timeout on setup error
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
        reject(error);
      }
    });
  }

  private connectWebSocket(): void {
    try {
      // Convert HTTP/HTTPS URL to WebSocket URL
      const wsUrl = this.config.endpoint.replace(/^http/, 'ws') + '/socket.io/';
      
      // Note: This would require socket.io-client, but we're keeping it simple for now
      console.log('[AGUIClient] WebSocket fallback available at:', wsUrl);
    } catch (error) {
      console.warn('[AGUIClient] WebSocket fallback failed:', error);
    }
  }

  private handleSSEMessage(event: MessageEvent): void {
    try {
      const eventData = JSON.parse(event.data) as AGUIEvent;
      this.lastEventTime = Date.now();
      
      console.log('[AGUIClient] Received AG-UI event:', eventData.type);
      
      // Handle connection establishment
      if (eventData.type === 'CONNECTION_ESTABLISHED') {
        console.log('[AGUIClient] Connection established with server');
        return;
      }
      
      // Validate event structure
      if (!this.isValidAGUIEvent(eventData)) {
        console.warn('[AGUIClient] Invalid AG-UI event received:', eventData);
        return;
      }

      // Emit to subscribers
      this.emitToSubscribers(eventData);
    } catch (error) {
      console.error('[AGUIClient] Error parsing SSE message:', error);
    }
  }

  private emitToSubscribers(event: AGUIEvent): void {
    try {
      // Emit to type-specific subscribers
      const typeSubscribers = this.subscribers.get(event.type) || new Set();
      
      // Emit to wildcard subscribers
      const wildcardSubscribers = this.subscribers.get('*') || new Set();
      
      // Combine and deduplicate
      const allSubscribers = new Set([...typeSubscribers, ...wildcardSubscribers]);
      
      console.log(`[AGUIClient] Emitting to ${allSubscribers.size} subscribers`);
      
      allSubscribers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('[AGUIClient] Error in event handler:', error);
        }
      });
    } catch (error) {
      console.error('[AGUIClient] Error emitting to subscribers:', error);
    }
  }

  private isValidAGUIEvent(event: any): event is AGUIEvent {
    return (
      event &&
      typeof event === 'object' &&
      typeof event.type === 'string' &&
      (Object.values(AGUIEventType).includes(event.type as AGUIEventType) || 
       event.type === 'CONNECTION_ESTABLISHED')
    );
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      const timeSinceLastEvent = Date.now() - this.lastEventTime;
      
      // If no events received for too long, consider connection stale
      if (timeSinceLastEvent > (this.config.heartbeatInterval || 30000) * 2) {
        console.warn('[AGUIClient] Connection appears stale, reconnecting...');
        this.reconnect();
      }
    }, this.config.heartbeatInterval || 30000);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[AGUIClient] Max reconnection attempts reached');
      this.connectionState = 'error';
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`[AGUIClient] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      if (this.connectionState !== 'connected') {
        this.reconnect();
      }
    }, delay);
  }

  private async reconnect(): Promise<void> {
    console.log('[AGUIClient] Reconnecting...');
    this.disconnect();
    await this.connect();
  }

  disconnect(): void {
    console.log('[AGUIClient] Disconnecting...');
    
    this.connectionState = 'disconnected';
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  subscribe<T extends AGUIEvent>(
    eventType: T['type'] | '*',
    handler: AGUIEventHandler<T>
  ): AGUISubscription {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }

    const typeSubscribers = this.subscribers.get(eventType)!;
    typeSubscribers.add(handler as AGUIEventHandler);

    console.log(`[AGUIClient] Subscribed to event type: ${eventType} (total subscribers: ${this.getSubscriberCount()})`);

    return {
      unsubscribe: () => {
        typeSubscribers.delete(handler as AGUIEventHandler);
        if (typeSubscribers.size === 0) {
          this.subscribers.delete(eventType);
        }
        console.log(`[AGUIClient] Unsubscribed from event type: ${eventType}`);
      }
    };
  }

  emit(event: AGUIEvent): void {
    // For AG-UI commands, we need to send via WebSocket or HTTP
    // For now, we'll emit via Socket.IO if available
    try {
      if ((window as any).socket) {
        (window as any).socket.emit('ag_ui_cmd', event);
        console.log('[AGUIClient] Emitted AG-UI command:', event.type);
      } else {
        console.warn('[AGUIClient] No Socket.IO connection available for commands');
      }
    } catch (error) {
      console.error('[AGUIClient] Error emitting command:', error);
    }
  }

  getConnectionState(): 'disconnected' | 'connecting' | 'connected' | 'error' {
    return this.connectionState;
  }

  // Utility methods
  getSubscriberCount(): number {
    let count = 0;
    this.subscribers.forEach(handlers => {
      count += handlers.size;
    });
    return count;
  }

  getStats(): {
    connectionState: string;
    reconnectAttempts: number;
    subscriberCount: number;
    lastEventTime: number;
  } {
    return {
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      subscriberCount: this.getSubscriberCount(),
      lastEventTime: this.lastEventTime
    };
  }
}