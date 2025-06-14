import Agent, { IAgent } from '../models/Agent';
import AgentRun, { IAgentRun } from '../models/AgentRun';
import mongoose from 'mongoose';

export interface AgentExecutionContext {
  agent: IAgent;
  run: IAgentRun;
  userId: mongoose.Types.ObjectId;
}

export interface AgentExecutor {
  execute(context: AgentExecutionContext): Promise<void>;
}

export class AgentService {
  private executors: Map<string, AgentExecutor> = new Map();

  constructor() {
    // Executors will be registered when specific agent implementations are loaded
  }

  registerExecutor(agentType: string, executor: AgentExecutor): void {
    this.executors.set(agentType, executor);
    console.log(`[AgentService] Registered executor for agent type: ${agentType}`);
  }

  async createAgent(
    userId: mongoose.Types.ObjectId,
    agentData: {
      name: string;
      type: 'twitter' | 'news' | 'custom';
      description?: string;
      configuration?: any;
    }
  ): Promise<IAgent> {
    const agent = new Agent({
      userId,
      ...agentData,
      isActive: true,
      status: 'idle',
      statistics: {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        totalItemsProcessed: 0,
        totalItemsAdded: 0,
      },
    });

    await agent.save();
    console.log(`[AgentService] Created agent: ${agent.name} (${agent.type})`);
    return agent;
  }

  async updateAgent(agentId: string, updates: Partial<IAgent>): Promise<IAgent | null> {
    const agent = await Agent.findByIdAndUpdate(agentId, updates, { new: true });
    if (agent) {
      console.log(`[AgentService] Updated agent: ${agent.name}`);
    }
    return agent;
  }

  async deleteAgent(agentId: string): Promise<boolean> {
    const result = await Agent.findByIdAndDelete(agentId);
    if (result) {
      console.log(`[AgentService] Deleted agent: ${result.name}`);
      return true;
    }
    return false;
  }

  async getAgentsByUser(userId: mongoose.Types.ObjectId): Promise<IAgent[]> {
    return Agent.find({ userId }).sort({ createdAt: -1 });
  }

  async getAgentById(agentId: string): Promise<IAgent | null> {
    return Agent.findById(agentId);
  }

  async getActiveAgents(): Promise<IAgent[]> {
    return Agent.find({ isActive: true, status: { $ne: 'error' } });
  }

  async getAgentsReadyToRun(): Promise<IAgent[]> {
    const now = new Date();
    return Agent.find({
      isActive: true,
      status: 'idle',
      $or: [
        { nextRun: { $lte: now } },
        { nextRun: { $exists: false } },
      ],
    });
  }

  async executeAgent(agentId: string): Promise<IAgentRun> {
    const agent = await Agent.findById(agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    if (!agent.isActive) {
      throw new Error(`Agent ${agent.name} is not active`);
    }

    if (agent.status === 'running') {
      throw new Error(`Agent ${agent.name} is already running`);
    }

    const executor = this.executors.get(agent.type);
    if (!executor) {
      throw new Error(`No executor registered for agent type: ${agent.type}`);
    }

    // Create agent run record
    const agentRun = new AgentRun({
      agentId: agent._id,
      userId: agent.userId,
      status: 'running',
      startTime: new Date(),
      itemsProcessed: 0,
      itemsAdded: 0,
      errors: [],
      logs: [],
      results: { summary: '' },
    });
    await agentRun.save();

    // Update agent status
    agent.status = 'running';
    agent.lastRun = new Date();
    await agent.save();

    try {
      const context: AgentExecutionContext = {
        agent,
        run: agentRun,
        userId: agent.userId,
      };

      await agentRun.addLog('info', `Starting execution of agent: ${agent.name}`);
      
      // Execute the agent
      await executor.execute(context);

      // Update statistics
      agent.statistics.totalRuns += 1;
      agent.statistics.successfulRuns += 1;
      agent.statistics.totalItemsProcessed += agentRun.itemsProcessed;
      agent.statistics.totalItemsAdded += agentRun.itemsAdded;
      agent.status = 'idle';
      
      // Calculate next run time based on schedule
      agent.nextRun = this.calculateNextRun(agent.configuration.schedule || '0 */6 * * *');
      
      await agent.save();
      
      await agentRun.complete(`Successfully processed ${agentRun.itemsProcessed} items, added ${agentRun.itemsAdded} new items`);
      
      console.log(`[AgentService] Agent ${agent.name} completed successfully`);

    } catch (error: any) {
      console.error(`[AgentService] Agent ${agent.name} failed:`, error);
      
      // Update statistics
      agent.statistics.totalRuns += 1;
      agent.statistics.failedRuns += 1;
      agent.status = 'error';
      agent.errorMessage = error.message;
      await agent.save();
      
      await agentRun.fail(error.message);
      
      throw error;
    }

    return agentRun;
  }

  async getAgentRuns(agentId: string, limit: number = 50): Promise<IAgentRun[]> {
    return AgentRun.find({ agentId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('agentId', 'name type');
  }

  async getUserAgentRuns(userId: mongoose.Types.ObjectId, limit: number = 50): Promise<IAgentRun[]> {
    return AgentRun.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('agentId', 'name type');
  }

  private calculateNextRun(cronExpression: string): Date {
    // Simple cron parsing for common cases
    // For production, consider using a proper cron library like 'node-cron'
    const now = new Date();
    
    // Default to 6 hours from now if parsing fails
    const defaultInterval = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
    
    try {
      // Parse basic cron expressions
      const parts = cronExpression.split(' ');
      if (parts.length === 5) {
        const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
        
        // Handle hourly intervals like "0 */6 * * *"
        if (hour.startsWith('*/')) {
          const interval = parseInt(hour.substring(2));
          return new Date(now.getTime() + (interval * 60 * 60 * 1000));
        }
        
        // Handle daily at specific time like "0 9 * * *"
        if (hour !== '*' && minute !== '*') {
          const targetHour = parseInt(hour);
          const targetMinute = parseInt(minute);
          const nextRun = new Date(now);
          nextRun.setHours(targetHour, targetMinute, 0, 0);
          
          // If the time has passed today, schedule for tomorrow
          if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 1);
          }
          
          return nextRun;
        }
      }
    } catch (error) {
      console.warn(`[AgentService] Failed to parse cron expression: ${cronExpression}, using default interval`);
    }
    
    return new Date(now.getTime() + defaultInterval);
  }

  async pauseAgent(agentId: string): Promise<IAgent | null> {
    return this.updateAgent(agentId, { status: 'paused', isActive: false });
  }

  async resumeAgent(agentId: string): Promise<IAgent | null> {
    return this.updateAgent(agentId, { status: 'idle', isActive: true });
  }

  async getAgentStatistics(agentId: string): Promise<any> {
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return null;
    }

    const recentRuns = await AgentRun.find({ agentId })
      .sort({ createdAt: -1 })
      .limit(10);

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = await AgentRun.countDocuments({
      agentId,
      createdAt: { $gte: last24Hours },
    });

    return {
      ...agent.statistics,
      recentRuns: recentRuns.length,
      recentActivity,
      lastRun: agent.lastRun,
      nextRun: agent.nextRun,
      status: agent.status,
    };
  }
}