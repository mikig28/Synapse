import TelegramBot from 'node-telegram-bot-api';
import TelegramChannel, { ITelegramChannel, ITelegramChannelMessage } from '../models/TelegramChannel';
import User from '../models/User';
import mongoose from 'mongoose';
import { io } from '../server';
import cron from 'node-cron';
import Parser from 'rss-parser';
import { telegramBotManager } from './telegramBotManager'; // Import bot manager
import telegramMtprotoService from './telegramMtprotoService';

class TelegramChannelService {
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private rssParser: Parser<any>;

  constructor() {
    console.log('[TelegramChannelService] Initialized with multi-user bot manager');
    this.initializePeriodicFetch();
    this.setupBotMessageListeners();
    this.rssParser = new Parser({ timeout: 10000 });
  }

  /**
   * Add a new channel to monitor
   */
  async addChannel(userId: string, channelIdentifier: string, keywords?: string[]): Promise<ITelegramChannel> {
    try {
      console.log(`[TelegramChannelService] Adding channel: ${channelIdentifier} for user: ${userId}`);

      // First, try to resolve channel info via Bot API
      let channelInfo: any | null = null;
      try {
        channelInfo = await this.getChannelInfo(channelIdentifier, userId);
      } catch (infoErr) {
        console.warn(`[TelegramChannelService] getChannelInfo failed for ${channelIdentifier}:`, (infoErr as Error).message);
        // Fallback: if it's a public channel by @username, allow adding without immediate bot access
        if (!channelIdentifier.startsWith('@')) {
          // For non-@ identifiers, we must have a resolvable chat
          throw infoErr;
        }
      }
      
      // Determine a unique channelId key we will store
      const resolvedChannelId = channelInfo?.id ? channelInfo.id.toString() : channelIdentifier; // use @username fallback

      // Check if channel already exists for this user (by either numeric id or @username)
      const existingChannel = await TelegramChannel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        channelId: resolvedChannelId
      });

      if (existingChannel) {
        throw new Error('Channel is already being monitored');
      }

      // Create new channel record (fill what we know)
      const newChannel = new TelegramChannel({
        userId: new mongoose.Types.ObjectId(userId),
        channelId: resolvedChannelId,
        channelTitle: channelInfo?.title || (channelIdentifier.startsWith('@') ? channelIdentifier.slice(1) : resolvedChannelId),
        channelUsername: channelInfo?.username || (channelIdentifier.startsWith('@') ? channelIdentifier.slice(1) : undefined),
        channelDescription: channelInfo?.description,
        channelType: this.getChannelType(channelInfo?.type || (channelIdentifier.startsWith('@') ? 'channel' : 'group')),
        keywords: keywords || [],
        messages: [],
        isActive: true,
        totalMessages: 0
      });

      await newChannel.save();
      console.log(`[TelegramChannelService] ✅ Channel added: ${newChannel.channelTitle}`);

      // Emit real-time update IMMEDIATELY so UI reflects the new channel without waiting
      if (io) {
        io.emit('new_telegram_channel', {
          userId,
          channel: newChannel.toObject()
        });
      }

      // Fetch initial messages in the background (non-blocking)
      // This avoids long waits/timeouts on the addChannel API
      this.fetchChannelMessages(newChannel._id.toString())
        .catch((err) => {
          const msg = (err as Error).message;
          // Log concise error; detailed logging is handled inside fetchChannelMessages
          console.error(`[TelegramChannelService] Background fetch failed for ${newChannel.channelTitle}: ${msg}`);
        });

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
    let channel: ITelegramChannel | null = null;

    try {
      channel = await TelegramChannel.findById(channelDbId);
      if (!channel || !channel.isActive) {
        return;
      }

      console.log(`[TelegramChannelService] Fetching messages for: ${channel.channelTitle}`);

      if (channel.lastError && channel.lastFetchedAt) {
        const timeSinceLastError = Date.now() - channel.lastFetchedAt.getTime();
        const errorCooldown = 30 * 60 * 1000;

        if (timeSinceLastError < errorCooldown) {
          console.log(`[TelegramChannelService] Skipping ${channel.channelTitle} - in error cooldown (${Math.round(timeSinceLastError / 1000 / 60)} min ago)`);
          return;
        }
      }

      let botMessages: ITelegramChannelMessage[] = [];
      try {
        botMessages = await this.getRecentChannelMessages(channel.channelId, channel.userId.toString());
      } catch (botFetchError) {
        console.error(`[TelegramChannelService] Error fetching messages via bot for ${channel.channelTitle}:`, (botFetchError as Error).message);
      }

      const mtprotoMessages = await this.fetchMessagesViaMtproto(channel);
      const messages = this.mergeMessageLists(mtprotoMessages, botMessages);

      if (messages.length > 0) {
        const highestMessageId = messages.reduce((acc, message) => Math.max(acc, message.messageId), channel.lastFetchedMessageId || 0);
        channel.lastFetchedMessageId = highestMessageId;

        const filteredMessages = this.filterMessagesByKeywords(messages, channel.keywords);
        const newMessages = filteredMessages.filter(msg => !channel.messages.find(existing => existing.messageId === msg.messageId));

        if (newMessages.length > 0) {
          channel.messages.push(...newMessages);
          channel.totalMessages += newMessages.length;

          if (io) {
            io.emit('new_telegram_channel_messages', {
              userId: channel.userId.toString(),
              channelId: channel._id.toString(),
              messages: newMessages
            });
          }
        }

        channel.lastFetchedAt = new Date();
        await channel.save();

        if (newMessages.length > 0) {
          console.log(`[TelegramChannelService] ✅ Added ${newMessages.length} new messages for ${channel.channelTitle}`);
        }
      } else {
        channel.lastFetchedAt = new Date();
        await channel.save();
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error(`[TelegramChannelService] Error fetching channel messages for ${channel?.channelTitle || 'unknown'}:`, errorMessage);

      if (!errorMessage.includes('Channel/group not found') &&
          !errorMessage.includes('Bot needs to be added') &&
          !errorMessage.includes('No active bot found')) {
        console.error('Full error details:', error);
      }
    }
  }

  /**
   * Get channel information using user's bot
   */
  private async getChannelInfo(channelIdentifier: string, userId: string): Promise<{
    id: string | number;
    title: string;
    username?: string;
    description?: string;
    type?: string;
  } | null> {
    let botError: Error | null = null;
    let bot: TelegramBot | null = telegramBotManager.getBotForUser(userId);

    try {
      if (!bot) {
        console.log(`[TelegramChannelService] No active bot found for user ${userId}, attempting to initialize...`);

        const user = await User.findById(userId).select('+telegramBotToken');
        if (user?.telegramBotToken && user.telegramBotActive) {
          console.log(`[TelegramChannelService] Found bot token for user ${userId}, initializing bot...`);
          const initResult = await telegramBotManager.setBotForUser(userId, user.telegramBotToken);

          if (initResult.success) {
            bot = telegramBotManager.getBotForUser(userId);
            console.log(`[TelegramChannelService] ✅ Successfully initialized bot for user ${userId}`);
          } else if (initResult.error) {
            botError = new Error(initResult.error);
          }
        } else {
          botError = new Error('No active bot found for user.');
        }
      }

      if (bot) {
        const chat = await bot.getChat(channelIdentifier);
        return {
          id: typeof chat.id === 'number' ? chat.id.toString() : chat.id,
          title: chat.title || channelIdentifier,
          username: (chat as any).username,
          description: (chat as any).description || (chat as any).bio,
          type: (chat as any).type
        };
      }
    } catch (error) {
      botError = error as Error;
      console.warn(`[TelegramChannelService] Bot channel lookup failed for ${channelIdentifier}:`, botError.message);
    }

    if (telegramMtprotoService.isConfigured()) {
      try {
        const mtprotoInfo = await telegramMtprotoService.getChannelInfo(channelIdentifier);
        if (mtprotoInfo) {
          return mtprotoInfo;
        }
      } catch (mtprotoError) {
        console.error(`[TelegramChannelService] MTProto channel lookup failed for ${channelIdentifier}:`, mtprotoError);
      }
    }

    if (botError) {
      if (botError.message.includes('chat not found')) {
        throw new Error(`Channel ${channelIdentifier} not found. Make sure it exists, is public, or that the MTProto service account has joined it.`);
      }
      throw new Error(`Cannot access channel ${channelIdentifier}. ${botError.message}`);
    }

    if (!channelIdentifier.startsWith('@')) {
      throw new Error(`Cannot access channel ${channelIdentifier}. Invite the monitoring service account or configure a bot.`);
    }

    return null;
  }


  /**
   * Get recent messages from channel using proper bot instance
   */
  private async getRecentChannelMessages(channelId: string, userId: string): Promise<ITelegramChannelMessage[]> {
    try {
      const isPublicChannel = channelId.startsWith('@');

      // Get user's bot instance
      let bot = telegramBotManager.getBotForUser(userId);

      // If no bot found, try to initialize it from stored token
      if (!bot) {
        console.log(`[TelegramChannelService] No active bot found for user ${userId}, attempting to initialize...`);

        const user = await User.findById(userId).select('+telegramBotToken');
        if (user?.telegramBotToken && user.telegramBotActive) {
          console.log(`[TelegramChannelService] Found bot token for user ${userId}, initializing bot...`);
          const initResult = await telegramBotManager.setBotForUser(userId, user.telegramBotToken);

          if (initResult.success) {
            bot = telegramBotManager.getBotForUser(userId);
            console.log(`[TelegramChannelService] ✅ Successfully initialized bot for user ${userId}`);
          } else {
            console.error(`[TelegramChannelService] Failed to initialize bot for user ${userId}:`, initResult.error);
            await this.markChannelWithError(channelId, userId, `Bot initialization failed: ${initResult.error}`);
            return [];
          }
        }
      }

      if (!bot) {
        // No active bot available – provide RSS fallback for public channels if possible
        const fallbackMessages = await this.handleNoBotFallback(channelId, userId, isPublicChannel);
        return fallbackMessages;
      }

      // For groups and channels, messages will be received via the main message handler
      // This method now focuses on checking if the bot has proper access
      
      try {
        // Verify bot can access the chat with timeout
        const chat = await Promise.race([
          bot.getChat(channelId),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ]) as any;
        
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

        console.log(`[TelegramChannelService] ✅ Bot has access to ${channelId}. Bot is ready for real-time monitoring.`);
        
        // Since the bot is in polling mode, we cannot use getUpdates() as it conflicts with polling
        // Instead, we rely on real-time message handlers and RSS feeds for historical data
        const channelMessages: ITelegramChannelMessage[] = [];
        
        // For public channels, try RSS feed to get some historical messages
        if (channelId.startsWith('@')) {
          console.log(`[TelegramChannelService] Attempting RSS fallback for historical messages: ${channelId}`);
          try {
            const rssMessages = await this.tryRSSFeedFromRSS(channelId);
            channelMessages.push(...rssMessages.slice(0, 10)); // Limit RSS messages
            console.log(`[TelegramChannelService] Retrieved ${rssMessages.length} messages from RSS feed for ${channelId}`);
          } catch (rssError) {
            console.error(`[TelegramChannelService] RSS fallback failed for ${channelId}:`, rssError);
          }
        }
        
        // Log that real-time monitoring is active
        console.log(`[TelegramChannelService] Bot is configured for real-time monitoring of ${channelId}. New messages will be received automatically.`);
        
        return channelMessages;
        
      } catch (accessError) {
        console.error(`[TelegramChannelService] ❌ Bot cannot access ${channelId}:`, accessError);
        
        // Update channel with specific error
        const errorMessage = this.getPermissionErrorMessage(channelId, (accessError as Error).message);
        await this.markChannelWithError(channelId, userId, errorMessage);
        
        // Attempt RSS fallback for public channels even when bot cannot access
        if (channelId.startsWith('@')) {
          try {
            const rssMessages = await this.tryRSSFeedFromRSS(channelId);
            if (rssMessages.length > 0) {
              // Append RSS messages to channel
              const channelDoc = await TelegramChannel.findOne({ channelId, userId: new mongoose.Types.ObjectId(userId) });
              if (channelDoc) {
                const newMessages = rssMessages.filter(msg => !channelDoc.messages.find(existing => existing.messageId === msg.messageId));
                if (newMessages.length > 0) {
                  channelDoc.messages.push(...newMessages);
                  channelDoc.totalMessages += newMessages.length;
                  channelDoc.lastFetchedAt = new Date();
                  await channelDoc.save();

                  // Emit real-time updates for new messages
                  if (io) {
                    io.emit('new_telegram_channel_messages', {
                      userId: userId,
                      channelId: channelDoc._id.toString(),
                      messages: newMessages
                    });
                  }
                }
              }
            }
          } catch (rssErr) {
            console.error(`[TelegramChannelService] RSS fallback failed after access error for ${channelId}:`, rssErr);
          }
        }
        
        // Return empty array so callers can continue gracefully without failing the add flow
        return [];
      }
      
    } catch (error) {
      console.error(`[TelegramChannelService] Error in getRecentChannelMessages:`, error);
      return [];
    }
  }

  /**
   * Provide fallback when no bot is available (e.g., public channels without bot configured)
   */
  private async fetchMessagesViaMtproto(channel: ITelegramChannel): Promise<ITelegramChannelMessage[]> {
    if (!telegramMtprotoService.isConfigured()) {
      return [];
    }

    const identifier = this.resolveMtprotoIdentifier(channel);
    if (!identifier) {
      return [];
    }

    try {
      const minId = channel.lastFetchedMessageId ?? 0;
      return await telegramMtprotoService.fetchRecentMessages(identifier, {
        minId,
        limit: 200
      });
    } catch (error) {
      console.error(`[TelegramChannelService] MTProto fetch failed for ${channel.channelTitle}:`, (error as Error).message);
      return [];
    }
  }

  private resolveMtprotoIdentifier(channel: ITelegramChannel): string | null {
    if (channel.channelId.startsWith('@')) {
      return channel.channelId;
    }

    if (/^-?\d+$/.test(channel.channelId)) {
      return channel.channelId;
    }

    if (channel.channelUsername) {
      return channel.channelUsername.startsWith('@') ? channel.channelUsername : `@${channel.channelUsername}`;
    }

    return null;
  }

  private mergeMessageLists(primary: ITelegramChannelMessage[], secondary: ITelegramChannelMessage[]): ITelegramChannelMessage[] {
    if (!primary.length && !secondary.length) {
      return [];
    }

    const merged: ITelegramChannelMessage[] = [];
    const seen = new Set<number>();

    for (const message of [...primary, ...secondary]) {
      if (!seen.has(message.messageId)) {
        seen.add(message.messageId);
        merged.push(message);
      }
    }

    return merged.sort((a, b) => a.messageId - b.messageId);
  }


  private async handleNoBotFallback(channelId: string, userId: string, isPublicChannel: boolean): Promise<ITelegramChannelMessage[]> {
    try {
      const channelDoc = await TelegramChannel.findOne({
        channelId,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (channelDoc && telegramMtprotoService.isConfigured()) {
        const mtprotoMessages = await this.fetchMessagesViaMtproto(channelDoc);

        if (mtprotoMessages.length > 0) {
          const filteredMessages = this.filterMessagesByKeywords(mtprotoMessages, channelDoc.keywords);
          const newMessages = filteredMessages.filter(msg => !channelDoc.messages.find(existing => existing.messageId === msg.messageId));

          if (newMessages.length > 0) {
            channelDoc.messages.push(...newMessages);
            channelDoc.totalMessages += newMessages.length;
            channelDoc.lastFetchedMessageId = Math.max(channelDoc.lastFetchedMessageId || 0, ...newMessages.map(m => m.messageId));

            if (io) {
              io.emit('new_telegram_channel_messages', {
                userId,
                channelId: channelDoc._id.toString(),
                messages: newMessages
              });
            }
          } else if (filteredMessages.length > 0) {
            channelDoc.lastFetchedMessageId = Math.max(channelDoc.lastFetchedMessageId || 0, ...filteredMessages.map(m => m.messageId));
          }

          channelDoc.lastFetchedAt = new Date();
          channelDoc.lastError = 'Monitoring via MTProto service account. Bot not configured.';
          await channelDoc.save();

          console.log(`[TelegramChannelService] MTProto fallback succeeded for ${channelId} with ${filteredMessages.length} messages.`);
          return filteredMessages;
        }
      }

      if (isPublicChannel) {
        console.warn(`[TelegramChannelService] No bot configured for user ${userId}. Attempting RSS fallback for ${channelId}.`);
        const rssMessages = await this.tryRSSFeedFromRSS(channelId);

        if (rssMessages.length > 0) {
          await TelegramChannel.findOneAndUpdate({
            channelId,
            userId: new mongoose.Types.ObjectId(userId)
          }, {
            $set: {
              lastError: 'Bot not configured. Using RSS fallback for public channel.',
              lastFetchedAt: new Date()
            }
          });
          console.log(`[TelegramChannelService] RSS fallback succeeded for ${channelId} with ${rssMessages.length} messages.`);
          return rssMessages;
        }

        const noDataMessage = telegramMtprotoService.isConfigured()
          ? 'Bot not configured. MTProto/RSS fallbacks returned no messages yet.'
          : 'Bot not configured. RSS fallback returned no messages. Add your bot for real-time monitoring.';
        await this.markChannelWithError(channelId, userId, noDataMessage);
        return [];
      }

      const errorMessage = telegramMtprotoService.isConfigured()
        ? 'Bot not configured. Monitoring requires inviting the service account or configuring MTProto access.'
        : 'No active bot found for user. Please configure your Telegram bot first.';
      await this.markChannelWithError(channelId, userId, errorMessage);
      return [];
    } catch (error) {
      console.error(`[TelegramChannelService] Error during no-bot fallback for ${channelId}:`, error);
      return [];
    }
  }


  /**
   * Mark channel with error and update database
   */
  private async markChannelWithError(channelId: string, userId: string, errorMessage: string): Promise<void> {
    try {
      await TelegramChannel.findOneAndUpdate(
        { channelId, userId: new mongoose.Types.ObjectId(userId) },
        { 
          $set: { 
            lastError: errorMessage,
            lastFetchedAt: new Date()
          }
        }
      );
      console.log(`[TelegramChannelService] Marked channel ${channelId} with error: ${errorMessage}`);
    } catch (error) {
      console.error(`[TelegramChannelService] Error updating channel with error message:`, error);
    }
  }

  /**
   * Get user-friendly error message for permission issues
   */
  private getPermissionErrorMessage(channelId: string, originalError: string): string {
    if (originalError.includes('chat not found')) {
      return 'Channel/group not found. Make sure it exists and is accessible.';
    }
    
    if (originalError.includes('Timeout')) {
      return 'Bot connection timeout. Please check your bot token and network connectivity.';
    }

    if (originalError.includes('Bot initialization failed')) {
      return originalError;
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
        }
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
   * Try to fetch messages via RSS feed for public channels (robust parser)
   */
  private async tryRSSFeedFromRSS(channelId: string): Promise<ITelegramChannelMessage[]> {
    const channelName = channelId.replace('@', '');
    const rssEndpoints = [
      `https://rsshub.app/telegram/channel/${channelName}`,
      `https://rsshub.rssforever.com/telegram/channel/${channelName}`,
      `https://rsshub.woodland.cafe/telegram/channel/${channelName}`
    ];

    for (const rssUrl of rssEndpoints) {
      try {
        console.log(`[TelegramChannelService] Trying RSS feed: ${rssUrl}`);
        const feed = await this.rssParser.parseURL(rssUrl);
        if (!feed?.items?.length) {
          console.log(`[TelegramChannelService] RSS feed empty at ${rssUrl}`);
          continue;
        }

        const messages: ITelegramChannelMessage[] = [];
        for (const item of feed.items.slice(0, 10)) {
          const rawText = (item.contentSnippet || item.content || item.title || '').toString();
          const rawDate = (item.isoDate || item.pubDate || new Date().toISOString()).toString();
          const msg: ITelegramChannelMessage = {
            messageId: Math.floor(Math.random() * 1_000_000),
            text: rawText,
            date: new Date(rawDate),
            author: channelName,
            urls: this.extractUrls(rawText),
            hashtags: this.extractHashtags(rawText)
          };
          messages.push(msg);
        }

        console.log(`[TelegramChannelService] RSS feed success for ${channelId}: ${messages.length} items`);
        return messages;
      } catch (err) {
        console.warn(`[TelegramChannelService] RSS feed attempt failed for ${rssUrl}:`, (err as Error).message);
      }
    }

    console.log(`[TelegramChannelService] All RSS endpoints failed for ${channelId}`);
    return [];
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
        // Find active channels, excluding those with recent errors (within last 30 minutes)
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const activeChannels = await TelegramChannel.find({ 
          isActive: true,
          $or: [
            { lastError: { $exists: false } },
            { lastError: null },
            { lastFetchedAt: { $lt: thirtyMinutesAgo } }
          ]
        });
        
        const channelsWithErrors = await TelegramChannel.countDocuments({
          isActive: true,
          lastError: { $exists: true, $ne: null },
          lastFetchedAt: { $gte: thirtyMinutesAgo }
        });

        console.log(`[TelegramChannelService] Found ${activeChannels.length} active channels to fetch (${channelsWithErrors} skipped due to recent errors)`);

        let successCount = 0;
        let errorCount = 0;

        for (const channel of activeChannels) {
          try {
            await this.fetchChannelMessages(channel._id.toString());
            successCount++;
            // Add small delay between channels to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (error) {
            errorCount++;
            const errorMessage = (error as Error).message;
            // Only log unexpected errors, not permission errors which are handled in fetchChannelMessages
            if (!errorMessage.includes('Channel/group not found') && 
                !errorMessage.includes('Bot needs to be added') && 
                !errorMessage.includes('No active bot found')) {
              console.error(`[TelegramChannelService] Unexpected error fetching messages for channel ${channel.channelTitle}:`, error);
            }
          }
        }

        console.log(`[TelegramChannelService] Periodic fetch completed: ${successCount} successful, ${errorCount} errors, ${channelsWithErrors} skipped`);
      } catch (error) {
        console.error('[TelegramChannelService] Error in periodic fetch initialization:', error);
      }
    });

    console.log('[TelegramChannelService] ✅ Periodic fetching initialized (every 30 minutes with error handling)');
  }

  /**
   * Setup listeners for real-time bot messages
   */
  private setupBotMessageListeners(): void {
    // Listen for messages from all user bots
    telegramBotManager.on('message', async ({ userId, message, bot }) => {
      try {
        await this.processIncomingMessage(userId, message);
      } catch (error) {
        console.error('[TelegramChannelService] Error processing incoming message:', error);
      }
    });

    console.log('[TelegramChannelService] ✅ Bot message listeners initialized');
  }

  /**
   * Process incoming message from bot and save to relevant channels
   */
  private async processIncomingMessage(userId: string, message: any): Promise<void> {
    try {
      // Check if this message is from a monitored channel
      const chatId = message.chat.id.toString();
      
      // Find channels that match this chat ID for this user
      const matchingChannels = await TelegramChannel.find({
        userId: new mongoose.Types.ObjectId(userId),
        channelId: chatId,
        isActive: true
      });

      if (matchingChannels.length === 0) {
        // Not a monitored channel, ignore
        return;
      }

      // Convert message to our format
      const channelMessage = this.convertToChannelMessage(message);
      if (!channelMessage) {
        return;
      }

      console.log(`[TelegramChannelService] Processing real-time message ${channelMessage.messageId} from ${chatId}`);

      // Add message to each matching channel
      for (const channel of matchingChannels) {
        try {
          // Check if message already exists
          const existingMessage = channel.messages.find(m => m.messageId === channelMessage.messageId);
          if (existingMessage) {
            continue; // Skip duplicates
          }

          // Filter by keywords if specified
          const filteredMessages = this.filterMessagesByKeywords([channelMessage], channel.keywords);
          if (filteredMessages.length === 0) {
            continue; // Message doesn't match keywords
          }

          // Add the message
          channel.messages.push(channelMessage);
          channel.totalMessages += 1;
          channel.lastFetchedAt = new Date();
          channel.lastFetchedMessageId = channelMessage.messageId;

          // Clear any previous errors since we're receiving messages
          if (channel.lastError) {
            channel.lastError = undefined;
          }

          await channel.save();

          console.log(`[TelegramChannelService] ✅ Added real-time message ${channelMessage.messageId} to channel: ${channel.channelTitle}`);

          // Emit real-time update to frontend
          if (io) {
            io.emit('new_telegram_channel_messages', {
              userId: userId,
              channelId: channel._id.toString(),
              messages: [channelMessage]
            });
          }

        } catch (error) {
          console.error(`[TelegramChannelService] Error adding message to channel ${channel.channelTitle}:`, error);
        }
      }

    } catch (error) {
      console.error('[TelegramChannelService] Error in processIncomingMessage:', error);
    }
  }

  /**
   * Get channel health status for a user
   */
  async getChannelHealthStatus(userId: string): Promise<{
    total: number;
    active: number;
    withErrors: number;
    channels: Array<{
      id: string;
      title: string;
      channelId: string;
      isActive: boolean;
      lastError?: string;
      lastFetchedAt?: Date;
      errorAge?: number; // minutes since last error
      status: 'healthy' | 'error' | 'inactive';
    }>;
  }> {
    try {
      const channels = await TelegramChannel.find({
        userId: new mongoose.Types.ObjectId(userId)
      }).sort({ updatedAt: -1 });

      const channelStatuses = channels.map(channel => {
        const status: 'healthy' | 'error' | 'inactive' = !channel.isActive ? 'inactive' : 
                     channel.lastError ? 'error' : 'healthy';
        
        const errorAge = channel.lastError && channel.lastFetchedAt ? 
          Math.round((Date.now() - channel.lastFetchedAt.getTime()) / (1000 * 60)) : 
          undefined;

        return {
          id: channel._id.toString(),
          title: channel.channelTitle,
          channelId: channel.channelId,
          isActive: channel.isActive,
          lastError: channel.lastError,
          lastFetchedAt: channel.lastFetchedAt,
          errorAge,
          status
        };
      });

      return {
        total: channels.length,
        active: channelStatuses.filter(c => c.isActive).length,
        withErrors: channelStatuses.filter(c => c.lastError).length,
        channels: channelStatuses
      };
    } catch (error) {
      console.error('[TelegramChannelService] Error getting channel health status:', error);
      throw error;
    }
  }

  /**
   * Clear error status for a channel (forces retry)
   */
  async clearChannelError(userId: string, channelId: string): Promise<ITelegramChannel> {
    try {
      const channel = await TelegramChannel.findOneAndUpdate(
        {
          userId: new mongoose.Types.ObjectId(userId),
          _id: new mongoose.Types.ObjectId(channelId)
        },
        { 
          $unset: { lastError: 1 },
          $set: { lastFetchedAt: new Date(Date.now() - 31 * 60 * 1000) } // Set to 31 minutes ago to force retry
        },
        { new: true }
      );

      if (!channel) {
        throw new Error('Channel not found or not owned by user');
      }

      console.log(`[TelegramChannelService] ✅ Cleared error for channel: ${channel.channelTitle}`);
      return channel;
    } catch (error) {
      console.error('[TelegramChannelService] Error clearing channel error:', error);
      throw error;
    }
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











