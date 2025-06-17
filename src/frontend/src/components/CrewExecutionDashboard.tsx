import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Users,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  Brain,
  Shield,
  TrendingUp,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';

interface CrewProgress {
  step: number;
  total_steps: number;
  agent: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message?: string;
  timestamp: string;
}

interface CrewExecutionDashboardProps {
  agentId: string;
  agentName: string;
  isRunning: boolean;
  onExecuteAgent?: () => void;
  onPauseAgent?: () => void;
}

const AGENT_ICONS = {
  'News Research Specialist': Brain,
  'Content Quality Analyst': Shield,
  'URL Validation Specialist': CheckCircle,
  'Trend Analysis Expert': TrendingUp,
  'Crew': Users,
};

const AGENT_COLORS = {
  'News Research Specialist': 'bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  'Content Quality Analyst': 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  'URL Validation Specialist': 'bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  'Trend Analysis Expert': 'bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  'Crew': 'bg-gray-100 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800',
};

export const CrewExecutionDashboard: React.FC<CrewExecutionDashboardProps> = ({
  agentId,
  agentName,
  isRunning,
  onExecuteAgent,
  onPauseAgent,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [crewProgress, setCrewProgress] = useState<CrewProgress | null>(null);
  const [progressHistory, setProgressHistory] = useState<CrewProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch crew progress from the Python service
  const fetchCrewProgress = async () => {
    try {
      // Use environment variable for CrewAI service URL, fallback to production URL
      const crewServiceUrl = import.meta.env.VITE_CREWAI_SERVICE_URL || 
        'https://synapse-crewai.onrender.com';
      const progressUrl = `${crewServiceUrl}/progress`;
      
      console.log('📊 CrewDashboard: Fetching progress from:', progressUrl);
      const response = await fetch(progressUrl);
      const data = await response.json();
      console.log('📊 CrewDashboard: Progress response:', data);
      
      if (data.success && data.progress && Object.keys(data.progress).length > 0) {
        const progress = data.progress as CrewProgress;
        setCrewProgress(progress);
        
        // Update progress history
        setProgressHistory(prev => {
          const newHistory = [...prev];
          const existingIndex = newHistory.findIndex(
            p => p.step === progress.step && p.agent === progress.agent
          );
          
          if (existingIndex >= 0) {
            newHistory[existingIndex] = progress;
          } else {
            newHistory.push(progress);
          }
          
          return newHistory.sort((a, b) => a.step - b.step);
        });
        
        // Calculate overall progress
        const progressPercent = (progress.step / progress.total_steps) * 100;
        setOverallProgress(Math.min(progressPercent, 100));
      }
    } catch (error) {
      console.error('Failed to fetch crew progress:', error);
    }
  };

  // Poll for progress updates when dialog is open and agent is running
  useEffect(() => {
    if (isDialogOpen && isRunning) {
      fetchCrewProgress(); // Initial fetch
      intervalRef.current = setInterval(fetchCrewProgress, 2000); // Poll every 2 seconds
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isDialogOpen, isRunning]);

  // Auto-scroll to bottom when new progress is added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [progressHistory]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 dark:bg-green-950/20 border-l-green-500';
      case 'in_progress':
        return 'bg-blue-50 dark:bg-blue-950/20 border-l-blue-500';
      case 'failed':
        return 'bg-red-50 dark:bg-red-950/20 border-l-red-500';
      default:
        return 'bg-gray-50 dark:bg-gray-950/20 border-l-gray-400';
    }
  };

  const getAgentIcon = (agentName: string) => {
    const IconComponent = AGENT_ICONS[agentName as keyof typeof AGENT_ICONS] || Users;
    return <IconComponent className="w-5 h-5" />;
  };

  const getAgentColors = (agentName: string) => {
    return AGENT_COLORS[agentName as keyof typeof AGENT_COLORS] || AGENT_COLORS['Crew'];
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const completedSteps = progressHistory.filter(p => p.status === 'completed').length;
  const totalSteps = crewProgress?.total_steps || 6;
  const hasActiveProgress = Boolean(crewProgress && Object.keys(crewProgress).length > 0);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Users className="w-4 h-4" />
          Crew Dashboard
          {isRunning && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className={`${isMinimized ? 'h-20' : 'max-w-6xl h-[85vh]'} transition-all duration-300`}>
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5" />
            <DialogTitle>
              {agentName} - Crew Execution Dashboard
              {hasActiveProgress && (
                <Badge variant="outline" className="ml-2">
                  Step {crewProgress?.step || 0} of {totalSteps}
                </Badge>
              )}
            </DialogTitle>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Control Buttons */}
            <div className="flex gap-1">
              {!isRunning && onExecuteAgent && (
                <Button size="sm" variant="ghost" onClick={onExecuteAgent} className="h-8 w-8 p-0">
                  <Play className="w-4 h-4 text-green-600" />
                </Button>
              )}
              {isRunning && onPauseAgent && (
                <Button size="sm" variant="ghost" onClick={onPauseAgent} className="h-8 w-8 p-0">
                  <Pause className="w-4 h-4 text-orange-600" />
                </Button>
              )}
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => {
                  setProgressHistory([]);
                  setCrewProgress(null);
                  setOverallProgress(0);
                }}
                className="h-8 w-8 p-0"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Status Badge */}
            <Badge
              variant={isRunning ? 'secondary' : hasActiveProgress ? 'default' : 'outline'}
              className="gap-1"
            >
              {isRunning ? (
                <>
                  <Activity className="w-3 h-3 animate-pulse" />
                  Executing
                </>
              ) : hasActiveProgress ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Ready
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3" />
                  Idle
                </>
              )}
            </Badge>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4" />
              ) : (
                <Minimize2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </DialogHeader>

        {!isMinimized && (
          <div className="flex flex-col h-full space-y-4">
            {/* Overall Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Overall Progress</span>
                <span className="text-muted-foreground">
                  {completedSteps} of {totalSteps} steps completed
                </span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>

            {/* Agent Status Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(AGENT_ICONS).map(([agentName, IconComponent]) => {
                const agentProgress = progressHistory.find(p => p.agent === agentName);
                const status = agentProgress?.status || 'pending';
                const colors = getAgentColors(agentName);
                
                return (
                  <Card key={agentName} className={`${colors} transition-all duration-200`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <IconComponent className="w-4 h-4" />
                        <span className="text-xs font-medium truncate">{agentName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(status)}
                        <span className="text-xs capitalize">{status.replace('_', ' ')}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Progress Timeline */}
            <Card className="flex-1 min-h-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Execution Timeline
                  {isRunning && (
                    <Badge variant="secondary" className="text-xs">
                      Live Updates
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-full">
                <ScrollArea className="h-full max-h-[400px] px-4 pb-4" ref={scrollAreaRef}>
                  {progressHistory.length === 0 && !hasActiveProgress ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No crew execution data available</p>
                      <p className="text-xs">Progress will appear here when crew starts executing</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {progressHistory.map((progress, index) => (
                        <div
                          key={`${progress.agent}-${progress.step}-${index}`}
                          className={`p-3 rounded-lg border-l-4 ${getStatusColor(progress.status)} transition-all duration-200`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {getAgentIcon(progress.agent)}
                                <span className="text-sm font-medium text-foreground">
                                  {progress.agent}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  Step {progress.step}
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-muted-foreground mb-1">
                                {progress.description}
                              </p>
                              
                              {progress.message && (
                                <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                                  {progress.message}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-end gap-1 ml-3">
                              {getStatusIcon(progress.status)}
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(progress.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="w-4 h-4" />
                {isRunning ? (
                  <span className="text-blue-600">Crew is actively executing...</span>
                ) : hasActiveProgress ? (
                  <span>Last execution completed</span>
                ) : (
                  <span>Waiting for crew execution</span>
                )}
              </div>
              
              <Button size="sm" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Close Dashboard
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};