import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ExternalLink, Info, MessageSquareText, Trash2, CalendarDays, FileText, Zap, AlertCircle, Volume2, Search, BookmarkPlus, CheckCircle, XCircle, Loader2, PlayCircle, StopCircle, Brain, ListFilter, ArrowUpDown, Link as LinkIcon, Bell, Clock, BellOff, Edit2 } from 'lucide-react';
import { getBookmarks, deleteBookmarkService, summarizeBookmarkById, speakTextViaBackend, getBookmarkVoiceAudio, toggleBookmarkReminder, updateBookmarkReminder } from '../services/bookmarkService';
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
import { ExpandableContent } from '@/components/ui/ExpandableContent';
import { useHighlightItem } from '@/hooks/useHighlightItem';

const BookmarksPage: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkItemType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('desc');

  // Use the highlight hook to handle search result navigation
  const bookmarkRefs = useHighlightItem(bookmarks, loading);
  
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
  const [playingVoiceNoteId, setPlayingVoiceNoteId] = useState<string | null>(null);
  const [voiceNoteAudioErrorId, setVoiceNoteAudioErrorId] = useState<string | null>(null);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [reminderDateTime, setReminderDateTime] = useState<string>('');
  const [togglingReminderId, setTogglingReminderId] = useState<string | null>(null);
  const {
    latestDigest,
    latestDigestSources,
    isBatchSummarizing,
    summarizeLatestBookmarks
  } = useDigest();
  const { toast } = useToast();
  const token = useAuthStore((state) => state.token);

  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [currentVoiceNoteAudio, setCurrentVoiceNoteAudio] = useState<HTMLAudioElement | null>(null);

  console.log("[BookmarksPage] Component rendered or re-rendered");
  
  // Debug log for component state
  useEffect(() => {
    console.log("[BookmarksPage] Current state:", {
      bookmarksLength: bookmarks?.length || 0,
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
      // Get the highlight ID from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const highlightId = urlParams.get('highlight') || undefined;

      const response = await getBookmarks(pageToFetch, PAGE_LIMIT, searchTerm, highlightId);
      console.log("[BookmarksPage] Fetched data:", JSON.stringify(response.data, null, 2));
      console.log("[BookmarksPage] API response structure:", {
        currentPage: response.currentPage,
        totalPages: response.totalPages,
        totalBookmarks: response.totalBookmarks,
        dataIsArray: Array.isArray(response.data),
        dataLength: response.data?.length || 0
      });
      
      // Ensure we always set a valid array, even if the API response shape varies
      let bookmarksArray: BookmarkItemType[] = [];
      if (Array.isArray(response.data)) {
        bookmarksArray = response.data;
      } else if (Array.isArray((response as any).bookmarks)) {
        bookmarksArray = (response as any).bookmarks;
      } else if (Array.isArray((response as any).data?.data)) {
        bookmarksArray = (response as any).data.data;
      } else {
        console.warn('[BookmarksPage] Unexpected bookmarks response shape', response);
      }
      setBookmarks(bookmarksArray);
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
  }, [token, toast, searchTerm]);
  
  // Modify the fetchBookmarks useEffect
  useEffect(() => {
    console.log("[BookmarksPage] useEffect for fetchBookmarks triggered");
    
    // Check for token presence first
    if (!token) {
      console.error("[BookmarksPage] No authentication token available");
      setError("You must be logged in to view bookmarks. Please log in and try again.");
      setLoading(false);
      setBookmarks([]); // Also clear bookmarks if token is lost
      return;
    }
    
    // Fetch bookmarks if the page changed, or if bookmarks are not yet loaded for the current view.
    // The `fetchBookmarksCallback` will handle the actual API call and state updates.
    // `lastPageFetched.current` helps prevent re-fetching the same page if the effect runs
    // due to other dependency changes (though `fetchBookmarksCallback` is stable).
    if (currentPage !== lastPageFetched.current || !bookmarks) {
      console.log(`[BookmarksPage] Conditions met to fetch. Current page: ${currentPage}, Last fetched: ${lastPageFetched.current}, Bookmarks exist: ${!!bookmarks}`);
      lastPageFetched.current = currentPage; // Update last fetched page before calling fetch
      fetchBookmarksCallback(currentPage).catch(err => {
        console.error("[BookmarksPage] Unhandled error in fetchBookmarks effect:", err);
        setError(`Failed to load bookmarks: ${err.message || "Unknown error"}`);
        setLoading(false); // Ensure loading is set to false on error
      });
    } else {
      console.log(`[BookmarksPage] Skipping fetch for page ${currentPage}. lastPageFetched: ${lastPageFetched.current}, Bookmarks loaded: ${!!bookmarks}`);
      // If we skipped fetch because data is already there, ensure loading is false.
      // This can happen if token changes but page and data are current.
      if (loading) {
        setLoading(false);
      }
    }
  }, [fetchBookmarksCallback, currentPage, token]); // MODIFIED dependencies

  // Refetch when the search term changes (debounced)
  useEffect(() => {
    if (!token) return;

    const debounceTimer = setTimeout(() => {
      setCurrentPage(1);
      fetchBookmarksCallback(1);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, token, fetchBookmarksCallback]);

  // Add a new useEffect specifically for authentication status changes
  useEffect(() => {
    console.log("[BookmarksPage] Auth status check - token:", token ? "Present" : "Not present");
    if (!token) {
      setError("You must be logged in to view bookmarks. Please log in and try again.");
      setLoading(false);
    }
  }, [token]);

  // Remove the useMemo and calculate the filtered/sorted array directly in the render logic
  // This makes the data flow more predictable and avoids potential stale memoized values.

  const getFilteredAndSortedBookmarks = () => {
    if (loading || !Array.isArray(bookmarks)) {
      return [];
    }

    const now = new Date();
    const processedBookmarks = bookmarks.filter(bookmark => {
      if (!bookmark || typeof bookmark !== 'object' || !bookmark._id) {
        console.warn("[BookmarksPage] Found invalid bookmark in bookmarks array:", bookmark);
        return false;
      }
      
      try {
        const bookmarkDate = new Date(bookmark.createdAt);
        const matchesDateFilter =
          filter === 'all' ? true :
          filter === 'week' ? bookmarkDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7) :
          filter === 'month' ? bookmarkDate >= new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()) :
          true;

        const matchesPlatformFilter =
          platformFilter === 'all' ? true :
          bookmark.sourcePlatform === platformFilter;

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

        return matchesDateFilter && matchesPlatformFilter && matchesSearch;
      } catch (err) {
        console.error("[BookmarksPage] Error filtering bookmark:", err, "Bookmark:", bookmark);
        return false;
      }
    });

    return processedBookmarks.sort((a, b) => {
      try {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } catch (err) {
        console.error("[BookmarksPage] Error sorting bookmarks:", err);
        return 0;
      }
    });
  };

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
    summarizeLatestBookmarks(bookmarks || [], setBookmarks);
  };

  const handleSpeakSummary = async (bookmarkId: string, summaryText: string | undefined) => {
    console.log(`[handleSpeakSummary] Initiated for bookmarkId: ${bookmarkId}`);
    
    // 1. Validate summaryText
    if (!summaryText || summaryText.trim() === '') {
      console.error(`[handleSpeakSummary] Aborting: summaryText is empty or undefined for bookmarkId: ${bookmarkId}.`);
      toast({
        title: "No Summary Available",
        description: "There is no summary text to read for this bookmark.",
        variant: "destructive",
      });
      setAudioErrorId(bookmarkId);
      return;
    }

    // Stop current audio if it's playing
    if (currentAudio) {
      console.log("[handleSpeakSummary] currentAudio exists. Pausing and clearing previous audio.");
      currentAudio.pause();
      URL.revokeObjectURL(currentAudio.src);
      setCurrentAudio(null);
      if (playingBookmarkId === bookmarkId) {
        console.log("[handleSpeakSummary] Same bookmark clicked, stopping audio.");
        setPlayingBookmarkId(null);
        return;
      }
      console.log("[handleSpeakSummary] Different bookmark or new play. Proceeding to play new audio.");
    } else {
      console.log("[handleSpeakSummary] No currentAudio. Will attempt to play new audio.");
    }

    // Proceed to call backend TTS proxy
    setPlayingBookmarkId(bookmarkId);
    setAudioErrorId(null);

    try {
      console.log(`[handleSpeakSummary] Calling speakTextViaBackend for bookmarkId: ${bookmarkId}`);
      const audioBlob = await speakTextViaBackend(summaryText);
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log("[handleSpeakSummary] Created audioUrl:", audioUrl);
      const audio = new Audio(audioUrl);
      setCurrentAudio(audio);
      
      // Log Audio Playback Attempt (Point 6)
      console.log("[handleSpeakSummary] Attempting to play audio...");
      audio.play();

      // Log Audio Event Handlers (Point 7)
      audio.onended = () => {
        console.log("[handleSpeakSummary] Audio ended for bookmarkId:", bookmarkId);
        setPlayingBookmarkId(null);
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
      };
      audio.onerror = () => {
        console.log("[handleSpeakSummary] Audio onerror event triggered for bookmarkId:", bookmarkId, audio.error);
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
      // Log Catch Block (Point 8)
      console.error("[handleSpeakSummary] Error in try-catch block for bookmarkId:", bookmarkId, error);
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

  const handlePlayVoiceNote = async (bookmarkId: string) => {
    console.log(`[handlePlayVoiceNote] Initiated for bookmarkId: ${bookmarkId}`);

    // Stop current voice note audio if playing
    if (currentVoiceNoteAudio) {
      console.log("[handlePlayVoiceNote] currentVoiceNoteAudio exists. Pausing and clearing previous audio.");
      currentVoiceNoteAudio.pause();
      URL.revokeObjectURL(currentVoiceNoteAudio.src);
      setCurrentVoiceNoteAudio(null);
      if (playingVoiceNoteId === bookmarkId) {
        console.log("[handlePlayVoiceNote] Same bookmark clicked, stopping audio.");
        setPlayingVoiceNoteId(null);
        return;
      }
    }

    // Proceed to fetch and play voice note
    setPlayingVoiceNoteId(bookmarkId);
    setVoiceNoteAudioErrorId(null);

    try {
      console.log(`[handlePlayVoiceNote] Fetching voice audio for bookmarkId: ${bookmarkId}`);
      const audioBlob = await getBookmarkVoiceAudio(bookmarkId);
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log("[handlePlayVoiceNote] Created audioUrl:", audioUrl);
      const audio = new Audio(audioUrl);
      setCurrentVoiceNoteAudio(audio);

      audio.play().then(() => {
        console.log("[handlePlayVoiceNote] Audio playback started successfully for bookmarkId:", bookmarkId);
      }).catch((playError: any) => {
        console.error("[handlePlayVoiceNote] Audio.play() failed for bookmarkId:", bookmarkId, playError);
        setPlayingVoiceNoteId(null);
        setVoiceNoteAudioErrorId(bookmarkId);
        toast({
          title: "Audio Playback Error",
          description: "Could not play the voice note.",
          variant: "destructive",
        });
      });

      audio.onended = () => {
        console.log("[handlePlayVoiceNote] Audio playback ended for bookmarkId:", bookmarkId);
        setPlayingVoiceNoteId(null);
        URL.revokeObjectURL(audioUrl);
        setCurrentVoiceNoteAudio(null);
      };

      audio.onerror = (e: any) => {
        console.error("[handlePlayVoiceNote] Audio error event for bookmarkId:", bookmarkId, e);
        setPlayingVoiceNoteId(null);
        setVoiceNoteAudioErrorId(bookmarkId);
        toast({
          title: "Audio Playback Error",
          description: "Could not play the voice note audio.",
          variant: "destructive",
        });
      };
    } catch (error: any) {
      console.error("[handlePlayVoiceNote] Error in try-catch block for bookmarkId:", bookmarkId, error);
      setPlayingVoiceNoteId(null);
      setVoiceNoteAudioErrorId(bookmarkId);
      toast({
        title: "Voice Note Error",
        description: error.message || "Failed to retrieve voice note audio.",
        variant: "destructive",
      });
    }
  };

  const handleToggleReminder = async (bookmarkId: string) => {
    setTogglingReminderId(bookmarkId);
    try {
      const response = await toggleBookmarkReminder(bookmarkId);

      // Update bookmark in state
      setBookmarks(prevBookmarks =>
        prevBookmarks.map(b => {
          if (b._id === bookmarkId) {
            if (response.hasReminder && response.reminder) {
              return {
                ...b,
                hasReminder: true,
                reminderId: response.reminder.id,
                reminderScheduledFor: response.reminder.scheduledFor,
                reminderMessage: response.reminder.message,
                reminderPriority: response.reminder.priority,
                reminderStatus: 'pending'
              };
            } else {
              return {
                ...b,
                hasReminder: false,
                reminderId: undefined,
                reminderScheduledFor: undefined,
                reminderMessage: undefined,
                reminderPriority: undefined,
                reminderStatus: undefined
              };
            }
          }
          return b;
        })
      );

      toast({
        title: response.hasReminder ? "Reminder Set" : "Reminder Cancelled",
        description: response.message,
        variant: "default",
      });
    } catch (error: any) {
      console.error(`Error toggling reminder for bookmark ${bookmarkId}:`, error);
      toast({
        title: "Reminder Error",
        description: error.message || "Failed to toggle reminder.",
        variant: "destructive",
      });
    } finally {
      setTogglingReminderId(null);
    }
  };

  const handleUpdateReminder = async (bookmarkId: string) => {
    if (!reminderDateTime) {
      toast({
        title: "Invalid Date",
        description: "Please select a valid date and time.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert datetime-local to proper ISO string
      // datetime-local gives us "2025-01-15T15:00" in user's local time
      // We need to convert to UTC ISO string for backend
      const localDate = new Date(reminderDateTime);
      const isoString = localDate.toISOString();

      console.log(`[handleUpdateReminder] Converting ${reminderDateTime} (local) → ${isoString} (UTC)`);

      const response = await updateBookmarkReminder(bookmarkId, isoString);

      // Update bookmark in state
      setBookmarks(prevBookmarks =>
        prevBookmarks.map(b => {
          if (b._id === bookmarkId && response.reminder) {
            return {
              ...b,
              hasReminder: true,
              reminderId: response.reminder.id,
              reminderScheduledFor: response.reminder.scheduledFor,
              reminderMessage: response.reminder.message,
              reminderPriority: response.reminder.priority,
              reminderStatus: response.reminder.status || 'pending'
            };
          }
          return b;
        })
      );

      setEditingReminderId(null);
      setReminderDateTime('');

      toast({
        title: "Reminder Updated",
        description: response.message,
        variant: "default",
      });
    } catch (error: any) {
      console.error(`Error updating reminder for bookmark ${bookmarkId}:`, error);
      toast({
        title: "Update Error",
        description: error.message || "Failed to update reminder.",
        variant: "destructive",
      });
    }
  };

  const handleEditReminderClick = (bookmarkId: string, currentTime?: string) => {
    setEditingReminderId(bookmarkId);
    if (currentTime) {
      // Convert to datetime-local format
      const date = new Date(currentTime);
      const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setReminderDateTime(localDateTime);
    } else {
      // Default to tomorrow at 9 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      const localDateTime = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setReminderDateTime(localDateTime);
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
    const hasVoiceNote = bookmark.voiceNoteTranscription && bookmark.voiceNoteTranscription.trim() !== '';

    return (
      <>
        {hasVoiceNote && (
          <div className="mt-3 p-2 rounded-md bg-accent/10 border border-accent/20">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-accent" />
                <h4 className="font-medium text-accent text-sm">Voice Note</h4>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handlePlayVoiceNote(bookmark._id)}
                className={`hover:bg-accent/20 hover:text-accent transition-colors duration-200 h-7 px-2 ${voiceNoteAudioErrorId === bookmark._id ? 'text-destructive' : ''}`}
                title={voiceNoteAudioErrorId === bookmark._id ? "Audio Error" : (playingVoiceNoteId === bookmark._id ? "Stop Voice Note" : "Play Voice Note")}
              >
                {playingVoiceNoteId === bookmark._id ? (
                  <StopCircle className="w-4 h-4" />
                ) : voiceNoteAudioErrorId === bookmark._id ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <PlayCircle className="w-4 h-4" />
                )}
              </Button>
            </div>
            <ExpandableContent content={String(bookmark.voiceNoteTranscription)} maxLength={100} />
          </div>
        )}

        {bookmark.summary && bookmark.status === 'summarized' && (
          <div className="mt-3 text-sm text-muted-foreground/90 leading-relaxed">
            <h4 className="font-medium text-primary/80">Summary</h4>
            <ExpandableContent content={String(bookmark.summary)} maxLength={150} />
          </div>
        )}

        {bookmark.status === 'pending' && <p className="text-xs text-amber-500 mt-1">Summary pending...</p>}

        {bookmark.status === 'failed' && <p className="text-xs text-destructive mt-1">Summary failed.</p>}

        {bookmark.status === 'processing' && (
          <div className="flex items-center text-xs text-sky-500 mt-1">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            <span>Processing summary...</span>
          </div>
        )}
      </>
    );
  };

  if (loading) {
    console.log("[BookmarksPage] Rendering loading state because loading is true");
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
        <Card className="w-full max-w-lg text-center border-destructive/20 bg-background/80 backdrop-blur-sm mobile-card">
          <CardHeader>
            <CardTitle className="text-3xl text-destructive flex items-center justify-center">
              <AlertCircle className="w-10 h-10 mr-3" /> Error Loading Bookmarks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-4">{error}</p>
            <Button onClick={() => fetchBookmarksCallback(1)} className="hover:scale-105 transition-transform mobile-button">
              <Zap className="mr-2 h-4 w-4" /> Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If we reach here, loading is false, error is null, and bookmarks is an array.
  // The rest of the component rendering logic (calculating filteredAndSortedBookmarks, returning main layout) follows.
  // Calculate the bookmarks to display on every render for maximum safety
  const filteredAndSortedBookmarks = getFilteredAndSortedBookmarks();

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

      <div className="relative z-10 container mx-auto mobile-padding space-y-6 sm:space-y-8">
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
            className="w-full sm:w-auto self-stretch sm:self-auto hover:scale-105 transition-all duration-200 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 min-h-[48px] touch-manipulation mobile-button"
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
          <Card className="p-3 sm:p-4 md:p-6 bg-background/80 backdrop-blur-sm border-border/50 mobile-card">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-end">
              <div className="lg:col-span-1">
                <Label htmlFor="bookmarks-search" className="text-sm font-medium text-muted-foreground mb-2 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <Input
                    id="bookmarks-search"
                    type="text"
                    placeholder="Search title, URL, summary, voice notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-background/50 hover:bg-background/70 focus:bg-background/70 border-border/50 focus:ring-primary focus:border-primary transition-all duration-200 min-h-[48px] touch-manipulation"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bookmarks-platform-filter" className="text-sm font-medium text-muted-foreground mb-2 block">Platform Filter</Label>
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger id="bookmarks-platform-filter" className="w-full bg-background/50 hover:bg-background/70 focus:bg-background/70 border-border/50 focus:ring-primary focus:border-primary transition-all duration-200 min-h-[48px] touch-manipulation">
                    <SelectValue placeholder="Filter by platform..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border shadow-xl">
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="X">X (Twitter)</SelectItem>
                    <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                    <SelectItem value="Reddit">Reddit</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
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
            <Card className="p-8 my-6 text-center bg-background/80 backdrop-blur-sm border-border/50 mobile-card">
              <BookmarkPlus className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchTerm || filter !== 'all' || platformFilter !== 'all' ? 'No Bookmarks Match Your Criteria' : 'No Bookmarks Yet'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm || filter !== 'all' || platformFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Start adding bookmarks to see them here.'}
              </p>
            </Card>
          )}

          {!loading && !error && Array.isArray(filteredAndSortedBookmarks) && filteredAndSortedBookmarks.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {filteredAndSortedBookmarks.map((bookmark, index) => {
                if (!bookmark) {
                  console.warn(`[BookmarksPage] Rendering null bookmark at index ${index}`);
                  return null;
                }

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
                    ref={(el) => (bookmarkRefs.current[bookmark._id] = el)}
                  >
                    <Card className="p-3 sm:p-4 md:p-6 bg-background/80 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 mobile-card rounded-lg">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                        <div className="flex-grow min-w-0 w-full sm:w-auto">
                          <div className="flex items-start gap-2 mb-1">
                            <div className="flex-1 min-w-0">
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
                            </div>
                            {bookmark.hasReminder && bookmark.reminderScheduledFor && (
                              <div className="flex-shrink-0">
                                <div 
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                                    bookmark.reminderStatus === 'sent' 
                                      ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
                                      : bookmark.reminderStatus === 'failed'
                                      ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                                      : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                  }`}
                                  title={`Reminder ${bookmark.reminderStatus}: ${new Date(bookmark.reminderScheduledFor).toLocaleString()}\n${bookmark.reminderMessage || 'No message'}`}
                                >
                                  {bookmark.reminderStatus === 'sent' ? (
                                    <CheckCircle className="w-3 h-3" />
                                  ) : bookmark.reminderStatus === 'failed' ? (
                                    <XCircle className="w-3 h-3" />
                                  ) : (
                                    <Bell className="w-3 h-3" />
                                  )}
                                  <Clock className="w-3 h-3" />
                                  <span className="hidden sm:inline">
                                    {new Date(bookmark.reminderScheduledFor).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-1" title={String(bookmark.originalUrl)}>{String(bookmark.originalUrl)}</p>
                           {renderSpecializedContent(bookmark)}
                          {renderSummarySection(bookmark)}
                        </div>
                        <div className="flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2 w-full sm:w-auto justify-end sm:justify-start shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleToggleReminder(bookmark._id)}
                            disabled={togglingReminderId === bookmark._id}
                            className={`transition-colors duration-200 min-h-[44px] min-w-[44px] touch-manipulation mobile-button tap-target ${
                              bookmark.hasReminder
                                ? 'hover:bg-blue-500/10 hover:text-blue-600 text-blue-600'
                                : 'hover:bg-muted/10 hover:text-muted-foreground'
                            }`}
                            title={bookmark.hasReminder ? "Disable Reminder" : "Enable Reminder"}
                          >
                            {togglingReminderId === bookmark._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : bookmark.hasReminder ? (
                              <Bell className="w-4 h-4" />
                            ) : (
                              <BellOff className="w-4 h-4" />
                            )}
                          </Button>
                          {bookmark.hasReminder && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditReminderClick(bookmark._id, bookmark.reminderScheduledFor)}
                              className="hover:bg-blue-500/10 hover:text-blue-600 transition-colors duration-200 min-h-[44px] min-w-[44px] touch-manipulation mobile-button tap-target"
                              title="Edit Reminder Time"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleSummarizeBookmark(bookmark._id)}
                            disabled={summarizingBookmarkId === bookmark._id || bookmark.status === 'processing'}
                            className="hover:bg-primary/10 hover:text-primary transition-colors duration-200 min-h-[44px] min-w-[44px] touch-manipulation mobile-button tap-target"
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
                            className={`hover:bg-accent/10 hover:text-accent transition-colors duration-200 min-h-[44px] min-w-[44px] touch-manipulation mobile-button tap-target ${audioErrorId === bookmark._id ? 'text-destructive' : ''}`}
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
                            className="hover:bg-destructive/10 hover:text-destructive transition-colors duration-200 min-h-[44px] min-w-[44px] touch-manipulation mobile-button tap-target"
                            title="Delete Bookmark"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {editingReminderId === bookmark._id && (
                        <div className="mt-3 p-3 rounded-md bg-blue-500/10 border border-blue-500/20">
                          <Label htmlFor={`reminder-datetime-${bookmark._id}`} className="text-sm font-medium text-blue-600 mb-2 block">
                            Set Reminder Time
                          </Label>
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Input
                                id={`reminder-datetime-${bookmark._id}`}
                                type="datetime-local"
                                value={reminderDateTime}
                                onChange={(e) => setReminderDateTime(e.target.value)}
                                className="w-full bg-background/50 border-blue-500/30 focus:border-blue-500 focus:ring-blue-500"
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateReminder(bookmark._id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingReminderId(null);
                                setReminderDateTime('');
                              }}
                              className="hover:bg-muted/10"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
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
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage <= 1}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto min-h-[44px] touch-manipulation mobile-button"
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-3 py-2 bg-muted/20 rounded-md">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto min-h-[44px] touch-manipulation mobile-button"
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
