import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ExternalLink, Info, MessageSquareText, Trash2, CalendarDays, FileText, Zap, AlertCircle } from 'lucide-react';
import { getBookmarks, deleteBookmarkService, summarizeBookmarkById, summarizeLatestBookmarksService } from '../services/bookmarkService';
import { BookmarkItemType } from '../types/bookmark';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ClientTweetCard } from '@/components/ui/TweetCard';
import LinkedInCard from '@/components/ui/LinkedInCard';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useAuthStore from '@/store/authStore';
import { useDigest } from '../context/DigestContext';

const BookmarksPage: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkItemType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all'); // 'all', 'week', 'month'
  const [summarizingBookmarkId, setSummarizingBookmarkId] = useState<string | null>(null);
  const [isBatchSummarizing, setIsBatchSummarizing] = useState<boolean>(false);
  const { latestDigest, setLatestDigest } = useDigest();
  console.log('[BookmarksPage] Consuming latestDigest from context:', latestDigest); // Log for BookmarksPage
  const { toast } = useToast();
  const token = useAuthStore((state) => state.token);

  console.log("[BookmarksPage] Component rendered or re-rendered"); // General render log

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
    if (!token) return;
    fetchBookmarks();
  }, [token]);

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

  const handleSummarizeBookmark = async (bookmarkId: string) => {
    console.log(`[BookmarksPage] handleSummarizeBookmark called for ID: ${bookmarkId}`); // Log handler call
    setSummarizingBookmarkId(bookmarkId);
    try {
      const updatedBookmark = await summarizeBookmarkById(bookmarkId);
      setBookmarks(prevBookmarks => {
        const newBookmarks = prevBookmarks.map(b => b._id === bookmarkId ? updatedBookmark : b);
        console.log("[BookmarksPage] Bookmarks state after individual summarize:", newBookmarks.find(b => b._id === bookmarkId)); // Log the updated bookmark
        return newBookmarks;
      });
      toast({
        title: "Success",
        description: "Bookmark summarized successfully.",
      });
    } catch (err: any) {
      console.error(`Error summarizing bookmark ${bookmarkId}:`, err);
      // Update the specific bookmark's status to 'error' in the UI if possible
      // This assumes the error object from the service has a message property
      const errorMessage = err?.message || "Failed to summarize bookmark.";
      setBookmarks(prevBookmarks => 
        prevBookmarks.map(b => 
          b._id === bookmarkId ? { ...b, status: 'error', summary: `Error: ${errorMessage}` } : b
        )
      );
      toast({
        title: "Error Summarizing",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSummarizingBookmarkId(null);
    }
  };

  const handleSummarizeLatest = async () => {
    console.log("[BookmarksPage] handleSummarizeLatest called");
    setIsBatchSummarizing(true);
    setLatestDigest(null); 
    try {
      const response = await summarizeLatestBookmarksService();
      toast({
        title: "Batch Summarization Complete", 
        description: response.message,
      });
      
      console.log("[BookmarksPage] Response from summarizeLatestBookmarksService:", response); // Log the whole response

      if (response.comprehensiveSummary) {
        console.log("[BookmarksPage] Attempting to set latestDigest with:", response.comprehensiveSummary); // Log before setting
        setLatestDigest(response.comprehensiveSummary);
      } else {
        console.log("[BookmarksPage] No comprehensiveSummary received in response or it was empty.");
        // Set to a specific message if it's missing, so we know this path was taken
        setLatestDigest("No comprehensive summary was returned by the backend."); 
      }

      // Update local state for successfully summarized bookmarks
      // And potentially show errors for failed ones
      if (response.summarizedBookmarks && response.summarizedBookmarks.length > 0) {
        setBookmarks(prevBookmarks => {
          const newBookmarks = prevBookmarks.map(b => {
            const updated = response.summarizedBookmarks.find(sb => sb._id === b._id);
            return updated ? updated : b;
          });
          console.log("[BookmarksPage] Bookmarks state after BATCH summarize (updated portion):", 
            newBookmarks.filter(b => response.summarizedBookmarks.some(sb => sb._id === b._id))
          ); // Log all updated bookmarks from batch
          return newBookmarks;
        });
      }
      if (response.errors && response.errors.length > 0) {
        response.errors.forEach(err => {
          toast({
            title: `Error Summarizing Bookmark ID: ${err.bookmarkId}`,
            description: err.error,
            variant: "destructive",
          });
           setBookmarks(prevBookmarks => {
            const newBookmarks = prevBookmarks.map(b => {
              if (b._id === err.bookmarkId) {
                return { ...b, status: 'error' as 'error', summary: `Error: ${err.error}` };
              }
              return b;
            });
            console.log("[BookmarksPage] Bookmarks state after BATCH error update:", newBookmarks.find(b => b._id === err.bookmarkId));
            return newBookmarks;
          });
        });
      }
      // Optionally, refetch all bookmarks to ensure UI consistency if partial updates are complex
      // fetchBookmarks(); 
    } catch (err: any) {
      console.error("Error in handleSummarizeLatest:", err);
      toast({
        title: "Error Batch Summarizing",
        description: err?.message || "Failed to start batch summarization.",
        variant: "destructive",
      });
    } finally {
      setIsBatchSummarizing(false);
    }
  };

  if (loading) {
    console.log("[BookmarksPage] Rendering Loading State");
    return (
      <div className="flex justify-center items-center h-full">
        <p>Loading bookmarks...</p>
      </div>
    );
  }

  if (error) {
    console.log("[BookmarksPage] Rendering Error State:", error);
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
        <Info className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  console.log("[BookmarksPage] Filtered bookmarks before map:", filteredBookmarks); // Log filtered bookmarks array

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Bookmarks</h1>
        <div className="flex items-center space-x-2">
            <Button 
              onClick={handleSummarizeLatest}
              disabled={isBatchSummarizing || loading} // Also disable if main loading
              size="sm" 
            >
              {isBatchSummarizing ? (
                <><Zap className="w-4 h-4 mr-1 animate-spin" /> Summarizing Latest...</>
              ) : (
                <><FileText className="w-4 h-4 mr-1" /> Summarize Latest</> // Simplified button text
              )}
            </Button>
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
      </div>

      {/* Display Latest Digest */}
      {latestDigest && (
        <Card className="mb-6 bg-secondary/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Zap className="w-5 h-5 mr-2 text-purple-500" /> Latest Bookmarks Digest
              </span>
              <Button variant="ghost" size="sm" onClick={() => setLatestDigest(null)} title="Clear Digest">
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestDigest.startsWith("OPENAI_API_KEY not configured") || 
             latestDigest.startsWith("Failed to extract summary") || 
             latestDigest.startsWith("OpenAI API error") || 
             latestDigest.startsWith("Content was empty") ||
             latestDigest.startsWith("Could not generate a digest") ||
             latestDigest.startsWith("No valid content") ||
             latestDigest.startsWith("No new bookmarks") ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Digest Generation Issue</AlertTitle>
                <AlertDescription>{latestDigest}</AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {latestDigest}
              </p>
            )}
          </CardContent>
        </Card>
      )}

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
          {filteredBookmarks.map((bookmark, index) => {
            console.log(`[BookmarksPage] Mapping bookmark at index ${index}:`, bookmark);
            console.log(`[BookmarksPage] Bookmark ID ${bookmark._id} - Status: ${bookmark.status}, Summary: ${bookmark.summary}`);
            
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
                    onSummarize={() => handleSummarizeBookmark(bookmark._id)}
                    isSummarizing={summarizingBookmarkId === bookmark._id}
                    summaryStatus={bookmark.status}
                    summaryText={bookmark.summary}
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
            const formattedDate = new Date(bookmark.createdAt).toLocaleString(undefined, { 
                year: 'numeric', month: 'numeric', day: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
            });

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
                  {/* Display Summary if available */}
                  {bookmark.summary && (
                    <div className="mt-2 p-2 border-t">
                      <h4 className="text-sm font-semibold mb-1 flex items-center">
                        <FileText className="w-4 h-4 mr-1 flex-shrink-0" /> Summary
                      </h4>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {bookmark.summary}
                      </p>
                    </div>
                  )}
                  {bookmark.status === 'pending_summary' && !bookmark.summary && (
                     <p className="text-xs text-yellow-600 mt-2">Summarizing...</p>
                  )}
                </CardHeader>
                <CardFooter className="p-4 pt-2 border-t mt-auto">
                  <div className="flex justify-between items-center w-full">
                      <div className="flex space-x-2">
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
                          variant="outline"
                          size="sm"
                          onClick={() => handleSummarizeBookmark(bookmark._id)}
                          disabled={summarizingBookmarkId === bookmark._id || bookmark.status === 'summarized' || bookmark.status === 'pending_summary'}
                          title={bookmark.status === 'summarized' ? "Already Summarized" : "Summarize Content"}
                          className="text-xs"
                        >
                          {summarizingBookmarkId === bookmark._id ? (
                            <><Zap className="w-4 h-4 mr-1 animate-pulse" /> Summarizing...</>
                          ) : bookmark.status === 'summarized' ? (
                            <><FileText className="w-4 h-4 mr-1" /> Summarized</>
                          ) : (
                            <><FileText className="w-4 h-4 mr-1" /> Summarize</>
                          )}
                        </Button>
                      </div>
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