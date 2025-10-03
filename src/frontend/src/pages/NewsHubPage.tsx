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
  Zap,
  X,
  Plus
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
  const [editingInterests, setEditingInterests] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [interestsLoaded, setInterestsLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserInterests();
  }, []);

  useEffect(() => {
    if (interestsLoaded && userInterests) {
      fetchData();
      fetchStats();
      fetchTrendingTopics();
    }
  }, [currentPage, filters, interestsLoaded, userInterests]);

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
        setInterestsLoaded(true);
        
        // Check if user has configured their interests
        const hasTopics = response.data.topics && response.data.topics.length > 0;
        const hasKeywords = response.data.keywords && response.data.keywords.length > 0;
        const hasCategories = response.data.categories && response.data.categories.length > 0;
        
        // Show onboarding if no interests configured
        if (!hasTopics && !hasKeywords && !hasCategories) {
          setShowOnboarding(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user interests:', error);
      setInterestsLoaded(true);
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

  const handleAddTopic = async () => {
    if (!newTopic.trim()) return;

    try {
      const updatedInterests = {
        ...userInterests,
        topics: [...(userInterests?.topics || []), newTopic.trim()]
      };
      const response = await newsHubService.updateInterests(updatedInterests);
      if (response.success && response.data) {
        setUserInterests(response.data);
        setNewTopic('');
        toast({ title: 'Topic added successfully' });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to add topic',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveTopic = async (topic: string) => {
    try {
      const updatedInterests = {
        ...userInterests,
        topics: userInterests?.topics.filter(t => t !== topic) || []
      };
      const response = await newsHubService.updateInterests(updatedInterests);
      if (response.success && response.data) {
        setUserInterests(response.data);
        toast({ title: 'Topic removed' });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to remove topic',
        variant: 'destructive'
      });
    }
  };

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return;

    try {
      const updatedInterests = {
        ...userInterests,
        keywords: [...(userInterests?.keywords || []), newKeyword.trim()]
      };
      const response = await newsHubService.updateInterests(updatedInterests);
      if (response.success && response.data) {
        setUserInterests(response.data);
        setNewKeyword('');
        toast({ title: 'Keyword added successfully' });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to add keyword',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveKeyword = async (keyword: string) => {
    try {
      const updatedInterests = {
        ...userInterests,
        keywords: userInterests?.keywords.filter(k => k !== keyword) || []
      };
      const response = await newsHubService.updateInterests(updatedInterests);
      if (response.success && response.data) {
        setUserInterests(response.data);
        toast({ title: 'Keyword removed' });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to remove keyword',
        variant: 'destructive'
      });
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      const updatedInterests = {
        ...userInterests,
        categories: [...(userInterests?.categories || []), newCategory.trim()]
      };
      const response = await newsHubService.updateInterests(updatedInterests);
      if (response.success && response.data) {
        setUserInterests(response.data);
        setNewCategory('');
        toast({ title: 'Category added successfully' });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to add category',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveCategory = async (category: string) => {
    try {
      const updatedInterests = {
        ...userInterests,
        categories: userInterests?.categories.filter(c => c !== category) || []
      };
      const response = await newsHubService.updateInterests(updatedInterests);
      if (response.success && response.data) {
        setUserInterests(response.data);
        toast({ title: 'Category removed' });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to remove category',
        variant: 'destructive'
      });
    }
  };

  const handleCompleteOnboarding = async () => {
    // Validate that user has set at least one interest
    const hasTopics = userInterests?.topics && userInterests.topics.length > 0;
    const hasKeywords = userInterests?.keywords && userInterests.keywords.length > 0;
    const hasCategories = userInterests?.categories && userInterests.categories.length > 0;

    if (!hasTopics && !hasKeywords && !hasCategories) {
      toast({
        title: 'Set Your Interests',
        description: 'Please add at least one topic, keyword, or category to continue.',
        variant: 'destructive'
      });
      return;
    }

    setShowOnboarding(false);
    toast({
      title: 'Welcome to News Hub!',
      description: 'Your personalized news feed is ready. Click "Refresh" to fetch articles.'
    });
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
      {/* Onboarding Screen */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-3xl"
          >
            <Card className="border-2 border-primary/20">
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full w-20 h-20 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-blue-500" />
                </div>
                <CardTitle className="text-3xl">Welcome to News Hub!</CardTitle>
                <CardDescription className="text-lg">
                  Let's personalize your news feed. Tell us what topics and keywords interest you,
                  and we'll fetch relevant articles from around the web.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ScrollArea className="max-h-[50vh] pr-4">
                  <div className="space-y-6">
                    {/* Topics Section */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        Topics <span className="text-xs text-muted-foreground">(e.g., AI, Blockchain, Space)</span>
                      </h4>
                      <div className="flex gap-2 mb-3">
                        <Input
                          placeholder="Add a topic..."
                          value={newTopic}
                          onChange={(e) => setNewTopic(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddTopic()}
                        />
                        <Button onClick={handleAddTopic} size="sm">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 min-h-[2rem]">
                        {userInterests?.topics && userInterests.topics.length > 0 ? (
                          userInterests.topics.map((topic, idx) => (
                            <Badge key={idx} variant="secondary" className="text-sm flex items-center gap-1">
                              {topic}
                              <button
                                onClick={() => handleRemoveTopic(topic)}
                                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No topics added yet</p>
                        )}
                      </div>
                    </div>

                    {/* Keywords Section */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        Keywords <span className="text-xs text-muted-foreground">(e.g., startup, innovation, climate)</span>
                      </h4>
                      <div className="flex gap-2 mb-3">
                        <Input
                          placeholder="Add a keyword..."
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                        />
                        <Button onClick={handleAddKeyword} size="sm">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 min-h-[2rem]">
                        {userInterests?.keywords && userInterests.keywords.length > 0 ? (
                          userInterests.keywords.map((keyword, idx) => (
                            <Badge key={idx} variant="outline" className="text-sm flex items-center gap-1">
                              {keyword}
                              <button
                                onClick={() => handleRemoveKeyword(keyword)}
                                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No keywords added yet</p>
                        )}
                      </div>
                    </div>

                    {/* Categories Section */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Filter className="w-4 h-4 text-blue-500" />
                        Categories <span className="text-xs text-muted-foreground">(e.g., technology, business, health)</span>
                      </h4>
                      <div className="flex gap-2 mb-3">
                        <Input
                          placeholder="Add a category..."
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                        />
                        <Button onClick={handleAddCategory} size="sm">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 min-h-[2rem]">
                        {userInterests?.categories && userInterests.categories.length > 0 ? (
                          userInterests.categories.map((category, idx) => (
                            <Badge key={idx} variant="default" className="text-sm flex items-center gap-1">
                              {category}
                              <button
                                onClick={() => handleRemoveCategory(category)}
                                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No categories added yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="pt-4 border-t flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Add at least one topic, keyword, or category to get started
                  </p>
                  <Button 
                    onClick={handleCompleteOnboarding}
                    className="bg-gradient-to-r from-blue-500 to-purple-500"
                    size="lg"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Get Started
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setShowOnboarding(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Setup Interests</span>
              <span className="sm:hidden">Setup</span>
            </Button>
            <Button
              onClick={() => setInterestsModalOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Manage Interests</span>
              <span className="sm:hidden">Manage</span>
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
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Add a topic (e.g., AI, Blockchain)"
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTopic()}
                    />
                    <Button onClick={handleAddTopic} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {userInterests.topics && userInterests.topics.length > 0 ? (
                      userInterests.topics.map((topic, idx) => (
                        <Badge key={idx} variant="secondary" className="text-sm flex items-center gap-1">
                          {topic}
                          <button
                            onClick={() => handleRemoveTopic(topic)}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
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
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Add a keyword (e.g., startup, innovation)"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                    />
                    <Button onClick={handleAddKeyword} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {userInterests.keywords && userInterests.keywords.length > 0 ? (
                      userInterests.keywords.map((keyword, idx) => (
                        <Badge key={idx} variant="outline" className="text-sm flex items-center gap-1">
                          {keyword}
                          <button
                            onClick={() => handleRemoveKeyword(keyword)}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
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
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Add a category (e.g., technology, business)"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                    />
                    <Button onClick={handleAddCategory} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {userInterests.categories && userInterests.categories.length > 0 ? (
                      userInterests.categories.map((category, idx) => (
                        <Badge key={idx} variant="default" className="text-sm flex items-center gap-1">
                          {category}
                          <button
                            onClick={() => handleRemoveCategory(category)}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
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
