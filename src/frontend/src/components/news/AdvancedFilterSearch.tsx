import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  TrendingUp,
  Users,
  Heart,
  Tag,
  BarChart3,
  Zap,
  Eye,
  Star,
  SlidersHorizontal,
  RefreshCw,
  Download,
  BookOpen,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterOption {
  id: string;
  label: string;
  count?: number;
  color?: string;
}

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface SearchFilters {
  query: string;
  dateRange: DateRange;
  sources: string[];
  topics: string[];
  sentiment: string[];
  readingTime: [number, number];
  confidence: [number, number];
  sortBy: 'date' | 'relevance' | 'confidence' | 'reading_time';
  sortOrder: 'asc' | 'desc';
  showRead: boolean;
  showBookmarked: boolean;
}

interface ReportItem {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  source: string;
  topics: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  readingTime: number;
  isRead: boolean;
  isBookmarked: boolean;
  views: number;
  interactions: number;
}

interface AdvancedFilterSearchProps {
  reports: ReportItem[];
  onFiltersChange?: (filters: SearchFilters, filteredReports: ReportItem[]) => void;
  className?: string;
  defaultExpanded?: boolean;
}

const AdvancedFilterSearch: React.FC<AdvancedFilterSearchProps> = ({
  reports,
  onFiltersChange,
  className,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    dateRange: { start: null, end: null },
    sources: [],
    topics: [],
    sentiment: [],
    readingTime: [0, 60],
    confidence: [0, 100],
    sortBy: 'date',
    sortOrder: 'desc',
    showRead: true,
    showBookmarked: false
  });

  // Extract unique values for filter options
  const filterOptions = useMemo(() => {
    const sources = [...new Set(reports.map(r => r.source))].map(source => ({
      id: source,
      label: source,
      count: reports.filter(r => r.source === source).length
    }));

    const topics = [...new Set(reports.flatMap(r => r.topics))].map(topic => ({
      id: topic,
      label: topic,
      count: reports.filter(r => r.topics.includes(topic)).length
    }));

    const sentiments: FilterOption[] = [
      { 
        id: 'positive', 
        label: 'Positive', 
        count: reports.filter(r => r.sentiment === 'positive').length,
        color: 'bg-green-100 text-green-700 border-green-300'
      },
      { 
        id: 'neutral', 
        label: 'Neutral', 
        count: reports.filter(r => r.sentiment === 'neutral').length,
        color: 'bg-gray-100 text-gray-700 border-gray-300'
      },
      { 
        id: 'negative', 
        label: 'Negative', 
        count: reports.filter(r => r.sentiment === 'negative').length,
        color: 'bg-red-100 text-red-700 border-red-300'
      }
    ];

    return { sources, topics, sentiments };
  }, [reports]);

  // Apply filters to reports
  const filteredReports = useMemo(() => {
    let filtered = [...reports];

    // Text search
    if (filters.query.trim()) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(report => 
        report.title.toLowerCase().includes(query) ||
        report.content.toLowerCase().includes(query) ||
        report.topics.some(topic => topic.toLowerCase().includes(query))
      );
    }

    // Date range
    if (filters.dateRange.start || filters.dateRange.end) {
      filtered = filtered.filter(report => {
        const reportDate = new Date(report.publishedAt);
        if (filters.dateRange.start && reportDate < filters.dateRange.start) return false;
        if (filters.dateRange.end && reportDate > filters.dateRange.end) return false;
        return true;
      });
    }

    // Sources
    if (filters.sources.length > 0) {
      filtered = filtered.filter(report => filters.sources.includes(report.source));
    }

    // Topics
    if (filters.topics.length > 0) {
      filtered = filtered.filter(report => 
        report.topics.some(topic => filters.topics.includes(topic))
      );
    }

    // Sentiment
    if (filters.sentiment.length > 0) {
      filtered = filtered.filter(report => filters.sentiment.includes(report.sentiment));
    }

    // Reading time range
    filtered = filtered.filter(report => 
      report.readingTime >= filters.readingTime[0] && 
      report.readingTime <= filters.readingTime[1]
    );

    // Confidence range
    filtered = filtered.filter(report => 
      report.confidence >= filters.confidence[0] && 
      report.confidence <= filters.confidence[1]
    );

    // Read status
    if (!filters.showRead) {
      filtered = filtered.filter(report => !report.isRead);
    }

    // Bookmarked status
    if (filters.showBookmarked) {
      filtered = filtered.filter(report => report.isBookmarked);
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'date':
          comparison = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
          break;
        case 'confidence':
          comparison = a.confidence - b.confidence;
          break;
        case 'reading_time':
          comparison = a.readingTime - b.readingTime;
          break;
        case 'relevance':
          // Simple relevance based on interactions and views
          const aRelevance = a.interactions * 2 + a.views;
          const bRelevance = b.interactions * 2 + b.views;
          comparison = aRelevance - bRelevance;
          break;
        default:
          comparison = 0;
      }

      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [reports, filters]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
  }, [filters]);

  // Reset all filters
  const resetFilters = () => {
    const defaultFilters: SearchFilters = {
      query: '',
      dateRange: { start: null, end: null },
      sources: [],
      topics: [],
      sentiment: [],
      readingTime: [0, 60],
      confidence: [0, 100],
      sortBy: 'date',
      sortOrder: 'desc',
      showRead: true,
      showBookmarked: false
    };
    setFilters(defaultFilters);
  };

  // Notify parent of changes
  useEffect(() => {
    onFiltersChange?.(filters, filteredReports);
  }, [filters, filteredReports, onFiltersChange]);

  // Toggle filter option
  const toggleFilterOption = (category: keyof Pick<SearchFilters, 'sources' | 'topics' | 'sentiment'>, optionId: string) => {
    const currentOptions = filters[category] as string[];
    const newOptions = currentOptions.includes(optionId)
      ? currentOptions.filter(id => id !== optionId)
      : [...currentOptions, optionId];
    
    updateFilters({ [category]: newOptions });
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.query.trim()) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.sources.length > 0) count++;
    if (filters.topics.length > 0) count++;
    if (filters.sentiment.length > 0) count++;
    if (filters.readingTime[0] > 0 || filters.readingTime[1] < 60) count++;
    if (filters.confidence[0] > 0 || filters.confidence[1] < 100) count++;
    if (!filters.showRead) count++;
    if (filters.showBookmarked) count++;
    return count;
  }, [filters]);

  // Filter section component
  const FilterSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
  }> = ({ title, icon, children }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search reports, topics, or content..."
                value={filters.query}
                onChange={(e) => updateFilters({ query: e.target.value })}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFiltersCount}
                </Badge>
              )}
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
          
          {/* Results summary */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {filteredReports.length} reports
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ~{Math.round(filteredReports.reduce((sum, r) => sum + r.readingTime, 0))} min total
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-') as [typeof filters.sortBy, typeof filters.sortOrder];
                  updateFilters({ sortBy, sortOrder });
                }}
                className="text-xs border rounded px-2 py-1 bg-background"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="relevance-desc">Most Relevant</option>
                <option value="confidence-desc">Highest Confidence</option>
                <option value="reading_time-asc">Shortest Read</option>
                <option value="reading_time-desc">Longest Read</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced filters panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Advanced Filters
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sources filter */}
                <FilterSection title="Sources" icon={<Users className="w-4 h-4" />}>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.sources.map(source => (
                      <Button
                        key={source.id}
                        variant={filters.sources.includes(source.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleFilterOption('sources', source.id)}
                        className="h-8 text-xs"
                      >
                        {source.label}
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {source.count}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </FilterSection>

                <Separator />

                {/* Topics filter */}
                <FilterSection title="Topics" icon={<Tag className="w-4 h-4" />}>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {filterOptions.topics.slice(0, 20).map(topic => (
                      <Button
                        key={topic.id}
                        variant={filters.topics.includes(topic.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleFilterOption('topics', topic.id)}
                        className="h-8 text-xs"
                      >
                        {topic.label}
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {topic.count}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </FilterSection>

                <Separator />

                {/* Sentiment filter */}
                <FilterSection title="Sentiment" icon={<Heart className="w-4 h-4" />}>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.sentiments.map(sentiment => (
                      <Button
                        key={sentiment.id}
                        variant={filters.sentiment.includes(sentiment.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleFilterOption('sentiment', sentiment.id)}
                        className={cn(
                          "h-8 text-xs",
                          filters.sentiment.includes(sentiment.id) && sentiment.color
                        )}
                      >
                        {sentiment.label}
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {sentiment.count}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </FilterSection>

                <Separator />

                {/* Range filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Reading time range */}
                  <FilterSection title="Reading Time (minutes)" icon={<Clock className="w-4 h-4" />}>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="60"
                          value={filters.readingTime[0]}
                          onChange={(e) => updateFilters({ 
                            readingTime: [parseInt(e.target.value) || 0, filters.readingTime[1]] 
                          })}
                          className="w-20 text-xs"
                        />
                        <span className="text-sm text-muted-foreground">to</span>
                        <Input
                          type="number"
                          min="0"
                          max="60"
                          value={filters.readingTime[1]}
                          onChange={(e) => updateFilters({ 
                            readingTime: [filters.readingTime[0], parseInt(e.target.value) || 60] 
                          })}
                          className="w-20 text-xs"
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                      </div>
                    </div>
                  </FilterSection>

                  {/* Confidence range */}
                  <FilterSection title="Confidence %" icon={<BarChart3 className="w-4 h-4" />}>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={filters.confidence[0]}
                          onChange={(e) => updateFilters({ 
                            confidence: [parseInt(e.target.value) || 0, filters.confidence[1]] 
                          })}
                          className="w-20 text-xs"
                        />
                        <span className="text-sm text-muted-foreground">to</span>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={filters.confidence[1]}
                          onChange={(e) => updateFilters({ 
                            confidence: [filters.confidence[0], parseInt(e.target.value) || 100] 
                          })}
                          className="w-20 text-xs"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  </FilterSection>
                </div>

                <Separator />

                {/* Toggle filters */}
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.showRead}
                      onChange={(e) => updateFilters({ showRead: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Show read reports</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.showBookmarked}
                      onChange={(e) => updateFilters({ showBookmarked: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Bookmarked only</span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filters display */}
      {activeFiltersCount > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">Active filters:</span>
              {filters.query && (
                <Badge variant="secondary" className="gap-1">
                  Query: {filters.query}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => updateFilters({ query: '' })} 
                  />
                </Badge>
              )}
              {filters.sources.map(source => (
                <Badge key={source} variant="secondary" className="gap-1">
                  {source}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => toggleFilterOption('sources', source)} 
                  />
                </Badge>
              ))}
              {filters.topics.map(topic => (
                <Badge key={topic} variant="secondary" className="gap-1">
                  {topic}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => toggleFilterOption('topics', topic)} 
                  />
                </Badge>
              ))}
              {filters.sentiment.map(sentiment => (
                <Badge key={sentiment} variant="secondary" className="gap-1">
                  {sentiment}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => toggleFilterOption('sentiment', sentiment)} 
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedFilterSearch;