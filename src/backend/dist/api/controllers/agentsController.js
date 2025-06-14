"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvironmentDebug = exports.getSchedulerStatus = exports.resumeAgent = exports.pauseAgent = exports.getAgentStatistics = exports.getUserAgentRuns = exports.getAgentRuns = exports.executeAgent = exports.deleteAgent = exports.updateAgent = exports.createAgent = exports.getAgentById = exports.getAgents = exports.initializeAgentServices = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// Initialize services (these will be injected from server setup)
let agentService;
let agentScheduler;
const initializeAgentServices = (service, scheduler) => {
    agentService = service;
    agentScheduler = scheduler;
};
exports.initializeAgentServices = initializeAgentServices;
// Get all agents for the authenticated user
const getAgents = async (req, res) => {
    try {
        const userId = req.user.id;
        const agents = await agentService.getAgentsByUser(new mongoose_1.default.Types.ObjectId(userId));
        res.json({
            success: true,
            data: agents,
            count: agents.length,
        });
    }
    catch (error) {
        console.error('[AgentsController] Error fetching agents:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch agents',
            message: error.message,
        });
    }
};
exports.getAgents = getAgents;
// Get a specific agent by ID
const getAgentById = async (req, res) => {
    try {
        const { agentId } = req.params;
        const userId = req.user.id;
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
    }
    catch (error) {
        console.error('[AgentsController] Error fetching agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch agent',
            message: error.message,
        });
    }
};
exports.getAgentById = getAgentById;
// Create a new agent
const createAgent = async (req, res) => {
    try {
        const userId = req.user.id;
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
        const agent = await agentService.createAgent(new mongoose_1.default.Types.ObjectId(userId), {
            name,
            type,
            description,
            configuration: configuration || {},
        });
        // Schedule the agent if it's active
        if (agent.isActive) {
            await agentScheduler.scheduleAgent(agent);
        }
        res.status(201).json({
            success: true,
            data: agent,
            message: 'Agent created successfully',
        });
    }
    catch (error) {
        console.error('[AgentsController] Error creating agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create agent',
            message: error.message,
        });
    }
};
exports.createAgent = createAgent;
// Update an agent
const updateAgent = async (req, res) => {
    try {
        const { agentId } = req.params;
        const userId = req.user.id;
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
        }
        else {
            await agentScheduler.unscheduleAgent(agentId);
        }
        res.json({
            success: true,
            data: updatedAgent,
            message: 'Agent updated successfully',
        });
    }
    catch (error) {
        console.error('[AgentsController] Error updating agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update agent',
            message: error.message,
        });
    }
};
exports.updateAgent = updateAgent;
// Delete an agent
const deleteAgent = async (req, res) => {
    try {
        const { agentId } = req.params;
        const userId = req.user.id;
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
    }
    catch (error) {
        console.error('[AgentsController] Error deleting agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete agent',
            message: error.message,
        });
    }
};
exports.deleteAgent = deleteAgent;
// Execute an agent manually
const executeAgent = async (req, res) => {
    try {
        const { agentId } = req.params;
        const userId = req.user.id;
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
    }
    catch (error) {
        console.error('[AgentsController] Error executing agent:', error);
        res.status(400).json({
            success: false,
            error: 'Failed to execute agent',
            message: error.message,
        });
    }
};
exports.executeAgent = executeAgent;
// Get agent runs
const getAgentRuns = async (req, res) => {
    try {
        const { agentId } = req.params;
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 50;
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
    }
    catch (error) {
        console.error('[AgentsController] Error fetching agent runs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch agent runs',
            message: error.message,
        });
    }
};
exports.getAgentRuns = getAgentRuns;
// Get all agent runs for user
const getUserAgentRuns = async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 50;
        const runs = await agentService.getUserAgentRuns(new mongoose_1.default.Types.ObjectId(userId), limit);
        res.json({
            success: true,
            data: runs,
            count: runs.length,
        });
    }
    catch (error) {
        console.error('[AgentsController] Error fetching user agent runs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch agent runs',
            message: error.message,
        });
    }
};
exports.getUserAgentRuns = getUserAgentRuns;
// Get agent statistics
const getAgentStatistics = async (req, res) => {
    try {
        const { agentId } = req.params;
        const userId = req.user.id;
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
    }
    catch (error) {
        console.error('[AgentsController] Error fetching agent statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch agent statistics',
            message: error.message,
        });
    }
};
exports.getAgentStatistics = getAgentStatistics;
// Pause an agent
const pauseAgent = async (req, res) => {
    try {
        const { agentId } = req.params;
        const userId = req.user.id;
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
    }
    catch (error) {
        console.error('[AgentsController] Error pausing agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to pause agent',
            message: error.message,
        });
    }
};
exports.pauseAgent = pauseAgent;
// Resume an agent
const resumeAgent = async (req, res) => {
    try {
        const { agentId } = req.params;
        const userId = req.user.id;
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
    }
    catch (error) {
        console.error('[AgentsController] Error resuming agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to resume agent',
            message: error.message,
        });
    }
};
exports.resumeAgent = resumeAgent;
// Get scheduler status
const getSchedulerStatus = async (req, res) => {
    try {
        const status = agentScheduler.getSchedulerStatus();
        res.json({
            success: true,
            data: status,
        });
    }
    catch (error) {
        console.error('[AgentsController] Error fetching scheduler status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch scheduler status',
            message: error.message,
        });
    }
};
exports.getSchedulerStatus = getSchedulerStatus;
// Debug endpoint to check environment variables
const getEnvironmentDebug = async (req, res) => {
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
    }
    catch (error) {
        console.error('[AgentsController] Error checking environment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check environment',
            message: error.message,
        });
    }
};
exports.getEnvironmentDebug = getEnvironmentDebug;
