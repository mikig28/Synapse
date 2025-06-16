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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRecentActivity();
    
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchRecentActivity(true);
      }, 10000); // Refresh every 10 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
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
      if (!silent) {
        toast({
          title: 'Error',
          description: 'Failed to fetch agent activity',
          variant: 'destructive',
        });
      }
    } finally {
      if (!silent) setIsRefreshing(false);
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
            onClick={() => fetchRecentActivity()}
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
                return (
                  <motion.div
                    key={agent._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {getAgentTypeIcon(agent.type)}
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Processing...</span>
                          {activeRun && (
                            <span>• {activeRun.itemsProcessed} items so far</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="animate-pulse">
                        Running
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
                  </motion.div>
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