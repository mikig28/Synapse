import express from 'express';
import {
  getAvailableGroups,
  getGroupMessages,
  generateDailySummary,
  generateTodaySummary,
  getAvailableDateRanges,
  getGroupSummaryStats,
  debugMessages
} from '../controllers/whatsappSummaryController';
import { authMiddleware } from '../middleware/authMiddleware';

// WhatsApp Summary API Routes - Daily Summary Feature

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Group management routes
router.get('/groups', getAvailableGroups);
router.get('/groups/:groupId/stats', getGroupSummaryStats);
router.get('/groups/:groupId/date-ranges', getAvailableDateRanges);

// Message retrieval routes
router.get('/groups/:groupId/messages', getGroupMessages);

// Summary generation routes
router.post('/generate', generateDailySummary);
router.post('/generate-today', generateTodaySummary);

// Debug routes (only in non-production environments)
if (process.env.NODE_ENV !== 'production') {
  router.get('/debug/messages', debugMessages);
}

export default router;