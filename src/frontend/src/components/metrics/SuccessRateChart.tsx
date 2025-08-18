import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cardVariants } from '@/utils/animations';
import { 
  Target, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface SuccessRateData {
  agentId: string;
  agentName: string;
  agentType: string;
  successRate: number;
  totalRuns: number;
  color: string;
}

interface SuccessRateChartProps {
  data: SuccessRateData[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

interface CustomLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  index?: number;
  name?: string;
  value?: number;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/95 backdrop-blur-sm border border-border/50 rounded-lg p-4 shadow-lg min-w-[200px]"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <span className="font-medium text-foreground">{data.agentName}</span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Type:</span>
              <Badge variant="outline" className="text-xs capitalize">
                {data.agentType.replace('_', ' ')}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Success Rate:</span>
              <span className="font-medium text-foreground">
                {data.successRate.toFixed(1)}%
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Runs:</span>
              <span className="font-medium text-foreground">
                {data.totalRuns}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Successful:</span>
              <span className="font-medium text-green-600">
                {Math.round((data.successRate / 100) * data.totalRuns)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Failed:</span>
              <span className="font-medium text-red-600">
                {data.totalRuns - Math.round((data.successRate / 100) * data.totalRuns)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
  return null;
};

const CustomLabel: React.FC<CustomLabelProps> = ({
  cx = 0,
  cy = 0,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  percent = 0
}) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Only show label if the slice is large enough
  if (percent < 0.05) return null;

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
      className="drop-shadow-sm"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const SuccessRateChart: React.FC<SuccessRateChartProps> = ({ data }) => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showPercentages, setShowPercentages] = useState(true);

  // Calculate overall statistics
  const totalRuns = data.reduce((sum, agent) => sum + agent.totalRuns, 0);
  const weightedSuccessRate = data.reduce((sum, agent) => 
    sum + (agent.successRate * agent.totalRuns), 0) / Math.max(totalRuns, 1);
  
  // Categorize agents by performance
  const excellentAgents = data.filter(agent => agent.successRate >= 90);
  const goodAgents = data.filter(agent => agent.successRate >= 70 && agent.successRate < 90);
  const needsAttentionAgents = data.filter(agent => agent.successRate < 70);

  // Get performance trend for each category
  const getPerformanceTrend = (category: 'excellent' | 'good' | 'attention') => {
    const agents = category === 'excellent' ? excellentAgents :
                  category === 'good' ? goodAgents : needsAttentionAgents;
    
    if (agents.length === 0) return null;
    
    const avgRate = agents.reduce((sum, agent) => sum + agent.successRate, 0) / agents.length;
    
    // Mock trend calculation (in real app, this would compare to historical data)
    const trend = avgRate > 85 ? 'up' : avgRate < 60 ? 'down' : 'stable';
    
    return { trend, count: agents.length, avgRate };
  };

  const excellentTrend = getPerformanceTrend('excellent');
  const goodTrend = getPerformanceTrend('good');
  const attentionTrend = getPerformanceTrend('attention');

  // Filter out agents with no runs for cleaner visualization
  const chartData = data.filter(agent => agent.totalRuns > 0);

  // Custom legend component
  const CustomLegend: React.FC<{ items: SuccessRateData[] }> = ({ items }) => {
    return (
      <div className="space-y-2">
        {items.map((entry, index) => (
          <motion.div
            key={entry.agentId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
              selectedAgent === entry.agentId ? 'bg-muted/50' : 'hover:bg-muted/30'
            }`}
            onClick={() =>
              setSelectedAgent(selectedAgent === entry.agentId ? null : entry.agentId)
            }
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{entry.agentName}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {entry.agentType.replace('_', ' ')} agent
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-foreground">
                {entry.successRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">{entry.totalRuns} runs</p>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <motion.div variants={cardVariants}>
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Success Rate Analysis</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Agent performance breakdown and insights
                </p>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPercentages(!showPercentages)}
              className="text-xs"
            >
              {showPercentages ? 'Hide' : 'Show'} %
            </Button>
          </div>
          
          {/* Performance Summary */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                {excellentTrend?.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                {excellentTrend?.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                {excellentTrend?.trend === 'stable' && <Minus className="w-3 h-3 text-gray-500" />}
              </div>
              <p className="text-2xl font-bold text-green-600">
                {excellentAgents.length}
              </p>
              <p className="text-xs text-muted-foreground">Excellent (90%+)</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-4 h-4 text-yellow-500" />
                {goodTrend?.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                {goodTrend?.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                {goodTrend?.trend === 'stable' && <Minus className="w-3 h-3 text-gray-500" />}
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                {goodAgents.length}
              </p>
              <p className="text-xs text-muted-foreground">Good (70-90%)</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <XCircle className="w-4 h-4 text-red-500" />
                {attentionTrend?.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                {attentionTrend?.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                {attentionTrend?.trend === 'stable' && <Minus className="w-3 h-3 text-gray-500" />}
              </div>
              <p className="text-2xl font-bold text-red-600">
                {needsAttentionAgents.length}
              </p>
              <p className="text-xs text-muted-foreground">Needs Attention (&lt;70%)</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {chartData.length > 0 ? (
            <div className="space-y-6">
              {/* Donut Chart */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                style={{ width: '100%', height: '300px' }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={showPercentages ? CustomLabel : false}
                      outerRadius={80}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="successRate"
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke={selectedAgent === entry.agentId ? '#000' : 'none'}
                          strokeWidth={selectedAgent === entry.agentId ? 2 : 0}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Legend below chart, contained to avoid overlay */}
              <div className="mt-6 max-h-64 overflow-y-auto pr-1">
                <CustomLegend items={chartData} />
              </div>
              
              {/* Overall Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-center p-4 bg-muted/20 rounded-lg"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span className="text-lg font-semibold text-foreground">
                    Overall Success Rate
                  </span>
                </div>
                <p className="text-3xl font-bold text-blue-600 mb-1">
                  {weightedSuccessRate.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">
                  Across {data.length} agents • {totalRuns} total runs
                </p>
              </motion.div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No agent runs data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};