import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedDashboardCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: LucideIcon;
  iconColor?: string;
  delay?: number;
  onClick?: () => void;
}

export const AnimatedDashboardCard: React.FC<AnimatedDashboardCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  iconColor = 'text-primary',
  delay = 0,
  onClick
}) => {
  const getTrendIcon = () => {
    if (!change) return null;
    if (change > 0) return <TrendingUp className="w-4 h-4" />;
    if (change < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (!change) return 'text-muted-foreground';
    if (change > 0) return 'text-success';
    if (change < 0) return 'text-error';
    return 'text-muted-foreground';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <GlassCard 
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          "hover:shadow-lg hover-glow cursor-pointer",
          onClick && "cursor-pointer"
        )}
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={`${title}: ${typeof value === 'number' ? value : value.toString()}`}
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
          if (!onClick) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {/* Background gradient animation */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), hsl(var(--primary) / 0.1) 0%, transparent 50%)'
          }}
        />

        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            {Icon && (
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Icon className={cn("w-5 h-5", iconColor)} />
              </motion.div>
            )}
          </div>

          {/* Value */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              delay: delay + 0.2, 
              type: 'spring', 
              stiffness: 200,
              damping: 20
            }}
          >
            <p className="text-3xl font-bold gradient-text">
              {value}
            </p>
          </motion.div>

          {/* Trend */}
          {change !== undefined && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.4, duration: 0.3 }}
              className={cn("flex items-center mt-3 space-x-1", getTrendColor())}
            >
              {getTrendIcon()}
              <span className="text-sm font-medium">
                {Math.abs(change)}%
              </span>
              <span className="text-xs text-muted-foreground">
                from last period
              </span>
            </motion.div>
          )}

          {/* Animated border on hover */}
          <motion.div
            className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100"
            style={{
              background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.3), transparent)',
              backgroundSize: '200% 100%',
            }}
            animate={{
              backgroundPosition: ['200% 0', '-200% 0']
            }}
            transition={{
              duration: 3,
              ease: 'linear',
              repeat: Infinity,
            }}
          />
        </div>
      </GlassCard>
    </motion.div>
  );
};

// Grid component for dashboard cards with stagger animation
interface DashboardGridProps {
  children: React.ReactNode;
  columns?: number;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({ 
  children, 
  columns = 4 
}) => {
  return (
    <motion.div
      className={cn(
        "grid gap-6",
        columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        columns === 2 && "grid-cols-1 md:grid-cols-2"
      )}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
}; 