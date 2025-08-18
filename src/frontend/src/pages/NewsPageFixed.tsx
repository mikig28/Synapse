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
  Eye,
  Bot,
  MessageSquare,
  Briefcase,
  ChevronLeft,
  AlertCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const NewsPageFixed: React.FC = () => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [statistics, setStatistics] = useState<NewsStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<NewsItem | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [filters, setFilters] = useState({
    runId: undefined as string | undefined,
  });
  const { toast } = useToast();

  // Check for runId in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const runId = urlParams.get('runId');
    if (runId) {
      setFilters({ runId });
      toast({
        title: 'Agent Report',
        description: 'Showing results from specific agent execution',
      });
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [currentPage, filters]);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('📡 Fetching news data...');
      
      const { data, pagination } = await newsService.getNewsItems({
        page: currentPage,
        limit: 20,
        ...filters,
      });
      
      console.log('📰 News data received:', {
        count: data.length,
        items: data,
        pagination
      });
      
      // Add debug info to each item
      const itemsWithDebug = data.map(item => {
        const isInternal = item.url?.startsWith('#') || !item.url?.startsWith('http');
        console.log(`📄 Item "${item.title}":`, {
          url: item.url,
          isInternal,
          hasContent: !!item.content,
          contentLength: item.content?.length || 0,
          source: item.source
        });
        return item;
      });
      
      setNewsItems(itemsWithDebug);
      setTotalPages(pagination.totalPages);
    } catch (error: any) {
      console.error('❌ Failed to fetch news:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch news items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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

  const handleItemClick = (item: NewsItem) => {
    console.log('👆 Item clicked:', {
      title: item.title,
      url: item.url,
      hasContent: !!item.content,
      contentPreview: item.content?.substring(0, 100)
    });

    const isInternal = item.url?.startsWith('#') || !item.url?.startsWith('http');
    
    if (isInternal || item.source?.id === 'crewai_analysis') {
      console.log('📖 Opening modal for internal content');
      setSelectedContent(item);
      setContentModalOpen(true);
      
      // Double-check modal state
      setTimeout(() => {
        console.log('Modal state after setting:', {
          isOpen: contentModalOpen,
          hasContent: !!selectedContent,
          contentTitle: selectedContent?.title
        });
      }, 100);
    } else {
      console.log('🔗 Opening external URL:', item.url);
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleToggleFavorite = async (item: NewsItem) => {
    try {
      const updated = await newsService.toggleFavorite(item._id);
      setNewsItems(prev => prev.map(i => i._id === item._id ? updated : i));
      toast({ 
        title: updated.isFavorite ? 'Added to favorites' : 'Removed from favorites' 
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to toggle favorite',
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

  const getSourceIcon = (sourceId: string) => {
    switch (sourceId) {
      case 'reddit':
        return '🔴';
      case 'linkedin':
        return <Briefcase className="w-3 h-3 text-blue-600" />;
      case 'telegram':
        return <MessageSquare className="w-3 h-3 text-blue-500" />;
      case 'crewai_analysis':
        return <Bot className="w-3 h-3 text-purple-500" />;
      default:
        return <Newspaper className="w-3 h-3 text-gray-600" />;
    }
  };

  // Test function to create dummy content
  const createTestItem = () => {
    const testItem: NewsItem = {
      _id: 'test-modal-' + Date.now(),
      title: '🧪 Test Modal Report',
      description: 'This is a test to verify the modal is working',
      content: `## Test Report Content

This is a test report to verify that the modal is working properly.

### If you can see this:
✅ The modal system is working
✅ Content is being displayed
✅ The issue might be with the actual data

### Debugging Info:
- Modal opened at: ${new Date().toISOString()}
- Test ID: ${Date.now()}

### Next Steps:
1. Check if your real reports have content
2. Verify the URL pattern (should start with #)
3. Check browser console for errors`,
      url: '#test-modal',
      source: { id: 'test', name: 'Test System' },
      author: 'Debug System',
      publishedAt: new Date().toISOString(),
      category: 'Test',
      tags: ['test', 'debug'],
      isRead: false,
      isFavorite: false,
      userId: 'test-user'
    } as NewsItem;

    console.log('🧪 Creating test item:', testItem);
    setSelectedContent(testItem);
    setContentModalOpen(true);
  };

  return (
    <div className="bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Newspaper className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">
                {filters.runId ? 'Agent Report' : 'News Feed'}
              </h1>
              <p className="text-muted-foreground">
                {loading ? 'Loading...' : `${newsItems.length} items`}
              </p>
            </div>
          </div>
          
          {/* Debug Controls */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDebugMode(!debugMode)}
              size="sm"
            >
              {debugMode ? 'Hide' : 'Show'} Debug
            </Button>
            <Button
              variant="outline"
              onClick={createTestItem}
              size="sm"
              className="bg-yellow-50 hover:bg-yellow-100"
            >
              Test Modal
            </Button>
            {filters.runId && (
              <Button
                variant="outline"
                onClick={() => {
                  window.history.pushState({}, '', '/news');
                  setFilters({ runId: undefined });
                }}
                size="sm"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
          </div>
        </div>

        {/* Debug Panel */}
        {debugMode && (
          <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Debug Information
              </h3>
              <div className="text-sm space-y-1">
                <p>Modal Open: {contentModalOpen ? '✅ Yes' : '❌ No'}</p>
                <p>Selected Content: {selectedContent ? `✅ ${selectedContent.title}` : '❌ None'}</p>
                <p>Total Items: {newsItems.length}</p>
                <p>Internal Items: {newsItems.filter(i => i.url?.startsWith('#')).length}</p>
                <p>CrewAI Reports: {newsItems.filter(i => i.source?.id === 'crewai_analysis').length}</p>
                <p>Items with Content: {newsItems.filter(i => !!i.content).length}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{statistics.totalItems}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{statistics.unreadItems}</div>
                <div className="text-sm text-muted-foreground">Unread</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{statistics.favoriteItems}</div>
                <div className="text-sm text-muted-foreground">Favorites</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{statistics.last24Hours}</div>
                <div className="text-sm text-muted-foreground">Last 24h</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* News Items */}
        <div className="space-y-4">
          {newsItems.map((item) => {
            const isInternal = item.url?.startsWith('#') || !item.url?.startsWith('http');
            
            return (
              <Card key={item._id} className="hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          {getSourceIcon(item.source?.id || '')}
                          {item.source?.name}
                        </span>
                        <span>•</span>
                        <span>{formatTimeAgo(item.publishedAt)}</span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                      )}
                      
                      {/* Debug info for each item */}
                      {debugMode && (
                        <div className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2">
                          <p>URL: {item.url}</p>
                          <p>Is Internal: {isInternal ? 'Yes' : 'No'}</p>
                          <p>Has Content: {item.content ? `Yes (${item.content.length} chars)` : 'No'}</p>
                          <p>Source ID: {item.source?.id}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFavorite(item)}
                      >
                        <Heart className={`w-4 h-4 ${item.isFavorite ? 'fill-current text-red-500' : ''}`} />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleItemClick(item)}
                        className={isInternal ? 'bg-purple-50 hover:bg-purple-100' : ''}
                      >
                        {isInternal ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <ExternalLink className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {!loading && newsItems.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Newspaper className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No News Articles</h3>
              <p className="text-muted-foreground">
                No news items found. Try running your agents to generate reports.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Content Modal */}
        <Dialog 
          open={contentModalOpen} 
          onOpenChange={(open) => {
            console.log('📝 Modal state changing to:', open);
            setContentModalOpen(open);
            if (!open) {
              setSelectedContent(null);
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Newspaper className="w-5 h-5" />
                {selectedContent?.title || 'No Title'}
              </DialogTitle>
              <DialogDescription>
                {selectedContent?.source?.name} • {selectedContent?.publishedAt ? formatTimeAgo(selectedContent.publishedAt) : ''}
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {/* Debug info in modal */}
                {debugMode && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded text-xs">
                    <p>Content exists: {selectedContent?.content ? 'Yes' : 'No'}</p>
                    <p>Content length: {selectedContent?.content?.length || 0} characters</p>
                    <p>URL: {selectedContent?.url}</p>
                  </div>
                )}
                
                {/* Main content */}
                {selectedContent?.content ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedContent.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                    <p className="text-lg font-semibold mb-2">No Content Available</p>
                    <p className="text-sm text-muted-foreground">
                      This report doesn't have any content to display.
                    </p>
                    {selectedContent?.description && (
                      <div className="mt-4 p-4 bg-muted rounded">
                        <p className="text-sm">{selectedContent.description}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Tags */}
                {selectedContent?.tags && selectedContent.tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap pt-4">
                    {selectedContent.tags.map(tag => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setContentModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default NewsPageFixed;