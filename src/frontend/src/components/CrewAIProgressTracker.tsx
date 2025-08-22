import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgui } from '@/contexts/AguiContext';
import { AGUIEvent } from '@/types/aguiTypes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Brain, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Lightbulb,
  Search,
  FileText,
  Activity
} from 'lucide-react';

interface CrewAIStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  agent: string;
  task: string;
  thoughts?: string;
  reasoning?: string;
  output?: string;
  startTime?: string;
  endTime?: string;
  progress?: number;
}

interface CrewAIProgressData {
  sessionId: string;
  agentId: string;
  agentName: string;
  status: 'idle' | 'starting' | 'running' | 'completed' | 'error';
  currentStep?: number;
  totalSteps: number;
  steps: CrewAIStep[];
  overallProgress: number;
  startTime: string;
  endTime?: string;
  lastUpdate: string;
}

interface CrewAIProgressTrackerProps {
  agentId: string;
  onProgressUpdate?: (progress: CrewAIProgressData) => void;
  className?: string;
}

export const CrewAIProgressTracker: React.FC<CrewAIProgressTrackerProps> = ({
  agentId,
  onProgressUpdate,
  className = ''
}) => {
  const { subscribe, isConnected } = useAgui();
  const [progressData, setProgressData] = useState<CrewAIProgressData | null>(null);
  const [isLive, setIsLive] = useState(false);

  // Handle AG-UI events for CrewAI progress
  const handleAGUIEvent = useCallback((event: AGUIEvent) => {
    // Filter events for this specific agent
    if (event.agentId !== agentId) return;

    // Handle different event types
    switch (event.type) {
      case 'agent_step':
        if (event.stepData) {
          setProgressData(prevData => {
            if (!prevData) return null;

            const updatedSteps = [...prevData.steps];
            const stepIndex = updatedSteps.findIndex(step => step.id === event.stepData.stepId);

            if (stepIndex !== -1) {
              updatedSteps[stepIndex] = {
                ...updatedSteps[stepIndex],
                status: event.stepData.status,
                thoughts: event.stepData.thoughts,
                reasoning: event.stepData.reasoning,
                output: event.stepData.output,
                progress: event.stepData.progress,
                endTime: event.stepData.status === 'completed' ? new Date().toISOString() : undefined
              };
            }

            const newData = {
              ...prevData,
              steps: updatedSteps,
              currentStep: event.stepData.stepIndex,
              overallProgress: Math.round((updatedSteps.filter(s => s.status === 'completed').length / prevData.totalSteps) * 100),
              lastUpdate: new Date().toISOString()
            };

            onProgressUpdate?.(newData);
            return newData;
          });
          setIsLive(true);
        }
        break;

      case 'crew_progress':
        if (event.progressData) {
          const newProgressData: CrewAIProgressData = {
            sessionId: event.progressData.sessionId || 'unknown',
            agentId: agentId,
            agentName: event.progressData.agentName || 'CrewAI Agent',
            status: event.progressData.status || 'idle',
            currentStep: event.progressData.currentStep,
            totalSteps: event.progressData.totalSteps || 0,
            steps: event.progressData.steps?.map((step: any, index: number) => ({
              id: step.id || `step-${index}`,
              name: step.name || step.task || `Step ${index + 1}`,
              status: step.status || 'pending',
              agent: step.agent || 'CrewAI Agent',
              task: step.task || step.name || 'Processing...',
              thoughts: step.thoughts || step.reasoning,
              reasoning: step.analysis || step.context,
              output: step.output || step.result,
              startTime: step.startTime,
              endTime: step.endTime,
              progress: step.progress || 0
            })) || [],
            overallProgress: event.progressData.overallProgress || 0,
            startTime: event.progressData.startTime || new Date().toISOString(),
            endTime: event.progressData.endTime,
            lastUpdate: new Date().toISOString()
          };

          setProgressData(newProgressData);
          onProgressUpdate?.(newProgressData);
          setIsLive(true);
        }
        break;

      case 'agent_execution_started':
        setProgressData(prev => prev ? {
          ...prev,
          status: 'starting',
          startTime: new Date().toISOString(),
          lastUpdate: new Date().toISOString()
        } : null);
        setIsLive(true);
        break;

      case 'agent_execution_completed':
        setProgressData(prev => prev ? {
          ...prev,
          status: 'completed',
          endTime: new Date().toISOString(),
          overallProgress: 100,
          lastUpdate: new Date().toISOString()
        } : null);
        setIsLive(true);
        break;

      case 'agent_execution_error':
        setProgressData(prev => prev ? {
          ...prev,
          status: 'error',
          endTime: new Date().toISOString(),
          lastUpdate: new Date().toISOString()
        } : null);
        setIsLive(true);
        break;
    }
  }, [agentId, onProgressUpdate]);

  // Subscribe to AG-UI events
  useEffect(() => {
    if (!isConnected) return;

    const subscription = subscribe('*', handleAGUIEvent);
    
    return () => {
      subscription?.unsubscribe();
    };
  }, [subscribe, isConnected, handleAGUIEvent]);

  // Auto-hide live indicator after no updates
  useEffect(() => {
    if (isLive) {
      const timeout = setTimeout(() => {
        setIsLive(false);
      }, 10000); // Hide after 10 seconds of no updates

      return () => clearTimeout(timeout);
    }
  }, [isLive, progressData?.lastUpdate]);

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

  if (!progressData) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <Bot className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          {isConnected ? 'Waiting for progress data...' : 'Connecting to live updates...'}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Live Update Indicator */}
      <AnimatePresence>
        {isLive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Activity className="w-4 h-4" />
            </motion.div>
            <span>Live updates active</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overall Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-4 h-4" />
            {progressData.agentName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(progressData.status)}>
                {getStatusIcon(progressData.status)}
                <span className="ml-1 capitalize">{progressData.status}</span>
              </Badge>
              <span className="text-sm text-muted-foreground">
                {progressData.overallProgress}%
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-primary h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressData.overallProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Steps</p>
                <p className="font-medium">
                  {progressData.currentStep || 0} / {progressData.totalSteps}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Session</p>
                <p className="font-medium text-xs">
                  {progressData.sessionId.slice(-8)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Step Details */}
      {progressData.currentStep !== undefined && progressData.steps[progressData.currentStep] && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Current Step
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const currentStep = progressData.steps[progressData.currentStep];
              return (
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

                  {currentStep.reasoning && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Search className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-800">Reasoning</span>
                      </div>
                      <p className="text-sm text-amber-700">
                        {currentStep.reasoning}
                      </p>
                    </div>
                  )}

                  {currentStep.output && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Output</span>
                      </div>
                      <p className="text-sm text-green-700">
                        {currentStep.output}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Connection Status */}
      <div className="text-xs text-muted-foreground text-center">
        {isConnected ? (
          <span className="text-green-600">● Connected to live updates</span>
        ) : (
          <span className="text-red-600">● Disconnected from live updates</span>
        )}
      </div>
    </div>
  );
};

export default CrewAIProgressTracker;