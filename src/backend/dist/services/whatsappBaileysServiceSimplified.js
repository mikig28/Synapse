"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
const pino_1 = __importDefault(require("pino"));
const qrcode_1 = __importDefault(require("qrcode"));
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const whatsappConnectionManager_1 = require("./whatsappConnectionManager");
/**
 * Simplified WhatsApp Baileys Service with Circuit Breaker Pattern
 * Reduced from 1600+ lines to ~500 lines with better reliability
 */
class WhatsAppBaileysServiceSimplified extends events_1.EventEmitter {
    constructor() {
        super();
        this.socket = null;
        // Core state
        this.isReady = false;
        this.isClientReady = false;
        this.connectionStatus = 'disconnected';
        this.qrString = null;
        this.qrDataUrl = null;
        // Data storage
        this.groups = [];
        this.privateChats = [];
        this.messages = new Map();
        this.monitoredKeywords = ['פתק 2', 'פתק2', 'petak 2', 'petak2', 'פתק'];
        this.connectionTimer = null;
        // Configuration
        this.authDir = './baileys_auth_info';
        this.chatDataFile = './baileys_chat_data.json';
        this.MAX_MESSAGES_PER_CHAT = 50; // Reduced from 100
        this.CONNECTION_TIMEOUT = 30000; // 30 seconds
        this.INITIALIZATION_TIMEOUT = 120000; // 2 minutes
        this.connectionManager = new whatsappConnectionManager_1.WhatsAppConnectionManager();
        this.healthMonitor = new whatsappConnectionManager_1.WhatsAppHealthMonitor();
        this.setupConnectionManager();
        this.setupHealthMonitor();
    }
    static getInstance() {
        if (!WhatsAppBaileysServiceSimplified.instance) {
            WhatsAppBaileysServiceSimplified.instance = new WhatsAppBaileysServiceSimplified();
        }
        return WhatsAppBaileysServiceSimplified.instance;
    }
    setupConnectionManager() {
        this.connectionManager.on('stateChange', (state) => {
            console.log('[WhatsApp] Circuit breaker state:', state);
            this.emit('circuitStateChange', state);
            // Auto-retry when circuit allows it
            if (state.state === 'HALF_OPEN' && !this.isReady) {
                setTimeout(() => {
                    if (this.connectionManager.canAttemptConnection()) {
                        this.initialize();
                    }
                }, 1000);
            }
        });
    }
    setupHealthMonitor() {
        this.healthMonitor.on('healthCheck', async (data) => {
            if (this.socket && this.isClientReady) {
                try {
                    await this.socket.sendPresenceUpdate('available');
                }
                catch (error) {
                    this.healthMonitor.emit('healthFailure', { error });
                }
            }
        });
        this.healthMonitor.on('healthFailure', (data) => {
            console.log('[WhatsApp] Health check failed:', data.error.message);
            if (!this.healthMonitor.isHealthy()) {
                console.log('[WhatsApp] Service unhealthy - triggering reconnection');
                this.handleConnectionFailure(data.error);
            }
        });
    }
    async initialize() {
        // Check circuit breaker
        if (!this.connectionManager.canAttemptConnection()) {
            const state = this.connectionManager.getState();
            console.log(`[WhatsApp] ⏸️ Connection blocked by circuit breaker. Next attempt in ${Math.ceil(state.timeUntilNextAttempt / 1000)}s`);
            this.scheduleNextAttempt(state.timeUntilNextAttempt);
            return;
        }
        console.log('[WhatsApp] 🔄 Initializing WhatsApp service...');
        this.connectionStatus = 'initializing';
        this.isReady = false;
        this.isClientReady = false;
        this.qrString = null;
        this.qrDataUrl = null;
        this.emit('status', { ready: false, message: 'Initializing WhatsApp service...' });
        try {
            // Set initialization timeout
            const initPromise = this.initializeConnection();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Initialization timeout')), this.INITIALIZATION_TIMEOUT));
            await Promise.race([initPromise, timeoutPromise]);
            console.log('[WhatsApp] ✅ Initialization successful');
            this.connectionManager.onConnectionSuccess();
        }
        catch (error) {
            console.error('[WhatsApp] ❌ Initialization failed:', error.message);
            this.handleConnectionFailure(error);
        }
    }
    async initializeConnection() {
        // Ensure auth directory exists
        await fs_extra_1.default.ensureDir(this.authDir);
        this.loadChatData();
        // Create auth state
        const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(this.authDir);
        // Create socket with simplified configuration
        this.socket = (0, baileys_1.default)({
            auth: state,
            printQRInTerminal: false,
            logger: (0, pino_1.default)({ level: 'silent' }),
            browser: ['Synapse Bot', 'Chrome', '120.0.0'],
            generateHighQualityLinkPreview: false,
            syncFullHistory: false,
            markOnlineOnConnect: false,
            defaultQueryTimeoutMs: this.CONNECTION_TIMEOUT,
            connectTimeoutMs: this.CONNECTION_TIMEOUT,
            qrTimeout: 60000, // 1 minute QR timeout
            // Simplified getMessage handler
            getMessage: async () => undefined
        });
        // Set up event handlers
        this.setupEventHandlers(saveCreds);
    }
    setupEventHandlers(saveCreds) {
        if (!this.socket)
            return;
        // Connection updates
        this.socket.ev.on('connection.update', (update) => {
            this.handleConnectionUpdate(update);
        });
        // Credentials update
        this.socket.ev.on('creds.update', saveCreds);
        // Message handlers
        this.socket.ev.on('messages.upsert', (m) => {
            this.handleIncomingMessages(m);
        });
        // Chat handlers
        this.socket.ev.on('chats.upsert', (chats) => {
            this.processChatUpdates(chats);
        });
        // History sync
        this.socket.ev.on('messaging-history.set', (historySync) => {
            this.processHistorySync(historySync);
        });
    }
    handleConnectionUpdate(update) {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            this.handleQRCode(qr);
        }
        if (connection === 'close') {
            this.handleConnectionClose(lastDisconnect);
        }
        else if (connection === 'open') {
            this.handleConnectionOpen();
        }
    }
    async handleQRCode(qr) {
        console.log('[WhatsApp] 🔗 QR Code received');
        this.qrString = qr;
        this.connectionStatus = 'qr_ready';
        try {
            const qrDataUrl = await qrcode_1.default.toDataURL(qr);
            this.qrDataUrl = qrDataUrl;
            this.emit('qr', { qr: qrDataUrl, status: 'qr_ready' });
            qrcode_terminal_1.default.generate(qr, { small: true });
        }
        catch (error) {
            console.error('[WhatsApp] ❌ QR code generation error:', error);
            this.qrDataUrl = null;
            this.emit('qr', { qr: qr, status: 'qr_ready' });
        }
    }
    handleConnectionClose(lastDisconnect) {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== baileys_1.DisconnectReason.loggedOut;
        const error = lastDisconnect?.error || new Error('Connection closed');
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log('[WhatsApp] ❌ Connection closed:', error.message, 'shouldReconnect:', shouldReconnect);
        this.isReady = false;
        this.isClientReady = false;
        this.connectionStatus = 'disconnected';
        this.healthMonitor.stop();
        this.emit('status', { ready: false, message: `WhatsApp disconnected: ${error.message}` });
        if (shouldReconnect && whatsappConnectionManager_1.WhatsAppErrorClassifier.isRetryableError(error)) {
            this.handleConnectionFailure(error);
        }
        else {
            console.log('[WhatsApp] 🔐 Logged out or non-retryable error - manual intervention required');
            if (whatsappConnectionManager_1.WhatsAppErrorClassifier.shouldClearAuth(error)) {
                this.clearAuth();
            }
        }
    }
    handleConnectionOpen() {
        console.log('[WhatsApp] ✅ Connection established successfully!');
        this.isReady = true;
        this.isClientReady = true;
        this.connectionStatus = 'connected';
        this.qrString = null;
        this.qrDataUrl = null;
        this.emit('status', {
            ready: true,
            authenticated: true,
            connected: true,
            message: 'WhatsApp connected successfully!',
            authMethod: 'qr'
        });
        this.emit('ready', { status: 'connected' });
        // Start health monitoring
        this.healthMonitor.start();
        // Initial chat discovery (simplified)
        setTimeout(() => {
            this.performInitialSync();
        }, 2000);
    }
    handleConnectionFailure(error) {
        this.connectionManager.onConnectionFailure(error);
        // Clear auth if needed
        if (whatsappConnectionManager_1.WhatsAppErrorClassifier.shouldClearAuth(error)) {
            console.log('[WhatsApp] 🧹 Clearing auth due to error type');
            this.clearAuth().catch(console.error);
        }
        // Schedule next attempt based on circuit breaker
        const state = this.connectionManager.getState();
        if (state.timeUntilNextAttempt > 0) {
            this.scheduleNextAttempt(state.timeUntilNextAttempt);
        }
    }
    scheduleNextAttempt(delay) {
        if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
        }
        console.log(`[WhatsApp] ⏰ Next connection attempt in ${Math.ceil(delay / 1000)}s`);
        this.connectionTimer = setTimeout(() => {
            if (this.connectionManager.canAttemptConnection()) {
                this.initialize();
            }
        }, delay);
    }
    async performInitialSync() {
        if (!this.socket || !this.isReady)
            return;
        try {
            console.log('[WhatsApp] 🔄 Starting initial sync...');
            await this.socket.sendPresenceUpdate('available');
            // Simple chat discovery
            setTimeout(() => {
                this.emitChatsUpdate();
                this.saveSession();
            }, 3000);
        }
        catch (error) {
            console.error('[WhatsApp] ❌ Initial sync failed:', error);
        }
    }
    // Simplified message handling
    async handleIncomingMessages(messageUpdate) {
        try {
            const { messages } = messageUpdate;
            if (!messages || !Array.isArray(messages))
                return;
            for (const message of messages) {
                if (!message?.key || !message?.message || message.key.fromMe)
                    continue;
                const messageText = this.extractMessageText(message);
                if (!messageText)
                    continue;
                const whatsappMessage = {
                    messageId: message.key.id || '',
                    from: message.key.participant || message.key.remoteJid || '',
                    to: message.key.remoteJid || '',
                    message: messageText,
                    timestamp: new Date(Number(message.messageTimestamp) * 1000 || Date.now()),
                    type: Object.keys(message.message)[0] || 'text',
                    status: 'received',
                    isIncoming: !message.key.fromMe,
                    contactId: 'temp-contact-id'
                };
                this.addMessageToChat(whatsappMessage.to, whatsappMessage);
                this.emit('newMessage', whatsappMessage);
            }
        }
        catch (error) {
            console.error('[WhatsApp] ❌ Message handling error:', error);
        }
    }
    // Simplified chat processing
    async processChatUpdates(chats) {
        try {
            for (const chat of chats) {
                if (!chat?.id)
                    continue;
                const chatInfo = {
                    id: chat.id,
                    name: chat.name || (chat.id.endsWith('@g.us') ? 'Unknown Group' : 'Unknown Contact'),
                    isGroup: chat.id.endsWith('@g.us'),
                    lastMessage: chat.lastMessage?.message || '',
                    timestamp: chat.lastMessage?.messageTimestamp || Date.now(),
                    participantCount: chat.participantCount,
                    description: chat.description
                };
                if (chatInfo.isGroup) {
                    const existingIndex = this.groups.findIndex(g => g.id === chat.id);
                    if (existingIndex >= 0) {
                        this.groups[existingIndex] = chatInfo;
                    }
                    else {
                        this.groups.push(chatInfo);
                    }
                }
                else {
                    const existingIndex = this.privateChats.findIndex(c => c.id === chat.id);
                    if (existingIndex >= 0) {
                        this.privateChats[existingIndex] = chatInfo;
                    }
                    else {
                        this.privateChats.push(chatInfo);
                    }
                }
            }
            this.emitChatsUpdate();
        }
        catch (error) {
            console.error('[WhatsApp] ❌ Chat update error:', error);
        }
    }
    // Simplified history sync
    processHistorySync(historySync) {
        try {
            const { chats = [], messages = [] } = historySync;
            console.log(`[WhatsApp] 📚 Processing history: ${chats.length} chats, ${messages.length} messages`);
            // Process chats
            this.processChatUpdates(chats);
            // Process messages (simplified)
            for (const message of messages.slice(0, 100)) { // Limit to first 100 messages
                try {
                    if (!message?.key?.remoteJid || !message?.message)
                        continue;
                    const messageText = this.extractMessageText(message);
                    if (!messageText)
                        continue;
                    const whatsappMessage = {
                        messageId: message.key.id || '',
                        from: message.key.participant || message.key.remoteJid || '',
                        to: message.key.remoteJid || '',
                        message: messageText,
                        timestamp: new Date(Number(message.messageTimestamp) * 1000 || Date.now()),
                        type: Object.keys(message.message)[0] || 'text',
                        status: 'received',
                        isIncoming: !message.key.fromMe,
                        contactId: 'temp-contact-id'
                    };
                    this.addMessageToChat(whatsappMessage.to, whatsappMessage);
                }
                catch (error) {
                    console.error('[WhatsApp] ❌ History message error:', error);
                }
            }
            this.emitChatsUpdate();
            this.saveChatData();
        }
        catch (error) {
            console.error('[WhatsApp] ❌ History sync error:', error);
        }
    }
    // Utility methods (simplified versions)
    extractMessageText(message) {
        try {
            if (!message?.message)
                return '';
            const msgContent = message.message;
            return msgContent.conversation ||
                msgContent.extendedTextMessage?.text ||
                msgContent.imageMessage?.caption ||
                msgContent.videoMessage?.caption ||
                msgContent.documentMessage?.caption ||
                '[Media]';
        }
        catch (error) {
            return '';
        }
    }
    isMediaMessage(message) {
        if (!message)
            return false;
        return !!(message.imageMessage || message.videoMessage || message.audioMessage || message.documentMessage);
    }
    addMessageToChat(chatId, message) {
        if (!this.messages.has(chatId)) {
            this.messages.set(chatId, []);
        }
        const chatMessages = this.messages.get(chatId);
        chatMessages.unshift(message);
        // Keep only MAX_MESSAGES_PER_CHAT messages
        if (chatMessages.length > this.MAX_MESSAGES_PER_CHAT) {
            chatMessages.splice(this.MAX_MESSAGES_PER_CHAT);
        }
    }
    emitChatsUpdate() {
        this.emit('chats_updated', {
            groups: this.groups,
            privateChats: this.privateChats,
            groupsCount: this.groups.length,
            privateChatsCount: this.privateChats.length,
            timestamp: new Date().toISOString()
        });
    }
    // Data persistence (simplified)
    loadChatData() {
        try {
            if (fs_extra_1.default.existsSync(this.chatDataFile)) {
                const data = JSON.parse(fs_extra_1.default.readFileSync(this.chatDataFile, 'utf8'));
                this.groups = data.groups || [];
                this.privateChats = data.privateChats || [];
                // Load messages
                if (data.messagesByChat) {
                    this.messages.clear();
                    for (const [chatId, msgs] of Object.entries(data.messagesByChat)) {
                        this.messages.set(chatId, msgs);
                    }
                }
                console.log(`[WhatsApp] 📥 Loaded ${this.groups.length} groups, ${this.privateChats.length} chats`);
            }
        }
        catch (error) {
            console.error('[WhatsApp] ❌ Failed to load chat data:', error);
        }
    }
    saveChatData() {
        try {
            const messagesByChat = {};
            for (const [chatId, msgs] of this.messages.entries()) {
                messagesByChat[chatId] = msgs.slice(0, this.MAX_MESSAGES_PER_CHAT);
            }
            const chatData = {
                groups: this.groups,
                privateChats: this.privateChats,
                messagesByChat,
                timestamp: new Date().toISOString()
            };
            fs_extra_1.default.writeFileSync(this.chatDataFile, JSON.stringify(chatData, null, 2));
        }
        catch (error) {
            console.error('[WhatsApp] ❌ Failed to save chat data:', error);
        }
    }
    saveSession() {
        // Session is automatically saved by Baileys auth state
        this.saveChatData();
    }
    // Public API methods (simplified)
    async sendMessage(to, message) {
        if (!this.socket || !this.isReady) {
            return { success: false, error: 'WhatsApp client is not ready' };
        }
        try {
            const formattedTo = to.includes('@') ? to : `${to}@s.whatsapp.net`;
            const sentMessage = await this.socket.sendMessage(formattedTo, { text: message });
            return {
                success: true,
                messageId: sentMessage?.key?.id || undefined
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    getStatus() {
        const connectionState = this.connectionManager.getState();
        return {
            status: this.connectionStatus,
            isReady: this.isReady,
            isClientReady: this.isClientReady,
            groupsCount: this.groups.length,
            privateChatsCount: this.privateChats.length,
            messagesCount: Array.from(this.messages.values()).reduce((sum, msgs) => sum + msgs.length, 0),
            monitoredKeywords: this.monitoredKeywords,
            qrAvailable: !!this.qrString,
            timestamp: new Date().toISOString(),
            circuitState: connectionState,
            healthStatus: this.healthMonitor.isHealthy()
        };
    }
    getQRCode() {
        return this.qrDataUrl;
    }
    getGroups() {
        return this.groups;
    }
    getPrivateChats() {
        return this.privateChats;
    }
    getMessages(limit = 50, chatId) {
        if (chatId) {
            const chatMessages = this.messages.get(chatId) || [];
            return chatMessages.slice(0, limit);
        }
        const allMessages = [];
        for (const chatMessages of this.messages.values()) {
            allMessages.push(...chatMessages);
        }
        return allMessages
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }
    async clearAuth() {
        try {
            console.log('[WhatsApp] 🧹 Clearing authentication data...');
            if (this.socket) {
                this.socket.end(new Error('Service restart requested'));
                this.socket = null;
            }
            if (fs_extra_1.default.existsSync(this.authDir)) {
                await fs_extra_1.default.remove(this.authDir);
            }
            this.isReady = false;
            this.isClientReady = false;
            this.connectionStatus = 'disconnected';
            this.qrString = null;
            this.qrDataUrl = null;
            this.groups = [];
            this.privateChats = [];
            this.messages.clear();
            this.connectionManager.reset();
            this.healthMonitor.stop();
            console.log('[WhatsApp] ✅ Authentication cleared successfully');
        }
        catch (error) {
            console.error('[WhatsApp] ❌ Error clearing auth:', error);
            throw error;
        }
    }
    async restart() {
        console.log('[WhatsApp] 🔄 Restarting service...');
        try {
            this.healthMonitor.stop();
            if (this.connectionTimer) {
                clearTimeout(this.connectionTimer);
                this.connectionTimer = null;
            }
            if (this.socket) {
                this.socket.end(new Error('Service restart requested'));
                this.socket = null;
            }
            this.isReady = false;
            this.isClientReady = false;
            this.connectionStatus = 'disconnected';
            this.qrString = null;
            this.qrDataUrl = null;
            this.connectionManager.reset();
            await new Promise(resolve => setTimeout(resolve, 2000));
            await this.initialize();
        }
        catch (error) {
            console.error('[WhatsApp] ❌ Restart failed:', error);
            throw error;
        }
    }
    // Cleanup on shutdown
    cleanup() {
        console.log('[WhatsApp] 🧹 Cleaning up service...');
        this.healthMonitor.stop();
        if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
            this.connectionTimer = null;
        }
        if (this.socket) {
            this.socket.end(new Error('Service shutdown'));
            this.socket = null;
        }
        this.saveSession();
    }
}
WhatsAppBaileysServiceSimplified.instance = null;
exports.default = WhatsAppBaileysServiceSimplified;
