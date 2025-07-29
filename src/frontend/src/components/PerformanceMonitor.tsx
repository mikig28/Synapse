import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  BarChart3, 
  Clock, 
  Cpu, 
  HardDrive, 
  Monitor, 
  TrendingDown, 
  TrendingUp,
  Zap,
  X,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { typography, shadows, borderRadius } from '@/utils/designSystem';

interface PerformanceMetrics {
  // Core Web Vitals
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  
  // Memory
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
  
  // Rendering
  frameRate: number;
  renderTime: number;
  componentCount: number;
  
  // Network
  connectionType?: string;
  downlink?: number;
  effectiveType?: string;
  
  // Bundle
  bundleSize?: number;
  chunkCount?: number;
  loadTime?: number;
  
  // Custom metrics
  agentRenderTime?: number;
  virtualizedItems?: number;
  cacheHitRate?: number;
  
  timestamp: number;
}

interface PerformanceMonitorProps {
  isVisible?: boolean;
  onClose?: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  minimized?: boolean;
  onToggleMinimize?: () => void;
}

// Custom hook for Web Vitals
const useWebVitals = () => {
  const [vitals, setVitals] = useState<Partial<PerformanceMetrics>>({});

  useEffect(() => {
    // Import web-vitals dynamically to avoid affecting initial bundle
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS((metric) => setVitals(prev => ({ ...prev, cls: metric.value })));
      getFID((metric) => setVitals(prev => ({ ...prev, fid: metric.value })));
      getFCP((metric) => setVitals(prev => ({ ...prev, fcp: metric.value })));
      getLCP((metric) => setVitals(prev => ({ ...prev, lcp: metric.value })));
      getTTFB((metric) => setVitals(prev => ({ ...prev, ttfb: metric.value })));
    }).catch(() => {
      // Fallback to manual Performance API if web-vitals fails
      setVitals(prev => ({
        ...prev,
        fcp: performance.getEntriesByType('paint')
          .find(entry => entry.name === 'first-contentful-paint')?.startTime,
        lcp: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
      }));
    });
  }, []);

  return vitals;
};

// Custom hook for memory monitoring
const useMemoryMonitoring = () => {
  const [memoryInfo, setMemoryInfo] = useState<Partial<PerformanceMetrics>>({});

  useEffect(() => {
    const updateMemoryInfo = () => {
      // @ts-ignore - performance.memory is not standard but widely supported
      const memory = (performance as any).memory;
      if (memory) {
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 1000);
    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
};

// Custom hook for frame rate monitoring
const useFrameRateMonitoring = () => {
  const [frameRate, setFrameRate] = useState(60);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    let animationId: number;

    const measureFrameRate = () => {
      const now = performance.now();
      frameRef.current++;

      if (now - lastTimeRef.current >= 1000) {
        setFrameRate(Math.round((frameRef.current * 1000) / (now - lastTimeRef.current)));
        frameRef.current = 0;
        lastTimeRef.current = now;
      }

      animationId = requestAnimationFrame(measureFrameRate);
    };

    animationId = requestAnimationFrame(measureFrameRate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return frameRate;
};

// Custom hook for network information
const useNetworkInfo = () => {
  const [networkInfo, setNetworkInfo] = useState<Partial<PerformanceMetrics>>({});

  useEffect(() => {
    // @ts-ignore - navigator.connection is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      const updateNetworkInfo = () => {
        setNetworkInfo({
          connectionType: connection.type,
          downlink: connection.downlink,
          effectiveType: connection.effectiveType,
        });
      };

      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);
      return () => connection.removeEventListener('change', updateNetworkInfo);
    }
  }, []);

  return networkInfo;
};

// Performance score calculator
const calculatePerformanceScore = (metrics: PerformanceMetrics): number => {
  let score = 100;
  
  // Core Web Vitals scoring
  if (metrics.lcp && metrics.lcp > 2500) score -= 20;
  if (metrics.fid && metrics.fid > 100) score -= 15;
  if (metrics.cls && metrics.cls > 0.1) score -= 15;
  if (metrics.fcp && metrics.fcp > 1800) score -= 10;
  
  // Frame rate scoring
  if (metrics.frameRate < 30) score -= 20;
  else if (metrics.frameRate < 45) score -= 10;
  
  // Memory usage scoring
  if (metrics.usedJSHeapSize && metrics.jsHeapSizeLimit) {
    const memoryUsage = metrics.usedJSHeapSize / metrics.jsHeapSizeLimit;
    if (memoryUsage > 0.8) score -= 15;
    else if (memoryUsage > 0.6) score -= 10;
  }
  
  return Math.max(0, Math.min(100, score));
};

// Get performance status and color
const getPerformanceStatus = (score: number) => {
  if (score >= 90) return { status: 'Excellent', color: 'text-green-500', bgColor: 'bg-green-50' };
  if (score >= 75) return { status: 'Good', color: 'text-blue-500', bgColor: 'bg-blue-50' };
  if (score >= 50) return { status: 'Needs Improvement', color: 'text-yellow-500', bgColor: 'bg-yellow-50' };
  return { status: 'Poor', color: 'text-red-500', bgColor: 'bg-red-50' };
};

// Format bytes helper
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  isVisible = true,
  onClose,
  position = 'bottom-right',
  minimized = false,
  onToggleMinimize,
}) => {
  const webVitals = useWebVitals();
  const memoryInfo = useMemoryMonitoring();
  const frameRate = useFrameRateMonitoring();
  const networkInfo = useNetworkInfo();
  const [renderTime, setRenderTime] = useState(0);
  const [componentCount, setComponentCount] = useState(0);

  // Combine all metrics
  const metrics: PerformanceMetrics = {
    ...webVitals,
    ...memoryInfo,
    ...networkInfo,
    frameRate,
    renderTime,
    componentCount,
    timestamp: Date.now(),
  };

  const performanceScore = calculatePerformanceScore(metrics);
  const { status, color, bgColor } = getPerformanceStatus(performanceScore);

  // Measure component render time
  useEffect(() => {
    const startTime = performance.now();
    setRenderTime(performance.now() - startTime);
    
    // Count React components (rough estimation)
    const reactComponents = document.querySelectorAll('[data-react-component]').length;
    setComponentCount(reactComponents);
  });

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        className={`fixed ${positionClasses[position]} z-50`}
      >
        <Card 
          className="w-80 shadow-2xl border-0 backdrop-blur-sm"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: borderRadius.xl,
            boxShadow: shadows.xl,
          }}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <CardTitle style={typography.cardTitle} className="text-sm">
                  Performance Monitor
                </CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleMinimize}
                  className="h-6 w-6 p-0"
                >
                  {minimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                </Button>
                {onClose && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Performance Score */}
            <div className="flex items-center justify-between mt-2">
              <Badge 
                className={`${bgColor} ${color} border-0 px-3 py-1`}
                style={typography.caption}
              >
                {status} ({performanceScore}/100)
              </Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="w-3 h-3" />
                {frameRate} FPS
              </div>
            </div>
          </CardHeader>

          <AnimatePresence>
            {!minimized && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent className="pt-0 pb-4 space-y-4">
                  {/* Core Web Vitals */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Core Web Vitals
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {metrics.lcp && (
                        <div className="flex justify-between">
                          <span>LCP:</span>
                          <span className={metrics.lcp > 2500 ? 'text-red-500' : 'text-green-500'}>
                            {(metrics.lcp / 1000).toFixed(1)}s
                          </span>
                        </div>
                      )}
                      {metrics.fid && (
                        <div className="flex justify-between">
                          <span>FID:</span>
                          <span className={metrics.fid > 100 ? 'text-red-500' : 'text-green-500'}>
                            {metrics.fid.toFixed(0)}ms
                          </span>
                        </div>
                      )}
                      {metrics.cls && (
                        <div className="flex justify-between">
                          <span>CLS:</span>
                          <span className={metrics.cls > 0.1 ? 'text-red-500' : 'text-green-500'}>
                            {metrics.cls.toFixed(3)}
                          </span>
                        </div>
                      )}
                      {metrics.fcp && (
                        <div className="flex justify-between">
                          <span>FCP:</span>
                          <span className={metrics.fcp > 1800 ? 'text-yellow-500' : 'text-green-500'}>
                            {(metrics.fcp / 1000).toFixed(1)}s
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Memory Usage */}
                  {metrics.usedJSHeapSize && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        Memory
                      </h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Used:</span>
                          <span>{formatBytes(metrics.usedJSHeapSize)}</span>
                        </div>
                        {metrics.totalJSHeapSize && (
                          <div className="flex justify-between">
                            <span>Total:</span>
                            <span>{formatBytes(metrics.totalJSHeapSize)}</span>
                          </div>
                        )}
                        {metrics.jsHeapSizeLimit && (
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div
                              className="bg-blue-500 h-1 rounded-full"
                              style={{
                                width: `${(metrics.usedJSHeapSize / metrics.jsHeapSizeLimit) * 100}%`
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Network Info */}
                  {metrics.effectiveType && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Monitor className="w-3 h-3" />
                        Network
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span>Type:</span>
                          <span>{metrics.effectiveType}</span>
                        </div>
                        {metrics.downlink && (
                          <div className="flex justify-between">
                            <span>Speed:</span>
                            <span>{metrics.downlink} Mbps</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Render Performance */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Cpu className="w-3 h-3" />
                      Rendering
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span>Frame Rate:</span>
                        <span className={frameRate < 30 ? 'text-red-500' : frameRate < 45 ? 'text-yellow-500' : 'text-green-500'}>
                          {frameRate} FPS
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Components:</span>
                        <span>{componentCount}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

// Hook for using performance monitoring in components
export const usePerformanceMonitoring = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  const startMonitoring = useCallback(() => {
    setIsEnabled(true);
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsEnabled(false);
  }, []);

  const recordMetric = useCallback((name: string, value: number) => {
    if (isEnabled) {
      performance.mark(`${name}-${value}`);
    }
  }, [isEnabled]);

  return {
    isEnabled,
    metrics,
    startMonitoring,
    stopMonitoring,
    recordMetric,
  };
};

export default PerformanceMonitor;