/**
 * Enhanced Animated Components
 * Premium animated components with delightful micro-interactions
 * Designed for luxury user experience with performance optimization
 */

import React, { forwardRef, useCallback, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAnimationContext, useHapticFeedback } from '@/contexts/AnimationContext';
import { 
  cardVariants, 
  buttonVariants, 
  springPhysics,
  animationConfig,
  createTransition
} from '@/utils/animations';

// =============================================================================
// ENHANCED ANIMATED CARD
// =============================================================================

interface EnhancedAnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'premium' | 'glass' | 'elevated';
  hoverEffect?: 'lift' | 'glow' | 'scale' | 'tilt' | 'magnetic';
  clickEffect?: 'ripple' | 'scale' | 'pulse' | 'bounce';
  glowColor?: string;
  onClick?: () => void;
  disabled?: boolean;
  index?: number;
  layoutId?: string;
}

export const EnhancedAnimatedCard = forwardRef<HTMLDivElement, EnhancedAnimatedCardProps>(
  ({ 
    children, 
    className, 
    variant = 'default',
    hoverEffect = 'lift',
    clickEffect = 'scale',
    glowColor,
    onClick,
    disabled = false,
    index = 0,
    layoutId,
    ...props 
  }, ref) => {
    const { preferences } = useAnimationContext();
    const haptic = useHapticFeedback();
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
    
    const cardRef = useRef<HTMLDivElement>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    
    // Magnetic effect transforms
    const rotateX = useTransform(mouseY, [-100, 100], [2, -2]);
    const rotateY = useTransform(mouseX, [-100, 100], [-2, 2]);
    const scale = useSpring(1, springPhysics.gentle);

    // Handle mouse move for magnetic/tilt effects
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
      if (!cardRef.current || hoverEffect !== 'magnetic') return;
      
      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      mouseX.set(e.clientX - centerX);
      mouseY.set(e.clientY - centerY);
    }, [hoverEffect, mouseX, mouseY]);

    // Handle click with ripple effect
    const handleClick = useCallback((e: React.MouseEvent) => {
      if (disabled || !onClick) return;
      
      haptic('light');
      
      if (clickEffect === 'ripple') {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const rippleId = Date.now();
        setRipples(prev => [...prev, { id: rippleId, x, y }]);
        
        setTimeout(() => {
          setRipples(prev => prev.filter(ripple => ripple.id !== rippleId));
        }, 600);
      }
      
      onClick();
    }, [disabled, onClick, clickEffect, haptic]);

    // Variant styles
    const variantStyles = {
      default: "bg-card border border-border",
      premium: "bg-gradient-to-br from-card via-card/95 to-card/90 border border-border/50 backdrop-blur-sm",
      glass: "bg-white/10 backdrop-blur-md border border-white/20",
      elevated: "bg-card border-0 shadow-lg",
    };

    // Hover effect variants
    const hoverVariants = {
      lift: {
        y: -8,
        scale: 1.02,
        transition: createTransition(0.2, 'snappy'),
      },
      glow: {
        boxShadow: glowColor 
          ? `0 0 30px ${glowColor}40, 0 0 60px ${glowColor}20`
          : "0 0 30px hsl(var(--primary))40, 0 0 60px hsl(var(--primary))20",
        transition: createTransition(0.3, 'smooth'),
      },
      scale: {
        scale: 1.05,
        transition: createTransition(0.2, 'elastic'),
      },
      tilt: {
        rotateY: 5,
        rotateX: 2,
        transition: createTransition(0.3, 'smooth'),
      },
      magnetic: {
        // Handled by transforms above
        transition: createTransition(0.1, 'smooth'),
      },
    };

    const clickVariants = {
      ripple: { scale: 0.98 },
      scale: { scale: 0.95 },
      pulse: { scale: [1, 1.05, 0.95] },
      bounce: { scale: [1, 1.1, 0.9, 1] },
    };

    return (
      <motion.div
        ref={ref || cardRef}
        className={cn(
          "relative overflow-hidden rounded-xl transition-colors",
          variantStyles[variant],
          onClick && !disabled && "cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        whileHover={preferences.enableAnimations ? hoverVariants[hoverEffect] : undefined}
        whileTap={preferences.enableAnimations ? clickVariants[clickEffect] : undefined}
        style={hoverEffect === 'magnetic' ? { rotateX, rotateY, scale } : undefined}
        custom={index}
        layoutId={layoutId}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          if (hoverEffect === 'magnetic') {
            mouseX.set(0);
            mouseY.set(0);
          }
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onClick={handleClick}
        {...props}
      >
        {/* Ripple effects */}
        <AnimatePresence>
          {ripples.map(ripple => (
            <motion.div
              key={ripple.id}
              className="absolute rounded-full bg-primary/20 pointer-events-none"
              style={{
                left: ripple.x - 50,
                top: ripple.y - 50,
                width: 100,
                height: 100,
              }}
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>

        {/* Premium glow overlay */}
        {variant === 'premium' && isHovered && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
        
        {children}
      </motion.div>
    );
  }
);

EnhancedAnimatedCard.displayName = 'EnhancedAnimatedCard';

// =============================================================================
// MAGNETIC BUTTON
// =============================================================================

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'premium';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  magneticStrength?: 'subtle' | 'medium' | 'strong';
  glowEffect?: boolean;
  rippleEffect?: boolean;
  hapticFeedback?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export const MagneticButton = forwardRef<HTMLButtonElement, MagneticButtonProps>(
  ({ 
    children, 
    className, 
    variant = 'default',
    size = 'md',
    magneticStrength = 'medium',
    glowEffect = false,
    rippleEffect = true,
    hapticFeedback = true,
    onClick,
    disabled = false,
    ...props 
  }, ref) => {
    const { preferences } = useAnimationContext();
    const haptic = useHapticFeedback();
    const [isHovered, setIsHovered] = useState(false);
    const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
    
    const buttonRef = useRef<HTMLButtonElement>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    
    const magneticStrengthValues = {
      subtle: 0.3,
      medium: 0.5,
      strong: 0.8,
    };
    
    const strength = magneticStrengthValues[magneticStrength];
    const x = useSpring(useTransform(mouseX, [-100, 100], [-100 * strength, 100 * strength]), springPhysics.gentle);
    const y = useSpring(useTransform(mouseY, [-100, 100], [-100 * strength, 100 * strength]), springPhysics.gentle);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
      if (!buttonRef.current) return;
      
      const rect = buttonRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      mouseX.set((e.clientX - centerX) * 0.5);
      mouseY.set((e.clientY - centerY) * 0.5);
    }, [mouseX, mouseY]);

    const handleClick = useCallback((e: React.MouseEvent) => {
      if (disabled || !onClick) return;
      
      if (hapticFeedback) {
        haptic('medium');
      }
      
      if (rippleEffect) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const rippleId = Date.now();
        setRipples(prev => [...prev, { id: rippleId, x, y }]);
        
        setTimeout(() => {
          setRipples(prev => prev.filter(ripple => ripple.id !== rippleId));
        }, 600);
      }
      
      onClick();
    }, [disabled, onClick, hapticFeedback, rippleEffect, haptic]);

    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2",
      lg: "px-6 py-3 text-lg",
      xl: "px-8 py-4 text-xl",
    };

    const variantClasses = {
      default: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      primary: "bg-primary text-primary-foreground hover:bg-primary/90",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      premium: "bg-gradient-to-r from-primary via-primary/90 to-accent text-white",
    };

    return (
      <motion.button
        ref={ref || buttonRef}
        className={cn(
          "relative overflow-hidden rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          sizeClasses[size],
          variantClasses[variant],
          glowEffect && isHovered && "shadow-lg shadow-primary/25",
          className
        )}
        style={preferences.enableAnimations ? { x, y } : undefined}
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          mouseX.set(0);
          mouseY.set(0);
        }}
        onClick={handleClick}
        disabled={disabled}
        {...props}
      >
        {/* Ripple effects */}
        <AnimatePresence>
          {ripples.map(ripple => (
            <motion.div
              key={ripple.id}
              className="absolute rounded-full bg-white/30 pointer-events-none"
              style={{
                left: ripple.x - 50,
                top: ripple.y - 50,
                width: 100,
                height: 100,
              }}
              initial={{ scale: 0, opacity: 0.6 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>

        {/* Glow overlay */}
        {glowEffect && isHovered && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />
        )}
        
        {children}
      </motion.button>
    );
  }
);

MagneticButton.displayName = 'MagneticButton';

// =============================================================================
// ANIMATED METRIC DISPLAY
// =============================================================================

interface AnimatedMetricProps {
  value: number;
  previousValue?: number;
  label: string;
  format?: (value: number) => string;
  trend?: 'up' | 'down' | 'neutral';
  animate?: boolean;
  celebrateOnIncrease?: boolean;
  className?: string;
}

export const AnimatedMetric: React.FC<AnimatedMetricProps> = ({
  value,
  previousValue,
  label,
  format = (v) => v.toString(),
  trend = 'neutral',
  animate = true,
  celebrateOnIncrease = true,
  className,
}) => {
  const { preferences } = useAnimationContext();
  const [displayValue, setDisplayValue] = useState(previousValue || 0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    if (!animate || !preferences.enableAnimations) {
      setDisplayValue(value);
      return;
    }
    
    const shouldCelebrate = celebrateOnIncrease && previousValue !== undefined && value > previousValue;
    
    setIsAnimating(true);
    
    const duration = 1000;
    const startTime = performance.now();
    const startValue = displayValue;
    const endValue = value;
    
    const animateValue = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easedProgress;
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animateValue);
      } else {
        setDisplayValue(endValue);
        setIsAnimating(false);
      }
    };
    
    requestAnimationFrame(animateValue);
  }, [value, previousValue, animate, preferences.enableAnimations, celebrateOnIncrease, displayValue]);

  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-muted-foreground',
  };

  const trendIcon = {
    up: '↗',
    down: '↘',
    neutral: '→',
  };

  return (
    <motion.div
      className={cn("space-y-2", className)}
      animate={
        isAnimating && celebrateOnIncrease && value > (previousValue || 0)
          ? {
              scale: [1, 1.1, 1],
              rotate: [0, 2, -1, 0],
            }
          : undefined
      }
      transition={{
        duration: 0.6,
        ease: [0.68, -0.55, 0.265, 1.55],
      }}
    >
      <motion.div
        className="text-3xl font-bold tabular-nums"
        animate={isAnimating ? { opacity: [1, 0.8, 1] } : undefined}
        transition={{ duration: 0.3 }}
      >
        {format(displayValue)}
      </motion.div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {previousValue !== undefined && (
          <motion.span
            className={cn("text-sm font-medium", trendColors[trend])}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {trendIcon[trend]} {Math.abs(value - previousValue)}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
};

// =============================================================================
// PROGRESSIVE IMAGE LOADER
// =============================================================================

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderSrc?: string;
  blurHash?: string;
  onLoad?: () => void;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className,
  placeholderSrc,
  blurHash,
  onLoad,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsError(true);
  }, []);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Placeholder/BlurHash */}
      <AnimatePresence>
        {!isLoaded && !isError && (
          <motion.div
            className="absolute inset-0 bg-muted animate-pulse"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* Main image */}
      <motion.img
        src={src}
        alt={alt}
        className={cn("w-full h-full object-cover", className)}
        initial={{ opacity: 0, scale: 1.1 }}
        animate={isLoaded ? { opacity: 1, scale: 1 } : undefined}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        onLoad={handleLoad}
        onError={handleError}
      />

      {/* Error state */}
      {isError && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="text-sm">Failed to load image</span>
        </motion.div>
      )}
    </div>
  );
};