import cron from 'node-cron';
import ScheduledAgent, { IScheduledAgent } from '../models/ScheduledAgent';
import { AgentService } from './agentService';
import Agent from '../models/Agent';
import AgentRun from '../models/AgentRun';
import mongoose from 'mongoose';

interface SchedulerInstance {
  task: cron.ScheduledTask;
  agentId: string;
}

class SchedulerService {
  private scheduledTasks: Map<string, SchedulerInstance> = new Map();
  private intervalChecks: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;
  private agentService: AgentService;

  constructor() {
    this.agentService = new AgentService();
    // Main scheduler that checks for due executions every minute
    this.startMainScheduler();
  }

  /**
   * Start the main scheduler that checks for due scheduled agents
   */
  private startMainScheduler(): void {
    if (this.isRunning) return;

    // Check every minute for scheduled agents that need to run
    cron.schedule('* * * * *', async () => {
      await this.checkAndExecuteDueAgents();
    });

    this.isRunning = true;
    console.log('📅 Scheduler service started - checking for scheduled agents every minute');
  }

  /**
   * Check for scheduled agents that are due for execution
   */
  private async checkAndExecuteDueAgents(): Promise<void> {
    try {
      const now = new Date();
      
      // Find all active scheduled agents that are due for execution
      const dueAgents = await ScheduledAgent.find({
        isActive: true,
        nextExecution: { $lte: now }
      });

      if (dueAgents.length > 0) {
        console.log(`🔄 Found ${dueAgents.length} scheduled agents due for execution`);
        
        // Execute each due agent
        const executions = dueAgents.map(agent => this.executeScheduledAgent(agent));
        await Promise.allSettled(executions);
      }

    } catch (error) {
      console.error('❌ Error checking for due scheduled agents:', error);
    }
  }

  /**
   * Execute a scheduled agent
   */
  public async executeScheduledAgent(scheduledAgent: IScheduledAgent): Promise<any> {
    const startTime = Date.now();
    let executionResult: any = null;

    try {
      console.log(`🚀 Executing scheduled agent: ${scheduledAgent.name} (${scheduledAgent._id})`);

      // Create or find the corresponding agent for execution
      let agent = await Agent.findOne({
        userId: scheduledAgent.userId,
        name: `Scheduled: ${scheduledAgent.name}`,
        type: scheduledAgent.agentConfig.type
      });

      if (!agent) {
        // Create a temporary agent for this execution
        agent = new Agent({
          userId: scheduledAgent.userId,
          name: `Scheduled: ${scheduledAgent.name}`,
          description: `Auto-generated agent for scheduled execution: ${scheduledAgent.description || scheduledAgent.name}`,
          type: scheduledAgent.agentConfig.type,
          config: {
            topics: scheduledAgent.agentConfig.topics,
            crewaiSources: scheduledAgent.agentConfig.sources,
            maxItemsPerRun: scheduledAgent.agentConfig.parameters?.maxItemsPerRun || 10
          },
          isActive: true
        });
        await agent.save();
      }

      // Execute the agent using the existing agent service
      const run = await this.agentService.executeAgent((agent._id as mongoose.Types.ObjectId).toString());
      
      if (!run) {
        throw new Error('Failed to create agent run');
      }

      // Wait for the execution to complete (with timeout)
      const completedRun = await this.waitForRunCompletion(run._id as mongoose.Types.ObjectId, 300000); // 5 minutes timeout
      
      const duration = Date.now() - startTime;
      
      if (completedRun.status === 'completed') {
        executionResult = {
          status: 'success' as const,
          message: 'Scheduled agent executed successfully',
          reportId: completedRun._id,
          duration
        };
        
        console.log(`✅ Scheduled agent ${scheduledAgent.name} executed successfully in ${duration}ms`);
      } else {
        throw new Error(`Agent execution failed with status: ${completedRun.status}`);
      }

    } catch (error: any) {
      const duration = Date.now() - startTime;
      executionResult = {
        status: 'error' as const,
        message: error.message || 'Unknown error occurred during execution',
        duration
      };
      
      console.error(`❌ Scheduled agent ${scheduledAgent.name} execution failed:`, error.message);
    }

    // Update the scheduled agent with the execution result
    try {
      await scheduledAgent.markExecution(executionResult);
    } catch (error) {
      console.error('❌ Failed to update scheduled agent execution result:', error);
    }

    return executionResult;
  }

  /**
   * Execute a scheduled agent by ID (for manual execution)
   */
  public async executeScheduledAgentById(scheduledAgentId: mongoose.Types.ObjectId): Promise<any> {
    const scheduledAgent = await ScheduledAgent.findById(scheduledAgentId);
    
    if (!scheduledAgent) {
      throw new Error('Scheduled agent not found');
    }

    if (!scheduledAgent.isActive) {
      throw new Error('Scheduled agent is not active');
    }

    return this.executeScheduledAgent(scheduledAgent);
  }

  /**
   * Wait for an agent run to complete
   */
  private async waitForRunCompletion(runId: mongoose.Types.ObjectId, timeoutMs: number = 300000): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const run = await AgentRun.findById(runId);
      
      if (!run) {
        throw new Error('Agent run not found');
      }

      if (run.status === 'completed' || run.status === 'failed') {
        return run;
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Agent execution timed out');
  }

  /**
   * Register a scheduled agent (called when agent is created/updated)
   */
  public async registerScheduledAgent(scheduledAgent: IScheduledAgent): Promise<void> {
    try {
      // Remove existing schedule if any
      this.unregisterScheduledAgent(scheduledAgent._id.toString());

      if (!scheduledAgent.isActive) {
        return;
      }

      const agentId = scheduledAgent._id.toString();

      if (scheduledAgent.schedule.type === 'cron' && scheduledAgent.schedule.cronExpression) {
        // Validate and create cron task
        if (cron.validate(scheduledAgent.schedule.cronExpression)) {
          const task = cron.schedule(
            scheduledAgent.schedule.cronExpression,
            async () => {
              await this.executeScheduledAgent(scheduledAgent);
            },
            {
              scheduled: true,
              timezone: scheduledAgent.schedule.timezone || 'UTC'
            }
          );

          this.scheduledTasks.set(agentId, { task, agentId });
          console.log(`📅 Registered cron scheduled agent: ${scheduledAgent.name} with expression: ${scheduledAgent.schedule.cronExpression}`);
        } else {
          console.error(`❌ Invalid cron expression for agent ${scheduledAgent.name}: ${scheduledAgent.schedule.cronExpression}`);
        }
      } else if (scheduledAgent.schedule.type === 'interval' && scheduledAgent.schedule.intervalMinutes) {
        // Create interval-based execution
        const intervalMs = scheduledAgent.schedule.intervalMinutes * 60 * 1000;
        
        const intervalId = setInterval(async () => {
          await this.executeScheduledAgent(scheduledAgent);
        }, intervalMs);

        this.intervalChecks.set(agentId, intervalId);
        console.log(`⏰ Registered interval scheduled agent: ${scheduledAgent.name} with interval: ${scheduledAgent.schedule.intervalMinutes} minutes`);
      }

    } catch (error) {
      console.error(`❌ Failed to register scheduled agent ${scheduledAgent.name}:`, error);
    }
  }

  /**
   * Unregister a scheduled agent
   */
  public unregisterScheduledAgent(agentId: string): void {
    // Remove cron task
    const cronTask = this.scheduledTasks.get(agentId);
    if (cronTask) {
      cronTask.task.stop();
      this.scheduledTasks.delete(agentId);
      console.log(`🗑️ Unregistered cron scheduled agent: ${agentId}`);
    }

    // Remove interval
    const intervalId = this.intervalChecks.get(agentId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervalChecks.delete(agentId);
      console.log(`🗑️ Unregistered interval scheduled agent: ${agentId}`);
    }
  }

  /**
   * Initialize scheduler with existing scheduled agents
   */
  public async initializeExistingSchedules(): Promise<void> {
    try {
      const activeScheduledAgents = await ScheduledAgent.find({ isActive: true });
      
      console.log(`🔄 Initializing ${activeScheduledAgents.length} existing scheduled agents`);
      
      for (const agent of activeScheduledAgents) {
        await this.registerScheduledAgent(agent);
      }

      console.log('✅ Scheduler initialization completed');
    } catch (error) {
      console.error('❌ Failed to initialize existing schedules:', error);
    }
  }

  /**
   * Get scheduler status
   */
  public getStatus(): { isRunning: boolean; scheduledTasksCount: number; intervalTasksCount: number } {
    return {
      isRunning: this.isRunning,
      scheduledTasksCount: this.scheduledTasks.size,
      intervalTasksCount: this.intervalChecks.size
    };
  }

  /**
   * Stop all scheduled tasks
   */
  public stopAllTasks(): void {
    // Stop all cron tasks
    for (const [agentId, instance] of this.scheduledTasks) {
      instance.task.stop();
    }
    this.scheduledTasks.clear();

    // Clear all intervals
    for (const [agentId, intervalId] of this.intervalChecks) {
      clearInterval(intervalId);
    }
    this.intervalChecks.clear();

    console.log('🛑 All scheduled tasks stopped');
  }
}

// Create singleton instance
export const schedulerService = new SchedulerService();

// Helper function for controller
export const executeScheduledAgentById = (scheduledAgentId: mongoose.Types.ObjectId) => {
  return schedulerService.executeScheduledAgentById(scheduledAgentId);
};

// Initialize on module load
schedulerService.initializeExistingSchedules();