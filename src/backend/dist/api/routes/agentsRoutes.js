"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const agentsController_1 = require("../controllers/agentsController");
const router = express_1.default.Router();
// Debug endpoint (no auth required for testing)
router.get('/debug/environment', agentsController_1.getEnvironmentDebug);
// All other routes require authentication
router.use(authMiddleware_1.authMiddleware);
// Tools and capabilities endpoints
router.get('/builtin-tools', agentsController_1.getBuiltinTools);
router.post('/test-mcp', agentsController_1.testMCPConnection);
router.get('/mcp-recommendations/:agentType', agentsController_1.getMCPRecommendations);
// Agent CRUD operations
router.get('/', agentsController_1.getAgents);
router.get('/runs', agentsController_1.getUserAgentRuns); // Get all runs for user (must be before /:agentId routes)
router.get('/scheduler/status', agentsController_1.getSchedulerStatus); // Get scheduler status
router.post('/', agentsController_1.createAgent);
router.get('/:agentId', agentsController_1.getAgentById);
router.put('/:agentId', agentsController_1.updateAgent);
router.delete('/:agentId', agentsController_1.deleteAgent);
// Agent execution and control
router.get('/:agentId/status', agentsController_1.getAgentStatus);
router.post('/:agentId/reset-status', agentsController_1.resetAgentStatus);
router.post('/:agentId/execute', agentsController_1.executeAgent);
router.post('/:agentId/pause', agentsController_1.pauseAgent);
router.post('/:agentId/resume', agentsController_1.resumeAgent);
// Agent runs and statistics
router.get('/:agentId/runs', agentsController_1.getAgentRuns);
router.get('/:agentId/statistics', agentsController_1.getAgentStatistics);
router.get('/:agentId/capabilities', agentsController_1.getAgentCapabilities);
// Debug and testing endpoints
router.get('/debug/crewai-sources', agentsController_1.testCrewAISources);
exports.default = router;
