import * as cron from 'node-cron';
import { AgentService } from './agentService';
import { IAgent } from '../models/Agent';

export class AgentScheduler {
  private agentService: AgentService;
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(agentService: AgentService) {
    this.agentService = agentService;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[AgentScheduler] Scheduler is already running');
      return;
    }

    console.log('[AgentScheduler] Starting agent scheduler...');
    this.isRunning = true;

    // Run initial check for agents ready to run
    await this.checkAndRunAgents();

    // Schedule periodic checks every 5 minutes
    this.checkInterval = setInterval(async () => {
      await this.checkAndRunAgents();
    }, 5 * 60 * 1000); // 5 minutes

    // Also schedule a more frequent check every minute for precise timing
    cron.schedule('* * * * *', async () => {
      if (this.isRunning) {
        await this.checkAndRunAgents();
      }
    });

    console.log('[AgentScheduler] Agent scheduler started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('[AgentScheduler] Scheduler is not running');
      return;
    }

    console.log('[AgentScheduler] Stopping agent scheduler...');
    this.isRunning = false;

    // Clear interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Stop all scheduled tasks
    for (const [agentId, task] of this.scheduledTasks) {
      task.stop();
      this.scheduledTasks.delete(agentId);
    }

    console.log('[AgentScheduler] Agent scheduler stopped');
  }

  private async checkAndRunAgents(): Promise<void> {
    try {
      const agentsReadyToRun = await this.agentService.getAgentsReadyToRun();
      
      if (agentsReadyToRun.length > 0) {
        console.log(`[AgentScheduler] Found ${agentsReadyToRun.length} agents ready to run`);
        
        // Run agents in parallel but limit concurrency
        const maxConcurrentAgents = 3;
        const chunks = this.chunkArray(agentsReadyToRun, maxConcurrentAgents);
        
        for (const chunk of chunks) {
          const promises = chunk.map(agent => this.runAgentSafely(agent));
          await Promise.allSettled(promises);
        }
      }
    } catch (error) {
      console.error('[AgentScheduler] Error during agent check:', error);
    }
  }

  private async runAgentSafely(agent: IAgent): Promise<void> {
    try {
      console.log(`[AgentScheduler] Executing agent: ${agent.name} (${agent.type})`);
      await this.agentService.executeAgent(agent._id.toString());
      console.log(`[AgentScheduler] Agent ${agent.name} completed successfully`);
    } catch (error: any) {
      console.error(`[AgentScheduler] Agent ${agent.name} failed:`, error.message);
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  async scheduleAgent(agent: IAgent): Promise<void> {
    const agentId = agent._id.toString();
    
    // Stop existing schedule if any
    if (this.scheduledTasks.has(agentId)) {
      this.scheduledTasks.get(agentId)?.stop();
      this.scheduledTasks.delete(agentId);
    }

    if (!agent.isActive || !agent.configuration.schedule) {
      console.log(`[AgentScheduler] Skipping schedule for inactive agent or agent without schedule: ${agent.name}`);
      return;
    }

    try {
      // Validate cron expression
      if (!cron.validate(agent.configuration.schedule)) {
        console.error(`[AgentScheduler] Invalid cron expression for agent ${agent.name}: ${agent.configuration.schedule}`);
        return;
      }

      const task = cron.schedule(agent.configuration.schedule, async () => {
        await this.runAgentSafely(agent);
      }, {
        scheduled: false, // Don't start immediately
        timezone: 'UTC'
      });

      this.scheduledTasks.set(agentId, task);
      task.start();

      console.log(`[AgentScheduler] Scheduled agent ${agent.name} with cron: ${agent.configuration.schedule}`);
    } catch (error) {
      console.error(`[AgentScheduler] Failed to schedule agent ${agent.name}:`, error);
    }
  }

  async unscheduleAgent(agentId: string): Promise<void> {
    if (this.scheduledTasks.has(agentId)) {
      this.scheduledTasks.get(agentId)?.stop();
      this.scheduledTasks.delete(agentId);
      console.log(`[AgentScheduler] Unscheduled agent: ${agentId}`);
    }
  }

  async rescheduleAllAgents(): Promise<void> {
    console.log('[AgentScheduler] Rescheduling all active agents...');
    
    // Clear existing schedules
    for (const [agentId, task] of this.scheduledTasks) {
      task.stop();
      this.scheduledTasks.delete(agentId);
    }

    // Get all active agents and reschedule them
    const activeAgents = await this.agentService.getActiveAgents();
    
    for (const agent of activeAgents) {
      await this.scheduleAgent(agent);
    }

    console.log(`[AgentScheduler] Rescheduled ${activeAgents.length} active agents`);
  }

  getScheduledAgentsCount(): number {
    return this.scheduledTasks.size;
  }

  isAgentScheduled(agentId: string): boolean {
    return this.scheduledTasks.has(agentId);
  }

  getSchedulerStatus(): {
    isRunning: boolean;
    scheduledAgentsCount: number;
    nextCheckIn?: number;
  } {
    return {
      isRunning: this.isRunning,
      scheduledAgentsCount: this.scheduledTasks.size,
      nextCheckIn: this.checkInterval ? 5 * 60 * 1000 : undefined, // 5 minutes in ms
    };
  }

  // Manual trigger for immediate execution
  async runAgentNow(agentId: string): Promise<void> {
    const agent = await this.agentService.getAgentById(agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    await this.runAgentSafely(agent);
  }

  // Get all agents that are overdue for execution
  async getOverdueAgents(): Promise<IAgent[]> {
    const now = new Date();
    const agentsReadyToRun = await this.agentService.getAgentsReadyToRun();
    
    return agentsReadyToRun.filter(agent => {
      if (!agent.nextRun) return true; // Never run before
      return agent.nextRun <= now;
    });
  }
}