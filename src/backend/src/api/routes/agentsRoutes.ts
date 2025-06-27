import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  executeAgent,
  getAgentRuns,
  getUserAgentRuns,
  getAgentStatistics,
  pauseAgent,
  resumeAgent,
  getSchedulerStatus,
  getBuiltinTools,
  testMCPConnection,
  getAgentCapabilities,
  getMCPRecommendations,
  testCrewAISources,
  getEnvironmentDebug,
  getAgentStatus,
  resetAgentStatus,
  getCrewProgress,
  getHealthStatus,
} from '../controllers/agentsController';

const router = express.Router();

// Health check endpoint (no auth required)
router.get('/health', getHealthStatus);

// Debug endpoint (no auth required for testing)
router.get('/debug/environment', getEnvironmentDebug);

// All other routes require authentication
router.use(authMiddleware);

// Tools and capabilities endpoints
router.get('/builtin-tools', getBuiltinTools);
router.post('/test-mcp', testMCPConnection);
router.get('/mcp-recommendations/:agentType', getMCPRecommendations);

// Agent CRUD operations
router.get('/', getAgents);
router.get('/runs', getUserAgentRuns); // Get all runs for user (must be before /:agentId routes)
router.get('/scheduler/status', getSchedulerStatus); // Get scheduler status
router.post('/', createAgent);

router.get('/:agentId', getAgentById);
router.put('/:agentId', updateAgent);
router.delete('/:agentId', deleteAgent);

// Agent execution and control
router.get('/:agentId/status', getAgentStatus);
router.post('/:agentId/reset-status', resetAgentStatus);
router.get('/:agentId/crew-progress', getCrewProgress);
router.post('/:agentId/execute', executeAgent);
router.post('/:agentId/pause', pauseAgent);
router.post('/:agentId/resume', resumeAgent);

// Agent runs and statistics
router.get('/:agentId/runs', getAgentRuns);
router.get('/:agentId/statistics', getAgentStatistics);
router.get('/:agentId/capabilities', getAgentCapabilities);

// Debug and testing endpoints
router.get('/debug/crewai-sources', testCrewAISources);

export default router;