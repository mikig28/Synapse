import React, { useEffect, useState, useCallback, useRef, memo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { agentService } from '../services/agentService';
import { Agent, AgentRun } from '../types/agent';
import { ErrorHandler } from '@/utils/errorHandler';
import { useNavigate } from 'react-router-dom';
import { useAgui } from '../contexts/AguiContext';
import { useIsMobile } from '@/hooks/useMobileDetection';
import MobileCrewAIViewer from '@/components/MobileCrewAIViewer';
import { 
  LazyAgentCreationWizard,
  LoadingFallback,
  LazyWrapper,
} from '@/components/LazyComponents';
import { 
  Bot,
  Plus,
  Play,
  Pause,
  Settings,
  Trash2,
  Activity,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  Twitter,
  Newspaper,
  Zap,
  RotateCcw,
  Wifi,
  WifiOff,
  BarChart3,
  Grid3X3,
  Box,
  Brain,
} from 'lucide-react';

// Simple agent card component for mobile
const MobileAgentCard = ({ agent, onExecute, onToggle, onDelete, onReset, isExecuting, formatTimeAgo, onShowCrewViewer }) => {
  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'twitter':
        return <Twitter className="w-5 h-5" />;
      case 'news':
        return <Newspaper className="w-5 h-5" />;
      case 'crewai_news':
        return <Zap className="w-5 h-5 text-purple-500" />;
      default:
        return <Bot className="w-5 h-5" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'idle':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getAgentIcon(agent.type)}
            <CardTitle className="text-base">{agent.name}</CardTitle>
          </div>
          <Badge variant={agent.isActive ? "default" : "secondary"}>
            {agent.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {getStatusIcon(agent.status || 'idle')}
          <span>{agent.status || 'idle'}</span>
          {agent.lastRun && (
            <span className="ml-auto text-xs">
              {formatTimeAgo(agent.lastRun)}
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => onExecute(agent._id)}
            disabled={isExecuting || agent.status === 'running'}
            className="flex-1"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" />
                Execute
              </>
            )}
          </Button>
          
          {/* CrewAI Process Viewer Button - only for CrewAI agents */}
          {agent.type === 'crewai_news' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onShowCrewViewer(agent)}
              className="px-3 bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
              title="View AI Process"
            >
              <Brain className="w-3 h-3" />
            </Button>
          )}
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => onToggle(agent)}
          >
            {agent.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(agent._id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Simplified mobile-optimized agents page
const AgentsPageMobileFix: React.FC = memo(() => {
  const { isConnected } = useAgui();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [executingAgents, setExecutingAgents] = useState<Set<string>>(new Set());
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [mobileCrewViewer, setMobileCrewViewer] = useState<{ isVisible: boolean; agent: Agent | null }>({
    isVisible: false,
    agent: null
  });
  
  // Fetch agents with error handling
  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await agentService.getAgents();
      setAgents(data || []);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      setError(err as Error);
      // Don't show toast for network errors to avoid spam
      if (err.code !== 'ERR_NETWORK') {
        toast({
          title: 'Failed to load agents',
          description: 'Please check your connection and try again',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial fetch
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Handle agent execution
  const handleExecuteAgent = useCallback(async (agentId: string) => {
    if (executingAgents.has(agentId)) {
      return;
    }

    try {
      setExecutingAgents(prev => new Set(prev).add(agentId));
      
      await agentService.executeAgent(agentId, false);
      
      toast({
        title: 'Success',
        description: 'Agent execution started',
      });

      // Refresh agents after a delay
      setTimeout(() => {
        fetchAgents();
      }, 2000);
    } catch (error: any) {
      console.error('[AgentsPage] Agent execution error:', error);
      console.error('[AgentsPage] Full error object:', {
        message: error.message,
        response: error.response,
        responseData: error.response?.data,
        responseStatus: error.response?.status,
        responseHeaders: error.response?.headers,
        request: error.request,
        config: error.config
      });
      
      // Extract detailed error message from response
      let errorMessage = 'Failed to execute agent';
      let errorType = 'unknown';
      let errorDetails = '';
      
      if (error.response?.data) {
        errorMessage = error.response.data.message || error.response.data.error || errorMessage;
        errorType = error.response.data.errorType || 'unknown';
        
        if (error.response.data.details) {
          errorDetails = JSON.stringify(error.response.data.details, null, 2);
          console.error('[AgentsPage] Error details:', errorDetails);
        }
        
        // Log helpful debugging info
        console.error('[AgentsPage] Error type:', errorType);
        console.error('[AgentsPage] Status code:', error.response.status);
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show more helpful error message based on error type
      let userFriendlyMessage = errorMessage;
      if (errorType === 'agent_inactive') {
        userFriendlyMessage = 'Please activate the agent before executing it.';
      } else if (errorType === 'agent_already_running') {
        userFriendlyMessage = 'This agent is already running. Please wait for it to finish.';
      } else if (errorType === 'executor_not_available') {
        userFriendlyMessage = 'The executor for this agent type is not available.';
      } else if (errorType === 'crewai_service_unreachable' || errorType === 'service_unavailable') {
        userFriendlyMessage = 'The AI service is temporarily unavailable. Please try again later.';
      } else if (error.response?.status === 401) {
        userFriendlyMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        userFriendlyMessage = 'You do not have permission to execute this agent.';
      }
      
      toast({
        title: 'Agent Execution Failed',
        description: userFriendlyMessage,
        variant: 'destructive',
      });
    } finally {
      setExecutingAgents(prev => {
        const newSet = new Set(prev);
        newSet.delete(agentId);
        return newSet;
      });
    }
  }, [executingAgents, toast, fetchAgents]);

  // Handle agent toggle
  const handleToggleAgent = useCallback(async (agent: Agent) => {
    try {
      if (agent.isActive) {
        await agentService.pauseAgent(agent._id);
        toast({ title: 'Success', description: 'Agent paused' });
      } else {
        await agentService.resumeAgent(agent._id);
        toast({ title: 'Success', description: 'Agent resumed' });
      }
      fetchAgents();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle agent',
        variant: 'destructive',
      });
    }
  }, [toast, fetchAgents]);

  // Handle agent deletion
  const handleDeleteAgent = useCallback(async (agentId: string) => {
    try {
      await agentService.deleteAgent(agentId);
      toast({
        title: 'Success',
        description: 'Agent deleted successfully',
      });
      fetchAgents();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete agent',
        variant: 'destructive',
      });
    }
  }, [toast, fetchAgents]);

  // Handle agent reset
  const handleResetAgentStatus = useCallback(async (agentId: string) => {
    try {
      await agentService.resetAgentStatus(agentId);
      toast({
        title: 'Success',
        description: 'Agent status reset successfully',
      });
      fetchAgents();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset agent status',
        variant: 'destructive',
      });
    }
  }, [toast, fetchAgents]);

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Handle agent created
  const handleAgentCreated = useCallback((createdAgent: Agent) => {
    setShowCreateWizard(false);
    toast({
      title: 'Success',
      description: 'Agent created successfully',
    });
    
    // Refresh agents list
    setTimeout(() => {
      fetchAgents();
    }, 1000);
  }, [toast, fetchAgents]);

  // Simple loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading agents...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !agents.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h3 className="text-lg font-semibold">Failed to load agents</h3>
            <p className="text-sm text-muted-foreground">
              Please check your connection and try again
            </p>
            <Button onClick={fetchAgents} className="w-full">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">AI Agents</h1>
                <p className="text-sm text-muted-foreground">
                  {agents.length} agent{agents.length !== 1 ? 's' : ''} configured
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                console.log('Create Agent button clicked (mobile)');
                setShowCreateWizard(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create
            </Button>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-2 text-sm">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-green-500">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-yellow-500" />
                <span className="text-yellow-500">Offline</span>
              </>
            )}
          </div>
        </div>

        {/* Agents Grid */}
        {agents.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <MobileAgentCard
                key={agent._id}
                agent={agent}
                onExecute={handleExecuteAgent}
                onToggle={handleToggleAgent}
                onDelete={handleDeleteAgent}
                onReset={handleResetAgentStatus}
                isExecuting={executingAgents.has(agent._id)}
                formatTimeAgo={formatTimeAgo}
                onShowCrewViewer={(agent) => {
                  setMobileCrewViewer({
                    isVisible: true,
                    agent: agent
                  });
                }}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <Bot className="w-12 h-12 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-semibold">No agents yet</h3>
              <p className="text-sm text-muted-foreground">
                Create your first AI agent to get started
              </p>
              <Button 
                onClick={() => {
                  console.log('Create Agent button clicked (mobile - empty state)');
                  setShowCreateWizard(true);
                }}
                className="mx-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Agent
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Mobile CrewAI Viewer Modal */}
      {mobileCrewViewer.agent && (
        <MobileCrewAIViewer
          agent={mobileCrewViewer.agent}
          isVisible={mobileCrewViewer.isVisible}
          onClose={() => setMobileCrewViewer({ isVisible: false, agent: null })}
        />
      )}

      {/* Agent Creation Wizard - Lazy Loaded */}
      <LazyWrapper 
        fallbackProps={{ 
          type: 'skeleton', 
          message: 'Loading creation wizard...',
          height: 500 
        }}
      >
        <LazyAgentCreationWizard 
          open={showCreateWizard}
          onOpenChange={setShowCreateWizard}
          onSuccess={handleAgentCreated}
        />
      </LazyWrapper>
    </div>
  );
});

AgentsPageMobileFix.displayName = 'AgentsPageMobileFix';

export default AgentsPageMobileFix;