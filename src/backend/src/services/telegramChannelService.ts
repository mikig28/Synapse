import TelegramBot from 'node-telegram-bot-api';
import TelegramChannel, { ITelegramChannel, ITelegramChannelMessage } from '../models/TelegramChannel';
import User from '../models/User';
import mongoose from 'mongoose';
import { io } from '../server';
import cron from 'node-cron';

class TelegramChannelService {
  private bot: TelegramBot;
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is required for channel monitoring');
    }
    this.bot = new TelegramBot(token, { polling: false });
    this.initializePeriodicFetch();
  }

  /**
   * Add a new channel to monitor
   */
  async addChannel(userId: string, channelIdentifier: string, keywords?: string[]): Promise<ITelegramChannel> {
    try {
      console.log(`[TelegramChannelService] Adding channel: ${channelIdentifier} for user: ${userId}`);

      // Validate channel exists and get info
      const channelInfo = await this.getChannelInfo(channelIdentifier);
      
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

      // Get channel history using getChat and getChatHistory would require MTProto
      // For now, we'll use a simpler approach with bot API limitations
      const messages = await this.getRecentChannelMessages(channel.channelId);

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
   * Get channel information
   */
  private async getChannelInfo(channelIdentifier: string): Promise<any> {
    try {
      // Try to get chat info - works for public channels/groups
      const chat = await this.bot.getChat(channelIdentifier);
      return chat;
    } catch (error) {
      console.error(`[TelegramChannelService] Error getting channel info for ${channelIdentifier}:`, error);
      throw new Error(`Cannot access channel ${channelIdentifier}. Make sure it's public or the bot is a member.`);
    }
  }

  /**
   * Get recent messages from channel (limited by Bot API)
   */
  private async getRecentChannelMessages(channelId: string): Promise<ITelegramChannelMessage[]> {
    // Note: Bot API has limitations for getting channel history
    // This is a simplified implementation - for full channel monitoring,
    // you'd need MTProto or the channel would need to forward messages to the bot
    
    try {
      // For now, return empty array as Bot API doesn't provide direct channel message history
      // In a full implementation, you'd use:
      // 1. MTProto client libraries
      // 2. Channel admin rights to receive messages
      // 3. RSS feeds if channel provides them
      // 4. Web scraping (not recommended)
      
      console.log(`[TelegramChannelService] Note: Bot API cannot fetch channel history directly for ${channelId}`);
      console.log(`[TelegramChannelService] Consider using MTProto or ensuring bot is admin in channel`);
      
      return [];
    } catch (error) {
      console.error(`[TelegramChannelService] Error fetching messages:`, error);
      return [];
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
          await this.fetchChannelMessages(channel._id.toString());
          // Add small delay between channels to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
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
