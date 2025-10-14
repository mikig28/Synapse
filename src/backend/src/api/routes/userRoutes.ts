import express from 'express';
import {
  addMonitoredTelegramChat,
  updateTelegramReportSettings,
  setTelegramBotToken,
  getTelegramBotStatus,
  removeTelegramBot,
  validateTelegramBotToken,
  removeMonitoredTelegramChat,
  testTelegramBotConnectivity,
} from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/me/telegram-chats', protect, addMonitoredTelegramChat);
router.put('/me/telegram-report-settings', protect, updateTelegramReportSettings);
// TODO: Implement these functions in userController
// router.get('/me/telegram-report-settings', protect, getTelegramReportSettings);
// router.put('/me/reminder-settings', protect, updateReminderSettings);
// router.get('/me/reminder-settings', protect, getReminderSettings);
router.post('/me/telegram-bot', protect, setTelegramBotToken);
router.get('/me/telegram-bot', protect, getTelegramBotStatus);
router.delete('/me/telegram-bot', protect, removeTelegramBot);
router.post('/me/telegram-bot/validate', protect, validateTelegramBotToken);
router.delete('/me/telegram-chats/:chatId', protect, removeMonitoredTelegramChat);
router.post('/me/telegram-bot/test', protect, testTelegramBotConnectivity);

export default router;
