import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cardVariants } from '@/utils/animations';
import { 
  Activity, 
  Clock, 
  TrendingUp,
  BarChart3,
  LineChart as LineChartIcon
} from 'lucide-react';
import { format } from 'date-fns';

interface ActivityTimelineData {
  timestamp: string;
  twitter: number;
  news: number;
  crewai: number;
  custom: number;
  total: number;
}

interface ActivityTimelineChartProps {
  data: ActivityTimelineData[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const timestamp = new Date(label as string);
    const timeStr = format(timestamp, 'MMM dd, HH:mm');
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/95 backdrop-blur-sm border border-border/50 rounded-lg p-4 shadow-lg"
      >
        <p className="text-sm font-medium text-foreground mb-2">{timeStr}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="capitalize text-muted-foreground min-w-[60px]">
                {entry.dataKey}:
              </span>
              <span className="font-medium text-foreground">
                {entry.value} items
              </span>
            </div>
          ))}
          <div className="border-t border-border/30 pt-1 mt-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="text-muted-foreground min-w-[60px]">Total:</span>
              <span className="font-bold text-foreground">
                {payload.reduce((sum, entry) => sum + entry.value, 0)} items
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
  return null;
};

const CustomLegend: React.FC<{ payload?: any[] }> = ({ payload }) => {
  if (!payload) return null;
  
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
      {payload.map((entry, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-2"
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-muted-foreground capitalize">
            {entry.value} Agent{entry.value !== 'custom' ? 's' : ''}
          </span>
        </motion.div>
      ))}
    </div>
  );
};

export const ActivityTimelineChart: React.FC<ActivityTimelineChartProps> = ({ data }) => {
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [timeRange, setTimeRange] = useState<'24h' | '12h' | '6h'>('24h');

  // Filter data based on time range
  const getFilteredData = () => {
    const now = new Date();
    let hoursBack = 24;
    
    switch (timeRange) {
      case '12h':
        hoursBack = 12;
        break;
      case '6h':
        hoursBack = 6;
        break;
      default:
        hoursBack = 24;
    }
    
    const cutoffTime = new Date(now.getTime() - (hoursBack * 60 * 60 * 1000));
    return data.filter(item => new Date(item.timestamp) >= cutoffTime);
  };

  const filteredData = getFilteredData();
  
  // Calculate summary stats
  const totalActivity = filteredData.reduce((sum, item) => sum + item.total, 0);
  const avgActivity = filteredData.length > 0 ? totalActivity / filteredData.length : 0;
  const peakActivity = Math.max(...filteredData.map(item => item.total));
  const peakTime = filteredData.find(item => item.total === peakActivity);

  // Chart configuration
  const chartColors = {
    twitter: '#1DA1F2',
    news: '#FF6B35',
    crewai: '#8B5CF6',
    custom: '#10B981'
  };

  const formatXAxisLabel = (tickItem: string) => {
    const date = new Date(tickItem);
    return format(date, 'HH:mm');
  };

  const ChartComponent = chartType === 'area' ? AreaChart : LineChart;

  return (
    <motion.div variants={cardVariants}>
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Agent Activity Timeline</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Real-time activity across all agent types
                </p>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Time Range Selector */}
              <div className="flex items-center bg-muted/50 rounded-lg p-1">
                {(['6h', '12h', '24h'] as const).map((range) => (
                  <Button
                    key={range}
                    variant={timeRange === range ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTimeRange(range)}
                    className="h-7 px-3 text-xs"
                  >
                    {range}
                  </Button>
                ))}
              </div>
              
              {/* Chart Type Toggle */}
              <div className="flex items-center bg-muted/50 rounded-lg p-1">
                <Button
                  variant={chartType === 'area' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setChartType('area')}
                  className="h-7 px-2"
                >
                  <BarChart3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={chartType === 'line' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setChartType('line')}
                  className="h-7 px-2"
                >
                  <LineChartIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Summary Stats */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50/50 border-blue-200">
                Total: {totalActivity} items
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50/50 border-green-200">
                Avg: {avgActivity.toFixed(1)}/hour
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-purple-50/50 border-purple-200">
                Peak: {peakActivity} items
                {peakTime && (
                  <span className="ml-1 text-xs">
                    @ {format(new Date(peakTime.timestamp), 'HH:mm')}
                  </span>
                )}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ width: '100%', height: '300px' }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ChartComponent
                data={filteredData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#e2e8f0" 
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatXAxisLabel}
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend />} />
                
                {chartType === 'area' ? (
                  <>
                    <Area
                      type="monotone"
                      dataKey="twitter"
                      stackId="1"
                      stroke={chartColors.twitter}
                      fill={chartColors.twitter}
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="news"
                      stackId="1"
                      stroke={chartColors.news}
                      fill={chartColors.news}
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="crewai"
                      stackId="1"
                      stroke={chartColors.crewai}
                      fill={chartColors.crewai}
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="custom"
                      stackId="1"
                      stroke={chartColors.custom}
                      fill={chartColors.custom}
                      fillOpacity={0.6}
                    />
                  </>
                ) : (
                  <>
                    <Line
                      type="monotone"
                      dataKey="twitter"
                      stroke={chartColors.twitter}
                      strokeWidth={2}
                      dot={{ fill: chartColors.twitter, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: chartColors.twitter, strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="news"
                      stroke={chartColors.news}
                      strokeWidth={2}
                      dot={{ fill: chartColors.news, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: chartColors.news, strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="crewai"
                      stroke={chartColors.crewai}
                      strokeWidth={2}
                      dot={{ fill: chartColors.crewai, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: chartColors.crewai, strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="custom"
                      stroke={chartColors.custom}
                      strokeWidth={2}
                      dot={{ fill: chartColors.custom, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: chartColors.custom, strokeWidth: 2 }}
                    />
                  </>
                )}
              </ChartComponent>
            </ResponsiveContainer>
          </motion.div>
          
          {/* Additional insights */}
          {filteredData.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-4 pt-4 border-t border-border/30"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Last updated: {format(new Date(), 'HH:mm:ss')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>{filteredData.length} data points</span>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};