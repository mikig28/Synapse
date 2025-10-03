import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { newsHubService } from '../services/newsHubService';
import { whatsappService } from '../services/whatsappService';
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
  Plus,
  Send
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PushArticleModal } from '@/components/NewsHub/PushArticleModal';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import type { AutoPushSettings } from '@/types/newsHub';

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
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedCategory, setNewFeedCategory] = useState('general');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [interestsLoaded, setInterestsLoaded] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [autoFetchEnabled, setAutoFetchEnabled] = useState(true);
  const [maxArticlesPerFetch, setMaxArticlesPerFetch] = useState(50);
  const [pushArticleModalOpen, setPushArticleModalOpen] = useState(false);
  const [selectedArticleToPush, setSelectedArticleToPush] = useState<RealNewsArticle | null>(null);
  const [whatsappGroups, setWhatsappGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [autoPushEnabled, setAutoPushEnabled] = useState(false);
  const [autoPushPlatform, setAutoPushPlatform] = useState<'telegram' | 'whatsapp' | null>(null);
  const [autoPushWhatsappGroupId, setAutoPushWhatsappGroupId] = useState<string>('');
  const [autoPushMinRelevanceScore, setAutoPushMinRelevanceScore] = useState(0.5);
  const { toast} = useToast();

  useEffect(() => {
    fetchUserInterests();
    fetchWhatsAppGroups();
  }, []);

  const fetchWhatsAppGroups = async () => {
    try {
      const groups = await whatsappService.getAvailableGroups();
      setWhatsappGroups(groups.filter(g => g.isGroup));
    } catch (error) {
      console.error('Failed to fetch WhatsApp groups:', error);
    }
  };

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
      console.error('Failed to fetch news feed:', error);
      
      // Don't show error toast if it's just a 404 (no articles yet)
      if (error?.response?.status !== 404) {
        toast({
          title: 'Error',
          description: 'Failed to fetch news feed. Please try again.',
          variant: 'destructive'
        });
      }
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

        // Initialize local state with user preferences
        setRefreshInterval(response.data.refreshInterval || 30);
        setAutoFetchEnabled(response.data.autoFetchEnabled ?? true);
        setMaxArticlesPerFetch(response.data.maxArticlesPerFetch || 50);
        
        // Initialize auto-push settings
        if (response.data.autoPush) {
          setAutoPushEnabled(response.data.autoPush.enabled || false);
          setAutoPushPlatform(response.data.autoPush.platform || null);
          setAutoPushWhatsappGroupId(response.data.autoPush.whatsappGroupId || '');
          setAutoPushMinRelevanceScore(response.data.autoPush.minRelevanceScore || 0.5);
        }

        // Check if user has configured their interests
        const hasTopics = response.data.topics && response.data.topics.length > 0;
        const hasKeywords = response.data.keywords && response.data.keywords.length > 0;
        const hasCategories = response.data.categories && response.data.categories.length > 0;

        // Show onboarding if no interests configured
        if (!hasTopics && !hasKeywords && !hasCategories) {
          setShowOnboarding(true);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch user interests:', error);
      console.error('Error details:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message
      });
      
      // If 404, it means user interests don't exist yet - show onboarding
      if (error?.response?.status === 404 || error?.message?.includes('404')) {
        setShowOnboarding(true);
        setInterestsLoaded(true);
      } else if (error?.response?.status === 401) {
        // User is not authenticated
        toast({
          title: 'Authentication Required',
          description: 'Please log in to access News Hub.',
          variant: 'destructive'
        });
        setInterestsLoaded(true);
      } else if (error?.message?.includes('Network Error') || error?.code === 'ERR_NETWORK') {
        // Network connectivity issue
        toast({
          title: 'Connection Error',
          description: 'Cannot connect to the server. Please check your internet connection.',
          variant: 'destructive'
        });
        setInterestsLoaded(true);
      } else if (error?.response?.status === 503 || error?.response?.data?.error?.includes('Database')) {
        // Database connection issue
        toast({
          title: 'Service Unavailable',
          description: 'The server is temporarily unavailable. Please try again in a few moments.',
          variant: 'destructive'
        });
        setInterestsLoaded(true);
      } else {
        // For other errors, show a more specific error message
        const errorMessage = error?.response?.data?.error || error?.message || 'An unknown error occurred';
        toast({
          title: 'Error',
          description: `Failed to load News Hub: ${errorMessage}`,
          variant: 'destructive'
        });
        setInterestsLoaded(true);
      }
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
      console.log('Adding topic:', newTopic.trim());
      console.log('Current interests:', userInterests);
      
      const response = await newsHubService.updateInterests({
        topics: [...(userInterests?.topics || []), newTopic.trim()]
      });
      
      console.log('Update response:', response);
      
      if (response.success && response.data) {
        setUserInterests(response.data);
        setNewTopic('');
        toast({ title: 'Topic added successfully' });
      } else {
        throw new Error(response.error || 'Update failed');
      }
    } catch (error: any) {
      console.error('Error adding topic - Full error:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Failed to add topic';
      
      if (error.response?.status === 401) {
        errorMessage = 'Please log in again. Your session may have expired.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleRemoveTopic = async (topic: string) => {
    try {
      const response = await newsHubService.updateInterests({
        topics: userInterests?.topics.filter(t => t !== topic) || []
      });
      if (response.success && response.data) {
        setUserInterests(response.data);
        toast({ title: 'Topic removed' });
      }
    } catch (error: any) {
      console.error('Error removing topic:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to remove topic',
        variant: 'destructive'
      });
    }
  };

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return;

    try {
      const response = await newsHubService.updateInterests({
        keywords: [...(userInterests?.keywords || []), newKeyword.trim()]
      });
      if (response.success && response.data) {
        setUserInterests(response.data);
        setNewKeyword('');
        toast({ title: 'Keyword added successfully' });
      }
    } catch (error: any) {
      console.error('Error adding keyword:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to add keyword',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveKeyword = async (keyword: string) => {
    try {
      const response = await newsHubService.updateInterests({
        keywords: userInterests?.keywords.filter(k => k !== keyword) || []
      });
      if (response.success && response.data) {
        setUserInterests(response.data);
        toast({ title: 'Keyword removed' });
      }
    } catch (error: any) {
      console.error('Error removing keyword:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to remove keyword',
        variant: 'destructive'
      });
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      const response = await newsHubService.updateInterests({
        categories: [...(userInterests?.categories || []), newCategory.trim()]
      });
      if (response.success && response.data) {
        setUserInterests(response.data);
        setNewCategory('');
        toast({ title: 'Category added successfully' });
      }
    } catch (error: any) {
      console.error('Error adding category:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to add category',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveCategory = async (category: string) => {
    try {
      const response = await newsHubService.updateInterests({
        categories: userInterests?.categories.filter(c => c !== category) || []
      });
      if (response.success && response.data) {
        setUserInterests(response.data);
        toast({ title: 'Category removed' });
      }
    } catch (error: any) {
      console.error('Error removing category:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to remove category',
        variant: 'destructive'
      });
    }
  };

  const handleAddCustomFeed = async () => {
    if (!newFeedName.trim() || !newFeedUrl.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both feed name and URL',
        variant: 'destructive'
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(newFeedUrl);
    } catch {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid RSS feed URL',
        variant: 'destructive'
      });
      return;
    }

    try {
      const customFeeds = userInterests?.customFeeds || [];
      const response = await newsHubService.updateInterests({
        customFeeds: [
          ...customFeeds,
          {
            name: newFeedName.trim(),
            url: newFeedUrl.trim(),
            category: newFeedCategory,
            enabled: true
          }
        ]
      });
      
      if (response.success && response.data) {
        setUserInterests(response.data);
        setNewFeedName('');
        setNewFeedUrl('');
        setNewFeedCategory('general');
        toast({ title: 'Custom feed added successfully' });
      }
    } catch (error: any) {
      console.error('Error adding custom feed:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to add custom feed',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveCustomFeed = async (feedUrl: string) => {
    try {
      const response = await newsHubService.updateInterests({
        customFeeds: userInterests?.customFeeds.filter(f => f.url !== feedUrl) || []
      });
      if (response.success && response.data) {
        setUserInterests(response.data);
        toast({ title: 'Custom feed removed' });
      }
    } catch (error: any) {
      console.error('Error removing custom feed:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to remove custom feed',
        variant: 'destructive'
      });
    }
  };

  const handleToggleFeedEnabled = async (feedUrl: string) => {
    try {
      const updatedFeeds = userInterests?.customFeeds.map(feed =>
        feed.url === feedUrl ? { ...feed, enabled: !feed.enabled } : feed
      ) || [];

      const response = await newsHubService.updateInterests({
        customFeeds: updatedFeeds
      });

      if (response.success && response.data) {
        setUserInterests(response.data);
        toast({ title: 'Feed status updated' });
      }
    } catch (error: any) {
      console.error('Error toggling feed:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to toggle feed',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateAutoPushSettings = async () => {
    try {
      const autoPushSettings: AutoPushSettings = {
        enabled: autoPushEnabled,
        platform: autoPushPlatform,
        whatsappGroupId: autoPushWhatsappGroupId,
        minRelevanceScore: autoPushMinRelevanceScore
      };

      await newsHubService.updateUserInterests({
        autoPush: autoPushSettings
      });

      toast({
        title: 'Success',
        description: 'Auto-push settings updated successfully'
      });
    } catch (error) {
      console.error('Failed to update auto-push settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update auto-push settings',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateRefreshSettings = async () => {
    try {
      const response = await newsHubService.updateInterests({
        refreshInterval,
        autoFetchEnabled,
        maxArticlesPerFetch
      });

      if (response.success && response.data) {
        setUserInterests(response.data);
        toast({
          title: 'Settings Updated',
          description: 'Your refresh preferences have been saved'
        });
      }
    } catch (error: any) {
      console.error('Error updating refresh settings:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update settings',
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

        {/* Quick Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Quick filters:</span>
          <Button
            variant={filters.isRead === false ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilters(prev => ({
              ...prev,
              isRead: prev.isRead === false ? undefined : false
            }))}
            className="h-8"
          >
            <Eye className="w-3 h-3 mr-1" />
            Unread
          </Button>
          <Button
            variant={filters.isRead === true ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilters(prev => ({
              ...prev,
              isRead: prev.isRead === true ? undefined : true
            }))}
            className="h-8"
          >
            <BookOpen className="w-3 h-3 mr-1" />
            Read
          </Button>
          <Button
            variant={filters.isSaved === true ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilters(prev => ({
              ...prev,
              isSaved: prev.isSaved === true ? undefined : true
            }))}
            className="h-8"
          >
            <Bookmark className="w-3 h-3 mr-1" />
            Saved
          </Button>
        </div>

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
                value={filters.category || 'all'}
                onValueChange={(value: string) => setFilters(prev => ({ ...prev, category: value === 'all' ? '' : value }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
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

            {/* Active Filters Summary */}
            {(filters.category || filters.isRead !== undefined || filters.isSaved !== undefined) && (
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {filters.category && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/20"
                    onClick={() => setFilters(prev => ({ ...prev, category: '' }))}
                  >
                    {filters.category}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                )}
                {filters.isRead !== undefined && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/20"
                    onClick={() => setFilters(prev => ({ ...prev, isRead: undefined }))}
                  >
                    {filters.isRead ? 'Read' : 'Unread'}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                )}
                {filters.isSaved !== undefined && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/20"
                    onClick={() => setFilters(prev => ({ ...prev, isSaved: undefined }))}
                  >
                    {filters.isSaved ? 'Saved' : 'Not saved'}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({
                    category: '',
                    source: '',
                    sortBy: 'relevance',
                    isRead: undefined,
                    isSaved: undefined
                  })}
                  className="text-xs h-7"
                >
                  Clear all
                </Button>
              </div>
            )}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedArticleToPush(article);
                              setPushArticleModalOpen(true);
                            }}
                            title="Push to Telegram or WhatsApp"
                          >
                            <Send className="w-4 h-4" />
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
                
                {/* Custom RSS Feeds Section */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-green-500" />
                    Custom RSS Feeds <span className="text-xs text-muted-foreground">(Add your own sources)</span>
                  </h4>
                  <div className="space-y-3 mb-3">
                    <Input
                      placeholder="Feed name (e.g., My Tech Blog)"
                      value={newFeedName}
                      onChange={(e) => setNewFeedName(e.target.value)}
                    />
                    <Input
                      placeholder="RSS Feed URL (e.g., https://example.com/feed.xml)"
                      value={newFeedUrl}
                      onChange={(e) => setNewFeedUrl(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Select value={newFeedCategory} onValueChange={setNewFeedCategory}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="science">Science</SelectItem>
                          <SelectItem value="sports">Sports</SelectItem>
                          <SelectItem value="entertainment">Entertainment</SelectItem>
                          <SelectItem value="health">Health</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={handleAddCustomFeed} size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Feed
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {userInterests.customFeeds && userInterests.customFeeds.length > 0 ? (
                      userInterests.customFeeds.map((feed, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={feed.enabled}
                              onChange={() => handleToggleFeedEnabled(feed.url)}
                              className="w-4 h-4 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{feed.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{feed.url}</p>
                            </div>
                            {feed.category && (
                              <Badge variant="outline" className="text-xs">
                                {feed.category}
                              </Badge>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveCustomFeed(feed.url)}
                            className="ml-2 p-1 hover:bg-destructive/20 rounded-full flex-shrink-0"
                          >
                            <X className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No custom feeds added yet</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Settings className="w-4 h-4 text-blue-500" />
                    Refresh Settings
                  </h4>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center justify-between">
                        <span>Refresh Interval (minutes)</span>
                        <span className="text-xs text-muted-foreground">15-1440 min</span>
                      </label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          min={15}
                          max={1440}
                          value={refreshInterval}
                          onChange={(e) => setRefreshInterval(Number(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          ({Math.floor(refreshInterval / 60)}h {refreshInterval % 60}m)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Max Articles per Fetch</label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          min={10}
                          max={200}
                          value={maxArticlesPerFetch}
                          onChange={(e) => setMaxArticlesPerFetch(Number(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          10-200
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Auto-fetch News</label>
                      <button
                        onClick={() => setAutoFetchEnabled(!autoFetchEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          autoFetchEnabled ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            autoFetchEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <Button
                      onClick={handleUpdateRefreshSettings}
                      className="w-full mt-2"
                      variant="default"
                    >
                      Save Refresh Settings
                    </Button>
                  </div>
                </div>

                {/* Auto-Push Settings */}
                <div className="pt-4 border-t space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Send className="w-4 h-4 text-purple-500" />
                    Auto-Push Settings
                  </h4>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-push-enable">Enable Auto-Push</Label>
                      <Switch
                        id="auto-push-enable"
                        checked={autoPushEnabled}
                        onCheckedChange={setAutoPushEnabled}
                      />
                    </div>

                    {autoPushEnabled && (
                      <>
                        <div className="space-y-2">
                          <Label>Platform</Label>
                          <RadioGroup
                            value={autoPushPlatform || ''}
                            onValueChange={(value) => setAutoPushPlatform(value as 'telegram' | 'whatsapp')}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="telegram" id="platform-telegram" />
                              <Label htmlFor="platform-telegram">Telegram Bot</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="whatsapp" id="platform-whatsapp" />
                              <Label htmlFor="platform-whatsapp">WhatsApp Group</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {autoPushPlatform === 'whatsapp' && (
                          <div className="space-y-2">
                            <Label>WhatsApp Group</Label>
                            <Select
                              value={autoPushWhatsappGroupId}
                              onValueChange={setAutoPushWhatsappGroupId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a group" />
                              </SelectTrigger>
                              <SelectContent>
                                {whatsappGroups.map((group) => (
                                  <SelectItem key={group.id} value={group.id}>
                                    {group.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>
                            Min Relevance Score: {Math.round(autoPushMinRelevanceScore * 100)}%
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Only push articles with relevance score above this threshold
                          </p>
                          <Slider
                            value={[autoPushMinRelevanceScore * 100]}
                            onValueChange={(value) => setAutoPushMinRelevanceScore(value[0] / 100)}
                            min={0}
                            max={100}
                            step={5}
                            className="w-full"
                          />
                        </div>

                        <div className="text-xs text-muted-foreground p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="font-medium mb-1">ℹ️ How it works:</p>
                          <p>When news is fetched, articles above your relevance threshold will be automatically sent to your selected destination.</p>
                        </div>
                      </>
                    )}

                    <Button
                      onClick={handleUpdateAutoPushSettings}
                      className="w-full mt-2"
                      variant="default"
                    >
                      Save Auto-Push Settings
                    </Button>
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

      {/* Push Article Modal */}
      <PushArticleModal
        article={selectedArticleToPush}
        open={pushArticleModalOpen}
        onOpenChange={setPushArticleModalOpen}
      />
    </div>
  );
};

export default NewsHubPage;
