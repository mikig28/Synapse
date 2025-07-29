/**
 * Page Transition Manager
 * Handles smooth page transitions and route changes with loading states
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigationType } from 'react-router-dom';
import { pageVariants, overlayVariants, loadingVariants, animationConfig } from '@/utils/animations';
import { useLoadingAnimation } from '@/hooks/useAnimations';

interface PageTransitionManagerProps {
  children: React.ReactNode;
  showLoadingOverlay?: boolean;
  loadingComponent?: React.ReactNode;
  className?: string;
}

/**
 * Loading overlay component with elegant spinner
 */
const LoadingOverlay: React.FC<{ isVisible: boolean }> = ({ isVisible }) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <motion.div
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
            variants={loadingVariants}
            animate="spin"
          />
          <motion.p 
            className="text-sm text-muted-foreground font-medium"
            variants={loadingVariants}
            animate="pulse"
          >
            Loading...
          </motion.p>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

/**
 * Page wrapper with transition animations
 */
const PageWrapper: React.FC<{
  children: React.ReactNode;
  direction: number;
  className?: string;
}> = ({ children, direction, className = '' }) => (
  <motion.div
    className={`min-h-screen ${className}`}
    custom={direction}
    variants={pageVariants}
    initial="initial"
    animate="in"
    exit="out"
    style={{
      ...animationConfig.gpuAcceleration,
    }}
  >
    {children}
  </motion.div>
);

/**
 * Main page transition manager component
 */
export const PageTransitionManager: React.FC<PageTransitionManagerProps> = ({
  children,
  showLoadingOverlay = true,
  loadingComponent,
  className = '',
}) => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { isLoading, startLoading, stopLoading } = useLoadingAnimation();
  
  // Track page direction for appropriate transition
  const [direction, setDirection] = useState(1);
  const prevLocationRef = useRef(location.pathname);
  
  // Page loading state management
  const [isPageLoading, setIsPageLoading] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Determine transition direction based on navigation
  useEffect(() => {
    const prevPath = prevLocationRef.current;
    const currentPath = location.pathname;
    
    // Simple heuristic for direction
    if (navigationType === 'POP') {
      setDirection(-1); // Going back
    } else if (currentPath.length > prevPath.length) {
      setDirection(1); // Going deeper
    } else {
      setDirection(-1); // Going up/back
    }
    
    prevLocationRef.current = currentPath;
  }, [location.pathname, navigationType]);
  
  // Handle route change loading
  useEffect(() => {
    if (showLoadingOverlay) {
      setIsPageLoading(true);
      startLoading();
      
      // Minimum loading time for smooth UX
      loadingTimeoutRef.current = setTimeout(() => {
        setIsPageLoading(false);
        stopLoading();
      }, 500);
    }
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [location.pathname, showLoadingOverlay, startLoading, stopLoading]);
  
  return (
    <>
      {/* Loading overlay */}
      {showLoadingOverlay && (
        loadingComponent ? (
          <AnimatePresence>
            {isPageLoading && loadingComponent}
          </AnimatePresence>
        ) : (
          <LoadingOverlay isVisible={isPageLoading} />
        )
      )}
      
      {/* Page transitions */}
      <AnimatePresence mode="wait" custom={direction}>
        <PageWrapper
          key={location.pathname}
          direction={direction}
          className={className}
        >
          {children}
        </PageWrapper>
      </AnimatePresence>
    </>
  );
};

/**
 * HOC for wrapping routes with transitions
 */
export const withPageTransition = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    showLoading?: boolean;
    loadingComponent?: React.ReactNode;
    className?: string;
  }
) => {
  const WrappedComponent: React.FC<P> = (props) => (
    <PageTransitionManager
      showLoadingOverlay={options?.showLoading}
      loadingComponent={options?.loadingComponent}
      className={options?.className}
    >
      <Component {...props} />
    </PageTransitionManager>
  );
  
  WrappedComponent.displayName = `withPageTransition(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

/**
 * Hook for programmatic page transitions
 */
export const usePageTransition = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const transitionTo = async (path: string, navigate: (path: string) => void) => {
    setIsTransitioning(true);
    
    // Small delay to show transition start
    await new Promise(resolve => setTimeout(resolve, 100));
    
    navigate(path);
    
    // Reset after transition completes
    setTimeout(() => {
      setIsTransitioning(false);
    }, animationConfig.timing.slow * 1000);
  };
  
  return {
    isTransitioning,
    transitionTo,
  };
};

/**
 * Breadcrumb-aware page transitions
 */
export const useBreadcrumbTransition = (breadcrumbPath: string[]) => {
  const [transitionDirection, setTransitionDirection] = useState(1);
  const prevBreadcrumbRef = useRef(breadcrumbPath);
  
  useEffect(() => {
    const prevDepth = prevBreadcrumbRef.current.length;
    const currentDepth = breadcrumbPath.length;
    
    if (currentDepth > prevDepth) {
      setTransitionDirection(1); // Going deeper
    } else if (currentDepth < prevDepth) {
      setTransitionDirection(-1); // Going back
    }
    
    prevBreadcrumbRef.current = breadcrumbPath;
  }, [breadcrumbPath]);
  
  return transitionDirection;
};