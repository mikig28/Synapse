import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from './GlassCard';
import { Button } from './button';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: 'default' | 'outline' | 'ghost';
  primary?: boolean;
}

interface EmptyStateGuidanceProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  className?: string;
  iconClassName?: string;
  suggestions?: string[];
}

export const EmptyStateGuidance: React.FC<EmptyStateGuidanceProps> = ({
  icon: Icon,
  title,
  description,
  actions = [],
  className,
  iconClassName,
  suggestions = [],
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn('flex items-center justify-center min-h-[400px] p-8', className)}
    >
      <GlassCard className="max-w-2xl w-full text-center p-12">
        {/* Animated Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
          className="flex justify-center mb-6"
        >
          <div className={cn(
            'p-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20',
            'backdrop-blur-sm border border-primary/20',
            iconClassName
          )}>
            <Icon className="w-12 h-12 text-primary" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-2xl font-bold mb-3 gradient-text"
        >
          {title}
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-muted-foreground text-base mb-8 max-w-md mx-auto"
        >
          {description}
        </motion.p>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="mb-8 text-left max-w-md mx-auto"
          >
            <p className="text-sm font-semibold text-foreground mb-3">Get started by:</p>
            <ul className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1, duration: 0.3 }}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="text-primary mt-0.5">•</span>
                  <span>{suggestion}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            {actions.map((action, index) => {
              const ActionIcon = action.icon;
              const isPrimary = action.primary ?? index === 0;

              return (
                <Button
                  key={index}
                  onClick={action.onClick}
                  variant={action.variant ?? (isPrimary ? 'default' : 'outline')}
                  size="lg"
                  className={cn(
                    'gap-2 transition-all duration-200',
                    isPrimary && 'shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30'
                  )}
                >
                  {ActionIcon && <ActionIcon className="w-4 h-4" />}
                  {action.label}
                </Button>
              );
            })}
          </motion.div>
        )}

        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.15, 0.1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.1, 0.15, 0.1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
            className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-accent/10 rounded-full blur-3xl"
          />
        </div>
      </GlassCard>
    </motion.div>
  );
};
