import express from 'express';
import {
  createReminder,
  getReminderById,
  getReminders,
  getPendingReminders,
  updateReminder,
  cancelReminder,
  snoozeReminder,
  deleteReminder,
  getReminderStats
} from '../controllers/remindersController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// GET /api/v1/reminders/stats - Get reminder statistics for user
router.get('/stats', getReminderStats);

// GET /api/v1/reminders/pending - Get pending reminders for user
router.get('/pending', getPendingReminders);

// GET /api/v1/reminders - Get reminders with filters
router.get('/', getReminders);

// POST /api/v1/reminders - Create a new reminder
router.post('/', createReminder);

// GET /api/v1/reminders/:id - Get reminder by ID
router.get('/:id', getReminderById);

// PUT /api/v1/reminders/:id - Update reminder
router.put('/:id', updateReminder);

// POST /api/v1/reminders/:id/cancel - Cancel reminder
router.post('/:id/cancel', cancelReminder);

// POST /api/v1/reminders/:id/snooze - Snooze reminder
router.post('/:id/snooze', snoozeReminder);

// DELETE /api/v1/reminders/:id - Delete reminder
router.delete('/:id', deleteReminder);

export default router;
