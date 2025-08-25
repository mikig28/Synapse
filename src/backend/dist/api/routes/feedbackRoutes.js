"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const feedbackController_1 = require("../controllers/feedbackController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Public routes (allow anonymous feedback)
router.post('/', feedbackController_1.createFeedback);
// Protected routes
router.use(authMiddleware_1.protect);
// Get user's own feedback
router.get('/my-feedback', feedbackController_1.getUserFeedback);
// Get feedback statistics
router.get('/stats', feedbackController_1.getFeedbackStats);
// Get all feedback (with filtering)
router.get('/', feedbackController_1.getFeedback);
// Get single feedback by ID
router.get('/:id', feedbackController_1.getFeedbackById);
// Vote on feedback
router.post('/:id/vote', feedbackController_1.voteFeedback);
// Update feedback status (admin only - TODO: add admin middleware)
router.patch('/:id/status', feedbackController_1.updateFeedbackStatus);
exports.default = router;
