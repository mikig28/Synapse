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
  Eye
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
  isExecuting: boolean;
  progressSteps: ProgressStep[];
  results?: {
    reddit_posts?: ContentItem[];
    linkedin_posts?: ContentItem[];
    telegram_messages?: ContentItem[];
    news_articles?: ContentItem[];
    executive_summary?: string[];
    trending_topics?: Array<{topic: string; mentions: number; trending_score: number}>;
  };
  error?: string;
  onRetry?: () => void;
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
  isExecuting,
  progressSteps,
  results,
  error,
  onRetry
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

  useEffect(() => {
    const completedSteps = progressSteps.filter(s => s.status === 'completed').length;
    const totalSteps = progressSteps.length || 1;
    const targetProgress = (completedSteps / totalSteps) * 100;
    
    const timer = setTimeout(() => {
      setAnimatedProgress(targetProgress);
    }, 100);

    return () => clearTimeout(timer);
  }, [progressSteps]);

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
    const icon = AGENT_ICONS[step.agent as keyof typeof AGENT_ICONS] || <Users className="w-5 h-5" />;
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
            {icon}
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
          {isExecuting && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className={`${isMinimized ? 'h-20' : 'max-w-6xl h-[85vh]'} transition-all duration-300`}>
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5" />
            <DialogTitle>
              AI News Research Crew
            </DialogTitle>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Control Buttons */}
            <div className="flex gap-1">
              {error && onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {/* Stats Cards */}
                  <Card className="p-6">
                    {/* Stats content */}
                  </Card>
                </div>
              </TabsContent>

              {/* Progress Tab */}
              <TabsContent value="progress">
                {/* Progress content */}
              </TabsContent>

              {/* Content Tab */}
              <TabsContent value="content">
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

                {/* Content Sections - Only show if we have content */}
                {agentStates.research !== 'error' && parsedContent && (
                  <>
                    {/* Executive Summary */}
                    {parsedContent.executive_summary && parsedContent.executive_summary.length > 0 && (
                      <ContentSection
                        title="Executive Summary"
                        icon={<FileText className="h-5 w-5" />}
                        delay={0.3}
                      >
                        <div className="prose dark:prose-invert max-w-none">
                          {parsedContent.executive_summary.map((point: string, idx: number) => (
                            <p key={idx} className="mb-2 text-gray-700 dark:text-gray-300">
                              • {point}
                            </p>
                          ))}
                        </div>
                      </ContentSection>
                    )}

                    {/* No Content Message for individual sections */}
                    {content[contentType] && content[contentType].length === 0 && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-lg font-medium">No {contentType.replace('_', ' ')} found</p>
                        <p className="text-sm mt-1">Try adjusting your search criteria or checking back later</p>
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