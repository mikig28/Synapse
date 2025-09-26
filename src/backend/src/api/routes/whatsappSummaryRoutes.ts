import express from 'express';
import {
  getAvailableGroups,
  getGroupMessages,
  generateDailySummary,
  generateTodaySummary,
  getAvailableDateRanges,
  getGroupSummaryStats,
  debugMessages,
  getRecentSummaries
} from '../controllers/whatsappSummaryController';
import {
  getSchedules as getSummarySchedules,
  createSchedule as createSummarySchedule,
  updateSchedule as updateSummarySchedule,
  toggleSchedule as toggleSummarySchedule,
  deleteSchedule as deleteSummarySchedule,
  runScheduleNow as runSummaryScheduleNow,
  getScheduleHistory as getSummaryScheduleHistory
} from '../controllers/whatsappSummaryScheduleController';
import { authMiddleware } from '../middleware/authMiddleware';

// WhatsApp Summary API Routes - Daily Summary Feature

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Group management routes
router.get('/groups', getAvailableGroups);
router.get('/groups/:groupId/stats', getGroupSummaryStats);
router.get('/groups/:groupId/date-ranges', getAvailableDateRanges);

// Summary retrieval routes
router.get('/summaries/recent', getRecentSummaries);

// Message retrieval routes
router.get('/groups/:groupId/messages', getGroupMessages);

// Schedule management routes
router.get('/schedules', getSummarySchedules);
router.post('/schedules', createSummarySchedule);
router.put('/schedules/:id', updateSummarySchedule);
router.patch('/schedules/:id/toggle', toggleSummarySchedule);
router.delete('/schedules/:id', deleteSummarySchedule);
router.post('/schedules/:id/run', runSummaryScheduleNow);
router.get('/schedules/:id/history', getSummaryScheduleHistory);

// Summary generation routes
router.post('/generate', generateDailySummary);
router.post('/generate-today', generateTodaySummary);

// Debug routes (only in non-production environments)
if (process.env.NODE_ENV !== 'production') {
  router.get('/debug/messages', debugMessages);
}

export default router;
