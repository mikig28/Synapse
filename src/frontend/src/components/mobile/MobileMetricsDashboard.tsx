/**
 * Mobile Metrics Dashboard
 * Touch-optimized charts and simplified views for mobile devices
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Agent, AgentRun } from '@/types/agent';
import { useTouchGestures } from '@/hooks/useTouchGestures';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Target,
  Zap,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  RefreshCw,
  MoreHorizontal,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MobileMetricsDashboardProps {
  agents: Agent[];
  recentRuns: AgentRun[];
  className?: string;
}

interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description?: string;
}

interface ChartView {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'pie' | 'area';
  data: any[];
  icon: React.ComponentType<{ className?: string }>;
}

const MobileMetricsDashboard: React.FC<MobileMetricsDashboardProps> = ({
  agents,
  recentRuns,
  className = '',
}) => {
  const [currentMetricIndex, setCurrentMetricIndex] = useState(0);
  const [currentChartIndex, setCurrentChartIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Touch gesture support
  const { triggerHaptic } = useTouchGestures({
    onSwipe: (gesture) => {
      if (gesture.direction === 'left') {
        navigateMetrics('next');
      } else if (gesture.direction === 'right') {
        navigateMetrics('previous');
      }
    },
    onPullToRefresh: (gesture) => {
      if (gesture.shouldRefresh && !isRefreshing) {
        handleRefresh();
      }
    },
  });

  // Calculate metrics
  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => a.isActive).length;
  const runningAgents = agents.filter(a => a.status === 'running').length;
  const totalRuns = agents.reduce((sum, a) => sum + a.statistics.totalRuns, 0);
  const totalItems = agents.reduce((sum, a) => sum + a.statistics.totalItemsAdded, 0);
  const averageSuccessRate = totalRuns > 0 
    ? Math.round(agents.reduce((sum, a) => sum + (a.statistics.successfulRuns / Math.max(a.statistics.totalRuns, 1)), 0) / agents.length * 100)
    : 0;

  // Recent activity (last 24h)
  const recentActivity = recentRuns.filter(run => {
    const runDate = new Date(run.createdAt);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return runDate > yesterday;
  }).length;

  const metrics: MetricCard[] = [
    {
      id: 'total-agents',
      title: 'Total Agents',
      value: totalAgents,
      change: 0, // Could calculate from historical data
      icon: Target,
      color: 'text-blue-500',
      description: `${activeAgents} active`,
    },
    {
      id: 'success-rate',
      title: 'Success Rate',
      value: `${averageSuccessRate}%`,
      change: 5, // Mock change
      changeLabel: 'vs last week',
      icon: TrendingUp,
      color: 'text-green-500',
      description: 'Average across all agents',
    },
    {
      id: 'total-runs',
      title: 'Total Runs',
      value: totalRuns,
      change: recentActivity,
      changeLabel: 'today',
      icon: Activity,
      color: 'text-purple-500',
      description: 'All-time executions',
    },
    {
      id: 'items-processed',
      title: 'Items Processed',
      value: totalItems,
      change: 12, // Mock change
      changeLabel: 'vs yesterday',
      icon: Zap,
      color: 'text-orange-500',
      description: 'Content items added',
    },
    {
      id: 'active-now',
      title: 'Currently Running',
      value: runningAgents,
      icon: Clock,
      color: 'text-red-500',
      description: 'Agents executing now',
    },
  ];

  // Generate chart data
  const chartViews: ChartView[] = [
    {
      id: 'agent-performance',
      title: 'Agent Performance',
      type: 'bar',
      icon: BarChart3,
      data: agents.slice(0, 5).map(agent => ({
        name: agent.name.substring(0, 10) + (agent.name.length > 10 ? '...' : ''),
        value: agent.statistics.successfulRuns,
        total: agent.statistics.totalRuns,
        color: agent.isActive ? '#10B981' : '#6B7280',
      })),
    },
    {
      id: 'daily-activity',
      title: 'Daily Activity',
      type: 'line',
      icon: TrendingUp,
      data: generateDailyActivityData(recentRuns),
    },
    {
      id: 'agent-status',
      title: 'Agent Status',
      type: 'pie',
      icon: Activity,
      data: [
        { name: 'Active', value: activeAgents, color: '#10B981' },
        { name: 'Paused', value: totalAgents - activeAgents, color: '#6B7280' },
        { name: 'Running', value: runningAgents, color: '#3B82F6' },
      ],
    },
  ];

  const navigateMetrics = (direction: 'next' | 'previous') => {
    triggerHaptic('light');
    
    if (direction === 'next') {
      setCurrentMetricIndex((prev) => (prev + 1) % metrics.length);
    } else {
      setCurrentMetricIndex((prev) => (prev - 1 + metrics.length) % metrics.length);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    triggerHaptic('medium');
    
    // Simulate refresh delay
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  };

  const currentMetric = metrics[currentMetricIndex];
  const currentChart = chartViews[currentChartIndex];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Analytics</h2>
        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex bg-muted rounded-lg p-1">
            {(['24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`
                  px-3 py-1 text-sm rounded transition-colors
                  ${timeRange === range 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Key Metric Carousel */}
      <div className="relative">
        <motion.div
          className="overflow-hidden"
          ref={scrollRef}
        >
          <motion.div
            className="flex"
            animate={{ x: `-${currentMetricIndex * 100}%` }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          >
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              
              return (
                <motion.div
                  key={metric.id}
                  className="w-full flex-shrink-0 px-2"
                  whileTap={{ scale: 0.98 }}
                >
                  <Card className="bg-gradient-to-br from-background to-muted/30 border-border/50">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-muted ${metric.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-medium text-sm text-muted-foreground">
                              {metric.title}
                            </h3>
                            <p className="text-2xl font-bold">{metric.value}</p>
                          </div>
                        </div>
                        
                        {metric.change !== undefined && (
                          <div className="text-right">
                            <div className={`flex items-center gap-1 ${
                              metric.change > 0 ? 'text-green-500' : 
                              metric.change < 0 ? 'text-red-500' : 'text-muted-foreground'
                            }`}>
                              {metric.change > 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : metric.change < 0 ? (
                                <TrendingDown className="w-3 h-3" />
                              ) : null}
                              <span className="text-sm font-medium">
                                {metric.change > 0 ? '+' : ''}{metric.change}
                              </span>
                            </div>
                            {metric.changeLabel && (
                              <span className="text-xs text-muted-foreground">
                                {metric.changeLabel}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {metric.description && (
                        <p className="text-sm text-muted-foreground">
                          {metric.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>

        {/* Navigation Dots */}
        <div className="flex justify-center mt-4 gap-2">
          {metrics.map((_, index) => (
            <motion.button
              key={index}
              whileTap={{ scale: 0.8 }}
              onClick={() => setCurrentMetricIndex(index)}
              className={`
                w-2 h-2 rounded-full transition-colors
                ${index === currentMetricIndex ? 'bg-primary' : 'bg-muted-foreground/30'}
              `}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <button
          onClick={() => navigateMetrics('previous')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 p-2 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg"
          disabled={currentMetricIndex === 0}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => navigateMetrics('next')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 p-2 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg"
          disabled={currentMetricIndex === metrics.length - 1}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">Active Agents</span>
          </div>
          <div className="text-2xl font-bold">{activeAgents}</div>
          <div className="text-xs text-muted-foreground">
            out of {totalAgents} total
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium">Recent Activity</span>
          </div>
          <div className="text-2xl font-bold">{recentActivity}</div>
          <div className="text-xs text-muted-foreground">runs today</div>
        </Card>
      </div>

      {/* Simple Chart Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Agent Performance
            </CardTitle>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Simplified Bar Chart */}
          <div className="space-y-3">
            {agents.slice(0, 5).map((agent, index) => {
              const successRate = agent.statistics.totalRuns > 0 
                ? Math.round((agent.statistics.successfulRuns / agent.statistics.totalRuns) * 100)
                : 0;
              
              return (
                <motion.div
                  key={agent._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">
                      {agent.name.length > 20 
                        ? agent.name.substring(0, 20) + '...' 
                        : agent.name
                      }
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={agent.isActive ? 'default' : 'secondary'} 
                        className="text-xs"
                      >
                        {successRate}%
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {agent.statistics.totalRuns} runs
                      </span>
                    </div>
                  </div>
                  
                  <div className="w-full bg-muted rounded-full h-2">
                    <motion.div
                      className={`h-2 rounded-full ${
                        agent.isActive ? 'bg-primary' : 'bg-muted-foreground'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${successRate}%` }}
                      transition={{ delay: (index * 0.1) + 0.2, duration: 0.5 }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Agent Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Agent Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{activeAgents}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{runningAgents}</div>
              <div className="text-sm text-muted-foreground">Running</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-500">
                {totalAgents - activeAgents}
              </div>
              <div className="text-sm text-muted-foreground">Paused</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper function to generate daily activity data
function generateDailyActivityData(runs: AgentRun[]) {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toISOString().split('T')[0],
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      value: 0,
    };
  });

  runs.forEach(run => {
    const runDate = new Date(run.createdAt).toISOString().split('T')[0];
    const dayData = last7Days.find(d => d.date === runDate);
    if (dayData) {
      dayData.value++;
    }
  });

  return last7Days;
}

export default MobileMetricsDashboard;