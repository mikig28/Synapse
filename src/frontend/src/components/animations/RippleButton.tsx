import React, { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  magnetic?: boolean;
  ripple?: boolean;
  loading?: boolean;
}

export const RippleButton: React.FC<RippleButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  magnetic = true,
  ripple = true,
  loading = false,
  onClick,
  disabled,
  ...props
}) => {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Magnetic hover effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 30 });
  const springY = useSpring(y, { stiffness: 300, damping: 30 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!magnetic || !buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = (e.clientX - centerX) * 0.3;
    const deltaY = (e.clientY - centerY) * 0.3;
    
    x.set(deltaX);
    y.set(deltaY);
  }, [magnetic, x, y]);

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    
    // Create ripple effect
    if (ripple && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const rippleX = e.clientX - rect.left;
      const rippleY = e.clientY - rect.top;
      
      const newRipple = {
        id: Date.now(),
        x: rippleX,
        y: rippleY,
      };
      
      setRipples(prev => [...prev, newRipple]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 600);
    }
    
    onClick?.(e);
  }, [disabled, loading, ripple, onClick]);

  const baseClasses = cn(
    "relative overflow-hidden rounded-lg font-medium transition-all duration-200",
    "focus:outline-none focus:ring-2 focus:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "active:scale-95"
  );

  const variantClasses = {
    primary: "bg-primary text-primary-foreground hover:bg-primary-hover focus:ring-primary",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-hover focus:ring-secondary",
    ghost: "bg-transparent text-foreground hover:bg-muted focus:ring-muted",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive"
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };

  return (
    <motion.button
      ref={buttonRef}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      disabled={disabled || loading}
      whileHover={{ scale: magnetic ? 1.05 : 1.02 }}
      whileTap={{ scale: 0.95 }}
      {...props}
    >
      {/* Button content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading && (
          <motion.div
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        )}
        {children}
      </span>

      {/* Ripple effects */}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="absolute bg-white/30 rounded-full pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
          }}
          initial={{ width: 0, height: 0, x: '-50%', y: '-50%' }}
          animate={{ width: 300, height: 300, opacity: [1, 0] }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}

      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 rounded-lg opacity-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${
            variant === 'primary' ? 'hsl(var(--primary) / 0.3)' :
            variant === 'secondary' ? 'hsl(var(--secondary) / 0.3)' :
            variant === 'destructive' ? 'hsl(var(--destructive) / 0.3)' :
            'hsl(var(--foreground) / 0.1)'
          } 0%, transparent 70%)`
        }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.button>
  );
}; 