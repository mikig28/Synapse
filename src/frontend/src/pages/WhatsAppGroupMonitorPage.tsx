import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Eye,
  EyeOff,
  Users,
  UserPlus,
  Settings,
  Trash2,
  Search,
  Upload,
  Image as ImageIcon,
  Activity,
  Bell,
  MessageSquare,
  RefreshCw,
  Plus,
  X,
  Camera,
  AlertTriangle,
  CheckCircle,
  Clock,
  Archive,
  FileText,
  Calendar,
  BarChart3,
  Download,
  History,
  Loader2,
  PauseCircle,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { whatsappSummaryScheduleService } from '@/services/whatsappSummaryScheduleService';
import { WhatsAppSummaryService } from '@/services/whatsappSummaryService';
import { WhatsAppSummaryScheduleModal, SummaryScheduleFormValues } from '@/components/whatsapp/WhatsAppSummaryScheduleModal';
import useAuthStore from '@/store/authStore';
import api from '@/services/axiosConfig';
import whatsappService from '@/services/whatsappService';
import { format, formatDistanceToNow } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import {
  GroupInfo,
  GroupSelection,
  GroupSummaryData,
  DateRange,
  DATE_RANGE_PRESETS
} from '@/types/whatsappSummary';

import type { WhatsAppSummarySchedule, WhatsAppSummaryScheduleExecution } from '../../../shared/types/whatsappSummarySchedule';

interface PersonProfile {
  _id: string;
  name: string;
  description?: string;
  trainingImages: string[];
  isActive: boolean;
  createdAt: string;
}

interface GroupMonitor {
  _id: string;
  groupId: string;
  groupName: string;
  targetPersons: PersonProfile[];
  isActive: boolean;
  settings: {
    notifyOnMatch: boolean;
    saveAllImages: boolean;
    confidenceThreshold: number;
    autoReply: boolean;
    replyMessage?: string;
  };
  statistics: {
    totalMessages: number;
    imagesProcessed: number;
    personsDetected: number;
    lastActivity?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface FilteredImage {
  _id: string;
  messageId: string;
  groupName: string;
  senderName: string;
  imageUrl: string;
  originalCaption?: string;
  detectedPersons: {
    personName: string;
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }[];
  processingDetails: {
    facesDetected: number;
    processingTime: number;
    status: string;
  };
  isArchived: boolean;
  tags: string[];
  createdAt: string;
}

interface WhatsAppChat {
  id: string;
  name: string;
  isGroup: boolean;
  participantCount?: number;
}

const RECENT_SUMMARIES_EVENT = 'whatsappSummariesUpdated';

// Recent Summaries Component
interface RecentSummariesSectionProps {
  refreshSignal: number;
}

const RecentSummariesSection: React.FC<RecentSummariesSectionProps> = ({ refreshSignal }) => {
  const [recentSummaries, setRecentSummaries] = useState<GroupSummaryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecentSummaries = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const summaries = await WhatsAppSummaryService.getRecentSummaries(10, 7);
      setRecentSummaries(summaries);
    } catch (err: any) {
      console.error('Error loading recent summaries:', err);
      setError(err.message || 'Failed to load recent summaries');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecentSummaries();
  }, [loadRecentSummaries, refreshSignal]);

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

    const content = `# ${summary.groupName} - Summary\n\n**Date:** ${summary.summaryDate.toLocaleDateString()}\n**Time Range:** ${summary.timeRange.start.toLocaleString()} - ${summary.timeRange.end.toLocaleString()}\n**Messages:** ${summary.totalMessages}\n**Participants:** ${summary.activeParticipants}\n\n## Summary\n${summary.overallSummary || summary.summary || ''}\n\n## Top Keywords\n${keywordsText}\n\n## Top Emojis\n${emojisText}\n\n## Participant Insights\n${insightsText}`;

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

  return (
    <GlassCard className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Recent Summaries</h3>
          <p className="text-sm text-blue-200/70">
            View and download your generated WhatsApp summaries
          </p>
        </div>
        <Button
          onClick={() => void loadRecentSummaries()}
          disabled={isLoading}
          size="sm"
          variant="outline"
          className="border-white/30 text-white hover:bg-white/10"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-300" />
          <span className="ml-2 text-blue-200/70">Loading summaries...</span>
        </div>
      ) : recentSummaries.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-blue-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-white mb-2">No Summaries Yet</h4>
          <p className="text-blue-200/70">
            Generate your first summary using the groups above or create a schedule for automatic summaries.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentSummaries.map((summary) => (
            <motion.div
              key={summary.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-white/10 bg-black/20 backdrop-blur-sm rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-white font-medium">{summary.groupName}</h4>
                    <Badge variant="outline" className="border-green-500/40 text-green-200 bg-green-500/10">
                      {summary.totalMessages} messages
                    </Badge>
                  </div>
                  <div className="text-sm text-blue-200/70 space-y-1">
                    <div>📅 {summary.summaryDate.toLocaleDateString()}</div>
                    <div>👥 {summary.activeParticipants} participants</div>
                    <div>⏱️ Generated {formatDistanceToNow(summary.generatedAt || new Date(), { addSuffix: true })}</div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-white line-clamp-2">
                      {summary.overallSummary || summary.summary || ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    onClick={() => downloadSummary(summary)}
                    size="sm"
                    variant="ghost"
                    className="text-blue-300 hover:text-blue-200"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};

const WhatsAppGroupMonitorPage: React.FC = () => {
  const [recentSummariesRefreshToken, setRecentSummariesRefreshToken] = useState(0);
  const [personProfiles, setPersonProfiles] = useState<PersonProfile[]>([]);
  const [groupMonitors, setGroupMonitors] = useState<GroupMonitor[]>([]);
  const [filteredImages, setFilteredImages] = useState<FilteredImage[]>([]);
  const [whatsAppGroups, setWhatsAppGroups] = useState<WhatsAppChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'persons' | 'monitors' | 'images' | 'summaries'>('persons');
  
  // Summary-related state
  const [availableGroups, setAvailableGroups] = useState<GroupInfo[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<GroupSelection[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>(
    whatsappService.createDateRange('today')
  );
  const [customDateRange, setCustomDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });
  const [groupSummaries, setGroupSummaries] = useState<Map<string, GroupSummaryData>>(new Map());
  const [loadingSummaries, setLoadingSummaries] = useState<Set<string>>(new Set());
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<GroupSummaryData | null>(null);
  const [schedules, setSchedules] = useState<WhatsAppSummarySchedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleActionId, setScheduleActionId] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<WhatsAppSummarySchedule | null>(null);
  const [scheduleHistory, setScheduleHistory] = useState<Record<string, WhatsAppSummaryScheduleExecution[]>>({});
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);

  
  // Person Profile Form
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [personForm, setPersonForm] = useState({
    name: '',
    description: '',
    trainingImages: [] as string[]
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  
  // Group Monitor Form
  const [showMonitorForm, setShowMonitorForm] = useState(false);
  const [monitorForm, setMonitorForm] = useState({
    groupId: '',
    groupName: '',
    targetPersons: [] as string[],
    settings: {
      notifyOnMatch: true,
      saveAllImages: false,
      confidenceThreshold: 0.7,
      autoReply: false,
      replyMessage: ''
    }
  });
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated } = useAuthStore();
  const hasLoadedSchedulesRef = useRef(false);

  const scheduleModalInitialValues = useMemo<SummaryScheduleFormValues | undefined>(() => {
    if (!editingSchedule) {
      return undefined;
    }

    return {
      id: editingSchedule._id,
      name: editingSchedule.name,
      description: editingSchedule.description ?? '',
      runAt: editingSchedule.runAt,
      timezone: editingSchedule.timezone,
      includeAIInsights: editingSchedule.includeAIInsights ?? true,
      includeEmojis: editingSchedule.summaryOptions?.includeEmojis ?? true,
      includeKeywords: editingSchedule.summaryOptions?.includeKeywords ?? true,
      targetGroupIds: editingSchedule.targetGroups.map((group) => group.groupId)
    };
  }, [editingSchedule]);

  // Helper function to convert relative URLs to absolute URLs
  const getAbsoluteImageUrl = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}${url}`;
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPersonProfiles(),
        fetchGroupMonitors(),
        fetchFilteredImages(),
        fetchWhatsAppGroups()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableGroups = useCallback(async () => {
    try {
      const groups = await whatsappService.getAvailableGroups();
      setAvailableGroups(groups);
      const groupSelections: GroupSelection[] = groups.map(group => ({
        ...group,
        isSelected: false
      }));
      setSelectedGroups(groupSelections);
    } catch (error) {
      console.error('Error fetching available groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load WhatsApp groups for summaries',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const fetchPersonProfiles = async () => {
    try {
      const response = await api.get('/group-monitor/persons');
      if (response.data.success) {
        setPersonProfiles(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching person profiles:', error);
    }
  };

  const fetchGroupMonitors = async () => {
    try {
      const response = await api.get('/group-monitor/monitors');
      if (response.data.success) {
        setGroupMonitors(response.data.data);
        // Prime statistics with fresh values per monitor
        await refreshAllMonitorStatistics(response.data.data as GroupMonitor[]);
      }
    } catch (error) {
      console.error('Error fetching group monitors:', error);
    }
  };

  const fetchMonitorStatistics = async (monitorId: string) => {
    console.log(`[WhatsApp Monitor Frontend] ðŸ“Š Fetching statistics for monitor: ${monitorId}`);

    try {
      const res = await api.get(`/group-monitor/monitors/${monitorId}/statistics`);
      console.log(`[WhatsApp Monitor Frontend] ðŸ“Š Statistics response for ${monitorId}:`, res.data);

      if (res.data?.success && res.data?.data) {
        const stats = res.data.data as GroupMonitor['statistics'];
        console.log(`[WhatsApp Monitor Frontend] âœ… Updating statistics for monitor ${monitorId}:`, stats);

        setGroupMonitors(prev => {
          const updated = prev.map(m => {
            if (m._id === monitorId) {
              const oldStats = { ...m.statistics };
              const newStats = {
                totalMessages: stats.totalMessages ?? m.statistics.totalMessages,
                imagesProcessed: stats.imagesProcessed ?? m.statistics.imagesProcessed,
                personsDetected: stats.personsDetected ?? m.statistics.personsDetected,
                lastActivity: stats.lastActivity ?? m.statistics.lastActivity,
              };

              console.log(`[WhatsApp Monitor Frontend] ðŸ“Š Stats update for ${monitorId}:`, {
                before: oldStats,
                after: newStats,
                changed: JSON.stringify(oldStats) !== JSON.stringify(newStats)
              });

              return { ...m, statistics: newStats };
            }
            return m;
          });

          console.log(`[WhatsApp Monitor Frontend] ðŸ“Š Updated monitors count: ${updated.length}`);
          return updated;
        });
      } else {
        console.warn(`[WhatsApp Monitor Frontend] âš ï¸ Invalid statistics response for ${monitorId}:`, res.data);
      }
    } catch (err) {
      console.error(`[WhatsApp Monitor Frontend] âŒ Failed to fetch statistics for ${monitorId}:`, err);
    }
  };

  const refreshAllMonitorStatistics = async (monitors: GroupMonitor[] = groupMonitors) => {
    console.log(`[WhatsApp Monitor Frontend] ðŸ”„ Refreshing statistics for ${monitors.length} monitors`);
    if (!monitors || monitors.length === 0) {
      console.log(`[WhatsApp Monitor Frontend] âš ï¸ No monitors to refresh`);
      return;
    }

    try {
      console.log(`[WhatsApp Monitor Frontend] ðŸ”„ Starting parallel statistics fetch for monitors:`,
        monitors.map(m => ({ id: m._id, groupName: m.groupName }))
      );

      await Promise.all(monitors.map(m => fetchMonitorStatistics(m._id)));

      console.log(`[WhatsApp Monitor Frontend] âœ… Completed statistics refresh for all ${monitors.length} monitors`);
    } catch (error) {
      console.error(`[WhatsApp Monitor Frontend] âŒ Error refreshing monitor statistics:`, error);
    }
  };

  // Periodically refresh monitor statistics when viewing monitors
  useEffect(() => {
    if (selectedView !== 'monitors' || groupMonitors.length === 0) {
      console.log(`[WhatsApp Monitor Frontend] ðŸ”„ Skipping periodic refresh - view: ${selectedView}, monitors: ${groupMonitors.length}`);
      return;
    }

    console.log(`[WhatsApp Monitor Frontend] â° Starting periodic statistics refresh (every 15s) for ${groupMonitors.length} monitors`);

    const interval = setInterval(() => {
      console.log(`[WhatsApp Monitor Frontend] â° Periodic refresh triggered`);
      refreshAllMonitorStatistics();
    }, 15000); // 15s refresh

    return () => {
      console.log(`[WhatsApp Monitor Frontend] â° Clearing periodic refresh interval`);
      clearInterval(interval);
    };
  }, [selectedView, groupMonitors.length]);

  const fetchFilteredImages = async () => {
    try {
      const response = await api.get('/group-monitor/filtered-images');
      if (response.data.success) {
        setFilteredImages(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching filtered images:', error);
    }
  };

  const fetchWhatsAppGroups = async () => {
    try {
      const response = await api.get('/whatsapp/groups');
      if (response.data.success) {
        setWhatsAppGroups(response.data.data.filter((group: WhatsAppChat) => group.isGroup));
      }
    } catch (error) {
      console.error('Error fetching WhatsApp groups:', error);
    }
  };

  const handleImageUpload = async (files: FileList) => {
    if (files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await api.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (response.data.success) {
          // Convert relative URL to absolute URL
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
          const relativeUrl = response.data.data.url;
          const absoluteUrl = relativeUrl.startsWith('http') ? relativeUrl : `${baseUrl}${relativeUrl}`;
          return absoluteUrl;
        }
        throw new Error('Upload failed');
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setPersonForm(prev => ({
        ...prev,
        trainingImages: [...prev.trainingImages, ...uploadedUrls]
      }));

      toast({
        title: "Success",
        description: `${uploadedUrls.length} image(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: "Error",
        description: "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const createPersonProfile = async () => {
    if (!personForm.name.trim() || personForm.trainingImages.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a name and at least one training image",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await api.post('/group-monitor/persons', personForm);
      if (response.data.success) {
        setPersonProfiles([...personProfiles, response.data.data]);
        setPersonForm({ name: '', description: '', trainingImages: [] });
        setShowPersonForm(false);
        toast({
          title: "Success",
          description: "Person profile created successfully",
        });
      }
    } catch (error: any) {
      console.error('Error creating person profile:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to create person profile",
        variant: "destructive",
      });
    }
  };

  const createGroupMonitor = async () => {
    // Derive group name from selected group if it's missing
    const selectedGroup = whatsAppGroups.find(g => String(g.id) === String(monitorForm.groupId));
    const payload = {
      ...monitorForm,
      groupName: monitorForm.groupName || selectedGroup?.name || '',
    };

    // Enhanced validation with specific error messages
    if (!payload.groupId) {
      toast({
        title: "Validation Error",
        description: "Please select a WhatsApp group",
        variant: "destructive",
      });
      return;
    }

    if (!payload.groupName) {
      toast({
        title: "Validation Error",
        description: "Group name is missing. Please reselect the group",
        variant: "destructive",
      });
      return;
    }

    if (payload.targetPersons.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one person to monitor",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Creating group monitor with data:', payload);
      const response = await api.post('/group-monitor/monitors', payload);
      if (response.data.success) {
        setGroupMonitors(prev => [...prev, response.data.data]);
        setMonitorForm({
          groupId: '',
          groupName: '',
          targetPersons: [],
          settings: {
            notifyOnMatch: true,
            saveAllImages: false,
            confidenceThreshold: 0.7,
            autoReply: false,
            replyMessage: ''
          }
        });
        setShowMonitorForm(false);
        toast({
          title: "Success",
          description: "Group monitor created successfully",
        });
      }
    } catch (error: any) {
      console.error('Error creating group monitor:', error);
      console.error('Request data was:', payload);

      const errorMessage = error.response?.data?.error || error.message || "Failed to create group monitor";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const toggleMonitor = async (monitorId: string, isActive: boolean) => {
    try {
      const response = await api.put(`/group-monitor/monitors/${monitorId}`, {
        isActive: !isActive
      });
      if (response.data.success) {
        setGroupMonitors(monitors =>
          monitors.map(monitor =>
            monitor._id === monitorId
              ? { ...monitor, isActive: !isActive }
              : monitor
          )
        );
        toast({
          title: "Success",
          description: `Monitor ${!isActive ? 'activated' : 'deactivated'}`,
        });
      }
    } catch (error: any) {
      console.error('Error toggling monitor:', error);
      toast({
        title: "Error",
        description: "Failed to update monitor",
        variant: "destructive",
      });
    }
  };

  const deletePersonProfile = async (personId: string) => {
    if (!confirm('Are you sure you want to delete this person profile?')) return;

    try {
      const response = await api.delete(`/group-monitor/persons/${personId}`);
      if (response.data.success) {
        setPersonProfiles(profiles => profiles.filter(p => p._id !== personId));
        toast({
          title: "Success",
          description: "Person profile deleted successfully",
        });
      }
    } catch (error: any) {
      console.error('Error deleting person profile:', error);
      toast({
        title: "Error",
        description: "Failed to delete person profile",
        variant: "destructive",
      });
    }
  };

  const deleteGroupMonitor = async (monitorId: string) => {
    if (!confirm('Are you sure you want to delete this group monitor?')) return;

    try {
      const response = await api.delete(`/group-monitor/monitors/${monitorId}`);
      if (response.data.success) {
        setGroupMonitors(monitors => monitors.filter(m => m._id !== monitorId));
        toast({
          title: "Success",
          description: "Group monitor deleted successfully",
        });
      }
    } catch (error: any) {
      console.error('Error deleting group monitor:', error);
      toast({
        title: "Error",
        description: "Failed to delete group monitor",
        variant: "destructive",
      });
    }
  };

  const archiveImage = async (imageId: string) => {
    try {
      const response = await api.put(`/group-monitor/filtered-images/${imageId}/archive`);
      if (response.data.success) {
        setFilteredImages(images =>
          images.map(img =>
            img._id === imageId ? { ...img, isArchived: true } : img
          )
        );
        toast({
          title: "Success",
          description: "Image archived",
        });
      }
    } catch (error: any) {
      console.error('Error archiving image:', error);
      toast({
        title: "Error",
        description: "Failed to archive image",
        variant: "destructive",
      });
    }
  };

  const fetchSchedules = useCallback(async () => {
    try {
      setSchedulesLoading(true);
      setScheduleError(null);
      const data = await whatsappSummaryScheduleService.getSchedules();
      setSchedules(data);
      hasLoadedSchedulesRef.current = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load schedules';
      console.error('[WhatsApp Summary] Failed to load schedules', error);
      setScheduleError(message);
      toast({
        title: 'Failed to load schedules',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setSchedulesLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedView !== 'summaries') {
      return;
    }

    if (availableGroups.length === 0) {
      fetchAvailableGroups();
    }

    if (!hasLoadedSchedulesRef.current) {
      fetchSchedules();
    }
  }, [selectedView, availableGroups.length, fetchAvailableGroups, fetchSchedules]);

  const openCreateScheduleModal = () => {
    setEditingSchedule(null);
    setScheduleModalOpen(true);
  };

  const handleScheduleSubmit = async (values: SummaryScheduleFormValues) => {
    const targetGroups = availableGroups
      .filter(group => values.targetGroupIds.includes(group.id))
      .map(group => ({ groupId: group.id, groupName: group.name }));

    if (targetGroups.length === 0) {
      toast({
        title: 'Select at least one group',
        description: 'Choose the WhatsApp groups you want summarized automatically.',
        variant: 'destructive'
      });
      return;
    }

    setScheduleSubmitting(true);
    try {
      const payload = {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        runAt: values.runAt,
        timezone: values.timezone,
        targetGroups,
        includeAIInsights: values.includeAIInsights,
        summaryOptions: {
          includeEmojis: values.includeEmojis,
          includeKeywords: values.includeKeywords
        }
      };

      if (values.id) {
        await whatsappSummaryScheduleService.updateSchedule(values.id, payload);
        toast({
          title: 'Schedule updated',
          description: 'Daily summary schedule updated successfully.'
        });
      } else {
        await whatsappSummaryScheduleService.createSchedule(payload);
        toast({
          title: 'Schedule created',
          description: 'Daily summary schedule created successfully.'
        });
      }

      setScheduleModalOpen(false);
      setEditingSchedule(null);
      await fetchSchedules();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save schedule';
      console.error('[WhatsApp Summary] Failed to save schedule', error);
      toast({
        title: 'Failed to save schedule',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const handleToggleSchedule = async (schedule: WhatsAppSummarySchedule) => {
    setScheduleActionId(schedule._id);
    try {
      await whatsappSummaryScheduleService.toggleSchedule(schedule._id);
      toast({
        title: schedule.status === 'active' ? 'Schedule paused' : 'Schedule activated',
        description: `${schedule.name} is now ${schedule.status === 'active' ? 'paused' : 'active'}.`
      });
      await fetchSchedules();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update schedule';
      console.error('[WhatsApp Summary] Failed to toggle schedule', error);
      toast({
        title: 'Failed to update schedule',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setScheduleActionId(null);
    }
  };

  const handleRunSchedule = async (schedule: WhatsAppSummarySchedule) => {
    setScheduleActionId(schedule._id);
    try {
      await whatsappSummaryScheduleService.runNow(schedule._id);
      toast({
        title: 'Summary queued',
        description: 'Schedule run requested successfully.'
      });
      await fetchSchedules();
      await loadScheduleHistory(schedule._id, true);
      setRecentSummariesRefreshToken((prev) => prev + 1);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(RECENT_SUMMARIES_EVENT));
        try {
          localStorage.setItem('whatsappSummariesUpdatedAt', Date.now().toString());
        } catch (storageError) {
          console.warn('Failed to update localStorage for summaries refresh', storageError);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to run schedule';
      console.error('[WhatsApp Summary] Failed to run schedule', error);
      toast({
        title: 'Failed to run schedule',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setScheduleActionId(null);
    }
  };

  const handleDeleteSchedule = async (schedule: WhatsAppSummarySchedule) => {
    if (!window.confirm(`Delete schedule "${schedule.name}"?`)) {
      return;
    }

    setScheduleActionId(schedule._id);
    try {
      await whatsappSummaryScheduleService.deleteSchedule(schedule._id);
      toast({
        title: 'Schedule deleted',
        description: `${schedule.name} has been removed.`
      });
      await fetchSchedules();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete schedule';
      console.error('[WhatsApp Summary] Failed to delete schedule', error);
      toast({
        title: 'Failed to delete schedule',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setScheduleActionId(null);
    }
  };

  const handleEditSchedule = (schedule: WhatsAppSummarySchedule) => {
    setEditingSchedule(schedule);
    setScheduleModalOpen(true);
  };

  const loadScheduleHistory = async (scheduleId: string, force = false) => {
    if (!force && (historyLoadingId === scheduleId || scheduleHistory[scheduleId])) {
      return;
    }

    setHistoryLoadingId(scheduleId);
    try {
      const history = await whatsappSummaryScheduleService.getHistory(scheduleId, 10);
      setScheduleHistory(prev => ({ ...prev, [scheduleId]: history }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load history';
      console.error('[WhatsApp Summary] Failed to load schedule history', error);
      toast({
        title: 'Failed to load history',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setHistoryLoadingId(null);
    }
  };

  const getScheduleHistory = (scheduleId: string) => scheduleHistory[scheduleId] || [];

  // Summary-related methods
  const handleGroupSelection = (groupId: string) => {
    setSelectedGroups(groups =>
      groups.map(group =>
        group.id === groupId ? { ...group, isSelected: !group.isSelected } : group
      )
    );
  };

  const handleDateRangeChange = (range: DateRange) => {
    setSelectedDateRange(range);
    if (range.type === 'custom') {
      setCustomDateRange({
        start: range.start,
        end: range.end
      });
    }
  };

  const generateGroupSummary = async (groupId: string) => {
    const group = selectedGroups.find(g => g.id === groupId);
    if (!group) return;

    setLoadingSummaries(prev => new Set([...prev, groupId]));
    
    try {
      let dateToUse = selectedDateRange.start;
      
      // For custom range, use the start date
      if (selectedDateRange.type === 'custom' && customDateRange.start) {
        dateToUse = customDateRange.start;
      }

      const summary = await whatsappService.generateDailySummary({
        groupId: group.id,
        date: dateToUse.toISOString().split('T')[0], // YYYY-MM-DD format
        timezone: whatsappService.getUserTimezone(),
        chatType: group.chatType || (group.isGroup ? 'group' : 'private')
      });

      setGroupSummaries(prev => new Map(prev.set(groupId, summary)));
      setSelectedSummary(summary);
      setShowSummaryModal(true);

      toast({
        title: "Success",
        description: `Summary generated for ${group.name}`,
      });
    } catch (error: any) {
      console.error('Error generating summary:', error);
      toast({
        title: "Error",
        description: `Failed to generate summary: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoadingSummaries(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    }
  };

  const generateTodaySummary = async (groupId: string) => {
    const group = selectedGroups.find(g => g.id === groupId);
    if (!group) return;

    setLoadingSummaries(prev => new Set([...prev, groupId]));
    
    try {
      const summary = await whatsappService.generateTodaySummary({
        groupId: group.id,
        timezone: whatsappService.getUserTimezone(),
        chatType: group.chatType || (group.isGroup ? 'group' : 'private')
      });

      setGroupSummaries(prev => new Map(prev.set(groupId, summary)));
      setSelectedSummary(summary);
      setShowSummaryModal(true);

      toast({
        title: "Success",
        description: `Today's summary generated for ${group.name}`,
      });
    } catch (error: any) {
      console.error('Error generating today summary:', error);
      toast({
        title: "Error",
        description: `Failed to generate today's summary: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoadingSummaries(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    }
  };

  const viewSummaryById = async (summaryId: string) => {
    try {
      const summary = await whatsappService.getSummaryById(summaryId);
      setSelectedSummary(summary);
      setShowSummaryModal(true);
    } catch (error: any) {
      console.error('Error fetching summary:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to load summary',
        variant: "destructive",
      });
    }
  };

  const downloadSummary = (summary: GroupSummaryData) => {
    const formatted = whatsappService.formatSummaryForDisplay(summary);
// Add AI insights to downloaded summary
let aiInsightsText = '';
if (summary.aiInsights) {
  aiInsightsText = `

AI INSIGHTS
------------
Sentiment: ${summary.aiInsights.sentiment}

Key Topics:
${summary.aiInsights.keyTopics.map(topic => `â€¢ ${topic}`).join('\n')}

Action Items:
${summary.aiInsights.actionItems.length > 0 ? summary.aiInsights.actionItems.map(item => `â˜ ${item}`).join('\n') : 'None identified'}

Important Events:
${summary.aiInsights.importantEvents.length > 0 ? summary.aiInsights.importantEvents.map(event => `â€¢ ${event}`).join('\n') : 'None identified'}

Decisions Made:
${summary.aiInsights.decisionsMade.length > 0 ? summary.aiInsights.decisionsMade.map(decision => `âœ“ ${decision}`).join('\n') : 'None identified'}`;
}

    const content = `${formatted.title}
${formatted.subtitle}

OVERVIEW
${summary.overallSummary}

STATISTICS
${formatted.stats.map(stat => `${stat.label}: ${stat.value}`).join('\n')}

TOP PARTICIPANTS
${formatted.topSenders.map(sender => `â€¢ ${sender.name} (${sender.count} messages): ${sender.summary}`).join('\n')}

TOP KEYWORDS
${formatted.keywords.join(', ')}

TOP EMOJIS
${formatted.emojis.join(' ')}${aiInsightsText}

Generated on ${new Date().toLocaleString()}
Processing time: ${summary.processingStats.processingTimeMs}ms`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summary.groupName}-summary-${summary.timeRange.start.toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredPersonProfiles = personProfiles.filter(person =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGroupMonitors = groupMonitors.filter(monitor =>
    monitor.groupName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredImagesList = filteredImages.filter(image => {
    const matchesSearch = image.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         image.senderName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPerson = !selectedPersonFilter || 
                         image.detectedPersons.some(p => p.personName === selectedPersonFilter);
    const matchesGroup = !selectedGroupFilter || image.groupName === selectedGroupFilter;
    
    return matchesSearch && matchesPerson && matchesGroup;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-purple-900 p-6">
        <div className="flex items-center justify-center min-h-full">
          <GlassCard className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-violet-300 animate-spin mx-auto mb-4" />
            <p className="text-white">Loading WhatsApp Group Monitor...</p>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Camera className="w-8 h-8 text-green-400" />
                <h1 className="text-3xl font-bold text-white">WhatsApp Group Monitor</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <AnimatedButton
                onClick={fetchAllData}
                variant="outline"
                size="sm"
                className="border-blue-400/30 text-blue-200 hover:bg-blue-500/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </AnimatedButton>
            </div>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <UserPlus className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-sm text-blue-100/70">Registered Persons</p>
                <p className="text-2xl font-bold text-white">{personProfiles.length}</p>
              </div>
            </div>
          </GlassCard>
          
          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <Eye className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-sm text-blue-100/70">Active Monitors</p>
                <p className="text-2xl font-bold text-white">
                  {groupMonitors.filter(m => m.isActive).length}
                </p>
              </div>
            </div>
          </GlassCard>
          
          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <ImageIcon className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-sm text-blue-100/70">Filtered Images</p>
                <p className="text-2xl font-bold text-white">{filteredImages.length}</p>
              </div>
            </div>
          </GlassCard>
          
          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-orange-400" />
              <div>
                <p className="text-sm text-blue-100/70">Total Detections</p>
                <p className="text-2xl font-bold text-white">
                  {groupMonitors.reduce((sum, m) => sum + m.statistics.personsDetected, 0)}
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 gap-4 mb-6 w-full sm:flex sm:flex-wrap sm:overflow-x-auto">
          <Button
            onClick={() => setSelectedView('persons')}
            variant={selectedView === 'persons' ? 'default' : 'outline'}
            className={selectedView === 'persons'
              ? 'w-full sm:w-auto bg-violet-500 hover:bg-violet-600'
              : 'w-full sm:w-auto border-white/30 text-white hover:bg-white/10'
            }
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Person Profiles
          </Button>

          <Button
            onClick={() => setSelectedView('monitors')}
            variant={selectedView === 'monitors' ? 'default' : 'outline'}
            className={selectedView === 'monitors'
              ? 'w-full sm:w-auto bg-violet-500 hover:bg-violet-600'
              : 'w-full sm:w-auto border-white/30 text-white hover:bg-white/10'
            }
          >
            <Eye className="w-4 h-4 mr-2" />
            Group Monitors
          </Button>

          <Button
            onClick={() => setSelectedView('summaries')}
            variant={selectedView === 'summaries' ? 'default' : 'outline'}
            className={selectedView === 'summaries'
              ? 'w-full sm:w-auto bg-violet-500 hover:bg-violet-600'
              : 'w-full sm:w-auto border-white/30 text-white hover:bg-white/10'
            }
          >
            <FileText className="w-4 h-4 mr-2" />
            Daily Summaries
          </Button>

          <Button
            onClick={() => setSelectedView('images')}
            variant={selectedView === 'images' ? 'default' : 'outline'}
            className={selectedView === 'images'
              ? 'w-full sm:w-auto bg-violet-500 hover:bg-violet-600'
              : 'w-full sm:w-auto border-white/30 text-white hover:bg-white/10'
            }
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Filtered Images
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <GlassCard className="p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-blue-300" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-blue-300"
              />
            </div>
            
            {selectedView === 'images' && (
              <>
                <select
                  value={selectedPersonFilter}
                  onChange={(e) => setSelectedPersonFilter(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white"
                >
                  <option value="">All Persons</option>
                  {personProfiles.map(person => (
                    <option key={person._id} value={person.name}>
                      {person.name}
                    </option>
                  ))}
                </select>
                
                <select
                  value={selectedGroupFilter}
                  onChange={(e) => setSelectedGroupFilter(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white"
                >
                  <option value="">All Groups</option>
                  {[...new Set(filteredImages.map(img => img.groupName))].map(groupName => (
                    <option key={groupName} value={groupName}>
                      {groupName}
                    </option>
                  ))}
                </select>
              </>
            )}
            
            {selectedView === 'persons' && (
              <Button
                onClick={() => setShowPersonForm(true)}
                className="bg-green-500 hover:bg-green-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Person
              </Button>
            )}
            
            {selectedView === 'monitors' && (
              <Button
                onClick={() => setShowMonitorForm(true)}
                className="bg-green-500 hover:bg-green-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Monitor
              </Button>
            )}
          </div>
        </GlassCard>

        {/* Content Area */}
        <div className="space-y-6">
          {selectedView === 'persons' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPersonProfiles.map((person) => (
                <motion.div
                  key={person._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <GlassCard className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{person.name}</h3>
                        {person.description && (
                          <p className="text-sm text-blue-200/70 mt-1">{person.description}</p>
                        )}
                      </div>
                      <Button
                        onClick={() => deletePersonProfile(person._id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-200/70">Training Images:</span>
                        <span className="text-white">{person.trainingImages.length}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-200/70">Status:</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${person.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                          <span className="text-white">{person.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        {person.trainingImages.slice(0, 3).map((imageUrl, index) => (
                          <img
                            key={index}
                            src={getAbsoluteImageUrl(imageUrl)}
                            alt={`${person.name} training ${index + 1}`}
                            className="w-full h-16 object-cover rounded-lg bg-white/10"
                            onError={(e) => {
                              console.error('Failed to load image:', imageUrl);
                              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjMyIiB5PSIzNiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjNzc3IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JbWFnZSBFcnJvcjwvdGV4dD4KPC9zdmc+';
                            }}
                          />
                        ))}
                        {person.trainingImages.length > 3 && (
                          <div className="w-full h-16 bg-white/10 rounded-lg flex items-center justify-center">
                            <span className="text-xs text-blue-200/70">
                              +{person.trainingImages.length - 3} more
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}

          {selectedView === 'monitors' && (
            <div className="space-y-4">
              {filteredGroupMonitors.map((monitor) => (
                <motion.div
                  key={monitor._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <GlassCard className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Users className="w-5 h-5 text-green-400" />
                          <h3 className="text-lg font-semibold text-white">{monitor.groupName}</h3>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={monitor.isActive}
                              onCheckedChange={() => toggleMonitor(monitor._id, monitor.isActive)}
                            />
                            <span className="text-sm text-blue-200/70">
                              {monitor.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-white">{monitor.statistics.totalMessages}</p>
                            <p className="text-xs text-blue-200/70">Messages</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-white">{monitor.statistics.imagesProcessed}</p>
                            <p className="text-xs text-blue-200/70">Images</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-white">{monitor.statistics.personsDetected}</p>
                            <p className="text-xs text-blue-200/70">Detections</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-white">
                              {(monitor.settings.confidenceThreshold * 100).toFixed(0)}%
                            </p>
                            <p className="text-xs text-blue-200/70">Confidence</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          {monitor.targetPersons.map((person) => (
                            <span
                              key={person._id}
                              className="px-3 py-1 bg-violet-500/30 text-violet-200 text-sm rounded-full"
                            >
                              {person.name}
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-blue-200/70">
                          {monitor.settings.notifyOnMatch && (
                            <div className="flex items-center gap-1">
                              <Bell className="w-3 h-3" />
                              <span>Notifications</span>
                            </div>
                          )}
                          {monitor.settings.autoReply && (
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              <span>Auto-reply</span>
                            </div>
                          )}
                          {monitor.settings.saveAllImages && (
                            <div className="flex items-center gap-1">
                              <Archive className="w-3 h-3" />
                              <span>Save all images</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => deleteGroupMonitor(monitor._id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}

          {selectedView === 'summaries' && (
            <div className="space-y-6">
              <GlassCard className="p-6 space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Automated Daily Summaries</h3>
                    <p className="text-sm text-blue-200/70">
                      Automate recurring WhatsApp digests with scheduled AI summaries.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                    <Badge variant="outline" className="border-blue-400/40 text-blue-200 bg-blue-500/10">
                      {`${schedules?.filter(schedule => schedule.status === 'active').length || 0} active`}
                    </Badge>
                    <Button onClick={openCreateScheduleModal} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      New schedule
                    </Button>
                  </div>
                </div>

                {scheduleError && (
                  <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {scheduleError}
                  </div>
                )}

                <div>
                  {schedulesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-blue-200/70">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading schedules...
                    </div>
                  ) : (schedules?.length ?? 0) === 0 ? (
                    <div className="rounded-md border border-dashed border-white/10 bg-white/5 p-6 text-sm text-blue-200/70 text-center">
                      No schedules yet. Create a schedule to receive automatic summaries.
                    </div>
                  ) : (
                    <Accordion
                      type="single"
                      collapsible
                      value={expandedScheduleId ?? undefined}
                      onValueChange={(value) => {
                        const nextValue = value || null;
                        setExpandedScheduleId(nextValue);
                        if (nextValue) {
                          void loadScheduleHistory(nextValue);
                        }
                      }}
                      className="space-y-2">
                      {(schedules || []).map((schedule) => {
                        const activeGroups = schedule.targetGroups.length;
                        const nextExecutionLabel = schedule.nextExecutionAt
                          ? formatInTimeZone(new Date(schedule.nextExecutionAt), schedule.timezone, 'MMM d, yyyy HH:mm')
                          : 'Not scheduled';
                        const lastExecutionLabel = schedule.lastExecutionAt
                          ? formatDistanceToNow(new Date(schedule.lastExecutionAt), { addSuffix: true })
                          : 'Not run yet';
                        const history = getScheduleHistory(schedule._id);
                        const isActionLoading = scheduleActionId === schedule._id;

                        return (
                          <AccordionItem
                            key={schedule._id}
                            value={schedule._id}
                            className="rounded-lg border border-white/10 bg-black/20 backdrop-blur-sm">
                            <AccordionTrigger className="px-4 py-3 text-left hover:no-underline">
                              <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-3">
                                  <Badge
                                    variant={schedule.status === 'active' ? 'default' : 'outline'}
                                    className={schedule.status === 'active'
                                      ? 'bg-green-500/20 text-green-200 border-green-500/40'
                                      : 'bg-yellow-500/10 text-yellow-200 border-yellow-500/30'}>
                                    {schedule.status === 'active' ? 'Active' : 'Paused'}
                                  </Badge>
                                  <span className="text-white font-semibold">{schedule.name}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200/70">
                                  <span>Runs at {schedule.runAt} ({schedule.timezone})</span>
                                  <span>Next run: {nextExecutionLabel}</span>
                                  <span>{activeGroups} group{activeGroups === 1 ? '' : 's'}</span>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              <div className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                  {schedule.targetGroups.map((group) => (
                                    <Badge
                                      key={group.groupId}
                                      variant="outline"
                                      className="border-blue-400/30 bg-blue-500/10 text-blue-100">
                                      {group.groupName}
                                    </Badge>
                                  ))}
                                </div>

                                <div className="grid gap-3 md:grid-cols-3">
                                  <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-blue-200/70">
                                    <div className="text-xs uppercase tracking-wide text-blue-200/50">Next run</div>
                                    <div className="text-white font-medium">{nextExecutionLabel}</div>
                                  </div>
                                  <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-blue-200/70">
                                    <div className="text-xs uppercase tracking-wide text-blue-200/50">Last run</div>
                                    <div className="text-white font-medium">{lastExecutionLabel}</div>
                                  </div>
                                  <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-blue-200/70">
                                    <div className="text-xs uppercase tracking-wide text-blue-200/50">Last status</div>
                                    <div className="text-white font-medium">
                                      {schedule.lastExecutionStatus ? schedule.lastExecutionStatus.toUpperCase() : 'N/A'}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleRunSchedule(schedule)}
                                    disabled={isActionLoading}>
                                    {isActionLoading ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <PlayCircle className="w-4 h-4 mr-2" />
                                    )}
                                    Run now
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleToggleSchedule(schedule)}
                                    disabled={isActionLoading}>
                                    {isActionLoading ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : schedule.status === 'active' ? (
                                      <PauseCircle className="w-4 h-4 mr-2" />
                                    ) : (
                                      <PlayCircle className="w-4 h-4 mr-2" />
                                    )}
                                    {schedule.status === 'active' ? 'Pause' : 'Activate'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditSchedule(schedule)}
                                    disabled={isActionLoading}>
                                    <Settings className="w-4 h-4 mr-2" />
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteSchedule(schedule)}
                                    disabled={isActionLoading}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </Button>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-white">
                                      <History className="w-4 h-4" />
                                      <span>Recent runs</span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => loadScheduleHistory(schedule._id, true)}
                                      disabled={historyLoadingId === schedule._id}>
                                      {historyLoadingId === schedule._id ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      ) : (
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                      )}
                                      Refresh
                                    </Button>
                                  </div>

                                  {historyLoadingId === schedule._id && history.length === 0 ? (
                                    <div className="text-xs text-blue-200/70">Loading history...</div>
                                  ) : history.length === 0 ? (
                                    <div className="text-xs text-blue-200/70">No recent executions.</div>
                                  ) : (
                                    <div className="space-y-2 text-xs text-blue-200/70">
                                      {history.slice(0, 5).map((entry, index) => entry ? (
                                        <div
                                          key={`${schedule._id}-history-${index}`}
                                          className="rounded-md border border-white/10 bg-white/5 p-3">
                                          <div className="flex items-center justify-between mb-2">
                                            <div>
                                              <div className="text-white">
                                                {entry.executedAt ? format(new Date(entry.executedAt), 'MMM d, yyyy HH:mm') : 'Unknown time'}
                                              </div>
                                              <div>
                                                {(entry.status || 'unknown').toUpperCase()} - {entry.groupResults?.filter(result => result && result.status === 'success').length || 0} success / {entry.groupResults?.length || 0}
                                              </div>
                                            </div>
                                            <Badge
                                              variant="outline"
                                              className={(entry.status || '') === 'success'
                                                ? 'border-green-500/40 bg-green-500/10 text-green-200'
                                                : (entry.status || '') === 'partial'
                                                  ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-200'
                                                  : 'border-red-500/40 bg-red-500/10 text-red-200'}>
                                              {entry.status || 'unknown'}
                                            </Badge>
                                          </div>

                                          {/* Group Results */}
                                          {entry.groupResults && Array.isArray(entry.groupResults) && entry.groupResults.length > 0 && (
                                            <div className="space-y-1 mt-2">
                                              {entry.groupResults.map((result, resultIndex) => result ? (
                                                <div
                                                  key={`${schedule._id}-${index}-result-${resultIndex}`}
                                                  className="flex items-center justify-between text-xs bg-white/5 rounded p-2">
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-white">{result.groupName || 'Unknown Group'}</span>
                                                    <Badge
                                                      variant="outline"
                                                      className={
                                                        result.status === 'success'
                                                          ? 'border-green-500/40 bg-green-500/10 text-green-200'
                                                          : result.status === 'skipped'
                                                            ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-200'
                                                            : 'border-red-500/40 bg-red-500/10 text-red-200'
                                                      }>
                                                      {result.status || 'unknown'}
                                                    </Badge>
                                                    {result.error && (
                                                      <span className="text-red-300 text-xs">{result.error}</span>
                                                    )}
                                                  </div>
                                                  {result.summaryId && result.status === 'success' && (
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={() => viewSummaryById(result.summaryId!)}
                                                      className="h-6 px-2 text-xs text-blue-200 hover:text-blue-100 hover:bg-blue-500/20">
                                                      <Eye className="w-3 h-3 mr-1" />
                                                      View Summary
                                                    </Button>
                                                  )}
                                                </div>
                                              ) : null)}
                                            </div>
                                          )}
                                        </div>
                                      ) : null)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  )}
                </div>
              </GlassCard>
              {/* Date Range Selector */}
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Select Time Range</h3>
                <div className="flex flex-wrap gap-3 mb-4">
                  <Button
                    onClick={() => handleDateRangeChange(whatsappService.createDateRange('today'))}
                    variant={selectedDateRange.type === 'today' ? 'default' : 'outline'}
                    size="sm"
                    className={selectedDateRange.type === 'today'
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'border-white/30 text-white hover:bg-white/10'
                    }
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Today
                  </Button>
                  
                  <Button
                    onClick={() => handleDateRangeChange(whatsappService.createDateRange('yesterday'))}
                    variant={selectedDateRange.type === 'yesterday' ? 'default' : 'outline'}
                    size="sm"
                    className={selectedDateRange.type === 'yesterday'
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'border-white/30 text-white hover:bg-white/10'
                    }
                  >
                    Yesterday
                  </Button>
                  
                  <Button
                    onClick={() => handleDateRangeChange(whatsappService.createDateRange('last24h'))}
                    variant={selectedDateRange.type === 'last24h' ? 'default' : 'outline'}
                    size="sm"
                    className={selectedDateRange.type === 'last24h'
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'border-white/30 text-white hover:bg-white/10'
                    }
                  >
                    Last 24H
                  </Button>
                </div>
                
                <p className="text-sm text-blue-200/70">
                  Selected: {selectedDateRange.label}
                </p>
              </GlassCard>

              {/* Groups Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {selectedGroups.map((group) => {
                  const isLoading = loadingSummaries.has(group.id);
                  const summary = groupSummaries.get(group.id);
                  
                  return (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <GlassCard className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-2">{group.name}</h3>
                            <div className="space-y-1 text-sm text-blue-200/70">
                              {group.participantCount && (
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  <span>{group.participantCount} participants</span>
                                </div>
                              )}
                              {group.messageCount !== undefined && (
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4" />
                                  <span>{group.messageCount} recent messages</span>
                                </div>
                              )}
                              {group.lastActivity && (
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span>Last: {group.lastActivity.toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Summary Actions */}
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              onClick={() => generateTodaySummary(group.id)}
                              disabled={isLoading}
                              size="sm"
                              className="flex-1 bg-green-500 hover:bg-green-600"
                            >
                              {isLoading ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4 mr-2" />
                              )}
                              Today's Summary
                            </Button>
                            
                            <Button
                              onClick={() => generateGroupSummary(group.id)}
                              disabled={isLoading}
                              size="sm"
                              variant="outline"
                              className="flex-1 border-white/30 text-white hover:bg-white/10"
                            >
                              {isLoading ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <BarChart3 className="w-4 h-4 mr-2" />
                              )}
                              Custom Date
                            </Button>
                          </div>
                          
                          {summary && (
                            <div className="mt-3 p-3 bg-white/5 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-green-300">
                                  Last Summary Generated
                                </span>
                                <Button
                                  onClick={() => downloadSummary(summary)}
                                  size="sm"
                                  variant="ghost"
                                  className="text-blue-300 hover:text-blue-200"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                              <div className="text-xs text-blue-200/70 space-y-1">
                                <div>{summary.totalMessages} messages from {summary.activeParticipants} participants</div>
                                <div>{summary.timeRange.start.toLocaleDateString()} - {summary.timeRange.end.toLocaleDateString()}</div>
                              </div>
                              <Button
                                onClick={() => {
                                  setSelectedSummary(summary);
                                  setShowSummaryModal(true);
                                }}
                                size="sm"
                                variant="ghost"
                                className="w-full mt-2 text-blue-300 hover:bg-white/10"
                              >
                                View Full Summary
                              </Button>
                            </div>
                          )}
                        </div>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>

              {selectedGroups.length === 0 && (
                <GlassCard className="p-8 text-center">
                  <Activity className="w-12 h-12 text-blue-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Groups Available</h3>
                  <p className="text-blue-200/70">
                    Make sure your WhatsApp is connected and you have active group chats.
                  </p>
                  <Button
                    onClick={fetchAvailableGroups}
                    className="mt-4"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Groups
                  </Button>
                </GlassCard>
              )}

              {/* Recent Summaries Section */}
            <RecentSummariesSection refreshSignal={recentSummariesRefreshToken} />
            </div>
          )}

          {selectedView === 'images' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredImagesList.map((image) => (
                <motion.div
                  key={image._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <GlassCard className="p-4">
                    <div className="relative mb-4">
                      <img
                        src={getAbsoluteImageUrl(image.imageUrl)}
                        alt="Filtered content"
                        className="w-full h-48 object-cover rounded-lg"
                        onError={(e) => {
                          console.error('Failed to load image:', image.imageUrl);
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjMyIiB5PSIzNiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjNzc3IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JbWFnZSBFcnJvcjwvdGV4dD4KPC9zdmc+';
                        }}
                      />
                      {!image.isArchived && (
                        <Button
                          onClick={() => archiveImage(image._id)}
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">{image.groupName}</span>
                        <span className="text-xs text-blue-200/70">
                          {new Date(image.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="text-sm text-blue-200/70">
                        From: {image.senderName}
                      </div>
                      
                      {image.originalCaption && (
                        <div className="text-sm text-white bg-white/10 p-2 rounded">
                          {image.originalCaption}
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        {image.detectedPersons.map((person, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm text-green-300">{person.personName}</span>
                            <span className="text-xs text-blue-200/70">
                              {(person.confidence * 100).toFixed(1)}% confident
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-blue-200/50">
                        <Clock className="w-3 h-3" />
                        <span>{image.processingDetails.processingTime.toFixed(0)}ms</span>
                        <span>â€¢</span>
                        <span>{image.processingDetails.facesDetected} faces</span>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Person Profile Form Modal */}
        <AnimatePresence>
          {showPersonForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="max-w-md w-full"
              >
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white">Add Person Profile</h3>
                    <Button
                      onClick={() => setShowPersonForm(false)}
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white">Name *</Label>
                      <Input
                        value={personForm.name}
                        onChange={(e) => setPersonForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter person's name"
                        className="bg-white/10 border-white/20 text-white placeholder:text-blue-300"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-white">Description</Label>
                      <Textarea
                        value={personForm.description}
                        onChange={(e) => setPersonForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Optional description"
                        className="bg-white/10 border-white/20 text-white placeholder:text-blue-300"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-white">Training Images *</Label>
                      <div className="mt-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                          className="hidden"
                        />
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          variant="outline"
                          disabled={uploadingImages}
                          className="w-full border-white/30 text-white hover:bg-white/10"
                        >
                          {uploadingImages ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          Upload Images
                        </Button>
                      </div>
                      
                      {personForm.trainingImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          {personForm.trainingImages.map((url, index) => (
                            <div key={index} className="relative">
                              <img
                                src={getAbsoluteImageUrl(url)}
                                alt={`Training ${index + 1}`}
                                className="w-full h-16 object-cover rounded"
                                onError={(e) => {
                                  console.error('Failed to load image:', url);
                                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjMyIiB5PSIzNiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjNzc3IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JbWFnZSBFcnJvcjwvdGV4dD4KPC9zdmc+';
                                }}
                              />
                              <Button
                                onClick={() => setPersonForm(prev => ({
                                  ...prev,
                                  trainingImages: prev.trainingImages.filter((_, i) => i !== index)
                                }))}
                                size="sm"
                                variant="ghost"
                                className="absolute top-0 right-0 bg-red-500/80 text-white hover:bg-red-600"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={createPersonProfile}
                        disabled={!personForm.name.trim() || personForm.trainingImages.length === 0}
                        className="flex-1 bg-green-500 hover:bg-green-600"
                      >
                        Create Profile
                      </Button>
                      <Button
                        onClick={() => setShowPersonForm(false)}
                        variant="outline"
                        className="border-white/30 text-white hover:bg-white/10"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </motion.div>
          )}
        <WhatsAppSummaryScheduleModal
          open={scheduleModalOpen}
          onOpenChange={(open) => {
            setScheduleModalOpen(open);
            if (!open) {
              setEditingSchedule(null);
            }
          }}
          availableGroups={availableGroups}
          initialValues={scheduleModalInitialValues}
          submitting={scheduleSubmitting}
          onSubmit={handleScheduleSubmit}
        />

        </AnimatePresence>

        {/* Group Monitor Form Modal */}
        <AnimatePresence>
          {showMonitorForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="max-w-lg w-full max-h-[90vh] overflow-y-auto"
              >
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white">Add Group Monitor</h3>
                    <Button
                      onClick={() => setShowMonitorForm(false)}
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white">WhatsApp Group *</Label>
                      <select
                        value={monitorForm.groupId}
                        onChange={(e) => {
                          const selectedGroupId = e.target.value;
                          const selectedGroup = whatsAppGroups.find(g => String(g.id) === selectedGroupId);

                          if (selectedGroupId && selectedGroup) {
                            setMonitorForm(prev => ({
                              ...prev,
                              groupId: selectedGroupId,
                              groupName: selectedGroup.name
                            }));
                          } else {
                            setMonitorForm(prev => ({
                              ...prev,
                              groupId: '',
                              groupName: ''
                            }));
                          }
                        }}
                        className="w-full mt-1 bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white"
                      >
                        <option value="">Select a group</option>
                        {whatsAppGroups.map(group => (
                          <option key={group.id} value={String(group.id)}>
                            {group.name} ({group.participantCount} members)
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <Label className="text-white">Target Persons *</Label>
                      <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                        {personProfiles.map(person => (
                          <label key={person._id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={monitorForm.targetPersons.includes(person._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setMonitorForm(prev => ({
                                    ...prev,
                                    targetPersons: [...prev.targetPersons, person._id]
                                  }));
                                } else {
                                  setMonitorForm(prev => ({
                                    ...prev,
                                    targetPersons: prev.targetPersons.filter(id => id !== person._id)
                                  }));
                                }
                              }}
                              className="rounded border-white/30"
                            />
                            <span className="text-white text-sm">{person.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-white">Settings</Label>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white">Notify on match</span>
                        <Switch
                          checked={monitorForm.settings.notifyOnMatch}
                          onCheckedChange={(checked) => setMonitorForm(prev => ({
                            ...prev,
                            settings: { ...prev.settings, notifyOnMatch: checked }
                          }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white">Save all images</span>
                        <Switch
                          checked={monitorForm.settings.saveAllImages}
                          onCheckedChange={(checked) => setMonitorForm(prev => ({
                            ...prev,
                            settings: { ...prev.settings, saveAllImages: checked }
                          }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white">Auto-reply</span>
                        <Switch
                          checked={monitorForm.settings.autoReply}
                          onCheckedChange={(checked) => setMonitorForm(prev => ({
                            ...prev,
                            settings: { ...prev.settings, autoReply: checked }
                          }))}
                        />
                      </div>
                      
                      <div>
                        <Label className="text-white text-sm">
                          Confidence Threshold: {(monitorForm.settings.confidenceThreshold * 100).toFixed(0)}%
                        </Label>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.1"
                          value={monitorForm.settings.confidenceThreshold}
                          onChange={(e) => setMonitorForm(prev => ({
                            ...prev,
                            settings: { ...prev.settings, confidenceThreshold: parseFloat(e.target.value) }
                          }))}
                          className="w-full mt-1"
                        />
                      </div>
                      
                      {monitorForm.settings.autoReply && (
                        <div>
                          <Label className="text-white text-sm">Reply Message</Label>
                          <Textarea
                            value={monitorForm.settings.replyMessage}
                            onChange={(e) => setMonitorForm(prev => ({
                              ...prev,
                              settings: { ...prev.settings, replyMessage: e.target.value }
                            }))}
                            placeholder="Message to send when person is detected"
                            className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-blue-300"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={createGroupMonitor}
                        disabled={!monitorForm.groupId || monitorForm.targetPersons.length === 0}
                        className="flex-1 bg-green-500 hover:bg-green-600"
                      >
                        Create Monitor
                      </Button>
                      <Button
                        onClick={() => setShowMonitorForm(false)}
                        variant="outline"
                        className="border-white/30 text-white hover:bg-white/10"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary Modal */}
        <AnimatePresence>
          {showSummaryModal && selectedSummary && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-stretch sm:items-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-4xl h-[calc(100vh-2rem)] supports-[height:100dvh]:h-[calc(100dvh-2rem)] sm:h-[90vh] sm:max-h-[90vh]"
              >
                <GlassCard className="h-full" contentClassName="flex flex-col h-full min-h-0">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{selectedSummary.groupName} Summary</h3>
                      <p className="text-sm text-blue-200/70">
                        {selectedSummary.timeRange.start.toLocaleDateString()} - {selectedSummary.timeRange.end.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => downloadSummary(selectedSummary)}
                        size="sm"
                        variant="outline"
                        className="border-white/30 text-white hover:bg-white/10"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        onClick={() => setShowSummaryModal(false)}
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Content */}
                  <ScrollArea type="always" className="flex-1 min-h-0">
                    <div className="p-6 space-y-6">
                    {/* Overview */}
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">Overview</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-2xl font-bold text-green-400">{selectedSummary.totalMessages}</div>
                          <div className="text-sm text-blue-200/70">Messages</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-2xl font-bold text-blue-400">{selectedSummary.activeParticipants}</div>
                          <div className="text-sm text-blue-200/70">Participants</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-2xl font-bold text-purple-400">{selectedSummary.topKeywords?.length || 0}</div>
                          <div className="text-sm text-blue-200/70">Topics</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-2xl font-bold text-yellow-400">{selectedSummary.processingStats?.processingTimeMs || 0}ms</div>
                          <div className="text-sm text-blue-200/70">Processing</div>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-white">{selectedSummary.overallSummary || 'No summary available'}</p>
                      </div>
                    </div>


                    {/* AI Insights Section */}
                    {selectedSummary.aiInsights && (
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-yellow-400" />
                          AI-Generated Insights
                        </h4>
                        
                        {/* Sentiment */}
                        <div className="bg-white/5 rounded-lg p-4">
                          <h5 className="text-sm font-semibold text-blue-200 mb-2">Overall Sentiment</h5>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${
                                selectedSummary.aiInsights.sentiment === 'positive'
                                  ? 'bg-green-500/20 text-green-300'
                                  : selectedSummary.aiInsights.sentiment === 'negative'
                                  ? 'bg-red-500/20 text-red-300'
                                  : selectedSummary.aiInsights.sentiment === 'mixed'
                                  ? 'bg-yellow-500/20 text-yellow-300'
                                  : 'bg-gray-500/20 text-gray-300'
                              }`}
                            >
                              {selectedSummary.aiInsights.sentiment.charAt(0).toUpperCase() + selectedSummary.aiInsights.sentiment.slice(1)}
                            </span>
                          </div>
                        </div>

                        {/* Key Topics */}
                        {selectedSummary.aiInsights.keyTopics?.length > 0 && (
                          <div className="bg-white/5 rounded-lg p-4">
                            <h5 className="text-sm font-semibold text-blue-200 mb-2">Key Discussion Topics</h5>
                            <div className="space-y-2">
                              {selectedSummary.aiInsights.keyTopics?.map((topic, index) => (
                                <div key={index} className="flex items-start gap-2">
                                  <span className="text-blue-400 mt-1">â€¢</span>
                                  <span className="text-white text-sm">{topic}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Items */}
                        {selectedSummary.aiInsights.actionItems?.length > 0 && (
                          <div className="bg-white/5 rounded-lg p-4 border-l-4 border-green-400">
                            <h5 className="text-sm font-semibold text-green-300 mb-2">Action Items</h5>
                            <div className="space-y-2">
                              {selectedSummary.aiInsights.actionItems?.map((item, index) => (
                                <div key={index} className="flex items-start gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                                  <span className="text-white text-sm">{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Important Events */}
                        {selectedSummary.aiInsights.importantEvents?.length > 0 && (
                          <div className="bg-white/5 rounded-lg p-4 border-l-4 border-purple-400">
                            <h5 className="text-sm font-semibold text-purple-300 mb-2">Important Events</h5>
                            <div className="space-y-2">
                              {selectedSummary.aiInsights.importantEvents?.map((event, index) => (
                                <div key={index} className="flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 text-purple-400 mt-0.5" />
                                  <span className="text-white text-sm">{event}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Decisions Made */}
                        {selectedSummary.aiInsights.decisionsMade?.length > 0 && (
                          <div className="bg-white/5 rounded-lg p-4 border-l-4 border-blue-400">
                            <h5 className="text-sm font-semibold text-blue-300 mb-2">Decisions Made</h5>
                            <div className="space-y-2">
                              {selectedSummary.aiInsights.decisionsMade?.map((decision, index) => (
                                <div key={index} className="flex items-start gap-2">
                                  <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5" />
                                  <span className="text-white text-sm">{decision}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Top Participants */}
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">Top Participants</h4>
                      <div className="space-y-3">
                        {selectedSummary.senderInsights?.slice(0, 5).map((sender) => (
                          <div key={sender.senderPhone} className="bg-white/5 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-white">{sender.senderName}</span>
                              <span className="text-sm bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                                {sender.messageCount} messages
                              </span>
                            </div>
                            <p className="text-sm text-blue-200/70 mb-2">{sender.summary}</p>
                            {sender.topKeywords?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {sender.topKeywords?.slice(0, 3).map((keyword) => (
                                  <span
                                    key={keyword.keyword}
                                    className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded"
                                  >
                                    {keyword.keyword}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Keywords and Activity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Top Keywords */}
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3">Top Keywords</h4>
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="flex flex-wrap gap-2">
                            {selectedSummary.topKeywords?.slice(0, 10).map((keyword) => (
                              <span
                                key={keyword.keyword}
                                className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm"
                              >
                                {keyword.keyword} ({keyword.count})
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Top Emojis */}
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3">Top Emojis</h4>
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="flex flex-wrap gap-2">
                            {selectedSummary.topEmojis?.slice(0, 10).map((emoji) => (
                              <span
                                key={emoji.emoji}
                                className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm"
                              >
                                {emoji.emoji} {emoji.count}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Message Types */}
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">Message Breakdown</h4>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                          {Object.entries(selectedSummary.messageTypes || {}).map(([type, count]) => (
                            <div key={type} className="text-center">
                              <div className="text-lg font-semibold text-white">{count}</div>
                              <div className="text-sm text-blue-200/70 capitalize">{type}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Activity Peaks */}
                    {selectedSummary.activityPeaks?.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3">Peak Activity Hours</h4>
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="flex flex-wrap gap-2">
                            {selectedSummary.activityPeaks?.slice(0, 6).map((peak) => (
                              <span
                                key={peak.hour}
                                className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm"
                              >
                                {peak.hour}:00 ({peak.count} messages)
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  </ScrollArea>
                </GlassCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WhatsAppGroupMonitorPage;




















