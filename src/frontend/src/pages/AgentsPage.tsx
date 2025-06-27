import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { agentService } from '../services/agentService';
import { Agent, AgentRun } from '../types/agent';
import { ErrorHandler } from '@/utils/errorHandler';
import { AgentLogViewer } from '@/components/AgentLogViewer';
import AgentActivityDashboard from '@/components/AgentActivityDashboard';
import DebugPanel from '@/components/DebugPanel';
import { CrewExecutionDashboard } from '@/components/CrewExecutionDashboard';
import { DashboardHealthCheck } from '@/components/DashboardHealthCheck';
import { DashboardEmptyState } from '@/components/DashboardEmptyState';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recentRuns, setRecentRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [executingAgents, setExecutingAgents] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState<{ isRunning: boolean; scheduledAgentsCount: number } | null>(null);
  const [isDashboardHealthy, setIsDashboardHealthy] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Debouncing for execution calls
  const executionTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Form state for creating new agent
  const [newAgent, setNewAgent] = useState({
    name: '',
    type: 'twitter' as 'twitter' | 'news' | 'crewai_news' | 'custom',
    description: '',
    configuration: {
      keywords: '',
      minLikes: 10,
      minRetweets: 5,
      excludeReplies: true,
      newsSources: '',
      categories: '',
      language: 'en',
      topics: '',
      crewaiSources: {
        reddit: true,
        linkedin: true,
        telegram: true,
        news_websites: true,
      },
      schedule: '0 */6 * * *',
      maxItemsPerRun: 10,
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      executionTimeouts.current.forEach(timeout => clearTimeout(timeout));
      executionTimeouts.current.clear();
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [agentsData, runsData, statusData] = await Promise.all([
        agentService.getAgents(),
        agentService.getUserAgentRuns(20),
        agentService.getSchedulerStatus(),
      ]);
      
      setAgents(agentsData || []);
      setRecentRuns(runsData || []);
      setSchedulerStatus(statusData);
    } catch (error: any) {
      setAgents([]);
      setRecentRuns([]);
      setSchedulerStatus(null);
      
      toast({
        title: 'Error',
        description: 'Failed to fetch agents data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async () => {
    try {
      const agentData = {
        name: newAgent.name,
        type: newAgent.type,
        description: newAgent.description,
        configuration: {
          ...newAgent.configuration,
          keywords: newAgent.configuration.keywords ? newAgent.configuration.keywords.split(',').map(k => k.trim()) : [],
          newsSources: newAgent.configuration.newsSources ? newAgent.configuration.newsSources.split(',').map(s => s.trim()) : [],
          categories: newAgent.configuration.categories ? newAgent.configuration.categories.split(',').map(c => c.trim()) : [],
          topics: newAgent.configuration.topics ? newAgent.configuration.topics.split(',').map(t => t.trim()) : [],
        },
      };

      const createdAgent = await agentService.createAgent(agentData);
      setAgents(prev => [createdAgent, ...(prev || [])]);
      setShowCreateDialog(false);
      setNewAgent({
        name: '',
        type: 'twitter',
        description: '',
        configuration: {
          keywords: '',
          minLikes: 10,
          minRetweets: 5,
          excludeReplies: true,
          newsSources: '',
          categories: '',
          language: 'en',
          topics: '',
          crewaiSources: {
            reddit: true,
            linkedin: true,
            telegram: true,
            news_websites: true,
          },
          schedule: '0 */6 * * *',
          maxItemsPerRun: 10,
        },
      });

      toast({
        title: 'Success',
        description: 'Agent created successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create agent',
        variant: 'destructive',
      });
    }
  };

  // Debounced execution function to prevent rapid multiple clicks
  const debouncedExecuteAgent = useCallback((agentId: string, force: boolean = false) => {
    // Clear any existing timeout for this agent
    const existingTimeout = executionTimeouts.current.get(agentId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set a new timeout
    const timeout = setTimeout(() => {
      handleExecuteAgentInternal(agentId, force);
      executionTimeouts.current.delete(agentId);
    }, 300); // 300ms debounce

    executionTimeouts.current.set(agentId, timeout);
  }, []);

  const handleExecuteAgent = (agentId: string, force: boolean = false) => {
    debouncedExecuteAgent(agentId, force);
  };

  const handleExecuteAgentInternal = async (agentId: string, force: boolean = false) => {
    // Prevent multiple executions
    if (executingAgents.has(agentId)) {
      console.log('Agent execution already in progress, ignoring duplicate request');
      return;
    }

    try {
      setExecutingAgents(prev => new Set(prev).add(agentId));

      // Check agent status first
      const status = await agentService.getAgentStatus(agentId);
      
      if (!status.canExecute && !force) {
        if (status.isStuck) {
          // Offer to reset stuck agent
          toast({
            title: 'Agent is stuck',
            description: 'The agent appears to be stuck in running state. It will be reset automatically.',
            variant: 'default',
          });
          
          // Auto-reset stuck agent and try again
          await agentService.resetAgentStatus(agentId);
          await agentService.executeAgent(agentId, true);
        } else if (status.status === 'running') {
          toast({
            title: 'Agent is already running',
            description: 'Please wait for the current execution to complete.',
            variant: 'default',
          });
          return;
        } else if (!status.isActive) {
          toast({
            title: 'Agent is inactive',
            description: 'Please activate the agent before executing.',
            variant: 'destructive',
          });
          return;
        } else if (!status.executorAvailable) {
          toast({
            title: 'Executor not available',
            description: 'The executor for this agent type is not available.',
            variant: 'destructive',
          });
          return;
        }
      } else {
        await agentService.executeAgent(agentId, force);
      }
      
      toast({
        title: 'Success',
        description: 'Agent execution started',
      });

      // Refresh data after a short delay
      setTimeout(() => {
        fetchData();
      }, 2000);
    } catch (error: any) {
      const errorInfo = ErrorHandler.processError(error, { 
        action: 'agent_execution',
        agentId,
        component: 'AgentsPage'
      });
      
      // Handle specific error types
      if (error.response?.status === 409) {
        const errorType = error.response?.data?.errorType;
        if (errorType === 'agent_already_running') {
          toast({
            title: 'Agent Already Running',
            description: 'This agent is currently executing. Please wait for it to complete or reset its status.',
            variant: 'default',
          });
        } else {
          toast({
            title: 'Agent Execution Conflict',
            description: errorInfo.message,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Agent Execution Failed',
          description: errorInfo.message,
          variant: 'destructive',
        });
      }
    } finally {
      setExecutingAgents(prev => {
        const newSet = new Set(prev);
        newSet.delete(agentId);
        return newSet;
      });
    }
  };

  const handleResetAgentStatus = async (agentId: string) => {
    try {
      await agentService.resetAgentStatus(agentId);
      toast({
        title: 'Success',
        description: 'Agent status reset successfully',
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset agent status',
        variant: 'destructive',
      });
    }
  };

  const handleToggleAgent = async (agent: Agent) => {
    try {
      if (agent.isActive) {
        await agentService.pauseAgent(agent._id);
        toast({ title: 'Success', description: 'Agent paused' });
      } else {
        await agentService.resumeAgent(agent._id);
        toast({ title: 'Success', description: 'Agent resumed' });
      }
      
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle agent',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    try {
      await agentService.deleteAgent(agentId);
      setAgents(prev => (prev || []).filter(a => a._id !== agentId));
      
      toast({
        title: 'Success',
        description: 'Agent deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete agent',
        variant: 'destructive',
      });
    }
  };

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

  const getAgentDisplayName = (type: string) => {
    switch (type) {
      case 'twitter':
        return 'Twitter Agent';
      case 'news':
        return 'News Agent';
      case 'crewai_news':
        return 'CrewAI 2025 Multi-Agent';
      case 'custom':
        return 'Custom Agent';
      default:
        return `${type} Agent`;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      <div className="relative z-10 container mx-auto p-4 md:p-8 space-y-6">
        {/* Health Check - Always visible for system monitoring */}
        <DashboardHealthCheck onHealthChange={setIsDashboardHealthy} />
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
                Multi AI Agents
                {!isDashboardHealthy && (
                  <span className="text-sm text-red-500 font-normal ml-2">• System Issues</span>
                )}
              </h1>
              <p className="text-muted-foreground">
                Automated content curation agents working 24/7
                {!isDashboardHealthy && (
                  <span className="text-red-500 ml-2">• Check system health above</span>
                )}
              </p>
            </div>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="lg" className="hover:scale-105 transition-all duration-200">
                <Plus className="w-5 h-5 mr-2" />
                Create Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Agent</DialogTitle>
                <DialogDescription>
                  Configure a new AI agent to automatically curate content for you.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Agent Name</Label>
                    <Input
                      id="name"
                      value={newAgent.name}
                      onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="My Twitter Agent"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Agent Type</Label>
                    <Select value={newAgent.type} onValueChange={(value: 'twitter' | 'news' | 'crewai_news' | 'custom') => setNewAgent(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="twitter">Twitter Agent</SelectItem>
                        <SelectItem value="news">News Agent</SelectItem>
                        <SelectItem value="crewai_news">🤖 CrewAI 2025 Multi-Agent (Any Topic)</SelectItem>
                        <SelectItem value="custom">Custom Agent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newAgent.description}
                    onChange={(e) => setNewAgent(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this agent should do..."
                  />
                </div>

                {newAgent.type === 'twitter' && (
                  <div className="space-y-3">
                    <Label>Twitter Configuration</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                        <Input
                          id="keywords"
                          value={newAgent.configuration.keywords}
                          onChange={(e) => setNewAgent(prev => ({ 
                            ...prev, 
                            configuration: { ...prev.configuration, keywords: e.target.value }
                          }))}
                          placeholder="AI, technology, startup"
                        />
                      </div>
                      <div>
                        <Label htmlFor="minLikes">Minimum Likes</Label>
                        <Input
                          id="minLikes"
                          type="number"
                          value={newAgent.configuration.minLikes}
                          onChange={(e) => setNewAgent(prev => ({ 
                            ...prev, 
                            configuration: { ...prev.configuration, minLikes: parseInt(e.target.value) || 0 }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {newAgent.type === 'news' && (
                  <div className="space-y-3">
                    <Label>News Configuration</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="categories">Categories (comma-separated)</Label>
                        <Input
                          id="categories"
                          value={newAgent.configuration.categories}
                          onChange={(e) => setNewAgent(prev => ({ 
                            ...prev, 
                            configuration: { ...prev.configuration, categories: e.target.value }
                          }))}
                          placeholder="technology, business"
                        />
                      </div>
                      <div>
                        <Label htmlFor="language">Language</Label>
                        <Select value={newAgent.configuration.language} onValueChange={(value) => setNewAgent(prev => ({ 
                          ...prev, 
                          configuration: { ...prev.configuration, language: value }
                        }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="de">German</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {newAgent.type === 'crewai_news' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Label className="text-base font-medium">CrewAI 2025 Multi-Agent Configuration</Label>
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        Enhanced
                      </Badge>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                      <div className="flex items-start gap-2">
                        <Bot className="w-4 h-4 text-purple-600 mt-0.5" />
                        <div className="text-sm text-purple-800">
                          <p className="font-medium mb-1">Advanced Multi-Agent System</p>
                          <p className="text-xs">
                            ✅ Works with ANY topic/domain • ✅ Strict content filtering • ✅ Source validation • ✅ CrewAI 2025 compliant
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="topics" className="flex items-center gap-2">
                          Topics/Goals (comma-separated)
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                            Topic-Agnostic
                          </Badge>
                        </Label>
                        <Input
                          id="topics"
                          value={newAgent.configuration.topics}
                          onChange={(e) => setNewAgent(prev => ({ 
                            ...prev, 
                            configuration: { ...prev.configuration, topics: e.target.value }
                          }))}
                          placeholder="sports, finance, health, travel, cooking, gaming, politics, science..."
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          🎯 <strong>Any topics you want!</strong> The CrewAI 2025 system works with any domain - sports, business, entertainment, science, hobbies, etc. Uses advanced filtering to find only relevant, high-quality content.
                        </p>
                      </div>
                      
                      <div>
                        <Label className="flex items-center gap-2">
                          Content Sources
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            Multi-Platform
                          </Badge>
                        </Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          🔍 Select sources for intelligent content discovery across multiple platforms with quality validation
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="reddit"
                              checked={newAgent.configuration.crewaiSources?.reddit}
                              onChange={(e) => setNewAgent(prev => ({
                                ...prev,
                                configuration: {
                                  ...prev.configuration,
                                  crewaiSources: {
                                    ...prev.configuration.crewaiSources,
                                    reddit: e.target.checked
                                  }
                                }
                              }))}
                              className="rounded"
                            />
                            <label htmlFor="reddit" className="text-sm font-medium">
                              Reddit Discussions
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="linkedin"
                              checked={newAgent.configuration.crewaiSources?.linkedin}
                              onChange={(e) => setNewAgent(prev => ({
                                ...prev,
                                configuration: {
                                  ...prev.configuration,
                                  crewaiSources: {
                                    ...prev.configuration.crewaiSources,
                                    linkedin: e.target.checked
                                  }
                                }
                              }))}
                              className="rounded"
                            />
                            <label htmlFor="linkedin" className="text-sm font-medium">
                              LinkedIn Insights
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="telegram"
                              checked={newAgent.configuration.crewaiSources?.telegram}
                              onChange={(e) => setNewAgent(prev => ({
                                ...prev,
                                configuration: {
                                  ...prev.configuration,
                                  crewaiSources: {
                                    ...prev.configuration.crewaiSources,
                                    telegram: e.target.checked
                                  }
                                }
                              }))}
                              className="rounded"
                            />
                            <label htmlFor="telegram" className="text-sm font-medium">
                              Telegram Channels
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="news_websites"
                              checked={newAgent.configuration.crewaiSources?.news_websites}
                              onChange={(e) => setNewAgent(prev => ({
                                ...prev,
                                configuration: {
                                  ...prev.configuration,
                                  crewaiSources: {
                                    ...prev.configuration.crewaiSources,
                                    news_websites: e.target.checked
                                  }
                                }
                              }))}
                              className="rounded"
                            />
                            <label htmlFor="news_websites" className="text-sm font-medium">
                              News Websites
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="schedule">Schedule (Cron)</Label>
                    <Input
                      id="schedule"
                      value={newAgent.configuration.schedule}
                      onChange={(e) => setNewAgent(prev => ({ 
                        ...prev, 
                        configuration: { ...prev.configuration, schedule: e.target.value }
                      }))}
                      placeholder="0 */6 * * *"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxItems">Max Items Per Run</Label>
                    <Input
                      id="maxItems"
                      type="number"
                      value={newAgent.configuration.maxItemsPerRun}
                      onChange={(e) => setNewAgent(prev => ({ 
                        ...prev, 
                        configuration: { ...prev.configuration, maxItemsPerRun: parseInt(e.target.value) || 10 }
                      }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateAgent} disabled={!newAgent.name || !newAgent.type}>
                    Create Agent
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Scheduler Status */}
        {schedulerStatus && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className={`w-5 h-5 ${schedulerStatus.isRunning ? 'text-green-500' : 'text-red-500'}`} />
                  <div>
                    <p className="font-medium">Agent Scheduler</p>
                    <p className="text-sm text-muted-foreground">
                      {schedulerStatus.isRunning ? 'Running' : 'Stopped'} • {schedulerStatus.scheduledAgentsCount} agents scheduled
                    </p>
                  </div>
                </div>
                <Badge variant={schedulerStatus.isRunning ? 'default' : 'destructive'}>
                  {schedulerStatus.isRunning ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(agents || []).map((agent) => (
            <motion.div
              key={agent._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group"
            >
              <Card className="h-full hover:shadow-lg transition-all duration-300 hover:border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getAgentIcon(agent.type)}
                      <div>
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          {getAgentDisplayName(agent.type)}
                          {agent.type === 'crewai_news' && (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                              Enhanced
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(agent.status)}
                      <Badge variant={agent.isActive ? 'default' : 'secondary'} className="text-xs">
                        {agent.isActive ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {agent.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {agent.description}
                    </p>
                  )}

                  {/* Statistics */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-center p-2 bg-muted/30 rounded">
                      <p className="font-medium">{agent.statistics.totalRuns}</p>
                      <p className="text-xs text-muted-foreground">Total Runs</p>
                    </div>
                    <div className="text-center p-2 bg-muted/30 rounded">
                      <p className="font-medium">{agent.statistics.totalItemsAdded}</p>
                      <p className="text-xs text-muted-foreground">Items Added</p>
                    </div>
                  </div>

                  {/* Last Run */}
                  {agent.lastRun && (
                    <div className="text-xs text-muted-foreground">
                      Last run: {formatTimeAgo(agent.lastRun)}
                    </div>
                  )}

                  {/* Error message */}
                  {agent.status === 'error' && agent.errorMessage && (
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
                      {agent.errorMessage}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExecuteAgent(agent._id)}
                        disabled={executingAgents.has(agent._id) || agent.status === 'running'}
                        className="flex-1"
                      >
                        {executingAgents.has(agent._id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        Run
                      </Button>

                      {agent.status === 'error' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetAgentStatus(agent._id)}
                          title="Reset agent status"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleAgent(agent)}
                      >
                        {agent.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/agents/${agent._id}/settings`)}
                        title="Agent Settings"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteAgent(agent._id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <AgentLogViewer
                        agentId={agent._id}
                        agentName={agent.name}
                        isRunning={agent.status === 'running' || executingAgents.has(agent._id)}
                      />
                      
                      {/* Show Crew Dashboard for CrewAI agents */}
                      {agent.type === 'crewai_news' && (
                        <CrewExecutionDashboard
                          agentId={agent._id}
                          agentName={agent.name}
                          isRunning={agent.status === 'running' || executingAgents.has(agent._id)}
                          onExecuteAgent={() => handleExecuteAgent(agent._id)}
                          onPauseAgent={() => handleToggleAgent(agent)}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {(agents || []).length === 0 && !loading && (
          <DashboardEmptyState 
            onCreateAgent={() => setShowCreateDialog(true)}
          />
        )}

        {/* Agent Activity Dashboard */}
        <AgentActivityDashboard
          agents={agents || []}
          onAgentExecute={handleExecuteAgent}
          onAgentToggle={handleToggleAgent}
        />
      </div>

      {/* Debug Panel - only shows in development */}
      {import.meta.env.DEV && (
        <>
          {/* Floating Debug Button */}
          <Button
            className="fixed bottom-4 right-4 z-40 rounded-full w-12 h-12 p-0"
            variant="outline"
            onClick={() => setShowDebugPanel(true)}
            title="Open Debug Panel"
          >
            🐛
          </Button>
          
          <DebugPanel 
            isVisible={showDebugPanel}
            onClose={() => setShowDebugPanel(false)}
          />
        </>
      )}
    </div>
  );
};

export default AgentsPage;