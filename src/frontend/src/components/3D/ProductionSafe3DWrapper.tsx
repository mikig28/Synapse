import React, { Suspense, useMemo, useCallback, useState, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Cube, Monitor } from 'lucide-react';

// Type definitions for 3D support detection
interface WebGLSupport {
  hasWebGL: boolean;
  hasWebGL2: boolean;
  contextError: string | null;
}

// Detect WebGL support more reliably
function detectWebGLSupport(): WebGLSupport {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const context2 = canvas.getContext('webgl2');
    
    return {
      hasWebGL: !!context,
      hasWebGL2: !!context2,
      contextError: null
    };
  } catch (error) {
    return {
      hasWebGL: false,
      hasWebGL2: false,
      contextError: error instanceof Error ? error.message : 'Unknown WebGL error'
    };
  }
}

// Enhanced 3D Fallback Component
function Enhanced3DFallback({ 
  error, 
  webglSupport,
  onRetry 
}: { 
  error?: Error | null;
  webglSupport: WebGLSupport;
  onRetry: () => void;
}) {
  return (
    <Card className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600">
      <CardContent className="text-center space-y-4 p-8">
        <div className="flex justify-center">
          {error ? (
            <AlertTriangle className="h-16 w-16 text-amber-500" />
          ) : (
            <Cube className="h-16 w-16 text-blue-500" />
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
            {error ? '3D Visualization Error' : '3D Visualization Unavailable'}
          </h3>
          
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
            {error 
              ? `Error loading 3D components: ${error.message}`
              : webglSupport.hasWebGL 
                ? 'Switching to 2D view for better compatibility'
                : 'WebGL is not supported in this browser'
            }
          </p>
        </div>

        {webglSupport.contextError && (
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-600 dark:text-red-400">
              WebGL Error: {webglSupport.contextError}
            </p>
          </div>
        )}

        <div className="flex gap-2 justify-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="flex items-center gap-2"
          >
            <Monitor className="h-4 w-4" />
            Try Again
          </Button>
          
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 mt-4">
          Browser: {navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                   navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                   navigator.userAgent.includes('Safari') ? 'Safari' : 'Other'}
          <br />
          WebGL: {webglSupport.hasWebGL ? 'Supported' : 'Not Supported'}
          {webglSupport.hasWebGL2 && ' (WebGL2)'}
        </div>
      </CardContent>
    </Card>
  );
}

// Error boundary specifically for 3D components
function ThreeDErrorBoundary({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode;
  fallback: React.ComponentType<{ error: Error }>;
}) {
  return (
    <ErrorBoundary
      FallbackComponent={fallback}
      onError={(error, errorInfo) => {
        console.error('3D Component Error:', error);
        console.error('Component Stack:', errorInfo.componentStack);
        
        // Log to analytics if available
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'exception', {
            description: `3D Error: ${error.message}`,
            fatal: false
          });
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// Production-safe loading wrapper
function ProductionSafeLoader({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // Ensure we're in the browser and hydrated
    setHasHydrated(true);
  }, []);

  if (!hasHydrated) {
    return <>{fallback}</>;
  }

  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
}

// Main wrapper component
export interface ProductionSafe3DWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function ProductionSafe3DWrapper({ children, className }: ProductionSafe3DWrapperProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [webglSupport, setWebglSupport] = useState<WebGLSupport | null>(null);

  // Check WebGL support on mount
  useEffect(() => {
    const support = detectWebGLSupport();
    setWebglSupport(support);
  }, []);

  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    // Re-check WebGL support
    const support = detectWebGLSupport();
    setWebglSupport(support);
  }, []);

  const LoadingFallback = useMemo(() => (
    <Card className="w-full h-96 flex items-center justify-center">
      <CardContent className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-sm text-slate-600 dark:text-slate-400">Loading 3D Visualization...</p>
      </CardContent>
    </Card>
  ), []);

  const ErrorFallback = useCallback(({ error }: { error: Error }) => (
    <Enhanced3DFallback 
      error={error} 
      webglSupport={webglSupport || { hasWebGL: false, hasWebGL2: false, contextError: null }}
      onRetry={handleRetry}
    />
  ), [webglSupport, handleRetry]);

  // Don't render 3D if WebGL is definitely not supported
  if (webglSupport && !webglSupport.hasWebGL) {
    return (
      <Enhanced3DFallback 
        webglSupport={webglSupport}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className={className} key={retryCount}>
      <ThreeDErrorBoundary fallback={ErrorFallback}>
        <ProductionSafeLoader fallback={LoadingFallback}>
          {children}
        </ProductionSafeLoader>
      </ThreeDErrorBoundary>
    </div>
  );
}

export default ProductionSafe3DWrapper;