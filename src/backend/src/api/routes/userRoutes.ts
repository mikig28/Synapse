import express from 'express';
import { addMonitoredTelegramChat } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware'; // Your JWT protection middleware

const router = express.Router();

// @route   POST /api/v1/users/me/telegram-chats
// @desc    Add a Telegram chat ID to the authenticated user's monitored list
// @access  Private (requires JWT)
router.post('/me/telegram-chats', protect, addMonitoredTelegramChat);

// You can add other user-specific routes here, e.g.:
// router.get('/me', protect, getMyProfile);
// router.put('/me', protect, updateMyProfile);

export default router; 