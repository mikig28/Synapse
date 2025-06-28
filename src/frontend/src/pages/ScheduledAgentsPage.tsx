import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { scheduledAgentService } from '../services/scheduledAgentService';
import { ScheduledAgent } from '../types/scheduledAgent';
import {
  Plus,
  Search,
  Clock,
  Play,
  Pause,
  Edit,
  Trash2,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Settings,
  Activity,
  Filter
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CreateScheduledAgentModal from '../components/agents/CreateScheduledAgentModal';
import EditScheduledAgentModal from '../components/agents/EditScheduledAgentModal';
import ExecutionHistoryModal from '../components/agents/ExecutionHistoryModal';

const ScheduledAgentsPage: React.FC = () => {
  const [scheduledAgents, setScheduledAgents] = useState<ScheduledAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<ScheduledAgent | null>(null);
  const [historyAgent, setHistoryAgent] = useState<ScheduledAgent | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const { toast } = useToast();

  // Load scheduled agents with enhanced error handling
  const loadScheduledAgents = async (page: number = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
      };
      
      console.log('[ScheduledAgents] Loading agents with params:', params);
      const result = await scheduledAgentService.getScheduledAgents(params);
      console.log('[ScheduledAgents] Loaded agents:', result.agents.length);
      
      setScheduledAgents(result.agents);
      setPagination(result.pagination);
    } catch (error: any) {
      console.error('[ScheduledAgents] Error loading agents:', error);
      
      // Handle specific error cases
      if (error.message?.includes('500')) {
        toast({
          title: 'Server Error',
          description: 'There was a server error loading scheduled agents. Please try refreshing the page.',
          variant: 'destructive'
        });
      } else if (error.message?.includes('401') || error.message?.includes('Authentication')) {
        toast({
          title: 'Authentication Error',
          description: 'Please log in again to access scheduled agents.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load scheduled agents',
          variant: 'destructive'
        });
      }
      
      // Set empty state on error to prevent showing stale data
      setScheduledAgents([]);
      setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScheduledAgents();
  }, [statusFilter, searchTerm]);

  // Toggle agent active status
  const handleToggleAgent = async (agent: ScheduledAgent) => {
    try {
      const updatedAgent = await scheduledAgentService.toggleScheduledAgent(agent._id);
      setScheduledAgents(prev => 
        prev.map(a => a._id === agent._id ? updatedAgent : a)
      );
      toast({
        title: 'Success',
        description: `Agent ${updatedAgent.isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle agent status',
        variant: 'destructive'
      });
    }
  };

  // Execute agent manually
  const handleExecuteAgent = async (agent: ScheduledAgent) => {
    try {
      await scheduledAgentService.executeScheduledAgent(agent._id);
      toast({
        title: 'Success',
        description: 'Agent execution started successfully'
      });
      // Refresh the agents list to show updated execution info
      loadScheduledAgents(pagination.page);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to execute agent',
        variant: 'destructive'
      });
    }
  };

  // Delete agent
  const handleDeleteAgent = async (agent: ScheduledAgent) => {
    if (!confirm(`Are you sure you want to delete "${agent.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await scheduledAgentService.deleteScheduledAgent(agent._id);
      setScheduledAgents(prev => prev.filter(a => a._id !== agent._id));
      toast({
        title: 'Success',
        description: 'Scheduled agent deleted successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete agent',
        variant: 'destructive'
      });
    }
  };

  // Format next execution time
  const formatNextExecution = (dateString?: string) => {
    if (!dateString) return 'Not scheduled';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Overdue';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `In ${diffHours}h ${diffMinutes}m`;
    } else {
      return `In ${diffMinutes}m`;
    }
  };

  // Get status badge
  const getStatusBadge = (agent: ScheduledAgent) => {
    if (!agent.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    
    if (agent.lastResult?.status === 'error') {
      return <Badge variant="destructive">Error</Badge>;
    }
    
    if (agent.executionCount > 0) {
      return <Badge variant="default">Active</Badge>;
    }
    
    return <Badge variant="outline">New</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Scheduled Agents</h1>
          <p className="text-muted-foreground mt-2">
            Automate your research agents to run on a schedule
          </p>
        </div>
        <Button onClick={() => {
          console.log('🚀 Create Scheduled Agent button clicked - opening modal');
          setShowCreateModal(true);
        }} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Scheduled Agent
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search agents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Agents Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : scheduledAgents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Scheduled Agents</h3>
            <p className="text-muted-foreground mb-4">
              Create your first scheduled agent to automate research tasks
            </p>
            <Button onClick={() => {
              console.log('🚀 Create Scheduled Agent button (empty state) clicked - opening modal');
              setShowCreateModal(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Scheduled Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scheduledAgents.map((agent) => (
            <motion.div
              key={agent._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      {agent.description && (
                        <CardDescription className="mt-1">
                          {agent.description}
                        </CardDescription>
                      )}
                    </div>
                    {getStatusBadge(agent)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Topics */}
                    <div>
                      <p className="text-sm font-medium mb-1">Topics:</p>
                      <div className="flex flex-wrap gap-1">
                        {agent.agentConfig.topics.slice(0, 3).map((topic, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                        {agent.agentConfig.topics.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{agent.agentConfig.topics.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Schedule Info */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {agent.schedule.type === 'cron' 
                          ? `Cron: ${agent.schedule.cronExpression}`
                          : `Every ${agent.schedule.intervalMinutes}m`
                        }
                      </span>
                    </div>

                    {/* Next Execution */}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>Next: {formatNextExecution(agent.nextExecution)}</span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-2xl font-bold">{agent.executionCount}</div>
                        <div className="text-xs text-muted-foreground">Runs</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">{agent.successCount}</div>
                        <div className="text-xs text-muted-foreground">Success</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {agent.executionCount > 0 ? Math.round(agent.successRate) : 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">Rate</div>
                      </div>
                    </div>

                    {/* Last Result */}
                    {agent.lastResult && (
                      <div className="flex items-center gap-2 text-sm">
                        {agent.lastResult.status === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="truncate">
                          {agent.lastResult.message || 
                           (agent.lastResult.status === 'success' ? 'Last run successful' : 'Last run failed')
                          }
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant={agent.isActive ? "secondary" : "default"}
                        onClick={() => handleToggleAgent(agent)}
                        className="flex-1"
                      >
                        {agent.isActive ? (
                          <>
                            <Pause className="w-4 h-4 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleExecuteAgent(agent)}>
                            <Play className="w-4 h-4 mr-2" />
                            Run Now
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingAgent(agent)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setHistoryAgent(agent)}>
                            <Activity className="w-4 h-4 mr-2" />
                            History
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteAgent(agent)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <Button
            variant="outline"
            disabled={pagination.page === 1}
            onClick={() => loadScheduledAgents(pagination.page - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            disabled={pagination.page === pagination.pages}
            onClick={() => loadScheduledAgents(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Modals */}
      <CreateScheduledAgentModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={(newAgent) => {
          setScheduledAgents(prev => [newAgent, ...prev]);
          setShowCreateModal(false);
        }}
      />

      {editingAgent && (
        <EditScheduledAgentModal
          agent={editingAgent}
          open={!!editingAgent}
          onOpenChange={() => setEditingAgent(null)}
          onSuccess={(updatedAgent) => {
            setScheduledAgents(prev => 
              prev.map(a => a._id === updatedAgent._id ? updatedAgent : a)
            );
            setEditingAgent(null);
          }}
        />
      )}

      {historyAgent && (
        <ExecutionHistoryModal
          agent={historyAgent}
          open={!!historyAgent}
          onOpenChange={() => setHistoryAgent(null)}
        />
      )}
    </div>
  );
};

export default ScheduledAgentsPage;
