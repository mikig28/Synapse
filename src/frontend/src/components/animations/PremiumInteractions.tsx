/**
 * Premium Interaction Components
 * Delightful micro-interactions for premium user experience
 * Includes gesture support, advanced animations, and accessibility
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAnimationContext, useHapticFeedback } from '@/contexts/AnimationContext';
import { springPhysics, createTransition } from '@/utils/animations';

// =============================================================================
// SWIPEABLE CARD
// =============================================================================

interface SwipeableCardProps {
  children: React.ReactNode;
  className?: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  swipeThreshold?: number;
  disabled?: boolean;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  topAction?: React.ReactNode;
  bottomAction?: React.ReactNode;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  className,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  swipeThreshold = 100,
  disabled = false,
  leftAction,
  rightAction,
  topAction,
  bottomAction,
}) => {
  const { preferences } = useAnimationContext();
  const haptic = useHapticFeedback();
  const [isDragging, setIsDragging] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -50, 50, 200], [0.5, 1, 1, 0.5]);

  const handleDragStart = useCallback(() => {
    if (disabled) return;
    setIsDragging(true);
    haptic('light');
  }, [disabled, haptic]);

  const handleDrag = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return;
    
    const { offset } = info;
    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);
    
    // Determine swipe direction
    if (absX > absY) {
      setSwipeDirection(offset.x > 0 ? 'right' : 'left');
    } else {
      setSwipeDirection(offset.y > 0 ? 'down' : 'up');
    }
  }, [disabled]);

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return;
    
    setIsDragging(false);
    const { offset, velocity } = info;
    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);
    
    // Check if swipe threshold is met
    const shouldSwipe = absX > swipeThreshold || absY > swipeThreshold || 
                       Math.abs(velocity.x) > 500 || Math.abs(velocity.y) > 500;
    
    if (shouldSwipe) {
      haptic('medium');
      
      if (absX > absY) {
        if (offset.x > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (offset.x < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        if (offset.y > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (offset.y < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    } else {
      // Snap back
      x.set(0);
      y.set(0);
    }
    
    setSwipeDirection(null);
  }, [disabled, swipeThreshold, haptic, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, x, y]);

  // Action indicators
  const showLeftAction = leftAction && swipeDirection === 'left' && Math.abs(x.get()) > 50;
  const showRightAction = rightAction && swipeDirection === 'right' && Math.abs(x.get()) > 50;
  const showTopAction = topAction && swipeDirection === 'up' && Math.abs(y.get()) > 50;
  const showBottomAction = bottomAction && swipeDirection === 'down' && Math.abs(y.get()) > 50;

  return (
    <div className={cn("relative", className)}>
      {/* Action indicators */}
      <AnimatePresence>
        {showLeftAction && (
          <motion.div
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            {leftAction}
          </motion.div>
        )}
        
        {showRightAction && (
          <motion.div
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            {rightAction}
          </motion.div>
        )}
        
        {showTopAction && (
          <motion.div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-10"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            {topAction}
          </motion.div>
        )}
        
        {showBottomAction && (
          <motion.div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            {bottomAction}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        drag={!disabled && preferences.enableAnimations}
        dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
        dragElastic={0.3}
        dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
        style={{ x, y, rotate, opacity }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className={cn(
          "cursor-grab active:cursor-grabbing",
          isDragging && "z-10",
          disabled && "cursor-default"
        )}
        animate={isDragging ? { scale: 1.05 } : { scale: 1 }}
        transition={springPhysics.gentle}
      >
        {children}
      </motion.div>
    </div>
  );
};

// =============================================================================
// MORPHING ICON BUTTON
// =============================================================================

interface MorphingIconButtonProps {
  icons: React.ReactNode[];
  labels?: string[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  disabled?: boolean;
  direction?: 'horizontal' | 'vertical';
}

export const MorphingIconButton: React.FC<MorphingIconButtonProps> = ({
  icons,
  labels = [],
  activeIndex,
  onIndexChange,
  className,
  size = 'md',
  variant = 'default',
  disabled = false,
  direction = 'horizontal',
}) => {
  const { preferences } = useAnimationContext();
  const haptic = useHapticFeedback();

  const handleClick = useCallback(() => {
    if (disabled) return;
    
    haptic('light');
    const nextIndex = (activeIndex + 1) % icons.length;
    onIndexChange(nextIndex);
  }, [disabled, haptic, activeIndex, icons.length, onIndexChange]);

  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10",
    lg: "w-12 h-12 text-lg",
  };

  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  };

  return (
    <motion.button
      className={cn(
        "relative overflow-hidden rounded-lg flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      onClick={handleClick}
      disabled={disabled}
      whileTap={preferences.enableAnimations ? { scale: 0.95 } : undefined}
      whileHover={preferences.enableAnimations ? { scale: 1.05 } : undefined}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ 
            opacity: 0, 
            scale: 0.5,
            ...(direction === 'horizontal' ? { x: 20 } : { y: 20 })
          }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            x: 0,
            y: 0
          }}
          exit={{ 
            opacity: 0, 
            scale: 0.5,
            ...(direction === 'horizontal' ? { x: -20 } : { y: -20 })
          }}
          transition={springPhysics.snappy}
          className="flex items-center justify-center"
        >
          {icons[activeIndex]}
        </motion.div>
      </AnimatePresence>
      
      {/* Label tooltip */}
      {labels[activeIndex] && (
        <motion.div
          className="absolute -top-10 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 pointer-events-none"
          whileHover={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {labels[activeIndex]}
        </motion.div>
      )}
    </motion.button>
  );
};

// =============================================================================
// LIQUID PROGRESS BAR
// =============================================================================

interface LiquidProgressProps {
  progress: number; // 0-100
  className?: string;
  color?: string;
  height?: number;
  animated?: boolean;
  showPercentage?: boolean;
  liquid?: boolean;
}

export const LiquidProgress: React.FC<LiquidProgressProps> = ({
  progress,
  className,
  color = 'hsl(var(--primary))',
  height = 8,
  animated = true,
  showPercentage = false,
  liquid = true,
}) => {
  const { preferences } = useAnimationContext();
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={cn("relative", className)}>
      <div 
        className="w-full bg-secondary rounded-full overflow-hidden"
        style={{ height }}
      >
        <motion.div
          className="h-full relative"
          style={{ backgroundColor: color }}
          initial={{ width: '0%' }}
          animate={{ width: `${clampedProgress}%` }}
          transition={
            preferences.enableAnimations && animated
              ? {
                  duration: 0.8,
                  ease: [0.4, 0, 0.2, 1],
                }
              : { duration: 0 }
          }
        >
          {/* Liquid wave effect */}
          {liquid && preferences.enableAnimations && (
            <>
              <motion.div
                className="absolute inset-0 opacity-30"
                style={{
                  background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)`,
                }}
                animate={{
                  x: [-50, 50],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              
              {/* Wave pattern */}
              <motion.div
                className="absolute inset-0 opacity-20"
                style={{
                  background: `repeating-linear-gradient(
                    90deg,
                    transparent 0px,
                    rgba(255,255,255,0.1) 10px,
                    transparent 20px
                  )`,
                }}
                animate={{
                  x: [0, 20],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            </>
          )}
        </motion.div>
      </div>
      
      {/* Percentage display */}
      {showPercentage && (
        <motion.div
          className="absolute right-0 -top-6 text-xs font-medium tabular-nums"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {Math.round(clampedProgress)}%
        </motion.div>
      )}
    </div>
  );
};

// =============================================================================
// FLOATING TOOLTIP
// =============================================================================

interface FloatingTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export const FloatingTooltip: React.FC<FloatingTooltipProps> = ({
  children,
  content,
  placement = 'top',
  delay = 500,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        setPosition({ x: centerX, y: centerY });
        setIsVisible(true);
      }
    }, delay);
  }, [delay]);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setIsVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const placementOffset = {
    top: { x: 0, y: -10 },
    bottom: { x: 0, y: 10 },
    left: { x: -10, y: 0 },
    right: { x: 10, y: 0 },
  };

  return (
    <>
      <div
        ref={triggerRef}
        className={cn("relative", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className="fixed z-50 px-2 py-1 bg-popover text-popover-foreground text-sm rounded shadow-lg pointer-events-none"
            style={{
              left: position.x + placementOffset[placement].x,
              top: position.y + placementOffset[placement].y,
              transform: 'translate(-50%, -50%)',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={springPhysics.gentle}
          >
            {content}
            
            {/* Arrow */}
            <div
              className="absolute w-2 h-2 bg-popover rotate-45"
              style={{
                [placement === 'top' ? 'bottom' : placement === 'bottom' ? 'top' : placement === 'left' ? 'right' : 'left']: -4,
                [placement === 'top' || placement === 'bottom' ? 'left' : 'top']: '50%',
                transform: 'translate(-50%, 0)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// =============================================================================
// CELEBRATION EFFECTS
// =============================================================================

interface CelebrationEffectProps {
  trigger: boolean;
  type?: 'confetti' | 'sparkles' | 'hearts' | 'stars';
  intensity?: 'low' | 'medium' | 'high';
  duration?: number;
  className?: string;
}

export const CelebrationEffect: React.FC<CelebrationEffectProps> = ({
  trigger,
  type = 'confetti',
  intensity = 'medium',
  duration = 2000,
  className,
}) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; rotation: number }>>([]);

  useEffect(() => {
    if (!trigger) return;

    const intensityMap = {
      low: 15,
      medium: 30,
      high: 50,
    };

    const particleCount = intensityMap[intensity];
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
    
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
    }));

    setParticles(newParticles);

    const timeout = setTimeout(() => {
      setParticles([]);
    }, duration);

    return () => clearTimeout(timeout);
  }, [trigger, intensity, duration]);

  const getParticleSymbol = () => {
    switch (type) {
      case 'confetti': return ['▲', '●', '■', '♦'];
      case 'sparkles': return ['✨', '⭐', '💫', '🌟'];
      case 'hearts': return ['💖', '💕', '💗', '❤️'];
      case 'stars': return ['⭐', '🌟', '✨', '💫'];
      default: return ['▲', '●', '■', '♦'];
    }
  };

  const symbols = getParticleSymbol();

  return (
    <div className={cn("fixed inset-0 pointer-events-none z-50", className)}>
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute text-lg"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              color: particle.color,
            }}
            initial={{
              opacity: 1,
              scale: 0,
              rotate: particle.rotation,
            }}
            animate={{
              opacity: [1, 1, 0],
              scale: [0, 1, 0.5],
              rotate: particle.rotation + 360,
              y: [0, -100, -200],
              x: [(Math.random() - 0.5) * 100, (Math.random() - 0.5) * 200],
            }}
            exit={{
              opacity: 0,
              scale: 0,
            }}
            transition={{
              duration: duration / 1000,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            {symbols[Math.floor(Math.random() * symbols.length)]}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};