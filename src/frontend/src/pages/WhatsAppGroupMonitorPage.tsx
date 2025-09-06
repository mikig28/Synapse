import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
  Sparkles
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import useAuthStore from '@/store/authStore';
import api from '@/services/axiosConfig';
import whatsappService from '@/services/whatsappService';
import {
  GroupInfo,
  GroupSelection,
  GroupSummaryData,
  DateRange,
  DATE_RANGE_PRESETS
} from '@/types/whatsappSummary';

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

const WhatsAppGroupMonitorPage: React.FC = () => {
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

  useEffect(() => {
    if (selectedView === 'summaries' && availableGroups.length === 0) {
      fetchAvailableGroups();
    }
  }, [selectedView]);

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

  const fetchAvailableGroups = async () => {
    try {
      const groups = await whatsappService.getAvailableGroups();
      setAvailableGroups(groups);
      
      // Initialize selected groups state
      const groupSelections: GroupSelection[] = groups.map(group => ({
        ...group,
        isSelected: false
      }));
      setSelectedGroups(groupSelections);
    } catch (error) {
      console.error('Error fetching available groups:', error);
      toast({
        title: "Error",
        description: "Failed to load WhatsApp groups for summaries",
        variant: "destructive",
      });
    }
  };

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
      }
    } catch (error) {
      console.error('Error fetching group monitors:', error);
    }
  };

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
    // Enhanced validation with specific error messages
    if (!monitorForm.groupId) {
      toast({
        title: "Validation Error",
        description: "Please select a WhatsApp group",
        variant: "destructive",
      });
      return;
    }

    if (!monitorForm.groupName) {
      toast({
        title: "Validation Error",
        description: "Group name is missing. Please reselect the group",
        variant: "destructive",
      });
      return;
    }

    if (monitorForm.targetPersons.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one person to monitor",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Creating group monitor with data:', monitorForm);
      const response = await api.post('/group-monitor/monitors', monitorForm);
      if (response.data.success) {
        setGroupMonitors([...groupMonitors, response.data.data]);
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
      console.error('Request data was:', monitorForm);
      
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
        timezone: whatsappService.getUserTimezone()
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
        timezone: whatsappService.getUserTimezone()
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

  const downloadSummary = (summary: GroupSummaryData) => {
    const formatted = whatsappService.formatSummaryForDisplay(summary);
    
    const content = `${formatted.title}
${formatted.subtitle}

OVERVIEW
${summary.overallSummary}

STATISTICS
${formatted.stats.map(stat => `${stat.label}: ${stat.value}`).join('\n')}

TOP PARTICIPANTS
${formatted.topSenders.map(sender => `• ${sender.name} (${sender.count} messages): ${sender.summary}`).join('\n')}

TOP KEYWORDS
${formatted.keywords.join(', ')}

TOP EMOJIS
${formatted.emojis.join(' ')}

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
        <div className="flex gap-4 mb-6">
          <Button
            onClick={() => setSelectedView('persons')}
            variant={selectedView === 'persons' ? 'default' : 'outline'}
            className={selectedView === 'persons' 
              ? 'bg-violet-500 hover:bg-violet-600' 
              : 'border-white/30 text-white hover:bg-white/10'
            }
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Person Profiles
          </Button>
          
          <Button
            onClick={() => setSelectedView('monitors')}
            variant={selectedView === 'monitors' ? 'default' : 'outline'}
            className={selectedView === 'monitors' 
              ? 'bg-violet-500 hover:bg-violet-600' 
              : 'border-white/30 text-white hover:bg-white/10'
            }
          >
            <Eye className="w-4 h-4 mr-2" />
            Group Monitors
          </Button>
          
          <Button
            onClick={() => setSelectedView('summaries')}
            variant={selectedView === 'summaries' ? 'default' : 'outline'}
            className={selectedView === 'summaries' 
              ? 'bg-violet-500 hover:bg-violet-600' 
              : 'border-white/30 text-white hover:bg-white/10'
            }
          >
            <FileText className="w-4 h-4 mr-2" />
            Daily Summaries
          </Button>
          
          <Button
            onClick={() => setSelectedView('images')}
            variant={selectedView === 'images' ? 'default' : 'outline'}
            className={selectedView === 'images' 
              ? 'bg-violet-500 hover:bg-violet-600' 
              : 'border-white/30 text-white hover:bg-white/10'
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
                          <div className="flex gap-2">
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
                        <span>•</span>
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
                          const selectedGroup = whatsAppGroups.find(g => g.id === selectedGroupId);
                          
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
                          <option key={group.id} value={group.id}>
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
                        disabled={!monitorForm.groupId || !monitorForm.groupName || monitorForm.targetPersons.length === 0}
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
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="max-w-4xl w-full max-h-[90vh] overflow-hidden"
              >
                <GlassCard className="h-full flex flex-col">
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
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                          <div className="text-2xl font-bold text-purple-400">{selectedSummary.topKeywords.length}</div>
                          <div className="text-sm text-blue-200/70">Topics</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-2xl font-bold text-yellow-400">{selectedSummary.processingStats.processingTimeMs}ms</div>
                          <div className="text-sm text-blue-200/70">Processing</div>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-white">{selectedSummary.overallSummary}</p>
                      </div>
                    </div>

                    {/* Top Participants */}
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">Top Participants</h4>
                      <div className="space-y-3">
                        {selectedSummary.senderInsights.slice(0, 5).map((sender) => (
                          <div key={sender.senderPhone} className="bg-white/5 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-white">{sender.senderName}</span>
                              <span className="text-sm bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                                {sender.messageCount} messages
                              </span>
                            </div>
                            <p className="text-sm text-blue-200/70 mb-2">{sender.summary}</p>
                            {sender.topKeywords.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {sender.topKeywords.slice(0, 3).map((keyword) => (
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
                            {selectedSummary.topKeywords.slice(0, 10).map((keyword) => (
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
                            {selectedSummary.topEmojis.slice(0, 10).map((emoji) => (
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
                          {Object.entries(selectedSummary.messageTypes).map(([type, count]) => (
                            <div key={type} className="text-center">
                              <div className="text-lg font-semibold text-white">{count}</div>
                              <div className="text-sm text-blue-200/70 capitalize">{type}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Activity Peaks */}
                    {selectedSummary.activityPeaks.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3">Peak Activity Hours</h4>
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="flex flex-wrap gap-2">
                            {selectedSummary.activityPeaks.slice(0, 6).map((peak) => (
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