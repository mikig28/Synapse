import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot,
  FileText,
  TrendingUp,
  Users,
  Heart,
  Eye,
  EyeOff,
  Bookmark,
  Share2,
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
  Award,
  Target,
  Lightbulb,
  Activity,
  BarChart3,
  PieChart,
  Gauge
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import our new visualization components
import TrendingTopicsChart from './TrendingTopicsChart';
import SourceDistributionChart from './SourceDistributionChart';
import SentimentIndicator from './SentimentIndicator';
import ReportProgressTracker from './ReportProgressTracker';

interface ReportData {
  id: string;
  title: string;
  summary: string[];
  trendingTopics: Array<{
    topic: string;
    mentions: number;
    score: number;
    trend?: 'up' | 'down' | 'stable';
    change?: number;
    sources?: string[];
  }>;
  sourceBreakdown: Array<{
    type: string;
    name: string;
    count: number;
    percentage: number;
    items?: string[];
  }>;
  sentiment?: {
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
    confidence: number;
    breakdown?: {
      positive: number;
      negative: number;
      neutral: number;
    };
    keywords?: {
      positive: string[];
      negative: string[];
      neutral: string[];
    };
    trend?: 'up' | 'down' | 'stable';
    change?: number;
  };
  aiInsights: {
    keyThemes: string[];
    marketImplications: string;
    technologyFocus: string;
    emergingTrends: string[];
    importantDevelopments: string[];
  };
  recommendations: string[];
  metadata: {
    generatedAt: string;
    totalItems: number;
    sourcesAnalyzed: number;
    confidenceScore: number;
    processingTime: number;
  };
}

interface InteractiveReportDashboardProps {
  reportData: ReportData;
  className?: string;
  onSectionRead?: (sectionId: string) => void;
  onActionClick?: (action: string, data?: any) => void;
}

const InteractiveReportDashboard: React.FC<InteractiveReportDashboardProps> = ({
  reportData,
  className,
  onSectionRead,
  onActionClick
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [readSections, setReadSections] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState<{ [key: string]: boolean }>({});
  const [readingTime, setReadingTime] = useState(0);
  const [trackerMinimized, setTrackerMinimized] = useState(false);

  // Calculate reading progress
  const totalSections = 6; // overview, trends, sources, sentiment, insights, recommendations
  const readProgress = (readSections.size / totalSections) * 100;

  // Mark section as read
  const markSectionAsRead = (sectionId: string) => {
    if (!readSections.has(sectionId)) {
      setReadSections(prev => new Set([...prev, sectionId]));
      onSectionRead?.(sectionId);
    }
  };

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setIsExpanded(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Estimate reading time based on content
  const estimatedReadingTime = useMemo(() => {
    const wordsCount = (
      reportData.summary.join(' ') +
      reportData.recommendations.join(' ') +
      Object.values(reportData.aiInsights).join(' ')
    ).split(' ').length;
    return Math.ceil(wordsCount / 200); // Average reading speed
  }, [reportData]);

  // Track reading time - disabled to prevent blinking/re-renders
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setReadingTime(prev => prev + 1);
  //   }, 1000);
  //   return () => clearInterval(interval);
  // }, []);

  // Progress tracker sections
  const trackerSections = useMemo(() => [
    {
      id: 'overview',
      title: 'Overview',
      icon: <FileText className="w-4 h-4" />,
      estimatedTime: 60,
      completed: readSections.has('overview'),
      currentlyReading: activeTab === 'overview'
    },
    {
      id: 'trends',
      title: 'Trending Topics',
      icon: <TrendingUp className="w-4 h-4" />,
      estimatedTime: 90,
      completed: readSections.has('trends'),
      currentlyReading: activeTab === 'trends'
    },
    {
      id: 'sources',
      title: 'Sources',
      icon: <Users className="w-4 h-4" />,
      estimatedTime: 70,
      completed: readSections.has('sources'),
      currentlyReading: activeTab === 'sources'
    },
    {
      id: 'sentiment',
      title: 'Sentiment',
      icon: <Heart className="w-4 h-4" />,
      estimatedTime: 50,
      completed: readSections.has('sentiment'),
      currentlyReading: activeTab === 'sentiment'
    },
    {
      id: 'insights',
      title: 'Insights',
      icon: <Lightbulb className="w-4 h-4" />,
      estimatedTime: 120,
      completed: readSections.has('insights'),
      currentlyReading: activeTab === 'insights'
    },
    {
      id: 'recommendations',
      title: 'Actions',
      icon: <Target className="w-4 h-4" />,
      estimatedTime: 80,
      completed: readSections.has('recommendations'),
      currentlyReading: activeTab === 'recommendations'
    }
  ], [readSections, activeTab]);

  // Handle section navigation from progress tracker
  const handleTrackerSectionClick = (sectionId: string) => {
    setActiveTab(sectionId);
    markSectionAsRead(sectionId);
  };

  // Report header component
  const ReportHeader = () => (
    <motion.div
      layoutId="report-header"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-950/30">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-full">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-purple-900 dark:text-purple-100">
                  {reportData.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(reportData.metadata.generatedAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {estimatedReadingTime} min read
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {reportData.metadata.totalItems} items analyzed
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-purple-700 border-purple-300">
                AI Generated
              </Badge>
              <Button variant="outline" size="sm" onClick={() => onActionClick?.('bookmark')}>
                <Bookmark className="w-3 h-3 mr-1" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={() => onActionClick?.('share')}>
                <Share2 className="w-3 h-3 mr-1" />
                Share
              </Button>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Reading Progress</span>
              <span className="font-medium">{readSections.size}/{totalSections} sections</span>
            </div>
            <Progress value={readProgress} className="h-2" />
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{reportData.trendingTopics.length}</div>
              <div className="text-xs text-muted-foreground">Trending Topics</div>
            </div>
            <div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <div className="text-lg font-bold text-green-600">{reportData.sourceBreakdown.length}</div>
              <div className="text-xs text-muted-foreground">Sources</div>
            </div>
            <div className="text-center p-2 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
              <div className="text-lg font-bold text-orange-600">{reportData.metadata.confidenceScore}%</div>
              <div className="text-xs text-muted-foreground">Confidence</div>
            </div>
            <div className="text-center p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
              <div className="text-lg font-bold text-purple-600">{readingTime}s</div>
              <div className="text-xs text-muted-foreground">Time Reading</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  // Overview tab content
  const OverviewContent = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Executive Summary */}
      <Card className="overflow-hidden">
        <CardHeader 
          className="cursor-pointer"
          onClick={() => {
            toggleSection('summary');
            markSectionAsRead('overview');
          }}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Executive Summary
              {readSections.has('overview') && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  Read
                </Badge>
              )}
            </div>
            {isExpanded.summary ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </CardTitle>
        </CardHeader>
        <AnimatePresence>
          {(isExpanded.summary !== false) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {reportData.summary.map((point, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                      <p className="text-sm leading-relaxed">{point}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Key Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-green-500" />
                <h3 className="font-semibold text-sm">Key Themes</h3>
              </div>
              <div className="flex flex-wrap gap-1">
                {reportData.aiInsights.keyThemes.slice(0, 4).map((theme, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {theme}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-sm">Emerging Trends</h3>
              </div>
              <div className="flex flex-wrap gap-1">
                {reportData.aiInsights.emergingTrends.slice(0, 3).map((trend, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {trend}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="h-full border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-purple-500" />
                <h3 className="font-semibold text-sm">Tech Focus</h3>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3">
                {reportData.aiInsights.technologyFocus}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );

  return (
    <div className={cn("w-full space-y-6", className)}>
      <ReportHeader />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-auto md:inline-flex grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span className="hidden sm:inline">Trends</span>
          </TabsTrigger>
          <TabsTrigger value="sources" className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span className="hidden sm:inline">Sources</span>
          </TabsTrigger>
          <TabsTrigger value="sentiment" className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            <span className="hidden sm:inline">Sentiment</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            <span className="hidden sm:inline">Insights</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-1">
            <Award className="w-3 h-3" />
            <span className="hidden sm:inline">Actions</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <AnimatePresence mode="wait">
            <TabsContent value="overview" className="mt-0">
              <OverviewContent />
            </TabsContent>

            <TabsContent value="trends" className="mt-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onViewportEnter={() => markSectionAsRead('trends')}
              >
                <TrendingTopicsChart
                  topics={reportData.trendingTopics}
                  maxTopics={10}
                  animated={true}
                  interactive={true}
                  onTopicClick={(topic) => onActionClick?.('topic-click', topic)}
                />
              </motion.div>
            </TabsContent>

            <TabsContent value="sources" className="mt-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onViewportEnter={() => markSectionAsRead('sources')}
              >
                <SourceDistributionChart
                  sources={reportData.sourceBreakdown}
                  animated={true}
                  interactive={true}
                  onSourceClick={(source) => onActionClick?.('source-click', source)}
                />
              </motion.div>
            </TabsContent>

            <TabsContent value="sentiment" className="mt-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onViewportEnter={() => markSectionAsRead('sentiment')}
              >
                {reportData.sentiment ? (
                  <SentimentIndicator
                    data={reportData.sentiment}
                    animated={true}
                    interactive={true}
                    showDetails={true}
                    size="lg"
                    onSentimentClick={(sentiment) => onActionClick?.('sentiment-click', sentiment)}
                  />
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No sentiment data available</p>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="insights" className="mt-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onViewportEnter={() => markSectionAsRead('insights')}
                className="space-y-6"
              >
                {/* Market Implications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-500" />
                      Market Implications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{reportData.aiInsights.marketImplications}</p>
                  </CardContent>
                </Card>

                {/* Important Developments */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-green-500" />
                      Important Developments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {reportData.aiInsights.importantDevelopments.map((dev, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                          <p className="text-sm">{dev}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="recommendations" className="mt-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onViewportEnter={() => markSectionAsRead('recommendations')}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-orange-500" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {reportData.recommendations.map((rec, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800"
                        >
                          <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </div>
                          <p className="text-sm leading-relaxed flex-1">{rec}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </div>
      </Tabs>

      {/* Reading achievement */}
      <AnimatePresence>
        {readProgress === 100 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <Card className="bg-green-500 text-white border-green-600">
              <CardContent className="p-4 flex items-center gap-3">
                <Award className="w-6 h-6" />
                <div>
                  <p className="font-semibold text-sm">Report Complete!</p>
                  <p className="text-xs opacity-90">You've read all sections</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Tracker */}
      <ReportProgressTracker
        sections={trackerSections}
        currentSection={activeTab}
        totalProgress={readProgress}
        readingTime={readingTime}
        onSectionClick={handleTrackerSectionClick}
        onToggleMinimize={() => setTrackerMinimized(!trackerMinimized)}
        minimized={trackerMinimized}
      />
    </div>
  );
};

export default InteractiveReportDashboard;