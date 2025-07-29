import { useCallback, useMemo, useRef, useEffect } from 'react';

// Custom hook for memoized callbacks with dependency tracking
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  const callbackRef = useRef<T>(callback);
  const depsRef = useRef<React.DependencyList>(deps);

  // Update callback if dependencies changed
  useEffect(() => {
    const depsChanged = deps.length !== depsRef.current.length || 
      deps.some((dep, i) => dep !== depsRef.current[i]);
    
    if (depsChanged) {
      callbackRef.current = callback;
      depsRef.current = deps;
    }
  });

  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []) as T;
};

// Custom hook for expensive computations with memoization
export const useComputedValue = <T>(
  computeFn: () => T,
  deps: React.DependencyList,
  options: {
    cacheTime?: number;
    enableLogging?: boolean;
  } = {}
): T => {
  const { cacheTime = 5000, enableLogging = false } = options;
  const cacheRef = useRef<{ value: T; timestamp: number; deps: React.DependencyList } | null>(null);

  return useMemo(() => {
    const now = Date.now();
    
    // Check if we have a valid cache entry
    if (cacheRef.current) {
      const { value, timestamp, deps: cachedDeps } = cacheRef.current;
      const isExpired = now - timestamp > cacheTime;
      const depsChanged = deps.length !== cachedDeps.length || 
        deps.some((dep, i) => dep !== cachedDeps[i]);

      if (!isExpired && !depsChanged) {
        if (enableLogging) {
          console.log('[useComputedValue] Cache hit');
        }
        return value;
      }
    }

    // Compute new value
    if (enableLogging) {
      console.log('[useComputedValue] Computing new value');
    }
    
    const startTime = performance.now();
    const newValue = computeFn();
    const computeTime = performance.now() - startTime;
    
    if (enableLogging) {
      console.log(`[useComputedValue] Computed in ${computeTime.toFixed(2)}ms`);
    }

    // Update cache
    cacheRef.current = {
      value: newValue,
      timestamp: now,
      deps: [...deps],
    };

    return newValue;
  }, deps);
};

// Custom hook for throttling function calls
export const useThrottledCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;

    if (timeSinceLastCall >= delay) {
      lastCallRef.current = now;
      return callback(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        callback(...args);
      }, delay - timeSinceLastCall);
    }
  }, [callback, delay]) as T;
};

// Custom hook for intersection observer with performance optimization
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {},
  targetRef?: React.RefObject<Element>
) => {
  const [isVisible, setIsVisible] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    if (!targetRef?.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        setEntry(entry);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(targetRef.current);

    return () => observer.disconnect();
  }, [targetRef, options.threshold, options.rootMargin, options.root]);

  return { isVisible, entry };
};

// Custom hook for component size measurement
export const useComponentSize = (ref: React.RefObject<HTMLElement>) => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(ref.current);
    return () => resizeObserver.disconnect();
  }, [ref]);

  return size;
};

// Custom hook for lazy state initialization
export const useLazyState = <T>(initializer: () => T) => {
  const [state, setState] = useState<T | null>(null);
  const initializedRef = useRef(false);

  const lazyState = useMemo(() => {
    if (!initializedRef.current) {
      const value = initializer();
      setState(value);
      initializedRef.current = true;
      return value;
    }
    return state!;
  }, [initializer, state]);

  return [lazyState, setState] as const;
};

// Custom hook for managing component mounting state
export const useMountedState = () => {
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return useCallback(() => mountedRef.current, []);
};

// Custom hook for performance monitoring
export const usePerformanceTracker = (componentName: string) => {
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);

  useEffect(() => {
    renderCountRef.current += 1;
    const renderStart = performance.now();

    return () => {
      const renderTime = performance.now() - renderStart;
      renderTimesRef.current.push(renderTime);

      // Keep only last 10 render times
      if (renderTimesRef.current.length > 10) {
        renderTimesRef.current.shift();
      }

      if (import.meta.env.DEV) {
        console.log(`[${componentName}] Render #${renderCountRef.current} took ${renderTime.toFixed(2)}ms`);
        
        if (renderCountRef.current % 10 === 0) {
          const avgRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;
          console.log(`[${componentName}] Average render time: ${avgRenderTime.toFixed(2)}ms over ${renderTimesRef.current.length} renders`);
        }
      }
    };
  });

  return {
    renderCount: renderCountRef.current,
    averageRenderTime: renderTimesRef.current.length > 0 
      ? renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length 
      : 0,
  };
};

import { useState } from 'react';

// Hook for batch state updates to reduce re-renders
export const useBatchedState = <T extends Record<string, any>>(initialState: T) => {
  const [state, setState] = useState<T>(initialState);
  const pendingUpdatesRef = useRef<Partial<T>>({});
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const batchUpdate = useCallback((updates: Partial<T>) => {
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, ...pendingUpdatesRef.current }));
      pendingUpdatesRef.current = {};
    }, 0);
  }, []);

  const immediateUpdate = useCallback((updates: Partial<T>) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    setState(prev => ({ 
      ...prev, 
      ...pendingUpdatesRef.current, 
      ...updates 
    }));
    pendingUpdatesRef.current = {};
  }, []);

  return [state, batchUpdate, immediateUpdate] as const;
};

// Hook for optimized list filtering and sorting
export const useOptimizedList = <T>(
  items: T[],
  filterFn: (item: T) => boolean,
  sortFn?: (a: T, b: T) => number,
  deps: React.DependencyList = []
) => {
  return useMemo(() => {
    let result = items.filter(filterFn);
    
    if (sortFn) {
      result.sort(sortFn);
    }
    
    return result;
  }, [items, filterFn, sortFn, ...deps]);
};

// Hook for scroll position tracking with throttling
export const useScrollPosition = (throttleMs: number = 100) => {
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });

  const updateScrollPosition = useThrottledCallback(() => {
    setScrollPosition({
      x: window.scrollX,
      y: window.scrollY,
    });
  }, throttleMs);

  useEffect(() => {
    window.addEventListener('scroll', updateScrollPosition);
    updateScrollPosition(); // Get initial position

    return () => window.removeEventListener('scroll', updateScrollPosition);
  }, [updateScrollPosition]);

  return scrollPosition;
};

export default {
  useStableCallback,
  useComputedValue,
  useThrottledCallback,
  useIntersectionObserver,
  useComponentSize,
  useLazyState,
  useMountedState,
  usePerformanceTracker,
  useBatchedState,
  useOptimizedList,
  useScrollPosition,
};