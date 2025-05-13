import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ExternalLink, Info, MessageSquareText, Trash2, CalendarDays } from 'lucide-react';
import { getBookmarks, deleteBookmarkService } from '../services/bookmarkService';
import { BookmarkItemType } from '../types/bookmark';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ClientTweetCard } from '@/components/ui/TweetCard';
import LinkedInCard from '@/components/ui/LinkedInCard';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BookmarksPage: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkItemType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all'); // 'all', 'week', 'month'
  const { toast } = useToast();

  const fetchBookmarks = async () => {
    try {
      setLoading(true);
      const data = await getBookmarks();
      setBookmarks(data);
      setError(null);
    } catch (err) {
      setError('Failed to load bookmarks. Please ensure the backend is running and refresh.');
      console.error('Error fetching bookmarks:', err);
      toast({
        title: "Error",
        description: "Could not fetch bookmarks.",
        variant: "destructive",
      })
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const filteredBookmarks = useMemo(() => {
    const now = new Date();
    return bookmarks.filter(bookmark => {
      if (filter === 'all') return true;
      const bookmarkDate = new Date(bookmark.createdAt);
      if (filter === 'week') {
        const oneWeekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        return bookmarkDate >= oneWeekAgo;
      }
      if (filter === 'month') {
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        return bookmarkDate >= oneMonthAgo;
      }
      return true;
    });
  }, [bookmarks, filter]);

  const extractTweetId = (url: string): string | undefined => {
    if (url.includes('twitter.com') || url.includes('x.com')) {
      const match = url.match(/status\/(\d+)/);
      return match ? match[1] : undefined;
    }
    return undefined;
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    // Optional: Add a confirmation dialog here
    // if (!window.confirm("Are you sure you want to delete this bookmark?")) {
    //   return;
    // }
    try {
      await deleteBookmarkService(bookmarkId);
      setBookmarks(bookmarks.filter(bookmark => bookmark._id !== bookmarkId));
      toast({
        title: "Success",
        description: "Bookmark deleted successfully.",
      })
    } catch (err) {
      console.error(`Error deleting bookmark ${bookmarkId}:`, err);
      setError('Failed to delete bookmark.'); // Or use a toast for this error
      toast({
        title: "Error",
        description: "Failed to delete bookmark.",
        variant: "destructive",
      })
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Loading bookmarks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
        <Info className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Bookmarks</h1>
        <div className="flex items-center">
            <CalendarDays className="h-5 w-5 mr-2 text-muted-foreground" />
            <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="week">Past Week</SelectItem>
                    <SelectItem value="month">Past Month</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>
      {filteredBookmarks.length === 0 ? (
        <Alert className="max-w-2xl mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle>{filter === 'all' ? 'No Bookmarks Yet' : 'No Bookmarks Found'}</AlertTitle>
          <AlertDescription>
            {filter === 'all'
              ? "Looks like you haven't saved any bookmarks. Links you save from Telegram (X, LinkedIn) will appear here."
              : `No bookmarks found for the selected period (${filter}). Try a different filter or add more bookmarks!`}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBookmarks.map((bookmark) => {
            // Render X/Twitter Card
            if (bookmark.sourcePlatform === 'X' && bookmark.originalUrl) {
              const tweetId = extractTweetId(bookmark.originalUrl);
              if (tweetId) {
                // DEBUG for Tweet Card (can add later if needed)
                return (
                  <ClientTweetCard
                    key={bookmark._id}
                    id={tweetId}
                    className="shadow-lg hover:shadow-xl transition-shadow duration-300"
                    onDelete={() => handleDeleteBookmark(bookmark._id)} 
                  />
                );
              }
            }

            // Render LinkedIn Card
            if (bookmark.sourcePlatform === 'LinkedIn') {
               // DEBUG for LinkedIn Card (can add later if needed)
              return (
                <LinkedInCard 
                  key={bookmark._id}
                  bookmark={bookmark}
                  onDelete={handleDeleteBookmark}
                />
              );
            }

            // Fallback to generic card
            // DEBUG: Log formatted date for generic card
            const formattedDate = new Date(bookmark.createdAt).toLocaleString(undefined, { 
                year: 'numeric', month: 'numeric', day: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
            });
            console.log(`Generic Card - Bookmark ${bookmark._id} createdAt: ${bookmark.createdAt}, Formatted: ${formattedDate}`);

            return (
              <Card key={bookmark._id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                <CardHeader className="flex-grow">
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate max-w-[80%]" title={bookmark.originalUrl}>
                      {bookmark.fetchedTitle || bookmark.sourcePlatform}
                    </span>
                    {renderPlatformIcon(bookmark.sourcePlatform)}
                  </CardTitle>
                  <CardDescription>
                    {bookmark.fetchedDescription || 'No description available.'}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="p-4 pt-2 border-t mt-auto">
                  <div className="flex justify-between items-center w-full">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (bookmark.originalUrl) {
                            window.open(bookmark.originalUrl, '_blank');
                          }
                        }}
                        title="View Original"
                        className="text-xs"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" /> View Original
                      </Button>
                      <Button 
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteBookmark(bookmark._id)}
                        title="Delete Bookmark"
                        className="ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 w-full text-right">
                    Saved: {formattedDate}
                  </p>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BookmarksPage;

// Helper to render platform-specific icons for the generic card
const renderPlatformIcon = (platform: 'X' | 'LinkedIn' | 'Other') => {
  switch (platform) {
    case 'X':
      return <MessageSquareText className="h-5 w-5 text-blue-500 flex-shrink-0" />;
    case 'LinkedIn':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-700 flex-shrink-0">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
          <rect width="4" height="12" x="2" y="9"/>
          <circle cx="4" cy="4" r="2"/>
        </svg>
      );
    default:
      return null; // Or a generic link icon
  }
}; 