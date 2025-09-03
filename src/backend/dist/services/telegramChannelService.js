"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramChannelService = void 0;
const TelegramChannel_1 = __importDefault(require("../models/TelegramChannel"));
const User_1 = __importDefault(require("../models/User"));
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("../server");
const node_cron_1 = __importDefault(require("node-cron"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const telegramBotManager_1 = require("./telegramBotManager"); // Import bot manager
class TelegramChannelService {
    constructor() {
        this.cronJobs = new Map();
        console.log('[TelegramChannelService] Initialized with multi-user bot manager');
        this.initializePeriodicFetch();
        this.setupBotMessageListeners();
    }
    /**
     * Add a new channel to monitor
     */
    async addChannel(userId, channelIdentifier, keywords) {
        try {
            console.log(`[TelegramChannelService] Adding channel: ${channelIdentifier} for user: ${userId}`);
            // Validate channel exists and get info
            const channelInfo = await this.getChannelInfo(channelIdentifier, userId);
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
        let channel = null;
        try {
            channel = await TelegramChannel_1.default.findById(channelDbId);
            if (!channel || !channel.isActive) {
                return;
            }
            console.log(`[TelegramChannelService] Fetching messages for: ${channel.channelTitle}`);
            // Check if channel has recent errors and should be skipped temporarily
            if (channel.lastError && channel.lastFetchedAt) {
                const timeSinceLastError = Date.now() - channel.lastFetchedAt.getTime();
                const errorCooldown = 30 * 60 * 1000; // 30 minutes cooldown
                if (timeSinceLastError < errorCooldown) {
                    console.log(`[TelegramChannelService] Skipping ${channel.channelTitle} - in error cooldown (${Math.round(timeSinceLastError / 1000 / 60)} min ago)`);
                    return;
                }
            }
            // Get messages using the user's bot instance
            const messages = await this.getRecentChannelMessages(channel.channelId, channel.userId.toString());
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
                else {
                    // Update last fetched time even if no new messages
                    channel.lastFetchedAt = new Date();
                    await channel.save();
                }
            }
            else {
                // Update last fetched time even if no messages returned
                channel.lastFetchedAt = new Date();
                await channel.save();
            }
        }
        catch (error) {
            const errorMessage = error.message;
            console.error(`[TelegramChannelService] Error fetching channel messages for ${channel?.channelTitle || 'unknown'}:`, errorMessage);
            // Don't log the full stack trace for known permission errors
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
    async getChannelInfo(channelIdentifier, userId) {
        try {
            // Get the user's bot instance
            let bot = telegramBotManager_1.telegramBotManager.getBotForUser(userId);
            // If no bot found, try to initialize it
            if (!bot) {
                console.log(`[TelegramChannelService] No active bot found for user ${userId}, attempting to initialize...`);
                // Get user with bot token
                const user = await User_1.default.findById(userId).select('+telegramBotToken');
                if (user?.telegramBotToken && user.telegramBotActive) {
                    console.log(`[TelegramChannelService] Found bot token for user ${userId}, initializing bot...`);
                    const initResult = await telegramBotManager_1.telegramBotManager.setBotForUser(userId, user.telegramBotToken);
                    if (initResult.success) {
                        bot = telegramBotManager_1.telegramBotManager.getBotForUser(userId);
                        console.log(`[TelegramChannelService] ✅ Successfully initialized bot for user ${userId}`);
                    }
                    else {
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
        }
        catch (error) {
            console.error(`[TelegramChannelService] Error getting channel info for ${channelIdentifier}:`, error);
            if (error.message.includes('chat not found')) {
                throw new Error(`Channel ${channelIdentifier} not found. Make sure it exists and is public.`);
            }
            throw new Error(`Cannot access channel ${channelIdentifier}. Make sure the bot is added to the group/channel with proper permissions.`);
        }
    }
    /**
     * Get recent messages from channel using proper bot instance
     */
    async getRecentChannelMessages(channelId, userId) {
        try {
            // Get user's bot instance
            let bot = telegramBotManager_1.telegramBotManager.getBotForUser(userId);
            // If no bot found, try to initialize it
            if (!bot) {
                console.log(`[TelegramChannelService] No active bot found for user ${userId}, attempting to initialize...`);
                // Get user with bot token
                const user = await User_1.default.findById(userId).select('+telegramBotToken');
                if (user?.telegramBotToken && user.telegramBotActive) {
                    console.log(`[TelegramChannelService] Found bot token for user ${userId}, initializing bot...`);
                    const initResult = await telegramBotManager_1.telegramBotManager.setBotForUser(userId, user.telegramBotToken);
                    if (initResult.success) {
                        bot = telegramBotManager_1.telegramBotManager.getBotForUser(userId);
                        console.log(`[TelegramChannelService] ✅ Successfully initialized bot for user ${userId}`);
                    }
                    else {
                        console.error(`[TelegramChannelService] Failed to initialize bot for user ${userId}:`, initResult.error);
                        // Mark channel as having bot issues
                        await this.markChannelWithError(channelId, userId, `Bot initialization failed: ${initResult.error}`);
                        throw new Error(`Bot initialization failed: ${initResult.error}`);
                    }
                }
                else {
                    // Mark channel as having no active bot
                    await this.markChannelWithError(channelId, userId, 'No active bot found for user. Please configure your Telegram bot first.');
                    throw new Error('No active bot found for user. Please configure your Telegram bot first.');
                }
            }
            if (!bot) {
                await this.markChannelWithError(channelId, userId, 'No active bot found for user. Please configure your Telegram bot first.');
                throw new Error('No active bot found for user. Please configure your Telegram bot first.');
            }
            // For groups and channels, messages will be received via the main message handler
            // This method now focuses on checking if the bot has proper access
            try {
                // Verify bot can access the chat with timeout
                const chat = await Promise.race([
                    bot.getChat(channelId),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                ]);
                console.log(`[TelegramChannelService] Chat accessible for ${channelId}:`, {
                    id: chat.id,
                    title: chat.title,
                    type: chat.type,
                    username: chat.username
                });
                // Check if this chat is being monitored by the user
                const user = await User_1.default.findById(userId);
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
                await TelegramChannel_1.default.findOneAndUpdate({ channelId, userId: new mongoose_1.default.Types.ObjectId(userId) }, { $unset: { lastError: 1 } });
                console.log(`[TelegramChannelService] ✅ Bot has access to ${channelId}. Bot is ready for real-time monitoring.`);
                // Since the bot is in polling mode, we cannot use getUpdates() as it conflicts with polling
                // Instead, we rely on real-time message handlers and RSS feeds for historical data
                const channelMessages = [];
                // For public channels, try RSS feed to get some historical messages
                if (channelId.startsWith('@')) {
                    console.log(`[TelegramChannelService] Attempting RSS fallback for historical messages: ${channelId}`);
                    try {
                        const rssMessages = await this.tryRSSFeed(channelId);
                        channelMessages.push(...rssMessages.slice(0, 10)); // Limit RSS messages
                        console.log(`[TelegramChannelService] Retrieved ${rssMessages.length} messages from RSS feed for ${channelId}`);
                    }
                    catch (rssError) {
                        console.error(`[TelegramChannelService] RSS fallback failed for ${channelId}:`, rssError);
                    }
                }
                // Log that real-time monitoring is active
                console.log(`[TelegramChannelService] Bot is configured for real-time monitoring of ${channelId}. New messages will be received automatically.`);
                return channelMessages;
            }
            catch (accessError) {
                console.error(`[TelegramChannelService] ❌ Bot cannot access ${channelId}:`, accessError);
                // Update channel with specific error
                const errorMessage = this.getPermissionErrorMessage(channelId, accessError.message);
                await this.markChannelWithError(channelId, userId, errorMessage);
                throw new Error(errorMessage);
            }
        }
        catch (error) {
            console.error(`[TelegramChannelService] Error in getRecentChannelMessages:`, error);
            throw error;
        }
    }
    /**
     * Mark channel with error and update database
     */
    async markChannelWithError(channelId, userId, errorMessage) {
        try {
            await TelegramChannel_1.default.findOneAndUpdate({ channelId, userId: new mongoose_1.default.Types.ObjectId(userId) }, {
                $set: {
                    lastError: errorMessage,
                    lastFetchedAt: new Date()
                }
            });
            console.log(`[TelegramChannelService] Marked channel ${channelId} with error: ${errorMessage}`);
        }
        catch (error) {
            console.error(`[TelegramChannelService] Error updating channel with error message:`, error);
        }
    }
    /**
     * Get user-friendly error message for permission issues
     */
    getPermissionErrorMessage(channelId, originalError) {
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
        }
        else {
            return 'Bot needs to be added as a member to this group/supergroup.';
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
                // Find active channels, excluding those with recent errors (within last 30 minutes)
                const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
                const activeChannels = await TelegramChannel_1.default.find({
                    isActive: true,
                    $or: [
                        { lastError: { $exists: false } },
                        { lastError: null },
                        { lastFetchedAt: { $lt: thirtyMinutesAgo } }
                    ]
                });
                const channelsWithErrors = await TelegramChannel_1.default.countDocuments({
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
                    }
                    catch (error) {
                        errorCount++;
                        const errorMessage = error.message;
                        // Only log unexpected errors, not permission errors which are handled in fetchChannelMessages
                        if (!errorMessage.includes('Channel/group not found') &&
                            !errorMessage.includes('Bot needs to be added') &&
                            !errorMessage.includes('No active bot found')) {
                            console.error(`[TelegramChannelService] Unexpected error fetching messages for channel ${channel.channelTitle}:`, error);
                        }
                    }
                }
                console.log(`[TelegramChannelService] Periodic fetch completed: ${successCount} successful, ${errorCount} errors, ${channelsWithErrors} skipped`);
            }
            catch (error) {
                console.error('[TelegramChannelService] Error in periodic fetch initialization:', error);
            }
        });
        console.log('[TelegramChannelService] ✅ Periodic fetching initialized (every 30 minutes with error handling)');
    }
    /**
     * Setup listeners for real-time bot messages
     */
    setupBotMessageListeners() {
        // Listen for messages from all user bots
        telegramBotManager_1.telegramBotManager.on('message', async ({ userId, message, bot }) => {
            try {
                await this.processIncomingMessage(userId, message);
            }
            catch (error) {
                console.error('[TelegramChannelService] Error processing incoming message:', error);
            }
        });
        console.log('[TelegramChannelService] ✅ Bot message listeners initialized');
    }
    /**
     * Process incoming message from bot and save to relevant channels
     */
    async processIncomingMessage(userId, message) {
        try {
            // Check if this message is from a monitored channel
            const chatId = message.chat.id.toString();
            // Find channels that match this chat ID for this user
            const matchingChannels = await TelegramChannel_1.default.find({
                userId: new mongoose_1.default.Types.ObjectId(userId),
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
                    if (server_1.io) {
                        server_1.io.emit('new_telegram_channel_messages', {
                            userId: userId,
                            channelId: channel._id.toString(),
                            messages: [channelMessage]
                        });
                    }
                }
                catch (error) {
                    console.error(`[TelegramChannelService] Error adding message to channel ${channel.channelTitle}:`, error);
                }
            }
        }
        catch (error) {
            console.error('[TelegramChannelService] Error in processIncomingMessage:', error);
        }
    }
    /**
     * Get channel health status for a user
     */
    async getChannelHealthStatus(userId) {
        try {
            const channels = await TelegramChannel_1.default.find({
                userId: new mongoose_1.default.Types.ObjectId(userId)
            }).sort({ updatedAt: -1 });
            const channelStatuses = channels.map(channel => {
                const status = !channel.isActive ? 'inactive' :
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
        }
        catch (error) {
            console.error('[TelegramChannelService] Error getting channel health status:', error);
            throw error;
        }
    }
    /**
     * Clear error status for a channel (forces retry)
     */
    async clearChannelError(userId, channelId) {
        try {
            const channel = await TelegramChannel_1.default.findOneAndUpdate({
                userId: new mongoose_1.default.Types.ObjectId(userId),
                _id: new mongoose_1.default.Types.ObjectId(channelId)
            }, {
                $unset: { lastError: 1 },
                $set: { lastFetchedAt: new Date(Date.now() - 31 * 60 * 1000) } // Set to 31 minutes ago to force retry
            }, { new: true });
            if (!channel) {
                throw new Error('Channel not found or not owned by user');
            }
            console.log(`[TelegramChannelService] ✅ Cleared error for channel: ${channel.channelTitle}`);
            return channel;
        }
        catch (error) {
            console.error('[TelegramChannelService] Error clearing channel error:', error);
            throw error;
        }
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
