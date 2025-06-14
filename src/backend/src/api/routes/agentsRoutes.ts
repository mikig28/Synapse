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
  getEnvironmentDebug,
} from '../controllers/agentsController';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Agent CRUD operations
router.get('/', getAgents);
router.get('/runs', getUserAgentRuns); // Get all runs for user (must be before /:agentId routes)
router.get('/scheduler/status', getSchedulerStatus); // Get scheduler status
router.get('/debug/environment', getEnvironmentDebug); // Debug environment variables
router.post('/', createAgent);

router.get('/:agentId', getAgentById);
router.put('/:agentId', updateAgent);
router.delete('/:agentId', deleteAgent);

// Agent execution and control
router.post('/:agentId/execute', executeAgent);
router.post('/:agentId/pause', pauseAgent);
router.post('/:agentId/resume', resumeAgent);

// Agent runs and statistics
router.get('/:agentId/runs', getAgentRuns);
router.get('/:agentId/statistics', getAgentStatistics);

export default router;