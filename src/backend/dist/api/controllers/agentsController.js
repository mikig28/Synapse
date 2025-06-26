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
exports.getEnvironmentDebug = exports.resetAgentStatus = exports.getCrewProgress = exports.getAgentStatus = exports.testCrewAISources = exports.getAgentCapabilities = exports.getMCPRecommendations = exports.testMCPConnection = exports.getBuiltinTools = exports.getSchedulerStatus = exports.resumeAgent = exports.pauseAgent = exports.getAgentStatistics = exports.getUserAgentRuns = exports.getAgentRuns = exports.executeAgent = exports.deleteAgent = exports.updateAgent = exports.createAgent = exports.getAgentById = exports.getAgents = exports.initializeAgentServices = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Agent_1 = __importDefault(require("../../models/Agent"));
const AgentRun_1 = __importDefault(require("../../models/AgentRun"));
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
    const { agentId } = req.params;
    const userId = req.user.id;
    const { force } = req.body; // Allow force execution to override stuck state
    try {
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
        // Check for stuck agents and auto-reset if needed
        const stuckThreshold = 10 * 60 * 1000; // 10 minutes
        const isStuck = agent.status === 'running' &&
            agent.lastRun &&
            (Date.now() - agent.lastRun.getTime()) > stuckThreshold;
        if (isStuck || force) {
            console.log(`[AgentsController] Resetting stuck agent ${agent.name} before execution`);
            await agentService.resetAgentStatus(agentId);
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
        console.error('[AgentsController] Error details:', {
            agentId,
            userId,
            errorMessage: error.message,
            errorStack: error.stack,
            errorName: error.name,
            errorCode: error.code
        });
        // Determine appropriate HTTP status code based on error type
        let statusCode = 400;
        let errorType = 'execution_error';
        if (error.message.includes('not found')) {
            statusCode = 404;
            errorType = 'agent_not_found';
        }
        else if (error.message.includes('not active')) {
            statusCode = 409;
            errorType = 'agent_inactive';
        }
        else if (error.message.includes('already running')) {
            statusCode = 409;
            errorType = 'agent_already_running';
        }
        else if (error.message.includes('No executor registered')) {
            statusCode = 501;
            errorType = 'executor_not_available';
        }
        else if (error.message.includes('service is unavailable') || error.code === 'ECONNREFUSED') {
            statusCode = 503;
            errorType = 'service_unavailable';
        }
        else if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') {
            statusCode = 504;
            errorType = 'service_timeout';
        }
        // Get additional context for debugging
        const agent = await agentService.getAgentById(agentId).catch(() => null);
        const debugContext = {
            agentExists: !!agent,
            agentType: agent?.type,
            agentActive: agent?.isActive,
            agentStatus: agent?.status,
            availableExecutors: agentService.getAvailableExecutors(),
            errorType,
            timestamp: new Date().toISOString()
        };
        res.status(statusCode).json({
            success: false,
            error: 'Failed to execute agent',
            errorType,
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? debugContext : { errorType, timestamp: debugContext.timestamp }
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
// Get available builtin tools
const getBuiltinTools = async (req, res) => {
    try {
        const builtinTools = [
            {
                name: 'web_scraper',
                description: 'Scrape content from web pages',
                category: 'data',
                parameters: [
                    { name: 'url', type: 'string', required: true, description: 'URL to scrape' },
                    { name: 'selector', type: 'string', required: false, description: 'CSS selector for specific content' }
                ]
            },
            {
                name: 'content_summarizer',
                description: 'Summarize long text content',
                category: 'analysis',
                parameters: [
                    { name: 'max_length', type: 'number', required: false, description: 'Maximum summary length', default: 200 }
                ]
            },
            {
                name: 'sentiment_analyzer',
                description: 'Analyze sentiment of text content',
                category: 'analysis'
            },
            {
                name: 'telegram_notifier',
                description: 'Send notifications via Telegram',
                category: 'communication',
                parameters: [
                    { name: 'chat_id', type: 'string', required: true, description: 'Telegram chat ID' },
                    { name: 'template', type: 'string', required: false, description: 'Message template' }
                ]
            },
            {
                name: 'data_validator',
                description: 'Validate data formats and content',
                category: 'utility',
                parameters: [
                    { name: 'schema', type: 'object', required: true, description: 'Validation schema' }
                ]
            },
            {
                name: 'email_notifier',
                description: 'Send email notifications',
                category: 'communication',
                parameters: [
                    { name: 'to', type: 'string', required: true, description: 'Recipient email' },
                    { name: 'subject_template', type: 'string', required: false, description: 'Email subject template' }
                ]
            },
            {
                name: 'content_filter',
                description: 'Filter content based on rules',
                category: 'utility',
                parameters: [
                    { name: 'keywords', type: 'array', required: false, description: 'Keywords to filter by' },
                    { name: 'min_score', type: 'number', required: false, description: 'Minimum relevance score' }
                ]
            }
        ];
        res.json({
            success: true,
            data: builtinTools,
        });
    }
    catch (error) {
        console.error('[AgentsController] Error fetching builtin tools:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch builtin tools',
            message: error.message,
        });
    }
};
exports.getBuiltinTools = getBuiltinTools;
// Test MCP server connection
const testMCPConnection = async (req, res) => {
    try {
        const { serverUri, authentication } = req.body;
        if (!serverUri) {
            res.status(400).json({
                success: false,
                error: 'Server URI is required',
            });
            return;
        }
        // Here you would implement actual MCP connection testing
        // For now, we'll do a simple HTTP check
        const fetch = (await Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
        const headers = {
            'Content-Type': 'application/json',
        };
        if (authentication?.type === 'bearer' && authentication?.credentials) {
            headers['Authorization'] = `Bearer ${authentication.credentials}`;
        }
        else if (authentication?.type === 'apikey' && authentication?.credentials) {
            headers['X-API-Key'] = authentication.credentials;
        }
        try {
            const response = await fetch(serverUri, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'initialize',
                    params: {
                        protocolVersion: '2024-11-05',
                        capabilities: {}
                    },
                    id: 1
                }),
                timeout: 5000
            });
            const isConnectable = response.status < 500;
            res.json({
                success: true,
                data: {
                    connectable: isConnectable,
                    status: response.status,
                    statusText: response.statusText,
                    message: isConnectable ? 'MCP server is reachable' : 'MCP server returned an error'
                },
            });
        }
        catch (fetchError) {
            res.json({
                success: true,
                data: {
                    connectable: false,
                    error: fetchError.message,
                    message: 'Unable to connect to MCP server'
                },
            });
        }
    }
    catch (error) {
        console.error('[AgentsController] Error testing MCP connection:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test MCP connection',
            message: error.message,
        });
    }
};
exports.testMCPConnection = testMCPConnection;
// Get MCP server recommendations based on agent type
const getMCPRecommendations = async (req, res) => {
    try {
        const { agentType } = req.params;
        // Define recommendations based on agent type
        const recommendations = {
            'crewai_news': [
                {
                    id: 'memory',
                    priority: 'high',
                    reason: 'Knowledge graph for connecting news stories and analysis across time'
                },
                {
                    id: 'sequential-thinking',
                    priority: 'high',
                    reason: 'Enhanced reasoning for complex news analysis and pattern detection'
                },
                {
                    id: 'algolia',
                    priority: 'medium',
                    reason: 'Powerful search across analyzed news content and historical data'
                }
            ],
            'news': [
                {
                    id: 'filesystem',
                    priority: 'high',
                    reason: 'File operations for saving and managing news articles and reports'
                },
                {
                    id: 'memory',
                    priority: 'medium',
                    reason: 'Remember important news stories and track developing narratives'
                }
            ],
            'custom': [
                {
                    id: 'everything',
                    priority: 'high',
                    reason: 'Comprehensive toolset for custom agent development and testing'
                },
                {
                    id: 'filesystem',
                    priority: 'medium',
                    reason: 'Basic file operations for most custom agent use cases'
                }
            ]
        };
        const agentRecommendations = recommendations[agentType] || [];
        res.json({
            success: true,
            data: {
                agentType,
                recommendations: agentRecommendations,
                totalRecommendations: agentRecommendations.length
            },
        });
    }
    catch (error) {
        console.error('[AgentsController] Error getting MCP recommendations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get MCP recommendations',
            message: error.message,
        });
    }
};
exports.getMCPRecommendations = getMCPRecommendations;
// Get agent capabilities summary
const getAgentCapabilities = async (req, res) => {
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
        const mcpServers = agent.configuration.mcpServers || [];
        const tools = agent.configuration.tools || [];
        // Calculate sophistication score
        let sophisticationScore = 0;
        sophisticationScore += mcpServers.filter(s => s.enabled).length * 20;
        sophisticationScore += tools.filter(t => t.enabled).length * 10;
        sophisticationScore += mcpServers.flatMap(s => s.capabilities).length * 5;
        sophisticationScore = Math.min(sophisticationScore, 100);
        const capabilities = {
            mcpServers: {
                total: mcpServers.length,
                enabled: mcpServers.filter(s => s.enabled).length,
                capabilities: [...new Set(mcpServers.flatMap(s => s.capabilities))],
                byCategory: {
                    ai: mcpServers.filter(s => ['memory', 'sequential-thinking', 'everything'].includes(s.name.toLowerCase())).length,
                    productivity: mcpServers.filter(s => ['dart', 'devhub'].includes(s.name.toLowerCase())).length,
                    data: mcpServers.filter(s => ['builtwith'].includes(s.name.toLowerCase())).length,
                    files: mcpServers.filter(s => ['filesystem'].includes(s.name.toLowerCase())).length,
                    search: mcpServers.filter(s => ['algolia'].includes(s.name.toLowerCase())).length
                }
            },
            tools: {
                total: tools.length,
                enabled: tools.filter(t => t.enabled).length,
                byType: {
                    builtin: tools.filter(t => t.type === 'builtin').length,
                    mcp: tools.filter(t => t.type === 'mcp').length,
                    custom: tools.filter(t => t.type === 'custom').length
                }
            },
            integrations: {
                hasWebScraping: tools.some(t => t.name === 'web_scraper' && t.enabled),
                hasNotifications: tools.some(t => ['telegram_notifier', 'email_notifier'].includes(t.name) && t.enabled),
                hasAnalysis: tools.some(t => ['sentiment_analyzer', 'content_summarizer'].includes(t.name) && t.enabled),
                hasMemory: mcpServers.some(s => s.name.toLowerCase().includes('memory') && s.enabled),
                hasFileSystem: mcpServers.some(s => s.name.toLowerCase().includes('filesystem') && s.enabled),
                hasSearch: mcpServers.some(s => s.name.toLowerCase().includes('algolia') && s.enabled)
            },
            sophisticationScore,
            sophisticationLevel: sophisticationScore < 30 ? 'Basic' : sophisticationScore < 60 ? 'Intermediate' : 'Advanced'
        };
        res.json({
            success: true,
            data: capabilities,
        });
    }
    catch (error) {
        console.error('[AgentsController] Error fetching agent capabilities:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch agent capabilities',
            message: error.message,
        });
    }
};
exports.getAgentCapabilities = getAgentCapabilities;
// Test CrewAI service sources health
const testCrewAISources = async (req, res) => {
    try {
        const crewaiServiceUrl = process.env.CREWAI_SERVICE_URL || 'https://synapse-crewai.onrender.com';
        // Test health endpoint
        const healthResponse = await fetch(`${crewaiServiceUrl}/health`);
        const healthData = await healthResponse.json();
        // Test system info
        const sysResponse = await fetch(`${crewaiServiceUrl}/system-info`);
        const sysData = await sysResponse.json();
        // Test individual sources with small requests
        const sourceTests = await Promise.allSettled([
            // Test Reddit
            fetch(`${crewaiServiceUrl}/gather-news`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topics: ['test'],
                    sources: { reddit: true },
                    max_items: 1
                })
            }).then(r => r.json()),
            // Test News websites
            fetch(`${crewaiServiceUrl}/gather-news`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topics: ['test'],
                    sources: { news_websites: true },
                    max_items: 1
                })
            }).then(r => r.json())
        ]);
        const sourceResults = {
            reddit: sourceTests[0].status === 'fulfilled' ?
                {
                    status: 'success',
                    itemCount: sourceTests[0].value?.data?.organized_content?.reddit_posts?.length || 0,
                    isMockData: sourceTests[0].value?.data?.crew_result?.includes('Global Climate Summit') || false
                } :
                { status: 'failed', error: sourceTests[0].reason?.message || 'Unknown error' },
            news_websites: sourceTests[1].status === 'fulfilled' ?
                {
                    status: 'success',
                    itemCount: sourceTests[1].value?.data?.organized_content?.news_articles?.length || 0,
                    isMockData: sourceTests[1].value?.data?.crew_result?.includes('Global Climate Summit') || false
                } :
                { status: 'failed', error: sourceTests[1].reason?.message || 'Unknown error' }
        };
        res.json({
            success: true,
            data: {
                serviceHealth: {
                    status: healthData.status,
                    initialized: healthData.initialized,
                    mode: healthData.current_mode,
                    realNewsEnabled: healthData.real_news_enabled
                },
                systemInfo: {
                    mode: sysData.mode,
                    supportedSources: sysData.supported_sources,
                    features: Object.keys(sysData.features || {})
                },
                sourceTests: sourceResults,
                recommendations: [
                    sourceResults.reddit.status === 'failed' || sourceResults.reddit.isMockData ?
                        'Reddit source may be unavailable or rate limited' : null,
                    sourceResults.news_websites.status === 'failed' || sourceResults.news_websites.isMockData ?
                        'News websites source may be unavailable or blocked' : null,
                    healthData.real_news_enabled === false ?
                        'Real news gathering is disabled - service is in fallback mode' : null
                ].filter(Boolean)
            }
        });
    }
    catch (error) {
        console.error('[AgentsController] Error testing CrewAI sources:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test CrewAI sources',
            message: error.message,
        });
    }
};
exports.testCrewAISources = testCrewAISources;
// Get agent execution status
const getAgentStatus = async (req, res) => {
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
        // Check if agent belongs to user
        if (agent.userId.toString() !== userId) {
            res.status(403).json({
                success: false,
                error: 'Access denied',
            });
            return;
        }
        // Get the most recent run to determine actual status
        const recentRuns = await AgentRun_1.default.find({ agentId: new mongoose_1.default.Types.ObjectId(agentId) })
            .sort({ createdAt: -1 })
            .limit(1);
        const now = new Date();
        let actualStatus = agent.status;
        let isStuck = false;
        let canExecute = true;
        let statusReason = '';
        if (recentRuns.length > 0) {
            const lastRun = recentRuns[0];
            const timeSinceLastRun = now.getTime() - lastRun.createdAt.getTime();
            const fiveMinutesInMs = 5 * 60 * 1000;
            const tenMinutesInMs = 10 * 60 * 1000;
            // Check if agent is stuck in running state
            if (agent.status === 'running' && timeSinceLastRun > tenMinutesInMs) {
                isStuck = true;
                actualStatus = 'error';
                canExecute = false;
                statusReason = 'Agent has been running for more than 10 minutes and may be stuck';
            }
            else if (agent.status === 'running' && timeSinceLastRun > fiveMinutesInMs) {
                statusReason = 'Agent has been running for more than 5 minutes';
                canExecute = false;
            }
            else if (agent.status === 'running') {
                canExecute = false;
                statusReason = 'Agent is currently executing';
            }
        }
        // Check if agent is paused
        if (!agent.isActive) {
            canExecute = false;
            statusReason = 'Agent is paused';
        }
        res.json({
            success: true,
            data: {
                agentId,
                status: actualStatus,
                isActive: agent.isActive,
                canExecute,
                isStuck,
                statusReason,
                lastRun: recentRuns.length > 0 ? recentRuns[0].createdAt : null,
                lastRunStatus: recentRuns.length > 0 ? recentRuns[0].status : null,
            },
        });
    }
    catch (error) {
        console.error('[AgentsController] Error getting agent status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get agent status',
            message: error.message,
        });
    }
};
exports.getAgentStatus = getAgentStatus;
// Get crew execution progress for CrewAI agents
const getCrewProgress = async (req, res) => {
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
        // Check if agent belongs to user
        if (agent.userId.toString() !== userId) {
            res.status(403).json({
                success: false,
                error: 'Access denied',
            });
            return;
        }
        // Get progress from the agent service
        const progress = await agentService.getCrewProgress(agentId);
        res.json({
            success: true,
            progress: progress || {
                steps: [],
                results: null,
                hasActiveProgress: false,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[AgentsController] Error getting crew progress:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get crew progress'
        });
    }
};
exports.getCrewProgress = getCrewProgress;
// Reset agent status (for stuck agents)
const resetAgentStatus = async (req, res) => {
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
        // Check if agent belongs to user
        if (agent.userId.toString() !== userId) {
            res.status(403).json({
                success: false,
                error: 'Access denied',
            });
            return;
        }
        // Reset agent status to idle
        await Agent_1.default.findByIdAndUpdate(agentId, {
            status: 'idle',
            lastRun: new Date(),
        });
        console.log(`[AgentsController] Reset status for agent ${agentId} by user ${userId}`);
        res.json({
            success: true,
            message: 'Agent status reset successfully',
            data: {
                agentId,
                status: 'idle',
                resetAt: new Date(),
            },
        });
    }
    catch (error) {
        console.error('[AgentsController] Error resetting agent status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset agent status',
            message: error.message,
        });
    }
};
exports.resetAgentStatus = resetAgentStatus;
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
