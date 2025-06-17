"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentService = void 0;
const Agent_1 = __importDefault(require("../models/Agent"));
const AgentRun_1 = __importDefault(require("../models/AgentRun"));
class AgentService {
    constructor() {
        this.executors = new Map();
        // Executors will be registered when specific agent implementations are loaded
    }
    registerExecutor(agentType, executor) {
        this.executors.set(agentType, executor);
        console.log(`[AgentService] Registered executor for agent type: ${agentType}`);
    }
    async createAgent(userId, agentData) {
        const agent = new Agent_1.default({
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
    async updateAgent(agentId, updates) {
        const agent = await Agent_1.default.findByIdAndUpdate(agentId, updates, { new: true });
        if (agent) {
            console.log(`[AgentService] Updated agent: ${agent.name}`);
        }
        return agent;
    }
    async deleteAgent(agentId) {
        const result = await Agent_1.default.findByIdAndDelete(agentId);
        if (result) {
            console.log(`[AgentService] Deleted agent: ${result.name}`);
            return true;
        }
        return false;
    }
    getAvailableExecutors() {
        return Array.from(this.executors.keys());
    }
    async getAgentsByUser(userId) {
        return Agent_1.default.find({ userId }).sort({ createdAt: -1 });
    }
    async getAgentById(agentId) {
        return Agent_1.default.findById(agentId);
    }
    async getActiveAgents() {
        return Agent_1.default.find({ isActive: true, status: { $ne: 'error' } });
    }
    async getAgentsReadyToRun() {
        const now = new Date();
        return Agent_1.default.find({
            isActive: true,
            status: 'idle',
            $or: [
                { nextRun: { $lte: now } },
                { nextRun: { $exists: false } },
            ],
        });
    }
    async executeAgent(agentId) {
        console.log(`[AgentService] Starting execution for agent ID: ${agentId}`);
        const agent = await Agent_1.default.findById(agentId);
        if (!agent) {
            console.error(`[AgentService] Agent not found: ${agentId}`);
            const error = new Error(`Agent with ID ${agentId} not found`);
            error.agentExists = false;
            throw error;
        }
        console.log(`[AgentService] Found agent: ${agent.name} (type: ${agent.type}, active: ${agent.isActive}, status: ${agent.status})`);
        if (!agent.isActive) {
            console.error(`[AgentService] Agent is not active: ${agent.name}`);
            const error = new Error(`Agent ${agent.name} is not active`);
            error.agentExists = true;
            error.agentActive = false;
            error.agentStatus = agent.status;
            throw error;
        }
        if (agent.status === 'running') {
            console.error(`[AgentService] Agent already running: ${agent.name}`);
            const error = new Error(`Agent ${agent.name} is already running`);
            error.agentExists = true;
            error.agentActive = agent.isActive;
            error.agentStatus = agent.status;
            throw error;
        }
        const executor = this.executors.get(agent.type);
        if (!executor) {
            console.error(`[AgentService] No executor found for agent type: ${agent.type}`);
            console.error(`[AgentService] Available executors:`, Array.from(this.executors.keys()));
            const error = new Error(`No executor registered for agent type: ${agent.type}`);
            error.agentExists = true;
            error.agentActive = agent.isActive;
            error.agentStatus = agent.status;
            error.availableExecutors = Array.from(this.executors.keys());
            throw error;
        }
        console.log(`[AgentService] Found executor for agent type: ${agent.type}`);
        // Create agent run record
        const agentRun = new AgentRun_1.default({
            agentId: agent._id,
            userId: agent.userId,
            status: 'running',
            startTime: new Date(),
            itemsProcessed: 0,
            itemsAdded: 0,
            errorMessages: [],
            logs: [],
            results: { summary: '' },
        });
        await agentRun.save();
        console.log(`[AgentService] Created agent run record: ${agentRun._id}`);
        // Update agent status
        agent.status = 'running';
        agent.lastRun = new Date();
        await agent.save();
        console.log(`[AgentService] Updated agent status to running`);
        // Emit real-time update
        this.emitAgentUpdate(agent.userId.toString(), {
            agentId: agent._id.toString(),
            runId: agentRun._id.toString(),
            status: 'running',
            message: `Starting execution of agent: ${agent.name}`,
            timestamp: new Date()
        });
        try {
            const context = {
                agent,
                run: agentRun,
                userId: agent.userId,
            };
            await agentRun.addLog('info', `Starting execution of agent: ${agent.name}`, {
                agentType: agent.type,
                configuration: agent.configuration
            });
            console.log(`[AgentService] Starting agent execution with context`);
            // Execute the agent
            await executor.execute(context);
            console.log(`[AgentService] Agent execution completed successfully`);
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
            console.log(`[AgentService] Agent ${agent.name} completed successfully - processed: ${agentRun.itemsProcessed}, added: ${agentRun.itemsAdded}`);
            // Emit completion update
            this.emitAgentUpdate(agent.userId.toString(), {
                agentId: agent._id.toString(),
                runId: agentRun._id.toString(),
                status: 'completed',
                message: `Agent completed successfully - processed: ${agentRun.itemsProcessed}, added: ${agentRun.itemsAdded}`,
                timestamp: new Date(),
                stats: {
                    itemsProcessed: agentRun.itemsProcessed,
                    itemsAdded: agentRun.itemsAdded,
                    duration: agentRun.duration
                }
            });
        }
        catch (error) {
            console.error(`[AgentService] Agent ${agent.name} failed:`, {
                error: error.message,
                stack: error.stack,
                agentType: agent.type
            });
            // Update statistics
            agent.statistics.totalRuns += 1;
            agent.statistics.failedRuns += 1;
            agent.status = 'error';
            agent.errorMessage = error.message;
            await agent.save();
            await agentRun.fail(error.message);
            // Emit failure update
            this.emitAgentUpdate(agent.userId.toString(), {
                agentId: agent._id.toString(),
                runId: agentRun._id.toString(),
                status: 'failed',
                message: `Agent execution failed: ${error.message}`,
                timestamp: new Date(),
                error: error.message
            });
            throw error;
        }
        return agentRun;
    }
    emitAgentUpdate(userId, update) {
        try {
            // Get io instance from global if available
            if (global.io) {
                global.io.to(`user_${userId}`).emit('agent_update', update);
                console.log(`[AgentService] Emitted real-time update for user ${userId}:`, update.message);
            }
            else {
                console.warn(`[AgentService] Socket.IO instance not available for real-time updates`);
            }
        }
        catch (error) {
            console.warn(`[AgentService] Failed to emit real-time update:`, error);
        }
    }
    async getAgentRuns(agentId, limit = 50) {
        return AgentRun_1.default.find({ agentId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('agentId', 'name type');
    }
    async getUserAgentRuns(userId, limit = 50) {
        return AgentRun_1.default.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('agentId', 'name type');
    }
    calculateNextRun(cronExpression) {
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
        }
        catch (error) {
            console.warn(`[AgentService] Failed to parse cron expression: ${cronExpression}, using default interval`);
        }
        return new Date(now.getTime() + defaultInterval);
    }
    async pauseAgent(agentId) {
        return this.updateAgent(agentId, { status: 'paused', isActive: false });
    }
    async resumeAgent(agentId) {
        return this.updateAgent(agentId, { status: 'idle', isActive: true });
    }
    async getAgentStatistics(agentId) {
        const agent = await Agent_1.default.findById(agentId);
        if (!agent) {
            return null;
        }
        const recentRuns = await AgentRun_1.default.find({ agentId })
            .sort({ createdAt: -1 })
            .limit(10);
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentActivity = await AgentRun_1.default.countDocuments({
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
exports.AgentService = AgentService;
