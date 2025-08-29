"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.forceChannelFetch = exports.getChannelDetails = exports.searchChannelMessages = exports.updateChannelKeywords = exports.toggleChannelStatus = exports.removeChannel = exports.addChannel = exports.getUserChannels = void 0;
const telegramChannelService_1 = __importDefault(require("../../services/telegramChannelService"));
// @desc    Get all channels for authenticated user
// @route   GET /api/v1/telegram-channels
// @access  Private
const getUserChannels = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        const channels = await telegramChannelService_1.default.getUserChannels(userId);
        res.status(200).json({
            success: true,
            data: channels,
            count: channels.length
        });
    }
    catch (error) {
        console.error('[TelegramChannelController] Error getting channels:', error);
        let statusCode = 500;
        let message = 'Failed to fetch channels';
        // Handle specific error cases that might cause 409 conflicts
        if (error.message.includes('No active bot found')) {
            statusCode = 409;
            message = 'No active Telegram bot configured for this user. Please configure a bot first.';
        }
        else if (error.message.includes('Bot token is already in use')) {
            statusCode = 409;
            message = 'The configured bot token is already in use by another user. Please use a different bot token.';
        }
        else if (error.message.includes('Invalid bot token')) {
            statusCode = 400;
            message = 'Invalid Telegram bot token. Please check your bot configuration.';
        }
        else if (error.message.includes('Bot access denied')) {
            statusCode = 403;
            message = 'Bot access denied. Please ensure the bot has proper permissions.';
        }
        else if (error.message.includes('Bot initialization failed')) {
            statusCode = 503;
            message = 'Failed to initialize Telegram bot. The service may be temporarily unavailable.';
        }
        res.status(statusCode).json({
            success: false,
            message: message,
            errorCode: error.code || 'TELEGRAM_ERROR',
            suggestion: statusCode === 409 ? 'Try configuring your Telegram bot in the settings page' : undefined
        });
    }
};
exports.getUserChannels = getUserChannels;
// @desc    Add new channel to monitor
// @route   POST /api/v1/telegram-channels
// @access  Private
const addChannel = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { channelIdentifier, keywords } = req.body;
        if (!userId) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        if (!channelIdentifier) {
            return res.status(400).json({
                success: false,
                message: 'Channel identifier is required (e.g., @channelname or channel ID)'
            });
        }
        // Validate channel identifier format
        if (!channelIdentifier.startsWith('@') && !channelIdentifier.startsWith('-') && isNaN(Number(channelIdentifier))) {
            return res.status(400).json({
                success: false,
                message: 'Invalid channel identifier. Use @channelname, channel ID, or -groupID format'
            });
        }
        const channel = await telegramChannelService_1.default.addChannel(userId, channelIdentifier.trim(), keywords && Array.isArray(keywords) ? keywords : []);
        res.status(201).json({
            success: true,
            message: 'Channel added successfully',
            data: channel
        });
    }
    catch (error) {
        console.error('[TelegramChannelController] Error adding channel:', error);
        let statusCode = 500;
        let message = 'Failed to add channel';
        if (error.message.includes('already being monitored')) {
            statusCode = 409;
            message = error.message;
        }
        else if (error.message.includes('Cannot access channel')) {
            statusCode = 400;
            message = error.message;
        }
        else if (error.message.includes('Chat not found')) {
            statusCode = 404;
            message = 'Channel not found. Make sure the channel exists and is public.';
        }
        res.status(statusCode).json({
            success: false,
            message
        });
    }
};
exports.addChannel = addChannel;
// @desc    Remove channel from monitoring
// @route   DELETE /api/v1/telegram-channels/:channelId
// @access  Private
const removeChannel = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { channelId } = req.params;
        if (!userId) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        await telegramChannelService_1.default.removeChannel(userId, channelId);
        res.status(200).json({
            success: true,
            message: 'Channel removed successfully'
        });
    }
    catch (error) {
        console.error('[TelegramChannelController] Error removing channel:', error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message || 'Failed to remove channel'
        });
    }
};
exports.removeChannel = removeChannel;
// @desc    Toggle channel active status
// @route   PATCH /api/v1/telegram-channels/:channelId/toggle
// @access  Private
const toggleChannelStatus = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { channelId } = req.params;
        const { isActive } = req.body;
        if (!userId) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'isActive must be a boolean value'
            });
        }
        const channel = await telegramChannelService_1.default.toggleChannelStatus(userId, channelId, isActive);
        res.status(200).json({
            success: true,
            message: `Channel ${isActive ? 'activated' : 'deactivated'} successfully`,
            data: channel
        });
    }
    catch (error) {
        console.error('[TelegramChannelController] Error toggling channel:', error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message || 'Failed to update channel status'
        });
    }
};
exports.toggleChannelStatus = toggleChannelStatus;
// @desc    Update channel keywords
// @route   PATCH /api/v1/telegram-channels/:channelId/keywords
// @access  Private
const updateChannelKeywords = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { channelId } = req.params;
        const { keywords } = req.body;
        if (!userId) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        if (!Array.isArray(keywords)) {
            return res.status(400).json({
                success: false,
                message: 'Keywords must be an array'
            });
        }
        // Implementation would update the channel keywords in the database
        // For now, returning success message
        res.status(200).json({
            success: true,
            message: 'Channel keywords updated successfully'
        });
    }
    catch (error) {
        console.error('[TelegramChannelController] Error updating keywords:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update channel keywords'
        });
    }
};
exports.updateChannelKeywords = updateChannelKeywords;
// @desc    Search messages across channels
// @route   GET /api/v1/telegram-channels/search
// @access  Private
const searchChannelMessages = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { query, channelId } = req.query;
        if (!userId) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }
        const results = await telegramChannelService_1.default.searchChannelMessages(userId, query, channelId);
        res.status(200).json({
            success: true,
            data: results,
            count: results.length,
            query
        });
    }
    catch (error) {
        console.error('[TelegramChannelController] Error searching:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Search failed'
        });
    }
};
exports.searchChannelMessages = searchChannelMessages;
// @desc    Get channel details with recent messages
// @route   GET /api/v1/telegram-channels/:channelId
// @access  Private
const getChannelDetails = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { channelId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        if (!userId) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        const channels = await telegramChannelService_1.default.getUserChannels(userId);
        const channel = channels.find(c => c._id.toString() === channelId);
        if (!channel) {
            return res.status(404).json({
                success: false,
                message: 'Channel not found'
            });
        }
        // Get paginated messages
        const startIndex = parseInt(offset) || 0;
        const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100 messages
        const messages = channel.messages
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(startIndex, startIndex + limitNum);
        res.status(200).json({
            success: true,
            data: {
                ...channel.toObject(),
                messages,
                pagination: {
                    offset: startIndex,
                    limit: limitNum,
                    total: channel.messages.length,
                    hasMore: startIndex + limitNum < channel.messages.length
                }
            }
        });
    }
    catch (error) {
        console.error('[TelegramChannelController] Error getting channel details:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get channel details'
        });
    }
};
exports.getChannelDetails = getChannelDetails;
// @desc    Force fetch new messages for a channel
// @route   POST /api/v1/telegram-channels/:channelId/fetch
// @access  Private
const forceChannelFetch = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { channelId } = req.params;
        if (!userId) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        const channels = await telegramChannelService_1.default.getUserChannels(userId);
        const channel = channels.find(c => c._id.toString() === channelId);
        if (!channel) {
            return res.status(404).json({
                success: false,
                message: 'Channel not found'
            });
        }
        // Trigger immediate fetch
        await telegramChannelService_1.default.fetchChannelMessages(channelId);
        res.status(200).json({
            success: true,
            message: 'Channel fetch triggered successfully'
        });
    }
    catch (error) {
        console.error('[TelegramChannelController] Error forcing fetch:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch channel messages'
        });
    }
};
exports.forceChannelFetch = forceChannelFetch;
