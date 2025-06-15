import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Terminal,
  Activity,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { AgentRun } from '@/types/agent';
import { agentService } from '@/services/agentService';
import { io, Socket } from 'socket.io-client';

interface AgentLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

interface AgentUpdate {
  agentId: string;
  runId: string;
  status: string;
  message: string;
  timestamp: Date;
  stats?: {
    itemsProcessed: number;
    itemsAdded: number;
    duration?: number;
  };
  error?: string;
}

interface AgentLogViewerProps {
  agentId: string;
  agentName: string;
  isRunning: boolean;
}

export const AgentLogViewer: React.FC<AgentLogViewerProps> = ({
  agentId,
  agentName,
  isRunning,
}) => {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [realtimeLogs, setRealtimeLogs] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentRun, setCurrentRun] = useState<AgentRun | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs, realtimeLogs]);

  useEffect(() => {
    if (isDialogOpen) {
      fetchAgentLogs();
      setupSocketConnection();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [isDialogOpen, agentId]);

  const fetchAgentLogs = async () => {
    try {
      const runs = await agentService.getAgentRuns(agentId, 1);
      if (runs.length > 0) {
        setCurrentRun(runs[0]);
        setLogs(runs[0].logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch agent logs:', error);
    }
  };

  const setupSocketConnection = () => {
    // Determine backend URL based on environment
    let backendUrl: string;
    
    if (import.meta.env.VITE_BACKEND_ROOT_URL) {
      // Use explicit environment variable if set
      backendUrl = import.meta.env.VITE_BACKEND_ROOT_URL;
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Local development
      backendUrl = 'http://localhost:3001';
    } else {
      // Production - use your actual backend URL
      backendUrl = 'https://synapse-pxad.onrender.com';
    }
    
    console.log('Environment check:', {
      hostname: window.location.hostname,
      envVar: import.meta.env.VITE_BACKEND_ROOT_URL,
      selectedUrl: backendUrl
    });
    console.log('Connecting to Socket.IO at:', backendUrl);
    
    const socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      forceNew: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      // Join user-specific room for agent updates
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userId = payload.id;
          socket.emit('join', `user_${userId}`);
          console.log(`Joined user room: user_${userId}`);
        } catch (error) {
          console.error('Failed to parse token:', error);
        }
      }
    });

    socket.on('agent_update', (update: AgentUpdate) => {
      console.log('Received agent update:', update);
      if (update.agentId === agentId) {
        // Add real-time log entry
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${update.status.toUpperCase()}: ${update.message}`;
        
        setRealtimeLogs(prev => [...prev, logEntry]);

        // If this is a completion or failure, refresh the logs
        if (update.status === 'completed' || update.status === 'failed') {
          setTimeout(() => {
            fetchAgentLogs();
            setRealtimeLogs([]);
          }, 1000);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });
  };

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warn':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-500';
      case 'warn':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const combinedLogs = [
    ...logs.map(log => ({
      ...log,
      isRealtime: false,
    })),
    ...realtimeLogs.map(logText => ({
      timestamp: new Date().toISOString(),
      level: 'info' as const,
      message: logText,
      isRealtime: true,
      data: undefined,
    })),
  ];

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Terminal className="w-4 h-4" />
          View Logs
          {isRunning && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className={`${isMinimized ? 'h-20' : 'max-w-4xl h-[80vh]'} transition-all duration-300`}>
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5" />
            <DialogTitle>
              {agentName} - Agent Logs
              {currentRun && (
                <Badge variant="outline" className="ml-2">
                  Run {currentRun._id.slice(-6)}
                </Badge>
              )}
            </DialogTitle>
          </div>
          
          <div className="flex items-center gap-2">
            {currentRun && (
              <Badge
                variant={
                  currentRun.status === 'completed'
                    ? 'default'
                    : currentRun.status === 'failed'
                    ? 'destructive'
                    : currentRun.status === 'running'
                    ? 'secondary'
                    : 'outline'
                }
              >
                {currentRun.status}
              </Badge>
            )}
            
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
          <div className="flex flex-col h-full">
            {/* Stats Bar */}
            {currentRun && (
              <div className="flex gap-4 p-3 bg-muted/30 rounded-lg mb-4">
                <div className="text-center">
                  <p className="text-sm font-medium">{currentRun.itemsProcessed}</p>
                  <p className="text-xs text-muted-foreground">Processed</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{currentRun.itemsAdded}</p>
                  <p className="text-xs text-muted-foreground">Added</p>
                </div>
                {currentRun.duration && (
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {Math.round(currentRun.duration / 1000)}s
                    </p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-sm font-medium">{combinedLogs.length}</p>
                  <p className="text-xs text-muted-foreground">Log Entries</p>
                </div>
              </div>
            )}

            {/* Logs Container */}
            <div className="flex-1 h-0 relative border rounded-lg">
              <div className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground border">
                📜 Scroll to see all logs ({combinedLogs.length} entries)
              </div>
              <ScrollArea className="h-full w-full">
                <div className="space-y-2 font-mono text-sm p-4 pb-16">
                {combinedLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No logs available</p>
                    <p className="text-xs">Logs will appear here when the agent runs</p>
                  </div>
                ) : (
                  combinedLogs.map((log, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-2 rounded hover:bg-muted/20 transition-colors ${
                        log.isRealtime ? 'bg-blue-50 dark:bg-blue-950/20 border-l-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="pt-0.5">
                        {getLogLevelIcon(log.level)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(log.timestamp)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getLogLevelColor(log.level)}`}
                          >
                            {log.level.toUpperCase()}
                          </Badge>
                          {log.isRealtime && (
                            <Badge variant="secondary" className="text-xs">
                              LIVE
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm break-words">
                          {log.message}
                        </p>
                        
                        {log.data && typeof log.data === 'object' && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              View Details
                            </summary>
                            <pre className="mt-1 text-xs bg-muted/30 p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
                </div>
              </ScrollArea>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="w-4 h-4" />
                {isRunning ? (
                  <span className="text-green-600">Agent is running...</span>
                ) : (
                  <span>Agent is idle</span>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={fetchAgentLogs}>
                  Refresh
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};