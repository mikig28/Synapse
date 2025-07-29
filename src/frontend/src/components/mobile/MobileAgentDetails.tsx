/**
 * Mobile Agent Details Component
 * Optimized bottom sheet view for agent details with touch interactions
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Agent, AgentRun } from '@/types/agent';
import { agentService } from '@/services/agentService';
import BottomSheet from './BottomSheet';
import { useTouchGestures } from '@/hooks/useTouchGestures';
import {
  Bot,
  Play,
  Pause,
  Settings,
  Trash2,
  RotateCcw,
  Activity,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  Twitter,
  Newspaper,
  Zap,
  ChevronDown,
  ChevronUp,
  Calendar,
  Target,
  BarChart3,
  Cpu,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getAgentStatusColor, getAgentTypeColor } from '@/utils/designSystem';

interface MobileAgentDetailsProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
  onExecute: (agentId: string) => void;
  onToggle: (agent: Agent) => void;
  onDelete: (agentId: string) => void;
  onReset: (agentId: string) => void;
  onSettings: (agentId: string) => void;
  isExecuting?: boolean;
}

interface AgentSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  expanded: boolean;
}

const MobileAgentDetails: React.FC<MobileAgentDetailsProps> = ({
  agent,
  isOpen,
  onClose,
  onExecute,
  onToggle,
  onDelete,
  onReset,
  onSettings,
  isExecuting = false,
}) => {
  const [recentRuns, setRecentRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    metrics: false,
    runs: false,
    config: false,
  });
  const { toast } = useToast();

  // Touch gesture support
  const { triggerHaptic } = useTouchGestures({
    onDoubleTap: () => {
      if (agent) {
        triggerHaptic('light');
        onExecute(agent._id);
      }
    },
  });

  // Fetch agent runs when agent changes
  useEffect(() => {
    if (agent && isOpen) {
      fetchAgentRuns();
    }
  }, [agent, isOpen]);

  const fetchAgentRuns = async () => {
    if (!agent) return;
    
    try {
      setLoading(true);
      const runs = await agentService.getAgentRuns(agent._id, 5);
      setRecentRuns(runs || []);
    } catch (error) {
      console.error('Failed to fetch agent runs:', error);
      setRecentRuns([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleQuickAction = async (action: string) => {
    if (!agent) return;

    try {
      triggerHaptic('medium');
      
      switch (action) {
        case 'execute':
          onExecute(agent._id);
          break;
        case 'toggle':
          onToggle(agent);
          break;
        case 'reset':
          onReset(agent._id);
          break;
        case 'settings':
          onSettings(agent._id);
          onClose();
          break;
        case 'delete':
          if (window.confirm('Are you sure you want to delete this agent?')) {
            onDelete(agent._id);
            onClose();
          }
          break;
      }
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const getAgentIcon = (type: string) => {
    const statusColor = agent ? getAgentStatusColor(agent.status) : { primary: '#6B7280' };
    const iconProps = { 
      className: "w-5 h-5", 
      style: { color: statusColor.primary } 
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
    const statusColor = getAgentStatusColor(status);
    const iconProps = { className: "w-4 h-4" };
    
    switch (status) {
      case 'running':
        return <Loader2 {...iconProps} className="animate-spin" style={{ color: statusColor.primary }} />;
      case 'idle':
        return <CheckCircle {...iconProps} style={{ color: statusColor.primary }} />;
      case 'error':
        return <AlertCircle {...iconProps} style={{ color: statusColor.primary }} />;
      default:
        return <Clock {...iconProps} style={{ color: statusColor.primary }} />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  if (!agent) return null;

  const statusColor = getAgentStatusColor(agent.status);
  const typeColor = getAgentTypeColor(agent.type);
  const successRate = Math.round((agent.statistics.successfulRuns / Math.max(agent.statistics.totalRuns, 1)) * 100);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      height="full"
      showHandle={true}
      enableSwipeToClose={true}
    >
      <div className="space-y-6">
        {/* Agent Header */}
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="flex items-start gap-4">
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="p-3 rounded-xl flex-shrink-0"
              style={{ 
                backgroundColor: typeColor.bg,
                border: `1px solid ${typeColor.primary}20`
              }}
            >
              {getAgentIcon(agent.type)}
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground mb-1">
                {agent.name}
              </h2>
              <p className="text-muted-foreground text-sm mb-2">
                {agent.type === 'crewai_news' ? 'CrewAI Multi-Agent' : `${agent.type} Agent`}
              </p>
              
              <div className="flex items-center gap-2">
                {getStatusIcon(agent.status)}
                <Badge 
                  variant={agent.isActive ? 'default' : 'secondary'}
                  className="text-xs"
                  style={{
                    backgroundColor: agent.isActive ? statusColor.primary : statusColor.paused.primary,
                    color: 'white',
                  }}
                >
                  {agent.isActive ? 'Active' : 'Paused'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {agent.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleQuickAction('execute')}
              disabled={isExecuting || agent.status === 'running'}
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {isExecuting ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <Play className="w-5 h-5 text-primary" />
              )}
              <span className="text-xs font-medium text-primary">Run</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleQuickAction('toggle')}
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors"
            >
              {agent.isActive ? (
                <Pause className="w-5 h-5 text-orange-500" />
              ) : (
                <Play className="w-5 h-5 text-green-500" />
              )}
              <span className="text-xs font-medium">
                {agent.isActive ? 'Pause' : 'Resume'}
              </span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleQuickAction('settings')}
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs font-medium">Settings</span>
            </motion.button>

            {agent.status === 'error' && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleQuickAction('reset')}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors"
              >
                <RotateCcw className="w-5 h-5 text-yellow-600" />
                <span className="text-xs font-medium text-yellow-600">Reset</span>
              </motion.button>
            )}
          </div>
        </div>

        <Separator />

        {/* Overview Section */}
        <motion.div
          whileTap={{ scale: 0.995 }}
          className="space-y-3"
        >
          <button
            onClick={() => toggleSection('overview')}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-primary" />
              <span className="font-medium">Overview</span>
            </div>
            {expandedSections.overview ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <AnimatePresence>
            {expandedSections.overview && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 overflow-hidden"
              >
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">Total Runs</span>
                    </div>
                    <p className="text-2xl font-bold">{agent.statistics.totalRuns}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">Success Rate</span>
                    </div>
                    <p className="text-2xl font-bold">{successRate}%</p>
                  </div>

                  <div className="p-3 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium">Items Added</span>
                    </div>
                    <p className="text-2xl font-bold">{agent.statistics.totalItemsAdded}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium">Last Run</span>
                    </div>
                    <p className="text-sm">
                      {agent.lastRun ? formatTimeAgo(agent.lastRun) : 'Never'}
                    </p>
                  </div>
                </div>

                {/* Error Message */}
                {agent.status === 'error' && agent.errorMessage && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-destructive mb-1">Error Details</p>
                        <p className="text-sm text-destructive/80">{agent.errorMessage}</p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Recent Runs Section */}
        <motion.div
          whileTap={{ scale: 0.995 }}
          className="space-y-3"
        >
          <button
            onClick={() => toggleSection('runs')}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Cpu className="w-5 h-5 text-primary" />
              <span className="font-medium">Recent Runs</span>
              {recentRuns.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {recentRuns.length}
                </Badge>
              )}
            </div>
            {expandedSections.runs ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <AnimatePresence>
            {expandedSections.runs && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-2 overflow-hidden"
              >
                {loading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : recentRuns.length > 0 ? (
                  recentRuns.map((run) => (
                    <div
                      key={run._id}
                      className="p-3 rounded-lg bg-background border border-border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {run.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : run.status === 'failed' ? (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          ) : (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          )}
                          <span className="text-sm font-medium capitalize">
                            {run.status}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(run.createdAt)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="ml-1">
                            {run.endTime 
                              ? formatDuration(new Date(run.endTime).getTime() - new Date(run.startTime).getTime())
                              : 'Running...'
                            }
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Items:</span>
                          <span className="ml-1">{run.itemsProcessed || 0}</span>
                        </div>
                      </div>

                      {run.error && (
                        <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                          {run.error}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Cpu className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent runs found</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Configuration Section */}
        <motion.div
          whileTap={{ scale: 0.995 }}
          className="space-y-3"
        >
          <button
            onClick={() => toggleSection('config')}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-primary" />
              <span className="font-medium">Configuration</span>
            </div>
            {expandedSections.config ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <AnimatePresence>
            {expandedSections.config && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 overflow-hidden"
              >
                <div className="p-3 rounded-lg bg-background border border-border space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <span className="text-sm font-medium">{agent.type}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Schedule:</span>
                    <span className="text-sm font-medium">
                      {agent.schedule || 'Manual'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Created:</span>
                    <span className="text-sm font-medium">
                      {new Date(agent.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {agent.config && (
                    <div>
                      <span className="text-sm text-muted-foreground mb-2 block">Config:</span>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(agent.config, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Danger Zone */}
        <div className="pt-4 border-t border-destructive/20">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => handleQuickAction('delete')}
            className="w-full p-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors text-destructive flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span className="font-medium">Delete Agent</span>
          </motion.button>
        </div>
      </div>
    </BottomSheet>
  );
};

export default MobileAgentDetails;