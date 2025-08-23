"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramChannelService = void 0;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const TelegramChannel_1 = __importDefault(require("../models/TelegramChannel"));
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("../server");
const node_cron_1 = __importDefault(require("node-cron"));
class TelegramChannelService {
    constructor() {
        this.cronJobs = new Map();
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) {
            throw new Error('TELEGRAM_BOT_TOKEN is required for channel monitoring');
        }
        this.bot = new node_telegram_bot_api_1.default(token, { polling: false });
        this.initializePeriodicFetch();
    }
    /**
     * Add a new channel to monitor
     */
    async addChannel(userId, channelIdentifier, keywords) {
        try {
            console.log(`[TelegramChannelService] Adding channel: ${channelIdentifier} for user: ${userId}`);
            // Validate channel exists and get info
            const channelInfo = await this.getChannelInfo(channelIdentifier);
            // Check if channel already exists for this user
            const existingChannel = await TelegramChannel_1.default.findOne({
                userId: new mongoose_1.default.Types.ObjectId(userId),
                channelId: channelInfo.id.toString()
            });
            if (existingChannel) {
                throw new Error('Channel is already being monitored');
            }
            // Create new channel record
            const newChannel = new TelegramChannel_1.default({
                userId: new mongoose_1.default.Types.ObjectId(userId),
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
            if (server_1.io) {
                server_1.io.emit('new_telegram_channel', {
                    userId,
                    channel: newChannel.toObject()
                });
            }
            return newChannel;
        }
        catch (error) {
            console.error(`[TelegramChannelService] Error adding channel ${channelIdentifier}:`, error);
            throw error;
        }
    }
    /**
     * Remove channel from monitoring
     */
    async removeChannel(userId, channelId) {
        try {
            const channel = await TelegramChannel_1.default.findOneAndDelete({
                userId: new mongoose_1.default.Types.ObjectId(userId),
                _id: new mongoose_1.default.Types.ObjectId(channelId)
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
            if (server_1.io) {
                server_1.io.emit('telegram_channel_removed', {
                    userId,
                    channelId
                });
            }
        }
        catch (error) {
            console.error(`[TelegramChannelService] Error removing channel:`, error);
            throw error;
        }
    }
    /**
     * Get all channels for a user
     */
    async getUserChannels(userId) {
        try {
            return await TelegramChannel_1.default.find({
                userId: new mongoose_1.default.Types.ObjectId(userId)
            }).sort({ updatedAt: -1 });
        }
        catch (error) {
            console.error(`[TelegramChannelService] Error getting user channels:`, error);
            throw error;
        }
    }
    /**
     * Toggle channel active status
     */
    async toggleChannelStatus(userId, channelId, isActive) {
        try {
            const channel = await TelegramChannel_1.default.findOneAndUpdate({
                userId: new mongoose_1.default.Types.ObjectId(userId),
                _id: new mongoose_1.default.Types.ObjectId(channelId)
            }, { isActive }, { new: true });
            if (!channel) {
                throw new Error('Channel not found or not owned by user');
            }
            console.log(`[TelegramChannelService] Channel ${channel.channelTitle} ${isActive ? 'activated' : 'deactivated'}`);
            return channel;
        }
        catch (error) {
            console.error(`[TelegramChannelService] Error toggling channel status:`, error);
            throw error;
        }
    }
    /**
     * Fetch messages from a specific channel
     */
    async fetchChannelMessages(channelDbId) {
        try {
            const channel = await TelegramChannel_1.default.findById(channelDbId);
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
                const newMessages = filteredMessages.filter(msg => !channel.messages.find(existing => existing.messageId === msg.messageId));
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
                    if (server_1.io && newMessages.length > 0) {
                        server_1.io.emit('new_telegram_channel_messages', {
                            userId: channel.userId.toString(),
                            channelId: channel._id.toString(),
                            messages: newMessages
                        });
                    }
                }
            }
        }
        catch (error) {
            console.error(`[TelegramChannelService] Error fetching channel messages:`, error);
        }
    }
    /**
     * Get channel information
     */
    async getChannelInfo(channelIdentifier) {
        try {
            // Try to get chat info - works for public channels/groups
            const chat = await this.bot.getChat(channelIdentifier);
            return chat;
        }
        catch (error) {
            console.error(`[TelegramChannelService] Error getting channel info for ${channelIdentifier}:`, error);
            throw new Error(`Cannot access channel ${channelIdentifier}. Make sure it's public or the bot is a member.`);
        }
    }
    /**
     * Get recent messages from channel (limited by Bot API)
     */
    async getRecentChannelMessages(channelId) {
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
        }
        catch (error) {
            console.error(`[TelegramChannelService] Error fetching messages:`, error);
            return [];
        }
    }
    /**
     * Filter messages by keywords
     */
    filterMessagesByKeywords(messages, keywords) {
        if (!keywords || keywords.length === 0) {
            return messages;
        }
        return messages.filter(message => {
            if (!message.text)
                return false;
            const lowerText = message.text.toLowerCase();
            return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
        });
    }
    /**
     * Determine channel type from Telegram chat type
     */
    getChannelType(telegramType) {
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
    extractUrls(text) {
        const urlRegex = /https?:\/\/[^\s]+/g;
        return text.match(urlRegex) || [];
    }
    /**
     * Extract hashtags from message text
     */
    extractHashtags(text) {
        const hashtagRegex = /#[^\s#]+/g;
        return text.match(hashtagRegex) || [];
    }
    /**
     * Initialize periodic fetching for all active channels
     */
    initializePeriodicFetch() {
        // Run every 30 minutes to fetch new messages from all active channels
        node_cron_1.default.schedule('*/30 * * * *', async () => {
            console.log('[TelegramChannelService] Running periodic channel message fetch...');
            try {
                const activeChannels = await TelegramChannel_1.default.find({ isActive: true });
                console.log(`[TelegramChannelService] Found ${activeChannels.length} active channels to fetch`);
                for (const channel of activeChannels) {
                    await this.fetchChannelMessages(channel._id.toString());
                    // Add small delay between channels to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            catch (error) {
                console.error('[TelegramChannelService] Error in periodic fetch:', error);
            }
        });
        console.log('[TelegramChannelService] ✅ Periodic fetching initialized (every 30 minutes)');
    }
    /**
     * Search messages across user's channels
     */
    async searchChannelMessages(userId, query, channelId) {
        try {
            const matchConditions = {
                userId: new mongoose_1.default.Types.ObjectId(userId)
            };
            if (channelId) {
                matchConditions._id = new mongoose_1.default.Types.ObjectId(channelId);
            }
            const results = await TelegramChannel_1.default.aggregate([
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
        }
        catch (error) {
            console.error('[TelegramChannelService] Error searching messages:', error);
            throw error;
        }
    }
}
// Create singleton instance
exports.telegramChannelService = new TelegramChannelService();
exports.default = exports.telegramChannelService;
