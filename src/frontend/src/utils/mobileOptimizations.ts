/**
 * Mobile Performance Optimizations
 * Utilities for optimizing mobile performance and user experience
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// Intersection Observer for lazy loading
export class LazyLoadObserver {
  private observer: IntersectionObserver | null = null;
  private callbacks = new Map<Element, () => void>();

  constructor(options: IntersectionObserverInit = {}) {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const callback = this.callbacks.get(entry.target);
            if (callback) {
              callback();
              this.unobserve(entry.target);
            }
          }
        });
      }, {
        rootMargin: '50px',
        threshold: 0.1,
        ...options,
      });
    }
  }

  observe(element: Element, callback: () => void) {
    if (this.observer) {
      this.callbacks.set(element, callback);
      this.observer.observe(element);
    } else {
      // Fallback for browsers without IntersectionObserver
      callback();
    }
  }

  unobserve(element: Element) {
    if (this.observer) {
      this.observer.unobserve(element);
      this.callbacks.delete(element);
    }
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
      this.callbacks.clear();
    }
  }
}

// Lazy loading hook
export const useLazyLoad = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);
  const observerRef = useRef<LazyLoadObserver | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    observerRef.current = new LazyLoadObserver({
      threshold,
    });

    observerRef.current.observe(element, () => {
      setIsVisible(true);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold]);

  return { ref: elementRef, isVisible };
};

// Touch event optimization
export class TouchEventManager {
  private activeTouch: boolean = false;
  private preventScroll: boolean = false;

  constructor() {
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
  }

  private handleTouchStart(event: TouchEvent) {
    this.activeTouch = true;
  }

  private handleTouchMove(event: TouchEvent) {
    if (this.preventScroll && this.activeTouch) {
      event.preventDefault();
    }
  }

  private handleTouchEnd(event: TouchEvent) {
    this.activeTouch = false;
  }

  enableScrollPrevention() {
    this.preventScroll = true;
  }

  disableScrollPrevention() {
    this.preventScroll = false;
  }

  attachToElement(element: HTMLElement) {
    element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    element.addEventListener('touchend', this.handleTouchEnd, { passive: true });
  }

  detachFromElement(element: HTMLElement) {
    element.removeEventListener('touchstart', this.handleTouchStart);
    element.removeEventListener('touchmove', this.handleTouchMove);
    element.removeEventListener('touchend', this.handleTouchEnd);
  }
}

// Optimized touch event hook
export const useOptimizedTouch = (preventScroll = false) => {
  const elementRef = useRef<HTMLElement>(null);
  const managerRef = useRef<TouchEventManager | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    managerRef.current = new TouchEventManager();
    
    if (preventScroll) {
      managerRef.current.enableScrollPrevention();
    }

    managerRef.current.attachToElement(element);

    return () => {
      if (managerRef.current && element) {
        managerRef.current.detachFromElement(element);
      }
    };
  }, [preventScroll]);

  return elementRef;
};

// Debounced scroll handler
export const useScrollOptimization = (
  callback: (scrollY: number) => void,
  delay = 16 // ~60fps
) => {
  const frameRef = useRef<number | null>(null);
  const lastScrollY = useRef(0);

  const handleScroll = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      if (Math.abs(scrollY - lastScrollY.current) > 1) {
        callback(scrollY);
        lastScrollY.current = scrollY;
      }
    });
  }, [callback]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [handleScroll]);
};

// Image lazy loading with WebP support
export const useImageOptimization = () => {
  const [supportsWebP, setSupportsWebP] = useState<boolean | null>(null);

  useEffect(() => {
    const checkWebPSupport = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    };

    setSupportsWebP(checkWebPSupport());
  }, []);

  const getOptimizedImageSrc = useCallback((
    baseSrc: string,
    width?: number,
    height?: number
  ) => {
    if (supportsWebP === null) return baseSrc;

    // Simple WebP replacement logic
    // In a real app, you'd have a proper image service
    const extension = supportsWebP ? '.webp' : '.jpg';
    let optimizedSrc = baseSrc.replace(/\.(jpg|jpeg|png)$/i, extension);

    // Add size parameters if provided
    if (width || height) {
      const separator = optimizedSrc.includes('?') ? '&' : '?';
      const params = [];
      if (width) params.push(`w=${width}`);
      if (height) params.push(`h=${height}`);
      optimizedSrc += `${separator}${params.join('&')}`;
    }

    return optimizedSrc;
  }, [supportsWebP]);

  return { supportsWebP, getOptimizedImageSrc };
};

// Memory usage optimization
export class MemoryManager {
  private cache = new Map<string, any>();
  private maxCacheSize = 50;
  private accessOrder: string[] = [];

  set(key: string, value: any) {
    if (this.cache.has(key)) {
      this.updateAccessOrder(key);
    } else {
      if (this.cache.size >= this.maxCacheSize) {
        this.evictLeastRecentlyUsed();
      }
      this.accessOrder.push(key);
    }
    
    this.cache.set(key, value);
  }

  get(key: string) {
    if (this.cache.has(key)) {
      this.updateAccessOrder(key);
      return this.cache.get(key);
    }
    return null;
  }

  private updateAccessOrder(key: string) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
      this.accessOrder.push(key);
    }
  }

  private evictLeastRecentlyUsed() {
    const lruKey = this.accessOrder.shift();
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  size() {
    return this.cache.size;
  }
}

// Global memory manager instance
export const memoryManager = new MemoryManager();

// Mobile performance monitoring
export class PerformanceMonitor {
  private metrics: {
    fcp?: number;
    lcp?: number;
    fid?: number;
    cls?: number;
    ttfb?: number;
  } = {};

  constructor() {
    this.observeWebVitals();
  }

  private observeWebVitals() {
    if (typeof window === 'undefined') return;

    // First Contentful Paint
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.fcp = entry.startTime;
          }
        });
      }).observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('Performance Observer not supported for paint');
    }

    // Largest Contentful Paint
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.startTime;
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('Performance Observer not supported for LCP');
    }

    // First Input Delay
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.fid = entry.processingStart - entry.startTime;
        });
      }).observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('Performance Observer not supported for FID');
    }

    // Cumulative Layout Shift
    try {
      new PerformanceObserver((list) => {
        let cls = 0;
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            cls += entry.value;
          }
        });
        this.metrics.cls = cls;
      }).observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('Performance Observer not supported for CLS');
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }

  logMetrics() {
    console.group('📱 Mobile Performance Metrics');
    console.log('First Contentful Paint:', this.metrics.fcp?.toFixed(2), 'ms');
    console.log('Largest Contentful Paint:', this.metrics.lcp?.toFixed(2), 'ms');
    console.log('First Input Delay:', this.metrics.fid?.toFixed(2), 'ms');
    console.log('Cumulative Layout Shift:', this.metrics.cls?.toFixed(4));
    console.groupEnd();
  }
}

// Performance monitoring hook
export const usePerformanceMonitoring = () => {
  const [monitor] = useState(() => new PerformanceMonitor());

  useEffect(() => {
    const timer = setTimeout(() => {
      monitor.logMetrics();
    }, 5000); // Log metrics after 5 seconds

    return () => clearTimeout(timer);
  }, [monitor]);

  return monitor;
};

// Battery status optimization
export const useBatteryOptimization = () => {
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean | null>(null);
  const [lowPowerMode, setLowPowerMode] = useState(false);

  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(battery.level);
        setIsCharging(battery.charging);
        setLowPowerMode(battery.level < 0.2 && !battery.charging);

        const updateBatteryInfo = () => {
          setBatteryLevel(battery.level);
          setIsCharging(battery.charging);
          setLowPowerMode(battery.level < 0.2 && !battery.charging);
        };

        battery.addEventListener('levelchange', updateBatteryInfo);
        battery.addEventListener('chargingchange', updateBatteryInfo);

        return () => {
          battery.removeEventListener('levelchange', updateBatteryInfo);
          battery.removeEventListener('chargingchange', updateBatteryInfo);
        };
      });
    }
  }, []);

  return {
    batteryLevel,
    isCharging,
    lowPowerMode,
    shouldReduceAnimations: lowPowerMode,
    shouldReduceUpdates: lowPowerMode,
  };
};

// Network-aware optimizations
export const useNetworkOptimization = () => {
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateConnectionInfo = () => {
        setConnectionType(connection.effectiveType);
        setIsSlowConnection(
          connection.effectiveType === 'slow-2g' || 
          connection.effectiveType === '2g'
        );
      };

      updateConnectionInfo();
      connection.addEventListener('change', updateConnectionInfo);

      return () => {
        connection.removeEventListener('change', updateConnectionInfo);
      };
    }
  }, []);

  return {
    connectionType,
    isSlowConnection,
    shouldReduceImageQuality: isSlowConnection,
    shouldReducePolling: isSlowConnection,
  };
};

// Comprehensive mobile optimization hook
export const useMobileOptimizations = () => {
  const battery = useBatteryOptimization();
  const network = useNetworkOptimization();
  const performance = usePerformanceMonitoring();

  const optimizationLevel = useMemo(() => {
    if (battery.lowPowerMode || network.isSlowConnection) {
      return 'aggressive';
    } else if (battery.batteryLevel !== null && battery.batteryLevel < 0.5) {
      return 'moderate';
    }
    return 'normal';
  }, [battery.lowPowerMode, battery.batteryLevel, network.isSlowConnection]);

  return {
    ...battery,
    ...network,
    performance,
    optimizationLevel,
    shouldReduceAnimations: battery.shouldReduceAnimations || network.isSlowConnection,
    shouldReduceUpdates: battery.shouldReduceUpdates || network.isSlowConnection,
    shouldLazyLoad: optimizationLevel !== 'normal',
  };
};

// Utility to dynamically import components based on mobile optimization
export const importMobileOptimized = async <T>(
  mobileComponent: () => Promise<{ default: T }>,
  desktopComponent: () => Promise<{ default: T }>,
  forceMobile = false
): Promise<{ default: T }> => {
  const isMobile = forceMobile || window.innerWidth < 768;
  
  if (isMobile) {
    return mobileComponent();
  } else {
    return desktopComponent();
  }
};

import { useMemo } from 'react';