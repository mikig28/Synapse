/**
 * Data Animation Hooks
 * Specialized hooks for animating data visualizations and metrics
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useAnimation, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { animationConfig, springPhysics } from '@/utils/animations';

// =============================================================================
// NUMBER AND COUNTER ANIMATIONS
// =============================================================================

/**
 * Advanced number counter with easing and formatting
 */
export const useAnimatedCounter = (
  targetValue: number,
  options: {
    duration?: number;
    startValue?: number;
    easing?: 'linear' | 'easeOut' | 'easeInOut' | 'elastic';
    formatter?: (value: number) => string;
    onComplete?: () => void;
    triggerOnChange?: boolean;
  } = {}
) => {
  const {
    duration = animationConfig.timing.lazy * 1000,
    startValue = 0,
    easing = 'easeOut',
    formatter = (value) => Math.round(value).toString(),
    onComplete,
    triggerOnChange = true,
  } = options;

  const [currentValue, setCurrentValue] = useState(startValue);
  const [isAnimating, setIsAnimating] = useState(false);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const startValueRef = useRef(startValue);

  // Easing functions
  const easingFunctions = {
    linear: (t: number) => t,
    easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
    easeInOut: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    elastic: (t: number) => {
      const c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
    },
  };

  const animate = useCallback(() => {
    setIsAnimating(true);
    startTimeRef.current = performance.now();
    startValueRef.current = currentValue;

    const updateValue = (currentTime: number) => {
      if (!startTimeRef.current) return;

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFunctions[easing](progress);
      
      const newValue = startValueRef.current + (targetValue - startValueRef.current) * easedProgress;
      setCurrentValue(newValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(updateValue);
      } else {
        setCurrentValue(targetValue);
        setIsAnimating(false);
        onComplete?.();
      }
    };

    frameRef.current = requestAnimationFrame(updateValue);
  }, [targetValue, duration, easing, onComplete, currentValue]);

  const reset = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    setCurrentValue(startValue);
    setIsAnimating(false);
  }, [startValue]);

  // Auto-trigger animation when target value changes
  useEffect(() => {
    if (triggerOnChange && targetValue !== currentValue) {
      animate();
    }
  }, [targetValue, triggerOnChange, animate, currentValue]);

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return {
    value: formatter(currentValue),
    rawValue: currentValue,
    isAnimating,
    animate,
    reset,
    progress: Math.abs(currentValue - startValue) / Math.abs(targetValue - startValue),
  };
};

/**
 * Percentage counter with visual feedback
 */
export const usePercentageCounter = (
  percentage: number,
  options: {
    precision?: number;
    showSymbol?: boolean;
    colorThresholds?: { value: number; color: string }[];
  } = {}
) => {
  const { precision = 0, showSymbol = true, colorThresholds = [] } = options;

  const counter = useAnimatedCounter(percentage, {
    formatter: (value) => {
      const rounded = precision > 0 ? value.toFixed(precision) : Math.round(value).toString();
      return showSymbol ? `${rounded}%` : rounded;
    },
  });

  const currentColor = useMemo(() => {
    if (colorThresholds.length === 0) return undefined;
    
    const threshold = colorThresholds
      .sort((a, b) => a.value - b.value)
      .find(t => counter.rawValue >= t.value);
    
    return threshold?.color;
  }, [counter.rawValue, colorThresholds]);

  return {
    ...counter,
    color: currentColor,
  };
};

/**
 * Multi-value counter for dashboards
 */
export const useMultiCounter = (
  values: Record<string, number>,
  options: {
    staggerDelay?: number;
    formatters?: Record<string, (value: number) => string>;
  } = {}
) => {
  const { staggerDelay = 100, formatters = {} } = options;
  const [counters, setCounters] = useState<Record<string, any>>({});

  useEffect(() => {
    const newCounters: Record<string, any> = {};
    
    Object.entries(values).forEach(([key, value], index) => {
      const formatter = formatters[key] || ((v: number) => Math.round(v).toString());
      
      newCounters[key] = {
        ...useAnimatedCounter(value, {
          formatter,
          duration: animationConfig.timing.lazy * 1000 + (index * staggerDelay),
        }),
      };
    });

    setCounters(newCounters);
  }, [values, staggerDelay, formatters]);

  return counters;
};

// =============================================================================
// CHART AND GRAPH ANIMATIONS
// =============================================================================

/**
 * Path drawing animation for SVG charts
 */
export const usePathAnimation = (
  pathData: string,
  options: {
    duration?: number;
    delay?: number;
    easing?: string;
  } = {}
) => {
  const {
    duration = animationConfig.timing.lazy,
    delay = 0,
    easing = 'easeInOut',
  } = options;

  const pathLength = useMotionValue(0);
  const opacity = useMotionValue(0);
  
  const animateIn = useCallback(() => {
    pathLength.set(1);
    opacity.set(1);
  }, [pathLength, opacity]);

  const animateOut = useCallback(() => {
    pathLength.set(0);
    opacity.set(0);
  }, [pathLength, opacity]);

  const reset = useCallback(() => {
    pathLength.set(0);
    opacity.set(0);
  }, [pathLength, opacity]);

  return {
    pathLength,
    opacity,
    animateIn,
    animateOut,
    reset,
    style: {
      pathLength,
      opacity,
    },
  };
};

/**
 * Staggered bar chart animation
 */
export const useBarChartAnimation = (
  data: Array<{ value: number; maxValue?: number }>,
  options: {
    staggerDelay?: number;
    direction?: 'up' | 'down' | 'left' | 'right';
  } = {}
) => {
  const { staggerDelay = animationConfig.stagger.metrics * 1000, direction = 'up' } = options;
  const controls = useAnimation();

  const animateBars = useCallback(async () => {
    await controls.start((index) => {
      const delay = index * staggerDelay / 1000;
      
      return {
        scaleY: direction === 'up' || direction === 'down' ? 1 : undefined,
        scaleX: direction === 'left' || direction === 'right' ? 1 : undefined,
        opacity: 1,
        transition: {
          delay,
          ...springPhysics.bouncy,
        },
      };
    });
  }, [controls, staggerDelay, direction]);

  const reset = useCallback(() => {
    controls.set({
      scaleY: direction === 'up' || direction === 'down' ? 0 : 1,
      scaleX: direction === 'left' || direction === 'right' ? 0 : 1,
      opacity: 0,
    });
  }, [controls, direction]);

  return {
    controls,
    animateBars,
    reset,
  };
};

/**
 * Pie chart segment animation
 */
export const usePieChartAnimation = (
  segments: Array<{ value: number; color: string; label: string }>,
  options: {
    animateOnMount?: boolean;
    staggerDelay?: number;
  } = {}
) => {
  const { animateOnMount = true, staggerDelay = 100 } = options;
  const [animatedSegments, setAnimatedSegments] = useState(segments.map(() => 0));

  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  const animateSegments = useCallback(() => {
    segments.forEach((segment, index) => {
      setTimeout(() => {
        setAnimatedSegments(prev => {
          const newSegments = [...prev];
          newSegments[index] = segment.value;
          return newSegments;
        });
      }, index * staggerDelay);
    });
  }, [segments, staggerDelay]);

  const reset = useCallback(() => {
    setAnimatedSegments(segments.map(() => 0));
  }, [segments]);

  useEffect(() => {
    if (animateOnMount) {
      animateSegments();
    }
  }, [animateOnMount, animateSegments]);

  const segmentData = segments.map((segment, index) => {
    const animatedValue = animatedSegments[index];
    const percentage = total > 0 ? (animatedValue / total) * 100 : 0;
    const angle = (animatedValue / total) * 360;
    
    return {
      ...segment,
      animatedValue,
      percentage,
      angle,
    };
  });

  return {
    segments: segmentData,
    animateSegments,
    reset,
    isComplete: animatedSegments.every((val, idx) => val === segments[idx]?.value),
  };
};

// =============================================================================
// REAL-TIME DATA ANIMATIONS
// =============================================================================

/**
 * Real-time data feed animation
 */
export const useRealTimeAnimation = <T>(
  data: T[],
  options: {
    maxItems?: number;
    animationDuration?: number;
    slideDirection?: 'up' | 'down' | 'left' | 'right';
  } = {}
) => {
  const {
    maxItems = 10,
    animationDuration = animationConfig.timing.normal,
    slideDirection = 'up',
  } = options;

  const [animatedData, setAnimatedData] = useState<T[]>([]);
  const [newItemKeys, setNewItemKeys] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Keep only the latest items
    const latestData = data.slice(-maxItems);
    
    // Find new items
    const newKeys = new Set<number>();
    latestData.forEach((item, index) => {
      if (index >= animatedData.length || item !== animatedData[index]) {
        newKeys.add(index);
      }
    });
    
    setAnimatedData(latestData);
    setNewItemKeys(newKeys);
    
    // Clear new item indicators after animation
    setTimeout(() => {
      setNewItemKeys(new Set());
    }, animationDuration * 1000);
  }, [data, maxItems, animationDuration, animatedData]);

  const getItemVariants = (index: number) => {
    const isNew = newItemKeys.has(index);
    
    if (!isNew) return {};

    const slideVariants = {
      up: { y: [50, 0], opacity: [0, 1] },
      down: { y: [-50, 0], opacity: [0, 1] },
      left: { x: [50, 0], opacity: [0, 1] },
      right: { x: [-50, 0], opacity: [0, 1] },
    };

    return {
      initial: slideVariants[slideDirection],
      animate: { y: 0, x: 0, opacity: 1 },
      transition: { duration: animationDuration, ease: 'easeOut' },
    };
  };

  return {
    data: animatedData,
    getItemVariants,
    isNewItem: (index: number) => newItemKeys.has(index),
  };
};

/**
 * Sparkline animation for trending data
 */
export const useSparklineAnimation = (
  dataPoints: number[],
  options: {
    duration?: number;
    showDots?: boolean;
    smoothing?: number;
  } = {}
) => {
  const {
    duration = animationConfig.timing.lazy,
    showDots = true,
    smoothing = 0.3,
  } = options;

  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);
  const animatedLength = useSpring(0, { stiffness: 100, damping: 20 });

  useEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      setPathLength(length);
      animatedLength.set(length);
    }
  }, [dataPoints, animatedLength]);

  const animate = useCallback(() => {
    animatedLength.set(0);
    setTimeout(() => {
      animatedLength.set(pathLength);
    }, 100);
  }, [animatedLength, pathLength]);

  const reset = useCallback(() => {
    animatedLength.set(0);
  }, [animatedLength]);

  // Generate SVG path from data points
  const svgPath = useMemo(() => {
    if (dataPoints.length < 2) return '';

    const max = Math.max(...dataPoints);
    const min = Math.min(...dataPoints);
    const range = max - min || 1;

    const width = 200;
    const height = 50;
    const step = width / (dataPoints.length - 1);

    let path = '';
    dataPoints.forEach((point, index) => {
      const x = index * step;
      const y = height - ((point - min) / range) * height;
      
      if (index === 0) {
        path += `M ${x} ${y}`;
      } else {
        // Add smoothing with quadratic curves
        const prevX = (index - 1) * step;
        const prevY = height - ((dataPoints[index - 1] - min) / range) * height;
        const cpX = prevX + (x - prevX) * smoothing;
        const cpY = prevY;
        
        path += ` Q ${cpX} ${cpY} ${x} ${y}`;
      }
    });

    return path;
  }, [dataPoints, smoothing]);

  return {
    pathRef,
    svgPath,
    pathLength: animatedLength,
    animate,
    reset,
    strokeDasharray: pathLength,
    strokeDashoffset: useTransform(animatedLength, (value) => pathLength - value),
  };
};

// =============================================================================
// PERFORMANCE MONITORING
// =============================================================================

/**
 * Animation performance monitor
 */
export const useAnimationMetrics = () => {
  const [metrics, setMetrics] = useState({
    fps: 60,
    frameTime: 16.67,
    isDropping: false,
    totalFrames: 0,
  });

  const metricsRef = useRef({
    lastTime: performance.now(),
    frameCount: 0,
    frameTimes: [] as number[],
  });

  useEffect(() => {
    let animationId: number;

    const updateMetrics = (currentTime: number) => {
      const { lastTime, frameCount, frameTimes } = metricsRef.current;
      
      if (lastTime > 0) {
        const frameTime = currentTime - lastTime;
        frameTimes.push(frameTime);
        
        // Keep only recent frame times (last 60 frames)
        if (frameTimes.length > 60) {
          frameTimes.shift();
        }
        
        // Calculate metrics every 60 frames
        if (frameCount % 60 === 0) {
          const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
          const fps = 1000 / avgFrameTime;
          const isDropping = fps < 55;
          
          setMetrics({
            fps: Math.round(fps),
            frameTime: Math.round(avgFrameTime * 100) / 100,
            isDropping,
            totalFrames: frameCount,
          });
        }
      }
      
      metricsRef.current.lastTime = currentTime;
      metricsRef.current.frameCount++;
      
      animationId = requestAnimationFrame(updateMetrics);
    };

    animationId = requestAnimationFrame(updateMetrics);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return metrics;
};