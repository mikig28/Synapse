import TelegramBot from 'node-telegram-bot-api';
import TelegramChannel, { ITelegramChannel, ITelegramChannelMessage } from '../models/TelegramChannel';
import User from '../models/User';
import mongoose from 'mongoose';
import { io } from '../server';
import cron from 'node-cron';
import fetch from 'node-fetch';
import { telegramBotManager } from './telegramBotManager'; // Import bot manager

class TelegramChannelService {
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    console.log('[TelegramChannelService] Initialized with multi-user bot manager');
    this.initializePeriodicFetch();
  }

  /**
   * Add a new channel to monitor
   */
  async addChannel(userId: string, channelIdentifier: string, keywords?: string[]): Promise<ITelegramChannel> {
    try {
      console.log(`[TelegramChannelService] Adding channel: ${channelIdentifier} for user: ${userId}`);

      // Validate channel exists and get info
      const channelInfo = await this.getChannelInfo(channelIdentifier, userId);
      
      // Check if channel already exists for this user
      const existingChannel = await TelegramChannel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        channelId: channelInfo.id.toString()
      });

      if (existingChannel) {
        throw new Error('Channel is already being monitored');
      }

      // Create new channel record
      const newChannel = new TelegramChannel({
        userId: new mongoose.Types.ObjectId(userId),
        channelId: channelInfo.id.toString(),
        channelTitle: channelInfo.title,
        channelUsername: channelInfo.username,
        channelDescription: channelInfo.description,
        channelType: this.getChannelType(channelInfo.type),
        keywords: keywords || [],
        messages: [],
        isActive: true,
        totalMessages: 0
      });

      await newChannel.save();
      console.log(`[TelegramChannelService] ✅ Channel added: ${channelInfo.title}`);

      // Fetch initial messages
      await this.fetchChannelMessages(newChannel._id.toString());

      // Emit real-time update
      if (io) {
        io.emit('new_telegram_channel', {
          userId,
          channel: newChannel.toObject()
        });
      }

      return newChannel;
    } catch (error) {
      console.error(`[TelegramChannelService] Error adding channel ${channelIdentifier}:`, error);
      throw error;
    }
  }

  /**
   * Remove channel from monitoring
   */
  async removeChannel(userId: string, channelId: string): Promise<void> {
    try {
      const channel = await TelegramChannel.findOneAndDelete({
        userId: new mongoose.Types.ObjectId(userId),
        _id: new mongoose.Types.ObjectId(channelId)
      });

      if (!channel) {
        throw new Error('Channel not found or not owned by user');
      }

      // Stop cron job if exists
      const cronKey = `${userId}_${channelId}`;
      if (this.cronJobs.has(cronKey)) {
        this.cronJobs.get(cronKey)?.stop();
        this.cronJobs.delete(cronKey);
      }

      console.log(`[TelegramChannelService] ✅ Channel removed: ${channel.channelTitle}`);

      // Emit real-time update
      if (io) {
        io.emit('telegram_channel_removed', {
          userId,
          channelId
        });
      }
    } catch (error) {
      console.error(`[TelegramChannelService] Error removing channel:`, error);
      throw error;
    }
  }

  /**
   * Get all channels for a user
   */
  async getUserChannels(userId: string): Promise<ITelegramChannel[]> {
    try {
      return await TelegramChannel.find({
        userId: new mongoose.Types.ObjectId(userId)
      }).sort({ updatedAt: -1 });
    } catch (error) {
      console.error(`[TelegramChannelService] Error getting user channels:`, error);
      throw error;
    }
  }

  /**
   * Toggle channel active status
   */
  async toggleChannelStatus(userId: string, channelId: string, isActive: boolean): Promise<ITelegramChannel> {
    try {
      const channel = await TelegramChannel.findOneAndUpdate(
        {
          userId: new mongoose.Types.ObjectId(userId),
          _id: new mongoose.Types.ObjectId(channelId)
        },
        { isActive },
        { new: true }
      );

      if (!channel) {
        throw new Error('Channel not found or not owned by user');
      }

      console.log(`[TelegramChannelService] Channel ${channel.channelTitle} ${isActive ? 'activated' : 'deactivated'}`);
      return channel;
    } catch (error) {
      console.error(`[TelegramChannelService] Error toggling channel status:`, error);
      throw error;
    }
  }

  /**
   * Fetch messages from a specific channel
   */
  async fetchChannelMessages(channelDbId: string): Promise<void> {
    try {
      const channel = await TelegramChannel.findById(channelDbId);
      if (!channel || !channel.isActive) {
        return;
      }

      console.log(`[TelegramChannelService] Fetching messages for: ${channel.channelTitle}`);

      // Get messages using the user's bot instance
      const messages = await this.getRecentChannelMessages(channel.channelId, channel.userId.toString());

      if (messages.length > 0) {
        // Filter by keywords if specified
        const filteredMessages = this.filterMessagesByKeywords(messages, channel.keywords);
        
        // Add new messages to the channel
        const newMessages = filteredMessages.filter(msg => 
          !channel.messages.find(existing => existing.messageId === msg.messageId)
        );

        if (newMessages.length > 0) {
          channel.messages.push(...newMessages);
          channel.totalMessages += newMessages.length;
          channel.lastFetchedAt = new Date();
          
          if (newMessages.length > 0) {
            channel.lastFetchedMessageId = Math.max(...newMessages.map(m => m.messageId));
          }

          await channel.save();

          console.log(`[TelegramChannelService] ✅ Added ${newMessages.length} new messages for ${channel.channelTitle}`);

          // Emit real-time updates for new messages
          if (io && newMessages.length > 0) {
            io.emit('new_telegram_channel_messages', {
              userId: channel.userId.toString(),
              channelId: channel._id.toString(),
              messages: newMessages
            });
          }
        }
      }
    } catch (error) {
      console.error(`[TelegramChannelService] Error fetching channel messages:`, error);
    }
  }

  /**
   * Get channel information using user's bot
   */
  private async getChannelInfo(channelIdentifier: string, userId: string): Promise<any> {
    try {
      // Get the user's bot instance
      let bot = telegramBotManager.getBotForUser(userId);
      
      // If no bot found, try to initialize it
      if (!bot) {
        console.log(`[TelegramChannelService] No active bot found for user ${userId}, attempting to initialize...`);
        
        // Get user with bot token
        const user = await User.findById(userId).select('+telegramBotToken');
        if (user?.telegramBotToken && user.telegramBotActive) {
          console.log(`[TelegramChannelService] Found bot token for user ${userId}, initializing bot...`);
          const initResult = await telegramBotManager.setBotForUser(userId, user.telegramBotToken);
          
          if (initResult.success) {
            bot = telegramBotManager.getBotForUser(userId);
            console.log(`[TelegramChannelService] ✅ Successfully initialized bot for user ${userId}`);
          } else {
            console.error(`[TelegramChannelService] Failed to initialize bot for user ${userId}:`, initResult.error);
          }
        }
      }
      
      if (!bot) {
        throw new Error('No active bot found for user. Please configure your Telegram bot first.');
      }

      // Try to get chat info - works for public channels/groups
      const chat = await bot.getChat(channelIdentifier);
      return chat;
    } catch (error) {
      console.error(`[TelegramChannelService] Error getting channel info for ${channelIdentifier}:`, error);
      if ((error as Error).message.includes('chat not found')) {
        throw new Error(`Channel ${channelIdentifier} not found. Make sure it exists and is public.`);
      }
      throw new Error(`Cannot access channel ${channelIdentifier}. Make sure the bot is added to the group/channel with proper permissions.`);
    }
  }

  /**
   * Get recent messages from channel using proper bot instance
   */
  private async getRecentChannelMessages(channelId: string, userId: string): Promise<ITelegramChannelMessage[]> {
    try {
      // Get user's bot instance
      let bot = telegramBotManager.getBotForUser(userId);
      
      // If no bot found, try to initialize it
      if (!bot) {
        console.log(`[TelegramChannelService] No active bot found for user ${userId}, attempting to initialize...`);
        
        // Get user with bot token
        const user = await User.findById(userId).select('+telegramBotToken');
        if (user?.telegramBotToken && user.telegramBotActive) {
          console.log(`[TelegramChannelService] Found bot token for user ${userId}, initializing bot...`);
          const initResult = await telegramBotManager.setBotForUser(userId, user.telegramBotToken);
          
          if (initResult.success) {
            bot = telegramBotManager.getBotForUser(userId);
            console.log(`[TelegramChannelService] ✅ Successfully initialized bot for user ${userId}`);
          } else {
            console.error(`[TelegramChannelService] Failed to initialize bot for user ${userId}:`, initResult.error);
          }
        }
      }
      
      if (!bot) {
        throw new Error('No active bot found for user. Please configure your Telegram bot first.');
      }

      // For groups and channels, messages will be received via the main message handler
      // This method now focuses on checking if the bot has proper access
      
      try {
        // Verify bot can access the chat
        const chat = await bot.getChat(channelId);
        console.log(`[TelegramChannelService] Chat accessible for ${channelId}:`, {
          id: chat.id,
          title: chat.title,
          type: chat.type,
          username: chat.username
        });

        // Check if this chat is being monitored by the user
        const user = await User.findById(userId);
        if (!user) {
          throw new Error('User not found');
        }

        const chatIdNum = typeof chat.id === 'string' ? parseInt(chat.id) : chat.id;
        
        // Add chat to monitored chats if not already there
        if (!user.monitoredTelegramChats?.includes(chatIdNum)) {
          if (!user.monitoredTelegramChats) {
            user.monitoredTelegramChats = [];
          }
          user.monitoredTelegramChats.push(chatIdNum);
          await user.save();
          console.log(`[TelegramChannelService] ✅ Added chat ${chatIdNum} to monitored chats for user ${userId}`);
        }

        // Clear any previous errors
        await TelegramChannel.findOneAndUpdate(
          { channelId, userId: new mongoose.Types.ObjectId(userId) },
          { $unset: { lastError: 1 } }
        );

        console.log(`[TelegramChannelService] ✅ Bot has access to ${channelId}. Messages will be received in real-time.`);
        return []; // Real-time messages will be handled by the main message handler
        
      } catch (accessError) {
        console.error(`[TelegramChannelService] ❌ Bot cannot access ${channelId}:`, accessError);
        
        // Update channel with specific error
        const errorMessage = this.getPermissionErrorMessage(channelId, (accessError as Error).message);
        await TelegramChannel.findOneAndUpdate(
          { channelId, userId: new mongoose.Types.ObjectId(userId) },
          { 
            $set: { 
              lastError: errorMessage,
              lastFetchedAt: new Date()
            }
          }
        );
        
        throw new Error(errorMessage);
      }
      
    } catch (error) {
      console.error(`[TelegramChannelService] Error in getRecentChannelMessages:`, error);
      throw error;
    }
  }

  /**
   * Get user-friendly error message for permission issues
   */
  private getPermissionErrorMessage(channelId: string, originalError: string): string {
    if (originalError.includes('chat not found')) {
      return 'Channel/group not found. Make sure it exists and is accessible.';
    }
    
    if (channelId.startsWith('@')) {
      return 'Bot needs to be added as administrator with "Read Messages" permission to this channel.';
    } else {
      return 'Bot needs to be added as a member to this group/supergroup.';
    }
  }

  /**
   * Try to fetch messages via RSS feed for public channels
   */
  private async tryRSSFeed(channelId: string): Promise<ITelegramChannelMessage[]> {
    try {
      const channelName = channelId.replace('@', '');
      const rssUrl = `https://rsshub.app/telegram/channel/${channelName}`;
      
      console.log(`[TelegramChannelService] 🔄 Trying RSS feed: ${rssUrl}`);
      
      // Note: This is a basic implementation
      // In production, you'd want to:
      // 1. Use a proper RSS parser library
      // 2. Handle different RSS feed formats
      // 3. Cache feed results
      // 4. Handle rate limiting
      
      const response = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'TelegramChannelMonitor/1.0'
        },
        timeout: 10000
      });
      
      if (!response.ok) {
        console.log(`[TelegramChannelService] RSS feed not available for ${channelId}`);
        return [];
      }
      
      const rssText = await response.text();
      
      // Basic RSS parsing (you'd want to use a proper XML parser in production)
      const messages: ITelegramChannelMessage[] = [];
      
      // This is a simplified example - in production use a proper RSS parser
      const itemMatches = rssText.match(/<item>[\s\S]*?<\/item>/g) || [];
      
      for (const item of itemMatches.slice(0, 10)) { // Limit to 10 recent items
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1];
        const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1];
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
        
        if (title && pubDate) {
          const message: ITelegramChannelMessage = {
            messageId: Math.floor(Math.random() * 1000000), // RSS doesn't have message IDs
            text: description || title,
            date: new Date(pubDate),
            author: channelName,
            urls: this.extractUrls(description || title),
            hashtags: this.extractHashtags(description || title)
          };
          
          messages.push(message);
        }
      }
      
      return messages;
      
    } catch (error) {
      console.log(`[TelegramChannelService] RSS feed failed for ${channelId}:`, error);
      return [];
    }
  }

  /**
   * Convert Telegram message to channel message format
   */
  private convertToChannelMessage(message: any): ITelegramChannelMessage | null {
    try {
      const channelMessage: ITelegramChannelMessage = {
        messageId: message.message_id,
        text: message.text || message.caption,
        date: new Date(message.date * 1000),
        author: message.from?.username || message.from?.first_name,
        views: message.views || 0,
        forwards: message.forward_from ? 1 : 0,
      };

      // Extract URLs
      if (message.entities) {
        channelMessage.urls = this.extractUrlsFromEntities(message.text || message.caption, message.entities);
      }

      // Extract hashtags
      if (channelMessage.text) {
        channelMessage.hashtags = this.extractHashtags(channelMessage.text);
      }

      // Handle media
      if (message.photo) {
        channelMessage.mediaType = 'photo';
        channelMessage.mediaFileId = message.photo[message.photo.length - 1].file_id;
      } else if (message.video) {
        channelMessage.mediaType = 'video';
        channelMessage.mediaFileId = message.video.file_id;
      } else if (message.document) {
        channelMessage.mediaType = 'document';
        channelMessage.mediaFileId = message.document.file_id;
      } else if (message.audio) {
        channelMessage.mediaType = 'audio';
        channelMessage.mediaFileId = message.audio.file_id;
      } else if (message.voice) {
        channelMessage.mediaType = 'voice';
        channelMessage.mediaFileId = message.voice.file_id;
      }

      return channelMessage;
    } catch (error) {
      console.error(`[TelegramChannelService] Error converting message:`, error);
      return null;
    }
  }

  /**
   * Filter messages by keywords
   */
  private filterMessagesByKeywords(messages: ITelegramChannelMessage[], keywords?: string[]): ITelegramChannelMessage[] {
    if (!keywords || keywords.length === 0) {
      return messages;
    }

    return messages.filter(message => {
      if (!message.text) return false;
      
      const lowerText = message.text.toLowerCase();
      return keywords.some(keyword => 
        lowerText.includes(keyword.toLowerCase())
      );
    });
  }

  /**
   * Determine channel type from Telegram chat type
   */
  private getChannelType(telegramType: string): 'channel' | 'group' | 'supergroup' {
    switch (telegramType) {
      case 'channel':
        return 'channel';
      case 'group':
        return 'group';
      case 'supergroup':
        return 'supergroup';
      default:
        return 'channel';
    }
  }

  /**
   * Extract URLs from message text
   */
  private extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return text.match(urlRegex) || [];
  }

  /**
   * Extract URLs from Telegram message entities
   */
  private extractUrlsFromEntities(text: string | undefined, entities: any[]): string[] {
    if (!text || !entities) return [];
    
    const urls: string[] = [];
    for (const entity of entities) {
      if (entity.type === 'url') {
        urls.push(text.substring(entity.offset, entity.offset + entity.length));
      } else if (entity.type === 'text_link' && entity.url) {
        urls.push(entity.url);
      }
    }
    return urls;
  }

  /**
   * Extract hashtags from message text
   */
  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#[^\s#]+/g;
    return text.match(hashtagRegex) || [];
  }

  /**
   * Initialize periodic fetching for all active channels
   */
  private initializePeriodicFetch(): void {
    // Run every 30 minutes to fetch new messages from all active channels
    cron.schedule('*/30 * * * *', async () => {
      console.log('[TelegramChannelService] Running periodic channel message fetch...');
      
      try {
        const activeChannels = await TelegramChannel.find({ isActive: true });
        console.log(`[TelegramChannelService] Found ${activeChannels.length} active channels to fetch`);

        for (const channel of activeChannels) {
          try {
            await this.fetchChannelMessages(channel._id.toString());
            // Add small delay between channels to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (error) {
            console.error(`[TelegramChannelService] Error fetching messages for channel ${channel.channelTitle}:`, error);
          }
        }
      } catch (error) {
        console.error('[TelegramChannelService] Error in periodic fetch:', error);
      }
    });

    console.log('[TelegramChannelService] ✅ Periodic fetching initialized (every 30 minutes)');
  }

  /**
   * Search messages across user's channels
   */
  async searchChannelMessages(userId: string, query: string, channelId?: string): Promise<any> {
    try {
      const matchConditions: any = {
        userId: new mongoose.Types.ObjectId(userId)
      };

      if (channelId) {
        matchConditions._id = new mongoose.Types.ObjectId(channelId);
      }

      const results = await TelegramChannel.aggregate([
        { $match: matchConditions },
        { $unwind: '$messages' },
        {
          $match: {
            'messages.text': { $regex: query, $options: 'i' }
          }
        },
        {
          $project: {
            channelTitle: 1,
            channelUsername: 1,
            message: '$messages',
            _id: 1
          }
        },
        { $sort: { 'message.date': -1 } },
        { $limit: 50 }
      ]);

      return results;
    } catch (error) {
      console.error('[TelegramChannelService] Error searching messages:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const telegramChannelService = new TelegramChannelService();
export default telegramChannelService;
