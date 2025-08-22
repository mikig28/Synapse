import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { agentService } from '@/services/agentService';
import { Agent, AgentRun } from '@/types/agent';
import CrewAIProgressTracker from './CrewAIProgressTracker';
import { 
  Bot, 
  Brain, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Eye, 
  ChevronRight, 
  ChevronDown,
  Activity,
  MessageSquare,
  Lightbulb,
  Search,
  FileText,
  Zap,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';

// Types for CrewAI process data
interface CrewStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  startTime?: string;
  endTime?: string;
  duration?: number;
  agent: string;
  task: string;
  thoughts?: string;
  reasoning?: string;
  output?: string;
  progress?: number;
}

interface CrewProgress {
  sessionId: string;
  status: 'idle' | 'starting' | 'running' | 'completed' | 'error';
  currentStep?: number;
  totalSteps: number;
  steps: CrewStep[];
  overallProgress: number;
  startTime: string;
  endTime?: string;
  results?: any;
  hasActiveProgress: boolean;
}

interface MobileCrewAIViewerProps {
  agent: Agent;
  isVisible: boolean;
  onClose: () => void;
}

// Animation variants for mobile
const mobileVariants = {
  hidden: { 
    opacity: 0, 
    y: '100%',
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300
    }
  },
  exit: { 
    opacity: 0, 
    y: '100%',
    scale: 0.95,
    transition: {
      duration: 0.2
    }
  }
};

const stepVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3 }
  }
};

const thoughtsVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { 
    opacity: 1, 
    height: 'auto',
    transition: { duration: 0.3 }
  }
};

export const MobileCrewAIViewer: React.FC<MobileCrewAIViewerProps> = memo(({ 
  agent, 
  isVisible, 
  onClose 
}) => {
  const { toast } = useToast();
  const [progress, setProgress] = useState<CrewProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [currentView, setCurrentView] = useState<'overview' | 'steps' | 'logs' | 'live'>('overview');
  const [liveProgress, setLiveProgress] = useState<any>(null);

  // Handle live progress updates
  const handleLiveProgressUpdate = useCallback((progressData: any) => {
    setLiveProgress(progressData);
    // Also update the static progress data if live data is more recent
    if (!progress || new Date(progressData.lastUpdate) > new Date(progress.startTime)) {
      setProgress(progressData);
    }
  }, [progress]);

  // Fetch crew progress
  const fetchProgress = useCallback(async () => {
    if (!agent._id) return;
    
    try {
      setLoading(true);
      const progressData = await agentService.getCrewProgress(agent._id);
      
      // Transform backend data to our format
      const transformedProgress: CrewProgress = {
        sessionId: progressData.sessionId || 'unknown',
        status: progressData.status || 'idle',
        currentStep: progressData.currentStep || 0,
        totalSteps: progressData.steps?.length || 0,
        steps: progressData.steps?.map((step: any, index: number) => ({
          id: step.id || `step-${index}`,
          name: step.name || step.task || `Step ${index + 1}`,
          status: step.status || 'pending',
          startTime: step.startTime,
          endTime: step.endTime,
          duration: step.duration,
          agent: step.agent || 'CrewAI Agent',
          task: step.task || step.name || 'Processing...',
          thoughts: step.thoughts || step.reasoning,
          reasoning: step.analysis || step.context,
          output: step.output || step.result,
          progress: step.progress || 0
        })) || [],
        overallProgress: progressData.overallProgress || 0,
        startTime: progressData.startTime || new Date().toISOString(),
        endTime: progressData.endTime,
        results: progressData.results,
        hasActiveProgress: progressData.hasActiveProgress || false
      };
      
      setProgress(transformedProgress);
    } catch (error: any) {
      console.error('Error fetching crew progress:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch agent progress',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [agent._id, toast]);

  // Set up auto-refresh
  useEffect(() => {
    if (isVisible && autoRefresh) {
      fetchProgress();
      const interval = setInterval(fetchProgress, 3000); // Refresh every 3 seconds
      setRefreshInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [isVisible, autoRefresh, fetchProgress]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  const toggleStepExpansion = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="fixed inset-x-0 bottom-0 max-h-[90vh] bg-background rounded-t-2xl shadow-2xl overflow-hidden"
          variants={mobileVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Header */}
          <div className="sticky top-0 bg-background border-b border-border z-10">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-500" />
                  <div>
                    <h2 className="font-semibold text-sm">{agent.name}</h2>
                    <p className="text-xs text-muted-foreground">CrewAI Process</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`p-2 ${autoRefresh ? 'text-green-600' : 'text-gray-400'}`}
                >
                  <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Mobile Navigation Tabs */}
            <div className="flex border-t border-border">
              {[
                { id: 'overview', label: 'Overview', icon: Activity },
                { id: 'live', label: 'Live', icon: Zap },
                { id: 'steps', label: 'Steps', icon: Brain },
                { id: 'logs', label: 'Logs', icon: FileText }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setCurrentView(id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                    currentView === id
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="p-4 space-y-4">
              {loading && !progress ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {currentView === 'overview' && (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      {/* Overall Progress */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Overall Progress
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge className={getStatusColor(progress?.status || 'idle')}>
                                {getStatusIcon(progress?.status || 'idle')}
                                <span className="ml-1 capitalize">{progress?.status || 'Idle'}</span>
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {progress?.overallProgress || 0}%
                              </span>
                            </div>
                            
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <motion.div
                                className="bg-primary h-2 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress?.overallProgress || 0}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Steps</p>
                                <p className="font-medium">
                                  {progress?.currentStep || 0} / {progress?.totalSteps || 0}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Started</p>
                                <p className="font-medium">
                                  {formatTimeAgo(progress?.startTime)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Current Activity */}
                      {progress?.steps && progress.currentStep !== undefined && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              Current Activity
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {(() => {
                              const currentStep = progress.steps[progress.currentStep];
                              return currentStep ? (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(currentStep.status)}
                                    <span className="font-medium">{currentStep.name}</span>
                                  </div>
                                  
                                  <p className="text-sm text-muted-foreground">
                                    {currentStep.task}
                                  </p>
                                  
                                  {currentStep.thoughts && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Lightbulb className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-800">AI Thoughts</span>
                                      </div>
                                      <p className="text-sm text-blue-700">
                                        {currentStep.thoughts}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No active step</p>
                              );
                            })()}
                          </CardContent>
                        </Card>
                      )}
                    </motion.div>
                  )}

                  {currentView === 'live' && (
                    <motion.div
                      key="live"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <CrewAIProgressTracker
                        agentId={agent._id}
                        onProgressUpdate={handleLiveProgressUpdate}
                        className="w-full"
                      />
                    </motion.div>
                  )}

                  {currentView === 'steps' && (
                    <motion.div
                      key="steps"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-3"
                    >
                      {progress?.steps?.map((step, index) => (
                        <motion.div
                          key={step.id}
                          variants={stepVariants}
                          initial="hidden"
                          animate="visible"
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className="overflow-hidden">
                            <CardContent className="p-0">
                              <button
                                onClick={() => toggleStepExpansion(step.id)}
                                className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                      {index + 1}
                                    </div>
                                    {getStatusIcon(step.status)}
                                    <div>
                                      <p className="font-medium text-sm">{step.name}</p>
                                      <p className="text-xs text-muted-foreground">{step.agent}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    {step.duration && (
                                      <span className="text-xs text-muted-foreground">
                                        {formatDuration(step.duration)}
                                      </span>
                                    )}
                                    {expandedSteps.has(step.id) ? (
                                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                              </button>

                              <AnimatePresence>
                                {expandedSteps.has(step.id) && (
                                  <motion.div
                                    variants={thoughtsVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="hidden"
                                    className="border-t border-border"
                                  >
                                    <div className="p-4 space-y-3">
                                      <div>
                                        <h4 className="text-sm font-medium mb-1">Task</h4>
                                        <p className="text-sm text-muted-foreground">{step.task}</p>
                                      </div>
                                      
                                      {step.thoughts && (
                                        <div>
                                          <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                                            <Brain className="w-3 h-3" />
                                            AI Thoughts
                                          </h4>
                                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <p className="text-sm text-blue-700">{step.thoughts}</p>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {step.reasoning && (
                                        <div>
                                          <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                                            <Search className="w-3 h-3" />
                                            Reasoning
                                          </h4>
                                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                            <p className="text-sm text-amber-700">{step.reasoning}</p>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {step.output && (
                                        <div>
                                          <h4 className="text-sm font-medium mb-1">Output</h4>
                                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                            <p className="text-sm text-green-700">{step.output}</p>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {(step.startTime || step.endTime) && (
                                        <div className="flex gap-4 text-xs text-muted-foreground">
                                          {step.startTime && (
                                            <span>Started: {formatTimeAgo(step.startTime)}</span>
                                          )}
                                          {step.endTime && (
                                            <span>Ended: {formatTimeAgo(step.endTime)}</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                      
                      {(!progress?.steps || progress.steps.length === 0) && (
                        <div className="text-center py-8">
                          <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground">No steps available yet</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Execute the agent to see the process steps
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {currentView === 'logs' && (
                    <motion.div
                      key="logs"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-3"
                    >
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Execution Logs
                          </CardTitle>
                          <CardDescription>
                            Detailed logs from the CrewAI execution process
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {progress?.steps?.map((step, index) => (
                              <div key={step.id} className="border-l-2 border-muted pl-3 py-2">
                                <div className="flex items-center gap-2 text-sm">
                                  {getStatusIcon(step.status)}
                                  <span className="font-medium">{step.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimeAgo(step.startTime)}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {step.task}
                                </p>
                                {step.output && (
                                  <p className="text-xs text-green-600 mt-1 bg-green-50 p-2 rounded">
                                    {step.output}
                                  </p>
                                )}
                              </div>
                            ))}
                            
                            {(!progress?.steps || progress.steps.length === 0) && (
                              <div className="text-center py-4">
                                <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">No logs available</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

MobileCrewAIViewer.displayName = 'MobileCrewAIViewer';

export default MobileCrewAIViewer;