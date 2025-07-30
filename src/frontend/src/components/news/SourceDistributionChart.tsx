import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  PieChart,
  BarChart3,
  FileText,
  MessageSquare,
  Briefcase,
  Newspaper,
  Globe,
  TrendingUp,
  Eye,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SourceData {
  type: string;
  name: string;
  count: number;
  percentage: number;
  items?: string[];
  icon?: React.ReactNode;
  color?: string;
  description?: string;
}

interface SourceDistributionChartProps {
  sources: SourceData[];
  className?: string;
  animated?: boolean;
  interactive?: boolean;
  showLabels?: boolean;
  viewMode?: 'pie' | 'bar' | 'grid';
  onSourceClick?: (source: SourceData) => void;
}

const SourceDistributionChart: React.FC<SourceDistributionChartProps> = ({
  sources,
  className,
  animated = true,
  interactive = true,
  showLabels = true,
  viewMode: initialViewMode = 'pie',
  onSourceClick
}) => {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'pie' | 'bar' | 'grid'>(initialViewMode);
  const [hoveredSource, setHoveredSource] = useState<string | null>(null);

  // Predefined colors for different source types
  const sourceColors = {
    'reddit': '#FF4500',
    'linkedin': '#0077B5',
    'telegram': '#0088CC',
    'news': '#4CAF50',
    'twitter': '#1DA1F2',
    'facebook': '#1877F2',
    'default': '#6B7280'
  };

  // Get source icon based on type
  const getSourceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'reddit':
      case 'reddit posts':
        return <div className="text-orange-500">🔴</div>;
      case 'linkedin':
      case 'linkedin posts':
        return <Briefcase className="w-4 h-4 text-blue-600" />;
      case 'telegram':
      case 'telegram messages':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'news':
      case 'news articles':
        return <Newspaper className="w-4 h-4 text-green-600" />;
      case 'twitter':
        return <div className="text-sky-500">🐦</div>;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get color for source type
  const getSourceColor = (type: string): string => {
    const key = type.toLowerCase().replace(/\s+/g, '').replace(/posts|messages|articles/g, '');
    return sourceColors[key as keyof typeof sourceColors] || sourceColors.default;
  };

  // Process sources with enhanced data
  const processedSources = sources.map(source => ({
    ...source,
    icon: getSourceIcon(source.type),
    color: source.color || getSourceColor(source.type),
    description: source.description || `${source.count} items from ${source.name}`
  }));

  // Calculate total for percentages
  const totalItems = processedSources.reduce((sum, source) => sum + source.count, 0);

  // Handle source click
  const handleSourceClick = (source: SourceData) => {
    if (!interactive) return;
    
    setSelectedSource(selectedSource === source.type ? null : source.type);
    onSourceClick?.(source);
  };

  // Pie Chart Component
  const PieChartView = () => {
    const centerX = 120;
    const centerY = 120;
    const radius = 80;
    let currentAngle = 0;

    return (
      <div className="flex flex-col lg:flex-row items-center gap-6">
        {/* SVG Pie Chart */}
        <div className="relative">
          <svg width="240" height="240" className="transform -rotate-90">
            <AnimatePresence>
              {processedSources.map((source, index) => {
                const angle = (source.count / totalItems) * 360;
                const startAngle = currentAngle;
                const endAngle = currentAngle + angle;
                
                const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
                const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
                const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
                const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
                
                const largeArcFlag = angle > 180 ? 1 : 0;
                const pathData = [
                  `M ${centerX} ${centerY}`,
                  `L ${x1} ${y1}`,
                  `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                  'Z'
                ].join(' ');

                currentAngle += angle;

                const isSelected = selectedSource === source.type;
                const isHovered = hoveredSource === source.type;

                return (
                  <motion.path
                    key={source.type}
                    d={pathData}
                    fill={source.color}
                    stroke="white"
                    strokeWidth="2"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                      opacity: 1, 
                      scale: isSelected || isHovered ? 1.05 : 1,
                      filter: isSelected ? 'brightness(1.1)' : 'brightness(1)'
                    }}
                    transition={{ 
                      delay: animated ? index * 0.1 : 0,
                      type: 'spring',
                      stiffness: 100
                    }}
                    className={cn(
                      "transition-all duration-200",
                      interactive && "cursor-pointer hover:brightness-110"
                    )}
                    onClick={() => handleSourceClick(source)}
                    onMouseEnter={() => setHoveredSource(source.type)}
                    onMouseLeave={() => setHoveredSource(null)}
                  />
                );
              })}
            </AnimatePresence>
            
            {/* Center circle */}
            <circle
              cx={centerX}
              cy={centerY}
              r="30"
              fill="white"
              stroke="#e5e7eb"
              strokeWidth="2"
            />
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-gray-900">{totalItems}</span>
            <span className="text-xs text-gray-500">Total Items</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2 min-w-[200px]">
          {processedSources.map((source, index) => {
            const isSelected = selectedSource === source.type;
            
            return (
              <motion.div
                key={source.type}
                initial={animated ? { opacity: 0, x: 20 } : {}}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: animated ? index * 0.1 : 0 }}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg transition-all duration-200",
                  interactive && "cursor-pointer hover:bg-muted/50",
                  isSelected && "bg-muted/80 shadow-sm"
                )}
                onClick={() => handleSourceClick(source)}
                onMouseEnter={() => setHoveredSource(source.type)}
                onMouseLeave={() => setHoveredSource(null)}
              >
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: source.color }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {source.icon}
                    <span className="font-medium text-sm">{source.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{source.count} items</span>
                    <span>•</span>
                    <span>{source.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  // Bar Chart Component
  const BarChartView = () => {
    const maxCount = Math.max(...processedSources.map(s => s.count));

    return (
      <div className="space-y-4">
        {processedSources.map((source, index) => {
          const widthPercentage = (source.count / maxCount) * 100;
          const isSelected = selectedSource === source.type;

          return (
            <motion.div
              key={source.type}
              initial={animated ? { opacity: 0, x: -20 } : {}}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: animated ? index * 0.1 : 0 }}
              className={cn(
                "p-3 rounded-lg border-2 transition-all duration-200",
                interactive && "cursor-pointer hover:shadow-md",
                isSelected ? "border-blue-500 bg-blue-50/50" : "border-transparent bg-muted/30"
              )}
              onClick={() => handleSourceClick(source)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {source.icon}
                  <span className="font-medium">{source.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{source.count}</span>
                  <Badge variant="secondary" className="text-xs">
                    {source.percentage.toFixed(1)}%
                  </Badge>
                </div>
              </div>
              
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: source.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercentage}%` }}
                    transition={{ 
                      duration: animated ? 1 : 0,
                      delay: animated ? index * 0.1 : 0,
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

  // Grid View Component
  const GridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {processedSources.map((source, index) => {
        const isSelected = selectedSource === source.type;

        return (
          <motion.div
            key={source.type}
            initial={animated ? { opacity: 0, scale: 0.9 } : {}}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: animated ? index * 0.1 : 0 }}
            className={cn(
              "p-4 rounded-lg border-2 transition-all duration-200 text-center",
              interactive && "cursor-pointer hover:shadow-md hover:scale-105",
              isSelected ? "border-blue-500 bg-blue-50/50" : "border-gray-200 bg-white"
            )}
            onClick={() => handleSourceClick(source)}
          >
            <div className="flex flex-col items-center gap-2">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-lg"
                style={{ backgroundColor: source.color }}
              >
                <div className="text-white">
                  {source.icon}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-sm">{source.name}</h3>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-xl font-bold">{source.count}</span>
                  <Badge variant="secondary" className="text-xs">
                    {source.percentage.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="w-5 h-5 text-blue-500" />
            Content Sources
            <Badge variant="secondary" className="ml-2">
              {processedSources.length} sources
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'pie' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('pie')}
              className="h-8"
            >
              <PieChart className="w-3 h-3 mr-1" />
              Pie
            </Button>
            <Button
              variant={viewMode === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('bar')}
              className="h-8"
            >
              <BarChart3 className="w-3 h-3 mr-1" />
              Bar
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8"
            >
              <Users className="w-3 h-3 mr-1" />
              Grid
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
            {viewMode === 'pie' && <PieChartView />}
            {viewMode === 'bar' && <BarChartView />}
            {viewMode === 'grid' && <GridView />}
          </motion.div>
        </AnimatePresence>

        {/* Selected source details */}
        <AnimatePresence>
          {selectedSource && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 p-4 bg-muted/50 rounded-lg border"
            >
              {(() => {
                const source = processedSources.find(s => s.type === selectedSource);
                if (!source) return null;

                return (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      {source.icon}
                      {source.name} Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Items:</span>
                        <span className="ml-2 font-medium">{source.count}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Percentage:</span>
                        <span className="ml-2 font-medium">{source.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    {source.items && source.items.length > 0 && (
                      <div className="mt-3">
                        <span className="text-muted-foreground text-sm">Sample items:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {source.items.slice(0, 5).map((item, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                          {source.items.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{source.items.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {processedSources.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No content sources found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SourceDistributionChart;