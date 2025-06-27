import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { agentService } from '../services/agentService';
import { Agent, AgentRun } from '../types/agent';
import {
  Activity,
  Bot,
  Clock,
  TrendingUp,
  Zap,
  Eye,
  AlertCircle,
  CheckCircle,
  Loader2,
  Play,
  Pause,
  BarChart3,
  Brain,
  Globe,
  Cpu,
  RefreshCw,
  Calendar,
  Timer,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

interface AgentActivityProps {
  agents: Agent[];
  onAgentExecute?: (agentId: string) => void;
  onAgentToggle?: (agent: Agent) => void;
  className?: string;
}

interface LiveMetrics {
  totalActiveAgents: number;
  runningAgents: number;
  successRate: number;
  avgResponseTime: number;
  itemsProcessedToday: number;
  lastUpdate: string;
}

interface AgentProgress {
  agentId: string;
  steps: Array<{
    agent: string;
    step: string;
    status: string;
    message: string;
    timestamp: string;
  }>;
  hasActiveProgress: boolean;
  results?: any;
  error?: string;
}

const AgentActivityDashboard: React.FC<AgentActivityProps> = ({
  agents,
  onAgentExecute,
  onAgentToggle,
  className = ''
}) => {
  const [recentRuns, setRecentRuns] = useState<AgentRun[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>({
    totalActiveAgents: 0,
    runningAgents: 0,
    successRate: 0,
    avgResponseTime: 0,
    itemsProcessedToday: 0,
    lastUpdate: new Date().toISOString()
  });
  const [agentProgress, setAgentProgress] = useState<Map<string, AgentProgress>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRecentActivity();
    fetchAgentProgress();
    
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchRecentActivity(true);
      }, 10000); // Refresh every 10 seconds
      
      progressIntervalRef.current = setInterval(() => {
        fetchAgentProgress(true);
      }, 5000); // Check progress every 5 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [agents, autoRefresh]);

  const fetchRecentActivity = async (silent: boolean = false) => {
    try {
      if (!silent) setIsRefreshing(true);
      
      const runs = await agentService.getUserAgentRuns(20);
      setRecentRuns(runs);
      
      // Calculate live metrics
      const runningAgents = agents.filter(a => a.status === 'running').length;
      const activeAgents = agents.filter(a => a.isActive).length;
      
      // Calculate success rate from recent runs
      const completedRuns = runs.filter(r => r.status === 'completed' || r.status === 'failed');
      const successfulRuns = runs.filter(r => r.status === 'completed');
      const successRate = completedRuns.length > 0 ? (successfulRuns.length / completedRuns.length) * 100 : 0;
      
      // Calculate average response time
      const runsWithDuration = runs.filter(r => r.duration && r.duration > 0);
      const avgResponseTime = runsWithDuration.length > 0 
        ? runsWithDuration.reduce((sum, r) => sum + (r.duration || 0), 0) / runsWithDuration.length / 1000
        : 0;
      
      // Calculate items processed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayRuns = runs.filter(r => new Date(r.createdAt) >= today);
      const itemsProcessedToday = todayRuns.reduce((sum, r) => sum + r.itemsAdded, 0);
      
      setLiveMetrics({
        totalActiveAgents: activeAgents,
        runningAgents,
        successRate,
        avgResponseTime,
        itemsProcessedToday,
        lastUpdate: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('[AgentActivityDashboard] Failed to fetch agent activity:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        silent
      });
      
      if (!silent) {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch agent activity';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  const fetchAgentProgress = async (silent: boolean = false) => {
    try {
      const runningAgents = agents.filter(a => a.status === 'running' && a.type === 'crewai_news');
      
      if (runningAgents.length === 0) {
        setAgentProgress(new Map());
        return;
      }

      const progressPromises = runningAgents.map(async (agent) => {
        try {
          console.log(`[Dashboard] Fetching progress for agent: ${agent.name} (${agent._id})`);
          const response = await agentService.getCrewProgress(agent._id);
          
          if (response.success && response.progress) {
            return {
              agentId: agent._id,
              agentName: agent.name,
              ...response.progress
            };
          } else {
            console.log(`[Dashboard] No active progress for agent: ${agent.name}`);
            return {
              agentId: agent._id,
              agentName: agent.name,
              steps: [],
              hasActiveProgress: false,
              error: 'No active progress'
            };
          }
        } catch (error: any) {
          console.warn(`[Dashboard] Failed to fetch progress for agent ${agent.name}:`, error.message);
          return {
            agentId: agent._id,
            agentName: agent.name,
            steps: [],
            hasActiveProgress: false,
            error: error.message
          };
        }
      });

      const progressResults = await Promise.all(progressPromises);
      
      const newProgressMap = new Map<string, AgentProgress>();
      let totalActiveProgress = 0;
      
      progressResults.forEach((progress) => {
        if (progress) {
          newProgressMap.set(progress.agentId, progress);
          if (progress.hasActiveProgress) {
            totalActiveProgress++;
          }
        }
      });

      setAgentProgress(newProgressMap);
      
      if (!silent && totalActiveProgress > 0) {
        console.log(`[Dashboard] Updated progress for ${totalActiveProgress} active agents`);
      }
      
    } catch (error: any) {
      if (!silent) {
        console.error('[Dashboard] Failed to fetch agent progress:', error);
      }
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <Clock className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getAgentTypeIcon = (type: string) => {
    switch (type) {
      case 'crewai_news':
        return <Brain className="w-4 h-4 text-purple-500" />;
      case 'news':
        return <Globe className="w-4 h-4 text-blue-500" />;
      default:
        return <Bot className="w-4 h-4" />;
    }
  };

  const runningAgents = agents.filter(a => a.status === 'running');
  const activeAgentRuns = recentRuns.filter(r => r.status === 'running');

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-xl font-semibold">Agent Activity</h3>
            <p className="text-sm text-muted-foreground">
              Real-time monitoring and metrics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'text-green-600' : ''}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchRecentActivity();
              fetchAgentProgress();
            }}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Live Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{liveMetrics.totalActiveAgents}</p>
                <p className="text-xs text-muted-foreground">Active Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{liveMetrics.runningAgents}</p>
                <p className="text-xs text-muted-foreground">Running Now</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round(liveMetrics.successRate)}%</p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{liveMetrics.itemsProcessedToday}</p>
                <p className="text-xs text-muted-foreground">Items Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Running Agents */}
      {runningAgents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cpu className="w-5 h-5 text-green-500" />
              Active Processes ({runningAgents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {runningAgents.map((agent) => {
                const activeRun = activeAgentRuns.find(r => 
                  (typeof r.agentId === 'object' ? r.agentId._id : r.agentId) === agent._id
                );
                const progress = agentProgress.get(agent._id);
                const latestStep = progress?.steps && progress.steps.length > 0 
                  ? progress.steps[progress.steps.length - 1] 
                  : null;
                
                return (
                  <motion.div
                    key={agent._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-muted/30 rounded-lg border space-y-3"
                  >
                    {/* Agent Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getAgentTypeIcon(agent.type)}
                        <div>
                          <p className="font-medium">{agent.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {progress?.hasActiveProgress ? (
                              <span>Running • {progress.steps.length} steps completed</span>
                            ) : (
                              <span>Starting up...</span>
                            )}
                            {activeRun && (
                              <span>• {activeRun.itemsProcessed} items so far</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="animate-pulse">
                          {progress?.hasActiveProgress ? 'Active' : 'Starting'}
                        </Badge>
                        {onAgentToggle && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAgentToggle(agent)}
                          >
                            <Pause className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Progress Steps */}
                    {progress?.hasActiveProgress && progress.steps.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Activity className="w-3 h-3" />
                          <span>Recent Steps</span>
                        </div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {progress.steps.slice(-3).map((step, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-start gap-2 text-xs p-2 bg-background/50 rounded border"
                            >
                              <div className="flex-shrink-0 mt-0.5">
                                {step.status === 'completed' ? (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                ) : step.status === 'failed' ? (
                                  <AlertCircle className="w-3 h-3 text-red-500" />
                                ) : (
                                  <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{step.agent}</p>
                                <p className="text-muted-foreground truncate">{step.step}</p>
                                {step.message && (
                                  <p className="text-muted-foreground/80 text-xs truncate">{step.message}</p>
                                )}
                              </div>
                              <span className="text-muted-foreground/60 text-xs flex-shrink-0">
                                {formatTimeAgo(step.timestamp)}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                        {progress.steps.length > 3 && (
                          <p className="text-xs text-muted-foreground text-center">
                            ... and {progress.steps.length - 3} more steps
                          </p>
                        )}
                      </div>
                    )}

                    {/* Error Display */}
                    {progress?.error && !progress.hasActiveProgress && (
                      <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                        <AlertCircle className="w-3 h-3" />
                        <span>Progress tracking: {progress.error}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Results & Content */}
      {Array.from(agentProgress.values()).some(p => p.results && Object.keys(p.results).length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="w-5 h-5 text-green-500" />
              Content Fetched
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from(agentProgress.entries()).map(([agentId, progress]) => {
                if (!progress.results || Object.keys(progress.results).length === 0) return null;
                
                const agent = agents.find(a => a._id === agentId);
                if (!agent) return null;

                return (
                  <div key={agentId} className="p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      {getAgentTypeIcon(agent.type)}
                      <span className="font-medium">{agent.name}</span>
                      <Badge variant="secondary" className="text-xs">Content Available</Badge>
                    </div>
                    
                    {progress.results.data && (
                      <div className="space-y-2">
                        {progress.results.data.executive_summary && progress.results.data.executive_summary.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-1">Summary:</p>
                            <div className="text-xs text-muted-foreground space-y-1">
                              {progress.results.data.executive_summary.slice(0, 3).map((item: string, index: number) => (
                                <p key={index}>• {item}</p>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {progress.results.data.organized_content && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(progress.results.data.organized_content).map(([source, items]: [string, any]) => {
                              if (!Array.isArray(items) || items.length === 0) return null;
                              return (
                                <div key={source} className="p-2 bg-background/50 rounded border">
                                  <p className="font-medium capitalize">{source.replace('_', ' ')}</p>
                                  <p className="text-muted-foreground">{items.length} items</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Timer className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Last updated: {formatTimeAgo(liveMetrics.lastUpdate)}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              <AnimatePresence>
                {recentRuns.slice(0, 10).map((run) => (
                  <motion.div
                    key={run._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(run.status)}
                      <div>
                        <p className="font-medium text-sm">
                          {typeof run.agentId === 'object' ? run.agentId.name : 'Unknown Agent'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {run.results.summary || `${run.itemsProcessed} processed, ${run.itemsAdded} added`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(run.createdAt)}
                      </p>
                      {run.duration && (
                        <p className="text-xs text-muted-foreground">
                          {Math.round(run.duration / 1000)}s
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {recentRuns.length === 0 && (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No recent activity</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Agent runs will appear here
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Success Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Success Rate</span>
                <span>{Math.round(liveMetrics.successRate)}%</span>
              </div>
              <Progress value={liveMetrics.successRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Based on last {recentRuns.length} runs
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Average Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Avg. Time</span>
                <span>{Math.round(liveMetrics.avgResponseTime)}s</span>
              </div>
              <Progress 
                value={Math.min((liveMetrics.avgResponseTime / 60) * 100, 100)} 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground">
                Lower is better (target: under 30s)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgentActivityDashboard;