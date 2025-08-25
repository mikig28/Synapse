"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentScheduler = void 0;
const cron = __importStar(require("node-cron"));
class AgentScheduler {
    constructor(agentService) {
        this.scheduledTasks = new Map();
        this.isRunning = false;
        this.checkInterval = null;
        this.agentService = agentService;
    }
    async start() {
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
    async stop() {
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
    async checkAndRunAgents() {
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
        }
        catch (error) {
            console.error('[AgentScheduler] Error during agent check:', error);
        }
    }
    async runAgentSafely(agent) {
        try {
            console.log(`[AgentScheduler] Executing agent: ${agent.name} (${agent.type})`);
            await this.agentService.executeAgent(agent._id.toString());
            console.log(`[AgentScheduler] Agent ${agent.name} completed successfully`);
        }
        catch (error) {
            console.error(`[AgentScheduler] Agent ${agent.name} failed:`, error.message);
        }
    }
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    async scheduleAgent(agent) {
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
        }
        catch (error) {
            console.error(`[AgentScheduler] Failed to schedule agent ${agent.name}:`, error);
        }
    }
    async unscheduleAgent(agentId) {
        if (this.scheduledTasks.has(agentId)) {
            this.scheduledTasks.get(agentId)?.stop();
            this.scheduledTasks.delete(agentId);
            console.log(`[AgentScheduler] Unscheduled agent: ${agentId}`);
        }
    }
    async rescheduleAllAgents() {
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
    getScheduledAgentsCount() {
        return this.scheduledTasks.size;
    }
    isAgentScheduled(agentId) {
        return this.scheduledTasks.has(agentId);
    }
    getSchedulerStatus() {
        return {
            isRunning: this.isRunning,
            scheduledAgentsCount: this.scheduledTasks.size,
            nextCheckIn: this.checkInterval ? 5 * 60 * 1000 : undefined, // 5 minutes in ms
        };
    }
    // Manual trigger for immediate execution
    async runAgentNow(agentId) {
        const agent = await this.agentService.getAgentById(agentId);
        if (!agent) {
            throw new Error(`Agent with ID ${agentId} not found`);
        }
        await this.runAgentSafely(agent);
    }
    // Get all agents that are overdue for execution
    async getOverdueAgents() {
        const now = new Date();
        const agentsReadyToRun = await this.agentService.getAgentsReadyToRun();
        return agentsReadyToRun.filter(agent => {
            if (!agent.nextRun)
                return true; // Never run before
            return agent.nextRun <= now;
        });
    }
}
exports.AgentScheduler = AgentScheduler;
