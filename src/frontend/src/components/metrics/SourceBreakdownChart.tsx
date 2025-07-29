import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cardVariants } from '@/utils/animations';
import { 
  PieChart as PieChartIcon, 
  Download, 
  Filter,
  TrendingUp,
  Globe,
  Twitter,
  Newspaper,
  Zap,
  Bot
} from 'lucide-react';

interface SourceBreakdownData {
  source: string;
  count: number;
  percentage: number;
  color: string;
}

interface SourceBreakdownChartProps {
  data: SourceBreakdownData[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/95 backdrop-blur-sm border border-border/50 rounded-lg p-4 shadow-lg"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <span className="font-medium text-foreground">{data.source}</span>
          </div>
          
          <div className="space-y-1 text-sm">
            <div className="flex justify-between items-center gap-4">
              <span className="text-muted-foreground">Items:</span>
              <span className="font-medium text-foreground">
                {data.count.toLocaleString()}
              </span>
            </div>
            
            <div className="flex justify-between items-center gap-4">
              <span className="text-muted-foreground">Percentage:</span>
              <span className="font-medium text-foreground">
                {data.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
  return null;
};

export const SourceBreakdownChart: React.FC<SourceBreakdownChartProps> = ({ data }) => {
  const [sortBy, setSortBy] = useState<'count' | 'percentage'>('count');
  const [showPercentages, setShowPercentages] = useState(false);

  // Sort data based on selected criteria
  const sortedData = [...data].sort((a, b) => b[sortBy] - a[sortBy]);

  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'twitter':
        return <Twitter className="w-4 h-4" />;
      case 'news':
        return <Newspaper className="w-4 h-4" />;
      case 'crewai':
        return <Zap className="w-4 h-4" />;
      case 'custom':
        return <Bot className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getSourceDescription = (source: string) => {
    switch (source.toLowerCase()) {
      case 'twitter':
        return 'Social media content from Twitter/X platform';
      case 'news':
        return 'News articles and journalism content';
      case 'crewai':
        return 'Multi-agent CrewAI system outputs';
      case 'custom':
        return 'Custom agent configurations and sources';
      default:
        return 'Other content sources';
    }
  };

  // Calculate total items
  const totalItems = data.reduce((sum, item) => sum + item.count, 0);

  // Calculate growth trends (mock data - in real app this would come from historical data)
  const getTrendData = (source: string) => {
    const mockGrowth = Math.random() * 40 - 20; // -20% to +20%
    return {
      growth: mockGrowth,
      isPositive: mockGrowth > 0,
      isSignificant: Math.abs(mockGrowth) > 5
    };
  };

  const handleExport = () => {
    // In a real app, this would export the data
    console.log('Exporting source breakdown data:', data);
  };

  return (
    <motion.div variants={cardVariants}>
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <PieChartIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Content Source Analysis</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Distribution of content across different sources
                </p>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted/50 rounded-lg p-1">
                <Button
                  variant={sortBy === 'count' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSortBy('count')}
                  className="h-7 px-3 text-xs"
                >
                  Count
                </Button>
                <Button
                  variant={sortBy === 'percentage' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSortBy('percentage')}
                  className="h-7 px-3 text-xs"
                >
                  %
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPercentages(!showPercentages)}
                className="h-7 px-3 text-xs"
              >
                <Filter className="w-3 h-3 mr-1" />
                {showPercentages ? 'Values' : 'Percent'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="h-7 px-3 text-xs"
              >
                <Download className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          {/* Summary Stats */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50/50 border-blue-200">
                Total Items: {totalItems.toLocaleString()}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50/50 border-green-200">
                Active Sources: {data.filter(d => d.count > 0).length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-purple-50/50 border-purple-200">
                Top Source: {sortedData[0]?.source || 'None'} ({sortedData[0]?.percentage.toFixed(1) || 0}%)
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {data.length > 0 ? (
            <div className="space-y-6">
              {/* Bar Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{ width: '100%', height: '300px' }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sortedData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="#e2e8f0" 
                      strokeOpacity={0.5}
                    />
                    <XAxis
                      dataKey="source"
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
                      tickFormatter={(value) => 
                        showPercentages ? `${value}%` : value.toLocaleString()
                      }
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey={showPercentages ? "percentage" : "count"}
                      radius={[4, 4, 0, 0]}
                    >
                      {sortedData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
              
              {/* Detailed Source List */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="space-y-3"
              >
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Source Details
                </h4>
                
                {sortedData.map((source, index) => {
                  const trend = getTrendData(source.source);
                  
                  return (
                    <motion.div
                      key={source.source}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${source.color}20` }}
                        >
                          <div style={{ color: source.color }}>
                            {getSourceIcon(source.source)}
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground">
                              {source.source}
                            </span>
                            {trend.isSignificant && (
                              <div className="flex items-center gap-1">
                                <TrendingUp 
                                  className={`w-3 h-3 ${
                                    trend.isPositive ? 'text-green-500' : 'text-red-500 rotate-180'
                                  }`} 
                                />
                                <span 
                                  className={`text-xs font-medium ${
                                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                                  }`}
                                >
                                  {trend.isPositive ? '+' : ''}{trend.growth.toFixed(1)}%
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {getSourceDescription(source.source)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">
                          {source.count.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {source.percentage.toFixed(1)}% of total
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
              
              {/* Distribution Visualization */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-6 p-4 bg-muted/20 rounded-lg"
              >
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Distribution Overview
                </h4>
                
                <div className="space-y-2">
                  {sortedData.map((source, index) => (
                    <div key={source.source} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16">
                        {source.source}
                      </span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${source.percentage}%` }}
                          transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: source.color }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground w-12 text-right">
                        {source.percentage.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="text-center py-12">
              <PieChartIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No source data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};