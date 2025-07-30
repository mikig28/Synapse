import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Smile,
  Meh,
  Frown,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Gauge,
  Heart,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SentimentData {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number; // 0-100
  confidence: number; // 0-1
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
}

interface SentimentIndicatorProps {
  data: SentimentData;
  className?: string;
  animated?: boolean;
  interactive?: boolean;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  viewMode?: 'gauge' | 'bar' | 'compact';
  onSentimentClick?: (sentiment: string) => void;
}

const SentimentIndicator: React.FC<SentimentIndicatorProps> = ({
  data,
  className,
  animated = true,
  interactive = true,
  showDetails = true,
  size = 'md',
  viewMode: initialViewMode = 'gauge',
  onSentimentClick
}) => {
  const [viewMode, setViewMode] = useState<'gauge' | 'bar' | 'compact'>(initialViewMode);
  const [hoveredSentiment, setHoveredSentiment] = useState<string | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animate score on mount
  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimatedScore(data.score);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedScore(data.score);
    }
  }, [data.score, animated]);

  // Get sentiment configuration
  const getSentimentConfig = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return {
          icon: <Smile className="w-5 h-5" />,
          color: '#22C55E',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-600',
          label: 'Positive',
          emoji: '😊'
        };
      case 'negative':
        return {
          icon: <Frown className="w-5 h-5" />,
          color: '#EF4444',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-600',
          label: 'Negative',
          emoji: '😞'
        };
      case 'neutral':
        return {
          icon: <Meh className="w-5 h-5" />,
          color: '#6B7280',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-600',
          label: 'Neutral',
          emoji: '😐'
        };
      default:
        return {
          icon: <Activity className="w-5 h-5" />,
          color: '#6B7280',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-600',
          label: 'Unknown',
          emoji: '❓'
        };
    }
  };

  const currentSentiment = getSentimentConfig(data.sentiment);

  // Get trend info
  const getTrendInfo = () => {
    switch (data.trend) {
      case 'up':
        return {
          icon: <TrendingUp className="w-4 h-4 text-green-500" />,
          color: 'text-green-500',
          change: `+${data.change || 0}%`
        };
      case 'down':
        return {
          icon: <TrendingDown className="w-4 h-4 text-red-500" />,
          color: 'text-red-500',
          change: `-${data.change || 0}%`
        };
      default:
        return {
          icon: <Activity className="w-4 h-4 text-gray-500" />,
          color: 'text-gray-500',
          change: 'stable'
        };
    }
  };

  const trendInfo = getTrendInfo();

  // Get size configuration
  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return {
          gaugeSize: 80,
          strokeWidth: 8,
          fontSize: 'text-sm',
          iconSize: 'w-4 h-4'
        };
      case 'lg':
        return {
          gaugeSize: 160,
          strokeWidth: 16,
          fontSize: 'text-lg',
          iconSize: 'w-6 h-6'
        };
      default: // md
        return {
          gaugeSize: 120,
          strokeWidth: 12,
          fontSize: 'text-base',
          iconSize: 'w-5 h-5'
        };
    }
  };

  const sizeConfig = getSizeConfig();

  // Gauge Component
  const GaugeView = () => {
    const { gaugeSize, strokeWidth } = sizeConfig;
    const radius = (gaugeSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <svg width={gaugeSize} height={gaugeSize} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={gaugeSize / 2}
              cy={gaugeSize / 2}
              r={radius}
              stroke="#E5E7EB"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress circle */}
            <motion.circle
              cx={gaugeSize / 2}
              cy={gaugeSize / 2}
              r={radius}
              stroke={currentSentiment.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              initial={{ strokeDasharray, strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ 
                duration: animated ? 1.5 : 0,
                ease: "easeOut"
              }}
              style={{ strokeDasharray }}
            />
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl mb-1">{currentSentiment.emoji}</div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: animated ? 0.5 : 0, type: 'spring' }}
              className="text-center"
            >
              <div className={cn("font-bold", sizeConfig.fontSize)}>
                {animatedScore.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {currentSentiment.label}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Trend indicator */}
        {data.trend && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: animated ? 0.8 : 0 }}
            className="flex items-center gap-2"
          >
            {trendInfo.icon}
            <span className={cn("text-sm font-medium", trendInfo.color)}>
              {trendInfo.change}
            </span>
          </motion.div>
        )}

        {/* Confidence indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: animated ? 1 : 0 }}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Confidence: {(data.confidence * 100).toFixed(0)}%</span>
        </motion.div>
      </div>
    );
  };

  // Bar Chart View
  const BarView = () => {
    if (!data.breakdown) return null;

    const sentiments = [
      { key: 'positive', ...getSentimentConfig('positive'), value: data.breakdown.positive },
      { key: 'neutral', ...getSentimentConfig('neutral'), value: data.breakdown.neutral },
      { key: 'negative', ...getSentimentConfig('negative'), value: data.breakdown.negative }
    ];

    const maxValue = Math.max(...sentiments.map(s => s.value));

    return (
      <div className="space-y-4">
        {sentiments.map((sentiment, index) => {
          const widthPercentage = maxValue > 0 ? (sentiment.value / maxValue) * 100 : 0;
          const isHovered = hoveredSentiment === sentiment.key;

          return (
            <motion.div
              key={sentiment.key}
              initial={animated ? { opacity: 0, x: -20 } : {}}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: animated ? index * 0.2 : 0 }}
              className={cn(
                "p-3 rounded-lg border-2 transition-all duration-200",
                sentiment.bgColor,
                sentiment.borderColor,
                interactive && "cursor-pointer hover:shadow-md",
                isHovered && "shadow-md scale-105"
              )}
              onClick={() => onSentimentClick?.(sentiment.key)}
              onMouseEnter={() => setHoveredSentiment(sentiment.key)}
              onMouseLeave={() => setHoveredSentiment(null)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{sentiment.emoji}</span>
                  <span className={cn("font-medium", sentiment.textColor)}>
                    {sentiment.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{sentiment.value}</span>
                  <Badge variant="secondary" className="text-xs">
                    {maxValue > 0 ? ((sentiment.value / maxValue) * 100).toFixed(1) : 0}%
                  </Badge>
                </div>
              </div>
              
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: sentiment.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercentage}%` }}
                    transition={{ 
                      duration: animated ? 1 : 0,
                      delay: animated ? index * 0.2 : 0,
                      ease: "easeOut"
                    }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  // Compact View
  const CompactView = () => (
    <div className="flex items-center gap-4">
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border-2",
        currentSentiment.bgColor,
        currentSentiment.borderColor
      )}>
        <span className="text-lg">{currentSentiment.emoji}</span>
        <div>
          <div className={cn("font-semibold", currentSentiment.textColor)}>
            {data.score.toFixed(0)}%
          </div>
          <div className="text-xs text-muted-foreground">
            {currentSentiment.label}
          </div>
        </div>
      </div>

      {data.trend && (
        <div className="flex items-center gap-1">
          {trendInfo.icon}
          <span className={cn("text-sm font-medium", trendInfo.color)}>
            {trendInfo.change}
          </span>
        </div>
      )}

      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <CheckCircle className="w-3 h-3" />
        <span>{(data.confidence * 100).toFixed(0)}%</span>
      </div>
    </div>
  );

  if (viewMode === 'compact') {
    return (
      <div className={cn("", className)}>
        <CompactView />
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="w-5 h-5 text-pink-500" />
            Sentiment Analysis
            <Badge 
              className={cn("ml-2", currentSentiment.textColor)}
              variant="secondary"
            >
              {currentSentiment.label}
            </Badge>
          </CardTitle>
          {showDetails && (
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'gauge' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('gauge')}
                className="h-8"
              >
                <Gauge className="w-3 h-3 mr-1" />
                Gauge
              </Button>
              {data.breakdown && (
                <Button
                  variant={viewMode === 'bar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('bar')}
                  className="h-8"
                >
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Breakdown
                </Button>
              )}
            </div>
          )}
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
            {viewMode === 'gauge' && <GaugeView />}
            {viewMode === 'bar' && <BarView />}
          </motion.div>
        </AnimatePresence>

        {/* Keywords section */}
        {showDetails && data.keywords && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: animated ? 1.2 : 0 }}
            className="mt-6 space-y-3"
          >
            {Object.entries(data.keywords).map(([sentiment, keywords]) => {
              if (!keywords || keywords.length === 0) return null;
              
              const config = getSentimentConfig(sentiment);
              
              return (
                <div key={sentiment}>
                  <h4 className={cn("text-sm font-medium mb-2", config.textColor)}>
                    {config.label} Keywords:
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {keywords.slice(0, 8).map((keyword, idx) => (
                      <Badge 
                        key={idx} 
                        variant="outline" 
                        className={cn("text-xs", config.textColor, config.borderColor)}
                      >
                        {keyword}
                      </Badge>
                    ))}
                    {keywords.length > 8 && (
                      <Badge variant="secondary" className="text-xs">
                        +{keywords.length - 8} more
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};

export default SentimentIndicator;