import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { newsHubService } from '../services/newsHubService';
import type {
  RealNewsArticle,
  UserInterest,
  NewsHubStats,
  TrendingTopic
} from '../types/newsHub';
import {
  Newspaper,
  RefreshCw,
  Heart,
  Bookmark,
  ExternalLink,
  TrendingUp,
  Settings,
  Search,
  Filter,
  Clock,
  Eye,
  Sparkles,
  BookOpen,
  Star,
  Zap
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NewsHubPage: React.FC = () => {
  const [articles, setArticles] = useState<RealNewsArticle[]>([]);
  const [stats, setStats] = useState<NewsHubStats | null>(null);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [userInterests, setUserInterests] = useState<UserInterest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    source: '',
    sortBy: 'relevance' as 'relevance' | 'date' | 'none',
    isRead: undefined as boolean | undefined,
    isSaved: undefined as boolean | undefined
  });
  const [interestsModalOpen, setInterestsModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    fetchStats();
    fetchTrendingTopics();
    fetchUserInterests();
  }, [currentPage, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await newsHubService.getNewsFeed({
        page: currentPage,
        limit: 20,
        ...filters
      });

      setArticles(response.data);
      setTotalPages(response.pagination.totalPages);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch news feed',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await newsHubService.getStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchTrendingTopics = async () => {
    try {
      const response = await newsHubService.getTrendingTopics(6);
      if (response.success && response.data) {
        setTrendingTopics(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch trending topics:', error);
    }
  };

  const fetchUserInterests = async () => {
    try {
      const response = await newsHubService.getUserInterests();
      if (response.success && response.data) {
        setUserInterests(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch user interests:', error);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      toast({
        title: 'Fetching fresh news...',
        description: 'This may take a moment'
      });

      const response = await newsHubService.refreshNews(50);

      if (response.success) {
        toast({
          title: 'Success!',
          description: response.message || 'News refreshed successfully'
        });
        fetchData();
        fetchStats();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to refresh news',
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleFavorite = async (article: RealNewsArticle) => {
    try {
      const response = await newsHubService.toggleFavorite(article._id);
      if (response.success && response.data) {
        setArticles(prev =>
          prev.map(a => (a._id === article._id ? response.data! : a))
        );
        toast({
          title: response.data.isFavorite ? 'Added to favorites' : 'Removed from favorites'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update favorite status',
        variant: 'destructive'
      });
    }
  };

  const handleToggleSaved = async (article: RealNewsArticle) => {
    try {
      const response = await newsHubService.toggleSaved(article._id);
      if (response.success && response.data) {
        setArticles(prev =>
          prev.map(a => (a._id === article._id ? response.data! : a))
        );
        toast({
          title: response.data.isSaved ? 'Saved for later' : 'Removed from saved'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update saved status',
        variant: 'destructive'
      });
    }
  };

  const handleMarkAsRead = async (article: RealNewsArticle) => {
    if (article.isRead) return;

    try {
      const response = await newsHubService.markAsRead(article._id);
      if (response.success && response.data) {
        setArticles(prev =>
          prev.map(a => (a._id === article._id ? response.data! : a))
        );
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleArticleClick = (article: RealNewsArticle) => {
    handleMarkAsRead(article);
    window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="bg-gradient-to-br from-background via-background to-muted/20 min-h-screen">
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full">
              <Newspaper className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500">
                News Hub
              </h1>
              <p className="text-muted-foreground">
                Your personalized news from around the web
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setInterestsModalOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Manage Interests
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <BookOpen className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold text-blue-500">{stats.totalArticles}</div>
                <div className="text-xs text-muted-foreground">Total Articles</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Eye className="w-6 h-6 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold text-green-500">{stats.unreadArticles}</div>
                <div className="text-xs text-muted-foreground">Unread</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Bookmark className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                <div className="text-2xl font-bold text-yellow-500">{stats.savedArticles}</div>
                <div className="text-xs text-muted-foreground">Saved</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Heart className="w-6 h-6 mx-auto mb-2 text-red-500" />
                <div className="text-2xl font-bold text-red-500">{stats.favoriteArticles}</div>
                <div className="text-xs text-muted-foreground">Favorites</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Zap className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                <div className="text-2xl font-bold text-purple-500">{stats.last24Hours}</div>
                <div className="text-xs text-muted-foreground">Last 24h</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trending Topics */}
        {trendingTopics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Trending Topics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {trendingTopics.map((topic, idx) => (
                  <Badge key={idx} variant="secondary" className="text-sm">
                    {topic.topic} <span className="ml-1 text-xs opacity-70">({topic.count})</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={filters.sortBy}
                onValueChange={(value: any) => setFilters(prev => ({ ...prev, sortBy: value }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Articles List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles
            .filter(article =>
              searchQuery === '' ||
              article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              article.description?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((article) => (
              <motion.div
                key={article._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className={`hover:shadow-lg transition-all duration-300 ${!article.isRead ? 'border-l-4 border-l-blue-500' : ''}`}>
                  <CardContent className="p-0">
                    {article.urlToImage && (
                      <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
                        <img
                          src={article.urlToImage}
                          alt={article.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        {article.relevanceScore && article.relevanceScore > 0.7 && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-yellow-500/90 text-white">
                              <Star className="w-3 h-3 mr-1" />
                              High Match
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <h3
                            className="text-lg font-semibold line-clamp-2 mb-2 cursor-pointer hover:text-blue-500 transition-colors"
                            onClick={() => handleArticleClick(article)}
                          >
                            {article.title}
                          </h3>
                          {article.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {article.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {article.source.name}
                            </Badge>
                            {article.category && (
                              <Badge variant="secondary" className="text-xs">
                                {article.category}
                              </Badge>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(article.publishedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleFavorite(article)}
                            className={article.isFavorite ? 'text-red-500' : ''}
                          >
                            <Heart className={`w-4 h-4 ${article.isFavorite ? 'fill-current' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleSaved(article)}
                            className={article.isSaved ? 'text-yellow-500' : ''}
                          >
                            <Bookmark className={`w-4 h-4 ${article.isSaved ? 'fill-current' : ''}`} />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArticleClick(article)}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
        </div>

        {/* Empty State */}
        {articles.length === 0 && !loading && (
          <Card className="text-center py-12">
            <CardContent>
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Articles Yet</h3>
              <p className="text-muted-foreground mb-6">
                Click "Refresh" to fetch news based on your interests!
              </p>
              <Button onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Fetch News
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Interests Management Modal */}
      <Dialog open={interestsModalOpen} onOpenChange={setInterestsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Manage Your Interests</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {userInterests ? (
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    Topics
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {userInterests.topics && userInterests.topics.length > 0 ? (
                      userInterests.topics.map((topic, idx) => (
                        <Badge key={idx} variant="secondary" className="text-sm">
                          {topic}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No topics set</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Keywords
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {userInterests.keywords && userInterests.keywords.length > 0 ? (
                      userInterests.keywords.map((keyword, idx) => (
                        <Badge key={idx} variant="outline" className="text-sm">
                          {keyword}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No keywords set</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Filter className="w-4 h-4 text-blue-500" />
                    Categories
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {userInterests.categories && userInterests.categories.length > 0 ? (
                      userInterests.categories.map((category, idx) => (
                        <Badge key={idx} variant="default" className="text-sm">
                          {category}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No categories set</p>
                    )}
                  </div>
                </div>
                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Refresh Interval:</span>
                    <span className="font-medium">Every {userInterests.refreshInterval} minutes</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Auto-fetch:</span>
                    <Badge variant={userInterests.autoFetchEnabled ? 'default' : 'secondary'}>
                      {userInterests.autoFetchEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Max Articles per Fetch:</span>
                    <span className="font-medium">{userInterests.maxArticlesPerFetch}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Loading Interests...</h3>
                <p className="text-sm text-muted-foreground">
                  We're fetching your personalized settings
                </p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewsHubPage;
