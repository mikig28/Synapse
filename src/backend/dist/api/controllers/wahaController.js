"use strict";
/**
 * WAHA Controller - Modern WhatsApp API Controller
 * Replaces whatsappController.ts with WAHA-based implementation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = exports.webhook = exports.stopSession = exports.startSession = exports.getMessages = exports.getChats = exports.sendMedia = exports.sendMessage = exports.getQR = exports.getStatus = void 0;
const wahaService_1 = __importDefault(require("../../services/wahaService"));
// Get WAHA service instance
const getWAHAService = () => {
    return wahaService_1.default.getInstance();
};
/**
 * Get WhatsApp connection status
 */
const getStatus = async (req, res) => {
    try {
        const wahaService = getWAHAService();
        const status = wahaService.getStatus();
        res.json({
            success: true,
            data: status
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Error getting status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get WhatsApp status'
        });
    }
};
exports.getStatus = getStatus;
/**
 * Get QR code for WhatsApp Web authentication
 */
const getQR = async (req, res) => {
    try {
        console.log('[WAHA Controller] QR code request received');
        const wahaService = getWAHAService();
        console.log('[WAHA Controller] WAHA service instance obtained');
        const qrDataUrl = await wahaService.getQRCode();
        console.log('[WAHA Controller] QR code generated successfully');
        res.json({
            success: true,
            data: {
                qr: qrDataUrl,
                available: true
            }
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Error getting QR code:', error);
        console.error('[WAHA Controller] Error details:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            type: typeof error
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get QR code'
        });
    }
};
exports.getQR = getQR;
/**
 * Send text message
 */
const sendMessage = async (req, res) => {
    try {
        const { chatId, message, text } = req.body;
        if (!chatId || (!message && !text)) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: chatId and message/text'
            });
        }
        const wahaService = getWAHAService();
        const messageText = message || text;
        const result = await wahaService.sendMessage(chatId, messageText);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Error sending message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message'
        });
    }
};
exports.sendMessage = sendMessage;
/**
 * Send media message
 */
const sendMedia = async (req, res) => {
    try {
        const { chatId, mediaUrl, caption } = req.body;
        if (!chatId || !mediaUrl) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: chatId and mediaUrl'
            });
        }
        const wahaService = getWAHAService();
        const result = await wahaService.sendMedia(chatId, mediaUrl, caption);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Error sending media:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send media'
        });
    }
};
exports.sendMedia = sendMedia;
/**
 * Get all chats
 */
const getChats = async (req, res) => {
    try {
        const wahaService = getWAHAService();
        const chats = await wahaService.getChats();
        res.json({
            success: true,
            data: chats
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Error getting chats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get chats'
        });
    }
};
exports.getChats = getChats;
/**
 * Get messages from specific chat
 */
const getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        if (!chatId) {
            return res.status(400).json({
                success: false,
                error: 'Missing chatId parameter'
            });
        }
        const wahaService = getWAHAService();
        const messages = await wahaService.getMessages(chatId, limit);
        res.json({
            success: true,
            data: messages
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Error getting messages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get messages'
        });
    }
};
exports.getMessages = getMessages;
/**
 * Start WhatsApp session
 */
const startSession = async (req, res) => {
    try {
        const { sessionName } = req.body;
        const wahaService = getWAHAService();
        const session = await wahaService.startSession(sessionName);
        res.json({
            success: true,
            data: session
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Error starting session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start session'
        });
    }
};
exports.startSession = startSession;
/**
 * Stop WhatsApp session
 */
const stopSession = async (req, res) => {
    try {
        const { sessionName } = req.body;
        const wahaService = getWAHAService();
        await wahaService.stopSession(sessionName);
        res.json({
            success: true,
            message: 'Session stopped successfully'
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Error stopping session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stop session'
        });
    }
};
exports.stopSession = stopSession;
/**
 * Webhook handler for WAHA events
 */
const webhook = async (req, res) => {
    try {
        const wahaService = getWAHAService();
        wahaService.handleWebhook(req.body);
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('[WAHA Controller] Error handling webhook:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to handle webhook'
        });
    }
};
exports.webhook = webhook;
/**
 * Health check endpoint
 */
const healthCheck = async (req, res) => {
    try {
        const wahaService = getWAHAService();
        const isHealthy = await wahaService.healthCheck();
        res.json({
            success: true,
            data: {
                waha: isHealthy,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Health check failed:', error);
        res.status(503).json({
            success: false,
            error: 'WAHA service is not healthy'
        });
    }
};
exports.healthCheck = healthCheck;
