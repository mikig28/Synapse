import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDigest } from '../context/DigestContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { SkeletonText } from '@/components/ui/Skeleton';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Zap, AlertCircle, FileText, ExternalLink as LinkIcon, TrendingUp, Users, Calendar, BarChart3, Volume2, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import AddNoteModal from '@/components/notes/AddNoteModal';
import useAuthStore from '@/store/authStore';
import { BACKEND_ROOT_URL } from "@/services/axiosConfig";
import { AnimatedDashboardCard, DashboardGrid } from '@/components/animations/AnimatedDashboardCard';
import UpcomingEvents from '@/components/Dashboard/UpcomingEvents';
import RecentVideo from '@/components/Dashboard/RecentVideo';

const API_BASE_URL = `${BACKEND_ROOT_URL}/api/v1`;

const DashboardPage: React.FC = () => {
  const { 
    latestDigest, 
    latestDigestSources,
    isBatchSummarizing, 
    summarizeLatestBookmarks,
    setLatestDigest,
    setLatestDigestSources
  } = useDigest();
  
  const { ref: headerRef, isInView: headerInView } = useScrollAnimation();
  const { ref: digestRef, isInView: digestInView } = useScrollAnimation();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  const token = useAuthStore((state) => state.token);

  console.log('[DashboardPage] Consuming from context - latestDigest:', latestDigest, 'isBatchSummarizing:', isBatchSummarizing, 'sources:', latestDigestSources);

  const handleSummarizeLatestClick = () => {
    console.log("[DashboardPage] handleSummarizeLatestClick called, invoking context action.");
    summarizeLatestBookmarks([], () => {});
  };

  const handleReadAloud = () => {
    if (!latestDigest) return;

    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(latestDigest);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => {
        console.error("Speech synthesis error");
        setIsSpeaking(false);
      };
      speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleClearDigest = () => {
    setLatestDigest(null);
    setLatestDigestSources(null);
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleAddNoteClick = () => {
    console.log("Add Note button clicked! Opening modal.");
    setIsAddNoteModalOpen(true);
  };

  const handleSaveNote = async (noteData: { title?: string; content: string; source?: string }) => {
    if (!token) {
      setNoteError("Authentication token not found. Please log in.");
      return;
    }
    setNoteError(null);
    setIsSavingNote(true);

    try {
      const response = await fetch(`${API_BASE_URL}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          title: noteData.title || undefined,
          content: noteData.content,
          source: noteData.source || 'dashboard'
        }),
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        let errorData;
        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json();
        } else {
          const textError = await response.text();
          throw new Error(`Server returned non-JSON error: ${response.status}. Response: ${textError.substring(0, 100)}...`);
        }
        throw new Error(errorData.message || `Failed to create note. Status: ${response.status}`);
      }

      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        throw new Error(`Expected JSON response, but got ${contentType}. Response: ${textResponse.substring(0,100)}...`);
      }
      await response.json(); 
      console.log("Note saved successfully from dashboard");
      setIsAddNoteModalOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while saving the note.';
      console.error("Error creating note from dashboard:", errorMessage);
      setNoteError(errorMessage);
    } finally {
      setIsSavingNote(false);
    }
  };

  useEffect(() => {
    return () => {
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    };
  }, [latestDigest]);

  // Mock stats for demonstration
  const stats = [
    { title: 'Total Items', value: '1,234', trend: 12, icon: FileText },
    { title: 'Active Projects', value: '24', trend: 8, icon: BarChart3 },
    { title: 'Team Members', value: '12', trend: -2, icon: Users },
    { title: 'This Week', value: '87', trend: 15, icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-secondary/20 to-primary/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto p-4 md:p-8">
        {/* Header Section */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-2">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-lg">
              Welcome back! Here's what's happening with your digital brain.
            </p>
          </div>
          
          <AnimatedButton 
            onClick={handleSummarizeLatestClick}
            disabled={isBatchSummarizing}
            variant="gradient"
            size="lg"
            loading={isBatchSummarizing}
            className="hover-glow"
          >
            {isBatchSummarizing ? (
              <>Generating Digest...</>
            ) : (
              <>
                <FileText className="w-5 h-5 mr-2" />
                Create Latest Digest
              </>
            )}
          </AnimatedButton>
        </motion.div>

        {/* Stats Grid - Updated with new components */}
        <DashboardGrid columns={4}>
          {stats.map((stat, index) => (
            <AnimatedDashboardCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              change={stat.trend}
              icon={stat.icon}
              iconColor="text-primary"
              delay={index * 0.1}
              onClick={() => console.log(`Clicked ${stat.title}`)}
            />
          ))}
        </DashboardGrid>
        
        {/* Digest Section */}
        <motion.div
          ref={digestRef}
          initial={{ opacity: 0, y: 30 }}
          animate={digestInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {isBatchSummarizing ? (
            <GlassCard className="mb-6">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <Zap className="w-5 h-5 mr-2 text-primary animate-pulse" />
                  <h3 className="text-xl font-semibold">Generating Your Digest...</h3>
                </div>
                <SkeletonText lines={4} />
              </div>
            </GlassCard>
          ) : latestDigest ? (
            <GlassCard className="mb-6 animate-fade-in">
              <div className="p-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex items-center justify-between mb-4"
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full mr-3">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold gradient-text">
                      Recent Bookmarks Digest
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={handleReadAloud} title={isSpeaking ? "Stop Reading" : "Read Aloud"}>
                      <Volume2 className={`w-5 h-5 ${isSpeaking ? "text-destructive" : "text-primary"}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleClearDigest} title="Clear Digest">
                      <XCircle className="w-5 h-5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                >
                  {latestDigest.startsWith("OPENAI_API_KEY not configured") || 
                   latestDigest.startsWith("Failed to extract summary") || 
                   latestDigest.startsWith("OpenAI API error") || 
                   latestDigest.startsWith("Content was empty") ||
                   latestDigest.startsWith("Could not generate a digest") ||
                   latestDigest.startsWith("No valid content") ||
                   latestDigest.startsWith("No new bookmarks") ? (
                    <Alert variant="destructive" className="glass border-red-500/20">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Digest Generation Issue</AlertTitle>
                      <AlertDescription>{latestDigest}</AlertDescription>
                    </Alert>
                  ) : (
                    <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {latestDigest}
                    </p>
                  )}

                  {latestDigestSources && latestDigestSources.length > 0 &&
                   !latestDigest.startsWith("Could not generate a digest") && 
                   !latestDigest.startsWith("No valid content") &&
                   !latestDigest.startsWith("No new bookmarks") &&
                   !latestDigest.startsWith("No eligible bookmarks") &&
                   !latestDigest.startsWith("Failed to generate digest") &&
                  (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      className="mt-6 pt-4 border-t border-border/50"
                    >
                      <h5 className="text-sm font-semibold mb-3 text-muted-foreground">
                        Sources:
                      </h5>
                      <div className="grid gap-2">
                        {latestDigestSources.map((source, index) => (
                          <motion.a
                            key={source._id}
                            href={source.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-all duration-200 border border-border/20"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 + 0.5 }}
                            whileHover={{ scale: 1.02 }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                {source.title || source.originalUrl.substring(0, 50) + '...'}
                              </p>
                            </div>
                            <LinkIcon className="w-4 h-4 ml-2 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                          </motion.a>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </GlassCard>
          ) : null}
        </motion.div>

        {/* Upcoming Tasks & Recent Video */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <UpcomingEvents />
          <RecentVideo />
        </motion.div>

        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <GlassCard className="text-center">
            <div className="p-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.8 }}
                className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full mx-auto mb-4 flex items-center justify-center"
              >
                <Zap className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold gradient-text mb-2">
                Your Digital Brain is Ready
              </h2>
              <p className="text-muted-foreground mb-6">
                Start capturing ideas, organizing thoughts, and building your second brain.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <AnimatedButton variant="primary" onClick={handleAddNoteClick}>
                  <FileText className="w-4 h-4 mr-2 pointer-events-none" />
                  Add Note
                </AnimatedButton>
                <AnimatedButton variant="secondary">
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Save Bookmark
                </AnimatedButton>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
      {/* Add Note Modal */}
      <AddNoteModal 
        isOpen={isAddNoteModalOpen}
        onClose={() => {
          setIsAddNoteModalOpen(false);
          setNoteError(null);
        }}
        onSave={handleSaveNote}
        existingError={noteError}
        clearError={() => setNoteError(null)}
      />
    </div>
  );
};

export default DashboardPage; 