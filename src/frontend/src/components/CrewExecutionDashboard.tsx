import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Users,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  Brain,
  Shield,
  TrendingUp,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Terminal,
  FileText,
  ExternalLink,
  Search,
  Sparkles,
  Globe,
  MessageCircle,
  Linkedin,
  Hash,
  Newspaper,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  Share2,
  Eye,
  Loader2
} from 'lucide-react';
import { AgentRun } from '@/types/agent';
import { agentService } from '@/services/agentService';

interface ProgressStep {
  agent: string;
  step: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message?: string;
  timestamp?: string;
}

interface ContentItem {
  id: string;
  title: string;
  content: string;
  url?: string;
  author?: string;
  source: string;
  published_date?: string;
  score?: number;
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
}

interface CrewExecutionDashboardProps {
  agentId: string;
  agentName: string;
  isRunning: boolean;
  onExecuteAgent?: () => void;
  onPauseAgent?: () => void;
}

const AGENT_ICONS = {
  'News Research Specialist': Brain,
  'Content Quality Analyst': Shield,
  'URL Validation Specialist': CheckCircle,
  'Trend Analysis Expert': TrendingUp,
  'Crew': Users,
};

const AGENT_COLORS = {
  'News Research Specialist': 'bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  'Content Quality Analyst': 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  'URL Validation Specialist': 'bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  'Trend Analysis Expert': 'bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  'Crew': 'bg-gray-100 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800',
};

const sourceIcons = {
  'reddit': <Hash className="w-4 h-4 text-orange-500" />,
  'linkedin': <Linkedin className="w-4 h-4 text-blue-600" />,
  'telegram': <MessageCircle className="w-4 h-4 text-blue-400" />,
  'news': <Newspaper className="w-4 h-4 text-gray-600" />
};

const statusColors = {
  'pending': 'text-gray-500',
  'in_progress': 'text-blue-500',
  'completed': 'text-green-500',
  'failed': 'text-red-500'
};

const statusIcons = {
  'pending': <Clock className="w-4 h-4" />,
  'in_progress': <RefreshCw className="w-4 h-4 animate-spin" />,
  'completed': <CheckCircle className="w-4 h-4" />,
  'failed': <AlertCircle className="w-4 h-4" />
};

export const CrewExecutionDashboard: React.FC<CrewExecutionDashboardProps> = ({
  agentId,
  agentName,
  isRunning,
  onExecuteAgent,
  onPauseAgent
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState('overview');
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [parsedContent, setParsedContent] = useState<any>(null);
  const [agentStates, setAgentStates] = useState<any>({
    research: 'idle',
    quality: 'idle',
    trend: 'idle'
  });
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<{
    status: string;
    canExecute: boolean;
    isStuck: boolean;
    statusReason: string;
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [pollingProgress, setPollingProgress] = useState(false);
  const [lastRunResults, setLastRunResults] = useState<any>(null);
  const [agentRuns, setAgentRuns] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [progressStatus, setProgressStatus] = useState<string>('idle');
  const progressPollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const completedSteps = progressSteps.filter(s => s.status === 'completed').length;
    const totalSteps = progressSteps.length || 1;
    const targetProgress = (completedSteps / totalSteps) * 100;
    
    const timer = setTimeout(() => {
      setAnimatedProgress(targetProgress);
    }, 100);

    return () => clearTimeout(timer);
  }, [progressSteps]);

  // Fetch agent status and recent runs when dialog opens
  useEffect(() => {
    if (isDialogOpen && agentId) {
      fetchAgentStatus();
      fetchRecentRuns();
    }
  }, [isDialogOpen, agentId]);

  // Start progress polling when agent is running
  useEffect(() => {
    if (isDialogOpen && isRunning && agentId) {
      startProgressPolling();
    } else {
      stopProgressPolling();
    }

    return () => stopProgressPolling();
  }, [isDialogOpen, isRunning, agentId]);

  const startProgressPolling = () => {
    if (progressPollingRef.current) return; // Already polling

    setPollingProgress(true);
    console.log('🔄 Starting progress polling for agent:', agentId);

    const pollProgress = async () => {
      try {
        const progressData = await agentService.getCrewProgress(agentId);
        if (progressData?.progress) {
          const progress = progressData.progress;
          
          // **FIX 22: Enhanced progress handling with session tracking**
          setProgressSteps(progress.steps || []);
          setCurrentSessionId(progress.session_id || null);
          setProgressStatus(progress.status || 'idle');
          
          console.log(`📊 Progress update - Session: ${progress.session_id}, Steps: ${progress.steps?.length || 0}, Status: ${progress.status}`);
          
          // Update parsed content if available
          if (progress.results) {
            processCrewAIResults(progress.results);
          }
          
          // Stop polling if we reach a terminal state
          if (progress.status === 'completed' || progress.status === 'failed' || !progress.hasActiveProgress) {
            if (progressPollingRef.current) {
              setTimeout(() => {
                console.log('⏹️ Stopping progress polling - reached terminal state:', progress.status);
                stopProgressPolling();
              }, 5000); // Wait 5 seconds before stopping to catch final updates
            }
          }
        } else {
          console.log('⚠️ No progress data received');
        }
      } catch (error) {
        console.error('Failed to poll progress:', error);
        // Don't stop polling on error, just log it
      }
    };

    // Initial fetch
    pollProgress();

    // Set up polling interval (every 3 seconds for better performance)
    progressPollingRef.current = setInterval(pollProgress, 3000);
  };

  const stopProgressPolling = () => {
    if (progressPollingRef.current) {
      clearInterval(progressPollingRef.current);
      progressPollingRef.current = null;
      setPollingProgress(false);
      console.log('⏹️ Stopped progress polling');
    }
  };

  const fetchAgentStatus = async () => {
    if (!agentId) return;
    
    setStatusLoading(true);
    try {
      const status = await agentService.getAgentStatus(agentId);
      setAgentStatus(status);
    } catch (error) {
      console.error('Failed to fetch agent status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchRecentRuns = async () => {
    if (!agentId) return;
    
    try {
      console.log('🔍 Fetching recent runs for agent:', agentId);
      const runs = await agentService.getAgentRuns(agentId, 5); // Get last 5 runs
      setAgentRuns(runs);
      
      // If we have recent runs, try to get the most recent completed run's results
      const completedRun = runs.find(run => run.status === 'completed' && run.results?.details);
      if (completedRun && completedRun.results?.details) {
        console.log('📊 Found recent completed run with results:', completedRun._id);
        setLastRunResults(completedRun.results.details);
        
        // Process the results for display
        if (completedRun.results.details) {
          processCrewAIResults(completedRun.results.details);
        }
      }
    } catch (error) {
      console.error('Failed to fetch recent runs:', error);
    }
  };

  const handleResetStatus = async () => {
    if (!agentId) return;
    
    try {
      await agentService.resetAgentStatus(agentId);
      await fetchAgentStatus(); // Refresh status after reset
      setError(null); // Clear any existing errors
    } catch (error: any) {
      console.error('Failed to reset agent status:', error);
      setError(error.message || 'Failed to reset agent status');
    }
  };

  const toggleCard = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderContentCard = (item: ContentItem, type: string) => {
    const isExpanded = expandedCards[item.id];
    const icon = sourceIcons[type as keyof typeof sourceIcons] || sourceIcons.news;

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-4"
      >
        <Card className="p-4 hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {icon}
                <Badge variant="secondary" className="text-xs">
                  {item.source}
                </Badge>
                {item.score && item.score > 100 && (
                  <Badge variant="default" className="text-xs bg-orange-500">
                    🔥 Trending
                  </Badge>
                )}
              </div>
              
              <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                {item.title}
              </h3>
              
              <div className={`text-sm text-muted-foreground ${isExpanded ? '' : 'line-clamp-3'}`}>
                {item.content}
              </div>

              {item.engagement && (
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  {item.engagement.likes && (
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      {item.engagement.likes}
                    </span>
                  )}
                  {item.engagement.comments && (
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {item.engagement.comments}
                    </span>
                  )}
                  {item.engagement.shares && (
                    <span className="flex items-center gap-1">
                      <Share2 className="w-3 h-3" />
                      {item.engagement.shares}
                    </span>
                  )}
                  {item.engagement.views && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {item.engagement.views}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  {item.author && (
                    <span className="text-xs text-muted-foreground">
                      by {item.author}
                    </span>
                  )}
                  {item.published_date && (
                    <span className="text-xs text-muted-foreground">
                      • {new Date(item.published_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {item.url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(item.url, '_blank')}
                      className="h-8"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCard(item.id)}
                    className="h-8"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  };

  const renderProgressStep = (step: ProgressStep, index: number) => {
    const IconComponent = AGENT_ICONS[step.agent as keyof typeof AGENT_ICONS] || Users;
    const statusIcon = statusIcons[step.status];
    const statusColor = statusColors[step.status];

    return (
      <motion.div
        key={`${step.agent}-${index}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 }}
        className="flex items-start gap-3 mb-4"
      >
        <div className="relative">
          <div className={`p-2 rounded-full bg-gray-100 dark:bg-gray-800 ${statusColor}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          {index < progressSteps.length - 1 && (
            <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-0.5 h-12 bg-gray-200 dark:bg-gray-700" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{step.agent}</span>
            <span className={statusColor}>{statusIcon}</span>
          </div>
          <p className="text-sm text-muted-foreground">{step.step}</p>
          {step.message && (
            <p className="text-xs text-muted-foreground mt-1">{step.message}</p>
          )}
          {step.timestamp && (
            <p className="text-xs text-muted-foreground">
              {new Date(step.timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
      </motion.div>
    );
  };

  const processCrewAIResults = (results: any) => {
    console.log('Processing CrewAI results:', results);
    
    // Check if this is an error result
    if (results.error || results.success === false) {
      // Handle no content found
      if (results.mode === 'no_content_found' || results.mode === 'scraping_failed') {
        setParsedContent({
          executive_summary: results.data?.executive_summary || [
            'No content found',
            results.error || 'Unable to fetch content from the requested sources'
          ],
          trending_topics: [],
          organized_content: {
            reddit_posts: [],
            linkedin_posts: [],
            telegram_messages: [],
            news_articles: []
          },
          ai_insights: results.data?.ai_insights || {
            failed_sources: results.details?.failed_sources || [],
            error_message: results.error || 'Content fetching failed'
          },
          recommendations: results.data?.recommendations || []
        });
        
        // Show error state
        setAgentStates({
          research: 'error',
          quality: 'idle',
          trend: 'idle'
        });
        
        return;
      }
    }
    
    // Process successful results
    const { data } = results;
    
    if (!data) {
      setParsedContent({
        executive_summary: ['No data received from agents'],
        trending_topics: [],
        organized_content: {
          reddit_posts: [],
          linkedin_posts: [],
          telegram_messages: [],
          news_articles: []
        }
      });
      return;
    }

    // ... rest of the function ...
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Users className="w-4 h-4" />
          Crew Dashboard
          {isRunning && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className={`${isMinimized ? 'h-20' : 'max-w-6xl h-[85vh]'} transition-all duration-300`}>
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5" />
            <DialogTitle>
              {agentName} - AI News Research Crew
            </DialogTitle>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Status Indicator */}
            {agentStatus && (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-muted/30 rounded-full text-xs">
                {agentStatus.isStuck ? (
                  <AlertCircle className="w-3 h-3 text-red-500" />
                ) : agentStatus.canExecute ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : (
                  <Clock className="w-3 h-3 text-yellow-500" />
                )}
                <span className="capitalize">{progressStatus !== 'idle' ? progressStatus : agentStatus.status}</span>
                {agentStatus.statusReason && (
                  <span className="text-muted-foreground">• {agentStatus.statusReason}</span>
                )}
                {currentSessionId && (
                  <span className="text-muted-foreground">• Session: {currentSessionId.split('_').pop()?.substring(0, 6)}</span>
                )}
                {pollingProgress && (
                  <span className="text-blue-500 animate-pulse">• Live Updates</span>
                )}
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-1">
              {/* Reset button for stuck agents */}
              {agentStatus?.isStuck && (
                <Button size="sm" variant="outline" onClick={handleResetStatus}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              )}
              
              {error && onExecuteAgent && (
                <Button size="sm" variant="outline" onClick={() => onExecuteAgent?.()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              )}
              
              {onExecuteAgent && !isRunning && agentStatus?.canExecute && (
                <Button size="sm" variant="outline" onClick={() => onExecuteAgent?.()}>
                  <Play className="w-4 h-4 mr-2" />
                  Execute
                </Button>
              )}
              
              {onExecuteAgent && !agentStatus?.canExecute && !agentStatus?.isStuck && (
                <Button size="sm" variant="outline" disabled title={agentStatus?.statusReason || 'Cannot execute'}>
                  <Play className="w-4 h-4 mr-2" />
                  Execute
                </Button>
              )}
              
              {(isRunning || agentStatus?.status === 'running') && (
                <Button size="sm" variant="outline" disabled>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running
                </Button>
              )}
              
              {onPauseAgent && (
                <Button size="sm" variant="outline" onClick={onPauseAgent}>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              )}
              
              {/* Refresh status button */}
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={fetchAgentStatus}
                disabled={statusLoading}
                title="Refresh status"
              >
                <RefreshCw className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            
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
          <div className="flex flex-col h-full space-y-4">
            {/* Overall Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Overall Progress</span>
                <span className="text-muted-foreground">
                  {Math.round(animatedProgress)}%
                </span>
              </div>
              <Progress value={animatedProgress} className="h-2" />
            </div>

            {/* Error Alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Card className="p-4 border-red-200 bg-red-50 dark:bg-red-900/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-red-900 dark:text-red-200">
                        Execution Error
                      </h3>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        {error}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Main Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="overview">
                  <Globe className="w-4 h-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="progress">
                  <Zap className="w-4 h-4 mr-2" />
                  Progress
                </TabsTrigger>
                <TabsTrigger value="content">
                  <FileText className="w-4 h-4 mr-2" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="insights">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Insights
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview">
                <div className="space-y-6">
                  {/* Agent Status Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Current Status */}
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded ${agentStatus?.canExecute ? 'bg-green-100 dark:bg-green-900/20' : 'bg-yellow-100 dark:bg-yellow-900/20'}`}>
                          {agentStatus?.canExecute ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <p className="text-lg font-semibold capitalize">{agentStatus?.status || 'Unknown'}</p>
                        </div>
                      </div>
                    </Card>

                    {/* Total Runs */}
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded">
                          <Activity className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Runs</p>
                          <p className="text-lg font-semibold">{agentRuns.length}</p>
                        </div>
                      </div>
                    </Card>

                    {/* Recent Activity */}
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded">
                          <Clock className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Last Run</p>
                          <p className="text-lg font-semibold">
                            {agentRuns.length > 0 
                              ? new Date(agentRuns[0].createdAt).toLocaleDateString()
                              : 'Never'
                            }
                          </p>
                        </div>
                      </div>
                    </Card>

                    {/* Progress Indicator */}
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded">
                          {pollingProgress ? (
                            <RefreshCw className="h-5 w-5 text-orange-600 animate-spin" />
                          ) : (
                            <Zap className="h-5 w-5 text-orange-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Live Updates</p>
                          <p className="text-lg font-semibold">
                            {pollingProgress ? 'Active' : 'Idle'}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Recent Runs Table */}
                  {agentRuns.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Recent Executions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {agentRuns.slice(0, 5).map((run, idx) => (
                            <div key={run._id || idx} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  run.status === 'completed' ? 'bg-green-500' :
                                  run.status === 'failed' ? 'bg-red-500' :
                                  run.status === 'running' ? 'bg-blue-500 animate-pulse' :
                                  'bg-gray-400'
                                }`} />
                                <div>
                                  <p className="font-medium capitalize">{run.status}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(run.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{run.itemsAdded || 0} items</p>
                                <p className="text-sm text-muted-foreground">
                                  {run.duration ? `${Math.round(run.duration / 1000)}s` : 'N/A'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Empty State for Overview */}
                  {agentRuns.length === 0 && (
                    <Card className="p-8">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No Execution History</h3>
                        <p className="text-sm">
                          This agent hasn't been executed yet. Start your first multi-agent crew run to see progress and results here.
                        </p>
                      </div>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Progress Tab */}
              <TabsContent value="progress">
                <div className="space-y-6">
                  {/* Progress Status */}
                  <Card className="p-6">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Execution Progress
                        {pollingProgress && (
                          <Badge variant="secondary" className="text-xs animate-pulse">
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                            Live Updates
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {progressSteps.length > 0 ? (
                        <div className="space-y-4">
                          {progressSteps.map((step, index) => renderProgressStep(step, index))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-lg font-medium">No Active Progress</p>
                          <p className="text-sm mt-1">
                            {isRunning 
                              ? `Agent is ${progressStatus !== 'idle' ? progressStatus : 'starting up'}... Progress will appear shortly.`
                              : agentRuns.length > 0
                                ? `Last run: ${agentRuns[0]?.status || 'unknown'} • ${new Date(agentRuns[0]?.createdAt || Date.now()).toLocaleString()}`
                                : "Execute the agent to see real-time progress updates."
                            }
                          </p>
                          
                          {/* **FIX 23: Enhanced status display with session info** */}
                          {currentSessionId && (
                            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                📊 Session Active: {currentSessionId.split('_').pop()?.substring(0, 8)}
                              </p>
                              <p className="text-xs text-blue-500 dark:text-blue-300 mt-1">
                                Status: {progressStatus} • Polling: {pollingProgress ? 'Active' : 'Stopped'}
                              </p>
                            </div>
                          )}
                          
                          {agentRuns.length > 0 && (
                            <div className="mt-4 space-y-2">
                              <p className="text-xs font-medium">Recent Activity:</p>
                              {agentRuns.slice(0, 3).map((run, idx) => (
                                <div key={run._id || idx} className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                                  <span className="capitalize">{run.status}</span>
                                  <span>{new Date(run.createdAt).toLocaleString()}</span>
                                  <span>{run.itemsAdded || 0} items</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Execution Stats */}
                  {progressSteps.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded">
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Completed Steps</p>
                            <p className="text-2xl font-bold">
                              {progressSteps.filter(s => s.status === 'completed').length}
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded">
                            <RefreshCw className="h-5 w-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">In Progress</p>
                            <p className="text-2xl font-bold">
                              {progressSteps.filter(s => s.status === 'in_progress').length}
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Failed Steps</p>
                            <p className="text-2xl font-bold">
                              {progressSteps.filter(s => s.status === 'failed').length}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Content Tab */}
              <TabsContent value="content">
                {/* Show content from recent run if no active progress */}
                {!parsedContent && lastRunResults && (
                  <div className="mb-6">
                    <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <h3 className="font-semibold text-blue-900 dark:text-blue-200">
                            Showing Results from Recent Run
                          </h3>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            No active execution in progress. Displaying content from the most recent completed run.
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* Error State */}
                {agentStates.research === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8"
                  >
                    <Card className="p-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                      <div className="flex items-start gap-4">
                        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 mt-1" />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
                            Unable to Fetch Content
                          </h3>
                          {parsedContent.ai_insights?.error_message && (
                            <p className="text-red-800 dark:text-red-300 mb-3">
                              {parsedContent.ai_insights.error_message}
                            </p>
                          )}
                          {parsedContent.ai_insights?.failed_sources && parsedContent.ai_insights.failed_sources.length > 0 && (
                            <div className="mb-3">
                              <p className="text-red-800 dark:text-red-300 font-medium mb-1">Failed Sources:</p>
                              <ul className="list-disc list-inside text-red-700 dark:text-red-400 text-sm">
                                {parsedContent.ai_insights.failed_sources.map((source: string, idx: number) => (
                                  <li key={idx}>{source}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="mt-4">
                            <p className="text-red-700 dark:text-red-400 text-sm font-medium mb-2">Suggestions:</p>
                            <ul className="list-disc list-inside text-red-600 dark:text-red-500 text-sm">
                              <li>Try different search topics</li>
                              <li>Check your internet connection</li>
                              <li>Verify API credentials are configured</li>
                              <li>Try again in a few moments</li>
                            </ul>
                          </div>
                          <Button 
                            onClick={() => window.location.reload()} 
                            className="mt-4 bg-red-600 hover:bg-red-700 text-white"
                            size="sm"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )}

                {/* Empty state when no content and no recent runs */}
                {!parsedContent && !lastRunResults && agentStates.research !== 'error' && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Sparkles className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">No Content Available</h3>
                    <p className="text-sm mb-4">
                      This CrewAI agent hasn't run yet or no results were generated.
                    </p>
                    <div className="bg-muted/30 rounded-lg p-4 max-w-md mx-auto">
                      <p className="text-xs font-medium mb-2">To see content:</p>
                      <ol className="text-xs text-left space-y-1">
                        <li>1. Execute the agent using the button above</li>
                        <li>2. Wait for the multi-agent crew to gather content</li>
                        <li>3. Return here to view organized results</li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* Content Sections - Only show if we have content */}
                {agentStates.research !== 'error' && (parsedContent || lastRunResults) && (
                  <>
                    {/* Executive Summary */}
                    {parsedContent.executive_summary && parsedContent.executive_summary.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-6"
                      >
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              Executive Summary
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="prose dark:prose-invert max-w-none">
                              {parsedContent.executive_summary.map((point: string, idx: number) => (
                                <p key={idx} className="mb-2 text-gray-700 dark:text-gray-300">
                                  • {point}
                                </p>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}

                    {/* Content Sections */}
                    {parsedContent?.organized_content && (
                      <div className="space-y-6">
                        {Object.entries(parsedContent.organized_content).map(([contentType, items]) => {
                          const itemsArray = Array.isArray(items) ? items : [];
                          return (
                            <motion.div
                              key={contentType}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="space-y-4"
                            >
                              <h3 className="text-lg font-semibold capitalize">
                                {contentType.replace('_', ' ')}
                              </h3>
                              {itemsArray && itemsArray.length > 0 ? (
                                itemsArray.map((item: ContentItem) => renderContentCard(item, contentType))
                              ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                  <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                  <p className="text-lg font-medium">No {contentType.replace('_', ' ')} found</p>
                                  <p className="text-sm mt-1">Try adjusting your search criteria or checking back later</p>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Insights Tab */}
              <TabsContent value="insights">
                {/* Insights content */}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};