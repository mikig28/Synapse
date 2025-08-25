import { Response } from 'express';
import User, { IUser } from '../../models/User';
import { AuthenticatedRequest } from '../../types/express';
import { telegramBotManager } from '../../services/telegramBotManager';

// @desc    Add a Telegram chat ID to the user's monitored list
// @route   POST /api/v1/users/me/telegram-chats
// @access  Private
export const addMonitoredTelegramChat = async (req: AuthenticatedRequest, res: Response) => {
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
export const updateTelegramReportSettings = async (req: AuthenticatedRequest, res: Response) => {
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

// @desc    Set user's Telegram bot token
// @route   POST /api/v1/users/me/telegram-bot
// @access  Private
export const setTelegramBotToken = async (req: AuthenticatedRequest, res: Response) => {
  const { botToken } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID not found' });
  }

  if (!botToken || typeof botToken !== 'string') {
    return res.status(400).json({ message: 'Bot token is required and must be a string' });
  }

  try {
    console.log(`[setTelegramBotToken] Setting bot token for user: ${userId}`);

    // Validate and set bot via bot manager
    const result = await telegramBotManager.setBotForUser(userId, botToken);

    if (!result.success) {
      return res.status(400).json({ 
        message: 'Failed to set bot token',
        error: result.error 
      });
    }

    res.status(200).json({
      message: 'Telegram bot token set successfully',
      success: true,
      botInfo: {
        username: result.botInfo?.username,
        firstName: result.botInfo?.first_name,
        canJoinGroups: result.botInfo?.can_join_groups,
        canReadAllGroupMessages: result.botInfo?.can_read_all_group_messages,
        supportsInlineQueries: result.botInfo?.supports_inline_queries,
      }
    });
  } catch (error: any) {
    console.error('[SET_TELEGRAM_BOT_TOKEN_ERROR]', error);
    res.status(500).json({ message: 'Server error while setting Telegram bot token' });
  }
};

// @desc    Get user's Telegram bot status
// @route   GET /api/v1/users/me/telegram-bot
// @access  Private
export const getTelegramBotStatus = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID not found' });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if bot is active in manager
    const bot = telegramBotManager.getBotForUser(userId);
    const isActive = !!bot;

    res.status(200).json({
      hasBot: !!user.telegramBotToken,
      isActive: isActive && user.telegramBotActive,
      botUsername: user.telegramBotUsername,
      monitoredChats: user.monitoredTelegramChats?.length || 0,
      sendReportsToTelegram: user.sendAgentReportsToTelegram || false,
    });
  } catch (error: any) {
    console.error('[GET_TELEGRAM_BOT_STATUS_ERROR]', error);
    res.status(500).json({ message: 'Server error while getting Telegram bot status' });
  }
};

// @desc    Remove user's Telegram bot
// @route   DELETE /api/v1/users/me/telegram-bot
// @access  Private
export const removeTelegramBot = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID not found' });
  }

  try {
    const user = await User.findById(userId).select('+telegramBotToken');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Stop bot via manager
    await telegramBotManager.stopBotForUser(userId);

    // Clear bot info from database
    user.telegramBotToken = undefined;
    user.telegramBotUsername = undefined;
    user.telegramBotActive = false;
    await user.save();

    res.status(200).json({
      message: 'Telegram bot removed successfully',
      success: true
    });
  } catch (error: any) {
    console.error('[REMOVE_TELEGRAM_BOT_ERROR]', error);
    res.status(500).json({ message: 'Server error while removing Telegram bot' });
  }
};

// @desc    Validate Telegram bot token
// @route   POST /api/v1/users/me/telegram-bot/validate
// @access  Private
export const validateTelegramBotToken = async (req: AuthenticatedRequest, res: Response) => {
  const { botToken } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID not found' });
  }

  if (!botToken || typeof botToken !== 'string') {
    return res.status(400).json({ message: 'Bot token is required and must be a string' });
  }

  try {
    console.log(`[validateTelegramBotToken] Validating bot token for user: ${userId}`);

    // Validate token via bot manager
    const validation = await telegramBotManager.validateBotToken(botToken);

    if (!validation.isValid) {
      return res.status(400).json({
        valid: false,
        error: validation.error || 'Invalid bot token'
      });
    }

    res.status(200).json({
      valid: true,
      botInfo: {
        id: validation.botInfo?.id,
        username: validation.botInfo?.username,
        firstName: validation.botInfo?.first_name,
        canJoinGroups: validation.botInfo?.can_join_groups,
        canReadAllGroupMessages: validation.botInfo?.can_read_all_group_messages,
        supportsInlineQueries: validation.botInfo?.supports_inline_queries,
      }
    });
  } catch (error: any) {
    console.error('[VALIDATE_TELEGRAM_BOT_TOKEN_ERROR]', error);
    res.status(500).json({ message: 'Server error while validating Telegram bot token' });
  }
};

// @desc    Remove a Telegram chat ID from the user's monitored list
// @route   DELETE /api/v1/users/me/telegram-chats/:chatId
// @access  Private
export const removeMonitoredTelegramChat = async (req: AuthenticatedRequest, res: Response) => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID not found' });
  }

  const numericChatId = parseInt(chatId);
  if (isNaN(numericChatId)) {
    return res.status(400).json({ message: 'Chat ID must be a valid number' });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure monitoredTelegramChats is initialized as an array
    if (!user.monitoredTelegramChats) {
      user.monitoredTelegramChats = [];
    }

    const initialLength = user.monitoredTelegramChats.length;
    user.monitoredTelegramChats = user.monitoredTelegramChats.filter(id => id !== numericChatId);
    
    if (user.monitoredTelegramChats.length === initialLength) {
      return res.status(404).json({
        message: 'Chat ID not found in monitored list'
      });
    }

    await user.save();

    res.status(200).json({
      message: 'Telegram chat ID removed from monitored list',
      monitoredTelegramChats: user.monitoredTelegramChats,
    });
  } catch (error: any) {
    console.error('[REMOVE_TELEGRAM_CHAT_ERROR]', error);
    res.status(500).json({ message: 'Server error while removing Telegram chat ID' });
  }
};

// @desc    Test Telegram bot connectivity
// @route   POST /api/v1/users/me/telegram-bot/test
// @access  Private
export const testTelegramBotConnectivity = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Not authorized, user ID not found' });
  }

  try {
    console.log(`[testTelegramBotConnectivity] Testing bot connectivity for user: ${userId}`);

    // Get user to check if they have a bot configured
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.telegramBotToken) {
      return res.status(400).json({
        success: false,
        message: 'No bot token configured. Please set up your bot first.',
      });
    }

    // Test bot connectivity via bot manager
    const bot = telegramBotManager.getBotForUser(userId);
    if (!bot) {
      return res.status(400).json({
        success: false,
        message: 'Bot is not active. Please reconfigure your bot.',
      });
    }

    try {
      // Use getMe to test connectivity - returns User object from Telegram Bot API
      const botInfo = await bot.getMe();
      
      res.status(200).json({
        success: true,
        message: 'Bot is connected and working properly',
        details: {
          botId: botInfo.id,
          username: botInfo.username,
          firstName: botInfo.first_name,
          canJoinGroups: (botInfo as any).can_join_groups || false,
          canReadAllGroupMessages: (botInfo as any).can_read_all_group_messages || false,
          supportsInlineQueries: (botInfo as any).supports_inline_queries || false,
        }
      });
    } catch (botError: any) {
      console.error('[BOT_CONNECTIVITY_TEST_ERROR]', botError);
      
      let errorMessage = 'Bot connectivity test failed';
      if (botError.message) {
        if (botError.message.includes('Unauthorized')) {
          errorMessage = 'Bot token is invalid or revoked';
        } else if (botError.message.includes('Bad Request')) {
          errorMessage = 'Bad request to Telegram API';
        } else if (botError.message.includes('timeout')) {
          errorMessage = 'Request timed out - check internet connection';
        } else {
          errorMessage = `Telegram API error: ${botError.message}`;
        }
      }
      
      res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }

  } catch (error: any) {
    console.error('[TEST_TELEGRAM_BOT_CONNECTIVITY_ERROR]', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while testing bot connectivity' 
    });
  }
};
