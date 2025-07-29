import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Agent, AgentRun } from '@/types/agent';
import { agentService } from '@/services/agentService';

// Cache configuration
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of cached items
  staleWhileRevalidate: boolean; // Return stale data while fetching fresh data
}

// Cache entry structure
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
  promise?: Promise<T>;
}

// Generic cache implementation
class DataCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100,
      staleWhileRevalidate: true,
      ...config,
    };
  }

  get(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.config.ttl;
    if (isExpired && !this.config.staleWhileRevalidate) {
      this.cache.delete(key);
      return null;
    }

    return {
      ...entry,
      isStale: isExpired,
    };
  }

  set(key: string, data: T): void {
    // Implement LRU eviction when cache is full
    if (this.cache.size >= this.config.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      isStale: false,
    });
  }

  setPromise(key: string, promise: Promise<T>): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.promise = promise;
    } else {
      // Don't set a full entry, just track the promise
      this.cache.set(key, {
        data: {} as T,
        timestamp: Date.now(),
        isStale: true,
        promise,
      });
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Debounce utility
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Request deduplication utility
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async dedupe<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  clear(): void {
    this.pendingRequests.clear();
  }
}

// Global instances
const agentCache = new DataCache<Agent[]>({ ttl: 30000 }); // 30 seconds for agents
const runsCache = new DataCache<AgentRun[]>({ ttl: 10000 }); // 10 seconds for runs
const statusCache = new DataCache<any>({ ttl: 5000 }); // 5 seconds for status
const deduplicator = new RequestDeduplicator();

// Optimized agents data hook
export const useOptimizedAgents = (options: {
  pollingInterval?: number;
  enableRealtime?: boolean;
  staleWhileRevalidate?: boolean;
} = {}) => {
  const {
    pollingInterval = 30000, // 30 seconds
    enableRealtime = true,
    staleWhileRevalidate = true,
  } = options;

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAgents = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'agents';
    
    if (!forceRefresh) {
      const cached = agentCache.get(cacheKey);
      if (cached && !cached.isStale) {
        setAgents(cached.data);
        setLoading(false);
        setLastUpdated(new Date(cached.timestamp));
        return cached.data;
      }

      // Return stale data immediately if available
      if (cached && cached.isStale && staleWhileRevalidate) {
        setAgents(cached.data);
        setLoading(false);
        setLastUpdated(new Date(cached.timestamp));
      }
    }

    try {
      const data = await deduplicator.dedupe(cacheKey, () => agentService.getAgents());
      
      agentCache.set(cacheKey, data || []);
      setAgents(data || []);
      setError(null);
      setLastUpdated(new Date());
      
      return data || [];
    } catch (err) {
      const error = err as Error;
      setError(error);
      
      // Return cached data even on error if available
      const cached = agentCache.get(cacheKey);
      if (cached) {
        setAgents(cached.data);
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [staleWhileRevalidate]);

  // Initial fetch
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Polling for updates
  useEffect(() => {
    if (!enableRealtime || pollingInterval <= 0) return;

    const interval = setInterval(() => {
      fetchAgents();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [fetchAgents, pollingInterval, enableRealtime]);

  // Manual refresh function
  const refresh = useCallback(() => {
    return fetchAgents(true);
  }, [fetchAgents]);

  // Optimistic updates for better UX
  const updateAgentOptimistically = useCallback((agentId: string, updates: Partial<Agent>) => {
    setAgents(prev => prev.map(agent => 
      agent._id === agentId ? { ...agent, ...updates } : agent
    ));
  }, []);

  const addAgentOptimistically = useCallback((agent: Agent) => {
    setAgents(prev => [agent, ...prev]);
  }, []);

  const removeAgentOptimistically = useCallback((agentId: string) => {
    setAgents(prev => prev.filter(agent => agent._id !== agentId));
  }, []);

  return {
    agents,
    loading,
    error,
    lastUpdated,
    refresh,
    updateAgentOptimistically,
    addAgentOptimistically,
    removeAgentOptimistically,
  };
};

// Optimized agent runs hook with debounced filtering
export const useOptimizedAgentRuns = (options: {
  limit?: number;
  agentId?: string;
  pollingInterval?: number;
  searchTerm?: string;
  status?: string;
} = {}) => {
  const {
    limit = 20,
    agentId,
    pollingInterval = 15000, // 15 seconds
    searchTerm = '',
    status = '',
  } = options;

  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Debounce search term to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const debouncedStatus = useDebounce(status, 300);

  const fetchRuns = useCallback(async () => {
    const cacheKey = `runs-${limit}-${agentId || 'all'}-${debouncedSearchTerm}-${debouncedStatus}`;
    
    const cached = runsCache.get(cacheKey);
    if (cached && !cached.isStale) {
      setRuns(cached.data);
      setLoading(false);
      return cached.data;
    }

    try {
      const data = await deduplicator.dedupe(cacheKey, () => 
        agentId 
          ? agentService.getAgentRuns(agentId, limit)
          : agentService.getUserAgentRuns(limit)
      );
      
      // Client-side filtering for search and status
      let filteredData = data || [];
      
      if (debouncedSearchTerm) {
        filteredData = filteredData.filter(run => 
          run.agentName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          run.status?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );
      }

      if (debouncedStatus) {
        filteredData = filteredData.filter(run => run.status === debouncedStatus);
      }

      runsCache.set(cacheKey, filteredData);
      setRuns(filteredData);
      setError(null);
      
      return filteredData;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [limit, agentId, debouncedSearchTerm, debouncedStatus]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Polling
  useEffect(() => {
    if (pollingInterval <= 0) return;

    const interval = setInterval(fetchRuns, pollingInterval);
    return () => clearInterval(interval);
  }, [fetchRuns, pollingInterval]);

  return {
    runs,
    loading,
    error,
    refresh: fetchRuns,
  };
};

// Optimized agent status hook with intelligent polling
export const useOptimizedAgentStatus = (agentId: string | null, options: {
  pollingInterval?: number;
  enabled?: boolean;
} = {}) => {
  const { pollingInterval = 5000, enabled = true } = options;
  
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const pollingIntervalRef = useRef<number>(pollingInterval);

  const fetchStatus = useCallback(async () => {
    if (!agentId || !enabled) return;

    setLoading(true);
    const cacheKey = `status-${agentId}`;
    
    try {
      const data = await deduplicator.dedupe(cacheKey, () => 
        agentService.getAgentStatus(agentId)
      );
      
      statusCache.set(cacheKey, data);
      setStatus(data);
      setError(null);

      // Adaptive polling: poll faster if agent is running
      if (data?.status === 'running') {
        pollingIntervalRef.current = 2000; // 2 seconds
      } else {
        pollingIntervalRef.current = pollingInterval; // Default interval
      }

      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [agentId, enabled, pollingInterval]);

  useEffect(() => {
    if (!enabled || !agentId) return;

    fetchStatus();

    const interval = setInterval(() => {
      fetchStatus();
    }, pollingIntervalRef.current);

    return () => clearInterval(interval);
  }, [fetchStatus, enabled, agentId]);

  return {
    status,
    loading,
    error,
    refresh: fetchStatus,
  };
};

// Batch operations hook for multiple agents
export const useBatchOperations = () => {
  const [operations, setOperations] = useState<Map<string, Promise<any>>>(new Map());

  const batchExecute = useCallback(async (agentIds: string[], operation: 'execute' | 'pause' | 'resume') => {
    const promises = agentIds.map(async (agentId) => {
      const key = `${operation}-${agentId}`;
      
      if (operations.has(key)) {
        return operations.get(key);
      }

      let promise: Promise<any>;
      switch (operation) {
        case 'execute':
          promise = agentService.executeAgent(agentId);
          break;
        case 'pause':
          promise = agentService.pauseAgent(agentId);
          break;
        case 'resume':
          promise = agentService.resumeAgent(agentId);
          break;
        default:
          return Promise.reject(new Error(`Unknown operation: ${operation}`));
      }

      setOperations(prev => new Map(prev).set(key, promise));
      
      promise.finally(() => {
        setOperations(prev => {
          const newMap = new Map(prev);
          newMap.delete(key);
          return newMap;
        });
      });

      return promise;
    });

    return Promise.allSettled(promises);
  }, [operations]);

  return { batchExecute, isOperationPending: (agentId: string, operation: string) => operations.has(`${operation}-${agentId}`) };
};

// Background sync hook for offline support
export const useBackgroundSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState<Array<{ type: string; data: any }>>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const queueOperation = useCallback((type: string, data: any) => {
    if (isOnline) {
      // Execute immediately if online
      return;
    }

    setPendingOperations(prev => [...prev, { type, data }]);
  }, [isOnline]);

  const syncPendingOperations = useCallback(async () => {
    if (!isOnline || pendingOperations.length === 0) return;

    const results = await Promise.allSettled(
      pendingOperations.map(async (op) => {
        // Execute queued operations based on type
        switch (op.type) {
          case 'execute-agent':
            return agentService.executeAgent(op.data.agentId);
          case 'update-agent':
            return agentService.updateAgent(op.data.agentId, op.data.updates);
          default:
            throw new Error(`Unknown operation type: ${op.type}`);
        }
      })
    );

    // Clear successfully executed operations
    const successfulOps = results.map((result, index) => 
      result.status === 'fulfilled' ? index : -1
    ).filter(index => index !== -1);

    setPendingOperations(prev => 
      prev.filter((_, index) => !successfulOps.includes(index))
    );
  }, [isOnline, pendingOperations]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncPendingOperations();
    }
  }, [isOnline, syncPendingOperations]);

  return {
    isOnline,
    pendingOperations: pendingOperations.length,
    queueOperation,
    syncPendingOperations,
  };
};

// Cache management utilities
export const useCacheManagement = () => {
  const clearAllCaches = useCallback(() => {
    agentCache.clear();
    runsCache.clear();
    statusCache.clear();
    deduplicator.clear();
  }, []);

  const getCacheStats = useCallback(() => {
    return {
      agents: agentCache.size(),
      runs: runsCache.size(),
      status: statusCache.size(),
    };
  }, []);

  return {
    clearAllCaches,
    getCacheStats,
  };
};