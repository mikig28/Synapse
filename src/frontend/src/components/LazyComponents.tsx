import React, { Suspense, lazy, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { AgentCardSkeleton } from './animations/LoadingAnimations';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Lazy-loaded components for code splitting
export const LazyMetricsDashboard = lazy(() => 
  import('./metrics/MetricsDashboard').then(module => ({ default: module.MetricsDashboard }))
);

export const LazyAgentCreationWizard = lazy(() => 
  import('./wizard/AgentCreationWizard').then(module => ({ default: module.AgentCreationWizard }))
);

export const LazyMobileResponsiveAgentWizard = lazy(() => 
  import('./wizard/MobileResponsiveAgentWizard').then(module => ({ default: module.MobileResponsiveAgentWizard }))
);

export const LazyAguiLiveDashboard = lazy(() => 
  import('./AguiLiveDashboard').then(module => ({ default: module.AguiLiveDashboard }))
);

export const LazyCrewExecutionDashboard = lazy(() => 
  import('./CrewExecutionDashboard').then(module => ({ default: module.CrewExecutionDashboard }))
);

export const LazyAgentActivityDashboard = lazy(() => 
  import('./AgentActivityDashboard')
);

export const LazyAgentStepTimeline = lazy(() => 
  import('./AgentStepTimeline')
);

export const LazyDebugPanel = lazy(() => 
  import('./DebugPanel')
);

// Mobile Components
export const LazyMobileAgentDetails = lazy(() => 
  import('./mobile/MobileAgentDetails').then(module => ({ default: module.MobileAgentDetails }))
);

export const LazyMobileMetricsDashboard = lazy(() => 
  import('./mobile/MobileMetricsDashboard').then(module => ({ default: module.MobileMetricsDashboard }))
);

export const LazyMobileWizard = lazy(() => 
  import('./mobile/MobileWizard').then(module => ({ default: module.MobileWizard }))
);

// Accessibility Components
export const LazyAccessibleForm = lazy(() => 
  import('./accessibility/AccessibleForm').then(module => ({ default: module.AccessibleForm }))
);

export const LazyKeyboardNavigation = lazy(() => 
  import('./accessibility/KeyboardNavigation').then(module => ({ default: module.KeyboardNavigation }))
);

export const LazyScreenReaderSupport = lazy(() => 
  import('./accessibility/ScreenReaderSupport').then(module => ({ default: module.ScreenReaderSupport }))
);

// 3D Components have been removed to eliminate production errors

// Charts and Analytics
export const LazyRecharts = lazy(() => 
  import('recharts').then(module => ({
    default: {
      LineChart: module.LineChart,
      BarChart: module.BarChart,
      PieChart: module.PieChart,
      Area: module.Area,
      Bar: module.Bar,
      Line: module.Line,
      XAxis: module.XAxis,
      YAxis: module.YAxis,
      CartesianGrid: module.CartesianGrid,
      Tooltip: module.Tooltip,
      Legend: module.Legend,
      ResponsiveContainer: module.ResponsiveContainer,
    }
  }))
);

// Loading fallback components with different styles
interface LoadingFallbackProps {
  type?: 'spinner' | 'skeleton' | 'shimmer' | 'cards';
  message?: string;
  className?: string;
  height?: string | number;
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  type = 'spinner',
  message = 'Loading...',
  className = '',
  height = 200
}) => {
  const fallbackComponents = {
    spinner: (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
        </div>
      </div>
    ),
    
    skeleton: (
      <div className={`p-4 ${className}`} style={{ minHeight: height }}>
        <div className="space-y-4">
          <div className="h-6 bg-muted/50 rounded animate-pulse" />
          <div className="h-4 bg-muted/30 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-muted/30 rounded animate-pulse w-1/2" />
        </div>
      </div>
    ),
    
    shimmer: (
      <div className={`relative overflow-hidden ${className}`} style={{ height }}>
        <div className="absolute inset-0 bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    ),
    
    cards: (
      <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 ${className}`}>
        {Array.from({ length: 3 }).map((_, index) => (
          <AgentCardSkeleton key={index} animation="wave" />
        ))}
      </div>
    )
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {fallbackComponents[type]}
    </motion.div>
  );
};

// Network status hook for adaptive loading
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // @ts-ignore - navigator.connection is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      setConnectionType(connection.effectiveType || 'unknown');
      
      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || 'unknown');
      };
      
      connection.addEventListener('change', handleConnectionChange);
      return () => {
        connection.removeEventListener('change', handleConnectionChange);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionType };
};

// Enhanced error boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode; onRetry?: () => void; fallback?: React.ComponentType<any> },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error to monitoring service in production
    if (import.meta.env.PROD) {
      console.error('LazyComponent Error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }));
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 text-center"
        >
          <Alert className="max-w-md mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="mt-2">
              <div className="space-y-3">
                <p className="font-medium">Component failed to load</p>
                <p className="text-sm text-muted-foreground">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={this.handleRetry}
                    disabled={this.state.retryCount >= 3}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry ({this.state.retryCount}/3)
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    Reload Page
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      );
    }

    return this.props.children;
  }
}

// Adaptive loading component that considers network conditions
interface AdaptiveLoadingProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<LoadingFallbackProps>;
  fallbackProps?: LoadingFallbackProps;
  priority?: 'high' | 'medium' | 'low';
  timeout?: number;
}

const AdaptiveLoading: React.FC<AdaptiveLoadingProps> = ({
  children,
  fallback: FallbackComponent = LoadingFallback,
  fallbackProps = {},
  priority = 'medium',
  timeout = 10000,
}) => {
  const { isOnline, connectionType } = useNetworkStatus();
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    if (!isOnline) return;

    const timer = setTimeout(() => {
      setIsTimedOut(true);
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout, isOnline]);

  // Adjust loading behavior based on connection
  const adaptiveProps = useMemo(() => {
    if (!isOnline) {
      return {
        ...fallbackProps,
        type: 'spinner' as const,
        message: 'Waiting for connection...',
      };
    }

    if (connectionType === 'slow-2g' || connectionType === '2g') {
      return {
        ...fallbackProps,
        type: 'skeleton' as const,
        message: 'Loading (slow connection detected)...',
      };
    }

    if (isTimedOut) {
      return {
        ...fallbackProps,
        type: 'spinner' as const,
        message: 'Still loading...',
      };
    }

    return fallbackProps;
  }, [isOnline, connectionType, isTimedOut, fallbackProps]);

  if (!isOnline) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center p-8"
      >
        <div className="text-center space-y-3">
          <WifiOff className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            You're offline. Some features may be limited.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <Suspense fallback={<FallbackComponent {...adaptiveProps} />}>
      {children}
    </Suspense>
  );
};

// Enhanced lazy wrapper with performance monitoring
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<LoadingFallbackProps>;
  fallbackProps?: LoadingFallbackProps;
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  priority?: 'high' | 'medium' | 'low';
  timeout?: number;
  name?: string;
  preload?: boolean;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback,
  fallbackProps,
  errorFallback,
  priority = 'medium',
  timeout = 10000,
  name = 'LazyComponent',
  preload = false,
}) => {
  const [loadStartTime] = useState(() => performance.now());
  
  useEffect(() => {
    if (import.meta.env.DEV && name) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name.includes(name)) {
            console.log(`[Lazy Load] ${name}: ${entry.duration.toFixed(2)}ms`);
          }
        });
      });
      
      observer.observe({ entryTypes: ['measure', 'navigation'] });
      performance.mark(`${name}-lazy-start`);
      
      return () => {
        performance.mark(`${name}-lazy-end`);
        performance.measure(`${name}-lazy-load`, `${name}-lazy-start`, `${name}-lazy-end`);
        observer.disconnect();
      };
    }
  }, [name]);

  // Component loaded callback
  const handleComponentLoad = useCallback(() => {
    if (import.meta.env.DEV) {
      const loadTime = performance.now() - loadStartTime;
      console.log(`[Lazy Load] ${name} loaded in ${loadTime.toFixed(2)}ms`);
    }
  }, [loadStartTime, name]);

  useEffect(() => {
    handleComponentLoad();
  }, [handleComponentLoad]);

  return (
    <LazyErrorBoundary fallback={errorFallback}>
      <AdaptiveLoading
        fallback={fallback}
        fallbackProps={{
          ...fallbackProps,
          message: fallbackProps?.message || `Loading ${name}...`,
        }}
        priority={priority}
        timeout={timeout}
      >
        {children}
      </AdaptiveLoading>
    </LazyErrorBoundary>
  );
};

// Component registry for intelligent preloading
class ComponentRegistry {
  private static instance: ComponentRegistry;
  private loadPromises = new Map<string, Promise<any>>();
  private loadedComponents = new Set<string>();
  private loadingStats = new Map<string, { attempts: number; failures: number; avgLoadTime: number }>();

  static getInstance(): ComponentRegistry {
    if (!ComponentRegistry.instance) {
      ComponentRegistry.instance = new ComponentRegistry();
    }
    return ComponentRegistry.instance;
  }

  async preload(componentName: string, importFn: () => Promise<any>): Promise<void> {
    if (this.loadedComponents.has(componentName)) {
      return; // Already loaded
    }

    if (this.loadPromises.has(componentName)) {
      return this.loadPromises.get(componentName); // Already loading
    }

    const startTime = performance.now();
    const promise = importFn()
      .then((module) => {
        const loadTime = performance.now() - startTime;
        this.markAsLoaded(componentName, loadTime, true);
        return module;
      })
      .catch((error) => {
        const loadTime = performance.now() - startTime;
        this.markAsLoaded(componentName, loadTime, false);
        throw error;
      });

    this.loadPromises.set(componentName, promise);
    return promise;
  }

  private markAsLoaded(componentName: string, loadTime: number, success: boolean) {
    if (success) {
      this.loadedComponents.add(componentName);
    }

    const stats = this.loadingStats.get(componentName) || { attempts: 0, failures: 0, avgLoadTime: 0 };
    stats.attempts++;
    if (!success) stats.failures++;
    stats.avgLoadTime = (stats.avgLoadTime * (stats.attempts - 1) + loadTime) / stats.attempts;
    
    this.loadingStats.set(componentName, stats);

    if (import.meta.env.DEV) {
      console.log(`[ComponentRegistry] ${componentName}: ${loadTime.toFixed(2)}ms, Success: ${success}`);
    }
  }

  getStats(componentName: string) {
    return this.loadingStats.get(componentName);
  }

  isLoaded(componentName: string): boolean {
    return this.loadedComponents.has(componentName);
  }

  getLoadingPromise(componentName: string): Promise<any> | undefined {
    return this.loadPromises.get(componentName);
  }
}

// Smart preloader based on user behavior and priorities
export const preloadCriticalComponents = async () => {
  const registry = ComponentRegistry.getInstance();

  // High priority components - preload immediately
  const highPriorityComponents = [
    { name: 'MetricsDashboard', loader: () => import('./metrics/MetricsDashboard') },
    { name: 'AgentCreationWizard', loader: () => import('./wizard/AgentCreationWizard') },
    { name: 'VirtualizedAgentGrid', loader: () => import('./VirtualizedAgentGrid') },
  ];

  // Medium priority - preload after idle
  const mediumPriorityComponents = [
    { name: 'AguiLiveDashboard', loader: () => import('./AguiLiveDashboard') },
    { name: 'CrewExecutionDashboard', loader: () => import('./CrewExecutionDashboard') },
    { name: 'EnhancedAgentCard', loader: () => import('./EnhancedAgentCard') },
  ];

  // Low priority - preload only when needed
  const lowPriorityComponents = [
    { name: 'DebugPanel', loader: () => import('./DebugPanel') },
    { name: 'AgentActivityDashboard', loader: () => import('./AgentActivityDashboard') },
  ];

  try {
    // Load high priority immediately
    await Promise.allSettled(
      highPriorityComponents.map(comp => registry.preload(comp.name, comp.loader))
    );

    // Load medium priority when browser is idle
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        mediumPriorityComponents.forEach(comp => 
          registry.preload(comp.name, comp.loader).catch(() => {})
        );
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        mediumPriorityComponents.forEach(comp => 
          registry.preload(comp.name, comp.loader).catch(() => {})
        );
      }, 2000);
    }

    return { success: true, highPriorityLoaded: true };
  } catch (error) {
    console.warn('Failed to preload some critical components:', error);
    return { success: false, error };
  }
};

// Intersection-based lazy loading for components
export const useIntersectionLazyLoad = (
  options: IntersectionObserverInit = {},
  preloadDistance: string = '200px'
) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const targetRef = useCallback((node: HTMLElement | null) => {
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect(); // Load once and stop observing
        }
      },
      {
        threshold: 0,
        rootMargin: preloadDistance,
        ...options,
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [preloadDistance, options.threshold, options.rootMargin]);

  return { targetRef, isVisible, shouldLoad };
};

// Dynamic import helper with retry logic
export const dynamicImport = async <T,>(
  importFn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await importFn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
};

// Component size analyzer (development only)
export const ComponentSizeAnalyzer: React.FC<{ children: React.ReactNode; name: string }> = ({
  children,
  name
}) => {
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name.includes(name)) {
            console.log(`[Component Size] ${name}: ${entry.duration}ms`);
          }
        });
      });
      
      observer.observe({ entryTypes: ['measure'] });
      performance.mark(`${name}-start`);
      
      return () => {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        observer.disconnect();
      };
    }
  }, [name]);

  return <>{children}</>;
};

// Intelligent lazy component that learns from usage patterns
interface IntelligentLazyProps {
  children: React.ReactNode;
  componentName: string;
  priority?: 'high' | 'medium' | 'low';
  fallback?: React.ComponentType<LoadingFallbackProps>;
  preloadTrigger?: 'hover' | 'focus' | 'intersection' | 'idle';
}

export const IntelligentLazy: React.FC<IntelligentLazyProps> = ({
  children,
  componentName,
  priority = 'medium',
  fallback = LoadingFallback,
  preloadTrigger = 'intersection',
}) => {
  const [shouldPreload, setShouldPreload] = useState(false);
  const { targetRef, shouldLoad } = useIntersectionLazyLoad();
  const registry = ComponentRegistry.getInstance();

  // Trigger preloading based on user interaction
  const handlePreloadTrigger = useCallback(() => {
    if (!shouldPreload) {
      setShouldPreload(true);
    }
  }, [shouldPreload]);

  // Setup preload triggers
  useEffect(() => {
    if (preloadTrigger === 'idle' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => setShouldPreload(true));
    }
  }, [preloadTrigger]);

  const triggerProps = useMemo(() => {
    switch (preloadTrigger) {
      case 'hover':
        return { onMouseEnter: handlePreloadTrigger };
      case 'focus':
        return { onFocus: handlePreloadTrigger };
      default:
        return {};
    }
  }, [preloadTrigger, handlePreloadTrigger]);

  if (preloadTrigger === 'intersection') {
    return (
      <div ref={targetRef}>
        {shouldLoad && (
          <LazyWrapper
            name={componentName}
            fallback={fallback}
            priority={priority}
          >
            {children}
          </LazyWrapper>
        )}
      </div>
    );
  }

  return (
    <div {...triggerProps}>
      {(shouldPreload || shouldLoad) && (
        <LazyWrapper
          name={componentName}
          fallback={fallback}
          priority={priority}
        >
          {children}
        </LazyWrapper>
      )}
    </div>
  );
};

// Bundle size reporter for development
export const BundleSizeReporter: React.FC = () => {
  const [bundleStats, setBundleStats] = useState<Record<string, number>>({});

  useEffect(() => {
    if (import.meta.env.DEV) {
      // Monitor loaded chunks
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name.includes('.js') && entry.transferSize) {
            const chunkName = entry.name.split('/').pop() || 'unknown';
            setBundleStats(prev => ({
              ...prev,
              [chunkName]: entry.transferSize,
            }));
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });
      return () => observer.disconnect();
    }
  }, []);

  if (!import.meta.env.DEV || Object.keys(bundleStats).length === 0) {
    return null;
  }

  const totalSize = Object.values(bundleStats).reduce((sum, size) => sum + size, 0);

  return (
    <div className="fixed bottom-2 left-2 bg-black/80 text-white text-xs p-2 rounded font-mono z-50">
      <div className="font-bold mb-1">Bundle Stats</div>
      <div>Total: {(totalSize / 1024).toFixed(1)}KB</div>
      <div>Chunks: {Object.keys(bundleStats).length}</div>
      <details className="mt-1">
        <summary className="cursor-pointer">Details</summary>
        <div className="mt-1 max-h-32 overflow-y-auto">
          {Object.entries(bundleStats)
            .sort(([,a], [,b]) => b - a)
            .map(([name, size]) => (
              <div key={name} className="flex justify-between gap-2">
                <span className="truncate max-w-32">{name}</span>
                <span>{(size / 1024).toFixed(1)}KB</span>
              </div>
            ))}
        </div>
      </details>
    </div>
  );
};

export default {
  LazyMetricsDashboard,
  LazyAgentCreationWizard,
  LazyMobileResponsiveAgentWizard,
  LazyAguiLiveDashboard,
  LazyCrewExecutionDashboard,
  LazyAgentActivityDashboard,
  LazyAgentStepTimeline,
  LazyDebugPanel,
  LazyRecharts,
  LoadingFallback,
  LazyWrapper,
  IntelligentLazy,
  BundleSizeReporter,
  preloadCriticalComponents,
  useIntersectionLazyLoad,
  dynamicImport,
  ComponentSizeAnalyzer,
  ComponentRegistry,
};