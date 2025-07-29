/**
 * Loading State Animations and Skeleton Components
 * Elegant loading states with smooth transitions
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  skeletonVariants, 
  loadingVariants, 
  cardVariants,
  animationConfig,
  springPhysics 
} from '@/utils/animations';
import { useLoadingAnimation } from '@/hooks/useAnimations';

// =============================================================================
// SKELETON COMPONENTS
// =============================================================================

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
  width?: string | number;
  height?: string | number;
}

/**
 * Base skeleton component with customizable animations
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  animation = 'pulse',
  width,
  height,
}) => {
  const variantClasses = {
    text: 'rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <motion.div
      className={cn(
        'bg-muted/60',
        variantClasses[variant],
        className
      )}
      style={style}
      variants={skeletonVariants}
      animate={animation === 'none' ? 'loaded' : 'loading'}
    >
      {animation === 'wave' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}
    </motion.div>
  );
};

/**
 * Text skeleton with realistic proportions
 */
interface TextSkeletonProps {
  lines?: number;
  className?: string;
  animation?: 'pulse' | 'wave' | 'none';
}

export const TextSkeleton: React.FC<TextSkeletonProps> = ({
  lines = 3,
  className,
  animation = 'pulse',
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          animation={animation}
          className="h-4"
          width={
            index === lines - 1 ? '75%' : 
            index === 0 ? '90%' : 
            '100%'
          }
        />
      ))}
    </div>
  );
};

/**
 * Card skeleton with realistic layout
 */
interface CardSkeletonProps {
  showAvatar?: boolean;
  showImage?: boolean;
  showActions?: boolean;
  className?: string;
  animation?: 'pulse' | 'wave' | 'none';
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  showAvatar = true,
  showImage = false,
  showActions = true,
  className,
  animation = 'pulse',
}) => {
  return (
    <motion.div
      className={cn(
        'p-6 space-y-4 bg-card border rounded-lg',
        className
      )}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header with avatar */}
      {showAvatar && (
        <div className="flex items-center space-x-3">
          <Skeleton
            variant="circular"
            width={40}
            height={40}
            animation={animation}
          />
          <div className="space-y-2 flex-1">
            <Skeleton
              variant="text"
              width="60%"
              height={16}
              animation={animation}
            />
            <Skeleton
              variant="text"
              width="40%"
              height={12}
              animation={animation}
            />
          </div>
        </div>
      )}

      {/* Image */}
      {showImage && (
        <Skeleton
          variant="rounded"
          height={200}
          animation={animation}
          className="w-full"
        />
      )}

      {/* Content */}
      <TextSkeleton lines={3} animation={animation} />

      {/* Actions */}
      {showActions && (
        <div className="flex space-x-2 pt-2">
          <Skeleton
            variant="rounded"
            width={80}
            height={32}
            animation={animation}
          />
          <Skeleton
            variant="rounded"
            width={80}
            height={32}
            animation={animation}
          />
        </div>
      )}
    </motion.div>
  );
};

/**
 * Agent card skeleton matching the real component
 */
export const AgentCardSkeleton: React.FC<{
  className?: string;
  animation?: 'pulse' | 'wave' | 'none';
}> = ({ className, animation = 'pulse' }) => {
  return (
    <motion.div
      className={cn(
        'p-6 space-y-4 bg-card border-2 rounded-xl',
        className
      )}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton
            variant="rounded"
            width={48}
            height={48}
            animation={animation}
          />
          <div className="space-y-2">
            <Skeleton
              variant="text"
              width={120}
              height={18}
              animation={animation}
            />
            <Skeleton
              variant="text"
              width={100}
              height={14}
              animation={animation}
            />
          </div>
        </div>
        <Skeleton
          variant="rounded"
          width={60}
          height={24}
          animation={animation}
        />
      </div>

      {/* Description */}
      <TextSkeleton lines={2} animation={animation} />

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="text-center p-3 rounded-lg border">
            <Skeleton
              variant="text"
              width={24}
              height={20}
              animation={animation}
              className="mx-auto mb-2"
            />
            <Skeleton
              variant="text"
              width={40}
              height={12}
              animation={animation}
              className="mx-auto"
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Skeleton
          variant="rounded"
          className="flex-1 h-9"
          animation={animation}
        />
        <Skeleton
          variant="rounded"
          width={40}
          height={36}
          animation={animation}
        />
      </div>
    </motion.div>
  );
};

// =============================================================================
// LOADING SPINNERS AND INDICATORS
// =============================================================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'bars' | 'pulse';
  className?: string;
  color?: string;
}

/**
 * Enhanced loading spinner with multiple variants
 */
export const LoadingSpinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'spinner',
  className,
  color = 'currentColor',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const sizeValues = {
    sm: 16,
    md: 32,
    lg: 48,
  };

  if (variant === 'spinner') {
    return (
      <motion.div
        className={cn(
          'border-2 border-current border-t-transparent rounded-full',
          sizeClasses[size],
          className
        )}
        style={{ color }}
        variants={loadingVariants}
        animate="spin"
      />
    );
  }

  if (variant === 'dots') {
    return (
      <div className={cn('flex space-x-1', className)}>
        {Array.from({ length: 3 }).map((_, index) => (
          <motion.div
            key={index}
            className={cn(
              'rounded-full bg-current',
              size === 'sm' ? 'w-1.5 h-1.5' : 
              size === 'md' ? 'w-2 h-2' : 
              'w-3 h-3'
            )}
            style={{ color }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: index * 0.1,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'bars') {
    return (
      <div className={cn('flex items-end space-x-1', className)}>
        {Array.from({ length: 4 }).map((_, index) => (
          <motion.div
            key={index}
            className="bg-current rounded-sm"
            style={{ 
              color,
              width: size === 'sm' ? 2 : size === 'md' ? 3 : 4,
              height: sizeValues[size] / 2,
            }}
            animate={{
              scaleY: [1, 2, 1],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: index * 0.1,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <motion.div
        className={cn(
          'bg-current rounded-full',
          sizeClasses[size],
          className
        )}
        style={{ color }}
        variants={loadingVariants}
        animate="pulse"
      />
    );
  }

  return null;
};

/**
 * Loading overlay with backdrop
 */
interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  variant?: 'spinner' | 'dots' | 'bars' | 'pulse';
  blur?: boolean;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Loading...',
  variant = 'spinner',
  blur = true,
  className,
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center',
            blur ? 'bg-background/80 backdrop-blur-sm' : 'bg-background/90',
            className
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="flex flex-col items-center space-y-4 p-6 rounded-lg bg-card shadow-lg"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={springPhysics.gentle}
          >
            <LoadingSpinner size="lg" variant={variant} />
            {message && (
              <p className="text-sm font-medium text-muted-foreground">
                {message}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// =============================================================================
// PROGRESSIVE LOADING COMPONENTS
// =============================================================================

/**
 * Progressive image loading with skeleton
 */
interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className,
  skeletonClassName,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <AnimatePresence>
        {!isLoaded && !hasError && (
          <motion.div
            className="absolute inset-0"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Skeleton
              variant="rectangular"
              className={cn('w-full h-full', skeletonClassName)}
              animation="wave"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.img
        src={src}
        alt={alt}
        className={cn('w-full h-full object-cover', className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        onLoad={handleLoad}
        onError={handleError}
      />

      {hasError && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-muted/60 text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <span className="text-sm">Failed to load image</span>
        </motion.div>
      )}
    </div>
  );
};

/**
 * Skeleton grid for loading states
 */
interface SkeletonGridProps {
  items: number;
  columns?: number;
  gap?: number;
  itemClassName?: string;
  className?: string;
  renderItem?: (index: number) => React.ReactNode;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({
  items,
  columns = 3,
  gap = 4,
  itemClassName,
  className,
  renderItem,
}) => {
  return (
    <motion.div
      className={cn(
        'grid gap-4',
        `grid-cols-${columns}`,
        `gap-${gap}`,
        className
      )}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: animationConfig.stagger.cards,
          },
        },
      }}
      initial="hidden"
      animate="visible"
    >
      {Array.from({ length: items }).map((_, index) => (
        <motion.div
          key={index}
          variants={cardVariants}
          className={itemClassName}
        >
          {renderItem ? renderItem(index) : <CardSkeleton />}
        </motion.div>
      ))}
    </motion.div>
  );
};

/**
 * Morphing loader that transitions between states
 */
interface MorphingLoaderProps {
  states: Array<{
    id: string;
    component: React.ReactNode;
    duration?: number;
  }>;
  autoPlay?: boolean;
  className?: string;
}

export const MorphingLoader: React.FC<MorphingLoaderProps> = ({
  states,
  autoPlay = true,
  className,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!autoPlay || states.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % states.length);
    }, states[currentIndex]?.duration || 2000);

    return () => clearInterval(interval);
  }, [autoPlay, states, currentIndex]);

  return (
    <div className={cn('relative', className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={states[currentIndex]?.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          transition={springPhysics.gentle}
        >
          {states[currentIndex]?.component}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};