import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { newsService } from '../services/newsService';
import { NewsItem, NewsStatistics } from '../types/news';
import '../styles/mobile-news-optimized.css';
import {
  Newspaper,
  Heart,
  Share2,
  Eye,
  Bot,
  MessageSquare,
  Briefcase,
  ChevronLeft,
  Filter,
  RefreshCw,
  TrendingUp,
  Clock,
  Star,
  Home,
  Search,
  User,
  Settings,
  X,
  ChevronRight,
  Sparkles,
  AlertCircle,
  ExternalLink,
  BookOpen,
  Zap,
  Moon,
  Sun,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Mobile-optimized card component with swipe gestures
const MobileNewsCard: React.FC<{
  item: NewsItem;
  onView: (item: NewsItem) => void;
  onFavorite: (item: NewsItem) => void;
  onShare: (item: NewsItem) => void;
  index: number;
  totalItems: number;
}> = ({ item, onView, onFavorite, onShare, index, totalItems }) => {
  const [swiped, setSwiped] = useState(false);
  const [favoriteAnimation, setFavoriteAnimation] = useState(false);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const scale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]);
  
  const isInternal = item.url?.startsWith('#') || !item.url?.startsWith('http') || item.source?.id === 'crewai_analysis';

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    
    if (Math.abs(info.offset.x) > threshold) {
      setSwiped(true);
      
      // Swipe right - favorite
      if (info.offset.x > 0) {
        setFavoriteAnimation(true);
        setTimeout(() => {
          onFavorite(item);
          setFavoriteAnimation(false);
        }, 300);
      }
      // Swipe left - share
      else {
        onShare(item);
      }
      
      // Reset position after action
      setTimeout(() => {
        setSwiped(false);
        x.set(0);
      }, 500);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  const getSourceIcon = (sourceId: string) => {
    switch (sourceId) {
      case 'reddit':
        return '🔴';
      case 'linkedin':
        return <Briefcase className="w-4 h-4 text-blue-600" />;
      case 'telegram':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'crewai_analysis':
        return <Bot className="w-4 h-4 text-purple-500" />;
      default:
        return <Newspaper className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleTap = () => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onView(item);
  };

  return (
    <motion.div
      className="relative mb-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: swiped ? 300 : 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      {/* Swipe hint indicators */}
      <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
        <motion.div
          className="bg-green-500 text-white p-3 rounded-full"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: x.get() > 50 ? 0.8 : 0,
            scale: x.get() > 50 ? 1 : 0.5 
          }}
        >
          <Heart className="w-5 h-5" />
        </motion.div>
        <motion.div
          className="bg-blue-500 text-white p-3 rounded-full"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: x.get() < -50 ? 0.8 : 0,
            scale: x.get() < -50 ? 1 : 0.5 
          }}
        >
          <Share2 className="w-5 h-5" />
        </motion.div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        dragElastic={0.5}
        onDragEnd={handleDragEnd}
        style={{ x, opacity, scale }}
        whileTap={{ scale: 0.98 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden cursor-grab active:cursor-grabbing"
      >
        {/* Card Header with Source */}
        <div className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1">
                {getSourceIcon(item.source?.id || '')}
                <span className="font-medium">{item.source?.name}</span>
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">{formatTimeAgo(item.publishedAt)}</span>
            </div>
            {item.isFavorite && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: favoriteAnimation ? [1, 1.5, 1] : 1 }}
                className="text-red-500"
              >
                <Heart className="w-5 h-5 fill-current" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Card Content */}
        <div className="p-4" onClick={handleTap}>
          <h3 className="text-lg font-semibold mb-2 line-clamp-2">{item.title}</h3>
          {item.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
              {item.description}
            </p>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {item.tags.slice(0, 3).map(tag => (
                <span 
                  key={tag} 
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  {tag}
                </span>
              ))}
              {item.tags.length > 3 && (
                <span className="text-xs text-gray-500">+{item.tags.length - 3}</span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onFavorite(item);
                }}
                className={`p-2.5 rounded-xl transition-colors ${
                  item.isFavorite 
                    ? 'bg-red-100 text-red-500 dark:bg-red-900/30' 
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                <Heart className={`w-5 h-5 ${item.isFavorite ? 'fill-current' : ''}`} />
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(item);
                }}
                className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-400"
              >
                <Share2 className="w-5 h-5" />
              </motion.button>
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              className={`px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 ${
                isInternal
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}
            >
              {isInternal ? (
                <>
                  <BookOpen className="w-4 h-4" />
                  <span>Read</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  <span>Open</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="h-1 bg-gray-100 dark:bg-gray-700">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            style={{ width: `${((index + 1) / totalItems) * 100}%` }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

// Bottom sheet component for content viewing
const BottomSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  content: NewsItem | null;
}> = ({ isOpen, onClose, content }) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const startY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (dragY > 100) {
      onClose();
    }
    setDragY(0);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
          
          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: dragY }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl z-50 max-h-[90vh] overflow-hidden"
          >
            {/* Drag Handle */}
            <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-4 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <h2 className="text-xl font-bold mb-2">{content?.title}</h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{content?.source?.name}</span>
                    <span>•</span>
                    <span>{content?.publishedAt ? formatTimeAgo(content.publishedAt) : ''}</span>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              {content?.content ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
                  <p className="text-lg font-semibold mb-2">No Content Available</p>
                  <p className="text-sm text-gray-500">
                    This report doesn't have any content to display.
                  </p>
                  {content?.description && (
                    <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
                      <p className="text-sm">{content.description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {content?.tags && content.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-6">
                  {content.tags.map(tag => (
                    <span 
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Main Mobile News Page Component
const MobileNewsPageOptimized: React.FC = () => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [statistics, setStatistics] = useState<NewsStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedContent, setSelectedContent] = useState<NewsItem | null>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');
  const [currentFilter, setCurrentFilter] = useState<'all' | 'favorites' | 'unread'>('all');
  const { toast } = useToast();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pullDistance = useRef(0);
  
  // Pull to refresh state
  const [pullToRefreshActive, setPullToRefreshActive] = useState(false);

  useEffect(() => {
    fetchData();
    fetchStatistics();
    
    // Check system dark mode preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await newsService.getNewsItems({
        page: 1,
        limit: 50,
      });
      setNewsItems(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch news',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPullToRefreshActive(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const data = await newsService.getNewsStatistics();
      setStatistics(data);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 20, 10]);
    }
    
    setRefreshing(true);
    await fetchData();
    await fetchStatistics();
  };

  const handleView = (item: NewsItem) => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    const isInternal = item.url?.startsWith('#') || !item.url?.startsWith('http') || item.source?.id === 'crewai_analysis';
    
    if (isInternal) {
      setSelectedContent(item);
      setBottomSheetOpen(true);
    } else {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleToggleFavorite = async (item: NewsItem) => {
    try {
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([10, 20, 10]);
      }
      
      const updated = await newsService.toggleFavorite(item._id);
      setNewsItems(prev => prev.map(i => i._id === item._id ? updated : i));
      
      toast({
        title: updated.isFavorite ? '❤️ Added to favorites' : 'Removed from favorites',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update favorite',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async (item: NewsItem) => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    const shareData = {
      title: item.title,
      text: item.description || '',
      url: item.url?.startsWith('http') ? item.url : window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: '📋 Link copied!',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  // Filter news items based on current filter
  const filteredItems = useMemo(() => {
    switch (currentFilter) {
      case 'favorites':
        return newsItems.filter(item => item.isFavorite);
      case 'unread':
        return newsItems.filter(item => !item.isRead);
      default:
        return newsItems;
    }
  }, [newsItems, currentFilter]);

  // Pull to refresh handler
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollContainerRef.current?.scrollTop === 0) {
      pullDistance.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (scrollContainerRef.current?.scrollTop === 0) {
      const distance = e.touches[0].clientY - pullDistance.current;
      if (distance > 50 && !pullToRefreshActive) {
        setPullToRefreshActive(true);
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullToRefreshActive) {
      handleRefresh();
    }
    pullDistance.current = 0;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
      {/* Header */}
      <motion.header 
        className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                <Newspaper className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">News Feed</h1>
                <p className="text-xs text-gray-500">
                  {loading ? 'Updating...' : `${filteredItems.length} articles`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setViewMode(viewMode === 'cards' ? 'compact' : 'cards')}
                className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl"
              >
                {viewMode === 'cards' ? (
                  <Zap className="w-5 h-5" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setFilterDrawerOpen(true)}
                className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl relative"
              >
                <Filter className="w-5 h-5" />
                {currentFilter !== 'all' && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {statistics && (
          <div className="px-4 pb-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              <div className="flex-shrink-0 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                  {statistics.unreadItems} unread
                </span>
              </div>
              <div className="flex-shrink-0 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <span className="text-xs font-medium text-red-700 dark:text-red-400">
                  {statistics.favoriteItems} favorites
                </span>
              </div>
              <div className="flex-shrink-0 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <span className="text-xs font-medium text-green-700 dark:text-green-400">
                  {statistics.last24Hours} today
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.header>

      {/* Pull to Refresh Indicator */}
      <AnimatePresence>
        {(refreshing || pullToRefreshActive) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20"
          >
            <div className="bg-white dark:bg-gray-800 rounded-full shadow-lg p-3">
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div 
        ref={scrollContainerRef}
        className="px-4 py-4 overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ minHeight: 'calc(100vh - 140px)' }}
      >
        {loading ? (
          // Skeleton Loading
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3" />
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          // Empty State
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <Newspaper className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Articles Found</h3>
            <p className="text-sm text-gray-500 text-center px-8">
              {currentFilter === 'favorites' 
                ? "You haven't favorited any articles yet"
                : currentFilter === 'unread'
                ? "All articles have been read"
                : "No news items available. Pull down to refresh."}
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-xl font-medium"
            >
              Refresh Feed
            </motion.button>
          </motion.div>
        ) : (
          // News Cards
          <AnimatePresence>
            {filteredItems.map((item, index) => (
              <MobileNewsCard
                key={item._id}
                item={item}
                onView={handleView}
                onFavorite={handleToggleFavorite}
                onShare={handleShare}
                index={index}
                totalItems={filteredItems.length}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Bottom Navigation */}
      <motion.nav
        className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 z-30"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <div className="flex items-center justify-around py-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="flex flex-col items-center p-2 text-blue-600"
          >
            <Home className="w-5 h-5 mb-1" />
            <span className="text-xs">Home</span>
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentFilter('favorites')}
            className={`flex flex-col items-center p-2 ${
              currentFilter === 'favorites' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <Heart className="w-5 h-5 mb-1" />
            <span className="text-xs">Favorites</span>
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentFilter('unread')}
            className={`flex flex-col items-center p-2 ${
              currentFilter === 'unread' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <Eye className="w-5 h-5 mb-1" />
            <span className="text-xs">Unread</span>
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="flex flex-col items-center p-2 text-gray-500"
          >
            <User className="w-5 h-5 mb-1" />
            <span className="text-xs">Profile</span>
          </motion.button>
        </div>
      </motion.nav>

      {/* Filter Drawer */}
      <AnimatePresence>
        {filterDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFilterDrawerOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-900 z-50 shadow-xl"
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Filters & Settings</h2>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setFilterDrawerOpen(false)}
                    className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
              
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Quick Filters</h3>
                  <div className="space-y-2">
                    {['all', 'favorites', 'unread'].map(filter => (
                      <motion.button
                        key={filter}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setCurrentFilter(filter as any);
                          setFilterDrawerOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                          currentFilter === filter
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      >
                        <span className="capitalize font-medium">{filter}</span>
                        <ChevronRight className="w-4 h-4" />
                      </motion.button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Display</h3>
                  <div className="space-y-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setDarkMode(!darkMode)}
                      className="w-full flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-xl"
                    >
                      <span className="font-medium">Dark Mode</span>
                      <div className={`w-12 h-7 rounded-full p-1 transition-colors ${
                        darkMode ? 'bg-blue-500' : 'bg-gray-300'
                      }`}>
                        <motion.div
                          className="w-5 h-5 bg-white rounded-full"
                          animate={{ x: darkMode ? 18 : 0 }}
                        />
                      </div>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Sheet for Content */}
      <BottomSheet
        isOpen={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        content={selectedContent}
      />
    </div>
  );
};

export default MobileNewsPageOptimized;