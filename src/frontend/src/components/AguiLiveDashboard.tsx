import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useAgentLifecycle, 
  useAgentSteps, 
  useAgentMessages,
  useAguiStats 
} from '../hooks/useAguiEvents';
import { useAgui } from '../contexts/AguiContext';
import { AGUIEventType, AgentStatus } from '../types/aguiTypes';
import { 
  Activity, 
  Zap, 
  MessageSquare, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Bot,
  Sparkles,
  TrendingUp,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Box
} from 'lucide-react';
import { cn } from '@/lib/utils';
// Removed problematic 3D import - replaced with safe version
// import { AgentVisualization3D } from './AgentVisualization3D';

interface AguiLiveDashboardProps {
  className?: string;
}

export const AguiLiveDashboard: React.FC<AguiLiveDashboardProps> = ({ className }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const isInitialMount = useRef(true);
  
  const { isConnected, eventCount } = useAgui();
  const { runningRuns, completedRuns, failedRuns } = useAgentLifecycle();
  const { steps, currentStep, hasActiveSteps } = useAgentSteps();
  const { messages } = useAgentMessages();
  const { eventStats, totalEventTypes, mostFrequentEventType } = useAguiStats();

  // Auto-show when there's real activity (but not on initial mount)
  useEffect(() => {
    // Skip auto-showing on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (runningRuns.length > 0 || hasActiveSteps || messages.length > 0) {
      setIsVisible(true);
      if (runningRuns.length > 0 || hasActiveSteps) {
        setIsExpanded(true);
      }
    }
  }, [runningRuns.length, hasActiveSteps, messages.length]);

  // Calculate live stats
  const totalRuns = runningRuns.length + completedRuns.length + failedRuns.length;
  const successRate = totalRuns > 0 ? (completedRuns.length / totalRuns) * 100 : 0;
  const activeAgents = new Set(runningRuns.map(r => r.agentId)).size;
  
  // Calculate active steps from the steps array
  const activeStepsCount = steps.filter(step => step.status === 'running').length;

  // Latest events
  const latestSteps = steps.slice(0, 5);
  const latestMessages = messages.slice(0, 5);

  // Create mock agents for 3D visualization from current data
  const mockAgents: AgentStatus[] = [
    ...Array.from(runningRuns).map((runId, index) => ({
      id: runId,
      name: `Agent ${runId.slice(-6)}`,
      type: 'CrewAI',
      status: 'running' as const,
      lastActivity: new Date().toISOString(),
      performance: {
        tasksCompleted: Math.floor(Math.random() * 50),
        successRate: Math.random() * 100,
        avgResponseTime: Math.random() * 1000
      }
    })),
    ...completedRuns.slice(0, 3).map((runId, index) => ({
      id: runId,
      name: `Agent ${runId.slice(-6)}`,
      type: 'Assistant',
      status: 'completed' as const,
      lastActivity: new Date().toISOString(),
      performance: {
        tasksCompleted: Math.floor(Math.random() * 50) + 10,
        successRate: 85 + Math.random() * 15,
        avgResponseTime: Math.random() * 800
      }
    })),
    ...failedRuns.slice(0, 2).map((run, index) => ({
      id: run.runId,
      name: `Agent ${run.runId.slice(-6)}`,
      type: 'Assistant',
      status: 'error' as const,
      lastActivity: new Date().toISOString(),
      performance: {
        tasksCompleted: Math.floor(Math.random() * 20),
        successRate: Math.random() * 50,
        avgResponseTime: Math.random() * 2000
      }
    }))
  ];

  // Add some idle agents if we don't have enough active ones
  while (mockAgents.length < 4) {
    mockAgents.push({
      id: `idle-${mockAgents.length}`,
      name: `Agent ${String(mockAgents.length + 1).padStart(2, '0')}`,
      type: Math.random() > 0.5 ? 'CrewAI' : 'Assistant',
      status: 'idle',
      lastActivity: new Date(Date.now() - Math.random() * 60000).toISOString(),
      performance: {
        tasksCompleted: Math.floor(Math.random() * 30),
        successRate: 70 + Math.random() * 30,
        avgResponseTime: Math.random() * 1200
      }
    });
  }

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-20 right-4 z-40"
        onClick={() => setIsVisible(true)}
      >
        <Eye className="w-4 h-4 mr-2" />
        Show Live Dashboard
      </Button>
    );
  }

  return (
    <Card className={cn(
      "fixed bottom-4 right-4 z-40 transition-all duration-300",
      isExpanded ? "w-[480px] h-[600px]" : "w-[400px] h-[400px]",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Sparkles className="w-6 h-6 text-primary" />
              {isConnected && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">AG-UI Live Dashboard</CardTitle>
              <CardDescription className="text-xs">
                Real-time agent execution monitoring
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
              {isConnected ? `${eventCount} events` : 'Disconnected'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
            >
              <EyeOff className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full">
          <TabsList className="grid w-full grid-cols-4 px-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="3d">
              <Box className="w-3 h-3 mr-1" />
              3D View
            </TabsTrigger>
            <TabsTrigger value="steps">Steps</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="px-4 space-y-4 mt-4">
            {/* Live Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-3 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-blue-600" />
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{activeAgents}</p>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400">Active Agents</p>
              </motion.div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-3 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{Math.round(successRate)}%</p>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400">Success Rate</p>
              </motion.div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-3 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{runningRuns.length}</p>
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400">Running Now</p>
              </motion.div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-3 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-600" />
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{activeStepsCount}</p>
                </div>
                <p className="text-xs text-orange-600 dark:text-orange-400">Active Steps</p>
              </motion.div>
            </div>

            {/* Event Type Distribution */}
            {isExpanded && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Event Types</p>
                <div className="space-y-1">
                  {Object.entries(eventStats).slice(0, 5).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{type.replace(/_/g, ' ')}</span>
                      <Badge variant="outline" className="text-xs">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Most Active Agent */}
            {mostFrequentEventType && (
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Most Active Event</p>
                <p className="text-sm font-medium">{mostFrequentEventType.replace(/_/g, ' ')}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="3d" className="mt-4">
            <div className={isExpanded ? "h-[450px]" : "h-[280px]"}>
              <Card className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-dashed border-blue-200 dark:border-blue-700">
                <CardContent className="text-center">
                  <Box className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    3D View Temporarily Disabled
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use the main Agents page for 3D visualization
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => window.location.href = '/agents'}
                  >
                    Go to Agents Page
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="steps" className="px-4 mt-4">
            <ScrollArea className={isExpanded ? "h-[450px]" : "h-[280px]"}>
              <div className="space-y-3">
                <AnimatePresence>
                  {latestSteps.length > 0 ? (
                    latestSteps.map((step, index) => (
                      <motion.div
                        key={`${step.stepId}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="mt-1">
                          {step.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{step.name}</p>
                          {step.agentId && (
                            <p className="text-xs text-muted-foreground">Agent: {step.agentId.slice(-8)}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(step.startTime).toLocaleTimeString()}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No active steps yet</p>
                      <p className="text-xs text-muted-foreground">Run an agent to see live progress</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="messages" className="px-4 mt-4">
            <ScrollArea className={isExpanded ? "h-[450px]" : "h-[280px]"}>
              <div className="space-y-3">
                <AnimatePresence>
                  {latestMessages.length > 0 ? (
                    latestMessages.map((message, index) => (
                      <motion.div
                        key={`${message.messageId}-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No messages yet</p>
                      <p className="text-xs text-muted-foreground">Agent messages will appear here</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}; 