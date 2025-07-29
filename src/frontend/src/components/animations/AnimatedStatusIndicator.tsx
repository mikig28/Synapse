/**
 * Animated Status Indicators
 * Smooth status transitions with visual feedback and micro-animations
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  statusVariants, 
  springPhysics, 
  animationConfig,
  createTransition 
} from '@/utils/animations';
import { useStatusAnimation } from '@/hooks/useAnimations';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Loader2, 
  Pause, 
  Play,
  Zap,
  Activity
} from 'lucide-react';

// =============================================================================
// CORE STATUS INDICATOR
// =============================================================================

type StatusType = 'idle' | 'running' | 'completed' | 'error' | 'paused' | 'warning';

interface StatusIndicatorProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  showPulse?: boolean;
  showGlow?: boolean;
  className?: string;
  onStatusChange?: (status: StatusType) => void;
}

const statusConfig = {
  idle: {
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    glowColor: 'shadow-gray-500/20',
    icon: Clock,
    label: 'Idle',
  },
  running: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    glowColor: 'shadow-blue-500/30',
    icon: Loader2,
    label: 'Running',
  },
  completed: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    glowColor: 'shadow-green-500/30',
    icon: CheckCircle,
    label: 'Completed',
  },
  error: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    glowColor: 'shadow-red-500/30',
    icon: AlertCircle,
    label: 'Error',
  },
  paused: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
    glowColor: 'shadow-yellow-500/30',
    icon: Pause,
    label: 'Paused',
  },
  warning: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    glowColor: 'shadow-orange-500/30',
    icon: AlertCircle,
    label: 'Warning',
  },
};

const sizeConfig = {
  sm: {
    container: 'w-6 h-6',
    icon: 'w-3 h-3',
    text: 'text-xs',
  },
  md: {
    container: 'w-8 h-8',
    icon: 'w-4 h-4',
    text: 'text-sm',
  },
  lg: {
    container: 'w-12 h-12',
    icon: 'w-6 h-6',
    text: 'text-base',
  },
};

/**
 * Enhanced status indicator with smooth transitions
 */
export const AnimatedStatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  showLabel = true,
  label,
  showPulse = true,
  showGlow = false,
  className,
  onStatusChange,
}) => {
  const { controls, changeStatus } = useStatusAnimation(status);
  const [previousStatus, setPreviousStatus] = useState<StatusType>(status);
  
  const config = statusConfig[status];
  const sizeProps = sizeConfig[size];
  const IconComponent = config.icon;
  
  // Handle status changes
  useEffect(() => {
    if (status !== previousStatus) {
      changeStatus(status);
      setPreviousStatus(status);
      onStatusChange?.(status);
    }
  }, [status, previousStatus, changeStatus, onStatusChange]);
  
  return (
    <motion.div
      className={cn('flex items-center gap-2', className)}
      animate={controls}
    >
      {/* Status Icon Container */}
      <motion.div
        className={cn(
          'relative rounded-full flex items-center justify-center border',
          sizeProps.container,
          config.bgColor,
          config.borderColor,
          showGlow && `shadow-lg ${config.glowColor}`
        )}
        variants={statusVariants}
        animate={showPulse ? status : 'idle'}
        whileHover={{ scale: 1.1 }}
        transition={springPhysics.gentle}
      >
        {/* Animated Icon */}
        <motion.div
          key={status}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          transition={springPhysics.bouncy}
        >
          <IconComponent 
            className={cn(
              sizeProps.icon, 
              config.color,
              status === 'running' && 'animate-spin'
            )}
          />
        </motion.div>
        
        {/* Status glow effect */}
        {showGlow && (
          <motion.div
            className={cn(
              'absolute inset-0 rounded-full',
              config.bgColor,
              'opacity-20'
            )}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </motion.div>
      
      {/* Status Label */}
      {showLabel && (
        <AnimatePresence mode="wait">
          <motion.span
            key={status}
            className={cn(
              'font-medium',
              sizeProps.text,
              config.color
            )}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={springPhysics.snappy}
          >
            {label || config.label}
          </motion.span>
        </AnimatePresence>
      )}
    </motion.div>
  );
};

// =============================================================================
// SPECIALIZED STATUS COMPONENTS
// =============================================================================

/**
 * Connection Status Indicator
 */
interface ConnectionStatusProps {
  isConnected: boolean;
  showBandwidth?: boolean;
  bandwidth?: number;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  showBandwidth = false,
  bandwidth = 0,
  className,
}) => {
  const [dots, setDots] = useState(0);
  
  // Animate connection dots
  useEffect(() => {
    if (!isConnected) {
      const interval = setInterval(() => {
        setDots(prev => (prev + 1) % 4);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isConnected]);
  
  return (
    <motion.div
      className={cn('flex items-center gap-3', className)}
      layout
    >
      {/* Connection Indicator */}
      <motion.div
        className="flex items-center gap-2"
        animate={isConnected ? 'connected' : 'disconnected'}
        variants={{
          connected: { opacity: 1 },
          disconnected: { opacity: 0.7 },
        }}
      >
        {/* Signal Bars */}
        <div className="flex items-end gap-0.5">
          {[1, 2, 3, 4].map((bar) => (
            <motion.div
              key={bar}
              className={cn(
                'w-1 rounded-sm',
                isConnected ? 'bg-green-500' : 'bg-gray-400'
              )}
              style={{ height: `${bar * 3 + 2}px` }}
              animate={isConnected ? 'connected' : 'disconnected'}
              variants={{
                connected: {
                  opacity: 1,
                  scale: 1,
                },
                disconnected: {
                  opacity: bar <= 1 ? 1 : 0.3,
                  scale: bar <= 1 ? 1 : 0.8,
                },
              }}
              transition={{
                delay: bar * 0.1,
                ...springPhysics.gentle,
              }}
            />
          ))}
        </div>
        
        {/* Status Text */}
        <motion.span
          className={cn(
            'text-sm font-medium',
            isConnected ? 'text-green-600' : 'text-gray-500'
          )}
          layout
        >
          {isConnected ? 'Connected' : `Connecting${'.'.repeat(dots)}`}
        </motion.span>
      </motion.div>
      
      {/* Bandwidth Indicator */}
      {showBandwidth && isConnected && (
        <motion.div
          className="flex items-center gap-1 text-xs text-gray-600"
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 'auto' }}
          transition={springPhysics.gentle}
        >
          <Activity className="w-3 h-3" />
          <span>{bandwidth} Mbps</span>
        </motion.div>
      )}
    </motion.div>
  );
};

/**
 * Progress Status with animated bar
 */
interface ProgressStatusProps {
  progress: number; // 0-100
  status: StatusType;
  showPercentage?: boolean;
  showETA?: boolean;
  eta?: string;
  className?: string;
}

export const ProgressStatus: React.FC<ProgressStatusProps> = ({
  progress,
  status,
  showPercentage = true,
  showETA = false,
  eta,
  className,
}) => {
  return (
    <motion.div
      className={cn('flex items-center gap-3 w-full', className)}
      layout
    >
      {/* Status Indicator */}
      <AnimatedStatusIndicator
        status={status}
        size="sm"
        showLabel={false}
        showPulse={status === 'running'}
      />
      
      {/* Progress Bar */}
      <div className="flex-1 space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">
            {statusConfig[status].label}
          </span>
          {showPercentage && (
            <motion.span
              className="text-sm text-gray-600"
              key={progress}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={springPhysics.snappy}
            >
              {Math.round(progress)}%
            </motion.span>
          )}
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className={cn(
              'h-2 rounded-full',
              status === 'error' ? 'bg-red-500' :
              status === 'completed' ? 'bg-green-500' :
              'bg-blue-500'
            )}
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{
              duration: 0.5,
              ease: 'easeOut',
            }}
          />
        </div>
        
        {/* ETA */}
        {showETA && eta && (
          <motion.div
            className="text-xs text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            ETA: {eta}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Multi-step Status Indicator
 */
interface StepStatusProps {
  steps: Array<{
    id: string;
    label: string;
    status: StatusType;
    description?: string;
  }>;
  currentStep: number;
  showConnections?: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const MultiStepStatus: React.FC<StepStatusProps> = ({
  steps,
  currentStep,
  showConnections = true,
  orientation = 'horizontal',
  className,
}) => {
  return (
    <motion.div
      className={cn(
        'flex gap-4',
        orientation === 'vertical' ? 'flex-col' : 'flex-row items-center',
        className
      )}
      layout
    >
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          {/* Step Indicator */}
          <motion.div
            className={cn(
              'relative',
              orientation === 'vertical' ? 'flex items-start gap-3' : 'flex flex-col items-center gap-2'
            )}
            variants={{
              active: { scale: 1.1, opacity: 1 },
              inactive: { scale: 1, opacity: 0.6 },
              completed: { scale: 1, opacity: 1 },
            }}
            animate={
              index < currentStep ? 'completed' :
              index === currentStep ? 'active' :
              'inactive'
            }
            transition={springPhysics.gentle}
          >
            <AnimatedStatusIndicator
              status={step.status}
              size="md"
              showLabel={false}
              showPulse={index === currentStep}
              showGlow={index === currentStep}
            />
            
            <div className={cn(
              orientation === 'vertical' ? 'flex-1' : 'text-center'
            )}>
              <motion.p
                className="text-sm font-medium"
                animate={{
                  color: index <= currentStep ? '#374151' : '#9CA3AF',
                }}
              >
                {step.label}
              </motion.p>
              {step.description && (
                <motion.p
                  className="text-xs text-gray-500 mt-1"
                  animate={{
                    opacity: index <= currentStep ? 1 : 0.5,
                  }}
                >
                  {step.description}
                </motion.p>
              )}
            </div>
          </motion.div>
          
          {/* Connection Line */}
          {showConnections && index < steps.length - 1 && (
            <motion.div
              className={cn(
                'bg-gray-300',
                orientation === 'vertical' ? 'w-0.5 h-8 ml-4' : 'h-0.5 w-8'
              )}
              animate={{
                backgroundColor: index < currentStep ? '#10B981' : '#D1D5DB',
              }}
              transition={createTransition(animationConfig.timing.normal, 'smooth')}
            />
          )}
        </React.Fragment>
      ))}
    </motion.div>
  );
};

/**
 * Status Badge with animations
 */
interface StatusBadgeProps {
  status: StatusType;
  count?: number;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'subtle';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  count,
  showCount = false,
  size = 'md',
  variant = 'solid',
  className,
}) => {
  const config = statusConfig[status];
  const sizeProps = sizeConfig[size];
  
  const variantClasses = {
    solid: `${config.bgColor} ${config.color} border-transparent`,
    outline: `bg-transparent ${config.color} ${config.borderColor}`,
    subtle: `${config.bgColor} ${config.color} border-transparent opacity-80`,
  };
  
  return (
    <motion.div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full border font-medium',
        sizeProps.text,
        variantClasses[variant],
        className
      )}
      variants={statusVariants}
      animate={status}
      whileHover={{ scale: 1.05 }}
      transition={springPhysics.gentle}
    >
      <AnimatedStatusIndicator
        status={status}
        size="sm"
        showLabel={false}
        showPulse={false}
      />
      
      <span>{config.label}</span>
      
      {showCount && count !== undefined && (
        <motion.span
          className={cn(
            'px-1.5 py-0.5 rounded-full text-xs bg-white/20',
            size === 'sm' && 'px-1 py-0 text-[10px]'
          )}
          key={count}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          transition={springPhysics.bouncy}
        >
          {count}
        </motion.span>
      )}
    </motion.div>
  );
};