/**
 * Enhanced Agent Status Indicator
 * Color psychology-based status system with micro-animations
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { getAgentStatusColor } from '@/utils/designSystem';
import { statusVariants, microInteractions } from '@/utils/animations';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Pause,
  Clock,
  Zap,
  Activity,
} from 'lucide-react';

interface AgentStatusIndicatorProps {
  status: string;
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showIcon?: boolean;
  animated?: boolean;
  className?: string;
}

export const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({
  status,
  isActive = true,
  size = 'md',
  showLabel = true,
  showIcon = true,
  animated = true,
  className = '',
}) => {
  const statusColor = getAgentStatusColor(status);
  
  const sizeConfig = {
    sm: {
      icon: 'w-3 h-3',
      badge: 'text-xs px-2 py-1',
      container: 'gap-1',
    },
    md: {
      icon: 'w-4 h-4',
      badge: 'text-sm px-3 py-1',
      container: 'gap-2',
    },
    lg: {
      icon: 'w-5 h-5',
      badge: 'text-base px-4 py-2',
      container: 'gap-3',
    },
  };

  const config = sizeConfig[size];

  const getStatusIcon = () => {
    const iconClass = `${config.icon}`;
    const iconStyle = { color: statusColor.primary };

    switch (status) {
      case 'running':
        return (
          <motion.div
            variants={animated ? statusVariants : undefined}
            animate={animated ? 'running' : undefined}
            className="flex items-center"
          >
            <Loader2 className={`${iconClass} animate-spin`} style={iconStyle} />
          </motion.div>
        );
      case 'idle':
        return (
          <motion.div
            variants={animated ? statusVariants : undefined}
            animate={animated ? 'idle' : undefined}
            className="flex items-center"
          >
            <CheckCircle className={iconClass} style={iconStyle} />
          </motion.div>
        );
      case 'error':
        return (
          <motion.div
            variants={animated ? statusVariants : undefined}
            animate={animated ? 'error' : undefined}
            className="flex items-center"
          >
            <AlertCircle className={iconClass} style={iconStyle} />
          </motion.div>
        );
      case 'completed':
        return (
          <motion.div
            variants={animated ? statusVariants : undefined}
            animate={animated ? 'completed' : undefined}
            className="flex items-center"
          >
            <CheckCircle className={iconClass} style={iconStyle} />
          </motion.div>
        );
      case 'paused':
        return (
          <motion.div
            variants={animated ? statusVariants : undefined}
            animate={animated ? 'paused' : undefined}
            className="flex items-center"
          >
            <Pause className={iconClass} style={iconStyle} />
          </motion.div>
        );
      default:
        return <Clock className={iconClass} style={iconStyle} />;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'running':
        return 'Running';
      case 'idle':
        return 'Idle';
      case 'error':
        return 'Error';
      case 'completed':
        return 'Completed';
      case 'paused':
        return 'Paused';
      default:
        return 'Unknown';
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case 'running':
        return 'Agent is actively processing tasks';
      case 'idle':
        return 'Agent is ready and waiting for tasks';
      case 'error':
        return 'Agent encountered an error';
      case 'completed':
        return 'Agent completed its last task successfully';
      case 'paused':
        return 'Agent is temporarily paused';
      default:
        return 'Agent status is unknown';
    }
  };

  const getPulseAnimation = () => {
    if (!animated) return {};
    
    switch (status) {
      case 'running':
        return {
          boxShadow: [
            `0 0 0 0 ${statusColor.glow}`,
            `0 0 0 10px rgba(16, 185, 129, 0)`,
          ],
          transition: {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        };
      case 'error':
        return {
          boxShadow: [
            `0 0 0 0 ${statusColor.glow}`,
            `0 0 0 8px rgba(239, 68, 68, 0)`,
          ],
          transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        };
      default:
        return {};
    }
  };

  return (
    <div className={`flex items-center ${config.container} ${className}`}>
      {showIcon && (
        <motion.div
          className="relative flex items-center justify-center"
          animate={getPulseAnimation()}
          title={getStatusDescription()}
        >
          {getStatusIcon()}
        </motion.div>
      )}
      
      {showLabel && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Badge
            variant="outline"
            className={`${config.badge} font-medium border-2`}
            style={{
              backgroundColor: statusColor.bg,
              borderColor: statusColor.border,
              color: statusColor.text,
            }}
          >
            {getStatusLabel()}
          </Badge>
        </motion.div>
      )}
    </div>
  );
};

// Advanced Status Indicator with Progress
interface AdvancedStatusIndicatorProps extends AgentStatusIndicatorProps {
  progress?: number;
  subtitle?: string;
  showProgress?: boolean;
}

export const AdvancedStatusIndicator: React.FC<AdvancedStatusIndicatorProps> = ({
  status,
  progress = 0,
  subtitle,
  showProgress = false,
  ...props
}) => {
  const statusColor = getAgentStatusColor(status);

  return (
    <div className="flex items-center gap-3">
      <AgentStatusIndicator status={status} {...props} />
      
      {showProgress && status === 'running' && (
        <div className="flex-1 min-w-[100px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Progress
            </span>
            <span className="text-xs font-medium text-gray-900 dark:text-white">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className="h-2 rounded-full"
              style={{ backgroundColor: statusColor.primary }}
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
      
      {subtitle && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {subtitle}
        </span>
      )}
    </div>
  );
};

// Status Grid for Dashboard Overview
interface StatusGridProps {
  statuses: Array<{
    status: string;
    count: number;
    label: string;
  }>;
  className?: string;
}

export const StatusGrid: React.FC<StatusGridProps> = ({ statuses, className = '' }) => {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-5 gap-4 ${className}`}>
      {statuses.map(({ status, count, label }) => {
        const statusColor = getAgentStatusColor(status);
        
        return (
          <motion.div
            key={status}
            className="text-center p-4 rounded-lg border-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
            style={{
              backgroundColor: statusColor.bg,
              borderColor: statusColor.border,
            }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-center mb-2">
              <AgentStatusIndicator
                status={status}
                size="lg"
                showLabel={false}
                animated={count > 0}
              />
            </div>
            <motion.div
              className="text-2xl font-bold"
              style={{ color: statusColor.text }}
              key={count} // Re-animate when count changes
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {count}
            </motion.div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {label}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// Live Activity Indicator
interface LiveActivityIndicatorProps {
  isActive: boolean;
  lastActivity?: string;
  className?: string;
}

export const LiveActivityIndicator: React.FC<LiveActivityIndicatorProps> = ({
  isActive,
  lastActivity,
  className = '',
}) => {
  return (
    <motion.div
      className={`flex items-center gap-2 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="relative"
        animate={
          isActive
            ? {
                scale: [1, 1.2, 1],
                transition: { duration: 2, repeat: Infinity },
              }
            : {}
        }
      >
        <div
          className={`w-3 h-3 rounded-full ${
            isActive ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
        {isActive && (
          <motion.div
            className="absolute inset-0 w-3 h-3 rounded-full bg-green-500"
            animate={{
              scale: [1, 2, 1],
              opacity: [1, 0, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </motion.div>
      
      <div className="text-sm">
        <span className={`font-medium ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
          {isActive ? 'Live' : 'Offline'}
        </span>
        {lastActivity && (
          <span className="text-gray-400 ml-2">
            Last: {lastActivity}
          </span>
        )}
      </div>
    </motion.div>
  );
};