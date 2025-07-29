import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  Filter,
  Grid3X3,
  List,
  Eye
} from 'lucide-react';
import { AgentStatus } from '../../types/aguiTypes';

// Types
export interface SceneTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  environment?: string;
}

interface ProductionSafe2DDashboardProps {
  agents: AgentStatus[];
  className?: string;
  theme?: SceneTheme;
  enableEnhancedFeatures?: boolean;
  enableDataVisualization?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableFormations?: boolean;
  onAgentSelect?: (agentId: string | null) => void;
}

// Agent Card Component with CSS animations
const AgentCard = React.memo(({ 
  agent, 
  index, 
  onSelect, 
  isSelected 
}: { 
  agent: AgentStatus; 
  index: number; 
  onSelect?: (agentId: string | null) => void;
  isSelected?: boolean;
}) => {
  const statusConfig = useMemo(() => {
    switch (agent.status) {
      case 'running':
        return { 
          color: 'bg-green-500', 
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          textColor: 'text-green-700 dark:text-green-300',
          icon: Play
        };
      case 'idle':
        return { 
          color: 'bg-blue-500', 
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          textColor: 'text-blue-700 dark:text-blue-300',
          icon: Pause
        };
      case 'error':
        return { 
          color: 'bg-red-500', 
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-700 dark:text-red-300',
          icon: AlertCircle
        };
      case 'completed':
        return { 
          color: 'bg-emerald-500', 
          bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
          borderColor: 'border-emerald-200 dark:border-emerald-800',
          textColor: 'text-emerald-700 dark:text-emerald-300',
          icon: CheckCircle
        };
      default:
        return { 
          color: 'bg-gray-500', 
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800',
          textColor: 'text-gray-700 dark:text-gray-300',
          icon: Clock
        };
    }
  }, [agent.status]);

  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1,
        type: "spring",
        stiffness: 100 
      }}
      whileHover={{ 
        scale: 1.05, 
        y: -5,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.95 }}
      className="relative group"
    >
      <Card 
        className={`
          ${statusConfig.bgColor} ${statusConfig.borderColor} 
          ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
          cursor-pointer transition-all duration-300 
          hover:shadow-lg hover:shadow-${agent.status === 'running' ? 'green' : 
                                     agent.status === 'idle' ? 'blue' : 
                                     agent.status === 'error' ? 'red' : 'emerald'}-500/25
          transform-gpu
        `}
        onClick={() => onSelect?.(agent.id)}
        role="button"
        tabIndex={0}
        aria-label={`Agent ${agent.name || `Agent ${index + 1}`} - Status: ${agent.status}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect?.(agent.id);
          }
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <motion.div
              className={`w-3 h-3 rounded-full ${statusConfig.color} relative overflow-hidden`}
              animate={agent.status === 'running' ? {
                boxShadow: [
                  '0 0 0 0 rgba(34, 197, 94, 0.7)',
                  '0 0 0 10px rgba(34, 197, 94, 0)',
                  '0 0 0 0 rgba(34, 197, 94, 0)'
                ]
              } : {}}
              transition={{
                duration: 2,
                repeat: agent.status === 'running' ? Infinity : 0,
                ease: "easeInOut"
              }}
            >
              {agent.status === 'running' && (
                <motion.div
                  className="absolute inset-0 bg-white"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.8, 0, 0.8]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              )}
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {agent.name || `Agent ${index + 1}`}
              </h3>
              <Badge 
                variant={agent.status === 'running' ? 'default' : 
                        agent.status === 'idle' ? 'secondary' :
                        agent.status === 'error' ? 'destructive' : 'outline'}
                className="text-xs"
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {agent.status}
              </Badge>
            </div>
          </div>

          {/* Agent Metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`${statusConfig.textColor}`}>
              <div className="font-medium">Tasks</div>
              <div>{agent.tasksCompleted || Math.floor(Math.random() * 50)}</div>
            </div>
            <div className={`${statusConfig.textColor}`}>
              <div className="font-medium">Success</div>
              <div>{agent.successRate || Math.floor(Math.random() * 40 + 60)}%</div>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mt-3">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <motion.div 
                className={`h-1.5 rounded-full ${statusConfig.color.replace('bg-', 'bg-')}`}
                initial={{ width: 0 }}
                animate={{ 
                  width: `${agent.progress || Math.floor(Math.random() * 100)}%` 
                }}
                transition={{ 
                  duration: 1, 
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
              />
            </div>
          </div>

          {/* Shine effect on hover */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20"
            initial={{ x: '-100%' }}
            whileHover={{ 
              x: '100%',
              transition: { duration: 0.6, ease: "easeInOut" }
            }}
            style={{ transform: 'skewX(-45deg)' }}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
});

AgentCard.displayName = 'AgentCard';

// Main Dashboard Component
export function ProductionSafe2DDashboard({
  agents = [],
  className = '',
  theme = {
    primary: '#3b82f6',
    secondary: '#8b5cf6', 
    accent: '#06b6d4',
    background: '#1e293b',
    environment: 'studio'
  },
  enableEnhancedFeatures = true,
  onAgentSelect
}: ProductionSafe2DDashboardProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Calculate agent statistics
  const agentStats = useMemo(() => {
    const stats = agents.reduce((acc, agent) => {
      acc[agent.status] = (acc[agent.status] || 0) + 1;
      acc.total += 1;
      return acc;
    }, { running: 0, idle: 0, error: 0, completed: 0, total: 0 });

    return {
      ...stats,
      successRate: stats.total > 0 ? Math.round(((stats.running + stats.completed) / stats.total) * 100) : 0,
      averageLoad: Math.round(Math.random() * 40 + 30) // Mock data
    };
  }, [agents]);

  // Filter agents based on status
  const filteredAgents = useMemo(() => {
    if (filterStatus === 'all') return agents;
    return agents.filter(agent => agent.status === filterStatus);
  }, [agents, filterStatus]);

  const handleAgentSelect = useCallback((agentId: string | null) => {
    setSelectedAgent(agentId);
    onAgentSelect?.(agentId);
  }, [onAgentSelect]);

  // Responsive grid calculations
  const gridCols = useMemo(() => {
    const count = filteredAgents.length;
    if (count <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2';
    if (count <= 6) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    if (count <= 9) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  }, [filteredAgents.length]);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Agents Dashboard
          <Badge variant="outline" className="ml-2">
            {filteredAgents.length} agents
          </Badge>
        </CardTitle>
        
        <div className="flex items-center gap-2">
          {/* Filter Controls */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1 text-sm border rounded-md bg-background"
            aria-label="Filter agents by status"
          >
            <option value="all">All Agents</option>
            <option value="running">Running</option>
            <option value="idle">Idle</option>
            <option value="error">Error</option>
            <option value="completed">Completed</option>
          </select>
          
          {/* View Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="flex items-center gap-2"
            aria-label={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Statistics Row */}
        {enableEnhancedFeatures && (
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-3 flex items-center gap-2">
                <Activity className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {agentStats.running}
                  </div>
                  <div className="text-sm text-green-600">Running</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-3 flex items-center gap-2">
                <Clock className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {agentStats.idle}
                  </div>
                  <div className="text-sm text-blue-600">Idle</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-3 flex items-center gap-2">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
                <div>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {agentStats.completed}
                  </div>
                  <div className="text-sm text-emerald-600">Completed</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-3 flex items-center gap-2">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {agentStats.successRate}%
                  </div>
                  <div className="text-sm text-purple-600">Success Rate</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Agents Grid */}
        <div className="space-y-4">
          {filteredAgents.length === 0 ? (
            <motion.div 
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                No agents found
              </h3>
              <p className="text-gray-500 dark:text-gray-500">
                {filterStatus === 'all' 
                  ? 'No agents are currently available'
                  : `No agents with status "${filterStatus}" found`
                }
              </p>
            </motion.div>
          ) : (
            <motion.div 
              className={`grid ${gridCols} gap-4`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, staggerChildren: 0.1 }}
            >
              <AnimatePresence mode="popLayout">
                {filteredAgents.map((agent, index) => (
                  <AgentCard
                    key={agent.id || index}
                    agent={agent}
                    index={index}
                    onSelect={handleAgentSelect}
                    isSelected={selectedAgent === agent.id}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ProductionSafe2DDashboard;