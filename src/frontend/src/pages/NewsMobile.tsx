import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { newsService } from '../services/newsService';
import { NewsItem, NewsStatistics } from '../types/news';
import {
  Newspaper,
  ExternalLink,
  Heart,
  Archive,
  Share2,
  Eye,
  Bot,
  MessageSquare,
  Briefcase,
  X,
  Filter,
  TrendingUp,
  Clock,
  Bookmark,
  ChevronUp,
  RefreshCw,
  Search,
  Home,
  User,
  Settings,
  Menu,
  ArrowLeft,
  Sparkles,
  Zap,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

// Mobile-optimized News Card Component
const MobileNewsCard: React.FC<{
  item: NewsItem;
  onView: (item: NewsItem) => void;
  onFavorite: (item: NewsItem) => void;
  onShare: (item: NewsItem) => void;
  index: number;
}> = ({ item, onView, onFavorite, onShare, index }) => {
  const [swiped, setSwiped] = useState(false);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5]);
  const scale = useTransform(x, [-100, 0, 100], [0.95, 1, 0.95]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    if (Math.abs(info.offset.x) > threshold) {
      setSwiped(true);
      if (info.offset.x > 0) {
        onFavorite(item);
      }
    }
  };

  const isInternal = item.url?.startsWith('#') || !item.url?.startsWith('http');
  const timeAgo = formatTimeAgo(item.publishedAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: swiped ? 300 : 0 }}
      transition={{ delay: index * 0.05 }}
      style={{ x, opacity, scale }}
      drag="x"
      dragConstraints={{ left: -100, right: 100 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.98 }}
      className="mb-4"
    >
      <Card className="overflow-hidden shadow-lg border-0 bg-gradient-to-br from-background to-muted/30">
        <CardContent className="p-0">
          {/* Image or Source Banner */}
          <div className={cn(
            "h-32 relative overflow-hidden",
            getSourceGradient(item.source?.id || '')
          )}>
            {item.urlToImage ? (
              <img 
                src={item.urlToImage} 
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-6xl opacity-20">
                  {getSourceEmoji(item.source?.id || '')}
                </div>
              </div>
            )}
            
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            
            {/* Source badge */}
            <div className="absolute top-3 left-3">
              <Badge className="bg-white/90 text-black backdrop-blur-sm">
                {getSourceEmoji(item.source?.id || '')} {item.source?.name}
              </Badge>
            </div>
            
            {/* Time badge */}
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
                <Clock className="w-3 h-3 mr-1" />
                {timeAgo}
              </Badge>
            </div>

            {/* Unread indicator */}
            {!item.isRead && (
              <div className="absolute bottom-3 left-3">
                <Badge className="bg-blue-500 text-white">
                  <Sparkles className="w-3 h-3 mr-1" />
                  New
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            <h3 className="font-bold text-lg leading-tight line-clamp-2">
              {item.title}
            </h3>
            
            {item.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {item.description}
              </p>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {item.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {item.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{item.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFavorite(item);
                  }}
                >
                  <Heart className={cn(
                    "h-5 w-5",
                    item.isFavorite && "fill-red-500 text-red-500"
                  )} />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare(item);
                  }}
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>

              <Button
                variant="default"
                size="sm"
                className="h-10 px-4"
                onClick={() => onView(item)}
              >
                {isInternal ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Read
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Skeleton loader for better perceived performance
const NewsCardSkeleton: React.FC = () => (
  <div className="mb-4">
    <Card className="overflow-hidden">
      <div className="h-32 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
      <CardContent className="p-4 space-y-3">
        <div className="h-6 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  </div>
);

// Helper functions
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

function getSourceEmoji(sourceId: string): string {
  const emojis: Record<string, string> = {
    reddit: '🔴',
    linkedin: '💼',
    telegram: '📱',
    crewai_analysis: '🤖',
    twitter: '🐦',
    news_website: '📰',
    news: '📰',
  };
  return emojis[sourceId] || '📄';
}

function getSourceGradient(sourceId: string): string {
  const gradients: Record<string, string> = {
    reddit: 'bg-gradient-to-br from-orange-400 to-red-500',
    linkedin: 'bg-gradient-to-br from-blue-400 to-blue-600',
    telegram: 'bg-gradient-to-br from-sky-400 to-blue-500',
    crewai_analysis: 'bg-gradient-to-br from-purple-400 to-purple-600',
    twitter: 'bg-gradient-to-br from-sky-300 to-sky-500',
    default: 'bg-gradient-to-br from-gray-400 to-gray-600',
  };
  return gradients[sourceId] || gradients.default;
}

// Main Mobile News Component
const NewsMobile: React.FC = () => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [statistics, setStatistics] = useState<NewsStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedContent, setSelectedContent] = useState<NewsItem | null>(null);
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<string>('all');
  const { toast } = useToast();
  
  // Pull-to-refresh functionality
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  useEffect(() => {
    fetchData();
    fetchStatistics();
  }, [currentFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      
      if (currentFilter !== 'all') {
        if (currentFilter === 'unread') {
          filters.isRead = false;
        } else if (currentFilter === 'favorites') {
          filters.isFavorite = true;
        } else {
          filters.source = currentFilter;
        }
      }
      
      const { data } = await newsService.getNewsItems({
        page: 1,
        limit: 50,
        ...filters,
      });
      
      setNewsItems(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load news',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    setRefreshing(true);
    vibrate();
    await fetchData();
  };

  const handleView = (item: NewsItem) => {
    const isInternal = item.url?.startsWith('#') || !item.url?.startsWith('http');
    
    if (isInternal || item.source?.id === 'crewai_analysis') {
      setSelectedContent(item);
      setContentDialogOpen(true);
      markAsRead(item);
    } else {
      window.open(item.url, '_blank', 'noopener,noreferrer');
      markAsRead(item);
    }
    vibrate();
  };

  const markAsRead = async (item: NewsItem) => {
    if (!item.isRead) {
      try {
        await newsService.markAsRead(item._id);
        setNewsItems(prev => prev.map(i => 
          i._id === item._id ? { ...i, isRead: true } : i
        ));
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
  };

  const handleFavorite = async (item: NewsItem) => {
    try {
      const updated = await newsService.toggleFavorite(item._id);
      setNewsItems(prev => prev.map(i => 
        i._id === item._id ? updated : i
      ));
      toast({
        title: updated.isFavorite ? '❤️ Added to favorites' : 'Removed from favorites',
        duration: 2000,
      });
      vibrate();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update favorite',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async (item: NewsItem) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: item.description || item.summary,
          url: item.url.startsWith('#') ? window.location.href : item.url,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(item.url);
      toast({
        title: '📋 Link copied!',
        duration: 2000,
      });
    }
    vibrate();
  };

  // Haptic feedback
  const vibrate = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  // Pull-to-refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(diff, 100));
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 50) {
      handleRefresh();
    }
    setPullDistance(0);
  };

  // Filter options
  const filterOptions = [
    { value: 'all', label: 'All News', icon: '📰' },
    { value: 'unread', label: 'Unread', icon: '🆕' },
    { value: 'favorites', label: 'Favorites', icon: '❤️' },
    { value: 'crewai_analysis', label: 'AI Reports', icon: '🤖' },
    { value: 'reddit', label: 'Reddit', icon: '🔴' },
    { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { value: 'telegram', label: 'Telegram', icon: '📱' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {pullDistance > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: pullDistance > 50 ? 1 : 0.5,
              scale: pullDistance > 50 ? 1 : 0.8,
              rotate: pullDistance * 3.6
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
          >
            <RefreshCw className="w-8 h-8 text-primary" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Newspaper className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">News</h1>
            {statistics && (
              <Badge variant="secondary" className="ml-2">
                {statistics.unreadItems} new
              </Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFilterDialogOpen(true)}
              className="relative"
            >
              <Filter className="w-5 h-5" />
              {currentFilter !== 'all' && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn(
                "w-5 h-5",
                refreshing && "animate-spin"
              )} />
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        {statistics && (
          <div className="flex items-center gap-4 px-4 pb-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {statistics.totalItems} total
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {statistics.last24Hours} today
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {statistics.favoriteItems} favorites
            </span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div 
        ref={containerRef}
        className="pb-20"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="p-4">
          {loading ? (
            // Skeleton loading
            <>
              <NewsCardSkeleton />
              <NewsCardSkeleton />
              <NewsCardSkeleton />
            </>
          ) : newsItems.length > 0 ? (
            // News items
            <AnimatePresence>
              {newsItems.map((item, index) => (
                <MobileNewsCard
                  key={item._id}
                  item={item}
                  index={index}
                  onView={handleView}
                  onFavorite={handleFavorite}
                  onShare={handleShare}
                />
              ))}
            </AnimatePresence>
          ) : (
            // Empty state
            <div className="flex flex-col items-center justify-center py-20">
              <Newspaper className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No news yet</h3>
              <p className="text-sm text-muted-foreground text-center px-8">
                Your AI agents will populate this feed with relevant content
              </p>
              <Button
                variant="default"
                className="mt-6"
                onClick={handleRefresh}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Filter News</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-2 mb-4">
            {filterOptions.map(option => (
              <Button
                key={option.value}
                variant={currentFilter === option.value ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => {
                  setCurrentFilter(option.value);
                  setFilterDialogOpen(false);
                  vibrate();
                }}
              >
                <span className="mr-2">{option.icon}</span>
                {option.label}
                {option.value === 'unread' && statistics && (
                  <Badge variant="secondary" className="ml-auto">
                    {statistics.unreadItems}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Content Viewer Dialog */}
      <Dialog open={contentDialogOpen} onOpenChange={setContentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-4">
                <DialogTitle className="text-lg mb-1">
                  {selectedContent?.title}
                </DialogTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{getSourceEmoji(selectedContent?.source?.id || '')}</span>
                  <span>{selectedContent?.source?.name}</span>
                  <span>•</span>
                  <span>{selectedContent?.publishedAt && formatTimeAgo(selectedContent.publishedAt)}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setContentDialogOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="overflow-y-auto p-4 pb-8">
            {selectedContent?.content ? (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedContent.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No content available</p>
                {selectedContent?.description && (
                  <p className="mt-4 text-sm">{selectedContent.description}</p>
                )}
              </div>
            )}
            
            {/* Action buttons in content viewer */}
            <div className="flex gap-2 mt-6 pt-6 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleFavorite(selectedContent!)}
              >
                <Heart className={cn(
                  "w-4 h-4 mr-2",
                  selectedContent?.isFavorite && "fill-red-500 text-red-500"
                )} />
                Favorite
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleShare(selectedContent!)}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t z-40">
        <div className="flex items-center justify-around py-2">
          <Button variant="ghost" size="icon" className="h-12 w-12">
            <Home className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-12 w-12">
            <Search className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-12 w-12 relative">
            <Newspaper className="w-5 h-5 text-primary" />
            {statistics && statistics.unreadItems > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-12 w-12">
            <Bookmark className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-12 w-12">
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewsMobile;