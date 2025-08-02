"use strict";
/**
 * WAHA Controller - Modern WhatsApp API Controller
 * Replaces whatsappController.ts with WAHA-based implementation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = exports.removeMonitoredKeyword = exports.addMonitoredKeyword = exports.getMonitoredKeywords = exports.forceHistorySync = exports.refreshChats = exports.forceRestart = exports.restartSession = exports.getPrivateChats = exports.getGroups = exports.verifyPhoneAuthCode = exports.sendPhoneAuthCode = exports.webhook = exports.stopSession = exports.startSession = exports.getMessages = exports.getChats = exports.sendMedia = exports.sendMessage = exports.getQR = exports.getStatus = void 0;
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
        // Try to get status with connection test
        let wahaStatus;
        try {
            wahaStatus = await wahaService.getStatus();
            // If service claims to be ready but we haven't tested recently, verify connection
            if (wahaStatus.isReady) {
                try {
                    await wahaService.healthCheck();
                }
                catch (healthError) {
                    console.warn('[WAHA Controller] Health check failed during status request:', healthError);
                    wahaStatus.isReady = false;
                    wahaStatus.status = 'disconnected';
                }
            }
        }
        catch (serviceError) {
            console.error('[WAHA Controller] WAHA service error:', serviceError);
            wahaStatus = {
                isReady: false,
                status: 'error',
                qrAvailable: false,
                timestamp: new Date().toISOString()
            };
        }
        // Convert WAHA status to format expected by frontend
        const status = {
            connected: wahaStatus.isReady,
            authenticated: wahaStatus.isReady, // Add authenticated field
            lastHeartbeat: new Date(),
            serviceStatus: wahaStatus.status,
            isReady: wahaStatus.isReady,
            isClientReady: wahaStatus.isReady,
            groupsCount: 0,
            privateChatsCount: 0,
            messagesCount: 0,
            qrAvailable: wahaStatus.qrAvailable,
            timestamp: wahaStatus.timestamp,
            monitoredKeywords: [],
            serviceType: 'waha'
        };
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
                qrCode: qrDataUrl,
                message: 'QR code available for scanning'
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
        // Support both URL param and query param for chatId
        const chatId = req.params.chatId || req.query.chatId;
        const limit = parseInt(req.query.limit) || 50;
        if (!chatId) {
            // If no chatId provided, return empty messages array instead of error
            console.log('[WAHA Controller] No chatId provided, returning empty messages');
            return res.json({
                success: true,
                data: []
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
 * Send phone authentication code
 */
const sendPhoneAuthCode = async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required and must be a string'
            });
        }
        // Clean phone number (remove non-digits)
        const cleanedPhone = phoneNumber.replace(/\D/g, '');
        if (cleanedPhone.length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number format'
            });
        }
        const wahaService = getWAHAService();
        const result = await wahaService.requestPhoneCode(cleanedPhone);
        if (result.success) {
            res.json({
                success: true,
                message: 'Verification code sent to your phone',
                data: {
                    phoneNumber: cleanedPhone,
                    codeRequested: true
                }
            });
        }
        else {
            res.status(400).json({
                success: false,
                error: result.error || 'Failed to send verification code'
            });
        }
    }
    catch (error) {
        console.error('[WAHA Controller] Error sending phone auth code:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send verification code: ' + error.message
        });
    }
};
exports.sendPhoneAuthCode = sendPhoneAuthCode;
/**
 * Verify phone authentication code
 */
const verifyPhoneAuthCode = async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;
        if (!phoneNumber || !code) {
            return res.status(400).json({
                success: false,
                error: 'Phone number and verification code are required'
            });
        }
        if (typeof code !== 'string' || code.length !== 6) {
            return res.status(400).json({
                success: false,
                error: 'Verification code must be 6 digits'
            });
        }
        const wahaService = getWAHAService();
        const result = await wahaService.verifyPhoneCode(phoneNumber, code);
        if (result.success) {
            // Emit connection status update to frontend
            const io_instance = global.io;
            if (io_instance) {
                io_instance.emit('whatsapp:status', {
                    connected: true,
                    authenticated: true,
                    authMethod: 'phone',
                    phoneNumber: phoneNumber
                });
            }
            res.json({
                success: true,
                message: 'Phone verification successful - WhatsApp connected',
                data: {
                    authenticated: true,
                    phoneNumber: phoneNumber
                }
            });
        }
        else {
            res.status(400).json({
                success: false,
                error: result.error || 'Invalid verification code'
            });
        }
    }
    catch (error) {
        console.error('[WAHA Controller] Error verifying phone auth code:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify code: ' + error.message
        });
    }
};
exports.verifyPhoneAuthCode = verifyPhoneAuthCode;
/**
 * Get WhatsApp groups
 */
const getGroups = async (req, res) => {
    try {
        const wahaService = getWAHAService();
        const chats = await wahaService.getChats();
        // Filter only groups
        const groups = chats.filter(chat => chat.isGroup);
        res.json({
            success: true,
            data: groups
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Error getting groups:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get WhatsApp groups'
        });
    }
};
exports.getGroups = getGroups;
/**
 * Get WhatsApp private chats
 */
const getPrivateChats = async (req, res) => {
    try {
        const wahaService = getWAHAService();
        const chats = await wahaService.getChats();
        // Filter only private chats
        const privateChats = chats.filter(chat => !chat.isGroup);
        res.json({
            success: true,
            data: privateChats
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Error getting private chats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get WhatsApp private chats'
        });
    }
};
exports.getPrivateChats = getPrivateChats;
/**
 * Restart WhatsApp session
 */
const restartSession = async (req, res) => {
    try {
        const wahaService = getWAHAService();
        // Stop and start the session
        await wahaService.stopSession();
        await wahaService.startSession();
        res.json({
            success: true,
            message: 'WhatsApp service restart initiated'
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Error restarting session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to restart WhatsApp service'
        });
    }
};
exports.restartSession = restartSession;
/**
 * Force restart WhatsApp session
 */
const forceRestart = async (req, res) => {
    try {
        const wahaService = getWAHAService();
        // Force stop and start the session
        await wahaService.stopSession();
        await wahaService.startSession();
        res.json({
            success: true,
            message: 'WhatsApp service force restart initiated'
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Error force restarting session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to force restart WhatsApp service'
        });
    }
};
exports.forceRestart = forceRestart;
/**
 * Refresh WhatsApp chats
 */
const refreshChats = async (req, res) => {
    try {
        const wahaService = getWAHAService();
        const status = await wahaService.getStatus();
        // Check if WAHA service is ready
        if (!status.isReady) {
            return res.json({
                success: false,
                error: 'WAHA service is not ready. Please ensure WhatsApp is connected and try again.',
                details: {
                    isReady: status.isReady,
                    status: status.status,
                    suggestion: 'Please authenticate with WhatsApp first'
                }
            });
        }
        // Get fresh chats data
        await wahaService.getChats();
        res.json({
            success: true,
            message: 'WhatsApp chats refreshed successfully',
            data: {
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Error refreshing chats:', error);
        // Provide more helpful error messages
        let userFriendlyMessage = 'Failed to refresh WhatsApp chats';
        let statusCode = 500;
        if (error.message?.includes('not ready') || error.message?.includes('not available')) {
            userFriendlyMessage = 'WAHA service is not connected. Please authenticate with WhatsApp first.';
            statusCode = 400;
        }
        else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            userFriendlyMessage = 'Cannot connect to WAHA service. Please check service availability.';
            statusCode = 503;
        }
        res.status(statusCode).json({
            success: false,
            error: userFriendlyMessage,
            technicalError: error.message,
            suggestion: statusCode === 400 ? 'Please authenticate with WhatsApp first' : 'Please try again in a few seconds'
        });
    }
};
exports.refreshChats = refreshChats;
/**
 * Force history sync (placeholder for compatibility)
 */
const forceHistorySync = async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'History sync is automatically handled by WAHA service'
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Error in force history sync:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sync history'
        });
    }
};
exports.forceHistorySync = forceHistorySync;
/**
 * Get monitored keywords (placeholder for compatibility)
 */
const getMonitoredKeywords = async (req, res) => {
    try {
        // For now, return empty array since WAHA handles monitoring differently
        res.json({
            success: true,
            data: []
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Error getting monitored keywords:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get monitored keywords'
        });
    }
};
exports.getMonitoredKeywords = getMonitoredKeywords;
/**
 * Add monitored keyword (placeholder for compatibility)
 */
const addMonitoredKeyword = async (req, res) => {
    try {
        const { keyword } = req.body;
        res.json({
            success: true,
            message: `Keyword "${keyword}" monitoring is handled by WAHA service`,
            monitoredKeywords: []
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Error adding monitored keyword:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add monitored keyword'
        });
    }
};
exports.addMonitoredKeyword = addMonitoredKeyword;
/**
 * Remove monitored keyword (placeholder for compatibility)
 */
const removeMonitoredKeyword = async (req, res) => {
    try {
        const { keyword } = req.params;
        res.json({
            success: true,
            message: `Keyword "${keyword}" monitoring is handled by WAHA service`,
            monitoredKeywords: []
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Error removing monitored keyword:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove monitored keyword'
        });
    }
};
exports.removeMonitoredKeyword = removeMonitoredKeyword;
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
