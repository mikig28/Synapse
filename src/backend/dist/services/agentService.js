"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentService = void 0;
const Agent_1 = __importDefault(require("../models/Agent"));
const AgentRun_1 = __importDefault(require("../models/AgentRun"));
const telegramService_1 = require("./telegramService");
const aguiEmitter_1 = require("./aguiEmitter");
const aguiMapper_1 = require("./aguiMapper");
class AgentService {
    constructor() {
        this.executors = new Map();
        // Executors will be registered when specific agent implementations are loaded
    }
    registerExecutor(agentType, executor) {
        this.executors.set(agentType, executor);
        console.log(`[AgentService] Registered executor for agent type: ${agentType}`);
    }
    getAvailableExecutors() {
        return Array.from(this.executors.keys());
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
            console.warn(`[AgentService] Agent ${agent.name} is not active, checking if it should be auto-activated...`);
            // For known agent types, we can auto-activate for manual execution
            if (agent.type === 'crewai_news' || agent.type === 'twitter' || agent.type === 'news' || agent.type === 'custom') {
                console.log(`[AgentService] Auto-activating agent ${agent.name} for execution`);
                agent.isActive = true;
                await agent.save();
            }
            else {
                console.error(`[AgentService] Agent is not active and cannot be auto-activated: ${agent.name}`);
                const error = new Error(`Agent ${agent.name} is not active. Please activate the agent before executing.`);
                error.agentExists = true;
                error.agentActive = false;
                error.agentStatus = agent.status;
                throw error;
            }
        }
        // Check for stuck agents (running for more than 5 minutes - reduced from 10)
        const stuckThreshold = 5 * 60 * 1000; // 5 minutes
        const isStuck = agent.status === 'running' &&
            agent.lastRun &&
            (Date.now() - agent.lastRun.getTime()) > stuckThreshold;
        if (agent.status === 'running' && !isStuck) {
            console.warn(`[AgentService] Agent ${agent.name} appears to be running, checking if truly active...`);
            // Double-check by looking for recent agent runs
            const recentRun = await AgentRun_1.default.findOne({
                agentId: agent._id,
                status: 'running',
                createdAt: { $gte: new Date(Date.now() - stuckThreshold) }
            });
            if (recentRun) {
                console.error(`[AgentService] Agent ${agent.name} is actively running (run ID: ${recentRun._id})`);
                const error = new Error(`Agent ${agent.name} is already running`);
                error.agentExists = true;
                error.agentActive = agent.isActive;
                error.agentStatus = agent.status;
                error.currentRunId = recentRun._id;
                throw error;
            }
            else {
                console.warn(`[AgentService] No active run found for ${agent.name}, resetting stuck status`);
                await this.resetAgentStatus(agentId);
                // Refetch the agent after reset
                const resetAgent = await Agent_1.default.findById(agentId);
                if (resetAgent) {
                    Object.assign(agent, resetAgent);
                }
            }
        }
        else if (isStuck) {
            console.warn(`[AgentService] Agent ${agent.name} appears stuck (last run: ${agent.lastRun}), resetting status before execution`);
            await this.resetAgentStatus(agentId);
            // Refetch the agent after reset
            const resetAgent = await Agent_1.default.findById(agentId);
            if (resetAgent) {
                Object.assign(agent, resetAgent);
            }
        }
        // Check CrewAI service health for CrewAI agents before execution
        if (agent.type === 'crewai_news') {
            console.log(`[AgentService] Checking CrewAI service health before executing agent: ${agent.name}`);
            const healthCheck = await this.checkCrewAIServiceHealth();
            if (!healthCheck.isHealthy) {
                console.error(`[AgentService] CrewAI service is not healthy: ${healthCheck.message}`);
                const error = new Error(`Cannot execute CrewAI agent: ${healthCheck.message}`);
                error.agentExists = true;
                error.agentActive = agent.isActive;
                error.agentStatus = agent.status;
                error.serviceHealthy = false;
                error.serviceStatus = healthCheck.status;
                error.serviceUrl = healthCheck.serviceUrl;
                error.serviceError = healthCheck.error;
                throw error;
            }
            else {
                console.log(`[AgentService] ✅ CrewAI service is healthy (${healthCheck.responseTime}ms) - proceeding with execution`);
            }
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
            // Send report to Telegram if enabled
            try {
                const reportTitle = `${agent.name} Execution Complete`;
                // Generate detailed content summary from logs
                const detailedContent = await this.generateDetailedReportContent(agentRun);
                // Generate link to full report via frontend
                const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:4173';
                const reportUrl = `${frontendUrl}/news?runId=${agentRun._id}`;
                const reportContent = `📊 **Execution Summary**
🔄 Items Processed: ${agentRun.itemsProcessed}
✅ New Items Added: ${agentRun.itemsAdded}
⏱️ Duration: ${agentRun.duration ? Math.round(agentRun.duration / 1000) : 0}s
🎯 Status: Completed Successfully

${detailedContent}

🔗 **View Full Report**: ${reportUrl}`;
                await (0, telegramService_1.sendAgentReportToTelegram)(agent.userId.toString(), reportTitle, reportContent);
            }
            catch (telegramError) {
                console.error(`[AgentService] Failed to send Telegram report:`, telegramError);
                // Don't fail the agent execution if Telegram fails
            }
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
            // Set appropriate status based on error type
            if (error.message.includes('service is unavailable') || error.code === 'ECONNREFUSED') {
                agent.status = 'idle'; // Don't leave agent stuck if service is down
                agent.errorMessage = 'Service temporarily unavailable';
            }
            else {
                agent.status = 'error';
                agent.errorMessage = error.message;
            }
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
            // **FIX 17: Enhanced real-time update broadcasting**
            if (global.io) {
                // Emit to user's room
                global.io.to(`user_${userId}`).emit('agent_update', update);
                // Also emit to agent-specific room if available
                if (update.agentId) {
                    global.io.to(`agent_${update.agentId}`).emit('agent_progress', update);
                }
                console.log(`[AgentService] 📡 Broadcasted real-time update for user ${userId}:`, update.message || update.type || 'progress_update');
            }
            else {
                console.warn(`[AgentService] ⚠️ Socket.IO instance not available for real-time updates`);
            }
            // **NEW: Emit AG-UI events**
            this.emitAGUIEvents(userId, update);
        }
        catch (error) {
            console.warn(`[AgentService] ❌ Failed to emit real-time update:`, error);
        }
    }
    async emitAGUIEvents(userId, update) {
        try {
            if (!update.agentId) {
                console.warn('[AgentService] No agentId in update, skipping AG-UI events');
                return;
            }
            // Get agent details for enriched events
            const agent = await Agent_1.default.findById(update.agentId);
            if (!agent) {
                console.warn(`[AgentService] Agent ${update.agentId} not found for AG-UI events`);
                return;
            }
            const agentUpdateData = {
                agentId: update.agentId,
                runId: update.runId,
                status: update.status || 'unknown',
                message: update.message || '',
                timestamp: update.timestamp || new Date(),
                stats: update.stats,
                error: update.error,
                progress: update.progress
            };
            // Map agent update to AG-UI events
            const aguiEvents = (0, aguiMapper_1.mapAgentStatusToAGUIEvents)(userId, update.agentId, agent.name, agent.type, agentUpdateData);
            // Emit each AG-UI event
            for (const event of aguiEvents) {
                aguiEmitter_1.agui.emitToUser(userId, event);
            }
            console.log(`[AgentService] 🔄 Emitted ${aguiEvents.length} AG-UI events for ${agent.name}`);
        }
        catch (error) {
            console.error('[AgentService] Error emitting AG-UI events:', error);
        }
    }
    // **FIX 18: Add progress broadcasting method**
    broadcastProgress(agentId, progressData) {
        try {
            // Find the agent to get user ID
            Agent_1.default.findById(agentId).then(async (agent) => {
                if (agent && agent.userId) {
                    // Legacy Socket.IO broadcast
                    this.emitAgentUpdate(agent.userId.toString(), {
                        agentId,
                        type: 'crew_progress',
                        progress: progressData,
                        timestamp: new Date(),
                        message: `Progress update: ${progressData.steps?.length || 0} steps`
                    });
                    // **NEW: AG-UI CrewAI progress events**
                    await this.emitCrewProgressAGUIEvents(agent.userId.toString(), agentId, agent.name, progressData);
                }
            }).catch(error => {
                console.warn(`[AgentService] Failed to broadcast progress: ${error}`);
            });
        }
        catch (error) {
            console.warn(`[AgentService] Error in broadcastProgress:`, error);
        }
    }
    async emitCrewProgressAGUIEvents(userId, agentId, agentName, progressData) {
        try {
            const crewProgressData = {
                steps: progressData.steps || [],
                hasActiveProgress: progressData.hasActiveProgress || false,
                results: progressData.results,
                session_id: progressData.session_id,
                agent_id: agentId
            };
            // Map CrewAI progress to AG-UI events
            const aguiEvents = (0, aguiMapper_1.mapCrewProgressToAGUIEvents)(userId, agentId, agentName, crewProgressData);
            // Emit each AG-UI event
            for (const event of aguiEvents) {
                aguiEmitter_1.agui.emitToUser(userId, event);
            }
            console.log(`[AgentService] 🔄 Emitted ${aguiEvents.length} AG-UI progress events for ${agentName}`);
        }
        catch (error) {
            console.error('[AgentService] Error emitting CrewAI AG-UI events:', error);
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
    async generateDetailedReportContent(agentRun) {
        try {
            // Extract articles from logs that were successfully saved
            const savedArticleLogs = agentRun.logs.filter(log => log.level === 'info' &&
                log.message === 'Saved news article' &&
                log.data?.title &&
                log.data?.source);
            // Get source breakdown from logs
            const completionLog = agentRun.logs.find(log => log.message === 'CrewAI execution completed' &&
                log.data?.sourceBreakdown);
            let reportContent = '';
            // Add source breakdown if available
            if (completionLog?.data?.sourceBreakdown) {
                reportContent += '📈 **Source Breakdown**\n';
                Object.entries(completionLog.data.sourceBreakdown).forEach(([source, count]) => {
                    const sourceEmoji = this.getSourceEmoji(source);
                    reportContent += `${sourceEmoji} ${source}: ${count} articles\n`;
                });
                reportContent += '\n';
            }
            // Add brief articles summary
            if (savedArticleLogs.length > 0) {
                reportContent += '📰 **Recent Articles Added**\n';
                // Show only first 3 articles for Telegram summary
                const articlesToShow = savedArticleLogs.slice(0, 3);
                articlesToShow.forEach((log, index) => {
                    const { title, source, sourceType, qualityScore, urlValidated } = log.data;
                    const sourceEmoji = this.getSourceEmoji(sourceType || source);
                    const qualityEmoji = qualityScore ? this.getQualityEmoji(qualityScore) : '';
                    const validationEmoji = urlValidated ? '✅' : '';
                    // Truncate long titles for Telegram
                    const truncatedTitle = title.length > 80 ? title.substring(0, 80) + '...' : title;
                    reportContent += `${index + 1}. ${sourceEmoji} **${truncatedTitle}**\n`;
                    reportContent += `   📍 ${source} ${qualityEmoji} ${validationEmoji}\n\n`;
                });
                // Add note about remaining articles
                if (savedArticleLogs.length > 3) {
                    reportContent += `📎 ... and ${savedArticleLogs.length - 3} more articles (see full report)\n\n`;
                }
            }
            // Add execution insights if available
            if (completionLog?.data?.qualityMetrics) {
                reportContent += '🎯 **Quality Metrics**\n';
                const metrics = completionLog.data.qualityMetrics;
                if (metrics.avgQualityScore) {
                    reportContent += `📊 Avg Quality Score: ${metrics.avgQualityScore.toFixed(1)}/10\n`;
                }
                if (metrics.urlValidationRate) {
                    reportContent += `🔗 URL Validation Rate: ${(metrics.urlValidationRate * 100).toFixed(0)}%\n`;
                }
                reportContent += '\n';
            }
            // Add refresh mode info if available
            if (completionLog?.data?.refreshMode) {
                reportContent += `🔄 Mode: ${completionLog.data.refreshMode}\n`;
            }
            // Fallback to basic summary if no detailed content
            if (!reportContent.trim()) {
                reportContent = agentRun.results?.summary || 'Agent execution completed successfully.';
            }
            return reportContent;
        }
        catch (error) {
            console.error('[AgentService] Error generating detailed report:', error);
            return agentRun.results?.summary || 'Agent execution completed without detailed summary.';
        }
    }
    getSourceEmoji(source) {
        const sourceType = source.toLowerCase();
        if (sourceType.includes('reddit'))
            return '🔴';
        if (sourceType.includes('telegram'))
            return '💬';
        if (sourceType.includes('linkedin'))
            return '💼';
        if (sourceType.includes('twitter') || sourceType.includes('x.com'))
            return '🐦';
        if (sourceType.includes('news'))
            return '📰';
        return '🌐';
    }
    getQualityEmoji(score) {
        if (score >= 8)
            return '🌟';
        if (score >= 6)
            return '⭐';
        if (score >= 4)
            return '🔸';
        return '🔹';
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
        const agent = await this.updateAgent(agentId, { status: 'paused', isActive: false });
        // Emit AG-UI command acknowledgment
        if (agent) {
            const commandEvent = (0, aguiMapper_1.createAgentCommandEvent)('pause', agentId, agent.userId.toString());
            aguiEmitter_1.agui.emitToUser(agent.userId.toString(), commandEvent);
            console.log(`[AgentService] 🔄 Emitted AG-UI pause command for agent ${agent.name}`);
        }
        return agent;
    }
    async resumeAgent(agentId) {
        const agent = await this.updateAgent(agentId, { status: 'idle', isActive: true });
        // Emit AG-UI command acknowledgment
        if (agent) {
            const commandEvent = (0, aguiMapper_1.createAgentCommandEvent)('resume', agentId, agent.userId.toString());
            aguiEmitter_1.agui.emitToUser(agent.userId.toString(), commandEvent);
            console.log(`[AgentService] 🔄 Emitted AG-UI resume command for agent ${agent.name}`);
        }
        return agent;
    }
    async cancelAgent(agentId) {
        const agent = await this.updateAgent(agentId, { status: 'idle', isActive: false });
        // Emit AG-UI command acknowledgment
        if (agent) {
            const commandEvent = (0, aguiMapper_1.createAgentCommandEvent)('cancel', agentId, agent.userId.toString());
            aguiEmitter_1.agui.emitToUser(agent.userId.toString(), commandEvent);
            console.log(`[AgentService] 🔄 Emitted AG-UI cancel command for agent ${agent.name}`);
        }
        return agent;
    }
    async resetAgentStatus(agentId) {
        console.log(`[AgentService] Resetting status for agent: ${agentId}`);
        const agent = await Agent_1.default.findById(agentId);
        if (!agent) {
            throw new Error(`Agent with ID ${agentId} not found`);
        }
        // Also mark any stuck running agent runs as failed
        const stuckRuns = await AgentRun_1.default.updateMany({
            agentId: agent._id,
            status: 'running',
            createdAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } // Older than 5 minutes
        }, {
            $set: {
                status: 'failed',
                completedAt: new Date(),
                errorMessage: 'Agent run was stuck and has been reset'
            }
        });
        if (stuckRuns.modifiedCount > 0) {
            console.log(`[AgentService] Marked ${stuckRuns.modifiedCount} stuck run(s) as failed`);
        }
        // Reset agent to idle state and clear any error messages
        const updates = {
            status: 'idle',
            errorMessage: undefined,
            // Don't change isActive - preserve user's active/inactive choice
        };
        const updatedAgent = await Agent_1.default.findByIdAndUpdate(agentId, updates, { new: true });
        if (updatedAgent) {
            console.log(`[AgentService] Successfully reset agent ${updatedAgent.name} status to idle`);
        }
        return updatedAgent;
    }
    async getCrewProgress(agentId) {
        console.log(`[AgentService] Getting crew progress for agent: ${agentId}`);
        const baseResponse = {
            steps: [],
            results: null,
            hasActiveProgress: false,
            timestamp: new Date().toISOString(),
            agent_id: agentId,
            progress_status: 'unknown',
            step_count: 0
        };
        try {
            // Get the agent to ensure it's a CrewAI agent
            const agent = await Agent_1.default.findById(agentId);
            if (!agent) {
                console.warn(`[AgentService] Agent with ID ${agentId} not found`);
                return {
                    ...baseResponse,
                    progress_status: 'agent_not_found',
                    message: 'Agent not found'
                };
            }
            if (agent.type !== 'crewai_news') {
                console.warn(`[AgentService] Progress tracking requested for non-CrewAI agent: ${agent.type}`);
                return {
                    ...baseResponse,
                    progress_status: 'not_supported',
                    message: 'Progress tracking is only available for CrewAI agents',
                    agent_type: agent.type
                };
            }
            // Get recent runs for session ID extraction
            const recentRuns = await AgentRun_1.default.find({
                agentId: agent._id
            }).sort({ createdAt: -1 }).limit(10);
            // Extract session IDs from agent run results
            const storedSessionIds = recentRuns
                .map(run => {
                return run.results?.sessionId ||
                    run.results?.session_id;
            })
                .filter(Boolean);
            // Get current running session ID
            const runningRun = recentRuns.find(run => run.status === 'running');
            const currentSessionId = runningRun?.results?.sessionId || runningRun?.results?.session_id;
            console.log(`[AgentService] Found ${storedSessionIds.length} session IDs: ${storedSessionIds.join(', ')}`);
            if (currentSessionId) {
                console.log(`[AgentService] Current running session: ${currentSessionId}`);
            }
            const crewaiServiceUrl = process.env.CREWAI_SERVICE_URL || 'https://synapse-crewai.onrender.com';
            // ENHANCED: Test CrewAI service availability first
            let serviceAccessible = false;
            let serviceError = null;
            try {
                const axios = require('axios');
                const healthResponse = await axios.get(`${crewaiServiceUrl}/health`, {
                    timeout: 5000,
                    validateStatus: (status) => status < 500 // Accept 4xx but not 5xx
                });
                serviceAccessible = healthResponse.status === 200;
                console.log(`[AgentService] CrewAI service health check: ${serviceAccessible ? 'OK' : 'FAILED'} (${healthResponse.status})`);
            }
            catch (healthError) {
                serviceError = healthError;
                console.warn(`[AgentService] CrewAI service health check failed: ${healthError.message}`);
                // Return early if service is completely unreachable
                if (healthError.code === 'ECONNREFUSED' || healthError.code === 'ENOTFOUND') {
                    return {
                        ...baseResponse,
                        progress_status: 'service_unreachable',
                        message: 'CrewAI service is unreachable',
                        error_details: {
                            service_url: crewaiServiceUrl,
                            error_code: healthError.code,
                            error_message: healthError.message
                        }
                    };
                }
            }
            // Try to get progress even if health check failed (service might work but health endpoint might be broken)
            const sessionIdsToTry = [
                currentSessionId,
                ...storedSessionIds,
                `news_${agentId}`,
                agentId,
            ].filter(Boolean);
            let progressData = null;
            let activeSessionId = null;
            let progressErrors = [];
            // Only try progress queries if we have session IDs to try
            if (sessionIdsToTry.length > 0) {
                for (const sessionId of sessionIdsToTry) {
                    try {
                        const axios = require('axios');
                        console.log(`[AgentService] Checking progress for session: ${sessionId}`);
                        const response = await axios.get(`${crewaiServiceUrl}/progress`, {
                            timeout: 5000,
                            headers: { 'Content-Type': 'application/json' },
                            params: { session_id: sessionId },
                            validateStatus: (status) => status < 500
                        });
                        console.log(`[AgentService] Progress response for ${sessionId}:`, {
                            status: response.status,
                            success: response.data?.success,
                            hasProgress: !!response.data?.progress
                        });
                        if (response.status === 200 && response.data?.success && response.data?.progress) {
                            const progress = response.data.progress;
                            if (progress.hasActiveProgress || progress.has_active_progress ||
                                (progress.steps && progress.steps.length > 0)) {
                                console.log(`[AgentService] ✅ Found active progress with session: ${sessionId}`);
                                progressData = progress;
                                activeSessionId = sessionId;
                                break;
                            }
                        }
                        else if (response.status === 404) {
                            progressErrors.push(`Session ${sessionId}: not found`);
                        }
                        else {
                            progressErrors.push(`Session ${sessionId}: ${response.status} ${response.statusText}`);
                        }
                    }
                    catch (err) {
                        progressErrors.push(`Session ${sessionId}: ${err.message}`);
                        console.log(`[AgentService] Session ${sessionId} check failed: ${err.message}`);
                        continue;
                    }
                }
            }
            else {
                console.log(`[AgentService] No session IDs available to check progress`);
            }
            // Store discovered session ID if found
            if (activeSessionId && runningRun && !runningRun.results?.sessionId) {
                try {
                    await AgentRun_1.default.findByIdAndUpdate(runningRun._id, {
                        'results.sessionId': activeSessionId
                    });
                    console.log(`[AgentService] Stored discovered session ID ${activeSessionId} in run ${runningRun._id}`);
                }
                catch (updateError) {
                    console.warn(`[AgentService] Failed to store session ID: ${updateError}`);
                }
            }
            // Return progress data if found
            if (progressData) {
                const normalizedSteps = progressData.steps || [];
                const hasActiveProgress = progressData.hasActiveProgress ||
                    progressData.has_active_progress ||
                    normalizedSteps.length > 0;
                return {
                    steps: normalizedSteps,
                    results: progressData.results || null,
                    hasActiveProgress: hasActiveProgress,
                    timestamp: progressData.timestamp || new Date().toISOString(),
                    session_id: activeSessionId,
                    agent_id: agentId,
                    progress_status: hasActiveProgress ? 'active' : 'completed',
                    step_count: normalizedSteps.length
                };
            }
            // No progress found - return informative response
            const debugInfo = {
                agent_status: agent.status,
                recent_runs_count: recentRuns.length,
                last_run_status: recentRuns[0]?.status,
                stored_session_ids: storedSessionIds,
                attempted_sessions: sessionIdsToTry,
                service_url: crewaiServiceUrl,
                service_accessible: serviceAccessible,
                progress_errors: progressErrors.length > 0 ? progressErrors : undefined,
                service_error: serviceError?.message
            };
            const hasRecentActivity = recentRuns.some(run => run.status === 'running' ||
                (run.status === 'completed' && Date.now() - run.createdAt.getTime() < 300000) // 5 minutes
            );
            return {
                ...baseResponse,
                progress_status: hasRecentActivity ? 'no_active_progress' : 'idle',
                message: sessionIdsToTry.length === 0
                    ? 'No session IDs found for progress tracking'
                    : 'No active progress found',
                debug_info: debugInfo
            };
        }
        catch (error) {
            console.error(`[AgentService] ❌ Error getting crew progress: ${error.message}`);
            // NEVER throw errors - always return a valid response
            return {
                ...baseResponse,
                progress_status: 'error',
                message: 'Failed to get progress information',
                error_details: {
                    error_message: error.message,
                    error_type: error.name,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }
    // Health check for CrewAI service
    async checkCrewAIServiceHealth() {
        const crewaiServiceUrl = process.env.CREWAI_SERVICE_URL || 'https://synapse-crewai.onrender.com';
        const startTime = Date.now();
        try {
            const axios = require('axios');
            const response = await axios.get(`${crewaiServiceUrl}/health`, {
                timeout: 10000, // 10 second timeout for health checks
                validateStatus: (status) => status < 500
            });
            const responseTime = Date.now() - startTime;
            if (response.status === 200) {
                console.log(`[AgentService] CrewAI service health check: OK (${responseTime}ms)`);
                return {
                    isHealthy: true,
                    status: 'healthy',
                    message: 'CrewAI service is accessible and healthy',
                    serviceUrl: crewaiServiceUrl,
                    responseTime
                };
            }
            else {
                console.warn(`[AgentService] CrewAI service health check: DEGRADED (${response.status})`);
                return {
                    isHealthy: false,
                    status: 'degraded',
                    message: `CrewAI service returned status ${response.status}`,
                    serviceUrl: crewaiServiceUrl,
                    responseTime
                };
            }
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            console.error(`[AgentService] CrewAI service health check: FAILED (${error.message})`);
            let status = 'unhealthy';
            let message = 'CrewAI service health check failed';
            if (error.code === 'ECONNREFUSED') {
                status = 'unreachable';
                message = 'CrewAI service is unreachable (connection refused)';
            }
            else if (error.code === 'ENOTFOUND') {
                status = 'unreachable';
                message = 'CrewAI service hostname not found';
            }
            else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                status = 'timeout';
                message = 'CrewAI service health check timed out';
            }
            return {
                isHealthy: false,
                status,
                message,
                serviceUrl: crewaiServiceUrl,
                responseTime,
                error: error.message
            };
        }
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
