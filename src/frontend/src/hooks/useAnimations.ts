/**
 * Custom Animation Hooks
 * Reusable hooks for common animation patterns
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAnimation, useMotionValue, useTransform, AnimationControls } from 'framer-motion';
import { 
  animationConfig, 
  getAnimationConfig, 
  springPhysics, 
  successFeedback, 
  errorFeedback, 
  attentionGrabber 
} from '@/utils/animations';

// =============================================================================
// CORE ANIMATION HOOKS
// =============================================================================

/**
 * Hook for orchestrated container animations
 */
export const useStaggeredAnimation = (itemCount: number, staggerType: keyof typeof animationConfig.stagger = 'cards') => {
  const controls = useAnimation();
  const config = getAnimationConfig();
  
  const animate = useCallback(async () => {
    await controls.start({
      opacity: 1,
      transition: {
        staggerChildren: config.stagger[staggerType],
        delayChildren: config.timing.quick,
      },
    });
  }, [controls, config, staggerType]);
  
  const reset = useCallback(() => {
    controls.set({ opacity: 0 });
  }, [controls]);
  
  return { controls, animate, reset };
};

/**
 * Hook for sequential text animations (typewriter effect)
 */
export const useTypingAnimation = (text: string, speed: number = 50) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const start = useCallback(() => {
    setDisplayText('');
    setIsComplete(false);
    
    let index = 0;
    const animate = () => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
        timeoutRef.current = setTimeout(animate, speed);
      } else {
        setIsComplete(true);
      }
    };
    
    animate();
  }, [text, speed]);
  
  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setDisplayText('');
    setIsComplete(false);
  }, []);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return { displayText, isComplete, start, reset };
};

/**
 * Hook for scroll-triggered animations
 */
export const useScrollAnimation = (threshold: number = 0.1) => {
  const ref = useRef<HTMLElement>(null);
  const controls = useAnimation();
  const [isInView, setIsInView] = useState(false);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting;
        setIsInView(inView);
        
        if (inView) {
          controls.start('visible');
        }
      },
      { threshold }
    );
    
    observer.observe(element);
    
    return () => observer.disconnect();
  }, [controls, threshold]);
  
  return { ref, controls, isInView };
};

/**
 * Hook for smooth number counting animations
 */
export const useCountAnimation = (
  end: number, 
  duration: number = 1000, 
  start: number = 0,
  formatter?: (value: number) => string
) => {
  const [count, setCount] = useState(start);
  const [isAnimating, setIsAnimating] = useState(false);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();
  
  const animate = useCallback(() => {
    setIsAnimating(true);
    startTimeRef.current = performance.now();
    
    const updateCount = (currentTime: number) => {
      if (!startTimeRef.current) return;
      
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentCount = start + (end - start) * easedProgress;
      
      setCount(currentCount);
      
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(updateCount);
      } else {
        setCount(end);
        setIsAnimating(false);
      }
    };
    
    frameRef.current = requestAnimationFrame(updateCount);
  }, [start, end, duration]);
  
  const reset = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    setCount(start);
    setIsAnimating(false);
  }, [start]);
  
  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);
  
  const displayValue = formatter ? formatter(count) : Math.round(count);
  
  return { count: displayValue, isAnimating, animate, reset };
};

// =============================================================================
// INTERACTION HOOKS
// =============================================================================

/**
 * Hook for micro-interaction feedback
 */
export const useFeedbackAnimation = () => {
  const controls = useAnimation();
  
  const success = useCallback(async () => {
    await controls.start(successFeedback);
  }, [controls]);
  
  const error = useCallback(async () => {
    await controls.start(errorFeedback);
  }, [controls]);
  
  const attention = useCallback(async () => {
    await controls.start(attentionGrabber);
  }, [controls]);
  
  return { controls, success, error, attention };
};

/**
 * Hook for hover and tap animations
 */
export const useInteractionAnimation = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isTapped, setIsTapped] = useState(false);
  const controls = useAnimation();
  
  const handleHoverStart = useCallback(() => {
    setIsHovered(true);
    controls.start('hover');
  }, [controls]);
  
  const handleHoverEnd = useCallback(() => {
    setIsHovered(false);
    controls.start('rest');
  }, [controls]);
  
  const handleTapStart = useCallback(() => {
    setIsTapped(true);
    controls.start('tap');
  }, [controls]);
  
  const handleTapEnd = useCallback(() => {
    setIsTapped(false);
    controls.start(isHovered ? 'hover' : 'rest');
  }, [controls, isHovered]);
  
  return {
    controls,
    isHovered,
    isTapped,
    handlers: {
      onHoverStart: handleHoverStart,
      onHoverEnd: handleHoverEnd,
      onTapStart: handleTapStart,
      onTap: handleTapEnd,
    },
  };
};

/**
 * Hook for drag and drop animations
 */
export const useDragAnimation = () => {
  const [isDragging, setIsDragging] = useState(false);
  const controls = useAnimation();
  const dragControls = useAnimation();
  
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    controls.start('dragging');
  }, [controls]);
  
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    controls.start('dropped');
  }, [controls]);
  
  return {
    controls,
    dragControls,
    isDragging,
    handlers: {
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
    },
  };
};

// =============================================================================
// STATUS AND STATE HOOKS
// =============================================================================

/**
 * Hook for status change animations
 */
export const useStatusAnimation = <T extends string>(initialStatus: T) => {
  const [status, setStatus] = useState<T>(initialStatus);
  const [previousStatus, setPreviousStatus] = useState<T>(initialStatus);
  const controls = useAnimation();
  
  const changeStatus = useCallback(async (newStatus: T) => {
    if (newStatus === status) return;
    
    setPreviousStatus(status);
    
    // Exit animation
    await controls.start('exiting');
    
    // Update status
    setStatus(newStatus);
    
    // Enter animation
    await controls.start('entering');
    await controls.start(newStatus);
  }, [status, controls]);
  
  const reset = useCallback(() => {
    setStatus(initialStatus);
    setPreviousStatus(initialStatus);
    controls.start(initialStatus);
  }, [initialStatus, controls]);
  
  return {
    status,
    previousStatus,
    controls,
    changeStatus,
    reset,
  };
};

/**
 * Hook for loading state animations
 */
export const useLoadingAnimation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const controls = useAnimation();
  
  const startLoading = useCallback(async () => {
    setIsLoading(true);
    await controls.start('loading');
  }, [controls]);
  
  const stopLoading = useCallback(async () => {
    await controls.start('loaded');
    setIsLoading(false);
  }, [controls]);
  
  return {
    isLoading,
    controls,
    startLoading,
    stopLoading,
  };
};

// =============================================================================
// DATA VISUALIZATION HOOKS
// =============================================================================

/**
 * Hook for chart animations
 */
export const useChartAnimation = (dataLength: number) => {
  const controls = useAnimation();
  const [animationProgress, setAnimationProgress] = useState(0);
  
  const animateChart = useCallback(async () => {
    setAnimationProgress(0);
    
    await controls.start((index) => ({
      pathLength: 1,
      opacity: 1,
      scale: 1,
      transition: {
        pathLength: {
          duration: animationConfig.timing.lazy,
          ease: animationConfig.easing.easeOut,
          delay: index * animationConfig.stagger.metrics,
        },
        opacity: {
          duration: animationConfig.timing.normal,
          delay: index * animationConfig.stagger.metrics,
        },
        scale: {
          ...springPhysics.gentle,
          delay: index * animationConfig.stagger.metrics,
        },
      },
    }));
    
    setAnimationProgress(1);
  }, [controls]);
  
  const reset = useCallback(() => {
    controls.set({ pathLength: 0, opacity: 0, scale: 0.8 });
    setAnimationProgress(0);
  }, [controls]);
  
  return {
    controls,
    animationProgress,
    animateChart,
    reset,
  };
};

/**
 * Hook for metric celebration animations
 */
export const useMetricCelebration = () => {
  const controls = useAnimation();
  const [isCelebrating, setIsCelebrating] = useState(false);
  
  const celebrate = useCallback(async () => {
    setIsCelebrating(true);
    await controls.start('celebrate');
    setIsCelebrating(false);
  }, [controls]);
  
  return {
    controls,
    isCelebrating,
    celebrate,
  };
};

// =============================================================================
// LAYOUT AND MORPHING HOOKS
// =============================================================================

/**
 * Hook for layout animations with shared elements
 */
export const useSharedLayout = (layoutId: string) => {
  const controls = useAnimation();
  
  return {
    layoutId,
    controls,
    layout: true,
  };
};

/**
 * Hook for morphing animations between states
 */
export const useMorphAnimation = <T extends Record<string, any>>(states: Record<string, T>) => {
  const [currentState, setCurrentState] = useState<keyof typeof states>(Object.keys(states)[0]);
  const controls = useAnimation();
  
  const morphTo = useCallback(async (stateName: keyof typeof states) => {
    if (stateName === currentState) return;
    
    await controls.start(states[stateName]);
    setCurrentState(stateName);
  }, [currentState, states, controls]);
  
  return {
    currentState,
    controls,
    morphTo,
    currentProps: states[currentState],
  };
};

// =============================================================================
// PERFORMANCE HOOKS
// =============================================================================

/**
 * Hook for monitoring animation performance
 */
export const useAnimationPerformance = () => {
  const frameRef = useRef<number>();
  const [fps, setFps] = useState(60);
  const [isDropped, setIsDropped] = useState(false);
  
  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;
    
    const measureFPS = (currentTime: number) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        const currentFPS = Math.round((frameCount * 1000) / (currentTime - lastTime));
        setFps(currentFPS);
        setIsDropped(currentFPS < 55); // Flag if below 55fps
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      frameRef.current = requestAnimationFrame(measureFPS);
    };
    
    frameRef.current = requestAnimationFrame(measureFPS);
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);
  
  return { fps, isDropped };
};

/**
 * Hook for reduced motion compliance
 */
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return prefersReducedMotion;
};