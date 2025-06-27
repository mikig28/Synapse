import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { agentService } from '../services/agentService';
import { Agent } from '../types/agent';
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
  Terminal,
  Bug,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

interface CrewExecutionDashboardProps {
  agent: Agent;
  className?: string;
}

interface DebugLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  data?: any;
}

interface CrewProgress {
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
  debug_info?: any;
}

const CrewExecutionDashboard: React.FC<CrewExecutionDashboardProps> = ({
  agent,
  className = ''
}) => {
  const [progress, setProgress] = useState<CrewProgress | null>(null);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(3000); // 3 seconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Add debug log
  const addDebugLog = (level: DebugLog['level'], message: string, data?: any) => {
    const log: DebugLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    
    setDebugLogs(prev => [log, ...prev.slice(0, 49)]); // Keep last 50 logs
    
    if (level === 'error') {
      console.error(`[CrewDashboard] ${message}`, data);
    } else {
      console.log(`[CrewDashboard] ${message}`, data);
    }
  };

  // Fetch progress from backend
  const fetchProgress = async (silent: boolean = false) => {
    try {
      if (!silent) {
        addDebugLog('info', `Fetching progress for agent: ${agent.name} (${agent._id})`);
      }
      
      const response = await agentService.getCrewProgress(agent._id);
      
      if (response.success) {
        setProgress(response.progress || null);
        setIsConnected(true);
        
        if (!silent) {
          addDebugLog('success', 'Progress retrieved successfully', {
            hasActiveProgress: response.progress?.hasActiveProgress,
            stepsCount: response.progress?.steps?.length,
            hasResults: !!response.progress?.results
          });
        }
        
        // Log each new step
        if (response.progress?.steps) {
          response.progress.steps.forEach((step, index) => {
            const stepKey = `${step.agent}-${step.step}-${step.timestamp}`;
            if (!debugLogs.some(log => log.data?.stepKey === stepKey)) {
              addDebugLog('info', `Step ${index + 1}: ${step.agent} - ${step.step}`, {
                stepKey,
                status: step.status,
                message: step.message
              });
            }
          });
        }
        
      } else {
        setProgress(null);
        setIsConnected(false);
        addDebugLog('warning', 'No progress data available', response);
      }
      
    } catch (error: any) {
      setIsConnected(false);
      addDebugLog('error', `Failed to fetch progress: ${error.message}`, error);
      
      if (!silent) {
        toast({
          title: 'Connection Error',
          description: `Failed to fetch progress: ${error.message}`,
          variant: 'destructive',
        });
      }
    }
  };

  // Start/stop auto refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    if (!autoRefresh) {
      fetchProgress();
    }
  };

  // Clear debug logs
  const clearLogs = () => {
    setDebugLogs([]);
    addDebugLog('info', 'Debug logs cleared');
  };

  // Effect for auto refresh
  useEffect(() => {
    if (autoRefresh && agent.status === 'running') {
      fetchProgress();
      
      intervalRef.current = setInterval(() => {
        fetchProgress(true);
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, agent.status]);

  // Effect for initial load
  useEffect(() => {
    addDebugLog('info', `Dashboard initialized for agent: ${agent.name}`, {
      agentId: agent._id,
      agentType: agent.type,
      agentStatus: agent.status
    });
    
    if (agent.status === 'running') {
      fetchProgress();
    }
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLogIcon = (level: DebugLog['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-3 h-3 text-yellow-500" />;
      default:
        return <Terminal className="w-3 h-3 text-blue-500" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-xl font-semibold">CrewAI Execution Dashboard</h3>
            <p className="text-sm text-muted-foreground">
              Live progress tracking for {agent.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAutoRefresh}
            className={autoRefresh ? 'text-green-600' : ''}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchProgress()}
          >
            <Eye className="w-4 h-4 mr-2" />
            Check Now
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{agent.status}</p>
                <p className="text-xs text-muted-foreground">Agent Status</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{progress?.steps?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Steps Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <Brain className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{progress?.hasActiveProgress ? 'Yes' : 'No'}</p>
                <p className="text-xs text-muted-foreground">Active Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <Globe className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{progress?.results ? 'Yes' : 'No'}</p>
                <p className="text-xs text-muted-foreground">Has Results</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Execution Steps */}
      {progress?.steps && progress.steps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cpu className="w-5 h-5 text-green-500" />
              Execution Steps ({progress.steps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                <AnimatePresence>
                  {progress.steps.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg"
                    >
                      {getStepIcon(step.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{step.agent}</p>
                          <Badge variant="outline" className="text-xs">
                            {step.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{step.step}</p>
                        {step.message && (
                          <p className="text-xs text-muted-foreground/80 mt-1">{step.message}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(step.timestamp)}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Debug Console */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bug className="w-5 h-5 text-yellow-500" />
              Debug Console ({debugLogs.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
            >
              Clear Logs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-2 font-mono text-xs">
              <AnimatePresence>
                {debugLogs.map((log, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 p-2 bg-background rounded border"
                  >
                    {getLogIcon(log.level)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <Badge variant={log.level === 'error' ? 'destructive' : 'secondary'} className="text-xs">
                          {log.level}
                        </Badge>
                      </div>
                      <p className="mt-1">{log.message}</p>
                      {log.data && (
                        <pre className="mt-1 text-xs text-muted-foreground overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {debugLogs.length === 0 && (
                <div className="text-center py-8">
                  <Terminal className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No debug logs yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Logs will appear here as the agent executes
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Results Display */}
      {progress?.results && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Execution Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <pre className="text-xs bg-muted/30 p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(progress.results, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {progress?.error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-red-600">
              <AlertCircle className="w-5 h-5" />
              Error Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <p className="text-red-800 dark:text-red-200">{progress.error}</p>
              {progress.debug_info && (
                <pre className="mt-2 text-xs text-red-700 dark:text-red-300 overflow-x-auto">
                  {JSON.stringify(progress.debug_info, null, 2)}
                </pre>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CrewExecutionDashboard;