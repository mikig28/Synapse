import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { agentService } from '../services/agentService';
import { Agent, MCPServer, AgentTool, BuiltinTool, CreateAgentData } from '../types/agent';
import {
  Settings,
  Bot,
  Plus,
  Edit,
  Trash2,
  Server,
  Wrench,
  Globe,
  Shield,
  Key,
  CheckCircle,
  XCircle,
  X,
  Loader2,
  ArrowLeft,
  Save,
  Copy,
  ExternalLink,
  Star,
  Zap,
  HelpCircle,
  BookOpen,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  Hash,
  Filter,
  MessageSquare,
  Rss,
  Twitter,
  Newspaper,
  Brain,
  Target,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useParams, useNavigate } from 'react-router-dom';
import { SYNAPSE_MCP_SERVERS, MCP_CATEGORIES, getRecommendedMCPsForAgent, MCPServerTemplate } from '../data/mcpServers';
import MCPIntegrationGuide from '@/components/MCPIntegrationGuide';
import { useIsMobile } from '@/hooks/useMobileDetection';
import { 
  getAgentStatusColor, 
  getAgentTypeColor, 
  typography, 
  spacing,
  shadows,
  borderRadius
} from '@/utils/designSystem';
import { 
  cardVariants, 
  slideVariants, 
  springConfigs,
  animationConfig 
} from '@/utils/animations';

// Enhanced form validation
interface ValidationError {
  field: string;
  message: string;
}

interface AgentFormData {
  name: string;
  description: string;
  type: Agent['type'];
  isActive: boolean;
  configuration: {
    keywords: string[];
    minLikes: number;
    minRetweets: number;
    excludeReplies: boolean;
    newsSources: string[];
    categories: string[];
    language: string;
    topics: string[];
    crewaiSources: {
      reddit: boolean;
      linkedin: boolean;
      telegram: boolean;
      news_websites: boolean;
    };
    schedule: string;
    maxItemsPerRun: number;
    mcpServers: MCPServer[];
    tools: AgentTool[];
  };
}

const AGENT_TYPES = [
  { value: 'twitter', label: 'Twitter Agent', icon: Twitter, description: 'Monitor and curate Twitter content' },
  { value: 'news', label: 'News Agent', icon: Newspaper, description: 'Aggregate and summarize news articles' },
  { value: 'crewai_news', label: 'CrewAI Multi-Agent', icon: Brain, description: 'Advanced multi-agent system for comprehensive analysis' },
  { value: 'custom', label: 'Custom Agent', icon: Bot, description: 'Custom configured agent with specific capabilities' },
] as const;

const SCHEDULE_OPTIONS = [
  { value: '*/15 * * * *', label: 'Every 15 minutes' },
  { value: '*/30 * * * *', label: 'Every 30 minutes' },
  { value: '0 * * * *', label: 'Every hour' },
  { value: '0 */2 * * *', label: 'Every 2 hours' },
  { value: '0 */6 * * *', label: 'Every 6 hours' },
  { value: '0 */12 * * *', label: 'Every 12 hours' },
  { value: '0 0 * * *', label: 'Daily' },
  { value: '0 0 * * 0', label: 'Weekly' },
  { value: 'custom', label: 'Custom cron expression' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
];

const NEWS_CATEGORIES = [
  'Technology', 'Business', 'Science', 'Health', 'Sports',
  'Entertainment', 'Politics', 'World', 'Finance', 'Innovation'
];

// Helper function to get agent display name
const getAgentDisplayName = (type: string) => {
  const typeInfo = AGENT_TYPES.find(t => t.value === type);
  return typeInfo?.label || `${type} Agent`;
};

const AgentSettingsPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // State management
  const [agent, setAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<AgentFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Dialog states
  const [showMCPDialog, setShowMCPDialog] = useState(false);
  const [showToolDialog, setShowToolDialog] = useState(false);
  const [showMCPTemplatesDialog, setShowMCPTemplatesDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Editing states
  const [editingMCP, setEditingMCP] = useState<MCPServer | null>(null);
  const [editingTool, setEditingTool] = useState<AgentTool | null>(null);
  const [builtinTools, setBuiltinTools] = useState<BuiltinTool[]>([]);
  const [selectedMCPTemplate, setSelectedMCPTemplate] = useState<MCPServerTemplate | null>(null);

  // Form states for dialogs
  const [mcpForm, setMCPForm] = useState<MCPServer>({
    name: '',
    serverUri: '',
    enabled: true,
    capabilities: [],
    description: '',
    authentication: {
      type: 'none',
      credentials: ''
    }
  });

  const [toolForm, setToolForm] = useState<AgentTool>({
    name: '',
    type: 'builtin',
    enabled: true,
    configuration: {},
    description: '',
    mcpServerId: ''
  });

  // Custom keyword input
  const [keywordInput, setKeywordInput] = useState('');
  const [sourceInput, setSourceInput] = useState('');
  const [topicInput, setTopicInput] = useState('');

  // Load agent data
  useEffect(() => {
    if (agentId) {
      fetchAgent();
      fetchBuiltinTools();
    }
  }, [agentId]);

  // Initialize form data when agent loads
  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        description: agent.description || '',
        type: agent.type,
        isActive: agent.isActive,
        configuration: {
          keywords: agent.configuration.keywords || [],
          minLikes: agent.configuration.minLikes || 0,
          minRetweets: agent.configuration.minRetweets || 0,
          excludeReplies: agent.configuration.excludeReplies || false,
          newsSources: agent.configuration.newsSources || [],
          categories: agent.configuration.categories || [],
          language: agent.configuration.language || 'en',
          topics: agent.configuration.topics || [],
          crewaiSources: {
            reddit: agent.configuration.crewaiSources?.reddit || false,
            linkedin: agent.configuration.crewaiSources?.linkedin || false,
            telegram: agent.configuration.crewaiSources?.telegram || false,
            news_websites: agent.configuration.crewaiSources?.news_websites || false,
          },
          schedule: agent.configuration.schedule || '0 * * * *',
          maxItemsPerRun: agent.configuration.maxItemsPerRun || 50,
          mcpServers: agent.configuration.mcpServers || [],
          tools: agent.configuration.tools || [],
        }
      });
    }
  }, [agent]);

  // Track unsaved changes
  useEffect(() => {
    if (agent && formData) {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify({
        name: agent.name,
        description: agent.description || '',
        type: agent.type,
        isActive: agent.isActive,
        configuration: agent.configuration
      });
      setHasUnsavedChanges(hasChanges);
    }
  }, [agent, formData]);

  const fetchAgent = async () => {
    try {
      setLoading(true);
      if (!agentId) return;
      
      const agentData = await agentService.getAgent(agentId);
      setAgent(agentData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch agent details',
        variant: 'destructive',
      });
      navigate('/agents');
    } finally {
      setLoading(false);
    }
  };

  const fetchBuiltinTools = async () => {
    try {
      const tools = await agentService.getBuiltinTools();
      setBuiltinTools(tools);
    } catch (error) {
      console.error('Failed to fetch builtin tools:', error);
    }
  };

  // Validation functions
  const validateForm = useCallback((): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (!formData) return errors;

    if (!formData.name.trim()) {
      errors.push({ field: 'name', message: 'Agent name is required' });
    }

    if (formData.name.length > 100) {
      errors.push({ field: 'name', message: 'Agent name must be less than 100 characters' });
    }

    if (formData.description.length > 500) {
      errors.push({ field: 'description', message: 'Description must be less than 500 characters' });
    }

    if (formData.configuration.maxItemsPerRun < 1 || formData.configuration.maxItemsPerRun > 1000) {
      errors.push({ field: 'maxItemsPerRun', message: 'Max items per run must be between 1 and 1000' });
    }

    if (formData.type === 'twitter') {
      if (formData.configuration.keywords.length === 0) {
        errors.push({ field: 'keywords', message: 'At least one keyword is required for Twitter agents' });
      }
    }

    if (formData.type === 'news') {
      if (formData.configuration.categories.length === 0) {
        errors.push({ field: 'categories', message: 'At least one category is required for News agents' });
      }
    }

    // Validate MCP servers
    formData.configuration.mcpServers.forEach((mcp, index) => {
      if (!mcp.name.trim()) {
        errors.push({ field: `mcpServer.${index}.name`, message: 'MCP server name is required' });
      }
      if (!mcp.serverUri.trim()) {
        errors.push({ field: `mcpServer.${index}.serverUri`, message: 'MCP server URI is required' });
      }
    });

    return errors;
  }, [formData]);

  // Form update handlers
  const updateFormField = useCallback((field: string, value: any) => {
    if (!formData) return;
    
    setFormData(prev => {
      if (!prev) return prev;
      
      const keys = field.split('.');
      const newData = { ...prev };
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });

    // Clear validation errors for this field
    setValidationErrors(prev => prev.filter(error => !error.field.startsWith(field)));
  }, [formData]);

  // Array manipulation helpers
  const addToArray = useCallback((field: string, value: string) => {
    if (!formData) return;
    
    const current = field.split('.').reduce((obj, key) => obj[key], formData as any) as string[];
    if (!current.includes(value)) {
      updateFormField(field, [...current, value]);
    }
  }, [formData, updateFormField]);

  const removeFromArray = useCallback((field: string, value: string) => {
    if (!formData) return;
    
    const current = field.split('.').reduce((obj, key) => obj[key], formData as any) as string[];
    updateFormField(field, current.filter(item => item !== value));
  }, [formData, updateFormField]);

  // Save functionality
  const handleSave = async () => {
    if (!agent || !formData) return;

    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before saving',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      
      await agentService.updateAgent(agent._id, {
        name: formData.name,
        description: formData.description,
        isActive: formData.isActive,
        configuration: formData.configuration
      });
      
      // Refresh agent data
      await fetchAgent();
      setHasUnsavedChanges(false);
      
      toast({
        title: 'Success',
        description: 'Agent settings saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save agent settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Test agent functionality
  const handleTestAgent = async () => {
    if (!agent) return;

    try {
      setTesting(true);
      await agentService.executeAgent(agent._id, true);
      
      toast({
        title: 'Test Started',
        description: 'Agent test execution has been started',
      });
    } catch (error: any) {
      toast({
        title: 'Test Failed',
        description: error.message || 'Failed to start agent test',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  // Delete agent
  const handleDeleteAgent = async () => {
    if (!agent) return;

    try {
      await agentService.deleteAgent(agent._id);
      
      toast({
        title: 'Success',
        description: 'Agent deleted successfully',
      });
      
      navigate('/agents');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete agent',
        variant: 'destructive',
      });
    }
  };

  // MCP Server Management
  const handleAddMCP = () => {
    setEditingMCP(null);
    setMCPForm({
      name: '',
      serverUri: '',
      enabled: true,
      capabilities: [],
      description: '',
      authentication: {
        type: 'none',
        credentials: ''
      }
    });
    setShowMCPDialog(true);
  };

  const handleEditMCP = (mcp: MCPServer) => {
    setEditingMCP(mcp);
    setMCPForm({ ...mcp });
    setShowMCPDialog(true);
  };

  const handleSaveMCP = () => {
    if (!formData) return;

    const mcpServers = [...formData.configuration.mcpServers];
    
    if (editingMCP) {
      const index = mcpServers.findIndex(s => s.name === editingMCP.name);
      if (index >= 0) {
        mcpServers[index] = mcpForm;
      }
    } else {
      mcpServers.push(mcpForm);
    }

    updateFormField('configuration.mcpServers', mcpServers);
    setShowMCPDialog(false);
    
    toast({
      title: 'Success',
      description: `MCP server ${editingMCP ? 'updated' : 'added'} successfully`,
    });
  };

  const handleDeleteMCP = (mcpName: string) => {
    if (!formData) return;

    const mcpServers = formData.configuration.mcpServers.filter(s => s.name !== mcpName);
    updateFormField('configuration.mcpServers', mcpServers);
    
    toast({
      title: 'Success',
      description: 'MCP server removed successfully',
    });
  };

  // Tool Management
  const handleAddTool = () => {
    setEditingTool(null);
    setToolForm({
      name: '',
      type: 'builtin',
      enabled: true,
      configuration: {},
      description: '',
      mcpServerId: ''
    });
    setShowToolDialog(true);
  };

  const handleEditTool = (tool: AgentTool) => {
    setEditingTool(tool);
    setToolForm({ ...tool });
    setShowToolDialog(true);
  };

  const handleSaveTool = () => {
    if (!formData) return;

    const tools = [...formData.configuration.tools];
    
    if (editingTool) {
      const index = tools.findIndex(t => t.name === editingTool.name);
      if (index >= 0) {
        tools[index] = toolForm;
      }
    } else {
      tools.push(toolForm);
    }

    updateFormField('configuration.tools', tools);
    setShowToolDialog(false);
    
    toast({
      title: 'Success',
      description: `Tool ${editingTool ? 'updated' : 'added'} successfully`,
    });
  };

  const handleDeleteTool = (toolName: string) => {
    if (!formData) return;

    const tools = formData.configuration.tools.filter(t => t.name !== toolName);
    updateFormField('configuration.tools', tools);
    
    toast({
      title: 'Success',
      description: 'Tool removed successfully',
    });
  };

  // Get validation error for field
  const getFieldError = (field: string) => {
    return validationErrors.find(error => error.field === field)?.message;
  };

  // Memoized computed values
  const agentTypeInfo = useMemo(() => {
    return AGENT_TYPES.find(type => type.value === formData?.type);
  }, [formData?.type]);

  const statusColor = useMemo(() => {
    return agent ? getAgentStatusColor(agent.status) : null;
  }, [agent?.status]);

  const typeColor = useMemo(() => {
    return agent ? getAgentTypeColor(agent.type) : null;
  }, [agent?.type]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading agent settings...</p>
        </motion.div>
      </div>
    );
  }

  if (!agent || !formData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <Card className="text-center p-8 max-w-md mx-auto">
          <CardContent className="space-y-4">
            <Bot className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold">Agent Not Found</h3>
            <p className="text-muted-foreground">
              The agent you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/agents')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Agents
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      <div className="relative z-10 container mx-auto p-4 md:p-8 space-y-6">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/agents')}
              className="shrink-0"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary truncate">
                {formData.name} Settings
              </h1>
              <p className="text-muted-foreground text-sm md:text-base">
                Configure and customize your agent's behavior
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Unsaved
              </Badge>
            )}
            
            <Button
              variant="outline"
              onClick={handleTestAgent}
              disabled={testing || hasUnsavedChanges}
              size={isMobile ? "sm" : "default"}
            >
              {testing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4 mr-2" />
              )}
              Test
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              size={isMobile ? "sm" : "lg"}
              className="min-w-[100px]"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </motion.div>

        {/* Agent Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                {agentTypeInfo && (
                  <div 
                    className="p-2 rounded-lg"
                    style={{ 
                      backgroundColor: typeColor?.bg,
                      border: `1px solid ${typeColor?.primary}20`
                    }}
                  >
                    <agentTypeInfo.icon className="w-5 h-5" style={{ color: typeColor?.icon }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <CardTitle className="truncate">{formData.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <span className="capitalize">{agentTypeInfo?.label}</span>
                    <Separator orientation="vertical" className="h-4" />
                    <Badge 
                      variant={agent.isActive ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {agent.isActive ? 'Active' : 'Paused'}
                    </Badge>
                    <Badge 
                      variant="outline"
                      style={{ 
                        color: statusColor?.primary,
                        borderColor: statusColor?.border 
                      }}
                      className="text-xs"
                    >
                      {agent.status}
                    </Badge>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded">
                  <p className="font-medium">{formData.configuration.mcpServers.length}</p>
                  <p className="text-sm text-muted-foreground">MCP Servers</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded">
                  <p className="font-medium">{formData.configuration.tools.length}</p>
                  <p className="text-sm text-muted-foreground">Tools</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded">
                  <p className="font-medium">{agent.statistics.totalRuns}</p>
                  <p className="text-sm text-muted-foreground">Total Runs</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded">
                  <p className="font-medium">
                    {Math.round((agent.statistics.successfulRuns / Math.max(agent.statistics.totalRuns, 1)) * 100)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Settings Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                {!isMobile && 'Basic'}
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                {!isMobile && 'Config'}
              </TabsTrigger>
              {!isMobile && (
                <>
                  <TabsTrigger value="mcps" className="flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    MCPs
                  </TabsTrigger>
                  <TabsTrigger value="tools" className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Tools
                  </TabsTrigger>
                </>
              )}
              {isMobile && (
                <TabsTrigger value="advanced" className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Advanced
                </TabsTrigger>
              )}
            </TabsList>

            {/* Basic Settings Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Configure the basic properties of your agent
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Agent Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => updateFormField('name', e.target.value)}
                        placeholder="Enter agent name"
                        className={getFieldError('name') ? 'border-red-500' : ''}
                      />
                      {getFieldError('name') && (
                        <p className="text-sm text-red-500">{getFieldError('name')}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="type">Agent Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => updateFormField('type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AGENT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <type.icon className="w-4 h-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => updateFormField('description', e.target.value)}
                      placeholder="Describe what this agent does"
                      rows={3}
                      className={getFieldError('description') ? 'border-red-500' : ''}
                    />
                    {getFieldError('description') && (
                      <p className="text-sm text-red-500">{getFieldError('description')}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {formData.description.length}/500 characters
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => updateFormField('isActive', checked)}
                    />
                    <Label htmlFor="isActive">Agent is active</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Configuration Tab */}
            <TabsContent value="config" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Execution Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Execution Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="schedule">Schedule</Label>
                      <Select
                        value={formData.configuration.schedule}
                        onValueChange={(value) => updateFormField('configuration.schedule', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCHEDULE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maxItems">Max Items Per Run</Label>
                      <Input
                        id="maxItems"
                        type="number"
                        min="1"
                        max="1000"
                        value={formData.configuration.maxItemsPerRun}
                        onChange={(e) => updateFormField('configuration.maxItemsPerRun', parseInt(e.target.value) || 1)}
                        className={getFieldError('maxItemsPerRun') ? 'border-red-500' : ''}
                      />
                      {getFieldError('maxItemsPerRun') && (
                        <p className="text-sm text-red-500">{getFieldError('maxItemsPerRun')}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select
                        value={formData.configuration.language}
                        onValueChange={(value) => updateFormField('configuration.language', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGE_OPTIONS.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Type-specific Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Content Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Twitter-specific settings */}
                    {formData.type === 'twitter' && (
                      <>
                        <div className="space-y-2">
                          <Label>Keywords</Label>
                          <div className="flex gap-2">
                            <Input
                              value={keywordInput}
                              onChange={(e) => setKeywordInput(e.target.value)}
                              placeholder="Add keyword"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && keywordInput.trim()) {
                                  addToArray('configuration.keywords', keywordInput.trim());
                                  setKeywordInput('');
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                if (keywordInput.trim()) {
                                  addToArray('configuration.keywords', keywordInput.trim());
                                  setKeywordInput('');
                                }
                              }}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {formData.configuration.keywords.map((keyword) => (
                              <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                                {keyword}
                                <button
                                  onClick={() => removeFromArray('configuration.keywords', keyword)}
                                  className="ml-1 hover:text-red-500"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                          {getFieldError('keywords') && (
                            <p className="text-sm text-red-500">{getFieldError('keywords')}</p>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="minLikes">Min Likes</Label>
                            <Input
                              id="minLikes"
                              type="number"
                              min="0"
                              value={formData.configuration.minLikes}
                              onChange={(e) => updateFormField('configuration.minLikes', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="minRetweets">Min Retweets</Label>
                            <Input
                              id="minRetweets"
                              type="number"
                              min="0"
                              value={formData.configuration.minRetweets}
                              onChange={(e) => updateFormField('configuration.minRetweets', parseInt(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="excludeReplies"
                            checked={formData.configuration.excludeReplies}
                            onCheckedChange={(checked) => updateFormField('configuration.excludeReplies', checked)}
                          />
                          <Label htmlFor="excludeReplies">Exclude replies</Label>
                        </div>
                      </>
                    )}

                    {/* News-specific settings */}
                    {formData.type === 'news' && (
                      <>
                        <div className="space-y-2">
                          <Label>Categories</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {NEWS_CATEGORIES.map((category) => (
                              <div key={category} className="flex items-center space-x-2">
                                <Switch
                                  id={`category-${category}`}
                                  checked={formData.configuration.categories.includes(category)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      addToArray('configuration.categories', category);
                                    } else {
                                      removeFromArray('configuration.categories', category);
                                    }
                                  }}
                                />
                                <Label htmlFor={`category-${category}`} className="text-sm">
                                  {category}
                                </Label>
                              </div>
                            ))}
                          </div>
                          {getFieldError('categories') && (
                            <p className="text-sm text-red-500">{getFieldError('categories')}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label>News Sources</Label>
                          <div className="flex gap-2">
                            <Input
                              value={sourceInput}
                              onChange={(e) => setSourceInput(e.target.value)}
                              placeholder="Add news source"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && sourceInput.trim()) {
                                  addToArray('configuration.newsSources', sourceInput.trim());
                                  setSourceInput('');
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                if (sourceInput.trim()) {
                                  addToArray('configuration.newsSources', sourceInput.trim());
                                  setSourceInput('');
                                }
                              }}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {formData.configuration.newsSources.map((source) => (
                              <Badge key={source} variant="secondary" className="flex items-center gap-1">
                                {source}
                                <button
                                  onClick={() => removeFromArray('configuration.newsSources', source)}
                                  className="ml-1 hover:text-red-500"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* CrewAI-specific settings */}
                    {formData.type === 'crewai_news' && (
                      <>
                        <div className="space-y-3">
                          <Label>Data Sources</Label>
                          <div className="space-y-2">
                            {Object.entries(formData.configuration.crewaiSources).map(([key, value]) => (
                              <div key={key} className="flex items-center space-x-2">
                                <Switch
                                  id={`crewai-${key}`}
                                  checked={value}
                                  onCheckedChange={(checked) => updateFormField(`configuration.crewaiSources.${key}`, checked)}
                                />
                                <Label htmlFor={`crewai-${key}`} className="capitalize">
                                  {key.replace('_', ' ')}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Topics</Label>
                          <div className="flex gap-2">
                            <Input
                              value={topicInput}
                              onChange={(e) => setTopicInput(e.target.value)}
                              placeholder="Add topic"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && topicInput.trim()) {
                                  addToArray('configuration.topics', topicInput.trim());
                                  setTopicInput('');
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                if (topicInput.trim()) {
                                  addToArray('configuration.topics', topicInput.trim());
                                  setTopicInput('');
                                }
                              }}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {formData.configuration.topics.map((topic) => (
                              <Badge key={topic} variant="secondary" className="flex items-center gap-1">
                                {topic}
                                <button
                                  onClick={() => removeFromArray('configuration.topics', topic)}
                                  className="ml-1 hover:text-red-500"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* MCP Servers Tab (Desktop) or Advanced Tab (Mobile) */}
            <TabsContent value={isMobile ? "advanced" : "mcps"} className="space-y-6">
              {isMobile && (
                <Accordion type="single" collapsible className="space-y-4">
                  <AccordionItem value="mcps">
                    <AccordionTrigger className="text-lg font-semibold">
                      <div className="flex items-center gap-2">
                        <Server className="w-5 h-5" />
                        MCP Servers ({formData.configuration.mcpServers.length})
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {/* MCP Content goes here */}
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="tools">
                    <AccordionTrigger className="text-lg font-semibold">
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Tools & Capabilities ({formData.configuration.tools.length})
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {/* Tools Content goes here */}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
              
              {!isMobile && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">MCP Servers</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure Model Context Protocol servers for enhanced capabilities
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowMCPTemplatesDialog(true)}>
                        <Zap className="w-4 h-4 mr-2" />
                        Quick Add
                      </Button>
                      <Button onClick={handleAddMCP}>
                        <Plus className="w-4 h-4 mr-2" />
                        Custom MCP
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formData.configuration.mcpServers.map((mcp, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Server className="w-5 h-5 text-blue-500" />
                              <div>
                                <CardTitle className="text-base">{mcp.name}</CardTitle>
                                <CardDescription className="text-xs">{mcp.serverUri}</CardDescription>
                              </div>
                            </div>
                            <Badge variant={mcp.enabled ? 'default' : 'secondary'} className="text-xs">
                              {mcp.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {mcp.description && (
                            <p className="text-sm text-muted-foreground">{mcp.description}</p>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <Shield className="w-3 h-3" />
                            <span className="text-xs capitalize">{mcp.authentication?.type || 'none'} auth</span>
                          </div>
                          
                          {mcp.capabilities.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {mcp.capabilities.slice(0, 3).map((cap, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {cap}
                                </Badge>
                              ))}
                              {mcp.capabilities.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{mcp.capabilities.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditMCP(mcp)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteMCP(mcp.name)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {formData.configuration.mcpServers.length === 0 && (
                      <div className="col-span-full text-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                        <Server className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No MCP Servers</h3>
                        <p className="text-muted-foreground mb-4">
                          Add MCP servers to enhance your agent's capabilities
                        </p>
                        <Button onClick={handleAddMCP}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Your First MCP Server
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tools Tab (Desktop only) */}
            {!isMobile && (
              <TabsContent value="tools" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Tools & Capabilities</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure tools and capabilities for your agent
                      </p>
                    </div>
                    <Button onClick={handleAddTool}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Tool
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formData.configuration.tools.map((tool, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Wrench className="w-5 h-5 text-green-500" />
                              <div>
                                <CardTitle className="text-base">{tool.name}</CardTitle>
                                <CardDescription className="text-xs capitalize">{tool.type} tool</CardDescription>
                              </div>
                            </div>
                            <Badge variant={tool.enabled ? 'default' : 'secondary'} className="text-xs">
                              {tool.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {tool.description && (
                            <p className="text-sm text-muted-foreground">{tool.description}</p>
                          )}
                          
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditTool(tool)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteTool(tool.name)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {formData.configuration.tools.length === 0 && (
                      <div className="col-span-full text-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                        <Wrench className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Tools Configured</h3>
                        <p className="text-muted-foreground mb-4">
                          Add tools to extend your agent's functionality
                        </p>
                        <Button onClick={handleAddTool}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Your First Tool
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <h4 className="font-medium">Delete Agent</h4>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this agent and all its data. This cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="shrink-0"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Agent
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Dialogs */}
      {/* MCP Dialog */}
      <Dialog open={showMCPDialog} onOpenChange={setShowMCPDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMCP ? 'Edit MCP Server' : 'Add MCP Server'}
            </DialogTitle>
            <DialogDescription>
              Configure a Model Context Protocol server for enhanced agent capabilities
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mcp-name">Name *</Label>
                <Input
                  id="mcp-name"
                  value={mcpForm.name}
                  onChange={(e) => setMCPForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter MCP server name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mcp-uri">Server URI *</Label>
                <Input
                  id="mcp-uri"
                  value={mcpForm.serverUri}
                  onChange={(e) => setMCPForm(prev => ({ ...prev, serverUri: e.target.value }))}
                  placeholder="Enter server URI"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mcp-description">Description</Label>
              <Textarea
                id="mcp-description"
                value={mcpForm.description || ''}
                onChange={(e) => setMCPForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this MCP server provides"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Authentication</Label>
              <Select
                value={mcpForm.authentication?.type || 'none'}
                onValueChange={(value) => setMCPForm(prev => ({
                  ...prev,
                  authentication: { ...prev.authentication, type: value as any }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Authentication</SelectItem>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                  <SelectItem value="basic">Basic Auth</SelectItem>
                  <SelectItem value="apikey">API Key</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {mcpForm.authentication?.type !== 'none' && (
              <div className="space-y-2">
                <Label htmlFor="mcp-credentials">Credentials</Label>
                <Input
                  id="mcp-credentials"
                  type="password"
                  value={mcpForm.authentication?.credentials || ''}
                  onChange={(e) => setMCPForm(prev => ({
                    ...prev,
                    authentication: {
                      type: prev.authentication?.type || 'none',
                      credentials: e.target.value
                    }
                  }))}
                  placeholder="Enter credentials"
                />
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Switch
                id="mcp-enabled"
                checked={mcpForm.enabled}
                onCheckedChange={(checked) => setMCPForm(prev => ({ ...prev, enabled: checked }))}
              />
              <Label htmlFor="mcp-enabled">Enable this MCP server</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMCPDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveMCP}
              disabled={!mcpForm.name.trim() || !mcpForm.serverUri.trim()}
            >
              {editingMCP ? 'Update' : 'Add'} MCP Server
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tool Dialog */}
      <Dialog open={showToolDialog} onOpenChange={setShowToolDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTool ? 'Edit Tool' : 'Add Tool'}
            </DialogTitle>
            <DialogDescription>
              Configure a tool for your agent
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tool-name">Name *</Label>
                <Input
                  id="tool-name"
                  value={toolForm.name}
                  onChange={(e) => setToolForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter tool name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tool-type">Type</Label>
                <Select
                  value={toolForm.type}
                  onValueChange={(value) => setToolForm(prev => ({ ...prev, type: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="builtin">Built-in Tool</SelectItem>
                    <SelectItem value="mcp">MCP Tool</SelectItem>
                    <SelectItem value="custom">Custom Tool</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tool-description">Description</Label>
              <Textarea
                id="tool-description"
                value={toolForm.description || ''}
                onChange={(e) => setToolForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this tool does"
                rows={2}
              />
            </div>
            
            {toolForm.type === 'mcp' && (
              <div className="space-y-2">
                <Label htmlFor="tool-mcp">MCP Server</Label>
                <Select
                  value={toolForm.mcpServerId || ''}
                  onValueChange={(value) => setToolForm(prev => ({ ...prev, mcpServerId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select MCP server" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.configuration.mcpServers.map((mcp) => (
                      <SelectItem key={mcp.name} value={mcp.name}>
                        {mcp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Switch
                id="tool-enabled"
                checked={toolForm.enabled}
                onCheckedChange={(checked) => setToolForm(prev => ({ ...prev, enabled: checked }))}
              />
              <Label htmlFor="tool-enabled">Enable this tool</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowToolDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveTool}
              disabled={!toolForm.name.trim()}
            >
              {editingTool ? 'Update' : 'Add'} Tool
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MCP Templates Dialog */}
      <Dialog open={showMCPTemplatesDialog} onOpenChange={setShowMCPTemplatesDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quick Add MCP Server</DialogTitle>
            <DialogDescription>
              Select from our curated list of popular MCP servers to quickly add to your agent
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Recommended for this agent type */}
            {(() => {
              const recommended = getRecommendedMCPsForAgent(agent.type);
              if (recommended.length > 0) {
                return (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      Recommended for {getAgentDisplayName(agent.type)}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {recommended.map((template) => (
                        <Card
                          key={template.name}
                          className="cursor-pointer hover:border-primary transition-colors"
                          onClick={() => {
                            setSelectedMCPTemplate(template);
                            setMCPForm({
                              name: template.name,
                              serverUri: template.serverUri,
                              enabled: true,
                              capabilities: template.capabilities,
                              description: template.description,
                              authentication: template.authentication || { type: 'none', credentials: '' }
                            });
                            setShowMCPTemplatesDialog(false);
                            setShowMCPDialog(true);
                          }}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                              <Server className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                              <div className="flex-1">
                                <CardTitle className="text-base">{template.name}</CardTitle>
                                <CardDescription className="text-xs mt-1">
                                  {template.description}
                                </CardDescription>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {String(template.category)}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex flex-wrap gap-1">
                              {template.capabilities.slice(0, 3).map((cap, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {cap}
                                </Badge>
                              ))}
                              {template.capabilities.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{template.capabilities.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* All templates by category */}
            <Accordion type="single" collapsible className="space-y-2">
              {Object.entries(MCP_CATEGORIES).map(([categoryKey, categoryName]) => {
                const categoryServers = SYNAPSE_MCP_SERVERS.filter(s => s.category === categoryKey);
                if (categoryServers.length === 0) return null;

                return (
                  <AccordionItem key={categoryKey} value={categoryKey}>
                    <AccordionTrigger className="text-sm font-medium">
                      {categoryName} ({categoryServers.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categoryServers.map((template) => (
                          <Card
                            key={template.name}
                            className="cursor-pointer hover:border-primary transition-colors"
                            onClick={() => {
                              setSelectedMCPTemplate(template);
                              setMCPForm({
                                name: template.name,
                                serverUri: template.serverUri,
                                enabled: true,
                                capabilities: template.capabilities,
                                description: template.description,
                                authentication: template.authentication || { type: 'none', credentials: '' }
                              });
                              setShowMCPTemplatesDialog(false);
                              setShowMCPDialog(true);
                            }}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-start gap-2">
                                <Server className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-sm truncate">{template.name}</CardTitle>
                                  <CardDescription className="text-xs mt-1 line-clamp-2">
                                    {template.description}
                                  </CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex flex-wrap gap-1">
                                {template.capabilities.slice(0, 2).map((cap, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {cap}
                                  </Badge>
                                ))}
                                {template.capabilities.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{template.capabilities.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMCPTemplatesDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setShowMCPTemplatesDialog(false);
              handleAddMCP();
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Custom MCP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Delete Agent
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{formData.name}</strong>? 
              This action cannot be undone and will permanently remove all agent data, 
              configuration, and execution history.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAgent}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentSettingsPage;