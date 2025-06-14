import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { agentService } from '../services/agentService';
import { Agent, AgentRun } from '../types/agent';
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
  const [schedulerStatus, setSchedulerStatus] = useState<{ isRunning: boolean; scheduledAgentsCount: number } | null>(null);
  const { toast } = useToast();

  // Form state for creating new agent
  const [newAgent, setNewAgent] = useState({
    name: '',
    type: 'twitter' as 'twitter' | 'news' | 'custom',
    description: '',
    configuration: {
      keywords: '',
      minLikes: 10,
      minRetweets: 5,
      excludeReplies: true,
      sources: '',
      categories: '',
      language: 'en',
      schedule: '0 */6 * * *',
      maxItemsPerRun: 10,
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [agentsData, runsData, statusData] = await Promise.all([
        agentService.getAgents(),
        agentService.getUserAgentRuns(20),
        agentService.getSchedulerStatus(),
      ]);
      
      setAgents(agentsData);
      setRecentRuns(runsData);
      setSchedulerStatus(statusData);
    } catch (error: any) {
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
          sources: newAgent.configuration.sources ? newAgent.configuration.sources.split(',').map(s => s.trim()) : [],
          categories: newAgent.configuration.categories ? newAgent.configuration.categories.split(',').map(c => c.trim()) : [],
        },
      };

      const createdAgent = await agentService.createAgent(agentData);
      setAgents(prev => [createdAgent, ...prev]);
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
          sources: '',
          categories: '',
          language: 'en',
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

  const handleExecuteAgent = async (agentId: string) => {
    try {
      setExecutingAgents(prev => new Set(prev).add(agentId));
      await agentService.executeAgent(agentId);
      
      toast({
        title: 'Success',
        description: 'Agent execution started',
      });

      // Refresh data after a short delay
      setTimeout(() => {
        fetchData();
      }, 2000);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to execute agent',
        variant: 'destructive',
      });
    } finally {
      setExecutingAgents(prev => {
        const newSet = new Set(prev);
        newSet.delete(agentId);
        return newSet;
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
      setAgents(prev => prev.filter(a => a._id !== agentId));
      
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
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
                Multi AI Agents
              </h1>
              <p className="text-muted-foreground">
                Automated content curation agents working 24/7
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
                    <Select value={newAgent.type} onValueChange={(value: 'twitter' | 'news' | 'custom') => setNewAgent(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="twitter">Twitter Agent</SelectItem>
                        <SelectItem value="news">News Agent</SelectItem>
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
          {agents.map((agent) => (
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
                        <CardDescription className="capitalize">{agent.type} Agent</CardDescription>
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

                  {/* Actions */}
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
                      onClick={() => handleDeleteAgent(agent._id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {agents.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Agents Yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first AI agent to start automating content curation.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Agent
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {recentRuns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentRuns.slice(0, 10).map((run) => (
                  <div key={run._id} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(run.status)}
                      <div>
                        <p className="font-medium">
                          {typeof run.agentId === 'object' ? run.agentId.name : 'Unknown Agent'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {run.results.summary || `Processed ${run.itemsProcessed} items, added ${run.itemsAdded}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {formatTimeAgo(run.createdAt)}
                      </p>
                      {run.duration && (
                        <p className="text-xs text-muted-foreground">
                          {Math.round(run.duration / 1000)}s
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AgentsPage;