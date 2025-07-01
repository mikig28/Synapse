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
  private isConnected = false;
  private currentSessionId: string | null = null;

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
      try {
        // Build SSE URL with parameters
        const url = new URL(`${this.config.endpoint}/api/v1/ag-ui/events`);
        if (this.config.userId) {
          url.searchParams.set('userId', this.config.userId);
        }
        if (this.config.sessionId) {
          url.searchParams.set('sessionId', this.config.sessionId);
        }

        this.eventSource = new EventSource(url.toString());

        this.eventSource.onopen = () => {
          console.log('[AGUIClient SSE] Connected');
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          this.handleSSEMessage(event);
        };

        this.eventSource.onerror = (error) => {
          console.error('[AGUIClient SSE] Connection error:', error);
          if (this.eventSource?.readyState === EventSource.CLOSED) {
            reject(new Error('SSE connection failed'));
          }
        };

        // Set a timeout for initial connection
        setTimeout(() => {
          if (this.eventSource?.readyState !== EventSource.OPEN) {
            reject(new Error('SSE connection timeout'));
          }
        }, 10000);
      } catch (error) {
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

    setTimeout(() => {
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

    console.log(`[AGUIClient] Subscribed to event type: ${eventType}`);

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

  private createEventSource(sessionId: string): EventSource {
    const url = new URL(`${this.config.endpoint}/api/v1/ag-ui/events`);
    url.searchParams.append('sessionId', sessionId);

    console.log('[AG-UI Client] Creating EventSource:', url.toString());
    
    const eventSource = new EventSource(url.toString());

    eventSource.onopen = () => {
      console.log('[AG-UI Client] EventSource connected');
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.isConnected = true;
      this.notifyStatusListeners();
      
      // Clear any existing reconnect timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[AG-UI Client] Received event:', data.type);
        
        if (data.type === 'CONNECTION_ESTABLISHED') {
          console.log('[AG-UI Client] Connection established with server');
        } else {
          this.handleEvent(data);
        }
      } catch (error) {
        console.error('[AG-UI Client] Error parsing event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[AG-UI Client] EventSource error:', error);
      this.connectionState = 'error';
      this.isConnected = false;
      this.notifyStatusListeners();

      // Close the current event source
      eventSource.close();
      
      // Check if this is a 503 error (service unavailable)
      const isServiceUnavailable = (error as any)?.status === 503 || 
                                  (error as any)?.target?.readyState === EventSource.CLOSED;
      
      if (isServiceUnavailable) {
        console.warn('[AG-UI Client] Backend service unavailable (503). Will retry with longer delay.');
      }

      // Attempt to reconnect with exponential backoff
      if (this.reconnectAttempts < this.config.reconnectAttempts!) {
        this.reconnectAttempts++;
        const baseDelay = isServiceUnavailable ? 10000 : 3000; // 10s for 503, 3s for other errors
        const delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts - 1), 60000);
        
        console.log(`[AG-UI Client] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.reconnectAttempts})`);
        this.connectionState = 'reconnecting';
        this.notifyStatusListeners();

        this.reconnectTimeout = setTimeout(() => {
          if (this.currentSessionId && !this.eventSource) {
            console.log('[AG-UI Client] Attempting reconnection...');
            this.eventSource = this.createEventSource(this.currentSessionId);
          }
        }, delay);
      } else {
        console.error('[AG-UI Client] Max reconnection attempts reached. Please refresh the page.');
        this.connectionState = 'disconnected';
        this.notifyStatusListeners();
        
        // Notify user of connection issues
        if (this.subscribers.size > 0) {
          this.notifySubscribers({
            type: 'CONNECTION_LOST',
            timestamp: new Date().toISOString(),
            error: 'Unable to connect to AG-UI service. The backend may be restarting.',
            rawEvent: { 
              message: 'Connection lost. Please check if the backend service is running.',
              severity: 'error'
            }
          } as AGUIEvent);
        }
      }
    };

    return eventSource;
  }
}