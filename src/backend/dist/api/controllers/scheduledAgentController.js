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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExecutionHistory = exports.executeScheduledAgent = exports.deleteScheduledAgent = exports.toggleScheduledAgent = exports.updateScheduledAgent = exports.getScheduledAgent = exports.getScheduledAgents = exports.createScheduledAgent = void 0;
const ScheduledAgent_1 = __importDefault(require("../../models/ScheduledAgent"));
const mongoose_1 = __importDefault(require("mongoose"));
// Create a new scheduled agent
const createScheduledAgent = async (req, res) => {
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
        const scheduledAgent = new ScheduledAgent_1.default({
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
    }
    catch (error) {
        console.error('Error creating scheduled agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create scheduled agent',
            details: error.message
        });
    }
};
exports.createScheduledAgent = createScheduledAgent;
// Get all scheduled agents for a user
const getScheduledAgents = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const { page = 1, limit = 10, status, search } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
        // Build query
        const query = { userId };
        if (status === 'active') {
            query.isActive = true;
        }
        else if (status === 'inactive') {
            query.isActive = false;
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { 'agentConfig.topics': { $in: [new RegExp(search, 'i')] } }
            ];
        }
        const total = await ScheduledAgent_1.default.countDocuments(query);
        const scheduledAgents = await ScheduledAgent_1.default.find(query)
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
    }
    catch (error) {
        console.error('Error fetching scheduled agents:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch scheduled agents',
            details: error.message
        });
    }
};
exports.getScheduledAgents = getScheduledAgents;
// Get a specific scheduled agent
const getScheduledAgent = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        console.log(`[ScheduledAgent] GET request for agent ID: ${id}, User ID: ${userId}`);
        if (!userId) {
            console.log('[ScheduledAgent] Authentication failed - no user ID');
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        // Enhanced ObjectId validation
        if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
            console.log(`[ScheduledAgent] Invalid agent ID format: ${id}`);
            res.status(400).json({ success: false, error: 'Invalid agent ID format' });
            return;
        }
        // Check database connection
        if (mongoose_1.default.connection.readyState !== 1) {
            console.error('[ScheduledAgent] Database not connected, readyState:', mongoose_1.default.connection.readyState);
            res.status(503).json({ success: false, error: 'Database connection unavailable' });
            return;
        }
        console.log(`[ScheduledAgent] Searching for agent with ID: ${id} and userId: ${userId}`);
        const scheduledAgent = await ScheduledAgent_1.default.findOne({
            _id: id,
            userId
        }).catch(error => {
            console.error('[ScheduledAgent] Database query error:', error);
            throw error;
        });
        if (!scheduledAgent) {
            console.log(`[ScheduledAgent] Agent not found for ID: ${id} and userId: ${userId}`);
            // Check if agent exists but belongs to different user
            const agentExistsForOtherUser = await ScheduledAgent_1.default.findById(id);
            if (agentExistsForOtherUser) {
                console.log(`[ScheduledAgent] Agent ${id} exists but belongs to different user`);
                res.status(403).json({ success: false, error: 'Access denied to this scheduled agent' });
                return;
            }
            res.status(404).json({ success: false, error: 'Scheduled agent not found' });
            return;
        }
        console.log(`[ScheduledAgent] Successfully found agent: ${scheduledAgent.name}`);
        res.json({
            success: true,
            data: scheduledAgent
        });
    }
    catch (error) {
        console.error('[ScheduledAgent] Error fetching scheduled agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch scheduled agent',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
exports.getScheduledAgent = getScheduledAgent;
// Update a scheduled agent
const updateScheduledAgent = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const updates = req.body;
        console.log(`[ScheduledAgent] UPDATE request for agent ID: ${id}, User ID: ${userId}`);
        if (!userId) {
            console.log('[ScheduledAgent] UPDATE failed - no user ID');
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            console.log(`[ScheduledAgent] UPDATE failed - invalid agent ID format: ${id}`);
            res.status(400).json({ success: false, error: 'Invalid agent ID format' });
            return;
        }
        // Check database connection
        if (mongoose_1.default.connection.readyState !== 1) {
            console.error('[ScheduledAgent] UPDATE failed - database not connected, readyState:', mongoose_1.default.connection.readyState);
            res.status(503).json({ success: false, error: 'Database connection unavailable' });
            return;
        }
        // Remove sensitive fields that shouldn't be updated directly
        delete updates.userId;
        delete updates.executionCount;
        delete updates.successCount;
        delete updates.failureCount;
        delete updates.lastResult;
        console.log(`[ScheduledAgent] Attempting to update agent with ID: ${id} and userId: ${userId}`);
        const scheduledAgent = await ScheduledAgent_1.default.findOneAndUpdate({ _id: id, userId }, { ...updates, updatedAt: new Date() }, { new: true, runValidators: true }).catch(error => {
            console.error('[ScheduledAgent] Database update error:', error);
            throw error;
        });
        if (!scheduledAgent) {
            console.log(`[ScheduledAgent] UPDATE failed - agent not found for ID: ${id} and userId: ${userId}`);
            // Check if agent exists but belongs to different user
            const agentExistsForOtherUser = await ScheduledAgent_1.default.findById(id);
            if (agentExistsForOtherUser) {
                console.log(`[ScheduledAgent] Agent ${id} exists but belongs to different user`);
                res.status(403).json({
                    success: false,
                    error: 'Access denied to this scheduled agent',
                    details: 'This agent belongs to another user'
                });
                return;
            }
            console.log(`[ScheduledAgent] Agent ${id} does not exist in database`);
            res.status(404).json({
                success: false,
                error: 'Scheduled agent not found',
                details: 'The agent you are trying to update no longer exists. Please refresh the page.'
            });
            return;
        }
        console.log(`[ScheduledAgent] Successfully updated agent: ${scheduledAgent.name}`);
        res.json({
            success: true,
            data: scheduledAgent,
            message: 'Scheduled agent updated successfully'
        });
    }
    catch (error) {
        console.error('[ScheduledAgent] Error updating scheduled agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update scheduled agent',
            details: error.message
        });
    }
};
exports.updateScheduledAgent = updateScheduledAgent;
// Toggle active status of a scheduled agent
const toggleScheduledAgent = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, error: 'Invalid agent ID' });
            return;
        }
        const scheduledAgent = await ScheduledAgent_1.default.findOne({ _id: id, userId });
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
    }
    catch (error) {
        console.error('Error toggling scheduled agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle scheduled agent',
            details: error.message
        });
    }
};
exports.toggleScheduledAgent = toggleScheduledAgent;
// Delete a scheduled agent
const deleteScheduledAgent = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, error: 'Invalid agent ID' });
            return;
        }
        const scheduledAgent = await ScheduledAgent_1.default.findOneAndDelete({
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
    }
    catch (error) {
        console.error('Error deleting scheduled agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete scheduled agent',
            details: error.message
        });
    }
};
exports.deleteScheduledAgent = deleteScheduledAgent;
// Execute a scheduled agent manually (for testing)
const executeScheduledAgent = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, error: 'Invalid agent ID' });
            return;
        }
        const scheduledAgent = await ScheduledAgent_1.default.findOne({
            _id: id,
            userId
        });
        if (!scheduledAgent) {
            res.status(404).json({ success: false, error: 'Scheduled agent not found' });
            return;
        }
        // Import the scheduler service to execute the agent
        const { executeScheduledAgentById } = await Promise.resolve().then(() => __importStar(require('../../services/schedulerService')));
        const result = await executeScheduledAgentById(scheduledAgent._id);
        res.json({
            success: true,
            data: result,
            message: 'Scheduled agent executed successfully'
        });
    }
    catch (error) {
        console.error('Error executing scheduled agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to execute scheduled agent',
            details: error.message
        });
    }
};
exports.executeScheduledAgent = executeScheduledAgent;
// Get execution history for a scheduled agent
const getExecutionHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const { page = 1, limit = 10 } = req.query;
        if (!userId) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, error: 'Invalid agent ID' });
            return;
        }
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
        // Verify ownership
        const scheduledAgent = await ScheduledAgent_1.default.findOne({ _id: id, userId });
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
    }
    catch (error) {
        console.error('Error fetching execution history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch execution history',
            details: error.message
        });
    }
};
exports.getExecutionHistory = getExecutionHistory;
