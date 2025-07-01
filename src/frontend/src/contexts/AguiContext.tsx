import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { AGUIClient } from '../services/aguiClient';
import {
  AGUIEvent,
  IAGUIClient,
  AGUIClientConfig,
  AGUIEventHandler,
  AGUISubscription,
  AGUIEventType
} from '../types/aguiTypes';

interface AguiContextValue {
  client: IAGUIClient | null;
  isConnected: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastEvent: AGUIEvent | null;
  eventCount: number;
  subscribe: <T extends AGUIEvent>(
    eventType: T['type'] | '*',
    handler: AGUIEventHandler<T>
  ) => AGUISubscription | null;
  emit: (event: AGUIEvent) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  getStats: () => any;
}

const AguiContext = createContext<AguiContextValue | null>(null);

interface AguiProviderProps {
  children: ReactNode;
  config?: Partial<AGUIClientConfig>;
  autoConnect?: boolean;
}

export const AguiProvider: React.FC<AguiProviderProps> = ({
  children,
  config = {},
  autoConnect = true
}) => {
  const [client, setClient] = useState<IAGUIClient | null>(null);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [lastEvent, setLastEvent] = useState<AGUIEvent | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const subscriptionsRef = useRef<AGUISubscription[]>([]);

  // Get backend URL from environment
  // In production, this should be your actual backend URL
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 
    import.meta.env.VITE_BACKEND_ROOT_URL ||
    (window.location.hostname === 'localhost' 
      ? 'http://localhost:3000' 
      : 'https://synapse-backend-7lq6.onrender.com');
  
  // Get user ID from localStorage or other auth mechanism
  const getUserId = (): string | undefined => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // You might want to decode JWT token to get user ID
        // For now, we'll use a simple approach
        const user = localStorage.getItem('user');
        if (user) {
          const userData = JSON.parse(user);
          return userData.id || userData._id;
        }
      }
    } catch (error) {
      console.warn('[AguiProvider] Error getting user ID:', error);
    }
    return undefined;
  };

  // Initialize AG-UI client
  useEffect(() => {
    console.log('[AguiProvider] Initializing AG-UI client...');
    
    const clientConfig: AGUIClientConfig = {
      endpoint: backendUrl,
      userId: getUserId(),
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reconnectAttempts: 5,
      heartbeatInterval: 30000,
      ...config
    };

    const aguiClient = new AGUIClient(clientConfig);
    setClient(aguiClient);

    // Subscribe to all events for global state tracking
    const globalSubscription = aguiClient.subscribe('*', (event) => {
      setLastEvent(event);
      setEventCount(prev => prev + 1);
      console.log('[AguiProvider] Received AG-UI event:', event.type);
    });

    subscriptionsRef.current.push(globalSubscription);

    // Monitor connection state
    const connectionMonitor = setInterval(() => {
      const state = aguiClient.getConnectionState();
      setConnectionState(state);
    }, 1000);

    // Auto-connect if enabled
    if (autoConnect) {
      aguiClient.connect().catch(error => {
        console.error('[AguiProvider] Auto-connect failed:', error);
      });
    }

    // Cleanup on unmount
    return () => {
      console.log('[AguiProvider] Cleaning up AG-UI client...');
      clearInterval(connectionMonitor);
      
      // Unsubscribe from all subscriptions
      subscriptionsRef.current.forEach(subscription => {
        subscription.unsubscribe();
      });
      subscriptionsRef.current = [];
      
      aguiClient.disconnect();
    };
  }, []); // Empty dependency array - only run once on mount

  // Update connection state when client changes
  useEffect(() => {
    if (client) {
      const state = client.getConnectionState();
      setConnectionState(state);
    }
  }, [client]);

  const subscribe = <T extends AGUIEvent>(
    eventType: T['type'] | '*',
    handler: AGUIEventHandler<T>
  ): AGUISubscription | null => {
    if (!client) {
      console.warn('[AguiProvider] Cannot subscribe - client not initialized');
      return null;
    }

    const subscription = client.subscribe(eventType, handler);
    subscriptionsRef.current.push(subscription);
    
    return {
      unsubscribe: () => {
        subscription.unsubscribe();
        const index = subscriptionsRef.current.indexOf(subscription);
        if (index > -1) {
          subscriptionsRef.current.splice(index, 1);
        }
      }
    };
  };

  const emit = (event: AGUIEvent): void => {
    if (!client) {
      console.warn('[AguiProvider] Cannot emit - client not initialized');
      return;
    }
    client.emit(event);
  };

  const connect = async (): Promise<void> => {
    if (!client) {
      console.warn('[AguiProvider] Cannot connect - client not initialized');
      return;
    }
    await client.connect();
  };

  const disconnect = (): void => {
    if (!client) {
      console.warn('[AguiProvider] Cannot disconnect - client not initialized');
      return;
    }
    client.disconnect();
  };

  const getStats = () => {
    if (!client) {
      return null;
    }
    return (client as AGUIClient).getStats();
  };

  const contextValue: AguiContextValue = {
    client,
    isConnected: connectionState === 'connected',
    connectionState,
    lastEvent,
    eventCount,
    subscribe,
    emit,
    connect,
    disconnect,
    getStats
  };

  return (
    <AguiContext.Provider value={contextValue}>
      {children}
    </AguiContext.Provider>
  );
};

export const useAgui = (): AguiContextValue => {
  const context = useContext(AguiContext);
  if (!context) {
    throw new Error('useAgui must be used within an AguiProvider');
  }
  return context;
};

// Convenience hooks for specific event types
export const useAguiEvent = <T extends AGUIEvent>(
  eventType: T['type'],
  handler: AGUIEventHandler<T>,
  deps: React.DependencyList = []
): void => {
  const { subscribe } = useAgui();
  
  useEffect(() => {
    const subscription = subscribe(eventType, handler);
    return () => {
      subscription?.unsubscribe();
    };
  }, [eventType, ...deps]);
};

export const useAguiEvents = (
  handler: AGUIEventHandler,
  deps: React.DependencyList = []
): void => {
  const { subscribe } = useAgui();
  
  useEffect(() => {
    const subscription = subscribe('*', handler);
    return () => {
      subscription?.unsubscribe();
    };
  }, [...deps]);
};

// Convenience hook for agent run events
export const useAgentRunEvents = (
  agentId: string,
  handler: (event: AGUIEvent) => void,
  deps: React.DependencyList = []
): void => {
  useAguiEvents((event) => {
    const synapseEvent = event as any;
    if (synapseEvent.agentId === agentId) {
      handler(event);
    }
  }, [agentId, ...deps]);
};

// Convenience hook for specific user events
export const useUserEvents = (
  userId: string,
  handler: (event: AGUIEvent) => void,
  deps: React.DependencyList = []
): void => {
  useAguiEvents((event) => {
    const synapseEvent = event as any;
    if (synapseEvent.userId === userId) {
      handler(event);
    }
  }, [userId, ...deps]);
};

// Export the stats hook from the main hooks file
export { useAguiStats } from '../hooks/useAguiEvents';