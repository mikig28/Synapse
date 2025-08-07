import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Input } from '@/components/ui/input';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { FloatingParticles } from '@/components/common/FloatingParticles';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import searchService, { SearchResult, UniversalSearchResponse, SearchStats } from '@/services/searchService';
import {
  Search,
  Filter,
  Clock,
  FileText,
  StickyNote,
  Bookmark,
  CheckSquare,
  Lightbulb,
  Video,
  Newspaper,
  MessageSquare,
  Users,
  Calendar,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Zap,
  Globe,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Search state
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<UniversalSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [stats, setStats] = useState<SearchStats | null>(null);

  // UI state
  const [selectedStrategy, setSelectedStrategy] = useState<'hybrid' | 'semantic' | 'keyword'>('hybrid');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['all']);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { ref: contentRef, controls } = useScrollAnimation();

  // Content type configuration
  const contentTypes = [
    { key: 'all', label: 'All Content', icon: Globe, color: 'text-blue-400' },
    { key: 'document', label: 'Documents', icon: FileText, color: 'text-purple-400' },
    { key: 'note', label: 'Notes', icon: StickyNote, color: 'text-yellow-400' },
    { key: 'bookmark', label: 'Bookmarks', icon: Bookmark, color: 'text-green-400' },
    { key: 'task', label: 'Tasks', icon: CheckSquare, color: 'text-orange-400' },
    { key: 'idea', label: 'Ideas', icon: Lightbulb, color: 'text-pink-400' },
    { key: 'video', label: 'Videos', icon: Video, color: 'text-red-400' },
    { key: 'news', label: 'News', icon: Newspaper, color: 'text-cyan-400' },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-400' },
    { key: 'telegram', label: 'Telegram', icon: MessageSquare, color: 'text-blue-500' },
    { key: 'meeting', label: 'Meetings', icon: Calendar, color: 'text-indigo-400' }
  ];

  const strategies = [
    { key: 'hybrid', label: 'Smart Search', description: 'Best of both worlds' },
    { key: 'semantic', label: 'Meaning-based', description: 'Understands context' },
    { key: 'keyword', label: 'Exact match', description: 'Find specific terms' }
  ];

  // Load search stats on component mount
  useEffect(() => {
    loadSearchStats();
    
    // Focus search input on mount
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Perform search when query changes
  useEffect(() => {
    if (query.trim()) {
      performSearch();
      loadSuggestions();
    } else {
      setResults(null);
      setSuggestions([]);
    }
  }, [query, selectedStrategy, selectedTypes]);

  // Update URL when query changes
  useEffect(() => {
    if (query.trim()) {
      setSearchParams({ q: query });
    } else {
      setSearchParams({});
    }
  }, [query, setSearchParams]);

  const loadSearchStats = async () => {
    try {
      const statsData = await searchService.getSearchStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load search stats:', error);
      // Set default stats if backend is not available
      setStats({
        totalSearchableItems: 0,
        byType: {
          documents: 0,
          notes: 0,
          bookmarks: 0,
          tasks: 0,
          ideas: 0,
          videos: 0,
          news: 0,
          telegram: 0,
          meetings: 0,
          whatsapp: 0
        }
      });
    }
  };

  const loadSuggestions = async () => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const suggestionsData = await searchService.getSearchSuggestions(query, 5);
      setSuggestions(suggestionsData);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
      setSuggestions([]);
    }
  };

  const performSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const searchResults = await searchService.universalSearch({
        query: query.trim(),
        strategy: selectedStrategy,
        contentTypes: selectedTypes,
        limit: 50
      });

      setResults(searchResults);
      setShowSuggestions(false);
    } catch (error: any) {
      console.error('Search error details:', error);
      
      // Provide more detailed error messages based on the error type
      let errorMessage = 'Search failed';
      
      if (error.message?.includes('Network Error') || error.code === 'ERR_NETWORK') {
        errorMessage = 'Unable to connect to search service. The backend server may be starting up or temporarily unavailable.';
      } else if (error.message?.includes('404')) {
        errorMessage = 'Search service not found. The backend may not be properly configured.';
      } else if (error.message?.includes('500')) {
        errorMessage = 'Search service is experiencing issues. Vector database may be unavailable, but basic search should still work.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Search request timed out. The service may be overloaded or starting up.';
      } else if (error.message?.includes('CORS')) {
        errorMessage = 'Cross-origin request blocked. Please check CORS configuration.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in to use search.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. You may not have permission to search.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setShowSuggestions(newQuery.length > 1);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  const handleTypeToggle = (type: string) => {
    if (type === 'all') {
      setSelectedTypes(['all']);
    } else {
      const newTypes = selectedTypes.includes('all')
        ? [type]
        : selectedTypes.includes(type)
        ? selectedTypes.filter(t => t !== type)
        : [...selectedTypes.filter(t => t !== 'all'), type];
      
      setSelectedTypes(newTypes.length === 0 ? ['all'] : newTypes);
    }
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = contentTypes.find(t => t.key === type);
    if (!typeConfig) return FileText;
    return typeConfig.icon;
  };

  const getTypeColor = (type: string) => {
    const typeConfig = contentTypes.find(t => t.key === type);
    return typeConfig?.color || 'text-gray-400';
  };

  const renderSearchResult = (result: SearchResult, index: number) => {
    const Icon = getTypeIcon(result.type);
    const typeColor = getTypeColor(result.type);

    return (
      <motion.div
        key={result.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <GlassCard className="p-4 hover:border-violet-400/50 transition-all duration-300 cursor-pointer group">
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 group-hover:from-violet-500/30 group-hover:to-purple-500/30 transition-colors duration-300`}>
              <Icon className={`w-4 h-4 ${typeColor}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-white truncate">{result.title}</h3>
                <span className="px-2 py-1 text-xs rounded-full bg-violet-500/20 text-violet-300 capitalize">
                  {result.type}
                </span>
                {result.score > 0.8 && (
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                )}
              </div>
              
              <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                {result.excerpt}
              </p>
              
              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(result.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {Math.round(result.score * 100)}% match
                  </span>
                </div>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-purple-900 relative overflow-hidden">
      <FloatingParticles />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Search className="w-8 h-8 text-violet-400" />
            Universal Search
          </h1>
          <p className="text-gray-300">
            Search across all your content in one place
          </p>
        </motion.div>

        {/* Search Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto mb-8 relative"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search across documents, notes, bookmarks, tasks..."
              value={query}
              onChange={handleQueryChange}
              className="pl-12 pr-4 py-4 text-lg bg-black/30 border-violet-500/30 focus:border-violet-400 text-white placeholder-gray-400"
              onFocus={() => setShowSuggestions(suggestions.length > 0)}
            />
          </div>

          {/* Search Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 right-0 z-50 mt-2"
            >
              <GlassCard className="p-2">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 hover:bg-violet-500/20 rounded cursor-pointer text-gray-300 hover:text-white transition-colors duration-200"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </div>
                ))}
              </GlassCard>
            </motion.div>
          )}
        </motion.div>

        {/* Search Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-4xl mx-auto mb-8"
        >
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Search Filters
              </h3>
              <AnimatedButton
                variant="ghost"
                size="sm"
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className="text-gray-300 hover:text-white"
              >
                {isFiltersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </AnimatedButton>
            </div>

            {isFiltersOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                {/* Search Strategy */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Search Strategy</label>
                  <div className="flex flex-wrap gap-2">
                    {strategies.map(strategy => (
                      <AnimatedButton
                        key={strategy.key}
                        variant={selectedStrategy === strategy.key ? "primary" : "outline"}
                        size="sm"
                        onClick={() => setSelectedStrategy(strategy.key as any)}
                        className="text-xs"
                      >
                        {strategy.label}
                      </AnimatedButton>
                    ))}
                  </div>
                </div>

                {/* Content Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Content Types</label>
                  <div className="flex flex-wrap gap-2">
                    {contentTypes.map(type => {
                      const Icon = type.icon;
                      const isSelected = selectedTypes.includes(type.key);
                      
                      return (
                        <AnimatedButton
                          key={type.key}
                          variant={isSelected ? "primary" : "outline"}
                          size="sm"
                          onClick={() => handleTypeToggle(type.key)}
                          className="text-xs"
                        >
                          <Icon className="w-3 h-3 mr-1" />
                          {type.label}
                        </AnimatedButton>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </GlassCard>
        </motion.div>

        {/* Search Stats */}
        {stats && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-4xl mx-auto mb-8"
          >
            <GlassCard className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.totalSearchableItems.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Total Items</div>
                </div>
                {Object.entries(stats.byType).slice(0, 5).map(([type, count]) => {
                  const Icon = getTypeIcon(type);
                  const color = getTypeColor(type);
                  
                  return (
                    <div key={type} className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div className="text-lg font-semibold text-white">{count.toLocaleString()}</div>
                      <div className="text-xs text-gray-400 capitalize">{type}</div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto"
          >
            <div className="grid gap-4">
              {[1, 2, 3, 4, 5].map(i => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <GlassCard className="p-6 border-red-500/50">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-red-400 font-semibold mb-2">Search Service Unavailable</h3>
                  <p className="text-red-300 mb-4">{error}</p>
                  <div className="text-sm text-red-200 bg-red-900/20 p-3 rounded border border-red-500/30">
                    <p className="font-medium mb-2">Troubleshooting steps:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Wait a few minutes - the backend service may be starting up</li>
                      <li>Check if the backend server is running at: <a href="https://synapse-backend-7lq6.onrender.com/api/v1/health" target="_blank" rel="noopener noreferrer" className="underline">synapse-backend-7lq6.onrender.com</a></li>
                      <li>Vector search may be unavailable, but basic search should work</li>
                      <li>Check browser console for detailed error information</li>
                    </ul>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Search Results */}
        {results && !loading && (
          <motion.div
            ref={contentRef}
            initial={{ opacity: 0 }}
            animate={controls}
            className="max-w-4xl mx-auto"
          >
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-white">
                <h2 className="text-xl font-semibold">
                  {results.totalResults.toLocaleString()} results found
                </h2>
                <p className="text-gray-400 text-sm">
                  Search completed in {results.searchTime}ms using {results.strategy} strategy
                </p>
              </div>

              {/* Results by Type */}
              <div className="flex items-center gap-2 text-sm">
                {Object.entries(results.resultsByType)
                  .filter(([_, count]) => count > 0)
                  .map(([type, count]) => {
                    const Icon = getTypeIcon(type);
                    const color = getTypeColor(type);
                    
                    return (
                      <div key={type} className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/30">
                        <Icon className={`w-3 h-3 ${color}`} />
                        <span className="text-gray-300">{count}</span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Results List */}
            {results.results.length > 0 ? (
              <div className="grid gap-4">
                {results.results.map((result, index) => renderSearchResult(result, index))}
              </div>
            ) : (
              <GlassCard className="p-8 text-center">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No results found</h3>
                <p className="text-gray-400">
                  Try adjusting your search query or filters
                </p>
              </GlassCard>
            )}
          </motion.div>
        )}

        {/* Empty State */}
        {!query && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto text-center"
          >
            <GlassCard className="p-12">
              <Zap className="w-16 h-16 text-violet-400 mx-auto mb-6" />
              <h2 className="text-2xl font-semibold text-white mb-4">
                Search Your Knowledge Universe
              </h2>
              <p className="text-gray-300 mb-6 max-w-md mx-auto">
                Find anything across your documents, notes, bookmarks, tasks, videos, messages, and more
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                {contentTypes.slice(1, 5).map(type => {
                  const Icon = type.icon;
                  return (
                    <div key={type.key} className="text-center p-3 rounded-lg bg-black/20">
                      <Icon className={`w-6 h-6 ${type.color} mx-auto mb-2`} />
                      <div className="text-sm text-gray-300">{type.label}</div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;