import React, { useState, useEffect, ReactNode } from 'react';

interface ClientOnly3DWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Wrapper component that only renders children on the client side
 * This prevents SSR-related useLayoutEffect errors with React Three Fiber
 * Based on 2025 best practices for R3F production deployment
 */
export function ClientOnly3DWrapper({ children, fallback = null }: ClientOnly3DWrapperProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // This effect only runs on the client side
    setHasMounted(true);
  }, []);

  // During SSR or before hydration, render the fallback
  if (!hasMounted) {
    return <>{fallback}</>;
  }

  // Only render Three.js components after client-side hydration
  return <>{children}</>;
}

export default ClientOnly3DWrapper;