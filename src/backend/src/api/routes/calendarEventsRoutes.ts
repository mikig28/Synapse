import express from 'express';
import {
  getAllCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
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

export default router;
