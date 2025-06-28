import express from 'express';
import { auth } from '../middleware/authMiddleware';
import {
  createScheduledAgent,
  getScheduledAgents,
  getScheduledAgent,
  updateScheduledAgent,
  toggleScheduledAgent,
  deleteScheduledAgent,
  executeScheduledAgent,
  getExecutionHistory
} from '../controllers/scheduledAgentController';

const router = express.Router();

// Apply authentication to all routes
router.use(auth);

/**
 * @route   POST /api/scheduled-agents
 * @desc    Create a new scheduled agent
 * @access  Private
 * @body    { name, description?, agentConfig, schedule }
 */
router.post('/', createScheduledAgent);

/**
 * @route   GET /api/scheduled-agents
 * @desc    Get all scheduled agents for the authenticated user
 * @access  Private
 * @query   page?, limit?, status?, search?
 */
router.get('/', getScheduledAgents);

/**
 * @route   GET /api/scheduled-agents/:id
 * @desc    Get a specific scheduled agent
 * @access  Private
 */
router.get('/:id', getScheduledAgent);

/**
 * @route   PUT /api/scheduled-agents/:id
 * @desc    Update a scheduled agent
 * @access  Private
 * @body    { name?, description?, agentConfig?, schedule?, isActive? }
 */
router.put('/:id', updateScheduledAgent);

/**
 * @route   PATCH /api/scheduled-agents/:id/toggle
 * @desc    Toggle active status of a scheduled agent
 * @access  Private
 */
router.patch('/:id/toggle', toggleScheduledAgent);

/**
 * @route   DELETE /api/scheduled-agents/:id
 * @desc    Delete a scheduled agent
 * @access  Private
 */
router.delete('/:id', deleteScheduledAgent);

/**
 * @route   POST /api/scheduled-agents/:id/execute
 * @desc    Execute a scheduled agent manually (for testing)
 * @access  Private
 */
router.post('/:id/execute', executeScheduledAgent);

/**
 * @route   GET /api/scheduled-agents/:id/history
 * @desc    Get execution history for a scheduled agent
 * @access  Private
 * @query   page?, limit?
 */
router.get('/:id/history', getExecutionHistory);

export default router;