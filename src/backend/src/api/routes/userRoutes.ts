import express from 'express';
import { 
  addMonitoredTelegramChat, 
  updateTelegramReportSettings,
  setTelegramBotToken,
  getTelegramBotStatus,
  removeTelegramBot,
  validateTelegramBotToken,
  removeMonitoredTelegramChat
} from '../controllers/userController';
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
// Telegram Bot Management Routes
// @route   POST /api/v1/users/me/telegram-bot
// @desc    Set user's Telegram bot token
// @access  Private (requires JWT)
router.post('/me/telegram-bot', protect, setTelegramBotToken);

// @route   GET /api/v1/users/me/telegram-bot
// @desc    Get user's Telegram bot status
// @access  Private (requires JWT)
router.get('/me/telegram-bot', protect, getTelegramBotStatus);

// @route   DELETE /api/v1/users/me/telegram-bot
// @desc    Remove user's Telegram bot
// @access  Private (requires JWT)
router.delete('/me/telegram-bot', protect, removeTelegramBot);

// @route   POST /api/v1/users/me/telegram-bot/validate
// @desc    Validate Telegram bot token
// @access  Private (requires JWT)
router.post('/me/telegram-bot/validate', protect, validateTelegramBotToken);

// @route   DELETE /api/v1/users/me/telegram-chats/:chatId
// @desc    Remove a Telegram chat ID from monitored list
// @access  Private (requires JWT)
router.delete('/me/telegram-chats/:chatId', protect, removeMonitoredTelegramChat);
