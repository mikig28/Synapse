/**
 * Enhanced Animation System with Framer Motion
 * Comprehensive, polished animation system for premium user experience
 * Features: Performance optimization, accessibility, orchestrated animations
 */

import { Variants, Transition, MotionProps } from 'framer-motion';

// =============================================================================
// CORE ANIMATION SYSTEM CONFIGURATION
// =============================================================================

/**
 * Animation system configuration with performance and accessibility settings
 */
export const animationConfig = {
  // Performance settings
  reducedMotion: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  
  // GPU acceleration properties
  gpuAcceleration: {
    willChange: 'transform, opacity',
    transform: 'translate3d(0,0,0)', // Force GPU layer
  },
  
  // Global timing settings
  timing: {
    micro: 0.15,      // Button presses, micro-interactions
    quick: 0.25,      // Hover states, toggles
    normal: 0.4,      // Card animations, modals
    slow: 0.6,        // Page transitions, complex animations
    lazy: 1.0,        // Data visualizations, celebrations
  },
  
  // Easing functions for different interaction types
  easing: {
    // Apple-inspired cubic bezier curves
    smooth: [0.4, 0, 0.2, 1] as const,
    snappy: [0.25, 0.46, 0.45, 0.94] as const,
    dramatic: [0.17, 0.67, 0.83, 0.67] as const,
    elastic: [0.68, -0.55, 0.265, 1.55] as const,
    
    // Standard easing
    easeOut: 'easeOut' as const,
    easeIn: 'easeIn' as const,
    easeInOut: 'easeInOut' as const,
    linear: 'linear' as const,
  },
  
  // Stagger timing for orchestrated animations
  stagger: {
    cards: 0.08,      // Card grids
    list: 0.04,       // List items
    buttons: 0.02,    // Button groups
    metrics: 0.12,    // Dashboard metrics
  },
};

/**
 * Get animation configuration based on reduced motion preference
 */
export const getAnimationConfig = (override?: Partial<typeof animationConfig>) => {
  const config = { ...animationConfig, ...override };
  
  if (config.reducedMotion) {
    return {
      ...config,
      timing: {
        micro: 0,
        quick: 0,
        normal: 0,
        slow: 0,
        lazy: 0,
      },
      stagger: {
        cards: 0,
        list: 0,
        buttons: 0,
        metrics: 0,
      },
    };
  }
  
  return config;
};

/**
 * Universal transition factory for consistent animations
 */
export const createTransition = (
  duration: number,
  easing: keyof typeof animationConfig.easing = 'smooth',
  delay: number = 0
): Transition => {
  const config = getAnimationConfig();
  
  return {
    duration: config.reducedMotion ? 0 : duration,
    ease: config.easing[easing],
    delay: config.reducedMotion ? 0 : delay,
  };
};

/**
 * Spring physics configurations for different interaction types
 */
export const springPhysics = {
  gentle: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
    mass: 0.8,
  },
  bouncy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 15,
    mass: 0.6,
  },
  snappy: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 25,
    mass: 0.4,
  },
  wobbly: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 10,
    mass: 1.2,
  },
};

// =============================================================================
// ENHANCED ANIMATION VARIANTS
// =============================================================================

/**
 * Enhanced card animations with performance optimization
 */
export const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    ...animationConfig.gpuAcceleration,
  },
  visible: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...createTransition(animationConfig.timing.normal, 'smooth', index * animationConfig.stagger.cards),
    },
  }),
  hover: {
    y: -4,
    scale: 1.02,
    transition: createTransition(animationConfig.timing.quick, 'snappy'),
  },
  tap: {
    scale: 0.98,
    transition: createTransition(animationConfig.timing.micro, 'easeOut'),
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -20,
    transition: createTransition(animationConfig.timing.quick, 'easeIn'),
  },
};

/**
 * Enhanced container variants for orchestrated animations
 */
export const containerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: (staggerType: keyof typeof animationConfig.stagger = 'cards') => ({
    opacity: 1,
    transition: {
      staggerChildren: animationConfig.stagger[staggerType],
      delayChildren: animationConfig.timing.quick,
      duration: animationConfig.timing.normal,
      ease: animationConfig.easing.smooth,
    },
  }),
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: animationConfig.stagger.cards / 2,
      staggerDirection: -1,
      duration: animationConfig.timing.quick,
    },
  },
};

/**
 * Enhanced status indicator animations with smooth transitions
 */
export const statusVariants: Variants = {
  // Running - Enhanced pulse with subtle scale
  running: {
    scale: [1, 1.05, 1],
    opacity: [0.8, 1, 0.8],
    transition: {
      duration: animationConfig.timing.lazy * 2,
      repeat: Infinity,
      ease: animationConfig.easing.easeInOut,
    },
  },
  
  // Idle - Gentle breathing animation
  idle: {
    opacity: [0.6, 1, 0.6],
    scale: [1, 1.02, 1],
    transition: {
      duration: animationConfig.timing.lazy * 3,
      repeat: Infinity,
      ease: animationConfig.easing.easeInOut,
    },
  },
  
  // Error - Enhanced shake with color pulse
  error: {
    x: [-3, 3, -3, 3, 0],
    scale: [1, 1.05, 1],
    transition: {
      duration: animationConfig.timing.normal,
      ease: animationConfig.easing.dramatic,
      repeat: 1,
    },
  },
  
  // Completed - Celebration with rotation and scale
  completed: {
    scale: [1, 1.15, 1.05, 1],
    rotate: [0, 10, -5, 0],
    transition: {
      duration: animationConfig.timing.slow,
      ease: animationConfig.easing.elastic,
    },
  },
  
  // Paused - Gentle fade with scale down
  paused: {
    opacity: 0.5,
    scale: 0.95,
    transition: createTransition(animationConfig.timing.normal, 'easeOut'),
  },
  
  // Transition states for smooth status changes
  entering: {
    scale: 0,
    opacity: 0,
  },
  exiting: {
    scale: 0,
    opacity: 0,
    transition: createTransition(animationConfig.timing.quick, 'easeIn'),
  },
};

// Progress bar animations
export const progressVariants: Variants = {
  hidden: {
    width: '0%',
  },
  visible: (progress: number) => ({
    width: `${progress}%`,
    transition: {
      duration: 0.8,
      ease: [0.4, 0, 0.2, 1],
    },
  }),
};

// Button interaction animations
export const buttonVariants: Variants = {
  rest: {
    scale: 1,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1,
      ease: 'easeOut',
    },
  },
};

// Loading spinner variants
export const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// Modal/Dialog animations
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 20,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

// Progressive disclosure animations
export const expandVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

// Badge notification animations
export const badgeVariants: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
  bounce: {
    scale: [1, 1.2, 1],
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

// Slide in animations for panels
export const slideVariants: Variants = {
  hidden: (direction: 'left' | 'right' | 'up' | 'down') => ({
    x: direction === 'left' ? -300 : direction === 'right' ? 300 : 0,
    y: direction === 'up' ? -300 : direction === 'down' ? 300 : 0,
    opacity: 0,
  }),
  visible: {
    x: 0,
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

// Data visualization animations
export const chartVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        duration: 1.5,
        ease: 'easeInOut',
      },
      opacity: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  },
};

// Floating action button animations
export const fabVariants: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
    y: 20,
  },
  visible: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
      delay: 0.2,
    },
  },
  hover: {
    scale: 1.1,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
};

// Micro-interactions for status changes
export const microInteractions = {
  // Status change celebration
  statusChange: {
    scale: [1, 1.15, 1],
    rotate: [0, 10, -10, 0],
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
  // Success feedback
  success: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
  // Error feedback
  error: {
    x: [-4, 4, -4, 4, 0],
    transition: {
      duration: 0.4,
      ease: 'easeInOut',
    },
  },
  // Attention grabber
  attention: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 0.6,
      repeat: 2,
      ease: 'easeInOut',
    },
  },
};

// Spring configurations for different interaction types
export const springConfigs = {
  gentle: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
  },
  bouncy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 10,
  },
  snappy: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 25,
  },
  smooth: {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1] as const,
  },
};

// Layout animation configurations
export const layoutAnimations = {
  default: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
  },
  fast: {
    duration: 0.2,
    ease: 'easeOut' as const,
  },
  smooth: {
    duration: 0.4,
    ease: [0.4, 0, 0.2, 1] as const,
  },
};

// Transition presets
export const transitions = {
  smooth: {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1],
  },
  quick: {
    duration: 0.15,
    ease: 'easeOut',
  },
  slow: {
    duration: 0.6,
    ease: [0.4, 0, 0.2, 1],
  },
  bounce: {
    type: 'spring',
    stiffness: 300,
    damping: 20,
  },
} as const;

// =============================================================================
// PAGE TRANSITION ANIMATIONS
// =============================================================================

/**
 * Page transition animations for route changes
 */
export const pageVariants: Variants = {
  initial: (direction: number = 1) => ({
    opacity: 0,
    x: direction > 0 ? 300 : -300,
    scale: 0.8,
  }),
  in: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: animationConfig.timing.slow,
      ease: animationConfig.easing.smooth,
    },
  },
  out: (direction: number = 1) => ({
    opacity: 0,
    x: direction < 0 ? 300 : -300,
    scale: 1.1,
    transition: {
      duration: animationConfig.timing.normal,
      ease: animationConfig.easing.easeIn,
    },
  }),
};

/**
 * Modal and overlay animations
 */
export const overlayVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: createTransition(animationConfig.timing.normal, 'easeOut'),
  },
  exit: {
    opacity: 0,
    transition: createTransition(animationConfig.timing.quick, 'easeIn'),
  },
};

export const modalContentVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.75,
    y: 50,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      ...springPhysics.gentle,
      staggerChildren: animationConfig.stagger.list,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.75,
    y: 50,
    transition: createTransition(animationConfig.timing.quick, 'easeIn'),
  },
};

// =============================================================================
// DATA VISUALIZATION ANIMATIONS
// =============================================================================

/**
 * Number counter animations
 */
export const counterVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: springPhysics.bouncy,
  },
};

/**
 * Chart and graph animations
 */
export const chartElementVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
    scale: 0.8,
  },
  visible: (index: number = 0) => ({
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
  }),
};

/**
 * Metric card animations with celebration effects
 */
export const metricVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    rotateY: -90,
  },
  visible: (index: number = 0) => ({
    opacity: 1,
    scale: 1,
    rotateY: 0,
    transition: {
      delay: index * animationConfig.stagger.metrics,
      ...springPhysics.bouncy,
    },
  }),
  hover: {
    scale: 1.05,
    rotateY: 5,
    transition: springPhysics.snappy,
  },
  celebrate: {
    scale: [1, 1.2, 1.1, 1],
    rotateZ: [0, 5, -5, 0],
    transition: {
      duration: animationConfig.timing.slow,
      ease: animationConfig.easing.elastic,
    },
  },
};

// =============================================================================
// LOADING AND SKELETON ANIMATIONS
// =============================================================================

/**
 * Loading skeleton animations
 */
export const skeletonVariants: Variants = {
  loading: {
    opacity: [0.4, 0.8, 0.4],
    transition: {
      duration: animationConfig.timing.lazy,
      repeat: Infinity,
      ease: animationConfig.easing.easeInOut,
    },
  },
  loaded: {
    opacity: 1,
    transition: createTransition(animationConfig.timing.normal, 'easeOut'),
  },
};

/**
 * Loading spinner variations
 */
export const loadingVariants: Variants = {
  spin: {
    rotate: 360,
    transition: {
      duration: animationConfig.timing.lazy,
      repeat: Infinity,
      ease: animationConfig.easing.linear,
    },
  },
  pulse: {
    scale: [1, 1.2, 1],
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: animationConfig.timing.lazy,
      repeat: Infinity,
      ease: animationConfig.easing.easeInOut,
    },
  },
  dots: {
    scale: [1, 1.5, 1],
    transition: {
      duration: animationConfig.timing.normal,
      repeat: Infinity,
      ease: animationConfig.easing.easeInOut,
    },
  },
};

// =============================================================================
// GESTURE AND INTERACTION ANIMATIONS
// =============================================================================

/**
 * Drag and drop animations
 */
export const dragVariants: Variants = {
  rest: {
    scale: 1,
    rotate: 0,
    zIndex: 1,
  },
  dragging: {
    scale: 1.1,
    rotate: 5,
    zIndex: 1000,
    transition: springPhysics.snappy,
  },
  dropped: {
    scale: 1,
    rotate: 0,
    zIndex: 1,
    transition: springPhysics.bouncy,
  },
};

/**
 * Swipe gesture feedback
 */
export const swipeVariants: Variants = {
  initial: { x: 0, opacity: 1 },
  swipeLeft: {
    x: -300,
    opacity: 0,
    transition: createTransition(animationConfig.timing.normal, 'easeOut'),
  },
  swipeRight: {
    x: 300,
    opacity: 0,
    transition: createTransition(animationConfig.timing.normal, 'easeOut'),
  },
  snapBack: {
    x: 0,
    opacity: 1,
    transition: springPhysics.bouncy,
  },
};

// =============================================================================
// MICRO-INTERACTION HELPERS
// =============================================================================

/**
 * Success feedback animation
 */
export const successFeedback = {
  scale: [1, 1.2, 1.05, 1],
  rotate: [0, 5, -2, 0],
  transition: {
    duration: animationConfig.timing.slow,
    ease: animationConfig.easing.elastic,
  },
};

/**
 * Error feedback animation
 */
export const errorFeedback = {
  x: [-4, 4, -4, 4, 0],
  scale: [1, 1.02, 1],
  transition: {
    duration: animationConfig.timing.normal,
    ease: animationConfig.easing.dramatic,
  },
};

/**
 * Attention-grabbing animation
 */
export const attentionGrabber = {
  scale: [1, 1.05, 1],
  rotate: [0, 1, -1, 0],
  transition: {
    duration: animationConfig.timing.slow,
    repeat: 2,
    ease: animationConfig.easing.easeInOut,
  },
};

// =============================================================================
// PERFORMANCE OPTIMIZATION UTILITIES
// =============================================================================

/**
 * Common motion props for performance optimization
 */
export const performanceProps: MotionProps = {
  style: animationConfig.gpuAcceleration,
  layout: true,
  layoutId: undefined, // Set dynamically when needed
  initial: false, // Disable initial animations on SSR
};

/**
 * Reduced motion variants factory
 */
export const createReducedMotionVariant = (variants: Variants): Variants => {
  const config = getAnimationConfig();
  
  if (config.reducedMotion) {
    return Object.keys(variants).reduce((acc, key) => {
      acc[key] = { 
        opacity: typeof variants[key] === 'object' && variants[key].opacity !== undefined 
          ? variants[key].opacity 
          : 1 
      };
      return acc;
    }, {} as Variants);
  }
  
  return variants;
};