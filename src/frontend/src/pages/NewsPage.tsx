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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [selectedContent, setSelectedContent] = useState<NewsItem | null>(null);
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [relatedItems, setRelatedItems] = useState<NewsItem[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
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

  const isExternalUrl = (url: string): boolean => {
    return url.startsWith('http://') || url.startsWith('https://');
  };

  const isInternalContent = (url: string): boolean => {
    return url.startsWith('#') || !isExternalUrl(url);
  };

  const fetchRelatedItems = async (analysisItem: NewsItem) => {
    if (analysisItem.source.id !== 'crewai_analysis') return;
    
    setLoadingRelated(true);
    try {
      // Fetch items from the same time period with CrewAI tag
      const timeWindow = 5 * 60 * 1000; // 5 minutes
      const startTime = new Date(new Date(analysisItem.publishedAt).getTime() - timeWindow);
      const endTime = new Date(new Date(analysisItem.publishedAt).getTime() + timeWindow);
      
      const response = await newsService.getNewsItems({
        page: 1,
        limit: 100, // Get all related items
        tags: 'crewai',
        startDate: startTime.toISOString(),
        endDate: endTime.toISOString()
      });
      
      if (response.data) {
        // Filter out the analysis report itself and only show source items
        const sourceItems = response.data.filter(item => 
          item._id !== analysisItem._id && 
          item.source?.id &&
          ['reddit', 'linkedin', 'telegram', 'news_website'].includes(item.source.id)
        );
        setRelatedItems(sourceItems);
      }
    } catch (error) {
      console.error('Failed to fetch related items:', error);
      setRelatedItems([]);
    } finally {
      setLoadingRelated(false);
    }
  };

  const handleItemClick = async (item: NewsItem) => {
    if (isInternalContent(item.url)) {
      // For internal items (analysis reports, etc.), show content in modal
      setSelectedContent(item);
      setContentModalOpen(true);
      
      // If it's a CrewAI analysis report, fetch related items
      if (item.source.id === 'crewai_analysis') {
        await fetchRelatedItems(item);
      } else {
        setRelatedItems([]);
      }
    } else {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
    handleToggleRead(item);
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
                            {isInternalContent(item.url) ? (
                              <button
                                className="text-left hover:text-primary transition-colors"
                                onClick={() => handleItemClick(item)}
                              >
                                {item.title}
                              </button>
                            ) : (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary transition-colors"
                                onClick={() => handleToggleRead(item)}
                              >
                                {item.title}
                              </a>
                            )}
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
                            {isInternalContent(item.url) ? (
                              <DropdownMenuItem onClick={() => handleItemClick(item)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View content
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => window.open(item.url, '_blank')}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Open article
                              </DropdownMenuItem>
                            )}
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
                        
                        {isInternalContent(item.url) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleItemClick(item)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(item.url, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}

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

        {/* Content Modal for Internal Items */}
        <Dialog open={contentModalOpen} onOpenChange={(open) => {
          setContentModalOpen(open);
          if (!open) {
            setRelatedItems([]);
            setLoadingRelated(false);
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Newspaper className="w-5 h-5" />
                {selectedContent?.title}
              </DialogTitle>
            </DialogHeader>
            
            {selectedContent && (
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4">
                  {/* Article Info */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground border-b pb-3">
                    <span>{selectedContent.source.name}</span>
                    {selectedContent.author && (
                      <>
                        <span>•</span>
                        <span>{selectedContent.author}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{formatTimeAgo(selectedContent.publishedAt)}</span>
                  </div>

                  {/* Categories and Tags */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedContent.category && (
                      <Badge variant="outline" className="text-xs">
                        {selectedContent.category}
                      </Badge>
                    )}
                    {getSentimentBadge(selectedContent.sentiment)}
                    {selectedContent.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Description/Summary */}
                  {(selectedContent.summary || selectedContent.description) && (
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Summary</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedContent.summary || selectedContent.description}
                      </p>
                    </div>
                  )}

                  {/* Content */}
                  {selectedContent.content && (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <h4 className="font-medium mb-3">Full Content</h4>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {selectedContent.content}
                      </div>
                    </div>
                  )}

                  {/* Related Items - show for CrewAI analysis reports */}
                  {selectedContent.source.id === 'crewai_analysis' && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Source Items Analyzed ({relatedItems.length})
                      </h4>
                      
                      {loadingRelated ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          <span className="ml-2 text-sm text-muted-foreground">Loading source items...</span>
                        </div>
                      ) : relatedItems.length > 0 ? (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {relatedItems.map((item) => (
                            <div key={item._id} className="border rounded-lg p-3 bg-muted/10">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-sm line-clamp-2 mb-1">
                                    {item.title}
                                  </h5>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="secondary" className="text-xs">
                                      {item.source.name}
                                    </Badge>
                                    {item.author && <span>{item.author}</span>}
                                    <span>•</span>
                                    <span>{formatTimeAgo(item.publishedAt)}</span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (isInternalContent(item.url)) {
                                      setSelectedContent(item);
                                      setRelatedItems([]);
                                    } else {
                                      window.open(item.url, '_blank', 'noopener,noreferrer');
                                    }
                                  }}
                                >
                                  {isInternalContent(item.url) ? (
                                    <Eye className="w-3 h-3" />
                                  ) : (
                                    <ExternalLink className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                              
                              {item.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-1 mt-2 flex-wrap">
                                {item.tags?.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground py-4">
                          No related source items found for this analysis.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await handleToggleFavorite(selectedContent);
                        // Update the modal content to reflect changes
                        const updated = newsItems.find(item => item._id === selectedContent._id);
                        if (updated) setSelectedContent(updated);
                      }}
                      className={selectedContent.isFavorite ? 'text-red-500' : ''}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${selectedContent.isFavorite ? 'fill-current' : ''}`} />
                      {selectedContent.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await handleArchive(selectedContent);
                        // Update the modal content to reflect changes
                        const updated = newsItems.find(item => item._id === selectedContent._id);
                        if (updated) setSelectedContent(updated);
                      }}
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      {selectedContent.status === 'archived' ? 'Unarchive' : 'Archive'}
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default NewsPage;