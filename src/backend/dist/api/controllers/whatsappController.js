"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPhoneAuthCode = exports.sendPhoneAuthCode = exports.forceHistorySync = exports.forceRestart = exports.getDiagnostics = exports.clearWhatsAppAuth = exports.getMonitoredKeywords = exports.removeMonitoredKeyword = exports.addMonitoredKeyword = exports.refreshWhatsAppChats = exports.getWhatsAppMessages = exports.getWhatsAppPrivateChats = exports.getWhatsAppGroups = exports.restartWhatsAppService = exports.getQRCode = exports.getConnectionStatus = exports.updateWhatsAppConfig = exports.getWhatsAppStats = exports.sendWhatsAppMessage = exports.getContactMessages = exports.getWhatsAppContacts = exports.handleWhatsAppWebhook = void 0;
const WhatsAppMessage_1 = __importDefault(require("../../models/WhatsAppMessage"));
const WhatsAppContact_1 = __importDefault(require("../../models/WhatsAppContact"));
const whatsappBaileysService_1 = __importDefault(require("../../services/whatsappBaileysService"));
// Get WhatsApp service singleton instance (lazy initialization)
const getWhatsAppService = () => {
    return whatsappBaileysService_1.default.getInstance();
};
// Initialize WhatsApp service listeners when needed
let serviceInitialized = false;
const initializeWhatsAppService = () => {
    if (serviceInitialized)
        return;
    const whatsappService = getWhatsAppService();
    // Set up event listeners for WhatsApp service
    whatsappService.on('newMessage', async (messageData) => {
        await processWhatsAppWebMessage(messageData);
        // Emit to Socket.io clients
        const io_instance = global.io;
        if (io_instance) {
            io_instance.emit('whatsapp:message', messageData);
        }
    });
    whatsappService.on('qr', (qrData) => {
        const io_instance = global.io;
        if (io_instance) {
            io_instance.emit('whatsapp:qr', qrData);
        }
    });
    whatsappService.on('status', (statusData) => {
        const io_instance = global.io;
        if (io_instance) {
            io_instance.emit('whatsapp:status', statusData);
        }
    });
    whatsappService.on('chats_updated', (chatsData) => {
        console.log('[WhatsApp Controller] Received chats_updated event:', {
            groupsCount: chatsData.groupsCount,
            privateChatsCount: chatsData.privateChatsCount,
            firstGroupName: chatsData.groups?.[0]?.name || 'None'
        });
        const io_instance = global.io;
        if (io_instance) {
            console.log('[WhatsApp Controller] Emitting whatsapp:chats_updated to Socket.io clients');
            io_instance.emit('whatsapp:chats_updated', chatsData);
        }
        else {
            console.log('[WhatsApp Controller] No Socket.io instance available');
        }
    });
    serviceInitialized = true;
};
// Function to normalize Baileys message types to our schema-supported types
function normalizeMessageType(messageType) {
    const typeMapping = {
        'conversation': 'text',
        'extendedTextMessage': 'text',
        'imageMessage': 'image',
        'videoMessage': 'video',
        'audioMessage': 'audio',
        'documentMessage': 'document',
        'stickerMessage': 'image',
        'reactionMessage': 'text',
        'groupInviteMessage': 'text',
        'pollCreationMessage': 'text',
        'pollUpdateMessage': 'text',
        'liveLocationMessage': 'location',
        'templateMessage': 'text',
        'buttonsMessage': 'text',
        'listMessage': 'text',
        'protocolMessage': 'text',
        'orderMessage': 'text',
        'paymentMessage': 'text',
        'viewOnceMessage': 'text',
        'highlyStructuredMessage': 'text',
        'senderKeyDistributionMessage': 'text',
        'fastRatchetKeySenderKeyDistributionMessage': 'text',
        'sendPaymentMessage': 'text',
        'requestPaymentMessage': 'text'
    };
    // If we have a mapping, use the normalized type, otherwise keep the original
    const allowedTypes = [
        'text', 'image', 'document', 'audio', 'video', 'location', 'contact',
        'extendedTextMessage', 'senderKeyDistributionMessage', 'conversation',
        'imageMessage', 'videoMessage', 'audioMessage', 'documentMessage',
        'stickerMessage', 'reactionMessage', 'groupInviteMessage',
        'pollCreationMessage', 'pollUpdateMessage', 'liveLocationMessage',
        'templateMessage', 'buttonsMessage', 'listMessage', 'protocolMessage',
        'orderMessage', 'paymentMessage', 'viewOnceMessage', 'highlyStructuredMessage',
        'fastRatchetKeySenderKeyDistributionMessage', 'sendPaymentMessage', 'requestPaymentMessage'
    ];
    // If the type is already in our allowed list, return it as-is
    if (allowedTypes.includes(messageType)) {
        return messageType;
    }
    // If we have a mapping, use it
    if (typeMapping[messageType]) {
        return typeMapping[messageType];
    }
    // Default fallback for unknown types
    return 'text';
}
const handleWhatsAppWebhook = async (req, res) => {
    console.log("[WhatsApp Webhook] Received webhook from WhatsApp Web.js service:");
    console.log("[WhatsApp Webhook] Body:", JSON.stringify(req.body, null, 2));
    try {
        const messageData = req.body;
        // Process the message from WhatsApp Web.js service
        await processWhatsAppWebMessage(messageData);
        res.status(200).json({ success: true, message: 'Message processed' });
    }
    catch (error) {
        console.error('[WhatsApp Webhook] Error processing webhook:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};
exports.handleWhatsAppWebhook = handleWhatsAppWebhook;
async function processWhatsAppWebMessage(messageData) {
    try {
        // Skip messages sent by us
        if (messageData.fromMe) {
            console.log('[WhatsApp] Skipping outgoing message');
            return;
        }
        // Extract phone number from 'from' field (format: number@c.us)
        const phoneNumber = messageData.from.split('@')[0];
        // Process contact information
        let contact = await WhatsAppContact_1.default.findOne({ phoneNumber });
        if (!contact) {
            contact = new WhatsAppContact_1.default({
                phoneNumber,
                name: messageData.contactName || `Contact ${phoneNumber}`,
                isOnline: true,
                lastSeen: new Date(),
                unreadCount: 1,
                isBusinessContact: messageData.isGroup || false,
                totalMessages: 1,
                totalIncomingMessages: 1,
                totalOutgoingMessages: 0
            });
            await contact.save();
            console.log(`[WhatsApp] Created new contact: ${contact.name} (${contact.phoneNumber})`);
        }
        else {
            // Update existing contact
            contact.lastSeen = new Date();
            contact.unreadCount += 1;
            contact.isOnline = true;
            contact.lastMessage = messageData.body || '[Media]';
            contact.lastMessageTimestamp = new Date();
            // Update contact statistics manually
            contact.totalMessages += 1;
            contact.totalIncomingMessages += 1;
            await contact.save();
            console.log(`[WhatsApp] Updated existing contact: ${contact.name}`);
        }
        // Normalize message type for database storage
        const normalizedType = normalizeMessageType(messageData.type);
        // Save the message
        const whatsappMessage = new WhatsAppMessage_1.default({
            messageId: messageData.id,
            from: phoneNumber,
            to: 'business', // Our business number
            message: messageData.body || '',
            timestamp: new Date(messageData.timestamp * 1000),
            type: normalizedType,
            status: 'received',
            isIncoming: true,
            contactId: contact._id,
            metadata: {
                isGroup: messageData.isGroup,
                groupName: messageData.groupName,
                contactName: messageData.contactName,
                originalType: messageData.type // Store original type for debugging
            }
        });
        await whatsappMessage.save();
        console.log(`[WhatsApp] Saved message from ${contact.name}: ${messageData.body || '[Media]'}`);
        // Emit real-time update to frontend
        const io_instance = global.io;
        if (io_instance) {
            io_instance.emit('whatsapp:message', {
                message: whatsappMessage,
                contact: contact
            });
        }
        // Auto-reply logic (if enabled)
        await handleAutoReply(messageData, contact);
    }
    catch (error) {
        console.error('[WhatsApp] Error processing message:', error);
    }
}
async function handleAutoReply(incomingMessage, contact) {
    // Simple auto-reply logic - can be enhanced based on business rules
    const autoReplyEnabled = process.env.WHATSAPP_AUTO_REPLY_ENABLED === 'true';
    if (!autoReplyEnabled)
        return;
    const businessHours = isBusinessHours();
    let replyMessage = '';
    if (businessHours) {
        replyMessage = "Thank you for contacting us! We'll get back to you shortly.";
    }
    else {
        replyMessage = "Thank you for your message. We're currently closed but will respond during business hours.";
    }
    // Send auto-reply through WhatsApp Web.js service
    try {
        await sendMessageViaService(incomingMessage.from, replyMessage);
        console.log(`[WhatsApp Auto-Reply] Sent to ${contact.name}: ${replyMessage}`);
    }
    catch (error) {
        console.error('[WhatsApp Auto-Reply] Failed to send:', error.message);
    }
}
function isBusinessHours() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    // Business hours: Monday-Friday, 9 AM - 6 PM
    return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
}
// Get all WhatsApp contacts for a user
const getWhatsAppContacts = async (req, res) => {
    try {
        const contacts = await WhatsAppContact_1.default.find()
            .sort({ lastSeen: -1 })
            .limit(50);
        res.json({
            success: true,
            data: contacts
        });
    }
    catch (error) {
        console.error('[WhatsApp] Error fetching contacts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch contacts'
        });
    }
};
exports.getWhatsAppContacts = getWhatsAppContacts;
// Get messages for a specific contact
const getContactMessages = async (req, res) => {
    try {
        const { contactId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const messages = await WhatsAppMessage_1.default.find({ contactId })
            .sort({ timestamp: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .populate('contactId');
        res.json({
            success: true,
            data: messages.reverse() // Reverse to show chronological order
        });
    }
    catch (error) {
        console.error('[WhatsApp] Error fetching messages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch messages'
        });
    }
};
exports.getContactMessages = getContactMessages;
// Helper function to send message via WhatsApp service
async function sendMessageViaService(to, message) {
    try {
        const whatsappService = getWhatsAppService();
        await whatsappService.sendMessage(to, message);
        return { success: true };
    }
    catch (error) {
        console.error('[WhatsApp Service] Error sending message:', error.message);
        throw error;
    }
}
// Send a WhatsApp message
const sendWhatsAppMessage = async (req, res) => {
    try {
        const { to, message, type = 'text' } = req.body;
        // Find or create contact
        let contact = await WhatsAppContact_1.default.findOne({ phoneNumber: to });
        if (!contact) {
            contact = new WhatsAppContact_1.default({
                phoneNumber: to,
                name: `Contact ${to}`,
                isOnline: false,
                lastSeen: new Date(),
                unreadCount: 0,
                totalMessages: 0,
                totalIncomingMessages: 0,
                totalOutgoingMessages: 0,
                isBusinessContact: false,
                isBlocked: false,
                isMuted: false
            });
            await contact.save();
        }
        // Format the 'to' field for WhatsApp Web.js (add @c.us if not present)
        const whatsappTo = to.includes('@') ? to : `${to}@c.us`;
        // Send message via WhatsApp Web.js service
        const serviceResponse = await sendMessageViaService(whatsappTo, message);
        // Save the message to our database
        const whatsappMessage = new WhatsAppMessage_1.default({
            messageId: `msg_${Date.now()}`,
            from: 'business',
            to: to,
            message: message,
            timestamp: new Date(),
            type: type,
            status: 'sent',
            isIncoming: false,
            contactId: contact._id
        });
        await whatsappMessage.save();
        // Update contact statistics
        contact.unreadCount = 0; // Reset since we're responding
        contact.lastMessage = message;
        contact.lastMessageTimestamp = new Date();
        // Update contact statistics manually
        contact.totalMessages += 1;
        contact.totalOutgoingMessages += 1;
        await contact.save();
        // Emit real-time update
        const io_instance = global.io;
        if (io_instance) {
            io_instance.emit('whatsapp:message', {
                message: whatsappMessage,
                contact: contact
            });
        }
        console.log(`[WhatsApp] Message sent to ${contact.name}: ${message}`);
        res.json({
            success: true,
            data: whatsappMessage,
            serviceResponse
        });
    }
    catch (error) {
        console.error('[WhatsApp] Error sending message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message: ' + error.message
        });
    }
};
exports.sendWhatsAppMessage = sendWhatsAppMessage;
// Get WhatsApp statistics
const getWhatsAppStats = async (req, res) => {
    try {
        const totalContacts = await WhatsAppContact_1.default.countDocuments();
        const totalMessages = await WhatsAppMessage_1.default.countDocuments();
        // Messages this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const messagesThisWeek = await WhatsAppMessage_1.default.countDocuments({
            timestamp: { $gte: weekAgo }
        });
        // Calculate response rate (simplified)
        const incomingMessages = await WhatsAppMessage_1.default.countDocuments({ isIncoming: true });
        const outgoingMessages = await WhatsAppMessage_1.default.countDocuments({ isIncoming: false });
        const responseRate = incomingMessages > 0 ? Math.round((outgoingMessages / incomingMessages) * 100) : 0;
        res.json({
            success: true,
            data: {
                totalContacts,
                totalMessages,
                messagesThisWeek,
                responseRate,
                avgResponseTime: 120 // This would be calculated from actual data
            }
        });
    }
    catch (error) {
        console.error('[WhatsApp] Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
};
exports.getWhatsAppStats = getWhatsAppStats;
// Update WhatsApp configuration
const updateWhatsAppConfig = async (req, res) => {
    try {
        const { phoneNumber, webhookUrl, verifyToken, autoReply } = req.body;
        // Here you would save configuration to database or environment
        // For now, we'll just return success
        console.log('[WhatsApp] Configuration updated:', {
            phoneNumber,
            webhookUrl,
            autoReply
        });
        res.json({
            success: true,
            message: 'Configuration updated successfully'
        });
    }
    catch (error) {
        console.error('[WhatsApp] Error updating config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update configuration'
        });
    }
};
exports.updateWhatsAppConfig = updateWhatsAppConfig;
// Get WhatsApp connection status from WhatsApp service
const getConnectionStatus = async (req, res) => {
    try {
        const whatsappService = getWhatsAppService();
        initializeWhatsAppService(); // Ensure listeners are set up
        const serviceStatus = whatsappService.getStatus();
        const status = {
            connected: serviceStatus.isReady && serviceStatus.isClientReady,
            authenticated: serviceStatus.isReady && serviceStatus.isClientReady, // Add authenticated field
            lastHeartbeat: new Date(),
            serviceStatus: serviceStatus.status,
            isReady: serviceStatus.isReady,
            isClientReady: serviceStatus.isClientReady,
            groupsCount: serviceStatus.groupsCount || 0,
            privateChatsCount: serviceStatus.privateChatsCount || 0,
            messagesCount: serviceStatus.messagesCount || 0,
            qrAvailable: serviceStatus.qrAvailable || false,
            timestamp: serviceStatus.timestamp,
            monitoredKeywords: serviceStatus.monitoredKeywords
        };
        res.json({
            success: true,
            data: status
        });
    }
    catch (error) {
        console.error('[WhatsApp] Error checking connection status:', error);
        res.json({
            success: true,
            data: {
                connected: false,
                lastHeartbeat: new Date(),
                serviceStatus: 'error',
                isReady: false,
                isClientReady: false,
                error: error.message
            }
        });
    }
};
exports.getConnectionStatus = getConnectionStatus;
// Get QR Code for WhatsApp Web authentication
const getQRCode = async (req, res) => {
    try {
        const whatsappService = getWhatsAppService();
        const { force } = req.query;
        // Check if we should force generate a new QR code
        if (force === 'true') {
            console.log('[WhatsApp] Force QR generation requested');
            const result = await whatsappService.forceQRGeneration();
            if (result.success) {
                res.json({
                    success: true,
                    data: {
                        qrCode: result.qrCode,
                        message: result.message
                    }
                });
            }
            else {
                res.json({
                    success: false,
                    data: {
                        qrCode: null,
                        message: result.message
                    }
                });
            }
            return;
        }
        // Normal QR code retrieval
        const qrCode = whatsappService.getQRCode();
        const status = whatsappService.getStatus();
        if (qrCode) {
            res.json({
                success: true,
                data: {
                    qrCode: qrCode,
                    message: 'QR code available for scanning'
                }
            });
        }
        else {
            // If no QR code and service is having issues, suggest force generation
            const hasConnectionIssues = !status.isReady && !status.isClientReady &&
                (status.status === 'error' || status.status === 'disconnected');
            res.json({
                success: true,
                data: {
                    qrCode: null,
                    message: hasConnectionIssues
                        ? 'WhatsApp service has connection issues. Try force generating QR code.'
                        : 'WhatsApp is already connected or QR code not yet generated',
                    canForceGenerate: hasConnectionIssues
                }
            });
        }
    }
    catch (error) {
        console.error('[WhatsApp] Error getting QR code:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get QR code'
        });
    }
};
exports.getQRCode = getQRCode;
// Restart WhatsApp service
const restartWhatsAppService = async (req, res) => {
    try {
        const whatsappService = getWhatsAppService();
        initializeWhatsAppService();
        await whatsappService.restart();
        res.json({
            success: true,
            message: 'WhatsApp service restart initiated'
        });
    }
    catch (error) {
        console.error('[WhatsApp] Error restarting service:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to restart WhatsApp service: ' + error.message
        });
    }
};
exports.restartWhatsAppService = restartWhatsAppService;
// Get WhatsApp groups
const getWhatsAppGroups = async (req, res) => {
    try {
        const whatsappService = getWhatsAppService();
        const groups = whatsappService.getGroups();
        res.json({
            success: true,
            data: groups
        });
    }
    catch (error) {
        console.error('[WhatsApp] Error getting groups:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get WhatsApp groups: ' + error.message
        });
    }
};
exports.getWhatsAppGroups = getWhatsAppGroups;
// Get WhatsApp private chats
const getWhatsAppPrivateChats = async (req, res) => {
    try {
        const whatsappService = getWhatsAppService();
        const privateChats = whatsappService.getPrivateChats();
        res.json({
            success: true,
            data: privateChats
        });
    }
    catch (error) {
        console.error('[WhatsApp] Error getting private chats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get WhatsApp private chats: ' + error.message
        });
    }
};
exports.getWhatsAppPrivateChats = getWhatsAppPrivateChats;
// Get WhatsApp messages
const getWhatsAppMessages = async (req, res) => {
    try {
        const whatsappService = getWhatsAppService();
        const { limit = 50, groupId, chatId } = req.query;
        // Support both groupId (legacy) and chatId (new) parameters
        const targetChatId = chatId || groupId;
        const messages = whatsappService.getMessages(Number(limit), targetChatId);
        res.json({
            success: true,
            data: messages
        });
    }
    catch (error) {
        console.error('[WhatsApp] Error getting messages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get WhatsApp messages: ' + error.message
        });
    }
};
exports.getWhatsAppMessages = getWhatsAppMessages;
// Refresh WhatsApp chats
const refreshWhatsAppChats = async (req, res) => {
    try {
        const whatsappService = getWhatsAppService();
        const status = whatsappService.getStatus();
        // Check if WhatsApp is ready before attempting to refresh
        if (!status.isReady || !status.isClientReady) {
            return res.json({
                success: false,
                error: 'WhatsApp client is not ready. Please ensure WhatsApp is connected and try again.',
                details: {
                    isReady: status.isReady,
                    isClientReady: status.isClientReady,
                    status: status.status,
                    suggestion: status.qrAvailable ? 'Please scan the QR code first' : 'Please restart the WhatsApp service'
                }
            });
        }
        await whatsappService.refreshChats();
        // Get updated status after refresh
        const updatedStatus = whatsappService.getStatus();
        res.json({
            success: true,
            message: 'WhatsApp chats refreshed successfully',
            data: {
                groupsCount: updatedStatus.groupsCount || 0,
                privateChatsCount: updatedStatus.privateChatsCount || 0,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[WhatsApp] Error refreshing chats:', error);
        // Provide more helpful error messages
        let userFriendlyMessage = 'Failed to refresh WhatsApp chats';
        let statusCode = 500;
        if (error.message.includes('not ready')) {
            userFriendlyMessage = 'WhatsApp is not connected. Please scan the QR code first.';
            statusCode = 400;
        }
        else if (error.message.includes('connection') || error.message.includes('socket')) {
            userFriendlyMessage = 'WhatsApp connection is unstable. Please try again in a moment.';
            statusCode = 503;
        }
        else if (error.message.includes('browser')) {
            userFriendlyMessage = 'WhatsApp service is having technical difficulties. Please try restarting the service.';
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
exports.refreshWhatsAppChats = refreshWhatsAppChats;
// Add monitored keyword
const addMonitoredKeyword = async (req, res) => {
    try {
        const { keyword } = req.body;
        if (!keyword || typeof keyword !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Keyword is required and must be a string'
            });
        }
        const whatsappService = getWhatsAppService();
        whatsappService.addMonitoredKeyword(keyword);
        res.json({
            success: true,
            message: `Keyword "${keyword}" added to monitoring`,
            monitoredKeywords: whatsappService.getMonitoredKeywords()
        });
    }
    catch (error) {
        console.error('[WhatsApp] Error adding monitored keyword:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add monitored keyword: ' + error.message
        });
    }
};
exports.addMonitoredKeyword = addMonitoredKeyword;
// Remove monitored keyword
const removeMonitoredKeyword = async (req, res) => {
    try {
        const { keyword } = req.params;
        const whatsappService = getWhatsAppService();
        const removed = whatsappService.removeMonitoredKeyword(keyword);
        if (removed) {
            res.json({
                success: true,
                message: `Keyword "${keyword}" removed from monitoring`,
                monitoredKeywords: whatsappService.getMonitoredKeywords()
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: 'Keyword not found in monitored list'
            });
        }
    }
    catch (error) {
        console.error('[WhatsApp] Error removing monitored keyword:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove monitored keyword: ' + error.message
        });
    }
};
exports.removeMonitoredKeyword = removeMonitoredKeyword;
// Get monitored keywords
const getMonitoredKeywords = async (req, res) => {
    try {
        const whatsappService = getWhatsAppService();
        const keywords = whatsappService.getMonitoredKeywords();
        res.json({
            success: true,
            data: keywords
        });
    }
    catch (error) {
        console.error('[WhatsApp] Error getting monitored keywords:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get monitored keywords: ' + error.message
        });
    }
};
exports.getMonitoredKeywords = getMonitoredKeywords;
// Clear authentication data
const clearWhatsAppAuth = async (req, res) => {
    try {
        const whatsappService = getWhatsAppService();
        await whatsappService.clearAuth();
        res.json({
            success: true,
            message: 'WhatsApp authentication data cleared successfully'
        });
    }
    catch (error) {
        console.error('[WhatsApp] Error clearing auth data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear WhatsApp auth data: ' + error.message
        });
    }
};
exports.clearWhatsAppAuth = clearWhatsAppAuth;
// Diagnostic endpoint to check Puppeteer configuration
const getDiagnostics = async (req, res) => {
    try {
        const whatsappService = getWhatsAppService();
        const { testBrowser } = req.query;
        const diagnostics = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            renderEnvironment: !!process.env.RENDER,
            puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
            puppeteerSkipDownload: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD,
            hasWhatsAppService: !!whatsappService,
            whatsappServiceStatus: whatsappService.getStatus(),
            systemInfo: {
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version
            }
        };
        // Run browser environment test if requested
        if (testBrowser === 'true') {
            console.log('[WhatsApp Diagnostics] Running browser environment test...');
            const browserTest = await whatsappService.testBrowserEnvironment();
            diagnostics.browserTest = browserTest;
        }
        res.json({
            success: true,
            data: diagnostics
        });
    }
    catch (error) {
        console.error('[WhatsApp] Error getting diagnostics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get diagnostics: ' + error.message
        });
    }
};
exports.getDiagnostics = getDiagnostics;
const forceRestart = async (req, res) => {
    try {
        console.log('[WhatsApp] Force restart requested');
        // Clear auth and restart completely
        await getWhatsAppService().clearAuth();
        res.json({
            success: true,
            message: 'WhatsApp service force restart initiated. This will clear all authentication data and restart from scratch.'
        });
    }
    catch (error) {
        console.error('[WhatsApp] Error during force restart:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to force restart WhatsApp service: ' + error.message
        });
    }
};
exports.forceRestart = forceRestart;
const forceHistorySync = async (req, res) => {
    try {
        initializeWhatsAppService();
        const whatsappService = getWhatsAppService();
        await whatsappService.forceHistorySync();
        res.json({
            success: true,
            message: 'WhatsApp history sync initiated - check logs for chat discovery'
        });
    }
    catch (error) {
        console.error('[WhatsApp Controller] Error during history sync:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
exports.forceHistorySync = forceHistorySync;
// Send phone authentication code
const sendPhoneAuthCode = async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required and must be a string'
            });
        }
        // Clean phone number (remove non-digits and add country code if needed)
        const cleanedPhone = phoneNumber.replace(/\D/g, '');
        if (cleanedPhone.length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number format'
            });
        }
        // Check if WAHA service is available first
        const whatsappService = getWhatsAppService();
        initializeWhatsAppService();
        // Request phone authentication code from WhatsApp
        const result = await whatsappService.requestPhoneCode(cleanedPhone);
        if (result.success) {
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
            // Check if it's a known "not supported" error
            if (result.error?.includes('not available') || result.error?.includes('not supported')) {
                console.log('[WhatsApp] Phone auth not supported by WAHA service, directing user to QR method');
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
        console.error('[WhatsApp] Error sending phone auth code:', error);
        // Check if it's a network/connection error to WAHA service
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.response?.status >= 500) {
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
// Verify phone authentication code
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
        const whatsappService = getWhatsAppService();
        // Verify the code with WhatsApp
        const result = await whatsappService.verifyPhoneCode(phoneNumber, code);
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
        console.error('[WhatsApp] Error verifying phone auth code:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify code: ' + error.message
        });
    }
};
exports.verifyPhoneAuthCode = verifyPhoneAuthCode;
