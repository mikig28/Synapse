import express from 'express';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  sendTaskReminder
} from '../controllers/tasksController'; // Adjust path as necessary
import { protect } from '../middleware/authMiddleware'; // Assuming you have auth middleware

const router = express.Router();

router.get('/', protect, getTasks);
router.post('/', protect, createTask);
router.put('/:id', protect, updateTask);
router.delete('/:id', protect, deleteTask);
router.post('/send-reminder', protect, sendTaskReminder);

export default router; 