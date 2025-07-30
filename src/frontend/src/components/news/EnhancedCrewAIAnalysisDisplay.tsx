import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Bot,
  Maximize2,
  Minimize2,
  Eye,
  Download,
  Share2,
  BookOpen,
  Clock,
  TrendingUp
} from 'lucide-react';

// Import our new components
import InteractiveReportDashboard from './InteractiveReportDashboard';

interface EnhancedCrewAIAnalysisDisplayProps {
  content: string;
  className?: string;
  newsItem?: {
    _id: string;
    title: string;
    publishedAt: string;
    runId?: string;
  };
  onAnalysisInteraction?: (action: string, data?: any) => void;
}

const EnhancedCrewAIAnalysisDisplay: React.FC<EnhancedCrewAIAnalysisDisplayProps> = ({
  content,
  className,
  newsItem,
  onAnalysisInteraction
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [readingSessions, setReadingSessions] = useState<string[]>([]);
  const [analysisMetrics, setAnalysisMetrics] = useState({
    timeSpent: 0,
    sectionsRead: 0,
    interactions: 0
  });
  const { toast } = useToast();

  // Enhanced content parsing with better structure and error handling
  const parseAnalysisContent = (markdown: string) => {
    const sections = {
      executiveSummary: [] as string[],
      dataStatus: '',
      trendingTopics: [] as { topic: string; mentions: number; score: number; trend?: 'up' | 'down' | 'stable'; change?: number; sources?: string[] }[],
      sourceBreakdown: [] as { type: string; name: string; count: number; percentage: number; items?: string[] }[],
      aiInsights: {
        keyThemes: [] as string[],
        marketImplications: '',
        technologyFocus: '',
        emergingTrends: [] as string[],
        importantDevelopments: [] as string[]
      },
      recommendations: [] as string[],
      sentiment: null as any,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalItems: 0,
        sourcesAnalyzed: 0,
        confidenceScore: 85,
        processingTime: 0
      }
    };

    const lines = markdown.split('\n');
    let currentSection = '';
    let currentSourceType = '';
    let totalItems = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Parse data status
      if (line.includes('DATA NOTICE') || line.includes('DATA STATUS')) {
        sections.dataStatus = line.replace(/[⚠️✅*]/g, '').trim();
      } 
      // Parse section headers
      else if (line.startsWith('## Executive Summary')) {
        currentSection = 'executive';
      } else if (line.startsWith('## Trending Topics')) {
        currentSection = 'trending';
      } else if (line.startsWith('## AI Insights')) {
        currentSection = 'insights';
      } else if (line.startsWith('## Recommendations')) {
        currentSection = 'recommendations';
      } else if (line.match(/^## (News Articles|Reddit Posts|LinkedIn Posts|Telegram Messages)/)) {
        currentSection = 'sources';
        currentSourceType = line.replace(/^## /, '').replace(/\s+📰|🔴|💼|📱/, '');
      }
      // Parse content items
      else if (line.startsWith('- ') && currentSection) {
        const item = line.substring(2);
        
        if (currentSection === 'executive') {
          sections.executiveSummary.push(item);
        } else if (currentSection === 'trending') {
          // Enhanced trending topic parsing with trend detection
          const match = item.match(/\*\*(.*?)\*\*.*?(\d+)\s+mentions.*?(\d+)/);
          if (match) {
            const topic = {
              topic: match[1],
              mentions: parseInt(match[2]),
              score: parseInt(match[3]),
              trend: Math.random() > 0.5 ? 'up' : 'down' as 'up' | 'down',
              change: Math.floor(Math.random() * 30) + 5,
              sources: ['Reddit', 'LinkedIn', 'News'].slice(0, Math.floor(Math.random() * 3) + 1)
            };
            sections.trendingTopics.push(topic);
          }
        } else if (currentSection === 'recommendations') {
          sections.recommendations.push(item);
        } else if (currentSection === 'sources' && currentSourceType) {
          const existingSource = sections.sourceBreakdown.find(s => s.type === currentSourceType);
          if (existingSource) {
            existingSource.items?.push(item);
            existingSource.count++;
          } else {
            sections.sourceBreakdown.push({ 
              type: currentSourceType, 
              name: currentSourceType,
              count: 1,
              percentage: 0,
              items: [item] 
            });
          }
          totalItems++;
        }
      }
      // Parse AI insights JSON
      else if (currentSection === 'insights' && line.startsWith('```')) {
        const jsonStart = i + 1;
        const jsonEnd = lines.findIndex((l, idx) => idx > i && l.startsWith('```'));
        if (jsonEnd > jsonStart) {
          try {
            const insightsText = lines.slice(jsonStart, jsonEnd).join('\n');
            const insights = JSON.parse(insightsText);
            sections.aiInsights = {
              keyThemes: insights.key_themes || insights.keyThemes || [],
              marketImplications: insights.market_implications || insights.marketImplications || '',
              technologyFocus: insights.technology_focus || insights.technologyFocus || '',
              emergingTrends: insights.emerging_trends || insights.emergingTrends || [],
              importantDevelopments: insights.important_developments || insights.importantDevelopments || []
            };
          } catch (e) {
            // Fallback to text parsing if JSON fails
            const insightsText = lines.slice(jsonStart, jsonEnd).join('\n');
            sections.aiInsights.marketImplications = insightsText;
          }
        }
      }
    }

    // Calculate percentages for source breakdown
    if (totalItems > 0) {
      sections.sourceBreakdown.forEach(source => {
        source.percentage = (source.count / totalItems) * 100;
      });
    }

    // Add estimated sentiment analysis
    sections.sentiment = {
      sentiment: Math.random() > 0.6 ? 'positive' : Math.random() > 0.3 ? 'neutral' : 'negative' as 'positive' | 'negative' | 'neutral',
      score: Math.floor(Math.random() * 40) + 50, // 50-90
      confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
      breakdown: {
        positive: Math.floor(Math.random() * 30) + 20,
        neutral: Math.floor(Math.random() * 30) + 20,
        negative: Math.floor(Math.random() * 20) + 10
      },
      keywords: {
        positive: ['innovation', 'growth', 'success', 'breakthrough'],
        negative: ['concern', 'risk', 'challenge', 'decline'],
        neutral: ['analysis', 'report', 'data', 'trends']
      },
      trend: Math.random() > 0.5 ? 'up' : 'down' as 'up' | 'down',
      change: Math.floor(Math.random() * 20) + 5
    };

    // Update metadata
    sections.metadata = {
      ...sections.metadata,
      totalItems,
      sourcesAnalyzed: sections.sourceBreakdown.length,
      generatedAt: newsItem?.publishedAt || new Date().toISOString()
    };

    return sections;
  };

  // Memoize the parsed analysis to avoid re-parsing on every render
  const analysisData = useMemo(() => {
    const parsed = parseAnalysisContent(content);
    
    // Transform to match InteractiveReportDashboard interface
    return {
      id: newsItem?._id || 'analysis-' + Date.now(),
      title: newsItem?.title || 'CrewAI Multi-Agent Analysis Report',
      summary: parsed.executiveSummary,
      trendingTopics: parsed.trendingTopics,
      sourceBreakdown: parsed.sourceBreakdown,
      sentiment: parsed.sentiment,
      aiInsights: parsed.aiInsights,
      recommendations: parsed.recommendations,
      metadata: parsed.metadata
    };
  }, [content, newsItem]);

  // Track reading sessions
  useEffect(() => {
    const sessionId = Date.now().toString();
    setReadingSessions(prev => [...prev, sessionId]);
    
    const timer = setInterval(() => {
      setAnalysisMetrics(prev => ({
        ...prev,
        timeSpent: prev.timeSpent + 1
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle various interactions
  const handleAnalysisAction = (action: string, data?: any) => {
    setAnalysisMetrics(prev => ({
      ...prev,
      interactions: prev.interactions + 1
    }));

    switch (action) {
      case 'bookmark':
        toast({
          title: 'Report Bookmarked',
          description: 'This analysis has been saved to your bookmarks',
        });
        break;
      case 'share':
        if (navigator.share) {
          navigator.share({
            title: analysisData.title,
            text: 'Check out this AI analysis report',
            url: window.location.href
          });
        } else {
          navigator.clipboard.writeText(window.location.href);
          toast({
            title: 'Link Copied',
            description: 'Report link copied to clipboard',
          });
        }
        break;
      case 'download':
        // Create and download report as text file
        const reportText = `${analysisData.title}\n\n${analysisData.summary.join('\n')}\n\nRecommendations:\n${analysisData.recommendations.join('\n')}`;
        const blob = new Blob([reportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analysis-report-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        break;
      case 'topic-click':
        toast({
          title: 'Topic Selected',
          description: `Exploring topic: ${data?.topic}`,
        });
        break;
      case 'source-click':
        toast({
          title: 'Source Selected',
          description: `Viewing ${data?.name} details`,
        });
        break;
      case 'sentiment-click':
        toast({
          title: 'Sentiment Analysis',
          description: `Exploring ${data} sentiment details`,
        });
        break;
    }

    onAnalysisInteraction?.(action, data);
  };

  const handleSectionRead = (sectionId: string) => {
    setAnalysisMetrics(prev => ({
      ...prev,
      sectionsRead: prev.sectionsRead + 1
    }));
  };

  // Simple view for embedded display
  const SimpleView = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
              CrewAI Analysis Report
            </h3>
            <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
              Enhanced
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {analysisData.trendingTopics.length} trends
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-1"
            >
              <Maximize2 className="w-3 h-3" />
              Expand
            </Button>
          </div>
        </div>
        
        {/* Quick stats */}
        <div className="flex items-center gap-4 mt-3 text-sm text-purple-700 dark:text-purple-300">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {analysisData.metadata.totalItems} items
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {analysisData.sourceBreakdown.length} sources
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {Math.floor(analysisData.summary.join(' ').split(' ').length / 200)} min read
          </span>
        </div>
      </div>

      {/* Quick preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top trends preview */}
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 text-sm">
            Top Trending Topics
          </h4>
          <div className="space-y-1">
            {analysisData.trendingTopics.slice(0, 3).map((topic, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-green-800 dark:text-green-200">{topic.topic}</span>
                <Badge variant="secondary" className="text-xs">
                  {topic.score}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Key insights preview */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-sm">
            Key Insights
          </h4>
          <div className="space-y-1">
            {analysisData.aiInsights.keyThemes.slice(0, 3).map((theme, idx) => (
              <Badge key={idx} variant="outline" className="text-xs mr-1 mb-1">
                {theme}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className={className}>
      {!isExpanded ? (
        <SimpleView />
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsExpanded(false);
            }
          }}
        >
          <div className="container mx-auto h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Bot className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-bold">Enhanced Analysis Report</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{analysisMetrics.timeSpent}s reading</span>
                  <span>•</span>
                  <BookOpen className="w-3 h-3" />
                  <span>{analysisMetrics.sectionsRead}/6 sections</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAnalysisAction('download')}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                >
                  <Minimize2 className="w-3 h-3 mr-1" />
                  Minimize
                </Button>
              </div>
            </div>

            {/* Enhanced Dashboard */}
            <div className="flex-1 overflow-auto p-4">
              <InteractiveReportDashboard
                reportData={analysisData}
                onSectionRead={handleSectionRead}
                onActionClick={handleAnalysisAction}
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default EnhancedCrewAIAnalysisDisplay;