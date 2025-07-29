import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricsData } from './MetricsDashboard';
import { cardVariants } from '@/utils/animations';
import { 
  Bot, 
  Activity, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  CheckCircle,
  Clock
} from 'lucide-react';

interface HeroMetricsSectionProps {
  data: MetricsData;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
  };
  color: string;
  delay?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color,
  delay = 0
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendText = () => {
    if (!trend) return null;
    
    const isPositive = trend.direction === 'up';
    const isNegative = trend.direction === 'down';
    
    return (
      <span className={`text-sm font-medium ${
        isPositive ? 'text-green-600' : 
        isNegative ? 'text-red-600' : 
        'text-gray-500'
      }`}>
        {trend.direction !== 'stable' && (isPositive ? '+' : '')}{trend.value}%
      </span>
    );
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      whileHover="hover"
    >
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-sm shadow-lg">
        {/* Colored accent line */}
        <div 
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: color }}
        />
        
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Title */}
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {title}
              </p>
              
              {/* Value with animation */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: delay + 0.2, type: "spring", stiffness: 200 }}
                className="flex items-baseline gap-3 mb-2"
              >
                <span className="text-3xl font-bold text-foreground">
                  {typeof value === 'number' ? 
                    new Intl.NumberFormat().format(value) : 
                    value
                  }
                </span>
                {trend && (
                  <div className="flex items-center gap-1">
                    {getTrendIcon()}
                    {getTrendText()}
                  </div>
                )}
              </motion.div>
              
              {/* Subtitle */}
              <p className="text-sm text-muted-foreground">
                {subtitle}
              </p>
            </div>
            
            {/* Icon */}
            <motion.div
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: delay + 0.1, type: "spring" }}
              className="p-3 rounded-xl"
              style={{ backgroundColor: `${color}15` }}
            >
              <div style={{ color }}>
                {icon}
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const HeroMetricsSection: React.FC<HeroMetricsSectionProps> = ({ data }) => {
  // Calculate trend data (mock implementation - in real app this would come from historical data)
  const calculateTrend = (currentValue: number, type: 'agents' | 'items' | 'success') => {
    // Mock trend calculation
    const baseTrend = Math.random() * 20 - 10; // -10% to +10%
    
    switch (type) {
      case 'agents':
        return {
          value: Math.round(Math.abs(baseTrend)),
          direction: baseTrend > 0 ? 'up' as const : baseTrend < -2 ? 'down' as const : 'stable' as const
        };
      case 'items':
        return {
          value: Math.round(Math.abs(baseTrend * 2)),
          direction: baseTrend > -2 ? 'up' as const : 'down' as const
        };
      case 'success':
        return {
          value: Math.round(Math.abs(baseTrend / 2)),
          direction: currentValue > 80 ? 'up' as const : currentValue < 60 ? 'down' as const : 'stable' as const
        };
      default:
        return { value: 0, direction: 'stable' as const };
    }
  };

  const metrics = [
    {
      title: "Total Agents",
      value: data.totalAgents,
      subtitle: `${data.activeAgents} active, ${data.totalAgents - data.activeAgents} paused`,
      icon: <Bot className="w-6 h-6" />,
      trend: calculateTrend(data.totalAgents, 'agents'),
      color: "#3B82F6",
      delay: 0
    },
    {
      title: "Active Agents",
      value: data.activeAgents,
      subtitle: `${((data.activeAgents / Math.max(data.totalAgents, 1)) * 100).toFixed(1)}% of total agents`,
      icon: <Activity className="w-6 h-6" />,
      trend: calculateTrend(data.activeAgents, 'agents'),
      color: "#10B981",
      delay: 0.1
    },
    {
      title: "Items Today",
      value: data.itemsProcessedToday,
      subtitle: "Content items processed",
      icon: <Package className="w-6 h-6" />,
      trend: calculateTrend(data.itemsProcessedToday, 'items'),
      color: "#F59E0B",
      delay: 0.2
    },
    {
      title: "Success Rate",
      value: `${data.averageSuccessRate.toFixed(1)}%`,
      subtitle: "Average across all agents",
      icon: <CheckCircle className="w-6 h-6" />,
      trend: calculateTrend(data.averageSuccessRate, 'success'),
      color: data.averageSuccessRate > 80 ? "#10B981" : data.averageSuccessRate > 60 ? "#F59E0B" : "#EF4444",
      delay: 0.3
    }
  ];

  // Additional status badges
  const getStatusBadges = () => {
    const badges = [];
    
    if (data.activeAgents === 0) {
      badges.push({
        text: "No Active Agents",
        variant: "destructive" as const,
        icon: <Clock className="w-3 h-3" />
      });
    }
    
    if (data.averageSuccessRate > 90) {
      badges.push({
        text: "Excellent Performance",
        variant: "default" as const,
        icon: <CheckCircle className="w-3 h-3" />
      });
    } else if (data.averageSuccessRate < 60) {
      badges.push({
        text: "Needs Attention",
        variant: "destructive" as const,
        icon: <TrendingDown className="w-3 h-3" />
      });
    }
    
    if (data.itemsProcessedToday > 100) {
      badges.push({
        text: "High Activity",
        variant: "default" as const,
        icon: <TrendingUp className="w-3 h-3" />
      });
    }
    
    return badges.slice(0, 3); // Limit to 3 badges
  };

  const statusBadges = getStatusBadges();

  return (
    <div className="space-y-6">
      {/* Status Badges */}
      {statusBadges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2"
        >
          {statusBadges.map((badge, index) => (
            <motion.div
              key={badge.text}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + index * 0.1, type: "spring" }}
            >
              <Badge 
                variant={badge.variant}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
              >
                {badge.icon}
                {badge.text}
              </Badge>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            subtitle={metric.subtitle}
            icon={metric.icon}
            trend={metric.trend}
            color={metric.color}
            delay={metric.delay}
          />
        ))}
      </div>

      {/* Quick Stats Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex flex-wrap gap-6 text-sm text-muted-foreground"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span>
            Total Runs: {data.agents.reduce((sum, agent) => sum + agent.statistics.totalRuns, 0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>
            Total Items: {data.agents.reduce((sum, agent) => sum + agent.statistics.totalItemsProcessed, 0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          <span>
            Agent Types: {new Set(data.agents.map(agent => agent.type)).size}
          </span>
        </div>
      </motion.div>
    </div>
  );
};