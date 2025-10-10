import React, { useEffect, useState } from 'react';
import { VideoItemType } from '../types/video';
import { getVideosService, updateVideoStatusService, deleteVideoService, summarizeVideoService, searchVideoMomentsService, checkVideoIndexService, indexVideoCaptionsService, VideoMomentResult } from '../services/videoService';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExternalLink, Info, Eye, PlayCircle, CheckCircle, HelpCircle, Trash2, Film, FileText, Loader2, ChevronDown, ChevronUp, Volume2, VolumeX, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from 'framer-motion';
import { FloatingParticles } from '@/components/common/FloatingParticles';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Input } from '@/components/ui/input';
import { useHighlightItem } from '@/hooks/useHighlightItem';
import YouTubeRecommendations from '@/components/videos/YouTubeRecommendations';


const VideosPage: React.FC = () => {
  const [videos, setVideos] = useState<VideoItemType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Use the highlight hook to handle search result navigation
  const videoRefs = useHighlightItem(videos, loading);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [playingStartSeconds, setPlayingStartSeconds] = useState<number>(0);
  const [summarizingVideoId, setSummarizingVideoId] = useState<string | null>(null);
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set());
  const [readingVideoId, setReadingVideoId] = useState<string | null>(null);
  const [speechSynthesis, setSpeechSynthesis] = useState<SpeechSynthesis | null>(null);
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [indexingVideoId, setIndexingVideoId] = useState<string | null>(null);
  const [indexedMap, setIndexedMap] = useState<Record<string, boolean>>({});
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<Record<string, VideoMomentResult[]>>({});
  const [searchLoadingMap, setSearchLoadingMap] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSynthesis(window.speechSynthesis);
    }
    
    // Cleanup on unmount
    return () => {
      if (currentUtterance && speechSynthesis) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  // Cleanup speech when component unmounts
  useEffect(() => {
    return () => {
      if (speechSynthesis) {
        speechSynthesis.cancel();
      }
    };
  }, [speechSynthesis]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const data = await getVideosService();
      setVideos(data);
      setError(null);
      // Pre-check index status for listed videos
      const indexStatuses = await Promise.all(
        data.map(async (v) => {
          try {
            const exists = await checkVideoIndexService(v._id);
            return [v._id, exists] as const;
          } catch {
            return [v._id, false] as const;
          }
        })
      );
      const map: Record<string, boolean> = {};
      indexStatuses.forEach(([id, exists]) => (map[id] = exists));
      setIndexedMap(map);
    } catch (err) {
      setError('Failed to load videos. Please ensure the backend is running and refresh.');
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleStatusChange = async (videoId: string, newStatus: VideoItemType['watchedStatus']) => {
    try {
      const updatedVideo = await updateVideoStatusService(videoId, newStatus);
      setVideos(prevVideos => 
        prevVideos.map(v => v._id === videoId ? { ...v, watchedStatus: updatedVideo.watchedStatus, updatedAt: updatedVideo.updatedAt } : v)
      );
    } catch (err) {
      console.error('Error updating video status:', err);
      // Optionally show a toast notification for the error
      setError(`Failed to update status for video ${videoId}.`);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    // Optional: Add a confirmation dialog here
    // if (!window.confirm("Are you sure you want to delete this video?")) {
    //   return;
    // }
    try {
      await deleteVideoService(videoId);
      setVideos(videos.filter(video => video._id !== videoId));
      toast({
        title: "Success",
        description: "Video deleted successfully.",
      })
    } catch (err) {
      console.error(`Error deleting video ${videoId}:`, err);
      toast({
        title: "Error",
        description: "Failed to delete video.",
        variant: "destructive",
      })
    }
  };

  const handleSummarizeVideo = async (videoId: string) => {
    try {
      setSummarizingVideoId(videoId);
      
      const response = await summarizeVideoService(videoId);
      
      // Update the video in the local state
      setVideos(prevVideos => 
        prevVideos.map(video => 
          video._id === videoId 
            ? { ...video, summary: response.summary }
            : video
        )
      );
      
      toast({
        title: "✅ הסיכום נוצר בהצלחה",
        description: "הסיכום החכם של הסרטון מוכן לצפייה",
        duration: 3000,
      });
      
    } catch (error) {
      console.error('Error summarizing video:', error);
      toast({
        title: "❌ שגיאה ביצירת הסיכום",
        description: "לא הצלחנו ליצור סיכום לסרטון. אנא נסה שוב מאוחר יותר.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setSummarizingVideoId(null);
    }
  };

  const handleIndexCaptions = async (videoId: string) => {
    try {
      setIndexingVideoId(videoId);
      await indexVideoCaptionsService(videoId);
      setIndexedMap((prev) => ({ ...prev, [videoId]: true }));
      toast({ title: 'Indexed', description: 'Video captions indexed successfully.' });
    } catch (e) {
      toast({ title: 'Indexing failed', description: 'Unable to index captions.', variant: 'destructive' });
    } finally {
      setIndexingVideoId(null);
    }
  };

  const handleSearchMoments = async (videoId: string, query: string) => {
    if (!query) {
      setSearchResults((prev) => ({ ...prev, [videoId]: [] }));
      return;
    }
    setSearchLoadingMap((prev) => ({ ...prev, [videoId]: true }));
    try {
      const results = await searchVideoMomentsService(videoId, query);
      setSearchResults((prev) => ({ ...prev, [videoId]: results }));
    } catch (e) {
      setSearchResults((prev) => ({ ...prev, [videoId]: [] }));
    } finally {
      setSearchLoadingMap((prev) => ({ ...prev, [videoId]: false }));
    }
  };

  const toggleSummaryExpansion = (videoId: string) => {
    setExpandedSummaries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  const handleReadAloud = (videoId: string, text: string) => {
    if (!speechSynthesis) {
      toast({
        title: "❌ לא נתמך",
        description: "קריאה בקול רם לא נתמכת בדפדפן זה",
        variant: "destructive",
      });
      return;
    }

    // If currently reading this video, stop
    if (readingVideoId === videoId) {
      speechSynthesis.cancel();
      setReadingVideoId(null);
      setCurrentUtterance(null);
      return;
    }

    // If reading another video, stop it first
    if (readingVideoId) {
      speechSynthesis.cancel();
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to find Hebrew voice, fallback to default
      const voices = speechSynthesis.getVoices();
      const hebrewVoice = voices.find(voice => 
        voice.lang.includes('he') || voice.lang.includes('iw')
      );
      
      if (hebrewVoice) {
        utterance.voice = hebrewVoice;
      }
      
      utterance.lang = 'he-IL';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;

      utterance.onstart = () => {
        setReadingVideoId(videoId);
        setCurrentUtterance(utterance);
      };

      utterance.onend = () => {
        setReadingVideoId(null);
        setCurrentUtterance(null);
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setReadingVideoId(null);
        setCurrentUtterance(null);
        toast({
          title: "❌ שגיאה בקריאה",
          description: "אירעה שגיאה בעת ניסיון לקרוא את הטקסט",
          variant: "destructive",
        });
      };

      speechSynthesis.speak(utterance);
      
      toast({
        title: "🔊 מתחיל לקרוא",
        description: "הסיכום מוקרא בקול רם",
        duration: 2000,
      });

    } catch (error) {
      console.error('Error with text-to-speech:', error);
      toast({
        title: "❌ שגיאה",
        description: "לא הצלחנו להפעיל קריאה בקול רם",
        variant: "destructive",
      });
    }
  };

  const groupedVideos = videos.reduce((acc, video) => {
    if (!acc[video.watchedStatus]) {
      acc[video.watchedStatus] = [];
    }
    acc[video.watchedStatus].push(video);
    return acc;
  }, {} as Record<VideoItemType['watchedStatus'], VideoItemType[]>);

  const sections: { title: string; status: VideoItemType['watchedStatus']; icon: React.ReactNode }[] = [
    { title: 'Watch Next', status: 'unwatched', icon: <PlayCircle className="mr-2 h-6 w-6 text-blue-500" /> },
    { title: 'Currently Watching', status: 'watching', icon: <Eye className="mr-2 h-6 w-6 text-yellow-500" /> },
    { title: 'Watched', status: 'watched', icon: <CheckCircle className="mr-2 h-6 w-6 text-green-500" /> },
  ];

  const statusOptions: { value: VideoItemType['watchedStatus']; label: string }[] = [
    { value: 'unwatched', label: 'Watch Next' },
    { value: 'watching', label: 'Watching' },
    { value: 'watched', label: 'Watched' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white">
        <FloatingParticles items={20} />
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg z-10"
        >
          Loading your video library...
        </motion.p>
        {/* Consider adding a spinner component here */}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-br from-red-900 via-red-950 to-slate-900 text-white p-4">
        <FloatingParticles items={15} type="error" />
        <GlassCard className="max-w-2xl mx-auto mt-8 text-center z-10">
          <CardHeader>
            <CardTitle className="text-2xl text-red-400 flex items-center justify-center"><Info className="h-6 w-6 mr-2" /> Error Loading Videos</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <AnimatedButton onClick={fetchVideos} variant="primary" className="mx-auto">
              Try Again
            </AnimatedButton>
          </CardFooter>
        </GlassCard>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.07 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 100, damping: 12 }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 text-slate-900 dark:text-white p-4 md:p-8 relative overflow-hidden">
      <FloatingParticles items={30} />
      <motion.div
        className="container mx-auto relative z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.h1
          className="text-4xl md:text-5xl font-bold mb-10 md:mb-12 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 dark:from-purple-400 dark:via-pink-500 dark:to-red-400 py-2"
          variants={itemVariants}
        >
          <Film className="inline-block h-10 w-10 mr-3 mb-1 text-purple-600 dark:text-purple-400" /> My Video Library
        </motion.h1>

        {/* YouTube Recommendations section */}
        <motion.div variants={itemVariants} className="mb-12">
          <YouTubeRecommendations onVideosUpdated={fetchVideos} />
        </motion.div>
        
        {/* YouTube Player Section */}
        {playingVideoId && (
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-slate-900/80 p-3 md:p-4 rounded-lg shadow-2xl relative w-full max-w-3xl aspect-video border border-purple-500/30"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            >
              <AnimatedButton 
                variant="ghost"
                size="sm"
                onClick={() => setPlayingVideoId(null)} 
                className="absolute -top-4 -right-4 bg-red-600 hover:bg-red-700 text-white rounded-full h-9 w-9 z-10 shadow-lg"
                title="Close player"
              >
                X
              </AnimatedButton>
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1&start=${playingStartSeconds}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </motion.div>
          </motion.div>
        )}
        
        {videos.length === 0 ? (
           <motion.div variants={itemVariants}>
              <GlassCard className="max-w-lg mx-auto text-center p-8 mt-10">
                  <HelpCircle className="h-12 w-12 mx-auto mb-4 text-purple-600 dark:text-purple-400/70" />
                  <AlertTitle className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Videos Yet!</AlertTitle>
                  <AlertDescription className="text-slate-700 dark:text-purple-200/80">
                      Your video library is empty. Send YouTube links to your Synapse Telegram bot,
                      and they'll appear here, ready to be organized and watched.
                  </AlertDescription>
              </GlassCard>
           </motion.div>
        ) : (
          sections.map(section => (
            <motion.section key={section.status} className="mb-12" variants={itemVariants}>
              <div className="flex items-center mb-6">
                {section.icon}
                <motion.h2 className="text-2xl font-semibold text-slate-900 dark:text-white" variants={itemVariants}>{section.title} ({groupedVideos[section.status]?.length || 0})</motion.h2>
              </div>
              {(groupedVideos[section.status]?.length || 0) === 0 ? (
                <motion.p className="text-slate-600 dark:text-muted-foreground ml-10" variants={itemVariants}>No videos in this section.</motion.p>
              ) : (
                <motion.div 
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  variants={containerVariants}
                >
                  {groupedVideos[section.status]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(video => (
                    <motion.div
                      variants={itemVariants}
                      key={video._id}
                      whileHover={{ y: -5, scale: 1.03 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      ref={(el) => (videoRefs.current[video._id] = el)}
                    >
                      <GlassCard className="flex flex-col overflow-hidden h-full hover:shadow-purple-500/40 rounded-lg">
                        <div onClick={() => setPlayingVideoId(video.videoId)} className="block cursor-pointer relative group aspect-[16/9]">
                          {video.thumbnailUrl ? (
                            <img 
                                src={video.thumbnailUrl}
                                alt={`Thumbnail for ${video.title}`}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500">
                              No Thumbnail
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 flex items-center justify-center transition-all duration-300">
                            <PlayCircle className="h-12 w-12 md:h-16 md:w-16 text-white opacity-0 group-hover:opacity-90 transform scale-75 group-hover:scale-100 transition-all duration-300" />
                          </div>
                        </div>
                        <CardHeader className="flex-grow p-3 md:p-4">
                          <CardTitle className="text-sm md:text-base font-semibold leading-tight mb-1 line-clamp-2 text-slate-900 dark:text-gray-100 hover:text-pink-600 dark:hover:text-pink-300 transition-colors" title={video.title}>
                            {video.title}
                          </CardTitle>
                          {video.channelTitle && (
                            <CardDescription className="text-xs text-purple-700 dark:text-purple-400 line-clamp-1">
                              {video.channelTitle}
                            </CardDescription>
                          )}
                        </CardHeader>
                        
                        {/* Summary Section */}
                        {video.summary && (
                          <CardContent className="p-3 md:p-4 pt-0">
                            <div className="bg-slate-200 dark:bg-slate-800/50 rounded-lg border border-purple-300 dark:border-purple-700/30 overflow-hidden">
                              {/* Accordion Header */}
                              <button
                                onClick={() => toggleSummaryExpansion(video._id)}
                                className="w-full flex items-center justify-between p-3 hover:bg-slate-300 dark:hover:bg-slate-700/30 transition-colors duration-200"
                              >
                                <div className="flex items-center">
                                  <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2" />
                                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">סיכום AI חכם</span>
                                </div>
                                <motion.div
                                  animate={{ rotate: expandedSummaries.has(video._id) ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                </motion.div>
                              </button>

                              {/* Accordion Content */}
                              <AnimatePresence>
                                {expandedSummaries.has(video._id) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-3 pb-3">
                                      <div className="text-xs text-slate-800 dark:text-gray-300 leading-relaxed whitespace-pre-line border-t border-purple-300 dark:border-purple-800/30 pt-3">
                                        {video.summary}
                                      </div>

                                      {/* Read Aloud Button */}
                                      <div className="mt-3 pt-2 border-t border-purple-300 dark:border-purple-800/30 flex items-center justify-between">
                                        <span className="text-xs text-purple-600 dark:text-purple-400/70 italic">
                                          * סיכום זה נוצר על ידי AI על בסיס ניתוח הכותרת והמטאדטה של הסרטון
                                        </span>
                                        
                                        {speechSynthesis && (
                                          <AnimatedButton
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleReadAloud(video._id, video.summary as string)}
                                            className={`ml-2 h-7 px-2 text-xs transition-all duration-200 ${
                                              readingVideoId === video._id
                                                ? 'bg-green-600/20 border-green-500/50 text-green-300 hover:bg-green-600/30'
                                                : 'bg-blue-600/20 border-blue-500/50 text-blue-300 hover:bg-blue-600/30'
                                            }`}
                                            title={readingVideoId === video._id ? "עצור קריאה" : "קרא בקול רם"}
                                          >
                                            {readingVideoId === video._id ? (
                                              <>
                                                <VolumeX className="w-3 h-3 mr-1" />
                                                עצור
                                              </>
                                            ) : (
                                              <>
                                                <Volume2 className="w-3 h-3 mr-1" />
                                                קרא
                                              </>
                                            )}
                                          </AnimatedButton>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </CardContent>
                        )}

                        {/* Search Moments Section */}
                        <CardContent className="p-3 md:p-4 pt-0">
                          <div className="bg-slate-200 dark:bg-slate-800/50 rounded-lg border border-purple-300 dark:border-purple-700/30 overflow-hidden">
                            <div className="w-full flex items-center justify-between p-3">
                              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Search Moments</span>
                              {indexedMap[video._id] ? (
                                <span className="text-[10px] text-green-600 dark:text-green-400">Indexed</span>
                              ) : (
                                <AnimatedButton
                                  size="sm"
                                  variant="outline"
                                  disabled={indexingVideoId === video._id}
                                  onClick={() => handleIndexCaptions(video._id)}
                                  className="text-xs"
                                >
                                  {indexingVideoId === video._id ? 'Indexing...' : 'Index Captions'}
                                </AnimatedButton>
                              )}
                            </div>
                            {indexedMap[video._id] && (
                              <div className="p-3 pt-0 space-y-3">
                                <Input
                                  placeholder="Search moments..."
                                  value={searchQueries[video._id] || ''}
                                  onChange={(e) => {
                                    const q = e.target.value;
                                    setSearchQueries((prev) => ({ ...prev, [video._id]: q }));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSearchMoments(video._id, searchQueries[video._id] || '');
                                    }
                                  }}
                                />
                                <div className="space-y-2 max-h-48 overflow-auto pr-1">
                                  {(searchResults[video._id] || []).map((item) => (
                                    <button
                                      key={item.id}
                                      onClick={() => {
                                        setPlayingVideoId(video.videoId);
                                        setPlayingStartSeconds(item.metadata?.start_time ?? 0);
                                      }}
                                      className="w-full text-left text-xs bg-slate-100 dark:bg-slate-900/40 hover:bg-slate-200 dark:hover:bg-slate-900/70 rounded p-2 border border-purple-300 dark:border-purple-700/30"
                                    >
                                      <div className="text-slate-800 dark:text-purple-200 line-clamp-2">{item.content.text.trim()}</div>
                                      <div className="text-[10px] text-purple-600 dark:text-purple-400/70">t= {item.metadata?.start_time ?? 0}s</div>
                                    </button>
                                  ))}
                                  {searchLoadingMap[video._id] && (
                                    <div className="text-xs text-purple-700 dark:text-purple-300">Searching...</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>

                        <CardFooter className="p-3 md:p-4 pt-2 border-t border-purple-300 dark:border-purple-800/50">
                          <div className="flex flex-col w-full gap-2">
                            {/* Status and Actions Row */}
                            <div className="flex items-center justify-between">
                              <Select
                                  value={video.watchedStatus}
                                  onValueChange={(newStatus: VideoItemType['watchedStatus']) => handleStatusChange(video._id, newStatus)}
                              >
                                  <SelectTrigger className="flex-1 text-xs h-9 bg-slate-200 dark:bg-slate-700/50 border-purple-400 dark:border-purple-600/70 hover:border-purple-500">
                                      <SelectValue placeholder="Change status" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white dark:bg-slate-800 border-purple-400 dark:border-purple-600 text-slate-900 dark:text-white">
                                      {statusOptions.map(opt => (
                                          <SelectItem key={opt.value} value={opt.value} className="text-xs hover:bg-purple-100 dark:hover:bg-purple-700/50 focus:bg-purple-200 dark:focus:bg-purple-700/60">
                                              {opt.label}
                                          </SelectItem>
                                      ))}
                                  </SelectContent>
                              </Select>
                              <AnimatedButton 
                                variant="ghost"
                                size="sm" 
                                onClick={() => handleDeleteVideo(video._id)} 
                                className="ml-2 text-red-500 hover:bg-red-500/10 hover:text-red-400 h-9 w-9 p-0"
                                title="Delete Video"
                              >
                                <Trash2 className="w-4 h-4" />
                              </AnimatedButton>
                            </div>
                            
                            {/* Summarize Button Row */}
                            <div className="flex justify-center">
                              <AnimatedButton
                                variant="outline"
                                size="sm"
                                onClick={() => handleSummarizeVideo(video._id)}
                                disabled={summarizingVideoId === video._id}
                                className="w-full text-xs bg-purple-600/20 border-purple-500/50 hover:bg-purple-600/30 hover:border-purple-400 text-purple-200 hover:text-white transition-all duration-200"
                                title={video.summary ? "יצירת סיכום מחדש" : "יצירת סיכום AI"}
                              >
                                {summarizingVideoId === video._id ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                    יוצר סיכום...
                                  </>
                                ) : (
                                  <>
                                    <FileText className="w-3 h-3 mr-2" />
                                    {video.summary ? "סיכום מחדש" : "צור סיכום"}
                                  </>
                                )}
                              </AnimatedButton>
                            </div>
                          </div>
                        </CardFooter>
                      </GlassCard>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.section>
          ))
        )}
      </motion.div>
    </div>
  );
};

export default VideosPage; 