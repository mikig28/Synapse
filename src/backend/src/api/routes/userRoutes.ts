import express from 'express';
import { addMonitoredTelegramChat, updateTelegramReportSettings } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware'; // Your JWT protection middleware

const router = express.Router();

// @route   POST /api/v1/users/me/telegram-chats
// @desc    Add a Telegram chat ID to the authenticated user's monitored list
// @access  Private (requires JWT)
router.post('/me/telegram-chats', protect, addMonitoredTelegramChat);

// @route   PUT /api/v1/users/me/telegram-report-settings
// @desc    Update user's Telegram report settings
// @access  Private (requires JWT)
router.put('/me/telegram-report-settings', protect, updateTelegramReportSettings);

// You can add other user-specific routes here, e.g.:
// router.get('/me', protect, getMyProfile);
// router.put('/me', protect, updateMyProfile);

export default router; 