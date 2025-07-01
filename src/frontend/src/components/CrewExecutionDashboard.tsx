import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { agentService, AgentProgress } from '../services/agentService';
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

interface CrewExecutionDashboardProps {
  agentId: string;
  agentName: string;
  isRunning: boolean;
  onExecuteAgent: () => void;
  onPauseAgent: () => void;
}

export const CrewExecutionDashboard: React.FC<CrewExecutionDashboardProps> = ({ 
  agentId,
  agentName,
  isRunning,
  onExecuteAgent,
  onPauseAgent
}) => {
  const [progress, setProgress] = useState<AgentProgress | null>(null);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoOpened = useRef(false);
  const { toast } = useToast();

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
    }
  }, [isRunning, agentName, toast]);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await agentService.healthCheck();
        setIsOnline(true);
      } catch {
        setIsOnline(false);
        setProgress(null);
      }
    };

    checkConnection();

    if (isRunning) {
      fetchProgress(); // Fetch immediately
      intervalRef.current = setInterval(fetchProgress, 3000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setProgress(null);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, agentId]);

  const fetchProgress = async () => {
    try {
      const response = await agentService.getCrewProgress(agentId);
      if (response.success && response.progress) {
        setProgress(response.progress);
        if(response.progress?.status === 'completed' || response.progress?.status === 'error') {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } else {
         if (response.status === 404 && response.error?.includes('No active session')) {
           setProgress(null);
         } else if (response.status !== 202) { 
           //
         }
      }
      if (!isOnline) setIsOnline(true);
    } catch (error) {
      if (isOnline) setIsOnline(false);
      console.error(`[CrewDashboard] Error fetching progress for ${agentId}:`, error);
    }
  };

  const renderStep = (step: any, index: number) => (
    <motion.div
      key={index}
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
        ) : (
          <Loader2 className="w-4 h-4 animate-spin text-blue-500 mt-1" />
        )}
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">{step.agent || 'System'}: <span className="font-normal">{step.step}</span></p>
        <p className="text-xs text-muted-foreground">{step.message}</p>
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
                    <CardDescription>Live progress from the CrewAI multi-agent system.</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isOnline ? (
                    <Badge variant="outline" className="text-green-500 border-green-500"><Wifi className="w-3 h-3 mr-1" /> Online</Badge>
                  ) : (
                    <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" /> Offline</Badge>
                  )}
                   <Button variant="ghost" size="sm" onClick={() => setIsPanelVisible(false)}>X</Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-4">
                    {progress ? (
                      <>
                        <div className="flex items-center gap-4 text-sm">
                           <Badge variant={
                             progress.status === 'completed' ? 'default' :
                             progress.status === 'error' ? 'destructive' :
                             'secondary'
                           }>{progress.status}</Badge>
                          <p><strong className="font-semibold">Session:</strong> {progress.session_id}</p>
                          <p><strong className="font-semibold">Last Update:</strong> {new Date(progress.timestamp).toLocaleTimeString()}</p>
                        </div>
                        
                        <div className="w-full bg-muted rounded-full h-2.5">
                          <motion.div
                            className={`h-2.5 rounded-full ${progress.status === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}
                            initial={{ width: '0%' }}
                            animate={{ width: `${progress.progress || 0}%` }}
                          />
                        </div>

                        {progress.steps && progress.steps.length > 0 ? (
                           <div className="space-y-3 pt-2">
                             {progress.steps.map(renderStep)}
                           </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Waiting for execution steps...</p>
                        )}

                        {progress.status === 'completed' && progress.results && (
                           <Card className="mt-4">
                             <CardHeader><CardTitle>Final Results</CardTitle></CardHeader>
                             <CardContent>
                               <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap">{JSON.stringify(progress.results, null, 2)}</pre>
                             </CardContent>
                           </Card>
                        )}
                        {progress.status === 'error' && progress.error && (
                           <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-300">
                             <p className="font-bold">An error occurred:</p>
                             <p className="text-sm">{progress.error}</p>
                           </div>
                        )}
                      </>
                    ) : (
                       <div className="text-center py-10">
                         <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                         <p className="mt-2 text-muted-foreground">Awaiting progress from agent...</p>
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