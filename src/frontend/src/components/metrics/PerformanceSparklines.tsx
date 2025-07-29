import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
  Tooltip
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cardVariants } from '@/utils/animations';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Activity,
  Clock,
  Package,
  Settings,
  ChevronRight
} from 'lucide-react';

interface PerformanceData {
  agentId: string;
  agentName: string;
  agentType: string;
  itemsProcessed: number;
  successRate: number;
  uptime: number;
  trend: 'up' | 'down' | 'stable';
  sparklineData: { timestamp: string; value: number }[];
}

interface PerformanceSparklineProps {
  data: PerformanceData[];
}

interface SparklineTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const SparklineTooltip: React.FC<SparklineTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const date = new Date(label as string);
    
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-border/50 rounded-md p-2 shadow-lg text-xs">
        <p className="font-medium">{value}% success</p>
        <p className="text-muted-foreground">
          {date.toLocaleDateString()}
        </p>
      </div>
    );
  }
  return null;
};

interface AgentPerformanceCardProps {
  agent: PerformanceData;
  index: number;
  onSettingsClick: (agentId: string) => void;
}

const AgentPerformanceCard: React.FC<AgentPerformanceCardProps> = ({ 
  agent, 
  index, 
  onSettingsClick 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getTrendIcon = () => {
    switch (agent.trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (agent.trend) {
      case 'up': return 'text-green-600 bg-green-50 border-green-200';
      case 'down': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSuccessRateColor = () => {
    if (agent.successRate >= 90) return 'text-green-600';
    if (agent.successRate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUptimeColor = () => {
    if (agent.uptime >= 95) return 'text-green-600';
    if (agent.uptime >= 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAgentTypeIcon = () => {
    switch (agent.agentType) {
      case 'twitter':
        return '🐦';
      case 'news':
        return '📰';
      case 'crewai_news':
        return '🚀';
      default:
        return '🤖';
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.1 }}
      whileHover="hover"
      className="group"
    >
      <Card className="border-0 shadow-sm bg-gradient-to-r from-white/90 to-white/60 backdrop-blur-sm hover:shadow-md transition-all duration-200">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="text-2xl">{getAgentTypeIcon()}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {agent.agentName}
                  </h3>
                  <p className="text-xs text-muted-foreground capitalize">
                    {agent.agentType.replace('_', ' ')} agent
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={`${getTrendColor()} text-xs px-2 py-1`}>
                  <div className="flex items-center gap-1">
                    {getTrendIcon()}
                    <span className="hidden sm:inline">
                      {agent.trend}
                    </span>
                  </div>
                </Badge>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSettingsClick(agent.agentId)}
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Settings className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Package className="w-3 h-3 text-blue-500" />
                </div>
                <p className="text-lg font-bold text-foreground">
                  {agent.itemsProcessed.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Items</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Activity className="w-3 h-3 text-green-500" />
                </div>
                <p className={`text-lg font-bold ${getSuccessRateColor()}`}>
                  {agent.successRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Success</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-3 h-3 text-purple-500" />
                </div>
                <p className={`text-lg font-bold ${getUptimeColor()}`}>
                  {agent.uptime.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Uptime</p>
              </div>
            </div>

            {/* Sparkline */}
            <div className="relative">
              <div className="h-16 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={agent.sparklineData}>
                    <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip content={<SparklineTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={
                        agent.trend === 'up' ? '#10B981' :
                        agent.trend === 'down' ? '#EF4444' : '#6B7280'
                      }
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ 
                        r: 3, 
                        stroke: agent.trend === 'up' ? '#10B981' : 
                               agent.trend === 'down' ? '#EF4444' : '#6B7280',
                        strokeWidth: 2 
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* Sparkline overlay info */}
              <div className="absolute top-1 right-1 text-xs text-muted-foreground">
                30 days
              </div>
            </div>

            {/* Expandable Details */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-border/30 pt-3 space-y-2"
                >
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Peak Success:</span>
                      <span className="font-medium">
                        {Math.max(...agent.sparklineData.map(d => d.value)).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Success:</span>
                      <span className="font-medium">
                        {(agent.sparklineData.reduce((sum, d) => sum + d.value, 0) / agent.sparklineData.length).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Expand/Collapse Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full h-6 text-xs text-muted-foreground hover:text-foreground"
            >
              <span>{isExpanded ? 'Less' : 'More'} Details</span>
              <ChevronRight 
                className={`w-3 h-3 ml-1 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`} 
              />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const PerformanceSparklines: React.FC<PerformanceSparklineProps> = ({ data }) => {
  const [sortBy, setSortBy] = useState<'successRate' | 'itemsProcessed' | 'uptime'>('successRate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Sort data based on selected criteria
  const sortedData = [...data].sort((a, b) => {
    const multiplier = sortOrder === 'desc' ? -1 : 1;
    return (a[sortBy] - b[sortBy]) * multiplier;
  });

  const handleSort = (criteria: typeof sortBy) => {
    if (sortBy === criteria) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(criteria);
      setSortOrder('desc');
    }
  };

  const handleSettingsClick = (agentId: string) => {
    // In a real app, this would navigate to agent settings
    console.log('Open settings for agent:', agentId);
  };

  // Calculate summary stats
  const avgSuccessRate = data.reduce((sum, agent) => sum + agent.successRate, 0) / Math.max(data.length, 1);
  const totalItemsProcessed = data.reduce((sum, agent) => sum + agent.itemsProcessed, 0);
  const avgUptime = data.reduce((sum, agent) => sum + agent.uptime, 0) / Math.max(data.length, 1);

  return (
    <motion.div variants={cardVariants}>
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Performance Overview</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Individual agent metrics and trends
                </p>
              </div>
            </div>
            
            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sort by:</span>
              <div className="flex items-center bg-muted/50 rounded-lg p-1">
                {([
                  { key: 'successRate', label: 'Success' },
                  { key: 'itemsProcessed', label: 'Items' },
                  { key: 'uptime', label: 'Uptime' }
                ] as const).map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={sortBy === key ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleSort(key)}
                    className="h-7 px-3 text-xs"
                  >
                    {label}
                    {sortBy === key && (
                      <span className="ml-1">
                        {sortOrder === 'desc' ? '↓' : '↑'}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-3 bg-muted/20 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {avgSuccessRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Avg Success Rate</p>
            </div>
            <div className="text-center p-3 bg-muted/20 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {totalItemsProcessed.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </div>
            <div className="text-center p-3 bg-muted/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {avgUptime.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Avg Uptime</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {data.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4"
            >
              {sortedData.map((agent, index) => (
                <AgentPerformanceCard
                  key={agent.agentId}
                  agent={agent}
                  index={index}
                  onSettingsClick={handleSettingsClick}
                />
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No performance data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};