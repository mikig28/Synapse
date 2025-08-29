"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const scheduledAgentController_1 = require("../controllers/scheduledAgentController");
const router = express_1.default.Router();
// Apply authentication to all routes
router.use(authMiddleware_1.auth);
/**
 * @route   POST /api/scheduled-agents
 * @desc    Create a new scheduled agent
 * @access  Private
 * @body    { name, description?, agentConfig, schedule }
 */
router.post('/', scheduledAgentController_1.createScheduledAgent);
/**
 * @route   GET /api/scheduled-agents
 * @desc    Get all scheduled agents for the authenticated user
 * @access  Private
 * @query   page?, limit?, status?, search?
 */
router.get('/', scheduledAgentController_1.getScheduledAgents);
/**
 * @route   GET /api/scheduled-agents/:id
 * @desc    Get a specific scheduled agent
 * @access  Private
 */
router.get('/:id', scheduledAgentController_1.getScheduledAgent);
/**
 * @route   PUT /api/scheduled-agents/:id
 * @desc    Update a scheduled agent
 * @access  Private
 * @body    { name?, description?, agentConfig?, schedule?, isActive? }
 */
router.put('/:id', scheduledAgentController_1.updateScheduledAgent);
/**
 * @route   PATCH /api/scheduled-agents/:id/toggle
 * @desc    Toggle active status of a scheduled agent
 * @access  Private
 */
router.patch('/:id/toggle', scheduledAgentController_1.toggleScheduledAgent);
/**
 * @route   DELETE /api/scheduled-agents/:id
 * @desc    Delete a scheduled agent
 * @access  Private
 */
router.delete('/:id', scheduledAgentController_1.deleteScheduledAgent);
/**
 * @route   POST /api/scheduled-agents/:id/execute
 * @desc    Execute a scheduled agent manually (for testing)
 * @access  Private
 */
router.post('/:id/execute', scheduledAgentController_1.executeScheduledAgent);
/**
 * @route   GET /api/scheduled-agents/:id/history
 * @desc    Get execution history for a scheduled agent
 * @access  Private
 * @query   page?, limit?
 */
router.get('/:id/history', scheduledAgentController_1.getExecutionHistory);
exports.default = router;
