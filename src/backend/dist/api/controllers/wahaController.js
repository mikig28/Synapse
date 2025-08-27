"use strict";
/**
 * WAHA Controller - Modern WhatsApp API Controller
 * Replaces whatsappController.ts with WAHA-based implementation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSession = exports.healthCheck = exports.removeMonitoredKeyword = exports.addMonitoredKeyword = exports.getMonitoredKeywords = exports.forceHistorySync = exports.refreshChats = exports.forceRestart = exports.restartSession = exports.getPrivateChats = exports.getGroups = exports.verifyPhoneAuthCode = exports.sendPhoneAuthCode = exports.webhook = exports.stopSession = exports.startSession = exports.getMessages = exports.getChats = exports.sendMedia = exports.sendMessage = exports.getQR = exports.getStatus = void 0;
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
        let sessionDetails;
        try {
            wahaStatus = await wahaService.getStatus();
            // Get detailed session information to properly determine authentication
            try {
                sessionDetails = await wahaService.getSessionStatus();
                console.log('[WAHA Controller] Session details:', sessionDetails);
            }
            catch (sessionError) {
                console.warn('[WAHA Controller] Could not get session details:', sessionError);
                sessionDetails = null;
            }
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
            sessionDetails = null;
        }
        // Determine authentication status based on session details
        const isAuthenticated = sessionDetails?.status === 'WORKING';
        const isConnected = wahaStatus.isReady && isAuthenticated;
        const qrAvailable = sessionDetails?.status === 'SCAN_QR_CODE';
        console.log('[WAHA Controller] Status determination:', {
            sessionStatus: sessionDetails?.status,
            wahaReady: wahaStatus.isReady,
            isAuthenticated,
            isConnected,
            qrAvailable
        });
        // Avoid fetching chats here to keep status fast and prevent 50x under latency
        const groupsCount = undefined;
        const privateChatsCount = undefined;
        const messagesCount = undefined;
        // Convert WAHA status to format expected by frontend
        const status = {
            connected: isConnected,
            authenticated: isAuthenticated,
            lastHeartbeat: new Date(),
            serviceStatus: sessionDetails?.status || wahaStatus.status,
            isReady: isConnected,
            isClientReady: isConnected,
            groupsCount,
            privateChatsCount,
            messagesCount,
            qrAvailable: qrAvailable,
            timestamp: wahaStatus.timestamp,
            monitoredKeywords: [],
            serviceType: 'waha'
        };
        // Check if we need to emit authentication status change via Socket.IO
        const io_instance = global.io;
        if (io_instance && isAuthenticated) {
            // Only emit if we detect a new authentication (this prevents spam)
            const currentTime = Date.now();
            const lastEmit = global.lastAuthStatusEmit || 0;
            if (currentTime - lastEmit > 10000) { // Only emit every 10 seconds max
                console.log('[WAHA Controller] Emitting authentication status via Socket.IO');
                io_instance.emit('whatsapp:status', {
                    connected: true,
                    authenticated: true,
                    isReady: true,
                    authMethod: 'qr',
                    serviceType: 'waha',
                    timestamp: new Date().toISOString()
                });
                global.lastAuthStatusEmit = currentTime;
            }
        }
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
        const force = String(req.query.force || '').toLowerCase() === 'true';
        // Check service health first
        try {
            await wahaService.healthCheck();
            console.log('[WAHA Controller] Service health check passed');
        }
        catch (healthError) {
            console.error('[WAHA Controller] Service health check failed:', healthError);
            return res.status(503).json({
                success: false,
                error: 'WAHA service is not available. Please check service status.',
                suggestion: 'Try restarting the WAHA service'
            });
        }
        const qrDataUrl = await wahaService.getQRCode(undefined, force);
        console.log('[WAHA Controller] ✅ QR code generated successfully');
        res.json({
            success: true,
            data: {
                qrCode: qrDataUrl,
                message: 'QR code ready for scanning with WhatsApp mobile app'
            }
        });
    }
    catch (error) {
        console.error('[WAHA Controller] ❌ Error getting QR code:', error);
        // Provide more specific error messages based on the error type
        let statusCode = 500;
        let userMessage = 'Failed to generate QR code';
        if (error instanceof Error) {
            if (error.message.includes('not ready') || error.message.includes('422')) {
                statusCode = 422;
                userMessage = 'Session needs to be restarted. Please try again.';
            }
            else if (error.message.includes('not responding') || error.message.includes('502')) {
                statusCode = 502;
                userMessage = 'WhatsApp service is not responding. Please check service availability.';
            }
            else if (error.message.includes('timeout')) {
                statusCode = 408;
                userMessage = 'QR code generation timed out. Please try again.';
            }
            else if (error.message.includes('429') || error.message.toLowerCase().includes('too many')) {
                statusCode = 429;
                userMessage = 'Too many linking attempts. Please wait a minute and try again.';
            }
        }
        res.status(statusCode).json({
            success: false,
            error: userMessage,
            technical: error instanceof Error ? error.message : String(error)
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
        // Check session status first - temporarily log for debugging
        const status = await wahaService.getStatus();
        console.log('[WAHA Controller DEBUG] Session status for getChats:', status);
        // Temporarily disable isReady check to debug authentication issues
        if (!status.isReady) {
            console.log('[WAHA Controller DEBUG] Session not ready but continuing for debugging');
            // return res.status(400).json({
            //   success: false,
            //   error: 'WhatsApp session is not ready',
            //   details: {
            //     status: status.status,
            //     suggestion: 'Please authenticate with WhatsApp first'
            //   }
            // });
        }
        console.log('[WAHA Controller] Fetching chats...');
        const startTime = Date.now();
        const chats = await wahaService.getChats();
        const duration = Date.now() - startTime;
        console.log(`[WAHA Controller] ✅ Successfully fetched ${chats.length} chats in ${duration}ms`);
        res.json({
            success: true,
            data: chats,
            meta: {
                count: chats.length,
                loadTime: duration
            }
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Error getting chats:', error);
        let statusCode = 500;
        let errorMessage = 'Failed to get chats';
        let suggestion = 'Please try again or check your connection';
        if (error.message?.includes('timeout')) {
            statusCode = 408;
            errorMessage = 'Chat loading timed out';
            suggestion = 'The WhatsApp service is taking longer than expected. Please try again in a moment.';
        }
        else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            statusCode = 503;
            errorMessage = 'WhatsApp service unavailable';
            suggestion = 'The WhatsApp service is temporarily unavailable. Please try again later.';
        }
        else if (error.response?.status === 401) {
            statusCode = 401;
            errorMessage = 'WhatsApp authentication required';
            suggestion = 'Please authenticate with WhatsApp first.';
        }
        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            details: {
                suggestion,
                timestamp: new Date().toISOString()
            }
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
        const wahaService = getWAHAService();
        if (!chatId) {
            // If no chatId provided, get recent messages from all chats
            console.log('[WAHA Controller] No chatId provided, fetching recent messages from all chats');
            try {
                const allMessages = await wahaService.getRecentMessages(limit);
                console.log('[WAHA Controller] Found recent messages:', allMessages.length);
                return res.json({
                    success: true,
                    data: allMessages
                });
            }
            catch (recentError) {
                console.warn('[WAHA Controller] Failed to get recent messages, returning empty array:', recentError);
                return res.json({
                    success: true,
                    data: []
                });
            }
        }
        const messages = await wahaService.getMessages(chatId, limit);
        console.log('[WAHA Controller] Found messages for chat', chatId, ':', messages.length);
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
 * Webhook handler for WAHA events (following WAHA documentation structure)
 */
const webhook = async (req, res) => {
    try {
        console.log('[WAHA Controller] WAHA webhook received:', req.body);
        const wahaService = getWAHAService();
        // Handle the webhook through the service
        wahaService.handleWebhook(req.body);
        // Additional Socket.IO broadcasting for session status changes
        // WAHA event structure: { id, timestamp, event, session, payload }
        if (req.body.event === 'session.status') {
            const io_instance = global.io;
            if (io_instance) {
                const eventData = req.body.payload;
                const sessionName = req.body.session;
                const sessionStatus = eventData.status;
                const isAuthenticated = sessionStatus === 'WORKING';
                console.log('[WAHA Controller] Broadcasting session status change via Socket.IO:', {
                    sessionName,
                    sessionStatus,
                    isAuthenticated,
                    eventId: req.body.id
                });
                io_instance.emit('whatsapp:status', {
                    connected: isAuthenticated,
                    authenticated: isAuthenticated,
                    isReady: isAuthenticated,
                    authMethod: 'qr',
                    serviceType: 'waha',
                    sessionName: sessionName,
                    sessionStatus: sessionStatus,
                    timestamp: new Date().toISOString()
                });
                // Also emit general status update when authenticated
                if (isAuthenticated) {
                    console.log('[WAHA Controller] 🎉 Authentication successful! Broadcasting to all clients');
                    io_instance.emit('whatsapp:authenticated', {
                        method: 'qr',
                        serviceType: 'waha',
                        sessionName: sessionName,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }
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
        console.log('[WAHA Controller] Phone auth code request received:', req.body);
        const { phoneNumber } = req.body;
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            console.error('[WAHA Controller] Invalid phone number in request:', phoneNumber);
            return res.status(400).json({
                success: false,
                error: 'Phone number is required and must be a string'
            });
        }
        // Clean phone number (remove non-digits)
        const cleanedPhone = phoneNumber.replace(/\D/g, '');
        console.log('[WAHA Controller] Cleaned phone number:', cleanedPhone);
        if (cleanedPhone.length < 10) {
            console.error('[WAHA Controller] Phone number too short:', cleanedPhone);
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number format'
            });
        }
        console.log('[WAHA Controller] Getting WAHA service instance...');
        const wahaService = getWAHAService();
        console.log('[WAHA Controller] Requesting phone code via WAHA service...');
        const result = await wahaService.requestPhoneCode(cleanedPhone);
        console.log('[WAHA Controller] WAHA service result:', result);
        if (result.success) {
            console.log('[WAHA Controller] ✅ Phone code request successful');
            res.json({
                success: true,
                message: 'Verification code generated. Enter it in your WhatsApp app.',
                data: {
                    phoneNumber: cleanedPhone,
                    codeRequested: true,
                    pairingCode: result.code || null
                }
            });
        }
        else {
            console.log('[WAHA Controller] ❌ Phone code request failed:', result.error);
            // Check if it's a known error that means phone auth is not supported
            if (result.error?.includes('not available') || result.error?.includes('not supported')) {
                console.log('[WAHA Controller] Phone auth not supported, directing user to QR method');
                res.status(422).json({
                    success: false,
                    error: 'Phone number authentication is not available with the current WhatsApp configuration. Please use QR code authentication instead.',
                    fallbackMethod: 'qr',
                    code: 'PHONE_AUTH_NOT_SUPPORTED'
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    error: result.error || 'Failed to send verification code'
                });
            }
        }
    }
    catch (error) {
        console.error('[WAHA Controller] ❌ Exception sending phone auth code:', error);
        // Check if it's a network/connection error to WAHA service
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.response?.status >= 500) {
            console.log('[WAHA Controller] WAHA service unavailable, directing user to QR method');
            res.status(503).json({
                success: false,
                error: 'WhatsApp service is temporarily unavailable. Please try QR code authentication instead.',
                fallbackMethod: 'qr',
                code: 'SERVICE_UNAVAILABLE'
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: 'Failed to send verification code: ' + error.message
            });
        }
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
        // Check session status first - temporarily log for debugging
        const status = await wahaService.getStatus();
        console.log('[WAHA Controller DEBUG] Session status for getGroups:', status);
        // Temporarily disable isReady check to debug authentication issues
        if (!status.isReady) {
            console.log('[WAHA Controller DEBUG] Session not ready but continuing for debugging');
            // return res.status(400).json({
            //   success: false,
            //   error: 'WhatsApp session is not ready',
            //   details: {
            //     status: status.status,
            //     suggestion: 'Please authenticate with WhatsApp first'
            //   }
            // });
        }
        console.log('[WAHA Controller] Fetching groups...');
        const startTime = Date.now();
        // Try WAHA-compliant groups endpoint first
        let groups = await wahaService.getGroups();
        if (!groups || groups.length === 0) {
            console.log('[WAHA Controller] No groups found, trying refresh...');
            // Ask WAHA to refresh then try again quickly
            await wahaService.refreshGroups();
            groups = await wahaService.getGroups();
        }
        const duration = Date.now() - startTime;
        console.log(`[WAHA Controller] ✅ Successfully fetched ${groups.length} groups in ${duration}ms`);
        res.json({
            success: true,
            data: groups,
            meta: {
                count: groups.length,
                loadTime: duration
            }
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Error getting groups:', error);
        let statusCode = 500;
        let errorMessage = 'Failed to get WhatsApp groups';
        let suggestion = 'Please try again or check your connection';
        if (error.message?.includes('timeout')) {
            statusCode = 408;
            errorMessage = 'Group loading timed out';
            suggestion = 'The WhatsApp service is taking longer than expected. Please try again in a moment.';
        }
        else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            statusCode = 503;
            errorMessage = 'WhatsApp service unavailable';
            suggestion = 'The WhatsApp service is temporarily unavailable. Please try again later.';
        }
        else if (error.response?.status === 401) {
            statusCode = 401;
            errorMessage = 'WhatsApp authentication required';
            suggestion = 'Please authenticate with WhatsApp first.';
        }
        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            details: {
                suggestion,
                timestamp: new Date().toISOString()
            }
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
        // Check session status first - temporarily log for debugging
        const status = await wahaService.getStatus();
        console.log('[WAHA Controller DEBUG] Session status for getPrivateChats:', status);
        // Temporarily disable isReady check to debug authentication issues
        if (!status.isReady) {
            console.log('[WAHA Controller DEBUG] Session not ready but continuing for debugging');
            // return res.status(400).json({
            //   success: false,
            //   error: 'WhatsApp session is not ready',
            //   details: {
            //     status: status.status,
            //     suggestion: 'Please authenticate with WhatsApp first'
            //   }
            // });
        }
        console.log('[WAHA Controller] Fetching private chats...');
        const startTime = Date.now();
        const chats = await wahaService.getChats();
        // Filter only private chats (not @g.us)
        const privateChats = chats.filter(chat => !chat.isGroup && !(typeof chat.id === 'string' && chat.id.includes('@g.us')));
        const duration = Date.now() - startTime;
        console.log(`[WAHA Controller] ✅ Successfully fetched ${privateChats.length} private chats in ${duration}ms`);
        res.json({
            success: true,
            data: privateChats,
            meta: {
                count: privateChats.length,
                loadTime: duration
            }
        });
    }
    catch (error) {
        console.error('[WAHA Controller] Error getting private chats:', error);
        let statusCode = 500;
        let errorMessage = 'Failed to get WhatsApp private chats';
        let suggestion = 'Please try again or check your connection';
        if (error.message?.includes('timeout')) {
            statusCode = 408;
            errorMessage = 'Private chat loading timed out';
            suggestion = 'The WhatsApp service is taking longer than expected. Please try again in a moment.';
        }
        else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            statusCode = 503;
            errorMessage = 'WhatsApp service unavailable';
            suggestion = 'The WhatsApp service is temporarily unavailable. Please try again later.';
        }
        else if (error.response?.status === 401) {
            statusCode = 401;
            errorMessage = 'WhatsApp authentication required';
            suggestion = 'Please authenticate with WhatsApp first.';
        }
        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            details: {
                suggestion,
                timestamp: new Date().toISOString()
            }
        });
    }
};
exports.getPrivateChats = getPrivateChats;
/**
 * Restart WhatsApp session
 */
const restartSession = async (req, res) => {
    try {
        console.log('[WAHA Controller] Restart session request received');
        const wahaService = getWAHAService();
        const session = await wahaService.restartSession();
        console.log('[WAHA Controller] ✅ Session restarted successfully');
        res.json({
            success: true,
            message: 'WhatsApp session restarted successfully',
            data: {
                sessionStatus: session.status,
                sessionName: session.name,
                isReady: session.status === 'WORKING',
                qrAvailable: session.status === 'SCAN_QR_CODE'
            }
        });
    }
    catch (error) {
        console.error('[WAHA Controller] ❌ Error restarting session:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to restart WhatsApp service',
            suggestion: 'Please check WAHA service availability and try again'
        });
    }
};
exports.restartSession = restartSession;
/**
 * Force restart WhatsApp session
 */
const forceRestart = async (req, res) => {
    try {
        console.log('[WAHA Controller] Force restart session request received');
        const wahaService = getWAHAService();
        // Stop monitoring during restart
        wahaService.stopStatusMonitoring();
        // Force restart the session
        const session = await wahaService.restartSession();
        console.log('[WAHA Controller] ✅ Force restart completed');
        // Resume monitoring
        wahaService.startStatusMonitoring();
        res.json({
            success: true,
            message: 'WhatsApp service force restart completed',
            data: {
                sessionStatus: session.status,
                sessionName: session.name,
                isReady: session.status === 'WORKING',
                qrAvailable: session.status === 'SCAN_QR_CODE'
            }
        });
    }
    catch (error) {
        console.error('[WAHA Controller] ❌ Error force restarting session:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to force restart WhatsApp service',
            suggestion: 'Please check WAHA service availability and try again'
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
/**
 * Initialize/Create session endpoint
 */
const initializeSession = async (req, res) => {
    try {
        console.log('[WAHA Controller] 🚀 MANUAL session initialization request received');
        const wahaService = getWAHAService();
        // First check current session status
        let currentStatus;
        try {
            currentStatus = await wahaService.getSessionStatus();
            console.log('[WAHA Controller] Current session status before creation:', currentStatus);
        }
        catch (statusError) {
            console.log('[WAHA Controller] Session status check failed (expected for new session):', statusError);
        }
        const session = await wahaService.startSession();
        console.log('[WAHA Controller] ✅ Session creation completed:', session);
        res.json({
            success: true,
            data: {
                sessionName: session.name,
                sessionStatus: session.status,
                currentStatus: currentStatus,
                message: 'Session initialized successfully'
            }
        });
    }
    catch (error) {
        console.error('[WAHA Controller] ❌ Error initializing session:', error);
        console.error('[WAHA Controller] Error details:', {
            status: error?.response?.status,
            statusText: error?.response?.statusText,
            data: error?.response?.data,
            message: error?.message
        });
        res.status(500).json({
            success: false,
            error: error?.message || 'Failed to initialize session',
            details: {
                status: error?.response?.status,
                data: error?.response?.data
            }
        });
    }
};
exports.initializeSession = initializeSession;
