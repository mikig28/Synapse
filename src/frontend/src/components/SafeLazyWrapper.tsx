import React, { Suspense, useEffect, useState } from 'react';
import { detectiOSSafari, hasiOSSafariLazyLoadingBug } from '@/utils/iOSDetection';
import { Loader2 } from 'lucide-react';

interface SafeLazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  forceEagerLoad?: boolean;
}

/**
 * Safe wrapper for lazy-loaded components that handles iOS Safari issues
 * Automatically falls back to eager loading on problematic iOS versions
 */
export const SafeLazyWrapper: React.FC<SafeLazyWrapperProps> = ({
  children,
  fallback,
  forceEagerLoad = false
}) => {
  const [shouldUseSuspense, setShouldUseSuspense] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if we should avoid Suspense due to iOS Safari bugs
    const hasLazyBug = hasiOSSafariLazyLoadingBug();
    setShouldUseSuspense(!hasLazyBug && !forceEagerLoad);
    
    // Mark as loaded after a short delay to ensure smooth rendering
    if (hasLazyBug || forceEagerLoad) {
      setTimeout(() => setIsLoaded(true), 100);
    } else {
      setIsLoaded(true);
    }
  }, [forceEagerLoad]);

  const defaultFallback = (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  // For iOS Safari with lazy loading bugs, render directly without Suspense
  if (!shouldUseSuspense) {
    if (!isLoaded) {
      return <>{fallback || defaultFallback}</>;
    }
    return <>{children}</>;
  }

  // For other browsers, use normal Suspense
  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

/**
 * Higher-order component to make any component safe for iOS Safari lazy loading
 */
export function withSafeLazy<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
): React.FC<P> {
  return (props: P) => (
    <SafeLazyWrapper fallback={fallback}>
      <Component {...props} />
    </SafeLazyWrapper>
  );
}