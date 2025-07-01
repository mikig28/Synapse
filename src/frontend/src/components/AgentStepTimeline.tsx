import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  Loader2, 
  AlertCircle, 
  Clock, 
  Bot, 
  Zap,
  Activity,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAgentSteps, useAgentMessages } from '../hooks/useAguiEvents';

interface AgentStepTimelineProps {
  agentId: string;
  agentName?: string;
  className?: string;
  maxSteps?: number;
  showMessages?: boolean;
  compact?: boolean;
}

interface StepIconProps {
  status: 'started' | 'finished' | 'error';
  isActive?: boolean;
}

const StepIcon: React.FC<StepIconProps> = ({ status, isActive = false }) => {
  const baseClasses = "w-4 h-4";
  
  switch (status) {
    case 'started':
      return (
        <div className="relative">
          <Loader2 className={`${baseClasses} animate-spin text-blue-500`} />
          {isActive && (
            <div className="absolute -inset-1 rounded-full bg-blue-500/20 animate-pulse" />
          )}
        </div>
      );
    case 'finished':
      return <CheckCircle className={`${baseClasses} text-green-500`} />;
    case 'error':
      return <AlertCircle className={`${baseClasses} text-red-500`} />;
    default:
      return <Clock className={`${baseClasses} text-gray-400`} />;
  }
};

const formatTimeAgo = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);

  if (diffSecs < 10) return 'Just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  return date.toLocaleTimeString();
};

const getStepProgress = (steps: any[], activeSteps: string[]): number => {
  if (steps.length === 0) return 0;
  const finishedSteps = steps.filter(step => step.status === 'finished').length;
  return (finishedSteps / steps.length) * 100;
};

export const AgentStepTimeline: React.FC<AgentStepTimelineProps> = ({
  agentId,
  agentName,
  className = '',
  maxSteps = 20,
  showMessages = false,
  compact = false
}) => {
  const { steps, activeSteps, hasActiveSteps } = useAgentSteps(agentId);
  const { messages } = useAgentMessages(agentId, 10);

  const displaySteps = steps.slice(0, maxSteps);
  const progress = getStepProgress(displaySteps, activeSteps);

  if (displaySteps.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No execution steps yet</p>
            <p className="text-sm mt-1">Steps will appear here when the agent starts running</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className={compact ? "pb-3" : "pb-4"}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="w-5 h-5 text-primary" />
            {agentName || 'Agent'} Timeline
            {hasActiveSteps && (
              <Badge variant="default" className="animate-pulse ml-2">
                <Zap className="w-3 h-3 mr-1" />
                Active
              </Badge>
            )}
          </CardTitle>
          <div className="text-right">
            <p className="text-sm font-medium">{displaySteps.length} steps</p>
            <p className="text-xs text-muted-foreground">
              {activeSteps.length} running
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {!compact && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardHeader>

      <CardContent className={compact ? "pt-0" : ""}>
        <ScrollArea className={compact ? "h-64" : "h-80"}>
          <div className="space-y-3">
            <AnimatePresence>
              {displaySteps.map((step, index) => {
                const isActive = activeSteps.includes(step.stepId);
                const isLatest = index === 0;
                
                return (
                  <motion.div
                    key={step.stepId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      isActive 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                        : isLatest 
                          ? 'bg-muted/50' 
                          : 'bg-background'
                    }`}
                  >
                    {/* Step Icon and Connector */}
                    <div className="flex flex-col items-center">
                      <StepIcon status={step.status} isActive={isActive} />
                      {index < displaySteps.length - 1 && (
                        <div className={`w-px h-8 mt-2 ${
                          step.status === 'finished' ? 'bg-green-200' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-medium text-sm truncate ${
                          isActive ? 'text-blue-700 dark:text-blue-300' : ''
                        }`}>
                          {step.stepName}
                        </p>
                        {isActive && (
                          <Badge variant="outline" className="animate-pulse text-xs">
                            Running
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(step.timestamp)}
                        </p>
                        {step.status === 'finished' && (
                          <ArrowRight className="w-3 h-3 text-green-500" />
                        )}
                      </div>

                      {/* Step Messages */}
                      {showMessages && isActive && (
                        <div className="mt-2 p-2 bg-background/80 rounded border text-xs">
                          {messages
                            .filter(msg => msg.timestamp >= step.timestamp)
                            .slice(0, 2)
                            .map(msg => (
                              <p key={msg.messageId} className="text-muted-foreground mb-1 last:mb-0">
                                {msg.content.slice(0, 100)}
                                {msg.content.length > 100 ? '...' : ''}
                              </p>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Load More Indicator */}
            {steps.length > maxSteps && (
              <div className="text-center py-2">
                <p className="text-xs text-muted-foreground">
                  ... and {steps.length - maxSteps} more steps
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Recent Messages Section */}
        {showMessages && messages.length > 0 && !compact && (
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Recent Messages
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {messages.slice(0, 3).map(msg => (
                <div key={msg.messageId} className="text-xs p-2 bg-muted/30 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{msg.role}</Badge>
                    <span className="text-muted-foreground">
                      {formatTimeAgo(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    {msg.content.slice(0, 150)}
                    {msg.content.length > 150 ? '...' : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {!compact && (
          <div className="mt-4 grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <p className="font-medium text-green-600">
                {displaySteps.filter(s => s.status === 'finished').length}
              </p>
              <p className="text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="font-medium text-blue-600">{activeSteps.length}</p>
              <p className="text-muted-foreground">Running</p>
            </div>
            <div>
              <p className="font-medium text-gray-600">{displaySteps.length}</p>
              <p className="text-muted-foreground">Total</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AgentStepTimeline;