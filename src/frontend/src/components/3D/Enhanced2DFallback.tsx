import React, { useState, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Monitor, 
  Settings, 
  Zap, 
  Users, 
  AlertTriangle, 
  Activity,
  TrendingUp,
  Clock,
  Bot,
  Play,
  Pause,
  Square,
  CheckCircle2,
  Loader2,
  Grid3X3,
  BarChart3,
  RefreshCw,
  Filter,
  Search,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { AgentStatus } from '../../types/aguiTypes';

// Types
interface Enhanced2DFallbackProps {
  agents: AgentStatus[];
  onAgentSelect?: (agentId: string | null) => void;
  theme?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  enableEnhancedFeatures?: boolean;
  enableDataVisualization?: boolean;
  showPerformanceMetrics?: boolean;
  className?: string;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 28
    }
  }
};

const pulseVariants = {
  idle: { scale: 1, opacity: 0.9 },
  running: { 
    scale: [1, 1.02, 1], 
    opacity: [0.9, 1, 0.9],
    transition: { 
      duration: 2.5, 
      repeat: Infinity,
      ease: "easeInOut"
    }
  },
  error: {
    scale: [1, 1.05, 1],
    opacity: [0.9, 1, 0.9],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Performance Metrics Component
const PerformanceMetrics = memo(({ agents }: { agents: AgentStatus[] }) => {
  const metrics = useMemo(() => {
    const totalTasks = agents.reduce((acc, agent) => 
      acc + (agent.performance?.tasksCompleted || 0), 0);
    
    const avgSuccessRate = agents.length > 0 
      ? agents.reduce((acc, agent) => acc + (agent.performance?.successRate || 0), 0) / agents.length
      : 0;
    
    const avgResponseTime = agents.length > 0
      ? agents.reduce((acc, agent) => acc + (agent.performance?.avgResponseTime || 0), 0) / agents.length
      : 0;

    const activeAgents = agents.filter(a => a.status === 'running').length;

    return {
      totalTasks,
      avgSuccessRate: Math.round(avgSuccessRate * 100),
      avgResponseTime: Math.round(avgResponseTime),
      activeAgents,
      efficiency: totalTasks > 0 ? Math.round((totalTasks / agents.length) * avgSuccessRate * 100) / 100 : 0
    };
  }, [agents]);

  const metricCards = [
    { 
      label: 'Total Tasks', 
      value: metrics.totalTasks, 
      icon: BarChart3, 
      color: 'text-blue-600',
      suffix: ''
    },
    { 
      label: 'Success Rate', 
      value: metrics.avgSuccessRate, 
      icon: TrendingUp, 
      color: 'text-green-600',
      suffix: '%'
    },
    { 
      label: 'Avg Response', 
      value: metrics.avgResponseTime, 
      icon: Clock, 
      color: 'text-purple-600',
      suffix: 'ms'
    },
    { 
      label: 'Active Now', 
      value: metrics.activeAgents, 
      icon: Activity, 
      color: 'text-orange-600',
      suffix: ''
    },
  ];

  return (
    <motion.div 
      className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {metricCards.map((metric, index) => (
        <motion.div key={metric.label} variants={itemVariants}>
          <Card className="text-center hover:shadow-md transition-all duration-300 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-3">
              <div className="flex items-center justify-center mb-2">
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
              <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1, type: "spring" }}
                >
                  {metric.value}{metric.suffix}
                </motion.span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {metric.label}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
});

PerformanceMetrics.displayName = 'PerformanceMetrics';

// Enhanced Agent Card Component
const EnhancedAgentCard = memo(({ 
  agent, 
  index, 
  onSelect,
  isSelected,
  showDetails
}: { 
  agent: AgentStatus; 
  index: number; 
  onSelect?: (agentId: string | null) => void;
  isSelected: boolean;
  showDetails: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const statusConfig = useMemo(() => {
    switch (agent.status) {
      case 'running':
        return {
          color: 'bg-green-500',
          borderColor: 'border-green-400',
          glowColor: 'shadow-green-500/30',
          bgGradient: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
          icon: <Play className="h-4 w-4 text-green-600" />,
          label: 'Running',
          variant: 'default' as const,
          textColor: 'text-green-700 dark:text-green-300'
        };
      case 'idle':
        return {
          color: 'bg-blue-500',
          borderColor: 'border-blue-400', 
          glowColor: 'shadow-blue-500/30',
          bgGradient: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
          icon: <Pause className="h-4 w-4 text-blue-600" />,
          label: 'Idle',
          variant: 'secondary' as const,
          textColor: 'text-blue-700 dark:text-blue-300'
        };
      case 'error':
        return {
          color: 'bg-red-500',
          borderColor: 'border-red-400',
          glowColor: 'shadow-red-500/30',
          bgGradient: 'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20',
          icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
          label: 'Error',
          variant: 'destructive' as const,
          textColor: 'text-red-700 dark:text-red-300'
        };
      case 'completed':
        return {
          color: 'bg-emerald-500',
          borderColor: 'border-emerald-400',
          glowColor: 'shadow-emerald-500/30',
          bgGradient: 'from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20',
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
          label: 'Completed',
          variant: 'outline' as const,
          textColor: 'text-emerald-700 dark:text-emerald-300'
        };
      default:
        return {
          color: 'bg-amber-500',
          borderColor: 'border-amber-400',
          glowColor: 'shadow-amber-500/30',
          bgGradient: 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20',
          icon: <Square className="h-4 w-4 text-amber-600" />,
          label: 'Unknown',
          variant: 'outline' as const,
          textColor: 'text-amber-700 dark:text-amber-300'
        };
    }
  }, [agent.status]);

  const handleClick = useCallback(() => {
    onSelect?.(isSelected ? null : agent.id);
  }, [agent.id, onSelect, isSelected]);

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative group"
    >
      <motion.div
        animate={agent.status}
        variants={pulseVariants}
        className={`
          relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300
          ${statusConfig.borderColor} ${isSelected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
          ${isHovered ? statusConfig.glowColor + ' shadow-lg' : 'shadow-sm'}
          bg-gradient-to-br ${statusConfig.bgGradient}
          backdrop-blur-sm transform-gpu
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
        `}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`Agent ${agent.name || `${index + 1}`} - Status: ${statusConfig.label}${agent.type ? `, Type: ${agent.type}` : ''}${isSelected ? ' (selected)' : ''}`}
        aria-pressed={isSelected}
        aria-describedby={`agent-${agent.id}-details`}
      >
        {/* Status indicator dot with animation */}
        <motion.div
          className={`absolute -top-2 -right-2 w-4 h-4 rounded-full ${statusConfig.color} border-2 border-white dark:border-gray-800 shadow-sm`}
          animate={agent.status === 'running' ? {
            scale: [1, 1.3, 1],
            opacity: [1, 0.6, 1]
          } : agent.status === 'error' ? {
            scale: [1, 1.2, 1],
            opacity: [1, 0.8, 1]
          } : {}}
          transition={{ 
            duration: agent.status === 'running' ? 2 : 1, 
            repeat: agent.status !== 'idle' && agent.status !== 'completed' ? Infinity : 0 
          }}
        />

        {/* Agent avatar/icon with 3D effect */}
        <div className="flex items-center justify-center mb-3">
          <motion.div
            className={`
              w-12 h-12 rounded-full flex items-center justify-center
              ${statusConfig.color} shadow-lg relative overflow-hidden
              transition-all duration-300
            `}
            whileHover={{ 
              rotateY: 15,
              rotateX: 5,
              scale: 1.05
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
              animate={isHovered ? {
                x: ['-100%', '100%']
              } : {}}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            />
            <Bot className="h-6 w-6 text-white relative z-10" />
          </motion.div>
        </div>

        {/* Agent info */}
        <div className="text-center space-y-2">
          <h4 className={`font-semibold text-sm truncate ${statusConfig.textColor}`}>
            {agent.name || `Agent ${index + 1}`}
          </h4>
          
          <Badge variant={statusConfig.variant} className="text-xs px-2 py-1">
            {statusConfig.icon}
            <span className="ml-1">{statusConfig.label}</span>
          </Badge>

          {/* Type badge */}
          {agent.type && (
            <Badge variant="outline" className="text-xs">
              {agent.type}
            </Badge>
          )}

          {/* Performance metrics with enhanced animation */}
          {showDetails && agent.performance && (
            <motion.div 
              id={`agent-${agent.id}-details`}
              className="text-xs text-gray-600 dark:text-gray-400 space-y-1 pt-2 border-t border-gray-200 dark:border-gray-700"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              role="region"
              aria-label="Agent performance metrics"
            >
              <div className="flex justify-between items-center">
                <span>Tasks:</span>
                <motion.span 
                  className="font-medium"
                  whileHover={{ scale: 1.1 }}
                >
                  {agent.performance.tasksCompleted}
                </motion.span>
              </div>
              <div className="flex justify-between items-center">
                <span>Success:</span>
                <motion.span 
                  className="font-medium"
                  whileHover={{ scale: 1.1 }}
                >
                  {Math.round(agent.performance.successRate * 100)}%
                </motion.span>
              </div>
              {agent.performance.avgResponseTime && (
                <div className="flex justify-between items-center">
                  <span>Avg Time:</span>
                  <motion.span 
                    className="font-medium"
                    whileHover={{ scale: 1.1 }}
                  >
                    {Math.round(agent.performance.avgResponseTime)}ms
                  </motion.span>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Activity indicator for running agents */}
        {agent.status === 'running' && (
          <motion.div
            className="absolute bottom-2 right-2"
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <Activity className="h-3 w-3 text-green-500" />
          </motion.div>
        )}

        {/* Last activity timestamp */}
        {agent.lastActivity && (
          <div className="absolute bottom-1 left-2 text-xs text-gray-500 dark:text-gray-500">
            <Clock className="h-3 w-3 inline mr-1" />
            {new Date(agent.lastActivity).toLocaleTimeString()}
          </div>
        )}

        {/* Selection indicator */}
        {isSelected && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-blue-400/10 border-2 border-blue-400 pointer-events-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          />
        )}
      </motion.div>
    </motion.div>
  );
});

EnhancedAgentCard.displayName = 'EnhancedAgentCard';

// Main Enhanced 2D Fallback Component
export function Enhanced2DFallback({
  agents = [],
  onAgentSelect,
  enableEnhancedFeatures = true,
  enableDataVisualization = true,
  showPerformanceMetrics = true,
  className = ''
}: Enhanced2DFallbackProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('detailed');
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter agents based on status
  const filteredAgents = useMemo(() => {
    if (filterStatus === 'all') return agents;
    return agents.filter(agent => agent.status === filterStatus);
  }, [agents, filterStatus]);

  // Stats calculation
  const agentStats = useMemo(() => {
    const stats = agents.reduce((acc, agent) => {
      acc[agent.status] = (acc[agent.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return {
      total: agents.length,
      running: stats.running || 0,
      idle: stats.idle || 0,
      error: stats.error || 0,
      completed: stats.completed || 0,
    };
  }, [agents]);

  // Grid configuration based on agent count
  const gridCols = useMemo(() => {
    const count = filteredAgents.length;
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-1 sm:grid-cols-2';
    if (count <= 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    if (count <= 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
    if (count <= 6) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6';
    return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8';
  }, [filteredAgents.length]);

  const handleAgentSelect = useCallback((agentId: string | null) => {
    setSelectedAgent(agentId);
    onAgentSelect?.(agentId);
  }, [onAgentSelect]);

  const statusFilterOptions = [
    { value: 'all', label: 'All', count: agentStats.total },
    { value: 'running', label: 'Running', count: agentStats.running },
    { value: 'idle', label: 'Idle', count: agentStats.idle },
    { value: 'error', label: 'Error', count: agentStats.error },
    { value: 'completed', label: 'Completed', count: agentStats.completed },
  ];

  if (agents.length === 0) {
    return (
      <motion.div 
        className={`w-full rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="h-64 flex flex-col items-center justify-center text-center p-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Bot className="h-16 w-16 text-gray-400 mb-4" />
          </motion.div>
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
            No Agents Available
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-500 max-w-md">
            Your agent dashboard is ready. Create your first agent to see real-time status, performance metrics, and interactive visualizations.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={`w-full space-y-4 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header Controls */}
      <motion.div 
        className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        role="toolbar"
        aria-label="Dashboard controls"
      >
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </motion.div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
              aria-label="Filter agents by status"
            >
              {statusFilterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2"
          >
            {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>
          
          <Badge variant="outline" className="ml-2">
            {filteredAgents.length} of {agents.length}
          </Badge>
        </div>
      </motion.div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Performance Metrics */}
            {enableDataVisualization && showPerformanceMetrics && (
              <PerformanceMetrics agents={agents} />
            )}

            {/* Agents Grid */}
            <motion.div
              className={`${gridCols} gap-4`}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              role="grid"
              aria-label={`Agent dashboard with ${filteredAgents.length} agents`}
            >
              <AnimatePresence mode="popLayout">
                {filteredAgents.map((agent, index) => (
                  <EnhancedAgentCard
                    key={agent.id || index}
                    agent={agent}
                    index={index}
                    onSelect={handleAgentSelect}
                    isSelected={selectedAgent === agent.id}
                    showDetails={showDetails}
                  />
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Selected Agent Details */}
            <AnimatePresence>
              {selectedAgent && (
                <motion.div
                  initial={{ opacity: 0, y: 20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -20, height: 0 }}
                  className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      Selected Agent: {agents.find(a => a.id === selectedAgent)?.name || 'Unknown'}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAgentSelect(null)}
                    >
                      Close
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-blue-700 dark:text-blue-300">ID:</span>
                      <p className="text-blue-600 dark:text-blue-400 font-mono">{selectedAgent}</p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700 dark:text-blue-300">Type:</span>
                      <p className="text-blue-600 dark:text-blue-400">
                        {agents.find(a => a.id === selectedAgent)?.type || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700 dark:text-blue-300">Status:</span>
                      <p className="text-blue-600 dark:text-blue-400 capitalize">
                        {agents.find(a => a.id === selectedAgent)?.status || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Enhanced2DFallback;