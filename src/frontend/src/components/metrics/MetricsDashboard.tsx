import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Agent, AgentRun } from '@/types/agent';
import { agentService } from '@/services/agentService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeroMetricsSection } from './HeroMetricsSection';
import { ActivityTimelineChart } from './ActivityTimelineChart';
import { SuccessRateChart } from './SuccessRateChart';
import { PerformanceSparklines } from './PerformanceSparklines';
import { InsightsPanel } from './InsightsPanel';
import { SourceBreakdownChart } from './SourceBreakdownChart';
import { containerVariants, cardVariants } from '@/utils/animations';
import { BarChart3, TrendingUp, Activity, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAgui } from '@/contexts/AguiContext';

export interface MetricsData {
  agents: Agent[];
  recentRuns: AgentRun[];
  totalAgents: number;
  activeAgents: number;
  itemsProcessedToday: number;
  averageSuccessRate: number;
  activityTimeline: {
    timestamp: string;
    twitter: number;
    news: number;
    crewai: number;
    custom: number;
    total: number;
  }[];
  successRateByAgent: {
    agentId: string;
    agentName: string;
    agentType: string;
    successRate: number;
    totalRuns: number;
    color: string;
  }[];
  performanceMetrics: {
    agentId: string;
    agentName: string;
    agentType: string;
    itemsProcessed: number;
    successRate: number;
    uptime: number;
    trend: 'up' | 'down' | 'stable';
    sparklineData: { timestamp: string; value: number }[];
  }[];
  sourceBreakdown: {
    source: string;
    count: number;
    percentage: number;
    color: string;
  }[];
  insights: {
    type: 'success' | 'warning' | 'info';
    title: string;
    description: string;
    action?: string;
  }[];
}

interface MetricsDashboardProps {
  agents: Agent[];
  recentRuns: AgentRun[];
  className?: string;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  agents,
  recentRuns,
  className = ''
}) => {
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { isConnected } = useAgui();

  // Generate mock data for timeline (in real implementation, this would come from the backend)
  const generateMockTimelineData = (agents: Agent[], runs: AgentRun[]) => {
    const now = new Date();
    const timeline: MetricsData['activityTimeline'] = [];
    
    // Generate 24 hours of data (hourly intervals)
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
      const hour = timestamp.getHours();
      
      // Simulate realistic activity patterns
      const baseActivity = Math.sin((hour - 6) * Math.PI / 12) * 0.5 + 0.5; // Peak around midday
      const randomFactor = 0.3 + Math.random() * 0.7;
      
      timeline.push({
        timestamp: timestamp.toISOString(),
        twitter: Math.floor(baseActivity * randomFactor * 15),
        news: Math.floor(baseActivity * randomFactor * 12),
        crewai: Math.floor(baseActivity * randomFactor * 8),
        custom: Math.floor(baseActivity * randomFactor * 5),
        total: 0 // Will be calculated
      });
    }
    
    // Calculate totals
    timeline.forEach(item => {
      item.total = item.twitter + item.news + item.crewai + item.custom;
    });
    
    return timeline;
  };

  // Generate sparkline data for performance metrics
  const generateSparklineData = (agentId: string) => {
    const points: { timestamp: string; value: number }[] = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const baseValue = 70 + Math.sin(i * 0.1) * 15; // Base trend
      const randomVariation = (Math.random() - 0.5) * 20;
      const value = Math.max(10, Math.min(100, baseValue + randomVariation));
      
      points.push({
        timestamp: timestamp.toISOString(),
        value: Math.round(value)
      });
    }
    
    return points;
  };

  // Calculate metrics from agent data
  const calculateMetrics = useMemo((): MetricsData => {
    const totalAgents = agents.length;
    const activeAgents = agents.filter(agent => agent.isActive && agent.status !== 'error').length;
    
    // Calculate items processed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRuns = recentRuns.filter(run => new Date(run.startTime) >= today);
    const itemsProcessedToday = todayRuns.reduce((sum, run) => sum + run.itemsProcessed, 0);
    
    // Calculate average success rate
    const totalRuns = agents.reduce((sum, agent) => sum + agent.statistics.totalRuns, 0);
    const successfulRuns = agents.reduce((sum, agent) => sum + agent.statistics.successfulRuns, 0);
    const averageSuccessRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;
    
    // Generate activity timeline
    const activityTimeline = generateMockTimelineData(agents, recentRuns);
    
    // Agent success rates for donut chart
    const agentColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];
    const successRateByAgent = agents.map((agent, index) => ({
      agentId: agent._id,
      agentName: agent.name,
      agentType: agent.type,
      successRate: agent.statistics.totalRuns > 0 
        ? (agent.statistics.successfulRuns / agent.statistics.totalRuns) * 100 
        : 0,
      totalRuns: agent.statistics.totalRuns,
      color: agentColors[index % agentColors.length]
    }));
    
    // Performance metrics with sparklines
    const performanceMetrics = agents.map(agent => {
      const successRate = agent.statistics.totalRuns > 0 
        ? (agent.statistics.successfulRuns / agent.statistics.totalRuns) * 100 
        : 0;
      
      // Simple trend calculation based on recent activity
      const trend: 'up' | 'down' | 'stable' = 
        successRate > 85 ? 'up' : 
        successRate < 60 ? 'down' : 'stable';
      
      return {
        agentId: agent._id,
        agentName: agent.name,
        agentType: agent.type,
        itemsProcessed: agent.statistics.totalItemsProcessed,
        successRate,
        uptime: agent.isActive ? 95 + Math.random() * 5 : 0, // Mock uptime
        trend,
        sparklineData: generateSparklineData(agent._id)
      };
    });
    
    // Source breakdown
    const sourceMap = new Map<string, number>();
    agents.forEach(agent => {
      const source = agent.type === 'twitter' ? 'Twitter' :
                    agent.type === 'news' ? 'News' :
                    agent.type === 'crewai_news' ? 'CrewAI' : 'Custom';
      sourceMap.set(source, (sourceMap.get(source) || 0) + agent.statistics.totalItemsProcessed);
    });
    
    const totalItems = Array.from(sourceMap.values()).reduce((sum, count) => sum + count, 0);
    const sourceColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'];
    const sourceBreakdown = Array.from(sourceMap.entries()).map(([source, count], index) => ({
      source,
      count,
      percentage: totalItems > 0 ? (count / totalItems) * 100 : 0,
      color: sourceColors[index % sourceColors.length]
    }));
    
    // Generate insights
    const insights: MetricsData['insights'] = [];
    
    if (averageSuccessRate < 70) {
      insights.push({
        type: 'warning',
        title: 'Low Success Rate',
        description: `Overall success rate is ${averageSuccessRate.toFixed(1)}%. Consider reviewing agent configurations.`,
        action: 'Review Settings'
      });
    }
    
    if (activeAgents < totalAgents) {
      insights.push({
        type: 'info',
        title: 'Inactive Agents',
        description: `${totalAgents - activeAgents} agents are currently inactive. Activate them to increase coverage.`,
        action: 'Activate Agents'
      });
    }
    
    if (averageSuccessRate > 90) {
      insights.push({
        type: 'success',
        title: 'Excellent Performance',
        description: `Your agents are performing exceptionally well with a ${averageSuccessRate.toFixed(1)}% success rate!`
      });
    }
    
    const topPerformer = performanceMetrics.reduce((max, agent) => 
      agent.successRate > max.successRate ? agent : max, 
      performanceMetrics[0]
    );
    
    if (topPerformer && topPerformer.successRate > 95) {
      insights.push({
        type: 'success',
        title: 'Top Performer',
        description: `${topPerformer.agentName} is your star agent with ${topPerformer.successRate.toFixed(1)}% success rate.`
      });
    }
    
    return {
      agents,
      recentRuns,
      totalAgents,
      activeAgents,
      itemsProcessedToday,
      averageSuccessRate,
      activityTimeline,
      successRateByAgent,
      performanceMetrics,
      sourceBreakdown,
      insights
    };
  }, [agents, recentRuns]);

  // Update metrics data when dependencies change
  useEffect(() => {
    setMetricsData(calculateMetrics);
  }, [calculateMetrics]);

  // Set up real-time refresh interval
  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        setMetricsData(calculateMetrics);
      }, 30000); // Refresh every 30 seconds
      
      setRefreshInterval(interval);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [isConnected, calculateMetrics]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  if (!metricsData) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`space-y-6 ${className}`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`space-y-6 ${className}`}
    >
      {/* Header */}
      <motion.div
        variants={cardVariants}
        className="flex items-center gap-4 mb-8"
      >
        <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
          <BarChart3 className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Agent Analytics
          </h1>
          <p className="text-muted-foreground">
            Comprehensive performance insights and metrics for your AI agents
          </p>
        </div>
        {isConnected && (
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-600 font-medium">Live</span>
          </div>
        )}
      </motion.div>

      {/* Hero Metrics */}
      <motion.div variants={cardVariants}>
        <HeroMetricsSection data={metricsData} />
      </motion.div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={cardVariants}>
          <ActivityTimelineChart data={metricsData.activityTimeline} />
        </motion.div>
        
        <motion.div variants={cardVariants}>
          <SuccessRateChart data={metricsData.successRateByAgent} />
        </motion.div>
      </div>

      {/* Performance and Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={cardVariants} className="lg:col-span-2">
          <PerformanceSparklines data={metricsData.performanceMetrics} />
        </motion.div>
        
        <motion.div variants={cardVariants}>
          <InsightsPanel insights={metricsData.insights} />
        </motion.div>
      </div>

      {/* Source Breakdown */}
      <motion.div variants={cardVariants}>
        <SourceBreakdownChart data={metricsData.sourceBreakdown} />
      </motion.div>

      {/* Empty State for No Data */}
      {agents.length === 0 && (
        <motion.div
          variants={cardVariants}
          className="flex flex-col items-center justify-center py-20 px-4"
        >
          <div className="text-center space-y-4 max-w-md mx-auto">
            <div className="mx-auto p-6 rounded-full bg-muted/20">
              <Bot className="w-16 h-16 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold">No Analytics Data</h3>
            <p className="text-muted-foreground leading-relaxed">
              Create and run some agents to see comprehensive analytics and performance insights.
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};