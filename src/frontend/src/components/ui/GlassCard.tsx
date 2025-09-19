import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  contentClassName?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  glowColor = 'rgba(99, 102, 241, 0.15)',
  blur = 'md',
  hover = true,
  contentClassName,
  ...props
}) => {
  const blurClasses = {
    sm: 'backdrop-blur-none sm:backdrop-blur-sm',
    md: 'backdrop-blur-sm sm:backdrop-blur-md',
    lg: 'backdrop-blur-md sm:backdrop-blur-lg',
    xl: 'backdrop-blur-lg sm:backdrop-blur-xl',
  };

  const hoverAnimation = hover ? {
    whileHover: { 
      y: -4, 
      scale: 1.02,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 20 
      }
    },
    whileTap: { 
      scale: 0.98,
      transition: { 
        type: "spring", 
        stiffness: 400, 
        damping: 25 
      }
    }
  } : {};

  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-white/20 dark:bg-white/10 sm:bg-white/10 sm:dark:bg-white/5",
        blurClasses[blur],
        "border border-white/20 dark:border-white/10",
        "shadow-xl",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      {...hoverAnimation}
      {...props}
    >
      {/* Gradient glow effect */}
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 hover:opacity-30 sm:hover:opacity-100"
        style={{
          background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${glowColor}, transparent 60%)`,
        }}
      />

      {/* Content */}
      <div className={cn('relative z-10', contentClassName)}>
        {children}
      </div>

      {/* Noise texture overlay for glass effect */}
      <div
        className="absolute inset-0 opacity-[0.007] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </motion.div>
  );
};

// Example usage with mouse tracking for glow effect
export const GlassCardWithGlow: React.FC<GlassCardProps> = (props) => {
  const cardRef = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    cardRef.current.style.setProperty('--mouse-x', `${x}%`);
    cardRef.current.style.setProperty('--mouse-y', `${y}%`);
  };

  return (
    <div ref={cardRef} onMouseMove={handleMouseMove}>
      <GlassCard {...props} />
    </div>
  );
}; 