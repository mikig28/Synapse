/**
 * Optimized WhatsApp Hook
 * Uses WebSocket with polling fallback, exponential backoff, and intelligent caching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { whatsappService, WhatsAppConnectionStatus, WhatsAppMessage, WhatsAppContact } from '../services/whatsappService';
import { whatsappWebSocketService, createHybridWhatsAppService } from '../services/whatsappWebSocketService';

interface UseOptimizedWhatsAppOptions {
  enableRealtime?: boolean;
  enablePolling?: boolean;
  pollingStrategy?: 'aggressive' | 'moderate' | 'conservative';
  cacheTimeout?: number;
}

interface WhatsAppState {
  status: WhatsAppConnectionStatus | null;
  messages: WhatsAppMessage[];
  contacts: WhatsAppContact[];
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  stats: {
    totalMessages: number;
    lastUpdate: Date | null;
    pollingEnabled: boolean;
    websocketConnected: boolean;
  };
}

export const useOptimizedWhatsApp = (options: UseOptimizedWhatsAppOptions = {}) => {
  const {
    enableRealtime = true,
    enablePolling = true,
    pollingStrategy = 'moderate',
    cacheTimeout = 30000, // 30 seconds cache
  } = options;

  const [state, setState] = useState<WhatsAppState>({
    status: null,
    messages: [],
    contacts: [],
    isConnected: false,
    isLoading: true,
    error: null,
    stats: {
      totalMessages: 0,
      lastUpdate: null,
      pollingEnabled: false,
      websocketConnected: false,
    },
  });

  const wsService = useRef(createHybridWhatsAppService());
  const unsubscribers = useRef<Array<() => void>>([]);
  const lastCacheUpdate = useRef<Date | null>(null);
  const hasInitialized = useRef(false);

  // Get polling intervals based on strategy
  const getPollingConfig = useCallback(() => {
    switch (pollingStrategy) {
      case 'aggressive':
        return { base: 30000, max: 180000, backoff: 1.8 }; // 30s base, 3min max
      case 'moderate':
        return { base: 60000, max: 300000, backoff: 2.0 }; // 1min base, 5min max
      case 'conservative':
        return { base: 120000, max: 600000, backoff: 2.5 }; // 2min base, 10min max
      default:
        return { base: 60000, max: 300000, backoff: 2.0 };
    }
  }, [pollingStrategy]);

  // Update state helper
  const updateState = useCallback((updates: Partial<WhatsAppState>) => {
    setState(prev => ({
      ...prev,
      ...updates,
      stats: {
        ...prev.stats,
        ...updates.stats,
        lastUpdate: new Date(),
      },
    }));
  }, []);

  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(async () => {
    if (!enableRealtime) return;

    try {
      console.log('[WhatsApp Hook] Initializing WebSocket connection...');
      await wsService.current.connect();
      
      updateState({
        stats: { ...state.stats, websocketConnected: true },
      });

      // Subscribe to WebSocket events
      const statusUnsub = wsService.current.subscribe('whatsapp-status', (status) => {
        updateState({
          status,
          isConnected: status.connected,
          error: null,
        });
      });

      const messagesUnsub = wsService.current.subscribe('whatsapp-messages', (messages) => {
        updateState({
          messages,
          stats: { ...state.stats, totalMessages: messages.length },
        });
      });

      const contactsUnsub = wsService.current.subscribe('whatsapp-contacts', (contacts) => {
        updateState({ contacts });
      });

      const errorUnsub = wsService.current.subscribe('error', (error) => {
        console.error('[WhatsApp Hook] WebSocket error:', error);
        updateState({ error });
      });

      const fallbackUnsub = wsService.current.subscribe('fallbackToPolling', () => {
        console.log('[WhatsApp Hook] Falling back to polling mode');
        initializePolling(true); // Force enable fallback polling
      });

      unsubscribers.current.push(statusUnsub, messagesUnsub, contactsUnsub, errorUnsub, fallbackUnsub);

    } catch (error) {
      console.error('[WhatsApp Hook] WebSocket initialization failed:', error);
      updateState({ 
        error: error as Error,
        stats: { ...state.stats, websocketConnected: false },
      });
      
      // Fallback to polling if WebSocket fails
      if (enablePolling) {
        initializePolling(true);
      }
    }
  }, [enableRealtime, enablePolling, state.stats, updateState]);

  // Initialize polling
  const initializePolling = useCallback((forceFallback = false) => {
    if (!enablePolling && !forceFallback) return;

    const config = getPollingConfig();
    console.log(`[WhatsApp Hook] Starting ${pollingStrategy} polling strategy...`);

    // Start status polling
    whatsappService.startStatusPolling((status) => {
      updateState({
        status,
        isConnected: status.connected,
        error: null,
      });
    });

    // Start message polling with reduced frequency
    whatsappService.startMessagePolling((messages) => {
      updateState({
        messages,
        stats: { ...state.stats, totalMessages: messages.length },
      });
    });

    // Start contact polling with very low frequency
    whatsappService.startContactPolling((contacts) => {
      updateState({ contacts });
    });

    updateState({
      stats: { ...state.stats, pollingEnabled: true },
    });

  }, [enablePolling, pollingStrategy, getPollingConfig, state.stats, updateState]);

  // Load cached data
  const loadCachedData = useCallback(() => {
    const now = Date.now();
    const cacheAge = lastCacheUpdate.current ? now - lastCacheUpdate.current.getTime() : Infinity;

    if (cacheAge < cacheTimeout) {
      console.log('[WhatsApp Hook] Using cached data');
      
      const cachedStatus = whatsappService.getCachedData('status');
      const cachedMessages = whatsappService.getCachedData('whatsapp-messages');
      const cachedContacts = whatsappService.getCachedData('contacts');

      if (cachedStatus || cachedMessages || cachedContacts) {
        updateState({
          status: cachedStatus || state.status,
          messages: cachedMessages || state.messages,
          contacts: cachedContacts || state.contacts,
          isLoading: false,
        });
        return true;
      }
    }

    return false;
  }, [cacheTimeout, state.status, state.messages, state.contacts, updateState]);

  // Send message through optimal channel
  const sendMessage = useCallback(async (to: string, message: string) => {
    try {
      // Try WebSocket first if connected
      if (wsService.current.isConnected()) {
        return await wsService.current.sendMessage('send-message', { to, message });
      }
      
      // Fallback to direct API call
      return await whatsappService.sendMessage(to, message);
    } catch (error) {
      console.error('[WhatsApp Hook] Failed to send message:', error);
      throw error;
    }
  }, []);

  // Manual refresh
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Force refresh through WebSocket if connected
      if (wsService.current.isConnected()) {
        await wsService.current.sendMessage('refresh-data', {});
      } else {
        // Fallback to polling service refresh
        const pollingStats = whatsappService.getPollingStats();
        if (pollingStats.pollingEnabled) {
          // Reset circuit breakers and force immediate poll
          whatsappService.resetCircuitBreaker('status');
          whatsappService.resetCircuitBreaker('messages');
          whatsappService.resetCircuitBreaker('contacts');
        }
      }
    } catch (error) {
      console.error('[WhatsApp Hook] Refresh failed:', error);
      updateState({ error: error as Error });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [updateState]);

  // Get connection statistics
  const getStats = useCallback(() => {
    const wsStats = wsService.current.getStats();
    const pollingStats = whatsappService.getPollingStats();
    
    return {
      websocket: wsStats,
      polling: pollingStats,
      cache: {
        lastUpdate: lastCacheUpdate.current,
        timeout: cacheTimeout,
      },
    };
  }, [cacheTimeout]);

  // Initialize hook
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    console.log('[WhatsApp Hook] Initializing with options:', options);

    // Try to load cached data first
    const hasCachedData = loadCachedData();

    // Initialize connection methods
    if (enableRealtime) {
      initializeWebSocket();
    } else if (enablePolling) {
      initializePolling();
    }

    // If no cached data, show loading state
    if (!hasCachedData) {
      setState(prev => ({ ...prev, isLoading: true }));
    }

    // Cleanup function
    return () => {
      console.log('[WhatsApp Hook] Cleaning up...');
      
      // Unsubscribe from all events
      unsubscribers.current.forEach(unsub => unsub());
      unsubscribers.current = [];

      // Disconnect WebSocket
      wsService.current.disconnect();

      // Stop polling
      whatsappService.stopPolling();
    };
  }, [
    enableRealtime,
    enablePolling,
    initializeWebSocket,
    initializePolling,
    loadCachedData,
    options,
  ]);

  // Handle visibility change for optimization
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Reduce activity when tab is not visible
        console.log('[WhatsApp Hook] Tab hidden, reducing activity...');
        // You could pause polling or reduce WebSocket heartbeat frequency here
      } else {
        // Resume normal activity when tab becomes visible
        console.log('[WhatsApp Hook] Tab visible, resuming normal activity...');
        // Trigger a refresh to get latest data
        refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refresh]);

  return {
    // State
    ...state,
    
    // Actions
    sendMessage,
    refresh,
    
    // Utilities
    getStats,
    
    // Service controls
    resetCircuitBreaker: (service: 'status' | 'messages' | 'contacts') => {
      whatsappService.resetCircuitBreaker(service);
    },
    
    // Subscribe to specific events
    subscribe: (event: string, callback: (data: any) => void) => {
      return whatsappService.subscribe(event, callback);
    },
  };
};

// Hook for specific chat monitoring
export const useOptimizedWhatsAppChat = (chatId: string, options: UseOptimizedWhatsAppOptions = {}) => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!chatId) return;

    console.log(`[WhatsApp Chat Hook] Monitoring chat: ${chatId}`);

    // Start chat-specific message polling with conservative frequency
    whatsappService.startMessagePolling(
      (newMessages) => {
        setMessages(newMessages);
        setLoading(false);
        setError(null);
      },
      chatId
    );

    return () => {
      console.log(`[WhatsApp Chat Hook] Stopping monitoring for: ${chatId}`);
      whatsappService.stopSpecificPolling('messages', chatId);
    };
  }, [chatId]);

  const sendMessage = useCallback(async (message: string) => {
    if (!chatId) throw new Error('No chat ID provided');
    
    try {
      return await whatsappService.sendMessage(chatId, message);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [chatId]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    chatId,
  };
};