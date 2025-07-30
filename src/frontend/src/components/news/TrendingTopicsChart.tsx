import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Eye,
  Hash,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendingTopic {
  topic: string;
  mentions: number;
  score: number;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
  sources?: string[];
}

interface TrendingTopicsChartProps {
  topics: TrendingTopic[];
  className?: string;
  maxTopics?: number;
  animated?: boolean;
  interactive?: boolean;
  onTopicClick?: (topic: TrendingTopic) => void;
}

const TrendingTopicsChart: React.FC<TrendingTopicsChartProps> = ({
  topics,
  className,
  maxTopics = 10,
  animated = true,
  interactive = true,
  onTopicClick
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');
  const [animatedTopics, setAnimatedTopics] = useState<TrendingTopic[]>([]);

  // Sort topics by score and limit
  const sortedTopics = topics
    .sort((a, b) => b.score - a.score)
    .slice(0, maxTopics);

  // Animate topics on mount
  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimatedTopics(sortedTopics);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedTopics(sortedTopics);
    }
  }, [sortedTopics, animated]);

  // Get maximum score for scaling
  const maxScore = Math.max(...sortedTopics.map(t => t.score), 1);

  // Get trend icon and color
  const getTrendInfo = (topic: TrendingTopic) => {
    switch (topic.trend) {
      case 'up':
        return {
          icon: <TrendingUp className="w-3 h-3" />,
          color: 'text-green-500',
          bgColor: 'bg-green-50 border-green-200',
          change: `+${topic.change || 0}%`
        };
      case 'down':
        return {
          icon: <TrendingDown className="w-3 h-3" />,
          color: 'text-red-500',
          bgColor: 'bg-red-50 border-red-200',
          change: `-${topic.change || 0}%`
        };
      default:
        return {
          icon: <Activity className="w-3 h-3" />,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50 border-blue-200',
          change: 'stable'
        };
    }
  };

  // Handle topic click
  const handleTopicClick = (topic: TrendingTopic) => {
    if (!interactive) return;
    
    setSelectedTopic(selectedTopic === topic.topic ? null : topic.topic);
    onTopicClick?.(topic);
  };

  // Chart view component
  const ChartView = () => (
    <div className="space-y-3">
      <AnimatePresence>
        {animatedTopics.map((topic, index) => {
          const trendInfo = getTrendInfo(topic);
          const widthPercentage = (topic.score / maxScore) * 100;
          const isSelected = selectedTopic === topic.topic;

          return (
            <motion.div
              key={topic.topic}
              initial={animated ? { opacity: 0, x: -50 } : {}}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ 
                delay: animated ? index * 0.1 : 0,
                type: 'spring',
                stiffness: 100
              }}
              className={cn(
                "group cursor-pointer transition-all duration-200",
                interactive && "hover:scale-[1.02]",
                isSelected && "transform scale-[1.02]"
              )}
              onClick={() => handleTopicClick(topic)}
            >
              <div className={cn(
                "relative p-4 rounded-lg border-2 transition-all duration-200",
                trendInfo.bgColor,
                isSelected ? "border-blue-500 shadow-lg" : "border-transparent",
                interactive && "hover:shadow-md"
              )}>
                {/* Topic header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-sm truncate max-w-[200px]">
                      {topic.topic}
                    </span>
                    <div className={cn("flex items-center gap-1", trendInfo.color)}>
                      {trendInfo.icon}
                      <span className="text-xs font-medium">
                        {trendInfo.change}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Score: {topic.score}
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="relative mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPercentage}%` }}
                      transition={{ 
                        duration: animated ? 1 : 0, 
                        delay: animated ? index * 0.1 : 0,
                        ease: "easeOut"
                      }}
                    />
                  </div>
                  <div className="absolute right-0 top-3 text-xs text-muted-foreground">
                    {topic.mentions} mentions
                  </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {isSelected && topic.sources && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pt-2 border-t border-gray-200"
                    >
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground mr-2">Sources:</span>
                        {topic.sources.map((source, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Hover effect overlay */}
                {interactive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg" />
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  // List view component
  const ListView = () => (
    <div className="space-y-2">
      <AnimatePresence>
        {animatedTopics.map((topic, index) => {
          const trendInfo = getTrendInfo(topic);
          
          return (
            <motion.div
              key={topic.topic}
              initial={animated ? { opacity: 0, y: 20 } : {}}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ 
                delay: animated ? index * 0.05 : 0,
                type: 'spring'
              }}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
              onClick={() => handleTopicClick(topic)}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground min-w-[20px]">
                  #{index + 1}
                </span>
                <span className="font-medium">{topic.topic}</span>
                <div className={cn("flex items-center gap-1", trendInfo.color)}>
                  {trendInfo.icon}
                  <span className="text-xs">{trendInfo.change}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{topic.mentions} mentions</span>
                <Badge variant="secondary" className="text-xs">
                  {topic.score}
                </Badge>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Trending Topics
            <Badge variant="secondary" className="ml-2">
              {topics.length} topics
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'chart' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('chart')}
              className="h-8"
            >
              <BarChart3 className="w-3 h-3 mr-1" />
              Chart
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8"
            >
              <Eye className="w-3 h-3 mr-1" />
              List
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {viewMode === 'chart' ? <ChartView /> : <ListView />}
          </motion.div>
        </AnimatePresence>

        {topics.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No trending topics found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendingTopicsChart;