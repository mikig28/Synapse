"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramChannelService = void 0;
const TelegramChannel_1 = __importDefault(require("../models/TelegramChannel"));
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("../server");
const node_cron_1 = __importDefault(require("node-cron"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const telegramService_1 = require("./telegramService"); // Import shared bot instance
class TelegramChannelService {
    constructor() {
        this.cronJobs = new Map();
        // Reuse the existing bot instance to avoid polling conflicts
        this.bot = telegramService_1.telegramBot;
        console.log('[TelegramChannelService] Using shared telegram bot instance');
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
        try {
            // Try to get chat info first to ensure we can access it
            const chat = await this.bot.getChat(channelId);
            console.log(`[TelegramChannelService] Chat info for ${channelId}:`, {
                id: chat.id,
                title: chat.title,
                type: chat.type,
                username: chat.username
            });
            // Bot API limitation: Cannot get message history from channels/groups unless:
            // 1. Bot is admin in the channel/group
            // 2. For groups: bot must be added as member
            // 3. For channels: bot must be added as admin with "Read Messages" permission
            // Try to get updates (this will only work if bot has proper permissions)
            try {
                // This is a workaround: try to send a test message and see if we can access the chat
                // If this fails, we know the bot doesn't have permission
                const updates = await this.bot.getUpdates({ limit: 10 });
                // Filter messages from our target channel
                const channelMessages = updates
                    .filter(update => update.message &&
                    (update.message.chat.id.toString() === channelId ||
                        '@' + update.message.chat.username === channelId))
                    .map(update => this.convertToChannelMessage(update.message))
                    .filter(msg => msg !== null);
                if (channelMessages.length > 0) {
                    console.log(`[TelegramChannelService] ✅ Found ${channelMessages.length} messages from ${channelId}`);
                    return channelMessages;
                }
            }
            catch (permissionError) {
                console.log(`[TelegramChannelService] ⚠️  Bot doesn't have permission to read messages from ${channelId}`);
            }
            // If no messages found via updates, try alternative approaches for public channels
            if (channelId.startsWith('@')) {
                console.log(`[TelegramChannelService] 💡 For public channel ${channelId}: Trying alternative methods...`);
                // Try RSS feed approach for public channels
                const rssMessages = await this.tryRSSFeed(channelId);
                if (rssMessages.length > 0) {
                    console.log(`[TelegramChannelService] ✅ Found ${rssMessages.length} messages via RSS for ${channelId}`);
                    return rssMessages;
                }
                console.log(`[TelegramChannelService] 💡 Bot needs to be added as admin with 'Read Messages' permission for ${channelId}`);
            }
            else {
                console.log(`[TelegramChannelService] 💡 For group ${channelId}: Bot needs to be added as member`);
            }
            return [];
        }
        catch (error) {
            console.error(`[TelegramChannelService] ❌ Error accessing channel ${channelId}:`, error);
            // Update channel with error status
            try {
                await TelegramChannel_1.default.findOneAndUpdate({ channelId }, {
                    $set: {
                        lastError: error.message,
                        lastFetchedAt: new Date()
                    }
                });
            }
            catch (updateError) {
                console.error(`[TelegramChannelService] Error updating channel status:`, updateError);
            }
            return [];
        }
    }
    /**
     * Try to fetch messages via RSS feed for public channels
     */
    async tryRSSFeed(channelId) {
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
            const response = await (0, node_fetch_1.default)(rssUrl, {
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
            const messages = [];
            // This is a simplified example - in production use a proper RSS parser
            const itemMatches = rssText.match(/<item>[\s\S]*?<\/item>/g) || [];
            for (const item of itemMatches.slice(0, 10)) { // Limit to 10 recent items
                const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1];
                const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1];
                const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
                if (title && pubDate) {
                    const message = {
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
        }
        catch (error) {
            console.log(`[TelegramChannelService] RSS feed failed for ${channelId}:`, error);
            return [];
        }
    }
    /**
     * Convert Telegram message to channel message format
     */
    convertToChannelMessage(message) {
        try {
            const channelMessage = {
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
            }
            else if (message.video) {
                channelMessage.mediaType = 'video';
                channelMessage.mediaFileId = message.video.file_id;
            }
            else if (message.document) {
                channelMessage.mediaType = 'document';
                channelMessage.mediaFileId = message.document.file_id;
            }
            else if (message.audio) {
                channelMessage.mediaType = 'audio';
                channelMessage.mediaFileId = message.audio.file_id;
            }
            else if (message.voice) {
                channelMessage.mediaType = 'voice';
                channelMessage.mediaFileId = message.voice.file_id;
            }
            return channelMessage;
        }
        catch (error) {
            console.error(`[TelegramChannelService] Error converting message:`, error);
            return null;
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
     * Extract URLs from Telegram message entities
     */
    extractUrlsFromEntities(text, entities) {
        if (!text || !entities)
            return [];
        const urls = [];
        for (const entity of entities) {
            if (entity.type === 'url') {
                urls.push(text.substring(entity.offset, entity.offset + entity.length));
            }
            else if (entity.type === 'text_link' && entity.url) {
                urls.push(entity.url);
            }
        }
        return urls;
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
