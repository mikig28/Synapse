"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeMonitoredTelegramChat = exports.validateTelegramBotToken = exports.removeTelegramBot = exports.getTelegramBotStatus = exports.setTelegramBotToken = exports.updateTelegramReportSettings = exports.addMonitoredTelegramChat = void 0;
const User_1 = __importDefault(require("../../models/User"));
const telegramBotManager_1 = require("../../services/telegramBotManager");
// @desc    Add a Telegram chat ID to the user's monitored list
// @route   POST /api/v1/users/me/telegram-chats
// @access  Private
const addMonitoredTelegramChat = async (req, res) => {
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
        const user = await User_1.default.findById(userId);
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
    }
    catch (error) {
        console.error('[ADD_TELEGRAM_CHAT_ERROR]', error);
        res.status(500).json({ message: 'Server error while adding Telegram chat ID' });
    }
};
exports.addMonitoredTelegramChat = addMonitoredTelegramChat;
// @desc    Update user's Telegram report settings
// @route   PUT /api/v1/users/me/telegram-report-settings
// @access  Private
const updateTelegramReportSettings = async (req, res) => {
    const { sendAgentReportsToTelegram } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ message: 'Not authorized, user ID not found' });
    }
    if (typeof sendAgentReportsToTelegram !== 'boolean') {
        return res.status(400).json({ message: 'sendAgentReportsToTelegram must be a boolean' });
    }
    try {
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.sendAgentReportsToTelegram = sendAgentReportsToTelegram;
        await user.save();
        res.status(200).json({
            message: 'Telegram report settings updated successfully',
            sendAgentReportsToTelegram: user.sendAgentReportsToTelegram,
        });
    }
    catch (error) {
        console.error('[UPDATE_TELEGRAM_REPORT_SETTINGS_ERROR]', error);
        res.status(500).json({ message: 'Server error while updating Telegram report settings' });
    }
};
exports.updateTelegramReportSettings = updateTelegramReportSettings;
// You can add other user-specific controller functions here later
// e.g., getMe, updateProfile, removeMonitoredTelegramChat, etc. 
// @desc    Set user's Telegram bot token
// @route   POST /api/v1/users/me/telegram-bot
// @access  Private
const setTelegramBotToken = async (req, res) => {
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
        const result = await telegramBotManager_1.telegramBotManager.setBotForUser(userId, botToken);
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
    }
    catch (error) {
        console.error('[SET_TELEGRAM_BOT_TOKEN_ERROR]', error);
        res.status(500).json({ message: 'Server error while setting Telegram bot token' });
    }
};
exports.setTelegramBotToken = setTelegramBotToken;
// @desc    Get user's Telegram bot status
// @route   GET /api/v1/users/me/telegram-bot
// @access  Private
const getTelegramBotStatus = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ message: 'Not authorized, user ID not found' });
    }
    try {
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Check if bot is active in manager
        const bot = telegramBotManager_1.telegramBotManager.getBotForUser(userId);
        const isActive = !!bot;
        res.status(200).json({
            hasBot: !!user.telegramBotToken,
            isActive: isActive && user.telegramBotActive,
            botUsername: user.telegramBotUsername,
            monitoredChats: user.monitoredTelegramChats?.length || 0,
            sendReportsToTelegram: user.sendAgentReportsToTelegram || false,
        });
    }
    catch (error) {
        console.error('[GET_TELEGRAM_BOT_STATUS_ERROR]', error);
        res.status(500).json({ message: 'Server error while getting Telegram bot status' });
    }
};
exports.getTelegramBotStatus = getTelegramBotStatus;
// @desc    Remove user's Telegram bot
// @route   DELETE /api/v1/users/me/telegram-bot
// @access  Private
const removeTelegramBot = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ message: 'Not authorized, user ID not found' });
    }
    try {
        const user = await User_1.default.findById(userId).select('+telegramBotToken');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Stop bot via manager
        await telegramBotManager_1.telegramBotManager.stopBotForUser(userId);
        // Clear bot info from database
        user.telegramBotToken = undefined;
        user.telegramBotUsername = undefined;
        user.telegramBotActive = false;
        await user.save();
        res.status(200).json({
            message: 'Telegram bot removed successfully',
            success: true
        });
    }
    catch (error) {
        console.error('[REMOVE_TELEGRAM_BOT_ERROR]', error);
        res.status(500).json({ message: 'Server error while removing Telegram bot' });
    }
};
exports.removeTelegramBot = removeTelegramBot;
// @desc    Validate Telegram bot token
// @route   POST /api/v1/users/me/telegram-bot/validate
// @access  Private
const validateTelegramBotToken = async (req, res) => {
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
        const validation = await telegramBotManager_1.telegramBotManager.validateBotToken(botToken);
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
    }
    catch (error) {
        console.error('[VALIDATE_TELEGRAM_BOT_TOKEN_ERROR]', error);
        res.status(500).json({ message: 'Server error while validating Telegram bot token' });
    }
};
exports.validateTelegramBotToken = validateTelegramBotToken;
// @desc    Remove a Telegram chat ID from the user's monitored list
// @route   DELETE /api/v1/users/me/telegram-chats/:chatId
// @access  Private
const removeMonitoredTelegramChat = async (req, res) => {
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
        const user = await User_1.default.findById(userId);
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
    }
    catch (error) {
        console.error('[REMOVE_TELEGRAM_CHAT_ERROR]', error);
        res.status(500).json({ message: 'Server error while removing Telegram chat ID' });
    }
};
exports.removeMonitoredTelegramChat = removeMonitoredTelegramChat;
