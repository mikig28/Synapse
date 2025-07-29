/**
 * Data Table View Component
 * Accessible alternative representations for charts and data visualizations
 * WCAG 2.1 AA Compliant
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAccessibilityContext } from '@/contexts/AccessibilityContext';
import { ChartDescription } from './DescriptiveText';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Eye,
  EyeOff,
  Filter,
  Search,
  Calendar,
  Hash,
  Percent,
} from 'lucide-react';

interface DataPoint {
  label: string;
  value: number | string;
  trend?: 'up' | 'down' | 'stable';
  percentage?: number;
  category?: string;
  description?: string;
  metadata?: Record<string, any>;
}

interface Column {
  key: string;
  label: string;
  type: 'text' | 'number' | 'percentage' | 'trend' | 'date' | 'status';
  sortable?: boolean;
  description?: string;
  format?: (value: any) => string;
}

interface DataTableViewProps {
  title: string;
  description?: string;
  data: DataPoint[];
  columns?: Column[];
  summary?: string;
  trends?: string[];
  showChart?: boolean;
  onExport?: (data: DataPoint[]) => void;
  className?: string;
}

export const DataTableView: React.FC<DataTableViewProps> = ({
  title,
  description,
  data,
  columns,
  summary,
  trends = [],
  showChart = false,
  onExport,
  className
}) => {
  const { settings, screenReader } = useAccessibilityContext();
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showDescription, setShowDescription] = useState(true);
  const [filter, setFilter] = useState('');

  // Default columns if not provided
  const defaultColumns: Column[] = [
    { key: 'label', label: 'Item', type: 'text', sortable: true },
    { key: 'value', label: 'Value', type: 'number', sortable: true },
    ...(data.some(d => d.trend) ? [{ key: 'trend', label: 'Trend', type: 'trend', sortable: true }] : []),
    ...(data.some(d => d.percentage !== undefined) ? [{ key: 'percentage', label: 'Percentage', type: 'percentage', sortable: true }] : []),
  ];

  const tableColumns = columns || defaultColumns;

  // Sort and filter data
  const processedData = React.useMemo(() => {
    let filteredData = data;

    // Apply filter
    if (filter) {
      filteredData = data.filter(item =>
        item.label.toLowerCase().includes(filter.toLowerCase()) ||
        item.value.toString().toLowerCase().includes(filter.toLowerCase()) ||
        item.category?.toLowerCase().includes(filter.toLowerCase())
      );
    }

    // Apply sorting
    if (sortColumn) {
      filteredData = [...filteredData].sort((a, b) => {
        const aValue = (a as any)[sortColumn];
        const bValue = (b as any)[sortColumn];

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }

        const aStr = String(aValue || '');
        const bStr = String(bValue || '');
        const comparison = aStr.localeCompare(bStr);
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filteredData;
  }, [data, filter, sortColumn, sortDirection]);

  // Handle sorting
  const handleSort = useCallback((columnKey: string) => {
    const column = tableColumns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }

    // Announce sort change
    if (settings.announceActions) {
      const direction = sortColumn === columnKey && sortDirection === 'asc' ? 'descending' : 'ascending';
      screenReader.announce(`Table sorted by ${column?.label || columnKey} in ${direction} order`);
    }
  }, [sortColumn, sortDirection, tableColumns, settings.announceActions, screenReader]);

  // Format cell value
  const formatCellValue = useCallback((value: any, column: Column): string => {
    if (column.format) {
      return column.format(value);
    }

    switch (column.type) {
      case 'percentage':
        return typeof value === 'number' ? `${value.toFixed(1)}%` : `${value}%`;
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : String(value);
      case 'trend':
        return value === 'up' ? 'Increasing' : value === 'down' ? 'Decreasing' : 'Stable';
      default:
        return String(value || '');
    }
  }, []);

  // Get cell content with icons
  const getCellContent = useCallback((value: any, column: Column, item: DataPoint) => {
    const formattedValue = formatCellValue(value, column);

    if (column.type === 'trend' && value) {
      const TrendIcon = value === 'up' ? TrendingUp : value === 'down' ? TrendingDown : ArrowUpDown;
      const colorClass = value === 'up' ? 'text-green-600' : value === 'down' ? 'text-red-600' : 'text-gray-600';
      
      return (
        <div className="flex items-center gap-2">
          <TrendIcon 
            className={cn('w-4 h-4', colorClass)} 
            aria-hidden="true"
          />
          <span>{formattedValue}</span>
        </div>
      );
    }

    if (column.type === 'percentage' && typeof value === 'number') {
      const colorClass = value >= 80 ? 'text-green-600' : value >= 60 ? 'text-yellow-600' : 'text-red-600';
      return <span className={colorClass}>{formattedValue}</span>;
    }

    return formattedValue;
  }, [formatCellValue]);

  // Export data
  const handleExport = useCallback(() => {
    if (onExport) {
      onExport(processedData);
    } else {
      // Default CSV export
      const headers = tableColumns.map(col => col.label).join(',');
      const rows = processedData.map(item => 
        tableColumns.map(col => {
          const value = (item as any)[col.key];
          return formatCellValue(value, col);
        }).join(',')
      ).join('\n');
      
      const csv = `${headers}\n${rows}`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-data.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }

    screenReader.announceSuccess('Data exported successfully');
  }, [processedData, tableColumns, formatCellValue, title, onExport, screenReader]);

  // Toggle description visibility
  const toggleDescription = useCallback(() => {
    setShowDescription(prev => !prev);
    screenReader.announce(
      showDescription ? 'Chart description hidden' : 'Chart description shown',
      'polite'
    );
  }, [showDescription, screenReader]);

  const tableId = React.useId();
  const descriptionId = `${tableId}-description`;
  const summaryId = `${tableId}-summary`;

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle 
              id={`${tableId}-title`}
              className="flex items-center gap-2"
            >
              <BarChart3 className="w-5 h-5" aria-hidden="true" />
              {title}
            </CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(description || summary || trends.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleDescription}
                aria-pressed={showDescription}
                aria-label={`${showDescription ? 'Hide' : 'Show'} chart description`}
              >
                {showDescription ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              aria-label="Export data as CSV"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search/Filter */}
        {data.length > 5 && (
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter data..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-8 pr-3 py-2 w-full text-sm border border-input rounded-md bg-background"
                aria-label="Filter table data"
              />
            </div>
            {filter && (
              <Badge variant="secondary">
                {processedData.length} of {data.length} items
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Chart Description */}
        <AnimatePresence>
          {showDescription && (description || summary || trends.length > 0) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <ChartDescription
                title={title}
                summary={summary || description || ''}
                data={data.map(item => ({
                  label: item.label,
                  value: item.value,
                  description: item.description
                }))}
                trends={trends}
                visuallyHidden={false}
                className="mb-4 p-4 bg-muted/50 rounded-lg"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Data Table */}
        <div className="rounded-md border">
          <Table
            id={tableId}
            aria-labelledby={`${tableId}-title`}
            aria-describedby={showDescription ? descriptionId : undefined}
          >
            <TableHeader>
              <TableRow>
                {tableColumns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      column.sortable && 'cursor-pointer hover:bg-muted/50',
                      column.type === 'number' || column.type === 'percentage' ? 'text-right' : 'text-left'
                    )}
                    onClick={() => column.sortable && handleSort(column.key)}
                    aria-sort={
                      sortColumn === column.key
                        ? sortDirection === 'asc' ? 'ascending' : 'descending'
                        : column.sortable ? 'none' : undefined
                    }
                    title={column.description}
                  >
                    <div className="flex items-center gap-2">
                      <span>{column.label}</span>
                      {column.sortable && (
                        <ArrowUpDown className="w-4 h-4 opacity-50" aria-hidden="true" />
                      )}
                      {column.type === 'percentage' && (
                        <Percent className="w-3 h-3 opacity-50" aria-hidden="true" />
                      )}
                      {column.type === 'number' && (
                        <Hash className="w-3 h-3 opacity-50" aria-hidden="true" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedData.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={tableColumns.length} 
                    className="text-center py-8 text-muted-foreground"
                  >
                    {filter ? 'No matching data found' : 'No data available'}
                  </TableCell>
                </TableRow>
              ) : (
                processedData.map((item, index) => (
                  <TableRow key={`${item.label}-${index}`}>
                    {tableColumns.map((column) => {
                      const value = (item as any)[column.key];
                      return (
                        <TableCell
                          key={column.key}
                          className={cn(
                            column.type === 'number' || column.type === 'percentage' ? 'text-right' : 'text-left'
                          )}
                        >
                          {getCellContent(value, column, item)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Summary */}
        {processedData.length > 0 && (
          <div 
            id={summaryId}
            className="text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            Showing {processedData.length} {processedData.length === 1 ? 'item' : 'items'}
            {filter && ` (filtered from ${data.length} total)`}
            {sortColumn && (
              <span>
                {', sorted by '}
                {tableColumns.find(col => col.key === sortColumn)?.label || sortColumn}
                {' in '}
                {sortDirection === 'asc' ? 'ascending' : 'descending'}
                {' order'}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Chart Alternative Component
 * Provides both visual chart and accessible table representation
 */
interface ChartAlternativeProps {
  title: string;
  chartComponent: React.ReactNode;
  data: DataPoint[];
  description?: string;
  summary?: string;
  trends?: string[];
  defaultView?: 'chart' | 'table';
  className?: string;
}

export const ChartAlternative: React.FC<ChartAlternativeProps> = ({
  title,
  chartComponent,
  data,
  description,
  summary,
  trends,
  defaultView = 'chart',
  className
}) => {
  const [currentView, setCurrentView] = useState<'chart' | 'table'>(defaultView);
  const { settings, screenReader } = useAccessibilityContext();

  const switchView = useCallback((view: 'chart' | 'table') => {
    setCurrentView(view);
    screenReader.announce(
      `Switched to ${view} view for ${title}`,
      'polite'
    );
  }, [title, screenReader]);

  return (
    <div className={cn('w-full', className)}>
      {/* View Toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div 
          className="flex rounded-lg border"
          role="tablist"
          aria-label="Chart view options"
        >
          <Button
            variant={currentView === 'chart' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => switchView('chart')}
            role="tab"
            aria-selected={currentView === 'chart'}
            aria-controls="chart-content"
            className="rounded-r-none"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Chart
          </Button>
          <Button
            variant={currentView === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => switchView('table')}
            role="tab"
            aria-selected={currentView === 'table'}
            aria-controls="table-content"
            className="rounded-l-none"
          >
            <Hash className="w-4 h-4 mr-2" />
            Table
          </Button>
        </div>
      </div>

      {/* Content */}
      <div id="chart-content" role="tabpanel" hidden={currentView !== 'chart'}>
        {currentView === 'chart' && chartComponent}
      </div>
      
      <div id="table-content" role="tabpanel" hidden={currentView !== 'table'}>
        {currentView === 'table' && (
          <DataTableView
            title={title}
            description={description}
            data={data}
            summary={summary}
            trends={trends}
            showChart={false}
          />
        )}
      </div>
    </div>
  );
};

export default DataTableView;