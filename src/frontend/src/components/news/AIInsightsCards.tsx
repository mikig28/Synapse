import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Brain,
  Lightbulb,
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Eye,
  ChevronDown,
  ChevronUp,
  Star,
  Bookmark,
  Share2,
  Download,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIInsight {
  id: string;
  type: 'market' | 'technology' | 'trend' | 'risk' | 'opportunity';
  title: string;
  content: string;
  confidence: number; // 0-100
  impact: 'low' | 'medium' | 'high';
  urgency: 'low' | 'medium' | 'high';
  keywords: string[];
  supportingData?: {
    sources: string[];
    metrics: { label: string; value: string | number }[];
  };
  actionable: boolean;
  relatedTopics?: string[];
}

interface AIInsightsCardsProps {
  insights: AIInsight[];
  className?: string;
  animated?: boolean;
  interactive?: boolean;
  onInsightClick?: (insight: AIInsight) => void;
  onActionClick?: (action: string, insight: AIInsight) => void;
}

const AIInsightsCards: React.FC<AIInsightsCardsProps> = ({
  insights,
  className,
  animated = true,
  interactive = true,
  onInsightClick,
  onActionClick
}) => {
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'confidence' | 'impact' | 'urgency'>('confidence');

  // Get insight type configuration
  const getInsightConfig = (type: string) => {
    switch (type) {
      case 'market':
        return {
          icon: <BarChart3 className="w-5 h-5" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          accentColor: 'bg-blue-500',
          label: 'Market Intelligence'
        };
      case 'technology':
        return {
          icon: <Zap className="w-5 h-5" />,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          accentColor: 'bg-purple-500',
          label: 'Technology Insight'
        };
      case 'trend':
        return {
          icon: <TrendingUp className="w-5 h-5" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          accentColor: 'bg-green-500',
          label: 'Trend Analysis'
        };
      case 'risk':
        return {
          icon: <AlertTriangle className="w-5 h-5" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          accentColor: 'bg-red-500',
          label: 'Risk Assessment'
        };
      case 'opportunity':
        return {
          icon: <Target className="w-5 h-5" />,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          accentColor: 'bg-orange-500',
          label: 'Opportunity'
        };
      default:
        return {
          icon: <Brain className="w-5 h-5" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          accentColor: 'bg-gray-500',
          label: 'AI Insight'
        };
    }
  };

  // Get priority level styling
  const getPriorityStyle = (impact: string, urgency: string) => {
    const score = (impact === 'high' ? 3 : impact === 'medium' ? 2 : 1) + 
                  (urgency === 'high' ? 3 : urgency === 'medium' ? 2 : 1);
    
    if (score >= 5) {
      return { color: 'text-red-600', bg: 'bg-red-100', label: 'High Priority' };
    } else if (score >= 3) {
      return { color: 'text-orange-600', bg: 'bg-orange-100', label: 'Medium Priority' };
    } else {
      return { color: 'text-green-600', bg: 'bg-green-100', label: 'Low Priority' };
    }
  };

  // Filter and sort insights
  const filteredInsights = insights
    .filter(insight => filterType === 'all' || insight.type === filterType)
    .sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return b.confidence - a.confidence;
        case 'impact':
          const impactScore = { high: 3, medium: 2, low: 1 };
          return impactScore[b.impact] - impactScore[a.impact];
        case 'urgency':
          const urgencyScore = { high: 3, medium: 2, low: 1 };
          return urgencyScore[b.urgency] - urgencyScore[a.urgency];
        default:
          return 0;
      }
    });

  // Handle insight interaction
  const handleInsightClick = (insight: AIInsight) => {
    if (!interactive) return;
    
    setExpandedInsight(expandedInsight === insight.id ? null : insight.id);
    onInsightClick?.(insight);
  };

  // Handle action clicks
  const handleActionClick = (action: string, insight: AIInsight, event: React.MouseEvent) => {
    event.stopPropagation();
    onActionClick?.(action, insight);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold">AI Insights</h2>
          <Badge variant="secondary" className="ml-2">
            {filteredInsights.length} insights
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter buttons */}
          <div className="flex items-center gap-1">
            {['all', 'market', 'technology', 'trend', 'risk', 'opportunity'].map(type => (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType(type)}
                className="h-8 text-xs"
              >
                {type === 'all' ? 'All' : getInsightConfig(type).label.split(' ')[0]}
              </Button>
            ))}
          </div>

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'confidence' | 'impact' | 'urgency')}
            className="text-xs border rounded px-2 py-1 bg-background"
          >
            <option value="confidence">By Confidence</option>
            <option value="impact">By Impact</option>
            <option value="urgency">By Urgency</option>
          </select>
        </div>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredInsights.map((insight, index) => {
            const config = getInsightConfig(insight.type);
            const priority = getPriorityStyle(insight.impact, insight.urgency);
            const isExpanded = expandedInsight === insight.id;

            return (
              <motion.div
                key={insight.id}
                layout
                initial={animated ? { opacity: 0, y: 20 } : {}}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: animated ? index * 0.1 : 0 }}
              >
                <Card
                  className={cn(
                    "cursor-pointer transition-all duration-300 border-l-4 h-full",
                    config.borderColor,
                    config.bgColor,
                    interactive && "hover:shadow-lg hover:scale-[1.02]",
                    isExpanded && "shadow-lg ring-2 ring-blue-200"
                  )}
                  onClick={() => handleInsightClick(insight)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-2 rounded-full", config.accentColor, "text-white")}>
                          {config.icon}
                        </div>
                        <div>
                          <CardTitle className={cn("text-sm font-semibold", config.color)}>
                            {config.label}
                          </CardTitle>
                          <Badge 
                            className={cn("text-xs mt-1", priority.bg, priority.color)}
                            variant="secondary"
                          >
                            {priority.label}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {insight.actionable && (
                          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                            Actionable
                          </Badge>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Title and confidence */}
                    <div className="mb-3">
                      <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                        {insight.title}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">Confidence:</span>
                        <Progress value={insight.confidence} className="h-2 flex-1" />
                        <span className="text-xs font-medium">{insight.confidence}%</span>
                      </div>
                    </div>

                    {/* Content preview */}
                    <p className={cn(
                      "text-sm text-muted-foreground leading-relaxed mb-3",
                      !isExpanded && "line-clamp-3"
                    )}>
                      {insight.content}
                    </p>

                    {/* Keywords */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {insight.keywords.slice(0, isExpanded ? undefined : 3).map((keyword, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                      {!isExpanded && insight.keywords.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{insight.keywords.length - 3}
                        </Badge>
                      )}
                    </div>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isExpanded && insight.supportingData && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t pt-3 mt-3 space-y-3"
                        >
                          {/* Supporting metrics */}
                          {insight.supportingData.metrics && (
                            <div>
                              <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase">
                                Key Metrics
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                {insight.supportingData.metrics.map((metric, idx) => (
                                  <div key={idx} className="text-center p-2 bg-white/50 rounded">
                                    <div className="text-lg font-bold">{metric.value}</div>
                                    <div className="text-xs text-muted-foreground">{metric.label}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Sources */}
                          {insight.supportingData.sources && (
                            <div>
                              <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase">
                                Sources
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                {insight.supportingData.sources.map((source, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {source}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Related topics */}
                          {insight.relatedTopics && (
                            <div>
                              <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase">
                                Related Topics
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                {insight.relatedTopics.map((topic, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {insight.impact} impact
                        </span>
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {insight.urgency} urgency
                        </span>
                      </div>

                      {interactive && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleActionClick('bookmark', insight, e)}
                            className="h-7 w-7 p-0"
                          >
                            <Bookmark className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleActionClick('share', insight, e)}
                            className="h-7 w-7 p-0"
                          >
                            <Share2 className="w-3 h-3" />
                          </Button>
                          {insight.actionable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleActionClick('action', insight, e)}
                              className="h-7 px-2 text-xs"
                            >
                              <ArrowRight className="w-3 h-3 mr-1" />
                              Act
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {filteredInsights.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Insights Found</h3>
          <p className="text-muted-foreground">
            {filterType === 'all' 
              ? "No AI insights are available for this report." 
              : `No ${getInsightConfig(filterType).label.toLowerCase()} insights found.`
            }
          </p>
        </motion.div>
      )}

      {/* Summary stats */}
      {filteredInsights.length > 0 && (
        <motion.div
          initial={animated ? { opacity: 0, y: 20 } : {}}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: animated ? 0.5 : 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg"
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(filteredInsights.reduce((sum, i) => sum + i.confidence, 0) / filteredInsights.length)}%
            </div>
            <div className="text-xs text-muted-foreground">Avg Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredInsights.filter(i => i.actionable).length}
            </div>
            <div className="text-xs text-muted-foreground">Actionable</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {filteredInsights.filter(i => i.impact === 'high').length}
            </div>
            <div className="text-xs text-muted-foreground">High Impact</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {filteredInsights.filter(i => i.urgency === 'high').length}
            </div>
            <div className="text-xs text-muted-foreground">High Urgency</div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AIInsightsCards;