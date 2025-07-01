import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAguiEvents } from '@/contexts/AguiContext';
import { AGUIEventType, StepProgressEvent, RunStartedEvent, RunCompletedEvent, AgentMessageEvent } from '@/types/aguiTypes';
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

interface CrewExecutionDashboardProps {
  agentId: string;
  agentName: string;
  isRunning: boolean;
  onExecuteAgent: () => void;
  onPauseAgent: () => void;
}

interface ProgressStep {
  id: string;
  agent: string;
  step: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  message: string;
  timestamp: string;
  severity?: 'info' | 'warning' | 'error';
}

export const CrewExecutionDashboard: React.FC<CrewExecutionDashboardProps> = ({ 
  agentId,
  agentName,
  isRunning,
  onExecuteAgent,
  onPauseAgent
}) => {
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [finalResults, setFinalResults] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasAutoOpened = useRef(false);
  const { toast } = useToast();

  // Use AG-UI events for real-time updates
  const handleAguiEvent = (event: any) => {
    // Filter events for this specific agent
    if (event.agent_id !== agentId) return;

    console.log('[CrewDashboard] Received AG-UI event:', event.type, event);

    switch (event.type) {
      case AGUIEventType.RUN_STARTED:
        const runStarted = event as RunStartedEvent;
        setCurrentSessionId(runStarted.session_id);
        setExecutionStatus('running');
        setProgressSteps([]);
        setFinalResults(null);
        setErrorMessage(null);
        setIsConnected(true);
        break;

      case AGUIEventType.STEP_PROGRESS:
        const stepProgress = event as StepProgressEvent;
        setProgressSteps(prev => {
          const existing = prev.find(s => s.id === stepProgress.step_id);
          if (existing) {
            return prev.map(s => 
              s.id === stepProgress.step_id 
                ? { ...s, status: stepProgress.status, message: stepProgress.details || s.message }
                : s
            );
          } else {
            return [...prev, {
              id: stepProgress.step_id,
              agent: stepProgress.agent_name || 'System',
              step: stepProgress.step_name,
              status: stepProgress.status,
              message: stepProgress.details || '',
              timestamp: new Date().toISOString(),
              severity: 'info'
            }];
          }
        });
        break;

      case AGUIEventType.AGENT_MESSAGE:
        const message = event as AgentMessageEvent;
        // Add important messages as steps
        if (message.severity === 'error' || message.severity === 'warning') {
          setProgressSteps(prev => [...prev, {
            id: `msg-${Date.now()}`,
            agent: message.agent_name || 'System',
            step: 'Message',
            status: message.severity === 'error' ? 'error' : 'in_progress',
            message: message.message,
            timestamp: new Date().toISOString(),
            severity: message.severity
          }]);
        }
        break;

      case AGUIEventType.RUN_COMPLETED:
        const runCompleted = event as RunCompletedEvent;
        setExecutionStatus(runCompleted.success ? 'completed' : 'error');
        if (runCompleted.items_collected) {
          setFinalResults({
            itemsCollected: runCompleted.items_collected,
            summary: runCompleted.summary,
            duration: runCompleted.duration
          });
        }
        if (!runCompleted.success && runCompleted.error) {
          setErrorMessage(runCompleted.error);
        }
        break;

      case AGUIEventType.CONNECTION_STATUS:
        setIsConnected(event.status === 'connected');
        break;
    }
  };

  useAguiEvents(handleAguiEvent, [agentId]);

  // Auto-open panel when agent starts running
  useEffect(() => {
    if (isRunning && !hasAutoOpened.current) {
      setIsPanelVisible(true);
      hasAutoOpened.current = true;
      toast({
        title: 'Agent Started',
        description: `${agentName} is now running. View live progress!`,
        duration: 3000,
      });
    } else if (!isRunning) {
      hasAutoOpened.current = false;
      // Reset status when agent stops
      if (executionStatus === 'running') {
        setExecutionStatus('idle');
      }
    }
  }, [isRunning, agentName, toast, executionStatus]);

  // Calculate progress percentage
  const calculateProgress = () => {
    if (progressSteps.length === 0) return 0;
    const completedSteps = progressSteps.filter(s => s.status === 'completed').length;
    return Math.round((completedSteps / progressSteps.length) * 100);
  };

  const renderStep = (step: ProgressStep, index: number) => (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-start gap-3"
    >
      <div>
        {step.status === 'completed' ? (
          <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
        ) : step.status === 'error' ? (
          <AlertCircle className="w-4 h-4 text-red-500 mt-1" />
        ) : step.status === 'in_progress' ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-500 mt-1" />
        ) : (
          <Clock className="w-4 h-4 text-gray-400 mt-1" />
        )}
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">
          {step.agent}: <span className="font-normal">{step.step}</span>
        </p>
        {step.message && (
          <p className={`text-xs ${
            step.severity === 'error' ? 'text-red-500' : 
            step.severity === 'warning' ? 'text-yellow-500' : 
            'text-muted-foreground'
          }`}>
            {step.message}
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{new Date(step.timestamp).toLocaleTimeString()}</p>
    </motion.div>
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setIsPanelVisible(true)}
      >
        <Eye className="w-4 h-4 mr-2" />
        View Crew Progress
        {isRunning && (
          <Badge variant="default" className="ml-2 animate-pulse">
            Live
          </Badge>
        )}
      </Button>

      <AnimatePresence>
        {isPanelVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
            onClick={() => setIsPanelVisible(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl h-[80vh] bg-background rounded-xl border shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cpu className="w-6 h-6 text-purple-500" />
                  <div>
                    <CardTitle>Crew Execution: {agentName}</CardTitle>
                    <CardDescription>Live progress from the CrewAI multi-agent system via AG-UI.</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isConnected ? (
                    <Badge variant="outline" className="text-green-500 border-green-500">
                      <Wifi className="w-3 h-3 mr-1" /> AG-UI Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <WifiOff className="w-3 h-3 mr-1" /> AG-UI Offline
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setIsPanelVisible(false)}>X</Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-4">
                    {/* Status and Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-sm">
                        <Badge variant={
                          executionStatus === 'completed' ? 'default' :
                          executionStatus === 'error' ? 'destructive' :
                          executionStatus === 'running' ? 'secondary' :
                          'outline'
                        }>
                          {executionStatus}
                        </Badge>
                        {currentSessionId && (
                          <p><strong className="font-semibold">Session:</strong> {currentSessionId}</p>
                        )}
                      </div>
                      
                      {executionStatus === 'running' && (
                        <div className="w-full bg-muted rounded-full h-2.5">
                          <motion.div
                            className="h-2.5 rounded-full bg-blue-500"
                            initial={{ width: '0%' }}
                            animate={{ width: `${calculateProgress()}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Progress Steps */}
                    {progressSteps.length > 0 ? (
                      <div className="space-y-3 pt-2">
                        {progressSteps.map(renderStep)}
                      </div>
                    ) : isRunning ? (
                      <div className="text-center py-10">
                        <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                        <p className="mt-2 text-muted-foreground">
                          {isConnected ? 'Waiting for agent execution steps...' : 'Connecting to AG-UI...'}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">
                        <Brain className="w-8 h-8 mx-auto mb-2" />
                        <p>Agent is not currently running.</p>
                        <p className="text-sm mt-1">Start the agent to see live progress.</p>
                      </div>
                    )}

                    {/* Final Results */}
                    {executionStatus === 'completed' && finalResults && (
                      <Card className="mt-4">
                        <CardHeader>
                          <CardTitle className="text-lg">Execution Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {finalResults.itemsCollected && (
                            <p className="mb-2">
                              <strong>Items Collected:</strong> {finalResults.itemsCollected}
                            </p>
                          )}
                          {finalResults.duration && (
                            <p className="mb-2">
                              <strong>Duration:</strong> {finalResults.duration}s
                            </p>
                          )}
                          {finalResults.summary && (
                            <div className="mt-3">
                              <strong>Summary:</strong>
                              <p className="text-sm text-muted-foreground mt-1">{finalResults.summary}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Error Display */}
                    {executionStatus === 'error' && errorMessage && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-300">
                        <p className="font-bold">An error occurred:</p>
                        <p className="text-sm">{errorMessage}</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};