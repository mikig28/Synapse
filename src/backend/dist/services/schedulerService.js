"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = exports.executeScheduledAgentById = exports.schedulerService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const ScheduledAgent_1 = __importDefault(require("../models/ScheduledAgent"));
const Agent_1 = __importDefault(require("../models/Agent"));
const AgentRun_1 = __importDefault(require("../models/AgentRun"));
class SchedulerService {
    constructor(agentService) {
        this.scheduledTasks = new Map();
        this.intervalChecks = new Map();
        this.isRunning = false;
        this.agentService = null;
        if (agentService) {
            this.agentService = agentService;
        }
        // Main scheduler that checks for due executions every minute
        this.startMainScheduler();
    }
    /**
     * Set the agent service instance (used when not provided in constructor)
     */
    setAgentService(agentService) {
        this.agentService = agentService;
        console.log('📅 SchedulerService: AgentService instance set');
    }
    /**
     * Start the main scheduler that checks for due scheduled agents
     */
    startMainScheduler() {
        if (this.isRunning)
            return;
        // Check every minute for scheduled agents that need to run
        node_cron_1.default.schedule('* * * * *', async () => {
            await this.checkAndExecuteDueAgents();
        });
        this.isRunning = true;
        console.log('📅 Scheduler service started - checking for scheduled agents every minute');
    }
    /**
     * Check for scheduled agents that are due for execution
     */
    async checkAndExecuteDueAgents() {
        try {
            const now = new Date();
            // Find all active scheduled agents that are due for execution
            const dueAgents = await ScheduledAgent_1.default.find({
                isActive: true,
                nextExecution: { $lte: now }
            });
            if (dueAgents.length > 0) {
                console.log(`🔄 Found ${dueAgents.length} scheduled agents due for execution`);
                // Execute each due agent
                const executions = dueAgents.map(agent => this.executeScheduledAgent(agent));
                await Promise.allSettled(executions);
            }
        }
        catch (error) {
            console.error('❌ Error checking for due scheduled agents:', error);
        }
    }
    /**
     * Execute a scheduled agent
     */
    async executeScheduledAgent(scheduledAgent) {
        const startTime = Date.now();
        let executionResult = null;
        try {
            if (!this.agentService) {
                throw new Error('AgentService not initialized. Cannot execute scheduled agent.');
            }
            console.log(`🚀 Executing scheduled agent: ${scheduledAgent.name} (${scheduledAgent._id})`);
            // Map scheduled agent type to Agent model type
            const getAgentType = (scheduledType) => {
                switch (scheduledType) {
                    case 'crewai':
                        return 'crewai_news';
                    case 'custom':
                        return 'custom';
                    default:
                        console.warn(`[SchedulerService] Unknown scheduled agent type: ${scheduledType}, defaulting to crewai_news`);
                        return 'crewai_news';
                }
            };
            const agentType = getAgentType(scheduledAgent.agentConfig.type);
            // Create or find the corresponding agent for execution
            let agent = await Agent_1.default.findOne({
                userId: scheduledAgent.userId,
                name: `Scheduled: ${scheduledAgent.name}`,
                type: agentType
            });
            if (!agent) {
                // Create a temporary agent for this execution
                agent = new Agent_1.default({
                    userId: scheduledAgent.userId,
                    name: `Scheduled: ${scheduledAgent.name}`,
                    description: `Auto-generated agent for scheduled execution: ${scheduledAgent.description || scheduledAgent.name}`,
                    type: agentType,
                    configuration: {
                        topics: scheduledAgent.agentConfig.topics,
                        crewaiSources: scheduledAgent.agentConfig.sources || {
                            reddit: true,
                            linkedin: true,
                            telegram: true,
                            news_websites: true
                        },
                        maxItemsPerRun: scheduledAgent.agentConfig.parameters?.maxItemsPerRun || 10
                    },
                    isActive: true
                });
                await agent.save();
            }
            // Execute the agent using the existing agent service
            const run = await this.agentService.executeAgent(agent._id.toString());
            if (!run) {
                throw new Error('Failed to create agent run');
            }
            // Wait for the execution to complete (with timeout)
            const completedRun = await this.waitForRunCompletion(run._id, 300000); // 5 minutes timeout
            const duration = Date.now() - startTime;
            if (completedRun.status === 'completed') {
                executionResult = {
                    status: 'success',
                    message: 'Scheduled agent executed successfully',
                    reportId: completedRun._id,
                    duration
                };
                console.log(`✅ Scheduled agent ${scheduledAgent.name} executed successfully in ${duration}ms`);
            }
            else {
                throw new Error(`Agent execution failed with status: ${completedRun.status}`);
            }
        }
        catch (error) {
            const duration = Date.now() - startTime;
            executionResult = {
                status: 'error',
                message: error.message || 'Unknown error occurred during execution',
                duration
            };
            console.error(`❌ Scheduled agent ${scheduledAgent.name} execution failed:`, error.message);
        }
        // Update the scheduled agent with the execution result
        try {
            await scheduledAgent.markExecution(executionResult);
        }
        catch (error) {
            console.error('❌ Failed to update scheduled agent execution result:', error);
        }
        return executionResult;
    }
    /**
     * Execute a scheduled agent by ID (for manual execution)
     */
    async executeScheduledAgentById(scheduledAgentId) {
        const scheduledAgent = await ScheduledAgent_1.default.findById(scheduledAgentId);
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
    async waitForRunCompletion(runId, timeoutMs = 300000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            const run = await AgentRun_1.default.findById(runId);
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
    async registerScheduledAgent(scheduledAgent) {
        try {
            // Remove existing schedule if any
            this.unregisterScheduledAgent(scheduledAgent._id.toString());
            if (!scheduledAgent.isActive) {
                return;
            }
            const agentId = scheduledAgent._id.toString();
            if (scheduledAgent.schedule.type === 'cron' && scheduledAgent.schedule.cronExpression) {
                // Validate and create cron task
                if (node_cron_1.default.validate(scheduledAgent.schedule.cronExpression)) {
                    const task = node_cron_1.default.schedule(scheduledAgent.schedule.cronExpression, async () => {
                        await this.executeScheduledAgent(scheduledAgent);
                    }, {
                        scheduled: true,
                        timezone: scheduledAgent.schedule.timezone || 'UTC'
                    });
                    this.scheduledTasks.set(agentId, { task, agentId });
                    console.log(`📅 Registered cron scheduled agent: ${scheduledAgent.name} with expression: ${scheduledAgent.schedule.cronExpression}`);
                }
                else {
                    console.error(`❌ Invalid cron expression for agent ${scheduledAgent.name}: ${scheduledAgent.schedule.cronExpression}`);
                }
            }
            else if (scheduledAgent.schedule.type === 'interval' && scheduledAgent.schedule.intervalMinutes) {
                // Create interval-based execution
                const intervalMs = scheduledAgent.schedule.intervalMinutes * 60 * 1000;
                const intervalId = setInterval(async () => {
                    await this.executeScheduledAgent(scheduledAgent);
                }, intervalMs);
                this.intervalChecks.set(agentId, intervalId);
                console.log(`⏰ Registered interval scheduled agent: ${scheduledAgent.name} with interval: ${scheduledAgent.schedule.intervalMinutes} minutes`);
            }
        }
        catch (error) {
            console.error(`❌ Failed to register scheduled agent ${scheduledAgent.name}:`, error);
        }
    }
    /**
     * Unregister a scheduled agent
     */
    unregisterScheduledAgent(agentId) {
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
    async initializeExistingSchedules() {
        try {
            const activeScheduledAgents = await ScheduledAgent_1.default.find({ isActive: true });
            console.log(`🔄 Initializing ${activeScheduledAgents.length} existing scheduled agents`);
            for (const agent of activeScheduledAgents) {
                await this.registerScheduledAgent(agent);
            }
            console.log('✅ Scheduler initialization completed');
        }
        catch (error) {
            console.error('❌ Failed to initialize existing schedules:', error);
        }
    }
    /**
     * Get scheduler status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            scheduledTasksCount: this.scheduledTasks.size,
            intervalTasksCount: this.intervalChecks.size
        };
    }
    /**
     * Stop all scheduled tasks
     */
    stopAllTasks() {
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
exports.SchedulerService = SchedulerService;
// Create singleton instance (will be initialized with AgentService later)
exports.schedulerService = new SchedulerService();
// Helper function for controller
const executeScheduledAgentById = (scheduledAgentId) => {
    return exports.schedulerService.executeScheduledAgentById(scheduledAgentId);
};
exports.executeScheduledAgentById = executeScheduledAgentById;
