import express from 'express';
import {
  getAllCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  syncWithGoogleCalendar,
  getSyncStatus,
  importFromGoogleCalendar,
  exportToGoogleCalendar,
  debugCalendarEvents,
} from '../controllers/calendarEventsController';
import { protect } from '../middleware/authMiddleware'; // Assuming you have this middleware

const router = express.Router();

// Apply protect middleware to all routes in this file
router.use(protect);

router.route('/')
  .get(getAllCalendarEvents)
  .post(createCalendarEvent);

router.route('/:id')
  .put(updateCalendarEvent)
  .delete(deleteCalendarEvent);

// Google Calendar sync routes
router.post('/sync', syncWithGoogleCalendar);
router.get('/sync/status', getSyncStatus);
router.post('/sync/import', importFromGoogleCalendar);
router.post('/sync/export', exportToGoogleCalendar);

// Debug route
router.get('/debug', debugCalendarEvents);

export default router;
