import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ExternalLink, Info, MessageSquareText, Trash2, CalendarDays, FileText, Zap, AlertCircle, Volume2, Search, BookmarkPlus, CheckCircle, XCircle, Loader2, PlayCircle, StopCircle, Brain, ListFilter, ArrowUpDown, Link as LinkIcon } from 'lucide-react';
import { getBookmarks, deleteBookmarkService, summarizeBookmarkById, speakTextWithElevenLabs } from '../services/bookmarkService';
import { BookmarkItemType } from '../types/bookmark';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ClientTweetCard } from '@/components/ui/TweetCard';
import LinkedInCard from '@/components/ui/LinkedInCard';
import RedditCard from '@/components/ui/RedditCard';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useAuthStore from '@/store/authStore';
import { useDigest } from '../context/DigestContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const BookmarksPage: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkItemType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalBookmarks, setTotalBookmarks] = useState<number>(0);
  const PAGE_LIMIT = 10;

  const { ref: headerRef, isInView: headerInView } = useScrollAnimation();
  const { ref: controlsRef, isInView: controlsInView } = useScrollAnimation();
  const { ref: listRef, isInView: listInView } = useScrollAnimation();

  const [summarizingBookmarkId, setSummarizingBookmarkId] = useState<string | null>(null);
  const [playingBookmarkId, setPlayingBookmarkId] = useState<string | null>(null);
  const [audioErrorId, setAudioErrorId] = useState<string | null>(null);
  const {
    latestDigest,
    latestDigestSources,
    isBatchSummarizing,
    summarizeLatestBookmarks
  } = useDigest();
  const { toast } = useToast();
  const token = useAuthStore((state) => state.token);

  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  console.log("[BookmarksPage] Component rendered or re-rendered");
  
  // Debug log for component state
  useEffect(() => {
    console.log("[BookmarksPage] Current state:", {
      bookmarksLength: bookmarks.length,
      loading,
      error,
      token: token ? "Present" : "Not present",
      headerInView,
      controlsInView,
      listInView
    });
  }, [bookmarks, loading, error, token, headerInView, controlsInView, listInView]);

  // Add a ref to track the last page fetched
  const lastPageFetched = React.useRef<number | null>(null);
  
  const fetchBookmarksCallback = useCallback(async (pageToFetch: number = 1) => {
    if (!token) {
      console.log("[BookmarksPage] No token available, skipping API call");
      return;
    }
    console.log(`[BookmarksPage] Fetching bookmarks for page: ${pageToFetch}...`);
    setLoading(true);
    try {
      const response = await getBookmarks(pageToFetch, PAGE_LIMIT);
      console.log("[BookmarksPage] Fetched data:", JSON.stringify(response.data, null, 2));
      console.log("[BookmarksPage] API response structure:", {
        currentPage: response.currentPage,
        totalPages: response.totalPages,
        totalBookmarks: response.totalBookmarks,
        dataIsArray: Array.isArray(response.data),
        dataLength: response.data?.length || 0
      });
      
      // Ensure we always set a valid array
      const validBookmarks = Array.isArray(response.data) ? response.data : [];
      setBookmarks(validBookmarks);
      setCurrentPage(response.currentPage);
      setTotalPages(response.totalPages);
      setTotalBookmarks(response.totalBookmarks);
      setError(null);
    } catch (err) {
      console.error('[BookmarksPage] Error fetching bookmarks:', err);
      let errorMessage = 'Failed to load bookmarks. Please ensure the backend is running and refresh.';
      if (err instanceof Error) {
        console.error('[BookmarksPage] Error details:', err.message);
        errorMessage = `Error: ${err.message}`;
      }
      setError(errorMessage);
      toast({
        title: "Error Fetching Bookmarks",
        description: "Could not fetch bookmarks. The server might be down.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  // Add this useEffect to prevent framer-motion from unmounting the components
  useEffect(() => {
    // This effect is to ensure the component stays mounted
    console.log("[BookmarksPage] Ensuring component stability");
    
    // Force stable rendering after initial load
    if (!loading && bookmarks.length > 0) {
      const timer = setTimeout(() => {
        console.log("[BookmarksPage] Forcing stable render state");
        // Force a re-render without changing state values
        // by setting state to the same value
        setBookmarks([...bookmarks]);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [loading, bookmarks.length]);
  
  // Modify the fetchBookmarks useEffect
  useEffect(() => {
    console.log("[BookmarksPage] useEffect for fetchBookmarks triggered");
    
    // Check for token presence first
    if (!token) {
      console.error("[BookmarksPage] No authentication token available");
      setError("You must be logged in to view bookmarks. Please log in and try again.");
      setLoading(false);
      return;
    }
    
    // Fetch bookmarks only if we don't already have them
    if (bookmarks.length === 0 || currentPage !== lastPageFetched.current) {
      lastPageFetched.current = currentPage;
      fetchBookmarksCallback(currentPage).catch(err => {
        console.error("[BookmarksPage] Unhandled error in fetchBookmarks effect:", err);
        setError(`Failed to load bookmarks: ${err.message || "Unknown error"}`);
        setLoading(false);
      });
    } else {
      console.log("[BookmarksPage] Skipping fetch as we already have bookmarks for this page");
    }
  }, [fetchBookmarksCallback, currentPage, token, bookmarks.length]);

  // Add a new useEffect specifically for authentication status changes
  useEffect(() => {
    console.log("[BookmarksPage] Auth status check - token:", token ? "Present" : "Not present");
    if (!token) {
      setError("You must be logged in to view bookmarks. Please log in and try again.");
      setLoading(false);
    }
  }, [token]);

  const filteredAndSortedBookmarks = useMemo(() => {
    console.log("[BookmarksPage] Running filteredAndSortedBookmarks memo");
    
    // Early return an empty array if still loading
    if (loading && bookmarks.length === 0) {
      console.log("[BookmarksPage] Still loading, returning empty array for filtered bookmarks");
      return [];
    }
    
    // Protection for invalid bookmarks data - ensure we always return an array
    if (!Array.isArray(bookmarks) || bookmarks === null || bookmarks === undefined) {
      console.warn('[BookmarksPage] bookmarks is not a valid array in useMemo. Value:', bookmarks);
      return [];
    }
    
    // Debug original bookmarks
    console.log(`[BookmarksPage] Original bookmarks count: ${bookmarks.length}`);
    
    const now = new Date();
    let processedBookmarks = bookmarks.filter(bookmark => {
      // Add comprehensive null/undefined check for bookmark
      if (!bookmark || typeof bookmark !== 'object' || !bookmark._id) {
        console.warn("[BookmarksPage] Found invalid bookmark in bookmarks array:", bookmark);
        return false;
      }
      
      try {
        const bookmarkDate = new Date(bookmark.createdAt);
        const matchesFilter = 
          filter === 'all' ? true :
          filter === 'week' ? bookmarkDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7) :
          filter === 'month' ? bookmarkDate >= new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()) :
          filter === bookmark.sourcePlatform ? true :
          true;

        const matchesSearch = 
          searchTerm === '' ? true :
          bookmark.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bookmark.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bookmark.originalUrl?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bookmark.fetchedTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (bookmark.sourcePlatform === 'Reddit' && (
            bookmark.redditPostContent?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bookmark.redditAuthor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bookmark.redditSubreddit?.toLowerCase().includes(searchTerm.toLowerCase())
          ));

        return matchesFilter && matchesSearch;
      } catch (err) {
        console.error("[BookmarksPage] Error filtering bookmark:", err, "Bookmark:", bookmark);
        return false;
      }
    });

    const sortedBookmarks = processedBookmarks.sort((a, b) => {
      try {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } catch (err) {
        console.error("[BookmarksPage] Error sorting bookmarks:", err);
        return 0;
      }
    });
    
    // Debug processed bookmarks
    console.log(`[BookmarksPage] Filtered and sorted bookmarks count: ${sortedBookmarks.length}`);
    
    return sortedBookmarks;
  }, [bookmarks, filter, searchTerm, sortOrder, loading]);

  const isValidUrlWithHostname = (url: string | null | undefined): boolean => {
    if (!url || typeof url !== 'string' || url.trim() === '') return false;
    try {
      const parsed = new URL(url);
      return !!parsed.hostname;
    } catch (e) {
      return false;
    }
  };

  const extractTweetId = (url: string): string | undefined => {
    if (!url || typeof url !== 'string') return undefined;
    if (url.includes('twitter.com') || url.includes('x.com')) {
      const match = url.match(/status\/(\d+)/);
      return match && match[1] ? match[1] : undefined;
    }
    return undefined;
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      await deleteBookmarkService(bookmarkId);
      setBookmarks(prev => prev.filter(b => b._id !== bookmarkId));
      toast({
        title: "Bookmark Deleted",
        description: "The bookmark has been successfully removed.",
        variant: "default",
      });
    } catch (err) {
      console.error(`Error deleting bookmark ${bookmarkId}:`, err);
      toast({
        title: "Deletion Failed",
        description: "Could not delete the bookmark. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSummarizeBookmark = async (bookmarkId: string) => {
    setSummarizingBookmarkId(bookmarkId);
    try {
      const updatedBookmark = await summarizeBookmarkById(bookmarkId);
      setBookmarks(prevBookmarks =>
        prevBookmarks.map(b => b._id === bookmarkId ? { ...updatedBookmark, status: 'summarized' } : b)
      );
      toast({
        title: "Summary Generated",
        description: "Bookmark has been successfully summarized.",
        variant: "default",
      });
    } catch (err: any) {
      console.error(`Error summarizing bookmark ${bookmarkId}:`, err);
      const errorMessage = err?.message || "Failed to summarize bookmark.";
      setBookmarks(prevBookmarks =>
        prevBookmarks.map(b =>
          b._id === bookmarkId ? { ...b, status: 'error', summary: `Error: ${errorMessage}` } : b
        )
      );
      toast({
        title: "Summarization Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSummarizingBookmarkId(null);
    }
  };
  
  const handleSummarizeLatestClick = () => {
    console.log("[BookmarksPage] handleSummarizeLatestClick called, invoking context action.");
    summarizeLatestBookmarks(bookmarks, setBookmarks);
  };

  const handleSpeakSummary = async (bookmarkId: string, summaryText: string | undefined) => {
    console.log(`[handleSpeakSummary] Called for bookmarkId: ${bookmarkId}`);
    console.log(`[handleSpeakSummary] Initial summaryText: '${summaryText}'`);

    if (!summaryText) {
        console.log("[handleSpeakSummary] Condition: !summaryText is TRUE. Exiting.");
        toast({ title: "No Summary", description: "No summary available to play.", variant: "destructive" });
        return;
    }
    console.log("[handleSpeakSummary] Condition: !summaryText is FALSE. Proceeding.");

    if (currentAudio) {
      console.log("[handleSpeakSummary] Condition: currentAudio exists.");
      currentAudio.pause();
      URL.revokeObjectURL(currentAudio.src);
      setCurrentAudio(null);
      if (playingBookmarkId === bookmarkId) {
        console.log("[handleSpeakSummary] Condition: playingBookmarkId === bookmarkId is TRUE. Toggling off. Exiting.");
        setPlayingBookmarkId(null);
        return;
      }
      console.log("[handleSpeakSummary] Condition: playingBookmarkId === bookmarkId is FALSE. Proceeding.");
    } else {
      console.log("[handleSpeakSummary] Condition: currentAudio does NOT exist. Proceeding.");
    }

    const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
    console.log(`[handleSpeakSummary] Retrieved VITE_ELEVENLABS_API_KEY: '${ELEVENLABS_API_KEY ? '********' : 'MISSING!'}'`);

    if (!ELEVENLABS_API_KEY) {
        console.log("[handleSpeakSummary] Condition: !ELEVENLABS_API_KEY is TRUE. Exiting.");
        toast({ title: "API Key Missing", description: "ElevenLabs API key is not configured.", variant: "destructive" });
        setAudioErrorId(bookmarkId);
        return;
    }
    console.log("[handleSpeakSummary] Condition: !ELEVENLABS_API_KEY is FALSE. API Key found. Proceeding to API call.");

    const VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

    setPlayingBookmarkId(bookmarkId);
    setAudioErrorId(null);

    try {
      const audioBlob = await speakTextWithElevenLabs(summaryText, VOICE_ID, ELEVENLABS_API_KEY);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      setCurrentAudio(audio); 
      
      audio.play();

      audio.onended = () => {
        setPlayingBookmarkId(null);
        URL.revokeObjectURL(audioUrl); 
        setCurrentAudio(null);
      };
      audio.onerror = () => {
        console.error("Error playing audio for bookmark:", bookmarkId);
        setPlayingBookmarkId(null);
        setAudioErrorId(bookmarkId);
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
        toast({
          title: "Audio Playback Error",
          description: "Could not play the summary audio.",
          variant: "destructive",
        });
      };
    } catch (error: any) {
      console.error(`Error generating audio for bookmark ${bookmarkId}:`, error);
      setPlayingBookmarkId(null);
      setAudioErrorId(bookmarkId);
      toast({
        title: "Text-to-Speech Error",
        description: error.message || "Failed to generate audio for the summary.",
        variant: "destructive",
      });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        when: "beforeChildren"
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15
      },
    },
  };

  // Ensure animation is handled safely - this is critical for fixing the disappearing UI
  const safeAnimation = {
    initial: "hidden",
    animate: "visible",
    exit: { opacity: 0 },
    variants: containerVariants
  };

  const renderPlatformIcon = (platform: BookmarkItemType['sourcePlatform'] | 'Other' | undefined) => {
    switch (platform) {
      case 'X':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>;
      case 'LinkedIn':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path></svg>;
      case 'Reddit':
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.224 13.871c-.208.626-.925.826-1.427.418-.991-.806-2.479-1.305-4.032-1.305s-3.04.499-4.032 1.305c-.502.408-1.219.208-1.427-.418-.208-.626.036-1.33.538-1.738 1.305-1.05 3.147-1.666 5.003-1.666s3.699.616 5.003 1.666c.502.408.746 1.112.538 1.738zm-2.29-4.899c-.783 0-1.416.633-1.416 1.416s.633 1.416 1.416 1.416 1.416-.633 1.416-1.416-.633-1.416-1.416-1.416zm-7.868 0c-.783 0-1.416.633-1.416 1.416s.633 1.416 1.416 1.416 1.416-.633 1.416-1.416-.633-1.416-1.416-1.416zm7.004 7.352c-.647 0-1.173.526-1.173 1.173s.526 1.173 1.173 1.173 1.173-.526 1.173-1.173-.526-1.173-1.173-1.173zm-6.14 0c-.647 0-1.173.526-1.173 1.173s.526 1.173 1.173 1.173 1.173-.526 1.173-1.173-.526-1.173-1.173-1.173z"/></svg>;
      default:
        return <LinkIcon className="h-5 w-5" />;
    }
  };

  // Helper function for displaying URLs safely
  const displayableUrl = (url: string | null | undefined): string => {
    if (!url) return "Missing URL";
    if (url.trim() === '') return "Empty URL";
    
    try {
      new URL(url);
      return url;
    } catch (e) {
      return `Invalid URL: ${url}`;
    }
  };

  // Helper function to render specialized content for Twitter/X, LinkedIn or Reddit
  const renderSpecializedContent = (bookmark: BookmarkItemType) => {
    const tweetId = extractTweetId(bookmark.originalUrl);
    if (bookmark.sourcePlatform === 'X' && tweetId) {
      return <ClientTweetCard id={tweetId} />;
    } else if (bookmark.sourcePlatform === 'LinkedIn') {
      return <LinkedInCard 
                bookmark={bookmark} 
                onDelete={handleDeleteBookmark}
                onSummarize={handleSummarizeBookmark}
                isSummarizing={summarizingBookmarkId === bookmark._id}
                summarizingBookmarkId={summarizingBookmarkId}
                onSpeakSummary={handleSpeakSummary}
                playingBookmarkId={playingBookmarkId}
                audioErrorId={audioErrorId}
             />;
    } else if (bookmark.sourcePlatform === 'Reddit') {
      return <RedditCard 
                bookmark={bookmark} 
                onDelete={handleDeleteBookmark}
                onSummarize={handleSummarizeBookmark}
                isSummarizing={summarizingBookmarkId === bookmark._id}
                summarizingBookmarkId={summarizingBookmarkId}
                onSpeakSummary={handleSpeakSummary}
                playingBookmarkId={playingBookmarkId}
                audioErrorId={audioErrorId}
             />;
    }
    // Fallback for 'Other' or if specialized content isn't available
    return null;
  };

  // Helper function to render the summary section
  const renderSummarySection = (bookmark: BookmarkItemType) => {
    if (bookmark.summary && bookmark.status === 'summarized') {
      return (
        <details className="mt-3 text-sm text-muted-foreground/90 leading-relaxed">
          <summary className="cursor-pointer font-medium text-primary/80 hover:text-primary select-none transition-colors duration-200">View Summary</summary>
          <p className="pt-2 whitespace-pre-wrap">{String(bookmark.summary)}</p>
        </details>
      );
    }
    
    if (bookmark.status === 'pending') {
      return <p className="text-xs text-amber-500 mt-1">Summary pending...</p>;
    }
    
    if (bookmark.status === 'failed') {
      return <p className="text-xs text-destructive mt-1">Summary failed.</p>;
    }
    
    if (bookmark.status === 'processing') {
      return (
        <div className="flex items-center text-xs text-sky-500 mt-1">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          <span>Processing summary...</span>
        </div>
      );
    }
    
    return null;
  };

  if (loading) {
    console.log("[BookmarksPage] Rendering loading state");
    return (
      <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
        <div className="container mx-auto relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl font-bold mb-12 text-center bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary"
          >
            My Bookmarks
          </motion.h1>
          <SkeletonList items={3} />
        </div>
      </div>
    );
  }

  if (error) {
    console.log("[BookmarksPage] Rendering error state:", error);
    return (
      <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-background via-destructive/5 to-background text-foreground flex flex-col items-center justify-center">
        <Card className="w-full max-w-lg text-center border-destructive/20 bg-background/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-3xl text-destructive flex items-center justify-center">
              <AlertCircle className="w-10 h-10 mr-3" /> Error Loading Bookmarks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-4">{error}</p>
            <Button onClick={() => fetchBookmarksCallback(1)} className="hover:scale-105 transition-transform">
              <Zap className="mr-2 h-4 w-4" /> Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log("[BookmarksPage] Rendering main content", {
    filteredBookmarksCount: filteredAndSortedBookmarks.length,
    loading,
    error: error ? "Error present" : "No error"
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-secondary/10 to-primary/10 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], rotate: [360, 180, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative z-10 container mx-auto p-3 sm:p-4 md:p-8 space-y-6 sm:space-y-8">
        <div
          ref={headerRef}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 md:mb-8 gap-4 opacity-100"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full">
              <BookmarkPlus className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
                Bookmarks
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg">
                Your saved articles, links, and resources.
              </p>
            </div>
          </div>
          <Button 
            onClick={handleSummarizeLatestClick} 
            size="lg"
            disabled={isBatchSummarizing || loading || !!error || !token}
            className="w-full sm:w-auto self-stretch sm:self-auto hover:scale-105 transition-all duration-200 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 min-h-[48px] touch-manipulation"
          >
            {isBatchSummarizing ? (
              <>
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                <span className="text-sm sm:text-base">Digesting All New...</span>
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 sm:w-5 sm:h-5 mr-2"/>
                <span className="text-sm sm:text-base">Digest New Bookmarks</span>
              </>
            )}
          </Button>
        </div>

        <div
          ref={controlsRef}
          className="opacity-100"
        >
          <Card className="p-3 sm:p-4 md:p-6 bg-background/80 backdrop-blur-sm border-border/50">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 items-end">
              <div className="lg:col-span-1">
                <Label htmlFor="bookmarks-search" className="text-sm font-medium text-muted-foreground mb-2 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <Input
                    id="bookmarks-search"
                    type="text"
                    placeholder="Search title, URL, summary..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-background/50 hover:bg-background/70 focus:bg-background/70 border-border/50 focus:ring-primary focus:border-primary transition-all duration-200 min-h-[48px] touch-manipulation"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bookmarks-filter" className="text-sm font-medium text-muted-foreground mb-2 block">Date Filter</Label>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger id="bookmarks-filter" className="w-full bg-background/50 hover:bg-background/70 focus:bg-background/70 border-border/50 focus:ring-primary focus:border-primary transition-all duration-200 min-h-[48px] touch-manipulation">
                    <SelectValue placeholder="Filter by date..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border shadow-xl">
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="week">Past Week</SelectItem>
                    <SelectItem value="month">Past Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bookmarks-sort" className="text-sm font-medium text-muted-foreground mb-2 block">Sort By Date</Label>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger id="bookmarks-sort" className="w-full bg-background/50 hover:bg-background/70 focus:bg-background/70 border-border/50 focus:ring-primary focus:border-primary transition-all duration-200 min-h-[48px] touch-manipulation">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border shadow-xl">
                    <SelectItem value="desc">Newest First</SelectItem>
                    <SelectItem value="asc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </div>

        <div ref={listRef} className="opacity-100">
          {loading && <SkeletonList items={PAGE_LIMIT} />}
          
          {error && (
            <Alert variant="destructive" className="border-destructive/20 bg-destructive/5 my-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Bookmarks</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {!loading && !error && filteredAndSortedBookmarks.length === 0 && (
            <Card className="p-8 my-6 text-center bg-background/80 backdrop-blur-sm border-border/50">
              <BookmarkPlus className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchTerm || filter !== 'all' ? 'No Bookmarks Match Your Criteria' : 'No Bookmarks Yet'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm || filter !== 'all' ? 'Try adjusting your search or filters.' : 'Start adding bookmarks to see them here.'}
              </p>
            </Card>
          )}

          {!loading && !error && Array.isArray(filteredAndSortedBookmarks) && filteredAndSortedBookmarks.length > 0 && (
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              {filteredAndSortedBookmarks.map((bookmark, index) => {
                const isValidOriginalUrl = isValidUrlWithHostname(bookmark.originalUrl);
                let displayableUrl = bookmark.originalUrl;
                if (!isValidOriginalUrl) {
                  if (bookmark.originalUrl && bookmark.originalUrl.trim() !== '') {
                    displayableUrl = `Invalid URL: ${bookmark.originalUrl}`;
                  } else {
                    displayableUrl = "Missing or empty URL";
                  }
                }

                return (
                  <div
                    key={bookmark._id}
                    className="group"
                  >
                    <Card className="p-3 sm:p-4 md:p-6 bg-background/80 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                        <div className="flex-grow min-w-0 w-full sm:w-auto">
                          {isValidOriginalUrl ? (
                            <a 
                                href={bookmark.originalUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="hover:underline group-hover:text-primary transition-colors duration-200"
                            >
                                <h3 className="text-base sm:text-lg md:text-xl font-semibold text-foreground line-clamp-2 sm:truncate" title={bookmark.title || bookmark.fetchedTitle || bookmark.originalUrl}>
                                    {bookmark.title || bookmark.fetchedTitle || bookmark.originalUrl}
                                </h3>
                            </a>
                          ) : (
                            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-foreground line-clamp-2 sm:truncate" title={bookmark.title || bookmark.fetchedTitle || String(bookmark.originalUrl)}>
                                {bookmark.title || bookmark.fetchedTitle || String(bookmark.originalUrl)}
                            </h3>
                          )}
                          <p className="text-xs text-muted-foreground truncate mt-1" title={String(bookmark.originalUrl)}>{String(bookmark.originalUrl)}</p>
                           {renderSpecializedContent(bookmark)}
                          {renderSummarySection(bookmark)}
                        </div>
                        <div className="flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2 w-full sm:w-auto justify-end sm:justify-start shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleSummarizeBookmark(bookmark._id)}
                            disabled={summarizingBookmarkId === bookmark._id || bookmark.status === 'processing'}
                            className="hover:bg-primary/10 hover:text-primary transition-colors duration-200 min-h-[44px] min-w-[44px] touch-manipulation"
                            title="Generate Summary"
                          >
                            {summarizingBookmarkId === bookmark._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : bookmark.status === 'summarized' ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : bookmark.status === 'failed' ? (
                              <XCircle className="w-4 h-4 text-destructive" />
                            ) : (
                              <Brain className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleSpeakSummary(bookmark._id, bookmark.summary)}
                            disabled={!bookmark.summary || bookmark.status !== 'summarized'}
                            className={`hover:bg-accent/10 hover:text-accent transition-colors duration-200 min-h-[44px] min-w-[44px] touch-manipulation ${audioErrorId === bookmark._id ? 'text-destructive' : ''}`}
                            title={audioErrorId === bookmark._id ? "Audio Error" : (playingBookmarkId === bookmark._id ? "Stop Speaking" : "Speak Summary")}
                          >
                            {playingBookmarkId === bookmark._id ? (
                              <StopCircle className="w-4 h-4" />
                            ) : audioErrorId === bookmark._id ? (
                              <AlertCircle className="w-4 h-4" />
                            ) : (
                              <PlayCircle className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteBookmark(bookmark._id)}
                            className="hover:bg-destructive/10 hover:text-destructive transition-colors duration-200 min-h-[44px] min-w-[44px] touch-manipulation"
                            title="Delete Bookmark"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <CardFooter className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-border/20 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-muted-foreground gap-2 sm:gap-0">
                        <div className="flex items-center">
                          {renderPlatformIcon(bookmark.sourcePlatform)}
                          <span className="ml-1">{bookmark.sourcePlatform || 'Other'}</span>
                        </div>
                        <div className="flex items-center">
                          <CalendarDays className="w-3 h-3 mr-1.5" />
                          <span>{new Date(bookmark.createdAt).toLocaleDateString()}</span>
                        </div>
                      </CardFooter>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-4 mt-6 sm:mt-8">
            <Button
              onClick={() => fetchBookmarksCallback(currentPage - 1)}
              disabled={currentPage <= 1}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto min-h-[44px] touch-manipulation"
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-3 py-2 bg-muted/20 rounded-md">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => fetchBookmarksCallback(currentPage + 1)}
              disabled={currentPage >= totalPages}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto min-h-[44px] touch-manipulation"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookmarksPage;
