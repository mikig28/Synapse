import TelegramBot from 'node-telegram-bot-api';
import User, { IUser } from '../models/User';
import mongoose from 'mongoose';
import { EventEmitter } from 'events';

interface BotInstance {
  bot: TelegramBot;
  userId: string;
  username: string;
  isActive: boolean;
  createdAt: Date;
  lastActivity?: Date;
}

interface BotValidationResult {
  isValid: boolean;
  botInfo?: any;
  username?: string;
  error?: string;
}

class TelegramBotManager extends EventEmitter {
  private botInstances: Map<string, BotInstance> = new Map(); // userId -> BotInstance
  private tokenToUserId: Map<string, string> = new Map(); // botToken -> userId
  private readonly MAX_INACTIVE_TIME = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    super();
    this.startCleanupTimer();
  }

  /**
   * Validate a Telegram bot token and get bot info
   */
  async validateBotToken(token: string): Promise<BotValidationResult> {
    try {
      // Create temporary bot instance to test the token
      const testBot = new TelegramBot(token, { polling: false });
      
      // Get bot information
      const botInfo = await testBot.getMe();
      
      return {
        isValid: true,
        botInfo,
        username: botInfo.username
      };
    } catch (error) {
      console.error('[TelegramBotManager] Bot token validation failed:', error);
      return {
        isValid: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Add or update a user's bot token
   */
  async setBotForUser(userId: string, botToken: string): Promise<{ success: boolean; error?: string; botInfo?: any }> {
    try {
      console.log(`[TelegramBotManager] Setting bot for user: ${userId}`);

      // Validate the token first
      const validation = await this.validateBotToken(botToken);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error || 'Invalid bot token'
        };
      }

      // Check if token is already used by another user
      if (this.tokenToUserId.has(botToken) && this.tokenToUserId.get(botToken) !== userId) {
        return {
          success: false,
          error: 'Bot token is already in use by another user'
        };
      }

      // Stop existing bot for user if any
      await this.stopBotForUser(userId);

      // Update user in database
      const user = await User.findById(userId).select('+telegramBotToken');
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Remove old token mapping if exists
      if (user.telegramBotToken && this.tokenToUserId.get(user.telegramBotToken) === userId) {
        this.tokenToUserId.delete(user.telegramBotToken);
      }

      // Update user with new bot info
      user.telegramBotToken = botToken;
      user.telegramBotUsername = validation.username;
      user.telegramBotActive = true;
      await user.save();

      // Create new bot instance
      const bot = new TelegramBot(botToken, { polling: true });
      
      const botInstance: BotInstance = {
        bot,
        userId,
        username: validation.username || 'Unknown',
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date()
      };

      // Store mappings
      this.botInstances.set(userId, botInstance);
      this.tokenToUserId.set(botToken, userId);

      // Setup message handlers for this user's bot
      this.setupBotHandlers(botInstance);

      console.log(`[TelegramBotManager] ✅ Bot ${validation.username} activated for user ${userId}`);

      this.emit('botActivated', { userId, username: validation.username });

      return {
        success: true,
        botInfo: validation.botInfo
      };

    } catch (error) {
      console.error(`[TelegramBotManager] Error setting bot for user ${userId}:`, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Stop bot for a specific user
   */
  async stopBotForUser(userId: string): Promise<void> {
    try {
      const botInstance = this.botInstances.get(userId);
      if (botInstance) {
        console.log(`[TelegramBotManager] Stopping bot for user: ${userId}`);
        
        // Stop polling
        botInstance.bot.stopPolling();
        botInstance.isActive = false;
        
        // Remove from maps
        this.botInstances.delete(userId);
        
        // Find and remove token mapping
        for (const [token, mappedUserId] of this.tokenToUserId.entries()) {
          if (mappedUserId === userId) {
            this.tokenToUserId.delete(token);
            break;
          }
        }

        // Update user in database
        const user = await User.findById(userId);
        if (user) {
          user.telegramBotActive = false;
          await user.save();
        }

        this.emit('botDeactivated', { userId, username: botInstance.username });
      }
    } catch (error) {
      console.error(`[TelegramBotManager] Error stopping bot for user ${userId}:`, error);
    }
  }

  /**
   * Get bot instance for a specific user
   */
  getBotForUser(userId: string): TelegramBot | null {
    const botInstance = this.botInstances.get(userId);
    if (botInstance && botInstance.isActive) {
      botInstance.lastActivity = new Date();
      return botInstance.bot;
    }
    return null;
  }

  /**
   * Get user ID by chat ID (from any user's bot)
   */
  async getUserByChatId(chatId: number): Promise<string | null> {
    try {
      // Find user who has this chat ID in their monitored chats
      const user = await User.findOne({ monitoredTelegramChats: chatId });
      return user?._id?.toString() || null;
    } catch (error) {
      console.error(`[TelegramBotManager] Error finding user by chat ID ${chatId}:`, error);
      return null;
    }
  }

  /**
   * Get all active bot instances
   */
  getActiveBots(): Array<{ userId: string; username: string; isActive: boolean }> {
    return Array.from(this.botInstances.values()).map(instance => ({
      userId: instance.userId,
      username: instance.username,
      isActive: instance.isActive
    }));
  }

  /**
   * Initialize bots for all users who have active tokens
   */
  async initializeExistingBots(): Promise<void> {
    try {
      console.log('[TelegramBotManager] Initializing existing user bots...');
      
      const usersWithBots = await User.find({ 
        telegramBotToken: { $exists: true, $ne: null },
        telegramBotActive: true 
      }).select('+telegramBotToken');

      console.log(`[TelegramBotManager] Found ${usersWithBots.length} users with active bots`);

      for (const user of usersWithBots) {
        if (user.telegramBotToken) {
          const result = await this.setBotForUser(user._id.toString(), user.telegramBotToken);
          if (result.success) {
            console.log(`[TelegramBotManager] ✅ Initialized bot for user: ${user.email}`);
          } else {
            console.log(`[TelegramBotManager] ❌ Failed to initialize bot for user ${user.email}: ${result.error}`);
            // Mark bot as inactive in database
            user.telegramBotActive = false;
            await user.save();
          }
        }
      }

      console.log(`[TelegramBotManager] Bot initialization complete. Active bots: ${this.botInstances.size}`);
    } catch (error) {
      console.error('[TelegramBotManager] Error initializing existing bots:', error);
    }
  }

  /**
   * Setup message handlers for a bot instance
   */
  private setupBotHandlers(botInstance: BotInstance): void {
    const { bot, userId } = botInstance;

    // Basic message handler (for groups and private chats)
    bot.on('message', async (msg: TelegramBot.Message) => {
      botInstance.lastActivity = new Date();
      this.emit('message', { userId, message: msg, bot });
    });

    // Channel post handler (for channels)
    bot.on('channel_post', async (msg: TelegramBot.Message) => {
      botInstance.lastActivity = new Date();
      this.emit('message', { userId, message: msg, bot });
    });

    // Polling error handler
    bot.on('polling_error', (error) => {
      console.error(`[TelegramBotManager] Polling error for user ${userId}:`, error.message);
      this.emit('botError', { userId, error: error.message });
    });

    // Webhook error handler
    bot.on('webhook_error', (error) => {
      console.error(`[TelegramBotManager] Webhook error for user ${userId}:`, error.message);
      this.emit('botError', { userId, error: error.message });
    });

    console.log(`[TelegramBotManager] ✅ Handlers setup for bot of user: ${userId}`);
  }

  /**
   * Start cleanup timer for inactive bots
   */
  private startCleanupTimer(): void {
    setInterval(async () => {
      const now = new Date();
      const inactiveUserIds: string[] = [];

      for (const [userId, botInstance] of this.botInstances.entries()) {
        if (botInstance.lastActivity) {
          const inactiveTime = now.getTime() - botInstance.lastActivity.getTime();
          if (inactiveTime > this.MAX_INACTIVE_TIME) {
            inactiveUserIds.push(userId);
          }
        }
      }

      // Clean up inactive bots
      for (const userId of inactiveUserIds) {
        console.log(`[TelegramBotManager] Cleaning up inactive bot for user: ${userId}`);
        await this.stopBotForUser(userId);
      }

      if (inactiveUserIds.length > 0) {
        console.log(`[TelegramBotManager] Cleaned up ${inactiveUserIds.length} inactive bots`);
      }
    }, 60 * 60 * 1000); // Check every hour

    console.log('[TelegramBotManager] ✅ Cleanup timer started');
  }

  /**
   * Send a message using a specific user's bot
   */
  async sendMessage(userId: string, chatId: number, message: string, options?: any): Promise<boolean> {
    try {
      const bot = this.getBotForUser(userId);
      if (!bot) {
        console.error(`[TelegramBotManager] No active bot found for user: ${userId}`);
        return false;
      }

      await bot.sendMessage(chatId, message, options);
      return true;
    } catch (error) {
      console.error(`[TelegramBotManager] Error sending message for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get statistics
   */
  getStats(): { totalBots: number; activeBots: number; inactiveBots: number } {
    const totalBots = this.botInstances.size;
    const activeBots = Array.from(this.botInstances.values()).filter(b => b.isActive).length;
    const inactiveBots = totalBots - activeBots;

    return { totalBots, activeBots, inactiveBots };
  }

  /**
   * Shutdown all bots (for graceful shutdown)
   */
  async shutdown(): Promise<void> {
    console.log('[TelegramBotManager] Shutting down all bots...');
    
    for (const userId of this.botInstances.keys()) {
      await this.stopBotForUser(userId);
    }

    console.log('[TelegramBotManager] ✅ All bots shut down');
  }
}

// Create singleton instance
export const telegramBotManager = new TelegramBotManager();
export default telegramBotManager;