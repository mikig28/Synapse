import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDigest } from '../context/DigestContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { SkeletonText } from '@/components/ui/Skeleton';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Zap, AlertCircle, FileText, ExternalLink as LinkIcon, TrendingUp, Users, Calendar, BarChart3, Volume2, XCircle, HardDrive, Bookmark, Play, MessageSquare, Download, Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import AddNoteModal from '@/components/notes/AddNoteModal';
import useAuthStore from '@/store/authStore';
import { BACKEND_ROOT_URL } from "@/services/axiosConfig";
import { AnimatedDashboardCard, DashboardGrid } from '@/components/animations/AnimatedDashboardCard';
import UpcomingEvents from '@/components/Dashboard/UpcomingEvents';
import RecentVideo from '@/components/Dashboard/RecentVideo';
import TelegramFeed from '@/components/Dashboard/TelegramFeed';
import NewsTickerBar from '@/components/Dashboard/NewsTickerBar';
import QuickActionsBar from '@/components/Dashboard/QuickActionsBar';
import RecentItemsAccordion from '@/components/Dashboard/RecentItemsAccordion';
import whatsappService, { WhatsAppConnectionStatus } from '@/services/whatsappService';
import usageService, { UsageData } from '@/services/usageService';
import { agentService } from '@/services/agentService';
import { MetricsDashboard } from '@/components/metrics/MetricsDashboard';
import { UsageDashboard } from '@/components/usage/UsageDashboard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MobileMetricsDashboard } from '@/components/mobile';
import { useDeviceDetection } from '@/hooks/useMobileFeatures';
import type { Agent, AgentRun } from '@/types/agent';
import type { BookmarkItemType } from '@/types/bookmark';
import documentService from '@/services/documentService';
import meetingService from '@/services/meetingService';
import notesService, { NoteItem } from '@/services/notesService';
import ideasService, { IdeaItem } from '@/services/ideasService';
import tasksListService, { TaskItem } from '@/services/tasksListService';
import { getBookmarks, PaginatedBookmarksResponse } from '@/services/bookmarkService';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { WhatsAppSummaryService } from '@/services/whatsappSummaryService';
import { GroupSummaryData } from '@/types/whatsappSummary';

const API_BASE_URL = `${BACKEND_ROOT_URL}/api/v1`;

const RECENT_SUMMARIES_EVENT = 'whatsappSummariesUpdated';

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
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageTrendPct, setUsageTrendPct] = useState<number | undefined>(undefined);
  const [activeAgentsCount, setActiveAgentsCount] = useState<number | undefined>(undefined);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recentRuns, setRecentRuns] = useState<AgentRun[]>([]);
  const [docCount, setDocCount] = useState<number | undefined>(undefined);
  const [meetingsCount, setMeetingsCount] = useState<number | undefined>(undefined);
  const [recentNotes, setRecentNotes] = useState<NoteItem[]>([]);
  const [recentIdeas, setRecentIdeas] = useState<IdeaItem[]>([]);
  const [recentTasks, setRecentTasks] = useState<TaskItem[]>([]);
  const [recentBookmarksCount, setRecentBookmarksCount] = useState<number | undefined>(undefined);
  const [recentBookmarks, setRecentBookmarks] = useState<BookmarkItemType[]>([]);
  const [whatsStatus, setWhatsStatus] = useState<WhatsAppConnectionStatus | null>(null);
  const [recentSummaries, setRecentSummaries] = useState<GroupSummaryData[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(false);

  const token = useAuthStore((state) => state.token);
  const navigate = useNavigate();
  const { isMobile } = useDeviceDetection();

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

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

  // Load base data (agents, recent runs, quick stats) once
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [agentsRes, runsRes, docsStats, mtgStats, notes, ideas, tasks, bookmarks, waStatus, summaries] = await Promise.all([
          agentService.getAgents(),
          agentService.getUserAgentRuns(50),
          documentService.getDocumentStats().catch(() => null),
          meetingService.getMeetingStats().catch(() => null),
          notesService.getNotes(5).catch(() => []),
          ideasService.getIdeas(5).catch(() => []),
          tasksListService.getTasks(5).catch(() => []),
          getBookmarks(1, 5).catch(() => null),
          whatsappService.getConnectionStatus().catch(() => null),
          WhatsAppSummaryService.getRecentSummaries(3, 7).catch(() => []),
        ]);

        if (!mounted) return;
        setAgents(agentsRes || []);
        setRecentRuns(runsRes || []);
        const active = (agentsRes || []).filter(a => a.isActive && a.status !== 'error').length;
        setActiveAgentsCount(active);
        if (docsStats) setDocCount(docsStats.totalDocuments);
        if (mtgStats) setMeetingsCount(mtgStats.totalMeetings);
        setRecentNotes(notes || []);
        setRecentIdeas(ideas || []);
        setRecentTasks(tasks || []);
        if (bookmarks) {
          const bookmarkData = (bookmarks as PaginatedBookmarksResponse);
          setRecentBookmarksCount(bookmarkData.totalBookmarks);
          setRecentBookmarks(bookmarkData.data.slice(0, 5));
        }
        setWhatsStatus(waStatus || null);
        setRecentSummaries(summaries || []);
      } catch (err) {
        console.error('[DashboardPage] Failed to load base data:', err);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  // Load usage for selected period and compute trend
  useEffect(() => {
    let mounted = true;
    const loadUsage = async () => {
      try {
        const [currentUsage, usageHistory] = await Promise.all([
          usageService.getUserUsage(selectedPeriod),
          usageService.getUserUsageHistory(selectedPeriod, 2),
        ]);

        if (!mounted) return;
        setUsage(currentUsage);

        // Compute usage trend vs previous period
        const hist = usageHistory?.history || [];
        if (hist.length >= 2) {
          const prev = hist[hist.length - 2]?.totalUsage || 0;
          const curr = hist[hist.length - 1]?.totalUsage || 0;
          if (prev > 0) {
            const pct = Math.round(((curr - prev) / prev) * 100);
            setUsageTrendPct(pct);
          } else {
            setUsageTrendPct(undefined);
          }
        }
      } catch (err) {
        console.error('[DashboardPage] Failed to load usage data:', err);
      }
    };

    loadUsage();
    return () => { mounted = false; };
  }, [selectedPeriod]);

  const computeTotalUsage = (u: UsageData | null): number | string => {
    if (!u) return '—';
    const f = u.features;
    const total =
      (f.searches?.count || 0) +
      (f.agents?.executionsCount || 0) +
      (f.data?.documentsUploaded || 0) +
      (f.integrations?.whatsappMessages || 0) +
      (f.integrations?.telegramMessages || 0) +
      (f.content?.notesCreated || 0) +
      (f.content?.ideasCreated || 0) +
      (f.content?.tasksCreated || 0) +
      (f.advanced?.vectorSearchQueries || 0) +
      (f.advanced?.aiSummariesGenerated || 0);
    return total;
  };

  const bookmarkStatusCounts = useMemo(() => {
    return recentBookmarks.reduce(
      (acc, bookmark) => {
        const status = bookmark.status ?? 'pending';
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [recentBookmarks]);

  const downloadSummary = (summary: GroupSummaryData) => {
    const keywordsText = summary.topKeywords && summary.topKeywords.length > 0
      ? summary.topKeywords.map(k => `- ${k.keyword} (${k.count})`).join('\n')
      : 'None';

    const emojisText = summary.topEmojis && summary.topEmojis.length > 0
      ? summary.topEmojis.map(e => `- ${e.emoji} (${e.count})`).join('\n')
      : 'None';

    const senderInsights = summary.senderInsights?.length
      ? summary.senderInsights
      : [];

    const insightsText = senderInsights.length > 0
      ? senderInsights
          .map(sender => `### ${sender.senderName}\n- Messages: ${sender.messageCount}\n- Summary: ${sender.summary}\n- Keywords: ${sender.topKeywords.map(k => k.keyword).join(', ') || 'None'}`)
          .join('\n')
      : 'None';

    const content = `# ${summary.groupName} - Summary\n\n**Date:** ${summary.summaryDate.toLocaleDateString()}\n**Time Range:** ${summary.timeRange.start.toLocaleString()} - ${summary.timeRange.end.toLocaleString()}\n**Messages:** ${summary.totalMessages}\n**Participants:** ${summary.activeParticipants}\n\n## Summary\n${summary.overallSummary || ''}\n\n## Top Keywords\n${keywordsText}\n\n## Top Emojis\n${emojisText}\n\n## Participant Insights\n${insightsText}`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summary.groupName}_summary_${summary.summaryDate.toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadRecentSummaries = useCallback(async () => {
    try {
      setSummariesLoading(true);
      const summaries = await WhatsAppSummaryService.getRecentSummaries(3, 7);
      setRecentSummaries(summaries);
    } catch (error) {
      console.error('Error loading recent summaries:', error);
    } finally {
      setSummariesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleRefresh = () => {
      void loadRecentSummaries();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'whatsappSummariesUpdatedAt') {
        void loadRecentSummaries();
      }
    };

    window.addEventListener(RECENT_SUMMARIES_EVENT, handleRefresh);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(RECENT_SUMMARIES_EVENT, handleRefresh);
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadRecentSummaries]);

  const stats = [
    { title: `Total Usage (${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)})`, value: computeTotalUsage(usage), trend: usageTrendPct, icon: BarChart3 },
    { title: 'Active Agents', value: activeAgentsCount ?? '—', trend: undefined, icon: Users },
    { title: 'Storage Used', value: usage ? usageService.formatStorageSize(usage.features.data.totalStorageUsed) : '—', trend: undefined, icon: HardDrive },
    { title: 'Credits Left', value: usage?.billing.credits.remaining ?? '—', trend: undefined, icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <a href="#dashboard-main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-background focus:text-foreground focus:p-2 focus:rounded focus:z-50">
        Skip to main content
      </a>

      {/* News Ticker Bar - Always on top */}
      <NewsTickerBar />

      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
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

      <div id="dashboard-main" className="relative z-10 container mx-auto p-2 sm:p-4 md:p-8">
        {/* Header Section */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4"
        >
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold gradient-text mb-2">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">
              Welcome back! Here's what's happening with your digital brain.
            </p>
          </div>
        </motion.div>

        {/* Stats controls + grid */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <div className="text-xs sm:text-sm text-muted-foreground overflow-hidden">
            <div className="flex gap-2 sm:gap-4 items-center flex-wrap">
              {docCount !== undefined && <span className="whitespace-nowrap">Docs: {docCount}</span>}
              {meetingsCount !== undefined && <span className="whitespace-nowrap">Meetings: {meetingsCount}</span>}
              {typeof recentBookmarksCount === 'number' && <span className="whitespace-nowrap">Bookmarks: {recentBookmarksCount}</span>}
              {whatsStatus && (
                <span className="whitespace-nowrap">
                  WA: {whatsStatus.connected ? '✓' : '✗'}
                </span>
              )}
            </div>
          </div>
          <nav aria-label="Usage timeframe">
            <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          </nav>
        </div>

        <DashboardGrid columns={4} className="gap-3 sm:gap-4 lg:gap-6 min-w-0 mb-6">
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

        {/* HERO SECTION - Latest Digest */}
        <motion.div
          ref={digestRef}
          initial={{ opacity: 0, y: 30 }}
          animate={digestInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-6"
        >
          {isBatchSummarizing ? (
            <GlassCard className="border-2 border-primary/40">
              <div className="p-6" role="status" aria-live="polite">
                <div className="flex items-center mb-4">
                  <Zap className="w-5 h-5 mr-2 text-primary animate-pulse" />
                  <h3 className="text-xl font-semibold">Generating Your Digest...</h3>
                </div>
                <SkeletonText lines={4} />
              </div>
            </GlassCard>
          ) : latestDigest ? (
            <GlassCard className="animate-fade-in border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-accent/5">
              <div className="p-4 sm:p-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex items-center justify-between mb-4 gap-2"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="p-2 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full mr-3 flex-shrink-0">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold gradient-text">
                      Latest Bookmarks Digest
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={handleReadAloud} title={isSpeaking ? "Stop Reading" : "Read Aloud"}>
                      <Volume2 className={`w-5 h-5 ${isSpeaking ? "text-destructive" : "text-primary"}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleClearDigest} title="Clear Digest">
                      <XCircle className="w-5 h-5 text-muted-foreground hover:text-destructive" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleSummarizeLatestClick} title="Regenerate Digest">
                      <RefreshCw className="w-5 h-5 text-muted-foreground hover:text-primary" />
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
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="text-sm leading-relaxed">{latestDigest}</p>
                    </div>
                  )}
                </motion.div>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="border-dashed border-2 border-primary/30">
              <div className="p-6 text-center">
                <div className="inline-flex p-3 bg-primary/10 rounded-full mb-4">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Digest Available</h3>
                <p className="text-sm text-muted-foreground mb-4">Generate a digest from your latest bookmarks</p>
                <AnimatedButton variant="primary" onClick={handleSummarizeLatestClick} size="lg">
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Digest
                </AnimatedButton>
              </div>
            </GlassCard>
          )}
        </motion.div>

    {/* WhatsApp Summaries */}
    {recentSummaries.length > 0 && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-8"
      >
        <GlassCard>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Recent WhatsApp Summaries</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Last 7 days</span>
                <AnimatedButton
                  variant="ghost"
                  size="sm"
                  onClick={loadRecentSummaries}
                  disabled={summariesLoading}
                >
                  {summariesLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </AnimatedButton>
              </div>
            </div>

            <div className="space-y-3">
              {recentSummaries.map((summary, index) => (
                <motion.div
                  key={summary.groupId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex flex-col sm:flex-row items-start justify-between p-3 rounded-lg border border-border/40 bg-background/60 backdrop-blur hover:bg-background/80 transition-colors gap-3"
                >
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="text-sm font-medium text-foreground truncate max-w-[200px] sm:max-w-none">
                        {summary.groupName}
                      </h4>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                        {summary.totalMessages} msg
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <span className="whitespace-nowrap">📅 {summary.summaryDate.toLocaleDateString()}</span>
                        <span className="whitespace-nowrap">👥 {summary.activeParticipants}</span>
                      </div>
                      <div className="truncate">
                        ⏱️ {formatDistanceToNow(summary.generatedAt || new Date(), { addSuffix: true })}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {summary.overallSummary || ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 sm:ml-3 flex-shrink-0">
                    <AnimatedButton
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadSummary(summary)}
                      className="text-muted-foreground hover:text-foreground p-2"
                    >
                      <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                    </AnimatedButton>
                    <AnimatedButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleNavigate('/whatsapp-monitor')}
                      className="text-muted-foreground hover:text-foreground p-2"
                    >
                      <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                    </AnimatedButton>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-border/40">
              <AnimatedButton
                variant="outline"
                size="sm"
                onClick={() => handleNavigate('/whatsapp-monitor')}
                className="w-full"
              >
                View all summaries
              </AnimatedButton>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    )}

        {/* RECENT ACTIVITY - WhatsApp + Telegram */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6"
        >
          <GlassCard className="min-w-0">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base sm:text-lg font-semibold">Telegram Feed</h3>
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
              <TelegramFeed />
            </div>
          </GlassCard>

          <GlassCard className="h-full min-w-0">
            <div className="p-4 sm:p-6 h-full flex flex-col min-w-0">
              <div className="flex items-center justify-between mb-2 gap-2">
                <h3 className="text-base sm:text-lg font-semibold">Featured Content</h3>
                <span className="text-xs text-muted-foreground whitespace-nowrap">Curated</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="rounded-xl border border-border/40 bg-background/60 p-3 sm:p-4 backdrop-blur min-w-0">
                  <h4 className="text-xs sm:text-sm font-semibold mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Recommended Video
                  </h4>
                  <RecentVideo />
                </div>
                <div className="rounded-xl border border-border/30 bg-background/60 p-3 sm:p-4 backdrop-blur flex flex-col min-w-0">
                  <h4 className="text-xs sm:text-sm font-semibold mb-2">Active Bookmarks</h4>
                  <div className="flex items-center justify-between text-[10px] sm:text-xs mb-3 text-muted-foreground flex-wrap gap-1">
                    <span>Saved • last 24h</span>
                    <span>{recentBookmarksCount ?? '—'} total</span>
                  </div>
                  <div className="space-y-3 flex-1 overflow-hidden">
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                      <div>
                        <p className="font-semibold text-foreground text-sm">
                          {bookmarkStatusCounts.pending ?? 0}
                        </p>
                        <p>Pending</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">
                          {bookmarkStatusCounts.summarized ?? 0}
                        </p>
                        <p>Summarized</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">
                          {bookmarkStatusCounts.error ?? 0}
                        </p>
                        <p>Need attention</p>
                      </div>
                    </div>
                    <ul className="space-y-2 overflow-y-auto pr-1 min-h-[120px]">
                      {recentBookmarks.map((bookmark) => (
                        <li key={bookmark._id}>
                          <a
                            href={bookmark.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline line-clamp-2"
                          >
                            {bookmark.title || bookmark.originalUrl}
                          </a>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            {new Date(bookmark.createdAt).toLocaleDateString()}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] uppercase tracking-wide">
                              {bookmark.status || 'pending'}
                            </span>
                          </span>
                        </li>
                      ))}
                      {recentBookmarks.length === 0 && (
                        <li className="text-sm text-muted-foreground">Capture articles or links to see them here.</li>
                      )}
                    </ul>
                    <AnimatedButton
                      variant="outline"
                      size="sm"
                      className="self-start"
                      onClick={handleSummarizeLatestClick}
                      disabled={isBatchSummarizing}
                    >
                      Summarize latest bookmarks
                    </AnimatedButton>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* QUICK ACTIONS BAR */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-6"
        >
          <QuickActionsBar onAddNote={handleAddNoteClick} />
        </motion.div>

        {/* UPCOMING EVENTS */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mb-6"
        >
          <UpcomingEvents />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8"
        >
          <GlassCard className="overflow-hidden border border-border/40 min-w-0">
            <Accordion type="single" collapsible defaultValue="intelligence-hub">
              <AccordionItem value="intelligence-hub" className="border-none">
                <AccordionTrigger className="px-3 sm:px-6">
                  <div className="flex w-full items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 text-left min-w-0">
                      <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                      <h3 className="text-sm sm:text-base lg:text-lg font-semibold truncate">Intelligence Hub</h3>
                    </div>
                    <span className="hidden text-xs text-muted-foreground lg:inline whitespace-nowrap">Monitor • Track</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 sm:px-6">
                  <div className="mt-3 sm:mt-5 grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-6 overflow-hidden min-w-0">
                    <div className="rounded-xl border border-border/30 bg-background/60 p-3 sm:p-5 backdrop-blur min-w-0">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h4 className="text-sm sm:text-base font-semibold">Agent Analytics</h4>
                        <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Live</span>
                      </div>
                      {isMobile ? (
                        <MobileMetricsDashboard agents={agents} recentRuns={recentRuns} />
                      ) : (
                        <MetricsDashboard agents={agents} recentRuns={recentRuns} />
                      )}
                    </div>
                    <div className="rounded-xl border border-border/30 bg-background/60 p-3 sm:p-5 backdrop-blur min-w-0">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h4 className="text-sm sm:text-base font-semibold">Usage Trends</h4>
                        <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Billing</span>
                      </div>
                      <UsageDashboard />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </GlassCard>
        </motion.div>

        {/* RECENT ITEMS ACCORDION */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-6"
        >
          <RecentItemsAccordion
            notes={recentNotes}
            ideas={recentIdeas}
            tasks={recentTasks}
          />
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