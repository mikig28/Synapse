import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../../types/express';
import { AgentService } from '../../services/agentService';
import { AgentScheduler } from '../../services/agentScheduler';
import Agent, { IAgent } from '../../models/Agent';
import AgentRun from '../../models/AgentRun';

// Initialize services (these will be injected from server setup)
let agentService: AgentService;
let agentScheduler: AgentScheduler;

export const initializeAgentServices = (service: AgentService, scheduler: AgentScheduler) => {
  agentService = service;
  agentScheduler = scheduler;
};

// Get all agents for the authenticated user
export const getAgents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const agents = await agentService.getAgentsByUser(new mongoose.Types.ObjectId(userId));
    
    res.json({
      success: true,
      data: agents,
      count: agents.length,
    });
  } catch (error: any) {
    console.error('[AgentsController] Error fetching agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agents',
      message: error.message,
    });
  }
};

// Get a specific agent by ID
export const getAgentById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const userId = req.user!.id;
    
    const agent = await agentService.getAgentById(agentId);
    
    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
      return;
    }
    
    // Check if agent belongs to the user
    if (agent.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }
    
    res.json({
      success: true,
      data: agent,
    });
  } catch (error: any) {
    console.error('[AgentsController] Error fetching agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent',
      message: error.message,
    });
  }
};

// Create a new agent
export const createAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, type, description, configuration } = req.body;
    
    // Validate required fields
    if (!name || !type) {
      res.status(400).json({
        success: false,
        error: 'Name and type are required',
      });
      return;
    }
    
    // Validate agent type
    if (!['twitter', 'news', 'crewai_news', 'custom'].includes(type)) {
      res.status(400).json({
        success: false,
        error: 'Invalid agent type. Must be: twitter, news, crewai_news, or custom',
      });
      return;
    }
    
    const agent = await agentService.createAgent(
      new mongoose.Types.ObjectId(userId),
      {
        name,
        type,
        description,
        configuration: configuration || {},
      }
    );
    
    // Schedule the agent if it's active
    if (agent.isActive) {
      await agentScheduler.scheduleAgent(agent);
    }
    
    res.status(201).json({
      success: true,
      data: agent,
      message: 'Agent created successfully',
    });
  } catch (error: any) {
    console.error('[AgentsController] Error creating agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create agent',
      message: error.message,
    });
  }
};

// Update an agent
export const updateAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const userId = req.user!.id;
    
    // Check if agent exists and belongs to user
    const existingAgent = await agentService.getAgentById(agentId);
    if (!existingAgent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
      return;
    }
    
    if (existingAgent.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }
    
    const updates = req.body;
    
    // Don't allow updating certain fields
    delete updates._id;
    delete updates.userId;
    delete updates.createdAt;
    delete updates.updatedAt;
    
    const updatedAgent = await agentService.updateAgent(agentId, updates);
    
    if (!updatedAgent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
      return;
    }
    
    // Update scheduling
    if (updatedAgent.isActive) {
      await agentScheduler.scheduleAgent(updatedAgent);
    } else {
      await agentScheduler.unscheduleAgent(agentId);
    }
    
    res.json({
      success: true,
      data: updatedAgent,
      message: 'Agent updated successfully',
    });
  } catch (error: any) {
    console.error('[AgentsController] Error updating agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent',
      message: error.message,
    });
  }
};

// Delete an agent
export const deleteAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const userId = req.user!.id;
    
    // Check if agent exists and belongs to user
    const agent = await agentService.getAgentById(agentId);
    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
      return;
    }
    
    if (agent.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }
    
    // Unschedule the agent
    await agentScheduler.unscheduleAgent(agentId);
    
    // Delete the agent
    const deleted = await agentService.deleteAgent(agentId);
    
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Agent deleted successfully',
    });
  } catch (error: any) {
    console.error('[AgentsController] Error deleting agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete agent',
      message: error.message,
    });
  }
};

// Execute an agent manually
export const executeAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { agentId } = req.params;
  const userId = req.user!.id;
  
  try {
    // Check if agent exists and belongs to user
    const agent = await agentService.getAgentById(agentId);
    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
      return;
    }
    
    if (agent.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }
    
    // Execute the agent
    const agentRun = await agentService.executeAgent(agentId);
    
    res.json({
      success: true,
      data: agentRun,
      message: 'Agent execution started',
    });
  } catch (error: any) {
    console.error('[AgentsController] Error executing agent:', error);
    console.error('[AgentsController] Error details:', {
      agentId,
      userId,
      errorMessage: error.message,
      errorStack: error.stack
    });
    res.status(400).json({
      success: false,
      error: 'Failed to execute agent',
      message: error.message,
      details: error.message // Include the actual error message for debugging
    });
  }
};

// Get agent runs
export const getAgentRuns = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Check if agent exists and belongs to user
    const agent = await agentService.getAgentById(agentId);
    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
      return;
    }
    
    if (agent.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }
    
    const runs = await agentService.getAgentRuns(agentId, limit);
    
    res.json({
      success: true,
      data: runs,
      count: runs.length,
    });
  } catch (error: any) {
    console.error('[AgentsController] Error fetching agent runs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent runs',
      message: error.message,
    });
  }
};

// Get all agent runs for user
export const getUserAgentRuns = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const runs = await agentService.getUserAgentRuns(new mongoose.Types.ObjectId(userId), limit);
    
    res.json({
      success: true,
      data: runs,
      count: runs.length,
    });
  } catch (error: any) {
    console.error('[AgentsController] Error fetching user agent runs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent runs',
      message: error.message,
    });
  }
};

// Get agent statistics
export const getAgentStatistics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const userId = req.user!.id;
    
    // Check if agent exists and belongs to user
    const agent = await agentService.getAgentById(agentId);
    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
      return;
    }
    
    if (agent.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }
    
    const statistics = await agentService.getAgentStatistics(agentId);
    
    res.json({
      success: true,
      data: statistics,
    });
  } catch (error: any) {
    console.error('[AgentsController] Error fetching agent statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent statistics',
      message: error.message,
    });
  }
};

// Pause an agent
export const pauseAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const userId = req.user!.id;
    
    // Check if agent exists and belongs to user
    const agent = await agentService.getAgentById(agentId);
    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
      return;
    }
    
    if (agent.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }
    
    const updatedAgent = await agentService.pauseAgent(agentId);
    
    if (updatedAgent) {
      await agentScheduler.unscheduleAgent(agentId);
    }
    
    res.json({
      success: true,
      data: updatedAgent,
      message: 'Agent paused successfully',
    });
  } catch (error: any) {
    console.error('[AgentsController] Error pausing agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause agent',
      message: error.message,
    });
  }
};

// Resume an agent
export const resumeAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const userId = req.user!.id;
    
    // Check if agent exists and belongs to user
    const agent = await agentService.getAgentById(agentId);
    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
      return;
    }
    
    if (agent.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }
    
    const updatedAgent = await agentService.resumeAgent(agentId);
    
    if (updatedAgent) {
      await agentScheduler.scheduleAgent(updatedAgent);
    }
    
    res.json({
      success: true,
      data: updatedAgent,
      message: 'Agent resumed successfully',
    });
  } catch (error: any) {
    console.error('[AgentsController] Error resuming agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume agent',
      message: error.message,
    });
  }
};

// Get scheduler status
export const getSchedulerStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = agentScheduler.getSchedulerStatus();
    
    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('[AgentsController] Error fetching scheduler status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduler status',
      message: error.message,
    });
  }
};

// Get available builtin tools
export const getBuiltinTools = async (req: Request, res: Response): Promise<void> => {
  try {
    const builtinTools = [
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
      },
      {
        name: 'email_notifier',
        description: 'Send email notifications',
        category: 'communication',
        parameters: [
          { name: 'to', type: 'string', required: true, description: 'Recipient email' },
          { name: 'subject_template', type: 'string', required: false, description: 'Email subject template' }
        ]
      },
      {
        name: 'content_filter',
        description: 'Filter content based on rules',
        category: 'utility',
        parameters: [
          { name: 'keywords', type: 'array', required: false, description: 'Keywords to filter by' },
          { name: 'min_score', type: 'number', required: false, description: 'Minimum relevance score' }
        ]
      }
    ];
    
    res.json({
      success: true,
      data: builtinTools,
    });
  } catch (error: any) {
    console.error('[AgentsController] Error fetching builtin tools:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch builtin tools',
      message: error.message,
    });
  }
};

// Test MCP server connection
export const testMCPConnection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { serverUri, authentication } = req.body;
    
    if (!serverUri) {
      res.status(400).json({
        success: false,
        error: 'Server URI is required',
      });
      return;
    }
    
    // Here you would implement actual MCP connection testing
    // For now, we'll do a simple HTTP check
    const fetch = (await import('node-fetch')).default;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (authentication?.type === 'bearer' && authentication?.credentials) {
      headers['Authorization'] = `Bearer ${authentication.credentials}`;
    } else if (authentication?.type === 'apikey' && authentication?.credentials) {
      headers['X-API-Key'] = authentication.credentials;
    }
    
    try {
      const response = await fetch(serverUri, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {}
          },
          id: 1
        }),
        timeout: 5000
      });
      
      const isConnectable = response.status < 500;
      
      res.json({
        success: true,
        data: {
          connectable: isConnectable,
          status: response.status,
          statusText: response.statusText,
          message: isConnectable ? 'MCP server is reachable' : 'MCP server returned an error'
        },
      });
    } catch (fetchError: any) {
      res.json({
        success: true,
        data: {
          connectable: false,
          error: fetchError.message,
          message: 'Unable to connect to MCP server'
        },
      });
    }
  } catch (error: any) {
    console.error('[AgentsController] Error testing MCP connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test MCP connection',
      message: error.message,
    });
  }
};

// Get agent capabilities summary
export const getAgentCapabilities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const userId = req.user!.id;
    
    // Check if agent exists and belongs to user
    const agent = await agentService.getAgentById(agentId);
    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
      return;
    }
    
    if (agent.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }
    
    const mcpServers = agent.configuration.mcpServers || [];
    const tools = agent.configuration.tools || [];
    
    const capabilities = {
      mcpServers: {
        total: mcpServers.length,
        enabled: mcpServers.filter(s => s.enabled).length,
        capabilities: [...new Set(mcpServers.flatMap(s => s.capabilities))]
      },
      tools: {
        total: tools.length,
        enabled: tools.filter(t => t.enabled).length,
        byType: {
          builtin: tools.filter(t => t.type === 'builtin').length,
          mcp: tools.filter(t => t.type === 'mcp').length,
          custom: tools.filter(t => t.type === 'custom').length
        }
      },
      integrations: {
        hasWebScraping: tools.some(t => t.name === 'web_scraper' && t.enabled),
        hasNotifications: tools.some(t => ['telegram_notifier', 'email_notifier'].includes(t.name) && t.enabled),
        hasAnalysis: tools.some(t => ['sentiment_analyzer', 'content_summarizer'].includes(t.name) && t.enabled)
      }
    };
    
    res.json({
      success: true,
      data: capabilities,
    });
  } catch (error: any) {
    console.error('[AgentsController] Error fetching agent capabilities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent capabilities',
      message: error.message,
    });
  }
};

// Debug endpoint to check environment variables
export const getEnvironmentDebug = async (req: Request, res: Response): Promise<void> => {
  try {
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      TWITTER_BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN ? 'SET' : 'NOT SET',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
      NEWS_API_KEY: process.env.NEWS_API_KEY ? 'SET' : 'NOT SET',
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
    };
    
    res.json({
      success: true,
      data: envVars,
    });
  } catch (error: any) {
    console.error('[AgentsController] Error checking environment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check environment',
      message: error.message,
    });
  }
};