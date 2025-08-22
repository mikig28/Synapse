/**
 * Mobile-Optimized Agent Card Component
 * Touch-optimized design for mobile devices
 */

import React, { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Agent } from '@/types/agent';
import { 
  getAgentStatusColor, 
  getAgentTypeColor, 
  typography, 
  spacing 
} from '@/utils/designSystem';
import { 
  cardVariants, 
  statusVariants, 
  buttonVariants,
  slideVariants,
  springConfigs 
} from '@/utils/animations';
import MobileCrewAIViewer from './MobileCrewAIViewer';
import {
  Bot,
  Play,
  Pause,
  Settings,
  Trash2,
  Loader2,
  Twitter,
  Newspaper,
  Zap,
  RotateCcw,
  MoreVertical,
  ChevronRight,
  Activity,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  X,
  Eye,
  Brain,
} from 'lucide-react';

interface MobileAgentCardProps {
  agent: Agent;
  isExecuting: boolean;
  onExecute: (agentId: string) => void;
  onToggle: (agent: Agent) => void;
  onDelete: (agentId: string) => void;
  onReset: (agentId: string) => void;
  onSettings: (agentId: string) => void;
  formatTimeAgo: (dateString: string) => string;
}

export const MobileAgentCard: React.FC<MobileAgentCardProps> = ({
  agent,
  isExecuting,
  onExecute,
  onToggle,
  onDelete,
  onReset,
  onSettings,
  formatTimeAgo,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [showCrewViewer, setShowCrewViewer] = useState(false);

  const statusColor = getAgentStatusColor(agent.status);
  const typeColor = getAgentTypeColor(agent.type);

  const getAgentIcon = (type: string) => {
    const iconProps = { 
      className: "w-4 h-4", 
      style: { color: typeColor.icon } 
    };
    
    switch (type) {
      case 'twitter':
        return <Twitter {...iconProps} />;
      case 'news':
        return <Newspaper {...iconProps} />;
      case 'crewai_news':
        return <Zap {...iconProps} />;
      default:
        return <Bot {...iconProps} />;
    }
  };

  const getStatusIcon = (status: string) => {
    const iconProps = { className: "w-3 h-3" };
    
    switch (status) {
      case 'running':
        return (
          <motion.div variants={statusVariants} animate="running">
            <Loader2 {...iconProps} style={{ color: statusColor.primary }} className="animate-spin" />
          </motion.div>
        );
      case 'idle':
        return (
          <motion.div variants={statusVariants} animate="idle">
            <CheckCircle {...iconProps} style={{ color: statusColor.primary }} />
          </motion.div>
        );
      case 'error':
        return (
          <motion.div variants={statusVariants} animate="error">
            <AlertCircle {...iconProps} style={{ color: statusColor.primary }} />
          </motion.div>
        );
      default:
        return <Clock {...iconProps} style={{ color: statusColor.primary }} />;
    }
  };

  const handlePan = (event: any, info: PanInfo) => {
    if (info.offset.x > 60) {
      setShowActions(true);
    } else if (info.offset.x < -60) {
      setShowActions(false);
    }
    setDragOffset(info.offset.x);
  };

  const handlePanEnd = (event: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      setShowActions(info.offset.x > 0);
    }
    setDragOffset(0);
  };

  const cardStyle = {
    background: `linear-gradient(135deg, ${statusColor.bg} 0%, ${statusColor.bgDark} 100%)`,
    borderColor: statusColor.border,
  };

  return (
    <motion.div
      className="relative overflow-hidden"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      layout
    >
      {/* Action Panel (revealed by swipe) */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            className="absolute inset-0 bg-gray-100 dark:bg-gray-700 flex items-center justify-end pr-4 z-10"
            variants={slideVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            custom="left"
          >
            <div className="flex items-center gap-2">
              <motion.button
                className="p-3 bg-blue-500 text-white rounded-full shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onExecute(agent._id)}
                disabled={isExecuting || agent.status === 'running'}
              >
                {isExecuting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </motion.button>
              
              <motion.button
                className="p-3 bg-gray-500 text-white rounded-full shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onSettings(agent._id)}
              >
                <Settings className="w-4 h-4" />
              </motion.button>
              
              <motion.button
                className="p-3 bg-red-500 text-white rounded-full shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowActions(false)}
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Card */}
      <motion.div
        className="relative z-20"
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        animate={{ x: dragOffset * 0.3 }}
        transition={springConfigs.gentle}
      >
        <Card 
          className="border-2 touch-manipulation"
          style={cardStyle}
        >
          <CardContent className="p-4">
            {/* Header Row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <motion.div
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{ 
                    backgroundColor: typeColor.bg,
                    border: `1px solid ${typeColor.primary}20`
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  {getAgentIcon(agent.type)}
                </motion.div>
                
                <div className="flex-1 min-w-0">
                  <h3 
                    className="font-semibold text-gray-900 dark:text-white truncate"
                    style={{ fontSize: '0.875rem', lineHeight: '1.25rem' }}
                  >
                    {agent.name}
                  </h3>
                  <p 
                    className="text-gray-600 dark:text-gray-300 truncate"
                    style={{ fontSize: '0.75rem', lineHeight: '1rem' }}
                  >
                    {agent.type === 'crewai_news' ? 'CrewAI Multi-Agent' : `${agent.type} Agent`}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {getStatusIcon(agent.status)}
                <Badge 
                  variant={agent.isActive ? 'default' : 'secondary'}
                  className="text-xs px-2 py-0.5"
                  style={{
                    backgroundColor: agent.isActive ? statusColor.primary : statusColor.paused.primary,
                    color: 'white',
                  }}
                >
                  {agent.isActive ? 'On' : 'Off'}
                </Badge>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <motion.div 
                className="text-center p-2 rounded bg-white/50 dark:bg-gray-800/50"
                whileTap={{ scale: 0.95 }}
              >
                <p 
                  className="font-bold text-gray-900 dark:text-white"
                  style={{ fontSize: '0.875rem', lineHeight: '1.25rem' }}
                >
                  {agent.statistics.totalRuns}
                </p>
                <p 
                  className="text-gray-500 dark:text-gray-400"
                  style={{ fontSize: '0.625rem', lineHeight: '0.75rem' }}
                >
                  RUNS
                </p>
              </motion.div>
              <motion.div 
                className="text-center p-2 rounded bg-white/50 dark:bg-gray-800/50"
                whileTap={{ scale: 0.95 }}
              >
                <p 
                  className="font-bold text-gray-900 dark:text-white"
                  style={{ fontSize: '0.875rem', lineHeight: '1.25rem' }}
                >
                  {agent.statistics.totalItemsAdded}
                </p>
                <p 
                  className="text-gray-500 dark:text-gray-400"
                  style={{ fontSize: '0.625rem', lineHeight: '0.75rem' }}
                >
                  ITEMS
                </p>
              </motion.div>
              <motion.div 
                className="text-center p-2 rounded bg-white/50 dark:bg-gray-800/50"
                whileTap={{ scale: 0.95 }}
              >
                <p 
                  className="font-bold text-gray-900 dark:text-white"
                  style={{ fontSize: '0.875rem', lineHeight: '1.25rem' }}
                >
                  {Math.round((agent.statistics.successfulRuns / Math.max(agent.statistics.totalRuns, 1)) * 100)}%
                </p>
                <p 
                  className="text-gray-500 dark:text-gray-400"
                  style={{ fontSize: '0.625rem', lineHeight: '0.75rem' }}
                >
                  SUCCESS
                </p>
              </motion.div>
            </div>

            {/* Status Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {agent.lastRun && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(agent.lastRun)}</span>
                  </div>
                )}
              </div>
              
              <motion.button
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowActions(!showActions)}
              >
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </motion.button>
            </div>

            {/* Error Message (if any) */}
            {agent.status === 'error' && agent.errorMessage && (
              <motion.div 
                className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={springConfigs.smooth}
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span className="flex-1">{agent.errorMessage}</span>
                </div>
              </motion.div>
            )}

            {/* Quick Action Bar */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <motion.div variants={buttonVariants} whileTap="tap" className="flex-1">
                <Button
                  size="sm"
                  onClick={() => onExecute(agent._id)}
                  disabled={isExecuting || agent.status === 'running'}
                  className="w-full text-xs"
                  style={{
                    backgroundColor: statusColor.primary,
                    borderColor: statusColor.primary,
                  }}
                >
                  {isExecuting ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Play className="w-3 h-3 mr-1" />
                  )}
                  Run
                </Button>
              </motion.div>

              <motion.div variants={buttonVariants} whileTap="tap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSettings(agent._id)}
                  className="px-3 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                  title="Edit Settings"
                >
                  <Settings className="w-3 h-3" />
                </Button>
              </motion.div>

              {/* CrewAI Process Viewer Button - only for CrewAI agents */}
              {agent.type === 'crewai_news' && (
                <motion.div variants={buttonVariants} whileTap="tap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCrewViewer(true)}
                    className="px-3 bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                    title="View AI Process"
                  >
                    <Brain className="w-3 h-3" />
                  </Button>
                </motion.div>
              )}

              <motion.div variants={buttonVariants} whileTap="tap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onToggle(agent)}
                  className="px-3"
                >
                  {agent.isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </Button>
              </motion.div>

              {agent.status === 'error' && (
                <motion.div variants={buttonVariants} whileTap="tap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReset(agent._id)}
                    className="px-3"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Swipe Indicator */}
      <motion.div
        className="absolute bottom-2 right-2 text-gray-400 text-xs opacity-50"
        animate={{ opacity: showActions ? 0 : 0.5 }}
        transition={{ duration: 0.2 }}
      >
        <span>← Swipe for actions</span>
      </motion.div>

      {/* CrewAI Process Viewer Modal */}
      {agent.type === 'crewai_news' && (
        <MobileCrewAIViewer
          agent={agent}
          isVisible={showCrewViewer}
          onClose={() => setShowCrewViewer(false)}
        />
      )}
    </motion.div>
  );
};

export default MobileAgentCard;