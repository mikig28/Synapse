import { Response } from 'express';
import User, { IUser } from '../../models/User';
import { AuthenticatedRequest } from '../../types/express';

// @desc    Add a Telegram chat ID to the user's monitored list
// @route   POST /api/v1/users/me/telegram-chats
// @access  Private
export const addMonitoredTelegramChat = async (req: AuthenticatedRequest, res: express.Response) => {
  const { chatId } = req.body;
  const userId = req.user?.id; // From authMiddleware
  console.log(`[addMonitoredTelegramChat] Attempting to find user with ID: ${userId}`); // <-- ADD THIS LOG

  if (!userId) {
    // This should technically be caught by authMiddleware, but as a safeguard:
    return res.status(401).json({ message: 'Not authorized, user ID not found' });
  }

  if (!chatId || typeof chatId !== 'number') {
    return res.status(400).json({ message: 'Chat ID is required and must be a number' });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure monitoredTelegramChats is initialized as an array if it's not already
    if (!user.monitoredTelegramChats) {
      user.monitoredTelegramChats = [];
    }

    if (user.monitoredTelegramChats.includes(chatId)) {
      return res.status(200).json({
        message: 'Chat ID already being monitored',
        monitoredTelegramChats: user.monitoredTelegramChats,
      });
    }

    user.monitoredTelegramChats.push(chatId);
    await user.save();

    res.status(200).json({
      message: 'Telegram chat ID added to monitored list',
      monitoredTelegramChats: user.monitoredTelegramChats,
    });
  } catch (error: any) {
    console.error('[ADD_TELEGRAM_CHAT_ERROR]', error);
    res.status(500).json({ message: 'Server error while adding Telegram chat ID' });
  }
};

// @desc    Update user's Telegram report settings
// @route   PUT /api/v1/users/me/telegram-report-settings
// @access  Private
export const updateTelegramReportSettings = async (req: AuthenticatedRequest, res: express.Response) => {
  const { sendAgentReportsToTelegram } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID not found' });
  }

  if (typeof sendAgentReportsToTelegram !== 'boolean') {
    return res.status(400).json({ message: 'sendAgentReportsToTelegram must be a boolean' });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.sendAgentReportsToTelegram = sendAgentReportsToTelegram;
    await user.save();

    res.status(200).json({
      message: 'Telegram report settings updated successfully',
      sendAgentReportsToTelegram: user.sendAgentReportsToTelegram,
    });
  } catch (error: any) {
    console.error('[UPDATE_TELEGRAM_REPORT_SETTINGS_ERROR]', error);
    res.status(500).json({ message: 'Server error while updating Telegram report settings' });
  }
};

// You can add other user-specific controller functions here later
// e.g., getMe, updateProfile, removeMonitoredTelegramChat, etc. 