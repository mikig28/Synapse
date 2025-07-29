import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cardVariants } from '@/utils/animations';
import { 
  Lightbulb, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  TrendingUp,
  Settings,
  Play,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Brain,
  Target
} from 'lucide-react';

interface Insight {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  action?: string;
}

interface InsightsPanelProps {
  insights: Insight[];
}

interface InsightCardProps {
  insight: Insight;
  index: number;
  onActionClick?: (action: string) => void;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight, index, onActionClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getInsightIcon = () => {
    switch (insight.type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getInsightColors = () => {
    switch (insight.type) {
      case 'success':
        return {
          bg: 'bg-green-50/50 border-green-200/50',
          text: 'text-green-700',
          badge: 'bg-green-100 text-green-700 border-green-200'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50/50 border-yellow-200/50',
          text: 'text-yellow-700',
          badge: 'bg-yellow-100 text-yellow-700 border-yellow-200'
        };
      case 'info':
        return {
          bg: 'bg-blue-50/50 border-blue-200/50',
          text: 'text-blue-700',
          badge: 'bg-blue-100 text-blue-700 border-blue-200'
        };
      default:
        return {
          bg: 'bg-gray-50/50 border-gray-200/50',
          text: 'text-gray-700',
          badge: 'bg-gray-100 text-gray-700 border-gray-200'
        };
    }
  };

  const colors = getInsightColors();

  const handleActionClick = () => {
    if (insight.action && onActionClick) {
      onActionClick(insight.action);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-sm ${colors.bg}`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-0.5">
              {getInsightIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={`font-medium text-sm ${colors.text}`}>
                  {insight.title}
                </h4>
                <Badge className={`text-xs px-2 py-0.5 ${colors.badge} capitalize`}>
                  {insight.type}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {insight.description}
              </p>
            </div>
          </div>
        </div>

        {insight.action && (
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <span className="text-xs text-muted-foreground">
              Recommended action:
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleActionClick}
              className={`h-7 text-xs ${colors.text} hover:${colors.bg}`}
            >
              {insight.action}
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ insights }) => {
  const [filter, setFilter] = useState<'all' | 'success' | 'warning' | 'info'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter insights based on selected filter
  const filteredInsights = insights.filter(insight => 
    filter === 'all' || insight.type === filter
  );

  // Count insights by type
  const insightCounts = {
    success: insights.filter(i => i.type === 'success').length,
    warning: insights.filter(i => i.type === 'warning').length,
    info: insights.filter(i => i.type === 'info').length
  };

  const handleActionClick = (action: string) => {
    console.log('Handle action:', action);
    // In a real app, this would trigger the appropriate action
    // e.g., navigate to settings, activate agents, etc.
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Mock refresh delay
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Generate additional AI-powered insights
  const generateAIInsights = (): Insight[] => {
    const aiInsights: Insight[] = [];
    
    // Add some smart insights based on patterns
    if (insightCounts.warning > insightCounts.success) {
      aiInsights.push({
        type: 'info',
        title: 'Performance Optimization Opportunity',
        description: 'Multiple agents showing suboptimal performance. Consider reviewing configurations and implementing best practices.',
        action: 'View Optimization Guide'
      });
    }
    
    if (insights.length === 0) {
      aiInsights.push({
        type: 'info',
        title: 'All Systems Optimal',
        description: 'Your agents are performing well with no immediate issues detected. Keep up the great work!',
        action: 'View Performance Report'
      });
    }
    
    // Time-based insights
    const currentHour = new Date().getHours();
    if (currentHour >= 9 && currentHour <= 17) {
      aiInsights.push({
        type: 'info',
        title: 'Peak Activity Hours',
        description: 'This is typically a high-activity period. Monitor your agents closely for optimal performance.',
        action: 'View Live Dashboard'
      });
    }
    
    return aiInsights;
  };

  const aiInsights = generateAIInsights();
  const allInsights = [...insights, ...aiInsights];
  const displayInsights = filter === 'all' ? allInsights : allInsights.filter(i => i.type === filter);

  return (
    <motion.div variants={cardVariants}>
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Brain className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  AI Insights
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Smart recommendations and alerts
                </p>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 px-3"
            >
                              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center bg-muted/50 rounded-lg p-1">
              {([
                { key: 'all', label: 'All', count: allInsights.length },
                { key: 'success', label: 'Success', count: insightCounts.success },
                { key: 'warning', label: 'Warnings', count: insightCounts.warning },
                { key: 'info', label: 'Info', count: insightCounts.info }
              ] as const).map(({ key, label, count }) => (
                <Button
                  key={key}
                  variant={filter === key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter(key)}
                  className="h-7 px-3 text-xs"
                >
                  {label}
                  {count > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="ml-1.5 h-4 w-4 p-0 text-xs flex items-center justify-center"
                    >
                      {count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <AnimatePresence mode="wait">
            {displayInsights.length > 0 ? (
              <motion.div
                key={filter}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {displayInsights.map((insight, index) => (
                  <InsightCard
                    key={`${insight.title}-${index}`}
                    insight={insight}
                    index={index}
                    onActionClick={handleActionClick}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground text-sm">
                  {filter === 'all' 
                    ? 'No insights available at the moment'
                    : `No ${filter} insights found`
                  }
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="mt-3 text-xs"
                >
                                  <RefreshCw className="w-3 h-3 mr-1" />
                Refresh Insights
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Quick Actions */}
          {displayInsights.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 pt-4 border-t border-border/30"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Quick Actions:
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => console.log('View all agents')}
                    className="h-7 text-xs"
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Settings
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => console.log('Run all agents')}
                    className="h-7 text-xs"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Run All
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* AI Disclaimer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 p-3 bg-muted/20 rounded-lg"
          >
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  These insights are generated by AI analysis of your agent performance data. 
                  Recommendations are based on observed patterns and best practices.
                </p>
              </div>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};