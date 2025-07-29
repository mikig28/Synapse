/**
 * Enhanced Animated Button Components
 * Premium button components with delightful micro-interactions
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  buttonVariants, 
  loadingVariants, 
  springPhysics, 
  animationConfig,
  successFeedback,
  errorFeedback 
} from '@/utils/animations';
import { useInteractionAnimation, useFeedbackAnimation } from '@/hooks/useAnimations';
import { Loader2, Check, X } from 'lucide-react';

// =============================================================================
// ANIMATED BUTTON VARIANTS
// =============================================================================

interface AnimatedButtonProps extends ButtonProps {
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  children: React.ReactNode;
  hapticFeedback?: boolean;
  glowEffect?: boolean;
  rippleEffect?: boolean;
  magneticEffect?: boolean;
  loadingText?: string;
  successText?: string;
  errorText?: string;
}

/**
 * Enhanced button with comprehensive micro-interactions
 */
export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  loading = false,
  success = false,
  error = false,
  children,
  hapticFeedback = true,
  glowEffect = false,
  rippleEffect = true,
  magneticEffect = false,
  loadingText = 'Loading...',
  successText = 'Success!',
  errorText = 'Error',
  className,
  disabled,
  onClick,
  ...props
}) => {
  const { controls, handlers } = useInteractionAnimation();
  const { controls: feedbackControls, success: successAnimation, error: errorAnimation } = useFeedbackAnimation();
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleIdRef = useRef(0);
  
  // Magnetic effect motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const magnetX = useTransform(mouseX, [-100, 100], [-8, 8]);
  const magnetY = useTransform(mouseY, [-100, 100], [-8, 8]);
  
  // Handle click with ripple effect
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    
    // Haptic feedback simulation
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    // Create ripple effect
    if (rippleEffect && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newRipple = {
        id: rippleIdRef.current++,
        x,
        y,
      };
      
      setRipples(prev => [...prev, newRipple]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
      }, 600);
    }
    
    // Trigger feedback animations
    if (success) {
      successAnimation();
    } else if (error) {
      errorAnimation();
    }
    
    onClick?.(e);
  }, [disabled, loading, hapticFeedback, rippleEffect, success, error, successAnimation, errorAnimation, onClick]);
  
  // Magnetic effect mouse handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!magneticEffect || !buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  }, [magneticEffect, mouseX, mouseY]);
  
  const handleMouseLeave = useCallback(() => {
    if (magneticEffect) {
      mouseX.set(0);
      mouseY.set(0);
    }
  }, [magneticEffect, mouseX, mouseY]);
  
  // Determine current state and content
  const getCurrentContent = () => {
    if (loading) return loadingText;
    if (success) return successText;
    if (error) return errorText;
    return children;
  };
  
  const getCurrentIcon = () => {
    if (loading) return <Loader2 className="w-4 h-4 mr-2 animate-spin" />;
    if (success) return <Check className="w-4 h-4 mr-2" />;
    if (error) return <X className="w-4 h-4 mr-2" />;
    return null;
  };
  
  return (
    <motion.div
      className="relative inline-block"
      animate={controls}
      style={magneticEffect ? { x: magnetX, y: magnetY } : undefined}
    >
      <Button
        ref={buttonRef}
        className={cn(
          'relative overflow-hidden transition-all duration-300',
          glowEffect && 'shadow-lg hover:shadow-xl',
          success && 'bg-green-600 hover:bg-green-700 border-green-600',
          error && 'bg-red-600 hover:bg-red-700 border-red-600',
          className
        )}
        disabled={disabled || loading}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        {...handlers}
        {...props}
      >
        {/* Glow effect */}
        {glowEffect && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
            animate={{ translateX: ['100%', '100%'] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
              ease: 'linear',
            }}
          />
        )}
        
        {/* Button content */}
        <motion.div
          className="flex items-center justify-center relative z-10"
          animate={feedbackControls}
          layout
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={loading ? 'loading' : success ? 'success' : error ? 'error' : 'default'}
              className="flex items-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={springPhysics.snappy}
            >
              {getCurrentIcon()}
              {getCurrentContent()}
            </motion.div>
          </AnimatePresence>
        </motion.div>
        
        {/* Ripple effects */}
        <AnimatePresence>
          {ripples.map(ripple => (
            <motion.div
              key={ripple.id}
              className="absolute rounded-full bg-white/30 pointer-events-none"
              style={{
                left: ripple.x - 10,
                top: ripple.y - 10,
                width: 20,
                height: 20,
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ scale: 4, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>
      </Button>
    </motion.div>
  );
};

// =============================================================================
// SPECIALIZED BUTTON VARIANTS
// =============================================================================

/**
 * Floating Action Button with enhanced animations
 */
interface FloatingActionButtonProps extends Omit<AnimatedButtonProps, 'variant' | 'size'> {
  icon: React.ReactNode;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  tooltip?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  position = 'bottom-right',
  tooltip,
  className,
  ...props
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };
  
  return (
    <motion.div
      className={cn('fixed z-50', positionClasses[position])}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <AnimatedButton
        size="lg"
        className={cn(
          'rounded-full w-14 h-14 p-0 shadow-lg hover:shadow-xl',
          'bg-primary hover:bg-primary/90',
          className
        )}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        glowEffect
        magneticEffect
        {...props}
      >
        {icon}
      </AnimatedButton>
      
      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && showTooltip && (
          <motion.div
            className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-black/80 text-white text-sm rounded-lg whitespace-nowrap"
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            transition={springPhysics.snappy}
          >
            {tooltip}
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/80" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/**
 * Toggle Button with state animations
 */
interface ToggleButtonProps extends Omit<AnimatedButtonProps, 'children'> {
  isToggled: boolean;
  onToggle: (toggled: boolean) => void;
  toggledContent: React.ReactNode;
  unToggledContent: React.ReactNode;
  toggledVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export const ToggleButton: React.FC<ToggleButtonProps> = ({
  isToggled,
  onToggle,
  toggledContent,
  unToggledContent,
  toggledVariant = 'default',
  variant = 'outline',
  className,
  ...props
}) => {
  return (
    <AnimatedButton
      variant={isToggled ? toggledVariant : variant}
      className={cn(
        'transition-all duration-300',
        isToggled && 'shadow-md',
        className
      )}
      onClick={() => onToggle(!isToggled)}
      {...props}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isToggled ? 'toggled' : 'untoggled'}
          initial={{ opacity: 0, rotateY: -90 }}
          animate={{ opacity: 1, rotateY: 0 }}
          exit={{ opacity: 0, rotateY: 90 }}
          transition={{ duration: 0.2 }}
        >
          {isToggled ? toggledContent : unToggledContent}
        </motion.div>
      </AnimatePresence>
    </AnimatedButton>
  );
};

/**
 * Progress Button with loading bar
 */
interface ProgressButtonProps extends AnimatedButtonProps {
  progress?: number; // 0-100
  showProgress?: boolean;
}

export const ProgressButton: React.FC<ProgressButtonProps> = ({
  progress = 0,
  showProgress = false,
  children,
  className,
  ...props
}) => {
  return (
    <AnimatedButton
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      {/* Progress bar */}
      {showProgress && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/40"
          initial={{ x: '-100%' }}
          animate={{ x: `${progress - 100}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      )}
      
      {/* Content */}
      <span className="relative z-10">{children}</span>
    </AnimatedButton>
  );
};