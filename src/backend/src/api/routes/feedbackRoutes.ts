import express from 'express';
import {
  createFeedback,
  getFeedback,
  getFeedbackById,
  voteFeedback,
  updateFeedbackStatus,
  getFeedbackStats,
  getUserFeedback
} from '../controllers/feedbackController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes (allow anonymous feedback)
router.post('/', createFeedback);

// Protected routes
router.use(protect);

// Get user's own feedback
router.get('/my-feedback', getUserFeedback);

// Get feedback statistics
router.get('/stats', getFeedbackStats);

// Get all feedback (with filtering)
router.get('/', getFeedback);

// Get single feedback by ID
router.get('/:id', getFeedbackById);

// Vote on feedback
router.post('/:id/vote', voteFeedback);

// Update feedback status (admin only - TODO: add admin middleware)
router.patch('/:id/status', updateFeedbackStatus);

export default router;