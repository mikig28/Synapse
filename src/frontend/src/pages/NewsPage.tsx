import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Trash2,
  Search,
  Filter,
  TrendingUp,
  Clock,
  User,
  Star,
  Eye,
  EyeOff,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NewsPage: React.FC = () => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [statistics, setStatistics] = useState<NewsStatistics | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    isRead: undefined as boolean | undefined,
    isFavorite: undefined as boolean | undefined,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [currentPage, filters]);

  useEffect(() => {
    fetchCategories();
    fetchStatistics();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, pagination } = await newsService.getNewsItems({
        page: currentPage,
        limit: 20,
        ...filters,
      });
      
      setNewsItems(data);
      setTotalPages(pagination.totalPages);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch news items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await newsService.getNewsCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
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

  const handleToggleRead = async (newsItem: NewsItem) => {
    try {
      if (!newsItem.isRead) {
        await newsService.markAsRead(newsItem._id);
        setNewsItems(prev => prev.map(item => 
          item._id === newsItem._id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
        ));
        toast({ title: 'Marked as read' });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to mark as read',
        variant: 'destructive',
      });
    }
  };

  const handleToggleFavorite = async (newsItem: NewsItem) => {
    try {
      const updated = await newsService.toggleFavorite(newsItem._id);
      setNewsItems(prev => prev.map(item => 
        item._id === newsItem._id ? updated : item
      ));
      toast({ 
        title: updated.isFavorite ? 'Added to favorites' : 'Removed from favorites' 
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to toggle favorite',
        variant: 'destructive',
      });
    }
  };

  const handleArchive = async (newsItem: NewsItem) => {
    try {
      const isArchived = newsItem.status === 'archived';
      await newsService.archiveNewsItem(newsItem._id, !isArchived);
      setNewsItems(prev => prev.map(item => 
        item._id === newsItem._id ? { ...item, status: isArchived ? 'pending' : 'archived' } : item
      ));
      toast({ 
        title: isArchived ? 'Unarchived' : 'Archived' 
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to archive item',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (newsId: string) => {
    try {
      await newsService.deleteNewsItem(newsId);
      setNewsItems(prev => prev.filter(item => item._id !== newsId));
      toast({ title: 'News item deleted' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete news item',
        variant: 'destructive',
      });
    }
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

  const getSentimentBadge = (sentiment?: string) => {
    if (!sentiment) return null;
    
    const variants = {
      positive: 'default',
      neutral: 'secondary',
      negative: 'destructive',
    } as const;

    return (
      <Badge variant={variants[sentiment as keyof typeof variants]} className="text-xs">
        {sentiment}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      <div className="relative z-10 container mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full">
              <Newspaper className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
                News Feed
              </h1>
              <p className="text-muted-foreground">
                AI-curated news articles from your agents
              </p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{statistics.totalItems}</div>
                <div className="text-sm text-muted-foreground">Total Articles</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-500">{statistics.unreadItems}</div>
                <div className="text-sm text-muted-foreground">Unread</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-500">{statistics.favoriteItems}</div>
                <div className="text-sm text-muted-foreground">Favorites</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-500">{statistics.last24Hours}</div>
                <div className="text-sm text-muted-foreground">Last 24h</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search articles..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label>Category</Label>
                <Select value={filters.category || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value === 'all' ? '' : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Read Status</Label>
                <Select value={filters.isRead === undefined ? 'all' : filters.isRead.toString()} onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  isRead: value === 'all' ? undefined : value === 'true' 
                }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All articles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All articles</SelectItem>
                    <SelectItem value="false">Unread only</SelectItem>
                    <SelectItem value="true">Read only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Favorites</Label>
                <Select value={filters.isFavorite === undefined ? 'all' : filters.isFavorite.toString()} onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  isFavorite: value === 'all' ? undefined : value === 'true' 
                }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All articles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All articles</SelectItem>
                    <SelectItem value="true">Favorites only</SelectItem>
                    <SelectItem value="false">Non-favorites</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* News Items */}
        <div className="space-y-4">
          {newsItems.map((item) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group"
            >
              <Card className={`hover:shadow-lg transition-all duration-300 hover:border-primary/30 ${!item.isRead ? 'border-l-4 border-l-blue-500' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Image */}
                    {item.urlToImage && (
                      <div className="flex-shrink-0">
                        <img
                          src={item.urlToImage}
                          alt={item.title}
                          className="w-24 h-24 object-cover rounded-lg"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold line-clamp-2 mb-1">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-primary transition-colors"
                              onClick={() => handleToggleRead(item)}
                            >
                              {item.title}
                            </a>
                          </h3>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <span>{item.source.name}</span>
                            {item.author && (
                              <>
                                <span>•</span>
                                <span>{item.author}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{formatTimeAgo(item.publishedAt)}</span>
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            {item.category && (
                              <Badge variant="outline" className="text-xs">
                                {item.category}
                              </Badge>
                            )}
                            {getSentimentBadge(item.sentiment)}
                            {item.relevanceScore && item.relevanceScore > 0.7 && (
                              <Badge variant="default" className="text-xs">
                                High Relevance
                              </Badge>
                            )}
                            {item.status === 'archived' && (
                              <Badge variant="secondary" className="text-xs">
                                Archived
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleToggleRead(item)}>
                              {item.isRead ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                              {item.isRead ? 'Mark as unread' : 'Mark as read'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleFavorite(item)}>
                              <Heart className={`w-4 h-4 mr-2 ${item.isFavorite ? 'fill-current text-red-500' : ''}`} />
                              {item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchive(item)}>
                              <Archive className="w-4 h-4 mr-2" />
                              {item.status === 'archived' ? 'Unarchive' : 'Archive'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(item.url, '_blank')}>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Open article
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(item._id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Description/Summary */}
                      {(item.summary || item.description) && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {item.summary || item.description}
                        </p>
                      )}

                      {/* Quick Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleFavorite(item)}
                          className={item.isFavorite ? 'text-red-500' : ''}
                        >
                          <Heart className={`w-4 h-4 ${item.isFavorite ? 'fill-current' : ''}`} />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(item.url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>

                        {!item.isRead && (
                          <Badge variant="secondary" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {newsItems.length === 0 && !loading && (
          <Card className="text-center py-12">
            <CardContent>
              <Newspaper className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No News Articles</h3>
              <p className="text-muted-foreground mb-6">
                Your AI agents haven't found any articles yet. Create some news agents to start curating content!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            
            <span className="text-sm text-muted-foreground px-4">
              Page {currentPage} of {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsPage;