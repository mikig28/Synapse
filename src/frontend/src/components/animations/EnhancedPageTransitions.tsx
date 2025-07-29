/**
 * Enhanced Page Transitions
 * Premium page transition system with orchestrated animations
 * Includes breadcrumb animations, loading states, and view switching
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation, Variants } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAnimationContext } from '@/contexts/AnimationContext';
import { 
  animationConfig, 
  pageVariants, 
  createTransition,
  springPhysics 
} from '@/utils/animations';

// =============================================================================
// PAGE TRANSITION CONTEXT
// =============================================================================

interface PageTransitionContextType {
  isTransitioning: boolean;
  direction: number;
  currentRoute: string;
  previousRoute: string;
  startTransition: (to: string, direction?: number) => Promise<void>;
  setLoadingState: (loading: boolean) => void;
  triggerRouteAnimation: (animation: 'success' | 'error' | 'loading') => void;
}

const PageTransitionContext = createContext<PageTransitionContextType | null>(null);

export const usePageTransition = () => {
  const context = useContext(PageTransitionContext);
  if (!context) {
    throw new Error('usePageTransition must be used within PageTransitionProvider');
  }
  return context;
};

// =============================================================================
// PAGE TRANSITION PROVIDER
// =============================================================================

interface PageTransitionProviderProps {
  children: React.ReactNode;
}

export const PageTransitionProvider: React.FC<PageTransitionProviderProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { preferences, orchestratePageTransition } = useAnimationContext();
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState(1);
  const [currentRoute, setCurrentRoute] = useState(location.pathname);
  const [previousRoute, setPreviousRoute] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const controls = useAnimation();

  // Route hierarchy for determining direction
  const routeHierarchy = [
    '/',
    '/agents',
    '/analytics',
    '/3d',
    '/docs',
    '/settings',
  ];

  const getRouteDirection = useCallback((from: string, to: string) => {
    const fromIndex = routeHierarchy.indexOf(from);
    const toIndex = routeHierarchy.indexOf(to);
    
    if (fromIndex === -1 || toIndex === -1) return 1;
    return toIndex > fromIndex ? 1 : -1;
  }, []);

  // Handle route changes
  useEffect(() => {
    const newRoute = location.pathname;
    if (newRoute !== currentRoute) {
      const newDirection = getRouteDirection(currentRoute, newRoute);
      setDirection(newDirection);
      setPreviousRoute(currentRoute);
      setCurrentRoute(newRoute);
    }
  }, [location.pathname, currentRoute, getRouteDirection]);

  const startTransition = useCallback(async (to: string, customDirection?: number) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    const transitionDirection = customDirection ?? getRouteDirection(currentRoute, to);
    setDirection(transitionDirection);
    
    await orchestratePageTransition(transitionDirection > 0 ? 'forward' : 'backward');
    
    navigate(to);
    
    // Complete transition after navigation
    setTimeout(() => {
      setIsTransitioning(false);
    }, 400);
  }, [isTransitioning, currentRoute, getRouteDirection, orchestratePageTransition, navigate]);

  const setLoadingState = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const triggerRouteAnimation = useCallback(async (animation: 'success' | 'error' | 'loading') => {
    const animations = {
      success: {
        scale: [1, 1.02, 1],
        opacity: [1, 0.9, 1],
        transition: { duration: 0.5, ease: 'easeOut' },
      },
      error: {
        x: [-2, 2, -2, 2, 0],
        transition: { duration: 0.4, ease: 'easeOut' },
      },
      loading: {
        opacity: [1, 0.7, 1],
        transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
      },
    };

    await controls.start(animations[animation]);
  }, [controls]);

  const contextValue: PageTransitionContextType = {
    isTransitioning,
    direction,
    currentRoute,
    previousRoute,
    startTransition,
    setLoadingState,
    triggerRouteAnimation,
  };

  return (
    <PageTransitionContext.Provider value={contextValue}>
      <motion.div animate={controls} className="w-full h-full">
        {children}
      </motion.div>
    </PageTransitionContext.Provider>
  );
};

// =============================================================================
// ENHANCED PAGE WRAPPER
// =============================================================================

interface EnhancedPageWrapperProps {
  children: React.ReactNode;
  className?: string;
  pageTitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
}

export const EnhancedPageWrapper: React.FC<EnhancedPageWrapperProps> = ({
  children,
  className,
  pageTitle,
  breadcrumbs = [],
  actions,
  loading = false,
  error = null,
}) => {
  const { direction, isTransitioning } = usePageTransition();
  const { preferences } = useAnimationContext();

  const pageWrapperVariants: Variants = {
    initial: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? 300 : -300,
      scale: 0.95,
    }),
    in: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: preferences.enableAnimations ? animationConfig.timing.slow : 0,
        ease: animationConfig.easing.smooth,
        staggerChildren: 0.1,
      },
    },
    out: (direction: number) => ({
      opacity: 0,
      x: direction < 0 ? 300 : -300,
      scale: 1.05,
      transition: {
        duration: preferences.enableAnimations ? animationConfig.timing.normal : 0,
        ease: animationConfig.easing.easeIn,
      },
    }),
  };

  const contentVariants: Variants = {
    initial: { opacity: 0, y: 20 },
    in: { 
      opacity: 1, 
      y: 0,
      transition: createTransition(animationConfig.timing.normal, 'smooth', 0.1),
    },
    out: { 
      opacity: 0, 
      y: -20,
      transition: createTransition(animationConfig.timing.quick, 'easeIn'),
    },
  };

  return (
    <motion.div
      key={location.pathname}
      className={cn("min-h-screen w-full", className)}
      variants={pageWrapperVariants}
      initial="initial"
      animate="in"
      exit="out"
      custom={direction}
    >
      {/* Page Header */}
      {(pageTitle || breadcrumbs.length > 0 || actions) && (
        <motion.header 
          className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b"
          variants={contentVariants}
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                {/* Breadcrumbs */}
                {breadcrumbs.length > 0 && (
                  <EnhancedBreadcrumbs breadcrumbs={breadcrumbs} />
                )}
                
                {/* Page Title */}
                {pageTitle && (
                  <motion.h1 
                    className="text-2xl font-bold"
                    variants={contentVariants}
                  >
                    {pageTitle}
                  </motion.h1>
                )}
              </div>

              {/* Actions */}
              {actions && (
                <motion.div variants={contentVariants}>
                  {actions}
                </motion.div>
              )}
            </div>
          </div>
        </motion.header>
      )}

      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center space-y-4">
              <motion.div
                className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="container mx-auto px-4 py-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive mb-2">Error</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Content */}
      {!loading && !error && (
        <motion.main 
          className="flex-1"
          variants={contentVariants}
        >
          {children}
        </motion.main>
      )}
    </motion.div>
  );
};

// =============================================================================
// ENHANCED BREADCRUMBS
// =============================================================================

interface EnhancedBreadcrumbsProps {
  breadcrumbs: Array<{ label: string; href?: string }>;
  className?: string;
}

export const EnhancedBreadcrumbs: React.FC<EnhancedBreadcrumbsProps> = ({
  breadcrumbs,
  className,
}) => {
  const { startTransition } = usePageTransition();
  const { preferences } = useAnimationContext();

  const breadcrumbVariants: Variants = {
    initial: { opacity: 0, x: -20 },
    in: (index: number) => ({
      opacity: 1,
      x: 0,
      transition: createTransition(
        animationConfig.timing.normal, 
        'smooth', 
        index * 0.05
      ),
    }),
  };

  const handleBreadcrumbClick = useCallback((href: string, e: React.MouseEvent) => {
    if (!href) return;
    
    e.preventDefault();
    startTransition(href);
  }, [startTransition]);

  return (
    <nav className={cn("flex items-center space-x-2 text-sm", className)}>
      {breadcrumbs.map((breadcrumb, index) => (
        <motion.div
          key={index}
          className="flex items-center space-x-2"
          variants={breadcrumbVariants}
          initial="initial"
          animate="in"
          custom={index}
        >
          {index > 0 && (
            <motion.span 
              className="text-muted-foreground"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 + 0.1 }}
            >
              /
            </motion.span>
          )}
          
          {breadcrumb.href ? (
            <motion.a
              href={breadcrumb.href}
              onClick={(e) => handleBreadcrumbClick(breadcrumb.href!, e)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              whileHover={preferences.enableAnimations ? { x: 2 } : undefined}
              whileTap={preferences.enableAnimations ? { scale: 0.95 } : undefined}
            >
              {breadcrumb.label}
            </motion.a>
          ) : (
            <span className="font-medium">{breadcrumb.label}</span>
          )}
        </motion.div>
      ))}
    </nav>
  );
};

// =============================================================================
// VIEW TRANSITION WRAPPER
// =============================================================================

interface ViewTransitionWrapperProps {
  children: React.ReactNode;
  viewKey: string;
  className?: string;
  direction?: 'horizontal' | 'vertical';
}

export const ViewTransitionWrapper: React.FC<ViewTransitionWrapperProps> = ({
  children,
  viewKey,
  className,
  direction = 'horizontal',
}) => {
  const { preferences } = useAnimationContext();

  const viewVariants: Variants = {
    initial: (direction: string) => ({
      opacity: 0,
      ...(direction === 'horizontal' ? { x: 50 } : { y: 50 }),
      scale: 0.95,
    }),
    in: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: {
        duration: preferences.enableAnimations ? 0.4 : 0,
        ease: [0.4, 0, 0.2, 1],
        staggerChildren: 0.1,
      },
    },
    out: (direction: string) => ({
      opacity: 0,
      ...(direction === 'horizontal' ? { x: -50 } : { y: -50 }),
      scale: 1.05,
      transition: {
        duration: preferences.enableAnimations ? 0.3 : 0,
        ease: [0.4, 0, 0.2, 1],
      },
    }),
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
        className={className}
        variants={viewVariants}
        initial="initial"
        animate="in"
        exit="out"
        custom={direction}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// =============================================================================
// ROUTE PRELOADER
// =============================================================================

interface RoutePreloaderProps {
  routes: string[];
  preloadDelay?: number;
}

export const RoutePreloader: React.FC<RoutePreloaderProps> = ({
  routes,
  preloadDelay = 2000,
}) => {
  const [preloadedRoutes, setPreloadedRoutes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const preloadRoute = (route: string) => {
      if (preloadedRoutes.has(route)) return;

      // Preload route component
      import(`../../pages${route}Page.tsx`)
        .then(() => {
          setPreloadedRoutes(prev => new Set(prev).add(route));
        })
        .catch(() => {
          console.warn(`Failed to preload route: ${route}`);
        });
    };

    const timeout = setTimeout(() => {
      routes.forEach(preloadRoute);
    }, preloadDelay);

    return () => clearTimeout(timeout);
  }, [routes, preloadDelay, preloadedRoutes]);

  return null;
};