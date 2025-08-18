import { useState, useEffect, useCallback, useRef } from 'react';

// Device detection hook
export const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isIOS: false,
    isAndroid: false,
    isPWA: false,
    hasTouch: false,
    screenSize: 'unknown' as 'small' | 'medium' | 'large' | 'unknown',
  });

  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Check for mobile devices
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
        width <= 768;
      
      const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent) ||
        (width > 768 && width <= 1024);
      
      const isDesktop = !isMobile && !isTablet;
      
      // Check OS
      const isIOS = /iphone|ipad|ipod/i.test(userAgent);
      const isAndroid = /android/i.test(userAgent);
      
      // Check if running as PWA
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      
      // Check touch capability
      const hasTouch = 'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0;
      
      // Determine screen size
      let screenSize: 'small' | 'medium' | 'large' = 'medium';
      if (width <= 320) screenSize = 'small';
      else if (width <= 768) screenSize = 'medium';
      else screenSize = 'large';
      
      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        isIOS,
        isAndroid,
        isPWA,
        hasTouch,
        screenSize,
      });
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);
  
  return deviceInfo;
};

// Haptic feedback hook
export const useHaptics = () => {
  const isSupported = 'vibrate' in navigator;
  
  const vibrate = useCallback((pattern: number | number[] = 10) => {
    if (!isSupported) return false;
    
    try {
      return navigator.vibrate(pattern);
    } catch (error) {
      console.error('Haptic feedback error:', error);
      return false;
    }
  }, [isSupported]);
  
  const light = useCallback(() => vibrate(10), [vibrate]);
  const medium = useCallback(() => vibrate(20), [vibrate]);
  const heavy = useCallback(() => vibrate(30), [vibrate]);
  const success = useCallback(() => vibrate([10, 20, 10]), [vibrate]);
  const warning = useCallback(() => vibrate([20, 10, 20]), [vibrate]);
  const error = useCallback(() => vibrate([30, 10, 30, 10, 30]), [vibrate]);
  
  return {
    isSupported,
    vibrate,
    light,
    medium,
    heavy,
    success,
    warning,
    error,
  };
};

// Pull to refresh hook
export const usePullToRefresh = (onRefresh: () => Promise<void>) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const element = useRef<HTMLElement | null>(null);
  
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (element.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!element.current || element.current.scrollTop > 0) return;
    
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);
    
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, 150));
    }
  }, []);
  
  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 80 && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(60);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);
  
  const attach = useCallback((el: HTMLElement) => {
    element.current = el;
    
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
  
  return {
    isRefreshing,
    pullDistance,
    attach,
  };
};

// Swipe gesture hook
export const useSwipeGesture = (options: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}) => {
  const { threshold = 50 } = options;
  const [swiping, setSwiping] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    setSwiping(true);
  }, []);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startX.current;
    const diffY = currentY - startY.current;
    
    if (Math.abs(diffX) > Math.abs(diffY)) {
      setDirection(diffX > 0 ? 'right' : 'left');
    } else {
      setDirection(diffY > 0 ? 'down' : 'up');
    }
  }, [swiping]);
  
  const handleTouchEnd = useCallback(() => {
    if (!swiping || !direction) {
      setSwiping(false);
      setDirection(null);
      return;
    }
    
    const endX = startX.current;
    const endY = startY.current;
    
    if (direction === 'left' && options.onSwipeLeft) {
      options.onSwipeLeft();
    } else if (direction === 'right' && options.onSwipeRight) {
      options.onSwipeRight();
    } else if (direction === 'up' && options.onSwipeUp) {
      options.onSwipeUp();
    } else if (direction === 'down' && options.onSwipeDown) {
      options.onSwipeDown();
    }
    
    setSwiping(false);
    setDirection(null);
  }, [swiping, direction, options]);
  
  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    swiping,
    direction,
  };
};

// Network status hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [effectiveType, setEffectiveType] = useState<string>('unknown');
  const [saveData, setSaveData] = useState(false);
  
  useEffect(() => {
    const updateNetworkStatus = () => {
      setIsOnline(navigator.onLine);
      
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      if (connection) {
        setConnectionType(connection.type || 'unknown');
        setEffectiveType(connection.effectiveType || 'unknown');
        setSaveData(connection.saveData || false);
      }
    };
    
    updateNetworkStatus();
    
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', updateNetworkStatus);
    }
    
    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      
      if ((navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);
  
  return {
    isOnline,
    connectionType,
    effectiveType,
    saveData,
    isSlowConnection: effectiveType === '2g' || effectiveType === 'slow-2g',
  };
};

// Performance monitoring hook
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    memory: 0,
    loadTime: 0,
  });
  
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number;
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        const memory = (performance as any).memory
          ? Math.round((performance as any).memory.usedJSHeapSize / 1048576)
          : 0;
        
        const loadTime = performance.timing
          ? performance.timing.loadEventEnd - performance.timing.navigationStart
          : 0;
        
        setMetrics({ fps, memory, loadTime });
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      rafId = requestAnimationFrame(measureFPS);
    };
    
    measureFPS();
    
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);
  
  return metrics;
};

// Local storage with fallback hook
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return initialValue;
    }
  });
  
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  }, [key, storedValue]);
  
  return [storedValue, setValue] as const;
};

// Intersection observer hook for lazy loading
export const useLazyLoad = (options?: IntersectionObserverInit) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    if (!elementRef.current) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);
    
    observer.observe(elementRef.current);
    
    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [options]);
  
  return { ref: elementRef, isIntersecting };
};