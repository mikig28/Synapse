import { Request, Response } from 'express';
import ScheduledAgent, { IScheduledAgent } from '../../models/ScheduledAgent';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import mongoose from 'mongoose';

// Create a new scheduled agent
export const createScheduledAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description, agentConfig, schedule } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    // Validate required fields
    if (!name || !agentConfig || !schedule) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: name, agentConfig, and schedule are required' 
      });
      return;
    }

    // Validate agent config
    if (!agentConfig.topics || !Array.isArray(agentConfig.topics) || agentConfig.topics.length === 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Agent config must include at least one topic' 
      });
      return;
    }

    // Validate schedule
    if (schedule.type === 'cron' && !schedule.cronExpression) {
      res.status(400).json({ 
        success: false, 
        error: 'Cron expression is required for cron schedule type' 
      });
      return;
    }

    if (schedule.type === 'interval' && !schedule.intervalMinutes) {
      res.status(400).json({ 
        success: false, 
        error: 'Interval minutes is required for interval schedule type' 
      });
      return;
    }

    // Create the scheduled agent
    const scheduledAgent = new ScheduledAgent({
      userId,
      name,
      description,
      agentConfig,
      schedule,
      isActive: true
    });

    await scheduledAgent.save();

    res.status(201).json({
      success: true,
      data: scheduledAgent,
      message: 'Scheduled agent created successfully'
    });

  } catch (error: any) {
    console.error('Error creating scheduled agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create scheduled agent',
      details: error.message
    });
  }
};

// Get all scheduled agents for a user
export const getScheduledAgents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { page = 1, limit = 10, status, search } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));

    // Build query
    const query: any = { userId };

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'agentConfig.topics': { $in: [new RegExp(search as string, 'i')] } }
      ];
    }

    const total = await ScheduledAgent.countDocuments(query);
    const scheduledAgents = await ScheduledAgent.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    res.json({
      success: true,
      data: scheduledAgents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error: any) {
    console.error('Error fetching scheduled agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduled agents',
      details: error.message
    });
  }
};

// Get a specific scheduled agent
export const getScheduledAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: 'Invalid agent ID' });
      return;
    }

    const scheduledAgent = await ScheduledAgent.findOne({
      _id: id,
      userId
    });

    if (!scheduledAgent) {
      res.status(404).json({ success: false, error: 'Scheduled agent not found' });
      return;
    }

    res.json({
      success: true,
      data: scheduledAgent
    });

  } catch (error: any) {
    console.error('Error fetching scheduled agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduled agent',
      details: error.message
    });
  }
};

// Update a scheduled agent
export const updateScheduledAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const updates = req.body;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: 'Invalid agent ID' });
      return;
    }

    // Remove sensitive fields that shouldn't be updated directly
    delete updates.userId;
    delete updates.executionCount;
    delete updates.successCount;
    delete updates.failureCount;
    delete updates.lastResult;

    const scheduledAgent = await ScheduledAgent.findOneAndUpdate(
      { _id: id, userId },
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!scheduledAgent) {
      res.status(404).json({ success: false, error: 'Scheduled agent not found' });
      return;
    }

    res.json({
      success: true,
      data: scheduledAgent,
      message: 'Scheduled agent updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating scheduled agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update scheduled agent',
      details: error.message
    });
  }
};

// Toggle active status of a scheduled agent
export const toggleScheduledAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: 'Invalid agent ID' });
      return;
    }

    const scheduledAgent = await ScheduledAgent.findOne({ _id: id, userId });

    if (!scheduledAgent) {
      res.status(404).json({ success: false, error: 'Scheduled agent not found' });
      return;
    }

    scheduledAgent.isActive = !scheduledAgent.isActive;
    await scheduledAgent.save();

    res.json({
      success: true,
      data: scheduledAgent,
      message: `Scheduled agent ${scheduledAgent.isActive ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error: any) {
    console.error('Error toggling scheduled agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle scheduled agent',
      details: error.message
    });
  }
};

// Delete a scheduled agent
export const deleteScheduledAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: 'Invalid agent ID' });
      return;
    }

    const scheduledAgent = await ScheduledAgent.findOneAndDelete({
      _id: id,
      userId
    });

    if (!scheduledAgent) {
      res.status(404).json({ success: false, error: 'Scheduled agent not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Scheduled agent deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting scheduled agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete scheduled agent',
      details: error.message
    });
  }
};

// Execute a scheduled agent manually (for testing)
export const executeScheduledAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: 'Invalid agent ID' });
      return;
    }

    const scheduledAgent = await ScheduledAgent.findOne({
      _id: id,
      userId
    });

    if (!scheduledAgent) {
      res.status(404).json({ success: false, error: 'Scheduled agent not found' });
      return;
    }

    // Import the scheduler service to execute the agent
    const { executeScheduledAgentById } = await import('../../services/schedulerService');
    
    const result = await executeScheduledAgentById(scheduledAgent._id);

    res.json({
      success: true,
      data: result,
      message: 'Scheduled agent executed successfully'
    });

  } catch (error: any) {
    console.error('Error executing scheduled agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute scheduled agent',
      details: error.message
    });
  }
};

// Get execution history for a scheduled agent
export const getExecutionHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { page = 1, limit = 10 } = req.query;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: 'Invalid agent ID' });
      return;
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));

    // Verify ownership
    const scheduledAgent = await ScheduledAgent.findOne({ _id: id, userId });
    if (!scheduledAgent) {
      res.status(404).json({ success: false, error: 'Scheduled agent not found' });
      return;
    }

    // Get related agent runs (this would need to be implemented based on your AgentRun model)
    // For now, return the agent's basic execution stats
    const successRate = scheduledAgent.executionCount > 0 ? 
      (scheduledAgent.successCount / scheduledAgent.executionCount) * 100 : 0;
    
    const executionHistory = {
      totalExecutions: scheduledAgent.executionCount,
      successfulExecutions: scheduledAgent.successCount,
      failedExecutions: scheduledAgent.failureCount,
      successRate: Math.round(successRate),
      lastExecution: scheduledAgent.lastExecuted,
      lastResult: scheduledAgent.lastResult,
      nextExecution: scheduledAgent.nextExecution
    };

    res.json({
      success: true,
      data: executionHistory
    });

  } catch (error: any) {
    console.error('Error fetching execution history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch execution history',
      details: error.message
    });
  }
};