import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { agentService } from '../services/agentService';
import { Agent, MCPServer, AgentTool, BuiltinTool } from '../types/agent';
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
  Loader2,
  ArrowLeft,
  Save,
  Copy,
  ExternalLink,
  Star,
  Zap,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useParams, useNavigate } from 'react-router-dom';
import { SYNAPSE_MCP_SERVERS, MCP_CATEGORIES, getRecommendedMCPsForAgent, MCPServerTemplate } from '../data/mcpServers';
import MCPIntegrationGuide from '@/components/MCPIntegrationGuide';

const AgentSettingsPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMCPDialog, setShowMCPDialog] = useState(false);
  const [showToolDialog, setShowToolDialog] = useState(false);
  const [showMCPTemplatesDialog, setShowMCPTemplatesDialog] = useState(false);
  const [editingMCP, setEditingMCP] = useState<MCPServer | null>(null);
  const [editingTool, setEditingTool] = useState<AgentTool | null>(null);
  const [builtinTools, setBuiltinTools] = useState<BuiltinTool[]>([]);
  const [selectedMCPTemplate, setSelectedMCPTemplate] = useState<MCPServerTemplate | null>(null);
  const { toast } = useToast();

  // Form states
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

  useEffect(() => {
    if (agentId) {
      fetchAgent();
      fetchBuiltinTools();
    }
  }, [agentId]);

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
      // Mock builtin tools - would come from backend in real implementation
      const tools: BuiltinTool[] = [
        {
          name: 'web_scraper',
          description: 'Scrape content from web pages',
          category: 'data',
          parameters: [
            { name: 'url', type: 'string', required: true, description: 'URL to scrape' },
            { name: 'selector', type: 'string', required: false, description: 'CSS selector for specific content' }
          ]
        },
        {
          name: 'content_summarizer',
          description: 'Summarize long text content',
          category: 'analysis',
          parameters: [
            { name: 'max_length', type: 'number', required: false, description: 'Maximum summary length', default: 200 }
          ]
        },
        {
          name: 'sentiment_analyzer',
          description: 'Analyze sentiment of text content',
          category: 'analysis'
        },
        {
          name: 'telegram_notifier',
          description: 'Send notifications via Telegram',
          category: 'communication',
          parameters: [
            { name: 'chat_id', type: 'string', required: true, description: 'Telegram chat ID' },
            { name: 'template', type: 'string', required: false, description: 'Message template' }
          ]
        },
        {
          name: 'data_validator',
          description: 'Validate data formats and content',
          category: 'utility',
          parameters: [
            { name: 'schema', type: 'object', required: true, description: 'Validation schema' }
          ]
        }
      ];
      setBuiltinTools(tools);
    } catch (error) {
      console.error('Failed to fetch builtin tools:', error);
    }
  };

  const handleSaveAgent = async () => {
    if (!agent) return;

    try {
      setSaving(true);
      await agentService.updateAgent(agent._id, {
        name: agent.name,
        description: agent.description,
        configuration: agent.configuration
      });
      
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

  const handleAddMCPFromTemplate = (template: MCPServerTemplate) => {
    const newMCP: MCPServer = {
      name: template.name,
      serverUri: template.serverUri,
      enabled: true,
      capabilities: template.capabilities,
      description: template.description,
      authentication: template.authentication
    };
    
    if (!agent) return;

    const mcpServers = [...(agent.configuration.mcpServers || [])];
    
    // Check if server already exists
    if (mcpServers.find(s => s.name === template.name)) {
      toast({
        title: 'Already Added',
        description: `${template.name} is already configured for this agent`,
        variant: 'destructive',
      });
      return;
    }
    
    mcpServers.push(newMCP);

    setAgent({
      ...agent,
      configuration: {
        ...agent.configuration,
        mcpServers
      }
    });

    toast({
      title: 'Success',
      description: `${template.name} added successfully`,
    });
  };

  const handleEditMCP = (mcp: MCPServer) => {
    setEditingMCP(mcp);
    setMCPForm({ ...mcp });
    setShowMCPDialog(true);
  };

  const handleSaveMCP = () => {
    if (!agent) return;

    const mcpServers = [...(agent.configuration.mcpServers || [])];
    
    if (editingMCP) {
      const index = mcpServers.findIndex(s => s.name === editingMCP.name);
      if (index >= 0) {
        mcpServers[index] = mcpForm;
      }
    } else {
      mcpServers.push(mcpForm);
    }

    setAgent({
      ...agent,
      configuration: {
        ...agent.configuration,
        mcpServers
      }
    });

    setShowMCPDialog(false);
    toast({
      title: 'Success',
      description: `MCP server ${editingMCP ? 'updated' : 'added'} successfully`,
    });
  };

  const handleDeleteMCP = (mcpName: string) => {
    if (!agent) return;

    const mcpServers = (agent.configuration.mcpServers || []).filter(s => s.name !== mcpName);
    
    setAgent({
      ...agent,
      configuration: {
        ...agent.configuration,
        mcpServers
      }
    });

    toast({
      title: 'Success',
      description: 'MCP server removed successfully',
    });
  };

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
    if (!agent) return;

    const tools = [...(agent.configuration.tools || [])];
    
    if (editingTool) {
      const index = tools.findIndex(t => t.name === editingTool.name);
      if (index >= 0) {
        tools[index] = toolForm;
      }
    } else {
      tools.push(toolForm);
    }

    setAgent({
      ...agent,
      configuration: {
        ...agent.configuration,
        tools
      }
    });

    setShowToolDialog(false);
    toast({
      title: 'Success',
      description: `Tool ${editingTool ? 'updated' : 'added'} successfully`,
    });
  };

  const handleDeleteTool = (toolName: string) => {
    if (!agent) return;

    const tools = (agent.configuration.tools || []).filter(t => t.name !== toolName);
    
    setAgent({
      ...agent,
      configuration: {
        ...agent.configuration,
        tools
      }
    });

    toast({
      title: 'Success',
      description: 'Tool removed successfully',
    });
  };

  const getToolIcon = (type: string) => {
    switch (type) {
      case 'builtin':
        return <Wrench className="w-4 h-4" />;
      case 'mcp':
        return <Server className="w-4 h-4" />;
      case 'custom':
        return <Settings className="w-4 h-4" />;
      default:
        return <Wrench className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'data':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'communication':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'analysis':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'utility':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <Card className="text-center p-8">
          <CardContent>
            <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Agent Not Found</h3>
            <p className="text-muted-foreground mb-6">
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/agents')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
                Agent Settings
              </h1>
              <p className="text-muted-foreground">
                Configure MCPs, tools, and capabilities for {agent.name}
              </p>
            </div>
          </div>
          
          <Button
            onClick={handleSaveAgent}
            disabled={saving}
            size="lg"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>

        {/* Agent Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bot className="w-6 h-6" />
              <div>
                <CardTitle>{agent.name}</CardTitle>
                <CardDescription className="capitalize">
                  {agent.type} Agent • {agent.isActive ? 'Active' : 'Paused'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded">
                <p className="font-medium">{(agent.configuration.mcpServers || []).length}</p>
                <p className="text-sm text-muted-foreground">MCP Servers</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded">
                <p className="font-medium">{(agent.configuration.tools || []).length}</p>
                <p className="text-sm text-muted-foreground">Tools Configured</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded">
                <p className="font-medium">
                  {(agent.configuration.tools || []).filter(t => t.enabled).length}
                </p>
                <p className="text-sm text-muted-foreground">Active Tools</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Tabs */}
        <Tabs defaultValue="mcps" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mcps" className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              MCP Servers
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Tools & Capabilities
            </TabsTrigger>
          </TabsList>

          {/* MCP Servers Tab */}
          <TabsContent value="mcps" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">MCP Servers</h3>
                <p className="text-sm text-muted-foreground">
                  Configure Model Context Protocol servers for enhanced agent capabilities
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
              {(agent.configuration.mcpServers || []).map((mcp, index) => (
                <Card key={index} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Server className="w-5 h-5 text-blue-500" />
                        <div>
                          <CardTitle className="text-base">{mcp.name}</CardTitle>
                          <CardDescription className="text-xs">{mcp.serverUri}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {mcp.enabled ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <Badge variant={mcp.enabled ? 'default' : 'secondary'} className="text-xs">
                          {mcp.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
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
              
              {(agent.configuration.mcpServers || []).length === 0 && (
                <div className="col-span-full text-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <Server className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No MCP Servers</h3>
                  <p className="text-muted-foreground mb-4">
                    Add MCP servers to extend your agent's capabilities
                  </p>
                  <Button onClick={handleAddMCP}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First MCP Server
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Tools & Capabilities</h3>
                <p className="text-sm text-muted-foreground">
                  Configure tools and capabilities available to your agent
                </p>
              </div>
              <Button onClick={handleAddTool}>
                <Plus className="w-4 h-4 mr-2" />
                Add Tool
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(agent.configuration.tools || []).map((tool, index) => (
                <Card key={index} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getToolIcon(tool.type)}
                        <div>
                          <CardTitle className="text-base">{tool.name}</CardTitle>
                          <CardDescription className="text-xs capitalize">
                            {tool.type} tool
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {tool.enabled ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <Badge variant={tool.enabled ? 'default' : 'secondary'} className="text-xs">
                          {tool.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {tool.description && (
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                    )}
                    
                    {tool.mcpServerId && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Server className="w-3 h-3" />
                        <span>MCP: {tool.mcpServerId}</span>
                      </div>
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
              
              {(agent.configuration.tools || []).length === 0 && (
                <div className="col-span-full text-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <Wrench className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Tools Configured</h3>
                  <p className="text-muted-foreground mb-4">
                    Add tools to enhance your agent's capabilities
                  </p>
                  <Button onClick={handleAddTool}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Tool
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* MCP Templates Dialog */}
        <Dialog open={showMCPTemplatesDialog} onOpenChange={setShowMCPTemplatesDialog}>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Add MCP Server from Template</DialogTitle>
              <DialogDescription>
                Choose from pre-configured MCP servers optimized for your agent type.
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Recommended for this agent type */}
                {agent && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      Recommended for {agent.type} agents
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {getRecommendedMCPsForAgent(agent.type).map((template) => {
                        const isAdded = (agent.configuration.mcpServers || []).some(s => s.name === template.name);
                        return (
                          <Card key={template.id} className="relative">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h5 className="font-medium text-sm">{template.name}</h5>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {template.description}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MCPIntegrationGuide mcpServer={template}>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        title="Integration Guide"
                                      >
                                        <HelpCircle className="w-3 h-3" />
                                      </Button>
                                    </MCPIntegrationGuide>
                                    <Badge className={`text-xs ${MCP_CATEGORIES[template.category].color}`}>
                                      {MCP_CATEGORIES[template.category].name}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-1">
                                  {template.capabilities.slice(0, 3).map((cap) => (
                                    <Badge key={cap} variant="outline" className="text-xs px-1 py-0">
                                      {cap}
                                    </Badge>
                                  ))}
                                  {template.capabilities.length > 3 && (
                                    <Badge variant="outline" className="text-xs px-1 py-0">
                                      +{template.capabilities.length - 3}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="text-xs text-muted-foreground">
                                  {template.useCase}
                                </div>
                                
                                <Button
                                  size="sm"
                                  onClick={() => handleAddMCPFromTemplate(template)}
                                  disabled={isAdded}
                                  className="w-full"
                                  variant={isAdded ? "secondary" : "default"}
                                >
                                  {isAdded ? (
                                    <>
                                      <CheckCircle className="w-3 h-3 mr-2" />
                                      Added
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3 h-3 mr-2" />
                                      Add to Agent
                                    </>
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* All MCP servers by category */}
                {Object.entries(MCP_CATEGORIES).map(([categoryKey, category]) => {
                  const serversInCategory = SYNAPSE_MCP_SERVERS.filter(s => s.category === categoryKey);
                  if (serversInCategory.length === 0) return null;
                  
                  return (
                    <div key={categoryKey}>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${category.color}`}></div>
                        {category.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-3">{category.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {serversInCategory.map((template) => {
                          const isAdded = agent && (agent.configuration.mcpServers || []).some(s => s.name === template.name);
                          return (
                            <Card key={template.id} className="relative">
                              <CardContent className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h5 className="font-medium text-sm">{template.name}</h5>
                                      <p className="text-xs text-muted-foreground line-clamp-2">
                                        {template.description}
                                      </p>
                                    </div>
                                    <div className="flex gap-1">
                                      <MCPIntegrationGuide mcpServer={template}>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          title="Integration Guide"
                                        >
                                          <HelpCircle className="w-3 h-3" />
                                        </Button>
                                      </MCPIntegrationGuide>
                                      {template.documentation && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => window.open(template.documentation, '_blank')}
                                          title="Official Documentation"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-1">
                                    {template.capabilities.slice(0, 3).map((cap) => (
                                      <Badge key={cap} variant="outline" className="text-xs px-1 py-0">
                                        {cap}
                                      </Badge>
                                    ))}
                                    {template.capabilities.length > 3 && (
                                      <Badge variant="outline" className="text-xs px-1 py-0">
                                        +{template.capabilities.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="text-xs text-muted-foreground">
                                    {template.useCase}
                                  </div>
                                  
                                  <Button
                                    size="sm"
                                    onClick={() => handleAddMCPFromTemplate(template)}
                                    disabled={isAdded}
                                    className="w-full"
                                    variant={isAdded ? "secondary" : "default"}
                                  >
                                    {isAdded ? (
                                      <>
                                        <CheckCircle className="w-3 h-3 mr-2" />
                                        Added
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="w-3 h-3 mr-2" />
                                        Add to Agent
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            
            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowMCPTemplatesDialog(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MCP Server Dialog */}
        <Dialog open={showMCPDialog} onOpenChange={setShowMCPDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingMCP ? 'Edit MCP Server' : 'Add MCP Server'}
              </DialogTitle>
              <DialogDescription>
                Configure a Model Context Protocol server to extend agent capabilities.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mcp-name">Server Name</Label>
                  <Input
                    id="mcp-name"
                    value={mcpForm.name}
                    onChange={(e) => setMCPForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My MCP Server"
                  />
                </div>
                <div>
                  <Label htmlFor="mcp-uri">Server URI</Label>
                  <Input
                    id="mcp-uri"
                    value={mcpForm.serverUri}
                    onChange={(e) => setMCPForm(prev => ({ ...prev, serverUri: e.target.value }))}
                    placeholder="http://localhost:3001/mcp"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="mcp-description">Description</Label>
                <Textarea
                  id="mcp-description"
                  value={mcpForm.description}
                  onChange={(e) => setMCPForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this MCP server provides..."
                />
              </div>

              <div>
                <Label htmlFor="mcp-capabilities">Capabilities (comma-separated)</Label>
                <Input
                  id="mcp-capabilities"
                  value={mcpForm.capabilities.join(', ')}
                  onChange={(e) => setMCPForm(prev => ({ 
                    ...prev, 
                    capabilities: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  }))}
                  placeholder="tools, resources, prompts"
                />
              </div>

              <div className="space-y-3">
                <Label>Authentication</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="auth-type">Auth Type</Label>
                    <Select
                      value={mcpForm.authentication?.type || 'none'}
                      onValueChange={(value: 'none' | 'bearer' | 'basic' | 'apikey') =>
                        setMCPForm(prev => ({
                          ...prev,
                          authentication: { ...prev.authentication, type: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="basic">Basic Auth</SelectItem>
                        <SelectItem value="apikey">API Key</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {mcpForm.authentication?.type !== 'none' && (
                    <div>
                      <Label htmlFor="auth-creds">Credentials</Label>
                      <Input
                        id="auth-creds"
                        type="password"
                        value={mcpForm.authentication?.credentials || ''}
                        onChange={(e) => setMCPForm(prev => ({
                          ...prev,
                          authentication: { ...prev.authentication, credentials: e.target.value }
                        }))}
                        placeholder="Enter credentials..."
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="mcp-enabled"
                  checked={mcpForm.enabled}
                  onCheckedChange={(checked) => setMCPForm(prev => ({ ...prev, enabled: checked }))}
                />
                <Label htmlFor="mcp-enabled">Enable this MCP server</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowMCPDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveMCP} disabled={!mcpForm.name || !mcpForm.serverUri}>
                  {editingMCP ? 'Update' : 'Add'} Server
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Tool Dialog */}
        <Dialog open={showToolDialog} onOpenChange={setShowToolDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingTool ? 'Edit Tool' : 'Add Tool'}
              </DialogTitle>
              <DialogDescription>
                Configure a tool or capability for your agent.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tool-type">Tool Type</Label>
                  <Select
                    value={toolForm.type}
                    onValueChange={(value: 'builtin' | 'custom' | 'mcp') =>
                      setToolForm(prev => ({ ...prev, type: value }))
                    }
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
                
                {toolForm.type === 'builtin' && (
                  <div>
                    <Label htmlFor="tool-builtin">Select Tool</Label>
                    <Select
                      value={toolForm.name}
                      onValueChange={(value) => {
                        const selected = builtinTools.find(t => t.name === value);
                        setToolForm(prev => ({
                          ...prev,
                          name: value,
                          description: selected?.description || ''
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a tool..." />
                      </SelectTrigger>
                      <SelectContent>
                        {builtinTools.map((tool) => (
                          <SelectItem key={tool.name} value={tool.name}>
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded text-xs ${getCategoryColor(tool.category)}`}>
                                {tool.category}
                              </span>
                              {tool.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {toolForm.type !== 'builtin' && (
                  <div>
                    <Label htmlFor="tool-name">Tool Name</Label>
                    <Input
                      id="tool-name"
                      value={toolForm.name}
                      onChange={(e) => setToolForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="my_custom_tool"
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="tool-description">Description</Label>
                <Textarea
                  id="tool-description"
                  value={toolForm.description}
                  onChange={(e) => setToolForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this tool does..."
                />
              </div>

              {toolForm.type === 'mcp' && (
                <div>
                  <Label htmlFor="mcp-server">MCP Server</Label>
                  <Select
                    value={toolForm.mcpServerId}
                    onValueChange={(value) => setToolForm(prev => ({ ...prev, mcpServerId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select MCP server..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(agent.configuration.mcpServers || []).map((server) => (
                        <SelectItem key={server.name} value={server.name}>
                          {server.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Tool Configuration */}
              {toolForm.type === 'builtin' && toolForm.name && (
                <div className="space-y-3">
                  <Label>Tool Configuration</Label>
                  {builtinTools.find(t => t.name === toolForm.name)?.parameters?.map((param) => (
                    <div key={param.name} className="grid grid-cols-3 gap-2 items-center">
                      <Label className="text-sm">{param.name}</Label>
                      <div className="col-span-2">
                        {param.type === 'boolean' ? (
                          <Switch
                            checked={Boolean(toolForm.configuration?.[param.name])}
                            onCheckedChange={(checked) => setToolForm(prev => ({
                              ...prev,
                              configuration: { ...prev.configuration, [param.name]: checked }
                            }))}
                          />
                        ) : (
                          <Input
                            value={toolForm.configuration?.[param.name] || param.default || ''}
                            onChange={(e) => setToolForm(prev => ({
                              ...prev,
                              configuration: { ...prev.configuration, [param.name]: e.target.value }
                            }))}
                            placeholder={param.description}
                            type={param.type === 'number' ? 'number' : 'text'}
                          />
                        )}
                      </div>
                    </div>
                  ))}
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

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowToolDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTool} disabled={!toolForm.name}>
                  {editingTool ? 'Update' : 'Add'} Tool
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AgentSettingsPage;