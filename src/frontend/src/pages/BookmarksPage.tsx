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
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white overflow-hidden">
      <FloatingParticles items={40} />
      <div className="container mx-auto relative z-10">
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "circOut" }}
          className="text-4xl md:text-6xl font-bold mb-10 md:mb-16 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-400 py-2"
        >
          My Curated Bookmarks
        </motion.h1>

        <GlassCard className="mb-8 md:mb-12 p-4 md:p-6 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="relative col-span-1 md:col-span-1">
              <Input
                type="text"
                placeholder="Search bookmarks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800/70 border-purple-500/50 placeholder-gray-400 text-white focus:ring-pink-500 focus:border-pink-500 pr-10"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            <div className="col-span-1 md:col-span-1">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-full bg-slate-800/70 border-purple-500/50 text-white data-[placeholder]:text-gray-400">
                  <ListFilter className="h-4 w-4 mr-2 opacity-70" />
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-purple-600 text-white">
                  <SelectItem value="all" className="hover:bg-purple-700/50 focus:bg-purple-700/60">All Time</SelectItem>
                  <SelectItem value="week" className="hover:bg-purple-700/50 focus:bg-purple-700/60">Past Week</SelectItem>
                  <SelectItem value="month" className="hover:bg-purple-700/50 focus:bg-purple-700/60">Past Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 md:col-span-1">
               <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-full bg-slate-800/70 border-purple-500/50 text-white data-[placeholder]:text-gray-400">
                  <ArrowUpDown className="h-4 w-4 mr-2 opacity-70" />
                  <SelectValue placeholder="Sort by date" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-purple-600 text-white">
                  <SelectItem value="desc" className="hover:bg-purple-700/50 focus:bg-purple-700/60">Newest First</SelectItem>
                  <SelectItem value="asc" className="hover:bg-purple-700/50 focus:bg-purple-700/60">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
           <div className="mt-6 text-center md:text-right">
            <AnimatedButton
                onClick={handleSummarizeLatestClick}
                loading={isBatchSummarizing || (loading && bookmarks.length > 0)}
                variant="primary"
                className="w-full md:w-auto"
              >
                {isBatchSummarizing ? <Loader2 className="animate-spin mr-2"/> : <Brain className="mr-2 h-4 w-4" />}
                {isBatchSummarizing ? "Creating Digest..." : "Create Latest Digest"}
              </AnimatedButton>
          </div>
        </GlassCard>

        {latestDigest && (
          <motion.div initial="hidden" animate="visible" variants={itemVariants}>
            <GlassCard className="mb-8 md:mb-12 p-6 shadow-xl bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-red-600/20">
              <CardHeader className="border-b border-purple-500/30 mb-4">
                <CardTitle className="text-3xl font-semibold text-pink-400 flex items-center">
                  <Zap className="w-8 h-8 mr-3 animate-pulse text-yellow-400" /> Latest Digest
                </CardTitle>
                {latestDigestSources && latestDigestSources.length > 0 && (
                    <CardDescription className="text-sm text-purple-300 mt-1">
                        Summary based on {latestDigestSources.length} recent item(s).
                    </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-gray-200 whitespace-pre-line leading-relaxed">{latestDigest}</p>
              </CardContent>
            </GlassCard>
          </motion.div>
        )}

        {filteredAndSortedBookmarks.length === 0 && !loading && (
          <motion.div initial="hidden" animate="visible" variants={itemVariants}>
            <GlassCard className="py-12 text-center">
              <CardContent className="p-6">
                <BookmarkPlus className="h-16 w-16 mx-auto mb-6 text-purple-400 opacity-50" />
                <p className="text-xl text-gray-400">No bookmarks match your criteria.</p>
                <p className="text-gray-500">Try adjusting your search or filters, or add some new bookmarks!</p>
              </CardContent>
            </GlassCard>
          </motion.div>
        )}

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredAndSortedBookmarks.map((bookmark) => {
            const tweetId = bookmark.sourcePlatform === 'X' ? extractTweetId(bookmark.originalUrl) : undefined;
            return (
            <motion.div key={bookmark._id} variants={itemVariants}>
              <GlassCard className="h-full flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-purple-500/50 hover:-translate-y-1">
                <CardHeader className="p-4 pb-3 border-b border-purple-800/50">
                  <div className="flex justify-between items-start mb-1">
                    <a href={bookmark.originalUrl} target="_blank" rel="noopener noreferrer" className="hover:text-pink-400 transition-colors flex-grow min-w-0">
                      <CardTitle className="text-lg font-semibold text-gray-100 hover:text-pink-300 line-clamp-2 break-all">
                        {bookmark.title || bookmark.fetchedTitle || new URL(bookmark.originalUrl).hostname}
                      </CardTitle>
                    </a>
                    {renderPlatformIcon(bookmark.sourcePlatform)}
                  </div>
                  <CardDescription className="text-xs text-purple-400">
                    Saved: {new Date(bookmark.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 flex-grow pt-3 pb-3">
                  {bookmark.sourcePlatform === 'X' && tweetId ? (
                    <ClientTweetCard 
                        id={tweetId} 
                        summaryText={bookmark.summary}
                        summaryStatus={bookmark.status}
                        onSummarize={() => handleSummarizeBookmark(bookmark._id)}
                        isSummarizing={summarizingBookmarkId === bookmark._id}
                        onSpeakSummary={handleSpeakSummary}
                        playingTweetId={playingBookmarkId}
                        audioErrorTweetId={audioErrorId}
                        onDelete={() => handleDeleteBookmark(bookmark._id)}
                    />
                  ) : bookmark.sourcePlatform === 'LinkedIn' ? (
                     <LinkedInCard bookmark={bookmark} onDelete={handleDeleteBookmark} />
                  ) : bookmark.summary ? (
                    <p className="text-sm text-gray-300 line-clamp-4 whitespace-pre-line leading-relaxed">{bookmark.summary}</p>
                  ) : bookmark.status === 'pending_summary' || summarizingBookmarkId === bookmark._id ? (
                    <div className="flex items-center text-sm text-purple-400">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Summarizing...
                    </div>
                  ) : bookmark.status === 'error' && !bookmark.summary ? (
                     <div className="flex items-center text-sm text-red-400">
                        <XCircle className="w-4 h-4 mr-2" /> Error summarizing.
                    </div>
                  ): (
                    <p className="text-sm text-gray-500 italic">No summary. Click Summarize.</p>
                  )}
                  
                  {bookmark.summary && bookmark.status === 'error' && (
                     <p className="mt-2 text-xs text-red-400 bg-red-900/30 p-2 rounded-md">
                       <span className="font-bold">Summarization Error:</span> {bookmark.summary.replace("Error: ", "")}
                     </p>
                   )}
                </CardContent>

                <CardFooter className="p-4 grid grid-cols-2 gap-2 pt-2 border-t border-purple-800/50">
                  <a 
                    href={bookmark.originalUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <AnimatedButton
                      variant="ghost"
                      size="sm"
                      className="w-full"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" /> View Original
                    </AnimatedButton>
                  </a>
                  <AnimatedButton
                    onClick={() => handleSummarizeBookmark(bookmark._id)}
                    loading={summarizingBookmarkId === bookmark._id}
                    disabled={!!bookmark.summary && bookmark.status !== 'error'}
                    variant="secondary"
                    size="sm"
                    className="w-full"
                  >
                    <Brain className="mr-2 h-4 w-4" /> {bookmark.summary && bookmark.status !== 'error' ? 'Summarized' : 'Summarize'}
                  </AnimatedButton>
                   <AnimatedButton
                    onClick={() => handleSpeakSummary(bookmark._id, bookmark.summary)}
                    loading={playingBookmarkId === bookmark._id}
                    disabled={!bookmark.summary || bookmark.status === 'error' || summarizingBookmarkId === bookmark._id}
                    variant="ghost"
                    size="sm"
                    className="w-full"
                  >
                    {playingBookmarkId === bookmark._id ? <StopCircle className="mr-2 h-4 w-4"/> : <PlayCircle className="mr-2 h-4 w-4" />}
                    {playingBookmarkId === bookmark._id ? 'Playing...' : (audioErrorId === bookmark._id ? 'Audio Error' : 'Play Summary')}
                  </AnimatedButton>
                  <AnimatedButton
                    onClick={() => handleDeleteBookmark(bookmark._id)}
                    variant="ghost"
                    size="sm"
                    className="w-full text-red-500 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </AnimatedButton>
                </CardFooter>
              </GlassCard>
            </motion.div>
            )}
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