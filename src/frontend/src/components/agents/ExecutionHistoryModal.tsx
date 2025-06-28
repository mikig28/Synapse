import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { scheduledAgentService } from '../../services/scheduledAgentService';
import { ScheduledAgent, ScheduledAgentExecutionHistory } from '../../types/scheduledAgent';
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  ExternalLink,
  TrendingUp,
  AlertCircle,
  Loader2,
  FileText,
  BarChart3
} from 'lucide-react';

interface ExecutionHistoryModalProps {
  agent: ScheduledAgent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ExecutionHistoryModal: React.FC<ExecutionHistoryModalProps> = ({
  agent,
  open,
  onOpenChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ScheduledAgentExecutionHistory | null>(null);
  const { toast } = useToast();

  // Load execution history
  const loadHistory = async () => {
    if (!agent?._id || !open) return;

    setLoading(true);
    try {
      const historyData = await scheduledAgentService.getExecutionHistory(agent._id);
      setHistory(historyData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load execution history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [agent._id, open]);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Format duration
  const formatDuration = (ms?: number) => {
    if (!ms) return 'Unknown';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Get status color
  const getStatusColor = (status: 'success' | 'error') => {
    return status === 'success' ? 'text-green-600' : 'text-red-600';
  };

  // Get status icon
  const getStatusIcon = (status: 'success' | 'error') => {
    return status === 'success' ? 
      <CheckCircle className="w-4 h-4 text-green-600" /> : 
      <XCircle className="w-4 h-4 text-red-600" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Execution History: {agent.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Loading execution history...</span>
            </div>
          ) : !history ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load execution history. Please try again.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              {/* Summary Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <div className="ml-2">
                        <p className="text-xs font-medium text-muted-foreground">Total Executions</p>
                        <p className="text-2xl font-bold">{history.totalExecutions}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div className="ml-2">
                        <p className="text-xs font-medium text-muted-foreground">Successful</p>
                        <p className="text-2xl font-bold text-green-600">{history.successfulExecutions}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <div className="ml-2">
                        <p className="text-xs font-medium text-muted-foreground">Failed</p>
                        <p className="text-2xl font-bold text-red-600">{history.failedExecutions}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <div className="ml-2">
                        <p className="text-xs font-medium text-muted-foreground">Success Rate</p>
                        <p className="text-2xl font-bold text-blue-600">{Math.round(history.successRate)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Execution Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Recent Execution</h3>
                
                {history.lastExecution ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Last Executed:</span>
                            <span className="text-sm font-medium">{formatDate(history.lastExecution)}</span>
                          </div>

                          {history.lastResult && (
                            <>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(history.lastResult.status)}
                                <span className="text-sm text-muted-foreground">Status:</span>
                                <Badge variant={history.lastResult.status === 'success' ? 'default' : 'destructive'}>
                                  {history.lastResult.status}
                                </Badge>
                              </div>

                              {history.lastResult.duration && (
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">Duration:</span>
                                  <span className="text-sm font-medium">{formatDuration(history.lastResult.duration)}</span>
                                </div>
                              )}

                              {history.lastResult.message && (
                                <div className="space-y-1">
                                  <span className="text-sm text-muted-foreground">Message:</span>
                                  <p className="text-sm bg-muted p-2 rounded">
                                    {history.lastResult.message}
                                  </p>
                                </div>
                              )}

                              {history.lastResult.reportId && (
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">Report:</span>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      // Navigate to news page or report view
                                      window.open(`/news`, '_blank');
                                    }}
                                  >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    View Report
                                  </Button>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <div className="space-y-4">
                          {history.nextExecution && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Next Execution:</span>
                              <span className="text-sm font-medium">
                                {formatDate(history.nextExecution)}
                              </span>
                            </div>
                          )}

                          <div className="p-4 bg-muted rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="w-4 h-4" />
                              <span className="text-sm font-medium">Performance Trend</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Success Rate:</span>
                                <span className={`font-medium ${history.successRate >= 80 ? 'text-green-600' : history.successRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {Math.round(history.successRate)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${history.successRate >= 80 ? 'bg-green-600' : history.successRate >= 60 ? 'bg-yellow-600' : 'bg-red-600'}`}
                                  style={{ width: `${history.successRate}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Executions Yet</h3>
                        <p className="text-muted-foreground">
                          This agent hasn't been executed yet. It will start running according to its schedule.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Schedule Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Schedule Information</h3>
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Schedule Type</p>
                        <p className="font-medium capitalize">{agent.schedule.type}</p>
                      </div>
                      
                      {agent.schedule.type === 'cron' ? (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground">Cron Expression</p>
                            <code className="text-sm bg-muted px-2 py-1 rounded">
                              {agent.schedule.cronExpression}
                            </code>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Timezone</p>
                            <p className="font-medium">{agent.schedule.timezone || 'UTC'}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground">Interval</p>
                            <p className="font-medium">Every {agent.schedule.intervalMinutes} minutes</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Next Run</p>
                            <p className="font-medium">{formatDate(agent.nextExecution)}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Agent Configuration Summary */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Configuration</h3>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Topics</p>
                        <div className="flex flex-wrap gap-2">
                          {agent.agentConfig.topics.map((topic, index) => (
                            <Badge key={index} variant="outline">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Active Sources</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(agent.agentConfig.sources || {})
                            .filter(([_, enabled]) => enabled)
                            .map(([source]) => (
                              <Badge key={source} variant="secondary">
                                {source.replace('_', ' ')}
                              </Badge>
                            ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Max Items</p>
                          <p className="font-medium">{agent.agentConfig.parameters?.maxItemsPerRun || 10}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Quality Threshold</p>
                          <p className="font-medium">{agent.agentConfig.parameters?.qualityThreshold || 0.7}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Time Range</p>
                          <p className="font-medium">{agent.agentConfig.parameters?.timeRange || '24h'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-6 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={loadHistory} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Refresh
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExecutionHistoryModal;