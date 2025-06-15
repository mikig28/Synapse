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