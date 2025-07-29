/**
 * Animated Data Visualization Components
 * Premium animated charts, metrics, and data displays
 * Includes counting animations, progress bars, and interactive elements
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAnimationContext } from '@/contexts/AnimationContext';
import { useCountAnimation, useChartAnimation } from '@/hooks/useAnimations';
import { 
  springPhysics,
  createTransition,
  animationConfig,
  chartElementVariants,
  metricVariants
} from '@/utils/animations';
import { TrendingUp, TrendingDown, Activity, BarChart3, PieChart, LineChart } from 'lucide-react';

// =============================================================================
// ANIMATED COUNTER
// =============================================================================

interface AnimatedCounterProps {
  value: number;
  previousValue?: number;
  duration?: number;
  format?: (value: number) => string;
  prefix?: string;
  suffix?: string;
  className?: string;
  trend?: 'up' | 'down' | 'neutral';
  showTrend?: boolean;
  onAnimationComplete?: () => void;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  previousValue,
  duration = 1500,
  format = (v) => Math.round(v).toLocaleString(),
  prefix = '',
  suffix = '',
  className,
  trend = 'neutral',
  showTrend = false,
  onAnimationComplete,
}) => {
  const { preferences } = useAnimationContext();
  const { count, isAnimating, animate } = useCountAnimation(
    value,
    duration,
    previousValue || 0,
    format
  );

  useEffect(() => {
    if (preferences.enableAnimations) {
      animate();
    }
  }, [value, animate, preferences.enableAnimations]);

  useEffect(() => {
    if (!isAnimating && onAnimationComplete) {
      onAnimationComplete();
    }
  }, [isAnimating, onAnimationComplete]);

  const trendColor = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-muted-foreground',
  };

  const TrendIcon = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Activity,
  }[trend];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <motion.span
        className="font-mono font-bold tabular-nums"
        animate={
          isAnimating && preferences.enableAnimations
            ? {
                scale: [1, 1.05, 1],
                transition: { duration: 0.3, ease: 'easeOut' },
              }
            : undefined
        }
      >
        {prefix}
        {count}
        {suffix}
      </motion.span>
      
      {showTrend && previousValue !== undefined && (
        <motion.div
          className={cn("flex items-center gap-1 text-sm", trendColor[trend])}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: duration / 1000 / 2 }}
        >
          <TrendIcon className="w-3 h-3" />
          <span className="font-medium">
            {Math.abs(((value - previousValue) / previousValue) * 100).toFixed(1)}%
          </span>
        </motion.div>
      )}
    </div>
  );
};

// =============================================================================
// ANIMATED PROGRESS RING
// =============================================================================

interface AnimatedProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showValue?: boolean;
  animationDuration?: number;
  className?: string;
  children?: React.ReactNode;
}

export const AnimatedProgressRing: React.FC<AnimatedProgressRingProps> = ({
  progress,
  size = 100,
  strokeWidth = 8,
  color = 'hsl(var(--primary))',
  backgroundColor = 'hsl(var(--muted))',
  showValue = true,
  animationDuration = 1000,
  className,
  children,
}) => {
  const { preferences } = useAnimationContext();
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

  useEffect(() => {
    if (!preferences.enableAnimations) {
      setAnimatedProgress(progress);
      return;
    }

    const startTime = performance.now();
    const startValue = animatedProgress;
    const endValue = progress;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progressValue = Math.min(elapsed / animationDuration, 1);
      
      // Easing function
      const easedProgress = 1 - Math.pow(1 - progressValue, 3);
      const currentValue = startValue + (endValue - startValue) * easedProgress;
      
      setAnimatedProgress(currentValue);
      
      if (progressValue < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [progress, animationDuration, preferences.enableAnimations, animatedProgress]);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Progress Circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          animate={
            preferences.enableAnimations
              ? {
                  strokeDashoffset,
                  transition: {
                    duration: animationDuration / 1000,
                    ease: 'easeOut',
                  },
                }
              : undefined
          }
        />
      </svg>
      
      {/* Center Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (showValue && (
          <motion.span
            className="text-lg font-bold"
            key={Math.round(animatedProgress)}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springPhysics.bouncy}
          >
            {Math.round(animatedProgress)}%
          </motion.span>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// ANIMATED BAR CHART
// =============================================================================

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface AnimatedBarChartProps {
  data: BarData[];
  height?: number;
  showValues?: boolean;
  showLabels?: boolean;
  animationDelay?: number;
  className?: string;
}

export const AnimatedBarChart: React.FC<AnimatedBarChartProps> = ({
  data,
  height = 200,
  showValues = true,
  showLabels = true,
  animationDelay = 100,
  className,
}) => {
  const { preferences } = useAnimationContext();
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * (height - 40);
          const barColor = item.color || 'hsl(var(--primary))';
          
          return (
            <div
              key={item.label}
              className="flex-1 flex flex-col items-center gap-2"
            >
              {/* Value Label */}
              {showValues && (
                <AnimatePresence>
                  <motion.div
                    className="text-xs font-medium text-muted-foreground"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: preferences.enableAnimations ? (index * animationDelay) / 1000 + 0.5 : 0,
                    }}
                  >
                    {item.value.toLocaleString()}
                  </motion.div>
                </AnimatePresence>
              )}
              
              {/* Bar */}
              <motion.div
                className="w-full rounded-t-md relative overflow-hidden"
                style={{
                  backgroundColor: barColor,
                  minHeight: '4px',
                }}
                initial={{ height: 0 }}
                animate={{ height: barHeight }}
                transition={{
                  duration: preferences.enableAnimations ? 0.8 : 0,
                  delay: preferences.enableAnimations ? (index * animationDelay) / 1000 : 0,
                  ease: 'easeOut',
                }}
              >
                {/* Shimmer Effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{
                    duration: 1.5,
                    delay: preferences.enableAnimations ? (index * animationDelay) / 1000 + 0.2 : 0,
                    ease: 'easeInOut',
                  }}
                />
              </motion.div>
              
              {/* Label */}
              {showLabels && (
                <motion.div
                  className="text-xs text-center text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    delay: preferences.enableAnimations ? (index * animationDelay) / 1000 + 0.3 : 0,
                  }}
                >
                  {item.label}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// ANIMATED METRIC CARD
// =============================================================================

interface AnimatedMetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  format?: (value: number) => string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  color?: string;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
  showSparkline?: boolean;
  sparklineData?: number[];
}

export const AnimatedMetricCard: React.FC<AnimatedMetricCardProps> = ({
  title,
  value,
  previousValue,
  format = (v) => v.toLocaleString(),
  trend = 'neutral',
  icon,
  color = 'hsl(var(--primary))',
  subtitle,
  className,
  onClick,
  showSparkline = false,
  sparklineData = [],
}) => {
  const { preferences } = useAnimationContext();
  const [isHovered, setIsHovered] = useState(false);

  const cardVariants = {
    hover: {
      scale: 1.02,
      y: -2,
      transition: springPhysics.gentle,
    },
    tap: {
      scale: 0.98,
      transition: springPhysics.snappy,
    },
  };

  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-muted-foreground',
  };

  const backgroundGradient = isHovered 
    ? `linear-gradient(135deg, ${color}10, ${color}05)`
    : 'transparent';

  return (
    <motion.div
      className={cn(
        "relative p-6 rounded-xl border bg-card cursor-pointer overflow-hidden",
        onClick && "hover:shadow-lg transition-shadow",
        className
      )}
      variants={onClick ? cardVariants : undefined}
      whileHover={onClick && preferences.enableAnimations ? "hover" : undefined}
      whileTap={onClick && preferences.enableAnimations ? "tap" : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      style={{ background: backgroundGradient }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div 
          className="w-32 h-32 rounded-full absolute -top-16 -right-16"
          style={{ background: color }}
        />
      </div>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {icon && (
          <motion.div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${color}20`, color }}
            animate={
              isHovered && preferences.enableAnimations
                ? { rotate: 5, scale: 1.1 }
                : { rotate: 0, scale: 1 }
            }
            transition={springPhysics.gentle}
          >
            {icon}
          </motion.div>
        )}
      </div>
      
      {/* Main Value */}
      <div className="mb-2">
        <AnimatedCounter
          value={value}
          previousValue={previousValue}
          format={format}
          className="text-2xl font-bold"
        />
        
        {subtitle && (
          <motion.p
            className="text-sm text-muted-foreground mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {subtitle}
          </motion.p>
        )}
      </div>
      
      {/* Trend Indicator */}
      {previousValue !== undefined && (
        <motion.div
          className={cn("flex items-center gap-1", trendColors[trend])}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          {trend === 'up' ? (
            <TrendingUp className="w-3 h-3" />
          ) : trend === 'down' ? (
            <TrendingDown className="w-3 h-3" />
          ) : (
            <Activity className="w-3 h-3" />
          )}
          <span className="text-xs font-medium">
            {Math.abs(((value - previousValue) / previousValue) * 100).toFixed(1)}%
          </span>
          <span className="text-xs text-muted-foreground">vs last period</span>
        </motion.div>
      )}
      
      {/* Sparkline */}
      {showSparkline && sparklineData.length > 0 && (
        <motion.div
          className="mt-4 h-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <MiniSparkline data={sparklineData} color={color} />
        </motion.div>
      )}
    </motion.div>
  );
};

// =============================================================================
// MINI SPARKLINE
// =============================================================================

interface MiniSparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  color = 'hsl(var(--primary))',
  height = 32,
}) => {
  const { preferences } = useAnimationContext();
  const svgRef = useRef<SVGSVGElement>(null);
  
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = ((maxValue - value) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg
      ref={svgRef}
      width="100%"
      height={height}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      <motion.polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          duration: preferences.enableAnimations ? 1 : 0,
          ease: 'easeOut',
        }}
      />
      
      {/* Gradient Fill */}
      <defs>
        <linearGradient id="sparkline-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      <motion.polygon
        fill="url(#sparkline-gradient)"
        points={`${points} 100,100 0,100`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: preferences.enableAnimations ? 0.8 : 0,
          delay: preferences.enableAnimations ? 0.3 : 0,
        }}
      />
    </svg>
  );
};

// =============================================================================
// ANIMATED STATS GRID
// =============================================================================

interface StatsGridProps {
  stats: Array<{
    title: string;
    value: number;
    previousValue?: number;
    format?: (value: number) => string;
    trend?: 'up' | 'down' | 'neutral';
    icon?: React.ReactNode;
    color?: string;
  }>;
  columns?: number;
  className?: string;
}

export const AnimatedStatsGrid: React.FC<StatsGridProps> = ({
  stats,
  columns = 3,
  className,
}) => {
  const { preferences } = useAnimationContext();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: preferences.enableAnimations ? 0.1 : 0,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: springPhysics.bouncy,
    },
  };

  return (
    <motion.div
      className={cn(
        "grid gap-6",
        {
          'grid-cols-1': columns === 1,
          'grid-cols-2': columns === 2,
          'grid-cols-3': columns === 3,
          'grid-cols-4': columns === 4,
        },
        className
      )}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {stats.map((stat, index) => (
        <motion.div key={index} variants={itemVariants}>
          <AnimatedMetricCard {...stat} />
        </motion.div>
      ))}
    </motion.div>
  );
};