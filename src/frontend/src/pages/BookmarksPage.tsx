import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ExternalLink, Info, MessageSquareText, Trash2, CalendarDays, FileText, Zap, AlertCircle, Volume2, Search, BookmarkPlus, CheckCircle, XCircle, Loader2, PlayCircle, StopCircle, Brain, ListFilter, ArrowUpDown, Link as LinkIcon } from 'lucide-react';
import { getBookmarks, deleteBookmarkService, summarizeBookmarkById, speakTextWithElevenLabs } from '../services/bookmarkService';
import { BookmarkItemType } from '../types/bookmark';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ClientTweetCard } from '@/components/ui/TweetCard';
import LinkedInCard from '@/components/ui/LinkedInCard';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useAuthStore from '@/store/authStore';
import { useDigest } from '../context/DigestContext';

// New UI Component Imports
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { SkeletonList } from '@/components/ui/Skeleton';
import { FloatingParticles } from '@/components/common/FloatingParticles';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Hook for scroll animations (if not already in use)
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const BookmarksPage: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkItemType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all'); // 'all', 'week', 'month'
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('desc'); // 'asc', 'desc' for date sorting
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalBookmarks, setTotalBookmarks] = useState<number>(0);
  const PAGE_LIMIT = 10; // Or make this configurable

  // Scroll animation refs
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

  // Current audio instance
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  console.log("[BookmarksPage] Component rendered or re-rendered"); // General render log

  const fetchBookmarksCallback = useCallback(async (pageToFetch: number = 1) => {
    if (!token) return;
    console.log(`[BookmarksPage] Fetching bookmarks for page: ${pageToFetch}...`);
    setLoading(true);
    try {
      const response = await getBookmarks(pageToFetch, PAGE_LIMIT);
      setBookmarks(response.data); // Use response.data for the array
      setCurrentPage(response.currentPage);
      setTotalPages(response.totalPages);
      setTotalBookmarks(response.totalBookmarks);
      setError(null);
    } catch (err) {
      setError('Failed to load bookmarks. Please ensure the backend is running and refresh.');
      console.error('Error fetching bookmarks:', err);
      toast({
        title: "Error Fetching Bookmarks",
        description: "Could not fetch bookmarks. The server might be down.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    fetchBookmarksCallback(currentPage); // Fetch initial or current page
  }, [fetchBookmarksCallback, currentPage]);

  const filteredAndSortedBookmarks = useMemo(() => {
    if (!Array.isArray(bookmarks)) { // Add a guard clause
      console.warn('[BookmarksPage] bookmarks is not an array in useMemo. Returning empty array.', bookmarks);
      return [];
    }
    const now = new Date();
    let processedBookmarks = bookmarks.filter(bookmark => {
      const bookmarkDate = new Date(bookmark.createdAt);
      const matchesFilter = 
        filter === 'all' ? true :
        filter === 'week' ? bookmarkDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7) :
        filter === 'month' ? bookmarkDate >= new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()) :
        true;

      const matchesSearch = 
        searchTerm === '' ? true :
        bookmark.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bookmark.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bookmark.originalUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bookmark.sourcePlatform === 'X' && bookmark.fetchedTitle?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (bookmark.sourcePlatform === 'LinkedIn' && bookmark.fetchedTitle?.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesFilter && matchesSearch;
    });

    return processedBookmarks.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [bookmarks, filter, searchTerm, sortOrder]);

  const extractTweetId = (url: string): string | undefined => {
    if (url.includes('twitter.com') || url.includes('x.com')) {
      const match = url.match(/status\/(\d+)/);
      return match ? match[1] : undefined;
    }
    return undefined;
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    // TODO: Consider adding a confirmation modal here for better UX
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
    // Pass setBookmarks directly as the context handles the update logic
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
      if (playingBookmarkId === bookmarkId) { // If clicking play on the same item that was playing
        console.log("[handleSpeakSummary] Condition: playingBookmarkId === bookmarkId is TRUE. Toggling off. Exiting.");
        setPlayingBookmarkId(null); // Stop playback
        return;
      }
      console.log("[handleSpeakSummary] Condition: playingBookmarkId === bookmarkId is FALSE. Proceeding.");
    } else {
      console.log("[handleSpeakSummary] Condition: currentAudio does NOT exist. Proceeding.");
    }

    const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
    console.log(`[handleSpeakSummary] Retrieved VITE_ELEVENLABS_API_KEY: '${ELEVENLABS_API_KEY ? '********' : 'MISSING!'}'`); // Mask key for safety

    if (!ELEVENLABS_API_KEY) {
        console.log("[handleSpeakSummary] Condition: !ELEVENLABS_API_KEY is TRUE. Exiting.");
        toast({ title: "API Key Missing", description: "ElevenLabs API key is not configured.", variant: "destructive" });
        setAudioErrorId(bookmarkId);
        return;
    }
    console.log("[handleSpeakSummary] Condition: !ELEVENLABS_API_KEY is FALSE. API Key found. Proceeding to API call.");

    const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // TODO: Make this configurable or fetch from user settings

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
      },
    },
  };

  if (loading && bookmarks.length === 0) {
    return (
      <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
        <FloatingParticles items={30} />
        <div className="container mx-auto relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl font-bold mb-12 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500"
          >
            My Bookmarks
          </motion.h1>
          <SkeletonList items={3} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-gray-900 text-white flex flex-col items-center justify-center">
        <FloatingParticles items={20} type="error" />
        <GlassCard className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-3xl text-red-400 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 mr-3" /> Error Loading Bookmarks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-4">{error}</p>
            <AnimatedButton onClick={() => fetchBookmarksCallback(1)}>
              <Zap className="mr-2 h-4 w-4" /> Try Again
            </AnimatedButton>
          </CardContent>
        </GlassCard>
      </div>
    );
  }
  
  const renderPlatformIcon = (platform: BookmarkItemType['sourcePlatform'] | 'Other' | undefined) => {
    switch (platform) {
      case 'X':
        return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" className="mr-2 shrink-0"><path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.602.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z"/></svg>;
      case 'LinkedIn':
        return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" className="mr-2 shrink-0"><path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/></svg>;
      default:
        return <LinkIcon className="w-4 h-4 mr-2 shrink-0" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      <FloatingParticles items={30} particleClassName="bg-primary/10" />
      {/* Animated Background Orbs (similar to DashboardPage) */}
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

      <div className="relative z-10 container mx-auto p-4 md:p-8 space-y-8">
        {/* Header Section */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row justify-between items-center mb-4 md:mb-8 gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full">
              <BookmarkPlus className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold gradient-text">
                Bookmarks
              </h1>
              <p className="text-muted-foreground text-lg">
                Your saved articles, links, and resources.
              </p>
            </div>
          </div>
          <AnimatedButton 
            onClick={handleSummarizeLatestClick} 
            variant="gradient"
            size="lg"
            loading={isBatchSummarizing} 
            className="hover-glow self-center md:self-auto"
          >
            {isBatchSummarizing ? 'Digesting All New...' : <><Brain className="w-5 h-5 mr-2"/>Digest New Bookmarks</>}
          </AnimatedButton>
        </motion.div>

        {/* Controls Section - Search, Filter, Sort */}
        <motion.div
          ref={controlsRef}
          initial={{ opacity: 0, y: 20 }}
          animate={controlsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <GlassCard className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* Search Input */}
              <div className="md:col-span-1">
                <Label htmlFor="bookmarks-search" className="text-sm font-medium text-muted-foreground mb-1 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <Input
                    id="bookmarks-search"
                    type="text"
                    placeholder="Search title, URL, summary..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-background/50 hover:bg-background/70 focus:bg-background/70 border-border/50 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              {/* Filter Select */}
              <div>
                <Label htmlFor="bookmarks-filter" className="text-sm font-medium text-muted-foreground mb-1 block">Date Filter</Label>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger id="bookmarks-filter" className="w-full bg-background/50 hover:bg-background/70 focus:bg-background/70 border-border/50 focus:ring-primary focus:border-primary">
                    <SelectValue placeholder="Filter by date..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border shadow-xl">
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="week">Past Week</SelectItem>
                    <SelectItem value="month">Past Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Select */}
              <div>
                <Label htmlFor="bookmarks-sort" className="text-sm font-medium text-muted-foreground mb-1 block">Sort By Date</Label>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger id="bookmarks-sort" className="w-full bg-background/50 hover:bg-background/70 focus:bg-background/70 border-border/50 focus:ring-primary focus:border-primary">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border shadow-xl">
                    <SelectItem value="desc">Newest First</SelectItem>
                    <SelectItem value="asc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Bookmarks List Section */}
        <motion.div
          ref={listRef}
          initial={{ opacity: 0, y: 20 }}
          animate={listInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {loading && <SkeletonList items={PAGE_LIMIT} />}
          {error && (
            <Alert variant="destructive" className="glass border-red-500/20 my-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Bookmarks</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!loading && !error && filteredAndSortedBookmarks.length === 0 && (
             <GlassCard className="p-8 my-6 text-center">
                <BookmarkPlus className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {searchTerm || filter !== 'all' ? 'No Bookmarks Match Your Criteria' : 'No Bookmarks Yet'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm || filter !== 'all' ? 'Try adjusting your search or filters.' : 'Start adding bookmarks to see them here.'}
                </p>
                {/* TODO: Maybe a button to "Add New Bookmark" if applicable from this page */}
              </GlassCard>
          )}

          {!loading && !error && filteredAndSortedBookmarks.length > 0 && (
            <div className="space-y-4 md:space-y-6">
              {filteredAndSortedBookmarks.map((bookmark) => (
                <GlassCard key={bookmark._id} className="p-4 md:p-6 animate-fade-in group">
                  <div className="flex justify-between items-start">
                    <div className="flex-grow min-w-0">
                        <a 
                            href={bookmark.originalUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:underline group-hover:text-primary transition-colors duration-200"
                        >
                            <h3 className="text-lg md:text-xl font-semibold text-foreground truncate" title={bookmark.title || bookmark.fetchedTitle || "Untitled Bookmark"}>
                                {bookmark.title || bookmark.fetchedTitle || "Untitled Bookmark"}
                            </h3>
                        </a>
                        <p className="text-xs text-muted-foreground truncate" title={bookmark.originalUrl}>{bookmark.originalUrl}</p>
                         {bookmark.sourcePlatform === 'X' && extractTweetId(bookmark.originalUrl) && (
                            <div className="mt-2 mr-4 md:mr-0 max-w-full overflow-hidden">
                                <ClientTweetCard 
                                  id={extractTweetId(bookmark.originalUrl)!}
                                />
                            </div>
                        )}
                        {bookmark.sourcePlatform === 'LinkedIn' && (
                            <div className="mt-2 mr-4 md:mr-0 max-w-full overflow-hidden">
                                <LinkedInCard bookmark={bookmark} onDelete={handleDeleteBookmark} />
                            </div>
                        )}
                        {bookmark.summary && bookmark.status === 'summarized' && (
                            <details className="mt-3 text-sm text-muted-foreground/90 leading-relaxed">
                                <summary className="cursor-pointer font-medium text-primary/80 hover:text-primary select-none">View Summary</summary>
                                <p className="pt-2 whitespace-pre-wrap">{String(bookmark.summary)}</p>
                            </details>
                        )}
                        {bookmark.status === 'pending' && <p className="text-xs text-amber-500 mt-1">Summary pending...</p>}
                        {bookmark.status === 'failed' && <p className="text-xs text-destructive mt-1">Summary failed.</p>}
                         {bookmark.status === 'processing' && (
                            <div className="flex items-center text-xs text-sky-500 mt-1">
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Processing summary...
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-end space-y-2 flex-shrink-0 ml-2">
                        <AnimatedButton 
                            size="sm"
                            variant="ghost" 
                            onClick={() => handleSpeakSummary(bookmark._id, bookmark.summary)}
                            disabled={!bookmark.summary || !!playingBookmarkId || !!summarizingBookmarkId}
                            title={playingBookmarkId === bookmark._id ? "Stop" : "Play Summary"}
                        >
                            {playingBookmarkId === bookmark._id ? <StopCircle className="w-4 h-4"/> : <PlayCircle className="w-4 h-4"/>}
                        </AnimatedButton>
                        <AnimatedButton 
                            size="sm"
                            variant="ghost" 
                            onClick={() => handleSummarizeBookmark(bookmark._id)}
                            loading={summarizingBookmarkId === bookmark._id}
                            disabled={!!playingBookmarkId || !!summarizingBookmarkId || bookmark.status === 'summarized' || bookmark.status === 'processing'}
                            title="Summarize"
                        >
                           <Zap className="w-4 h-4"/>
                        </AnimatedButton>
                        <AnimatedButton 
                            size="sm"
                            variant="ghost" 
                            onClick={() => handleDeleteBookmark(bookmark._id)} 
                            className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                            title="Delete"
                            disabled={!!playingBookmarkId || !!summarizingBookmarkId}
                        >
                            <Trash2 className="w-4 h-4" />
                        </AnimatedButton>
                    </div>
                  </div>
                   <div className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/20 flex justify-between items-center">
                        <span>Saved: {new Date(bookmark.createdAt).toLocaleDateString()}</span>
                        {bookmark.sourcePlatform && 
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-muted/30 rounded">
                                {renderPlatformIcon(bookmark.sourcePlatform)} 
                                {bookmark.sourcePlatform}
                            </span>
                        }
                    </div>
                </GlassCard>
              ))}
            </div>
          )}

        {/* Pagination Controls */}
        {!loading && !error && totalPages > 1 && (
            <motion.div 
                className="flex justify-center items-center space-x-2 mt-8"
                initial={{opacity: 0}} animate={{opacity:1}} transition={{delay: 0.3}}
            >
                <AnimatedButton 
                    onClick={() => fetchBookmarksCallback(currentPage - 1)} 
                    disabled={currentPage <= 1}
                    variant="outline"
                    size="sm"
                >
                    Previous
                </AnimatedButton>
                <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages} (Total: {totalBookmarks})
                </span>
                <AnimatedButton 
                    onClick={() => fetchBookmarksCallback(currentPage + 1)} 
                    disabled={currentPage >= totalPages}
                    variant="outline"
                    size="sm"
                >
                    Next
                </AnimatedButton>
            </motion.div>
        )}
        </motion.div>
      </div>
    </div>
  );
};

export default BookmarksPage;

// Helper to get source type, can be expanded
// const getSourceType = (url: string): BookmarkSourceType | 'Other' => {
//   if (url.includes('twitter.com') || url.includes('x.com')) return 'X';
//   if (url.includes('linkedin.com')) return 'LinkedIn';
//   // Add more sources like YouTube, Reddit, etc.
//   return 'Other';
// }; 