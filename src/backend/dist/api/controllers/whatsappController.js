"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearWhatsAppAuth = exports.getMonitoredKeywords = exports.removeMonitoredKeyword = exports.addMonitoredKeyword = exports.refreshWhatsAppChats = exports.getWhatsAppMessages = exports.getWhatsAppPrivateChats = exports.getWhatsAppGroups = exports.restartWhatsAppService = exports.getQRCode = exports.getConnectionStatus = exports.updateWhatsAppConfig = exports.getWhatsAppStats = exports.sendWhatsAppMessage = exports.getContactMessages = exports.getWhatsAppContacts = exports.handleWhatsAppWebhook = void 0;
const WhatsAppMessage_1 = __importDefault(require("../../models/WhatsAppMessage"));
const WhatsAppContact_1 = __importDefault(require("../../models/WhatsAppContact"));
const whatsappService_1 = __importDefault(require("../../services/whatsappService"));
// Get WhatsApp service singleton instance (lazy initialization)
const getWhatsAppService = () => {
    return whatsappService_1.default.getInstance();
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
        const io_instance = global.io;
        if (io_instance) {
            io_instance.emit('whatsapp:chats_updated', chatsData);
        }
    });
    serviceInitialized = true;
};
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
        // Save the message
        const whatsappMessage = new WhatsAppMessage_1.default({
            messageId: messageData.id,
            from: phoneNumber,
            to: 'business', // Our business number
            message: messageData.body || '',
            timestamp: new Date(messageData.timestamp * 1000),
            type: messageData.type,
            status: 'received',
            isIncoming: true,
            contactId: contact._id,
            metadata: {
                isGroup: messageData.isGroup,
                groupName: messageData.groupName,
                contactName: messageData.contactName
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
        const serviceStatus = whatsappService.getStatus();
        const status = {
            connected: serviceStatus.isReady && serviceStatus.isClientReady,
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
        const qrCode = whatsappService.getQRCode();
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
            res.json({
                success: true,
                data: {
                    qrCode: null,
                    message: 'WhatsApp is already connected or QR code not yet generated'
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
        const { limit = 50, groupId } = req.query;
        const messages = whatsappService.getMessages(Number(limit), groupId);
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
        await whatsappService.refreshChats();
        res.json({
            success: true,
            message: 'WhatsApp chats refreshed successfully'
        });
    }
    catch (error) {
        console.error('[WhatsApp] Error refreshing chats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh WhatsApp chats: ' + error.message
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
