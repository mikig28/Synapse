import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentSteps, useAgentMessages, useAgentState, useAgentLifecycle } from '../hooks/useAguiEvents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  PlayCircle, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  MessageSquare,
  Loader2,
  ChevronRight,
  ChevronDown 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AgentStepTimelineProps {
  agentId: string;
  agentName: string;
  showMessages?: boolean;
  maxHeight?: string;
}

const AgentStepTimeline: React.FC<AgentStepTimelineProps> = ({ 
  agentId, 
  agentName, 
  showMessages = true,
  maxHeight = '400px' 
}) => {
  const { steps, currentStep, hasActiveSteps } = useAgentSteps(agentId);
  const { messages } = useAgentMessages(agentId);
  const { state } = useAgentState(agentId);
  const { currentStatus } = useAgentLifecycle(agentId);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
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

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-500 bg-green-50';
      case 'failed':
        return 'border-red-500 bg-red-50';
      case 'running':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  if (!hasActiveSteps && steps.length === 0) {
    return null;
  }

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">{agentName}</CardTitle>
            {currentStatus && (
              <Badge 
                variant={currentStatus === 'running' ? 'default' : 'secondary'}
                className="animate-pulse"
              >
                {currentStatus}
              </Badge>
            )}
          </div>
          {state && state.progress && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Progress value={state.progress} className="w-24 h-2" />
              <span>{state.progress}%</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className={`px-4 pb-4`} style={{ maxHeight }}>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {steps.map((step, index) => {
                const isExpanded = expandedSteps.has(step.id);
                const isCurrentStep = currentStep?.id === step.id;
                const stepMessages = messages.filter(msg => 
                  msg.timestamp >= step.startTime && 
                  (!step.endTime || msg.timestamp <= step.endTime)
                );

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <div
                      className={cn(
                        "relative rounded-lg border-2 transition-all duration-200",
                        getStepStatusColor(step.status),
                        isCurrentStep && "ring-2 ring-blue-400 ring-offset-2"
                      )}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start p-3 h-auto"
                        onClick={() => toggleStep(step.id)}
                      >
                        <div className="flex items-start gap-3 w-full">
                          <div className="mt-0.5">
                            {getStepIcon(step.status)}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {step.name || `Step ${index + 1}`}
                              </span>
                              {isCurrentStep && (
                                <Badge variant="outline" className="text-xs">
                                  Current
                                </Badge>
                              )}
                            </div>
                            {step.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {step.description}
                              </p>
                            )}
                            {step.duration && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Duration: {(step.duration / 1000).toFixed(1)}s
                              </p>
                            )}
                          </div>
                          <div className="ml-auto">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </div>
                        </div>
                      </Button>

                      {/* Step Details & Messages */}
                      {isExpanded && (showMessages || step.error) && (
                        <div className="px-3 pb-3">
                          {step.error && (
                            <div className="bg-red-100 border border-red-300 rounded p-2 mb-2">
                              <p className="text-xs text-red-700">{step.error}</p>
                            </div>
                          )}
                          
                          {showMessages && stepMessages.length > 0 && (
                            <div className="space-y-1 mt-2">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                <MessageSquare className="w-3 h-3" />
                                <span>Messages</span>
                              </div>
                              {stepMessages.map((msg, msgIndex) => (
                                <div 
                                  key={`${msg.timestamp}-${msgIndex}`}
                                  className="bg-white rounded p-2 text-xs border"
                                >
                                  {msg.content}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Connection Line */}
                    {index < steps.length - 1 && (
                      <div className="relative ml-7 -mt-1 -mb-1">
                        <div className="absolute left-0 w-0.5 h-6 bg-gray-300"></div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Live indicator when agent is running */}
            {currentStatus === 'running' && !currentStep && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200"
              >
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-700">Agent initializing...</span>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AgentStepTimeline;