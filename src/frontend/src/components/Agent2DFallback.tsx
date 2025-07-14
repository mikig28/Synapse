import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentStatus } from '../types/aguiTypes';
import { 
  Bot, 
  Brain, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Globe,
  Cpu,
  Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface Agent2DFallbackProps {
  agents: AgentStatus[];
  className?: string;
}

const getAgentIcon = (agent: AgentStatus) => {
  switch (agent.type || 'default') {
    case 'crewai_news':
      return Brain;
    case 'news':
      return Globe;
    case 'analysis':
      return Cpu;
    default:
      return Bot;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'running':
      return Loader2;
    case 'completed':
      return CheckCircle;
    case 'failed':
      return AlertCircle;
    case 'idle':
      return Clock;
    default:
      return Bot;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'running':
      return 'text-blue-500';
    case 'completed':
      return 'text-green-500';
    case 'failed':
      return 'text-red-500';
    case 'idle':
      return 'text-gray-500';
    default:
      return 'text-gray-400';
  }
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'running':
      return 'default';
    case 'completed':
      return 'secondary';
    case 'failed':
      return 'destructive';
    case 'idle':
      return 'outline';
    default:
      return 'outline';
  }
};

const getAgentAnimation = (status: string) => {
  switch (status) {
    case 'running':
      return {
        scale: [1, 1.05, 1],
        rotate: [0, 2, -2, 0],
      };
    case 'completed':
      return {
        scale: [1, 1.1, 1],
        y: [0, -5, 0],
      };
    case 'failed':
      return {
        x: [-2, 2, -2, 2, 0],
        scale: [1, 0.95, 1],
      };
    default:
      return {};
  }
};

export const Agent2DFallback: React.FC<Agent2DFallbackProps> = ({
  agents,
  className = ''
}) => {
  if (agents.length === 0) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className}`}>
        <div className="text-center p-8">
          <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No agents available</p>
          <p className="text-xs text-muted-foreground mt-1">
            Agents will appear here when created
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Agent Overview</h3>
          <Badge variant="outline" className="text-xs">
            2D Mode
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {agents.length} agent{agents.length !== 1 ? 's' : ''} total
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {agents.map((agent, index) => {
            const AgentIcon = getAgentIcon(agent);
            const StatusIcon = getStatusIcon(agent.status);
            const statusColor = getStatusColor(agent.status);
            const badgeVariant = getStatusBadgeVariant(agent.status);
            const animation = getAgentAnimation(agent.status);

            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  ...animation
                }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{ 
                  duration: 0.3,
                  delay: index * 0.1,
                  repeat: agent.status === 'running' ? Infinity : 0,
                  repeatType: 'reverse',
                  repeatDelay: 1
                }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    {/* Agent Icon and Status */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="relative">
                        <div className={`p-3 rounded-full bg-muted/50 ${statusColor}`}>
                          <AgentIcon className="w-6 h-6" />
                        </div>
                        {/* Status indicator overlay */}
                        <div className={`absolute -bottom-1 -right-1 p-1 bg-background rounded-full border-2 border-background ${statusColor}`}>
                          <StatusIcon className={`w-3 h-3 ${
                            agent.status === 'running' ? 'animate-spin' : ''
                          }`} />
                        </div>
                      </div>
                      <Badge variant={badgeVariant} className="text-xs">
                        {agent.status}
                      </Badge>
                    </div>

                    {/* Agent Info */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm truncate" title={agent.name}>
                        {agent.name}
                      </h4>
                      
                      {agent.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {agent.description}
                        </p>
                      )}

                      {/* Progress Info */}
                      {agent.status === 'running' && agent.progress && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{agent.progress}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <motion.div 
                              className="bg-primary h-1.5 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${agent.progress || 0}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Last Activity */}
                      {agent.lastActivity && (
                        <div className="text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(agent.lastActivity).toLocaleTimeString()}
                        </div>
                      )}

                      {/* Quick Stats */}
                      {(agent.itemsProcessed || agent.tasksCompleted) && (
                        <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                          {agent.itemsProcessed && (
                            <span>Items: {agent.itemsProcessed}</span>
                          )}
                          {agent.tasksCompleted && (
                            <span>Tasks: {agent.tasksCompleted}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-lg font-bold text-blue-600">
            {agents.filter(a => a.status === 'running').length}
          </div>
          <div className="text-xs text-muted-foreground">Running</div>
        </div>
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-lg font-bold text-green-600">
            {agents.filter(a => a.status === 'completed').length}
          </div>
          <div className="text-xs text-muted-foreground">Completed</div>
        </div>
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-lg font-bold text-red-600">
            {agents.filter(a => a.status === 'failed').length}
          </div>
          <div className="text-xs text-muted-foreground">Failed</div>
        </div>
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-lg font-bold text-gray-600">
            {agents.filter(a => a.status === 'idle').length}
          </div>
          <div className="text-xs text-muted-foreground">Idle</div>
        </div>
      </div>

      {/* Helpful Message */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-2">
          <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-medium text-blue-800 dark:text-blue-200">
              2D Agent Visualization
            </p>
            <p className="text-blue-700 dark:text-blue-300 mt-1">
              This simplified view provides all agent information without requiring 3D graphics.
              Click any agent card for detailed information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Agent2DFallback;