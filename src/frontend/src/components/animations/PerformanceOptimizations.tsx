/**
 * Performance Optimization Utilities
 * Advanced performance monitoring and optimization for animations
 * Includes device detection, memory management, and adaptive quality
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAnimationContext } from '@/contexts/AnimationContext';

// =============================================================================
// PERFORMANCE MONITOR COMPONENT
// =============================================================================

interface PerformanceMonitorProps {
  showDetails?: boolean;
  className?: string;
  onPerformanceChange?: (metrics: PerformanceMetrics) => void;
}

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  gpuMemory?: number;
  batteryLevel?: number;
  isLowPowerMode?: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionType?: string;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  showDetails = false,
  className,
  onPerformanceChange,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    deviceType: 'desktop',
  });
  
  const { updatePreferences } = useAnimationContext();
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const animationFrameRef = useRef<number>();

  // Device detection
  const detectDevice = useCallback((): 'mobile' | 'tablet' | 'desktop' => {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?=.*Mobile)/i.test(userAgent) && window.innerWidth >= 768;
    
    if (isTablet) return 'tablet';
    if (isMobile) return 'mobile';
    return 'desktop';
  }, []);

  // Battery API support
  const getBatteryInfo = useCallback(async () => {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return {
          level: battery.level * 100,
          charging: battery.charging,
        };
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    }
    return null;
  }, []);

  // Connection API support
  const getConnectionInfo = useCallback(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection ? {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    } : null;
  }, []);

  // Memory usage monitoring
  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize / 1024 / 1024, // MB
        total: memory.totalJSHeapSize / 1024 / 1024, // MB
        limit: memory.jsHeapSizeLimit / 1024 / 1024, // MB
      };
    }
    return { used: 0, total: 0, limit: 0 };
  }, []);

  // FPS monitoring
  const measureFPS = useCallback((currentTime: number) => {
    frameCountRef.current++;
    
    if (currentTime - lastTimeRef.current >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / (currentTime - lastTimeRef.current));
      const frameTime = 1000 / fps;
      
      frameCountRef.current = 0;
      lastTimeRef.current = currentTime;
      
      return { fps, frameTime };
    }
    
    return null;
  }, []);

  // Main monitoring loop
  const monitorPerformance = useCallback((currentTime: number) => {
    const fpsData = measureFPS(currentTime);
    
    if (fpsData) {
      const memoryInfo = getMemoryUsage();
      
      const newMetrics: PerformanceMetrics = {
        fps: fpsData.fps,
        frameTime: fpsData.frameTime,
        memoryUsage: memoryInfo.used,
        deviceType: detectDevice(),
      };
      
      setMetrics(newMetrics);
      onPerformanceChange?.(newMetrics);
      
      // Auto-adjust animation quality based on performance
      if (fpsData.fps < 30) {
        updatePreferences({
          animationIntensity: 'minimal',
          enableAnimations: fpsData.fps > 15,
        });
      } else if (fpsData.fps > 55) {
        updatePreferences({
          animationIntensity: 'premium',
        });
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(monitorPerformance);
  }, [measureFPS, getMemoryUsage, detectDevice, onPerformanceChange, updatePreferences]);

  // Initialize monitoring
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(monitorPerformance);
    
    // Get additional device info
    getBatteryInfo().then(battery => {
      if (battery) {
        setMetrics(prev => ({
          ...prev,
          batteryLevel: battery.level,
          isLowPowerMode: battery.level < 20 && !battery.charging,
        }));
      }
    });
    
    const connectionInfo = getConnectionInfo();
    if (connectionInfo) {
      setMetrics(prev => ({
        ...prev,
        connectionType: connectionInfo.effectiveType,
      }));
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [monitorPerformance, getBatteryInfo, getConnectionInfo]);

  if (!showDetails) return null;

  const getPerformanceColor = (fps: number) => {
    if (fps >= 55) return 'text-green-500';
    if (fps >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getMemoryColor = (usage: number) => {
    if (usage < 50) return 'text-green-500';
    if (usage < 100) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <motion.div
      className={`fixed bottom-4 left-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono space-y-1 ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <div className="flex items-center gap-2">
        <span>FPS:</span>
        <span className={getPerformanceColor(metrics.fps)}>
          {metrics.fps}
        </span>
        <span className="text-gray-400">
          ({metrics.frameTime.toFixed(1)}ms)
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <span>Memory:</span>
        <span className={getMemoryColor(metrics.memoryUsage)}>
          {metrics.memoryUsage.toFixed(1)}MB
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <span>Device:</span>
        <span className="text-blue-400">{metrics.deviceType}</span>
      </div>
      
      {metrics.batteryLevel && (
        <div className="flex items-center gap-2">
          <span>Battery:</span>
          <span className={metrics.batteryLevel < 20 ? 'text-red-400' : 'text-green-400'}>
            {metrics.batteryLevel.toFixed(0)}%
          </span>
          {metrics.isLowPowerMode && (
            <span className="text-yellow-400">⚡</span>
          )}
        </div>
      )}
      
      {metrics.connectionType && (
        <div className="flex items-center gap-2">
          <span>Network:</span>
          <span className="text-cyan-400">{metrics.connectionType}</span>
        </div>
      )}
    </motion.div>
  );
};

// =============================================================================
// ADAPTIVE QUALITY HOOK
// =============================================================================

interface AdaptiveQualityOptions {
  fpsThreshold?: number;
  memoryThreshold?: number;
  batteryThreshold?: number;
  connectionThreshold?: string;
  enableAdaptation?: boolean;
}

export const useAdaptiveQuality = (options: AdaptiveQualityOptions = {}) => {
  const {
    fpsThreshold = 30,
    memoryThreshold = 100,
    batteryThreshold = 20,
    connectionThreshold = '3g',
    enableAdaptation = true,
  } = options;

  const { preferences, updatePreferences, performanceMetrics } = useAnimationContext();
  const [qualityLevel, setQualityLevel] = useState<'high' | 'medium' | 'low'>('high');

  useEffect(() => {
    if (!enableAdaptation) return;

    const { fps, memoryUsage } = performanceMetrics;
    let newQuality: 'high' | 'medium' | 'low' = 'high';

    // Determine quality level based on multiple factors
    if (fps < fpsThreshold * 0.7 || memoryUsage > memoryThreshold * 1.5) {
      newQuality = 'low';
    } else if (fps < fpsThreshold || memoryUsage > memoryThreshold) {
      newQuality = 'medium';
    }

    if (newQuality !== qualityLevel) {
      setQualityLevel(newQuality);
      
      const qualitySettings = {
        high: {
          animationIntensity: 'premium' as const,
          enableAnimations: true,
          enableHaptics: true,
        },
        medium: {
          animationIntensity: 'balanced' as const,
          enableAnimations: true,
          enableHaptics: false,
        },
        low: {
          animationIntensity: 'minimal' as const,
          enableAnimations: false,
          enableHaptics: false,
        },
      };
      
      updatePreferences(qualitySettings[newQuality]);
    }
  }, [
    performanceMetrics,
    qualityLevel,
    fpsThreshold,
    memoryThreshold,
    enableAdaptation,
    updatePreferences,
  ]);

  return {
    qualityLevel,
    isAdaptationEnabled: enableAdaptation,
    performanceMetrics,
  };
};

// =============================================================================
// MEMORY MANAGEMENT UTILITIES
// =============================================================================

export class AnimationMemoryManager {
  private static instance: AnimationMemoryManager;
  private animationCache = new Map<string, any>();
  private memoryThreshold = 100; // MB
  private maxCacheSize = 50;

  static getInstance(): AnimationMemoryManager {
    if (!AnimationMemoryManager.instance) {
      AnimationMemoryManager.instance = new AnimationMemoryManager();
    }
    return AnimationMemoryManager.instance;
  }

  // Cache animation variants to avoid recreation
  cacheAnimation(key: string, animation: any): void {
    if (this.animationCache.size >= this.maxCacheSize) {
      // Remove oldest entries
      const firstKey = this.animationCache.keys().next().value;
      this.animationCache.delete(firstKey);
    }
    
    this.animationCache.set(key, animation);
  }

  getCachedAnimation(key: string): any {
    return this.animationCache.get(key);
  }

  // Clean up animations when memory usage is high
  cleanupAnimations(): void {
    if (this.getMemoryUsage() > this.memoryThreshold) {
      this.animationCache.clear();
      
      // Force garbage collection if available
      if ('gc' in window && typeof (window as any).gc === 'function') {
        (window as any).gc();
      }
    }
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  }

  // Preload critical animations
  preloadCriticalAnimations(): void {
    const criticalAnimations = [
      'cardHover',
      'buttonPress',
      'modalOpen',
      'pageTransition',
    ];

    criticalAnimations.forEach(key => {
      if (!this.animationCache.has(key)) {
        // Define and cache critical animation variants
        this.cacheAnimation(key, this.createOptimizedVariant(key));
      }
    });
  }

  private createOptimizedVariant(type: string): any {
    const variants = {
      cardHover: {
        hover: { scale: 1.02, y: -2 },
        tap: { scale: 0.98 },
      },
      buttonPress: {
        tap: { scale: 0.95 },
      },
      modalOpen: {
        hidden: { opacity: 0, scale: 0.8 },
        visible: { opacity: 1, scale: 1 },
      },
      pageTransition: {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 },
      },
    };

    return variants[type as keyof typeof variants] || {};
  }
}

// =============================================================================
// REDUCED MOTION HANDLER
// =============================================================================

export const useReducedMotionHandler = () => {
  const { updatePreferences } = useAnimationContext();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      updatePreferences({
        respectReducedMotion: e.matches,
        enableAnimations: !e.matches,
        animationIntensity: e.matches ? 'minimal' : 'balanced',
      });
    };

    // Set initial state
    handleChange({ matches: mediaQuery.matches } as MediaQueryListEvent);
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [updatePreferences]);
};

// =============================================================================
// VIEWPORT OPTIMIZATION HOOK
// =============================================================================

export const useViewportOptimization = () => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    if (!elementRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(elementRef.current);
    
    return () => observer.disconnect();
  }, []);

  return {
    elementRef,
    isIntersecting,
    viewport,
    isMobile: viewport.width < 768,
    isTablet: viewport.width >= 768 && viewport.width < 1024,
    isDesktop: viewport.width >= 1024,
  };
};