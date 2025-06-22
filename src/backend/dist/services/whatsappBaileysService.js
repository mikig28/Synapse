"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const baileys_1 = require("@whiskeysockets/baileys");
const qrcode_1 = __importDefault(require("qrcode"));
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const events_1 = require("events");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const pino_1 = __importDefault(require("pino"));
class WhatsAppBaileysService extends events_1.EventEmitter {
    constructor() {
        super();
        this.socket = null;
        this.isReady = false;
        this.isClientReady = false;
        this.connectionStatus = 'disconnected';
        this.qrString = null;
        this.qrDataUrl = null;
        this.groups = [];
        this.privateChats = [];
        this.messages = [];
        this.monitoredKeywords = ['פתק 2', 'פתק2', 'petak 2', 'petak2', 'פתק'];
        this.reconnectAttempts = 0;
        this.MAX_RECONNECT_ATTEMPTS = 10;
        this.authDir = './baileys_auth_info';
        this.loadSession();
    }
    static getInstance() {
        if (!WhatsAppBaileysService.instance) {
            WhatsAppBaileysService.instance = new WhatsAppBaileysService();
        }
        return WhatsAppBaileysService.instance;
    }
    loadSession() {
        try {
            const sessionPath = path_1.default.join(process.cwd(), 'whatsapp_session_backup.json');
            if (fs_extra_1.default.existsSync(sessionPath)) {
                const sessionData = JSON.parse(fs_extra_1.default.readFileSync(sessionPath, 'utf8'));
                this.groups = sessionData.groups || [];
                this.privateChats = sessionData.privateChats || [];
                this.monitoredKeywords = sessionData.monitoredKeywords || this.monitoredKeywords;
                console.log(`📤 WhatsApp session loaded: ${this.groups.length} groups, ${this.privateChats.length} chats`);
            }
        }
        catch (error) {
            console.log('❌ Failed to load WhatsApp session:', error.message);
        }
    }
    saveSession() {
        try {
            const sessionData = {
                groups: this.groups,
                privateChats: this.privateChats,
                monitoredKeywords: this.monitoredKeywords,
                timestamp: new Date().toISOString()
            };
            const sessionPath = path_1.default.join(process.cwd(), 'whatsapp_session_backup.json');
            fs_extra_1.default.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));
            console.log('💾 WhatsApp session saved successfully');
        }
        catch (error) {
            console.log('❌ Failed to save WhatsApp session:', error.message);
        }
    }
    async initialize() {
        try {
            console.log('🔄 Initializing WhatsApp with Baileys...');
            console.log(`📊 Current state: attempts=${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);
            this.isClientReady = false;
            this.isReady = false;
            this.connectionStatus = 'initializing';
            this.qrString = null;
            this.emit('status', { ready: false, message: 'Initializing WhatsApp with Baileys...' });
            // Ensure auth directory exists
            await fs_extra_1.default.ensureDir(this.authDir);
            // Use multi-file auth state for persistent sessions
            const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(this.authDir);
            // Create WhatsApp socket
            this.socket = (0, baileys_1.makeWASocket)({
                auth: state,
                printQRInTerminal: false, // We'll handle QR code generation ourselves
                // Use pino logger with silent level to reduce noise
                logger: (0, pino_1.default)({ level: 'silent' }),
                browser: ['Synapse Bot', 'Chrome', '120.0.0'],
                generateHighQualityLinkPreview: false,
                syncFullHistory: false,
                markOnlineOnConnect: true,
                defaultQueryTimeoutMs: 60000
            });
            // Set up event handlers
            this.setupEventHandlers(saveCreds);
            console.log('✅ WhatsApp Baileys client initialized successfully');
        }
        catch (error) {
            console.error('❌ Failed to initialize WhatsApp Baileys client:', error.message);
            this.connectionStatus = 'error';
            this.emit('status', { ready: false, message: `Initialization failed: ${error.message}` });
            if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
                this.reconnectAttempts++;
                const delay = 10000 + (this.reconnectAttempts * 5000);
                console.log(`🔄 Retrying WhatsApp initialization in ${delay / 1000}s... Attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);
                setTimeout(() => this.initialize(), delay);
            }
        }
    }
    setupEventHandlers(saveCreds) {
        if (!this.socket)
            return;
        // Connection update handler
        this.socket.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                console.log('🔗 WhatsApp QR Code received');
                this.qrString = qr;
                this.connectionStatus = 'qr_ready';
                // Generate QR code data URL
                try {
                    const qrDataUrl = await qrcode_1.default.toDataURL(qr);
                    this.qrDataUrl = qrDataUrl;
                    console.log('📱 WhatsApp QR Code generated');
                    this.emit('qr', { qr: qrDataUrl, status: 'qr_ready' });
                    // Also display in terminal for debugging
                    qrcode_terminal_1.default.generate(qr, { small: true });
                }
                catch (err) {
                    console.error('❌ Error generating WhatsApp QR code:', err);
                    this.qrDataUrl = null;
                    this.emit('qr', { qr: qr, status: 'qr_ready' });
                }
            }
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== baileys_1.DisconnectReason.loggedOut;
                console.log('❌ WhatsApp connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
                this.isClientReady = false;
                this.isReady = false;
                this.connectionStatus = 'disconnected';
                this.emit('status', { ready: false, message: `WhatsApp disconnected: ${lastDisconnect?.error?.message || 'Unknown reason'}` });
                if (shouldReconnect && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
                    this.reconnectAttempts++;
                    const delay = 10000 + (this.reconnectAttempts * 5000);
                    console.log(`🔄 Attempting to reconnect WhatsApp... (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);
                    setTimeout(() => this.initialize(), delay);
                }
                else if (!shouldReconnect) {
                    console.log('🔐 WhatsApp logged out - need to scan QR code again');
                    this.clearAuth();
                }
                else {
                    console.error('❌ Max WhatsApp reconnection attempts reached');
                    this.connectionStatus = 'failed';
                    this.emit('status', { ready: false, message: 'WhatsApp connection failed after maximum retries.' });
                }
            }
            else if (connection === 'open') {
                console.log('✅ WhatsApp connected successfully!');
                this.isClientReady = true;
                this.isReady = true;
                this.connectionStatus = 'connected';
                this.qrString = null;
                this.qrDataUrl = null;
                this.reconnectAttempts = 0; // Reset on successful connection
                this.emit('status', { ready: true, message: 'WhatsApp connected successfully!' });
                this.emit('ready', { status: 'connected' });
                console.log('🎯 WhatsApp monitoring keywords:', this.monitoredKeywords.join(', '));
                // Automatically fetch chats and groups
                setTimeout(async () => {
                    try {
                        console.log('🔄 Auto-fetching WhatsApp chats and groups...');
                        await this.refreshChats();
                        console.log('✅ Successfully auto-fetched chats on ready');
                    }
                    catch (autoFetchError) {
                        console.log('⚠️ Auto-fetch failed, will rely on message discovery:', autoFetchError.message);
                    }
                    this.saveSession();
                }, 5000);
            }
        });
        // Credentials update handler
        this.socket.ev.on('creds.update', saveCreds);
        // Messages handler
        this.socket.ev.on('messages.upsert', async (m) => {
            try {
                await this.handleIncomingMessages(m);
            }
            catch (error) {
                console.error('❌ Error handling WhatsApp message:', error.message);
            }
        });
        // Chats handler
        this.socket.ev.on('chats.upsert', (chats) => {
            try {
                console.log(`📝 Received ${chats.length} chat updates`);
                this.processChatUpdates(chats);
            }
            catch (error) {
                console.error('❌ Error processing chat updates:', error.message);
            }
        });
    }
    async handleIncomingMessages(messageUpdate) {
        const { messages } = messageUpdate;
        for (const message of messages) {
            if (!message.message || message.key.fromMe)
                continue; // Skip our own messages
            try {
                const messageText = this.extractMessageText(message);
                if (!messageText)
                    continue;
                const chatId = message.key.remoteJid;
                const isGroup = chatId?.endsWith('@g.us') || false;
                // Create message object
                const whatsappMessage = {
                    id: message.key.id || '',
                    body: messageText,
                    from: message.key.participant || message.key.remoteJid || '',
                    fromMe: false,
                    timestamp: message.messageTimestamp || Date.now(),
                    type: Object.keys(message.message)[0] || 'text',
                    isGroup,
                    groupName: isGroup ? await this.getGroupName(chatId) : undefined,
                    contactName: await this.getContactName(message.key.participant || message.key.remoteJid),
                    chatId: chatId || '',
                    time: new Date().toLocaleTimeString(),
                    isMedia: this.isMediaMessage(message.message)
                };
                this.messages.unshift(whatsappMessage);
                if (this.messages.length > 1000) {
                    this.messages = this.messages.slice(0, 1000); // Keep last 1000 messages
                }
                // Check for monitored keywords
                const hasKeyword = this.monitoredKeywords.some(keyword => messageText.toLowerCase().includes(keyword.toLowerCase()));
                if (hasKeyword) {
                    console.log(`🎯 Monitored keyword found in message: ${messageText.substring(0, 50)}...`);
                }
                console.log(`📨 New WhatsApp message from ${whatsappMessage.contactName}: ${messageText.substring(0, 100)}...`);
                // Emit new message event
                this.emit('newMessage', whatsappMessage);
            }
            catch (error) {
                console.error('❌ Error processing WhatsApp message:', error.message);
            }
        }
    }
    extractMessageText(message) {
        const msgContent = message.message;
        if (msgContent.conversation) {
            return msgContent.conversation;
        }
        else if (msgContent.extendedTextMessage?.text) {
            return msgContent.extendedTextMessage.text;
        }
        else if (msgContent.imageMessage?.caption) {
            return msgContent.imageMessage.caption;
        }
        else if (msgContent.videoMessage?.caption) {
            return msgContent.videoMessage.caption;
        }
        return '';
    }
    isMediaMessage(message) {
        return !!(message.imageMessage || message.videoMessage || message.audioMessage || message.documentMessage);
    }
    async getContactName(jid) {
        if (!jid || !this.socket)
            return 'Unknown';
        try {
            // Try to get contact info from store or use jid
            // Baileys doesn't have notify field, just use the jid
            return jid.split('@')[0] || 'Unknown';
        }
        catch (error) {
            // Ignore errors, fallback to phone number
        }
        return jid.split('@')[0] || 'Unknown';
    }
    async getGroupName(jid) {
        if (!jid || !this.socket)
            return 'Unknown Group';
        try {
            const groupMetadata = await this.socket.groupMetadata(jid);
            return groupMetadata.subject || 'Unknown Group';
        }
        catch (error) {
            return 'Unknown Group';
        }
    }
    processChatUpdates(chats) {
        for (const chat of chats) {
            const isGroup = chat.id.endsWith('@g.us');
            const chatInfo = {
                id: chat.id,
                name: chat.name || (isGroup ? 'Unknown Group' : 'Unknown Contact'),
                lastMessage: chat.lastMessage?.message || '',
                timestamp: chat.lastMessage?.messageTimestamp || Date.now(),
                isGroup,
                participantCount: isGroup ? chat.participantCount : undefined,
                description: chat.description || undefined
            };
            if (isGroup) {
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
        // Emit chats updated event
        this.emit('chats_updated', {
            groups: this.groups,
            privateChats: this.privateChats,
            groupsCount: this.groups.length,
            privateChatsCount: this.privateChats.length,
            timestamp: new Date().toISOString()
        });
    }
    async refreshChats() {
        if (!this.socket || !this.isReady) {
            throw new Error('WhatsApp client is not ready. Please ensure connection is established.');
        }
        try {
            console.log('🔄 Refreshing WhatsApp chats...');
            // Get all chats from store - Baileys doesn't have getOrderedChats
            // We'll use the chats we've collected from events instead
            console.log('📝 Using chats from event updates...');
            // For baileys, we rely on chat events to populate chats
            // This method will mainly trigger the emission of current state
            console.log(`📊 Current chats: ${this.groups.length} groups, ${this.privateChats.length} private chats`);
            console.log(`✅ WhatsApp chats refreshed: ${this.groups.length} groups, ${this.privateChats.length} private chats`);
            this.emit('chats_updated', {
                groups: this.groups,
                privateChats: this.privateChats,
                groupsCount: this.groups.length,
                privateChatsCount: this.privateChats.length,
                timestamp: new Date().toISOString()
            });
            this.saveSession();
        }
        catch (error) {
            console.error('❌ Error refreshing WhatsApp chats:', error.message);
            throw error;
        }
    }
    async sendMessage(to, message) {
        if (!this.socket || !this.isReady) {
            return { success: false, error: 'WhatsApp client is not ready' };
        }
        try {
            // Ensure the 'to' parameter has the correct format
            const formattedTo = to.includes('@') ? to : `${to}@s.whatsapp.net`;
            const sentMessage = await this.socket.sendMessage(formattedTo, { text: message });
            console.log(`✅ Message sent to ${to}: ${message.substring(0, 50)}...`);
            return {
                success: true,
                messageId: sentMessage?.key?.id || undefined
            };
        }
        catch (error) {
            console.error('❌ Error sending WhatsApp message:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
    // Getter methods for compatibility with existing controller
    getStatus() {
        return {
            status: this.connectionStatus,
            isReady: this.isReady,
            isClientReady: this.isClientReady,
            groupsCount: this.groups.length,
            privateChatsCount: this.privateChats.length,
            messagesCount: this.messages.length,
            monitoredKeywords: this.monitoredKeywords,
            qrAvailable: !!this.qrString,
            timestamp: new Date().toISOString(),
            reconnectAttempts: this.reconnectAttempts
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
    getMessages(limit = 50, groupId) {
        let filteredMessages = this.messages;
        if (groupId) {
            filteredMessages = this.messages.filter(msg => msg.chatId === groupId);
        }
        return filteredMessages.slice(0, limit);
    }
    addMonitoredKeyword(keyword) {
        if (!this.monitoredKeywords.includes(keyword)) {
            this.monitoredKeywords.push(keyword);
            this.saveSession();
            console.log(`✅ Added monitored keyword: ${keyword}`);
        }
    }
    removeMonitoredKeyword(keyword) {
        const index = this.monitoredKeywords.indexOf(keyword);
        if (index > -1) {
            this.monitoredKeywords.splice(index, 1);
            this.saveSession();
            console.log(`✅ Removed monitored keyword: ${keyword}`);
            return true;
        }
        return false;
    }
    getMonitoredKeywords() {
        return [...this.monitoredKeywords];
    }
    async clearAuth() {
        try {
            console.log('🧹 Clearing WhatsApp authentication data...');
            if (this.socket) {
                this.socket.end(new Error('Service restart requested'));
                this.socket = null;
            }
            // Remove auth directory
            if (fs_extra_1.default.existsSync(this.authDir)) {
                await fs_extra_1.default.remove(this.authDir);
            }
            this.isReady = false;
            this.isClientReady = false;
            this.connectionStatus = 'disconnected';
            this.qrString = null;
            this.qrDataUrl = null;
            this.reconnectAttempts = 0;
            console.log('✅ WhatsApp authentication data cleared');
        }
        catch (error) {
            console.error('❌ Error clearing WhatsApp auth data:', error.message);
            throw error;
        }
    }
    async restart() {
        console.log('🔄 Restarting WhatsApp service...');
        try {
            if (this.socket) {
                this.socket.end(new Error('Service restart requested'));
                this.socket = null;
            }
            this.isReady = false;
            this.isClientReady = false;
            this.connectionStatus = 'disconnected';
            this.qrString = null;
            this.qrDataUrl = null;
            // Wait a moment before reinitializing
            await new Promise(resolve => setTimeout(resolve, 2000));
            await this.initialize();
        }
        catch (error) {
            console.error('❌ Error restarting WhatsApp service:', error.message);
            throw error;
        }
    }
    async forceQRGeneration() {
        try {
            console.log('🔧 Force generating new QR code...');
            // Clear auth and restart to force new QR generation
            await this.clearAuth();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.initialize();
            return {
                success: true,
                message: 'QR code generation initiated. Please wait for the QR code to appear.'
            };
        }
        catch (error) {
            console.error('❌ Error force generating QR code:', error.message);
            return {
                success: false,
                message: `Failed to generate QR code: ${error.message}`
            };
        }
    }
    async testBrowserEnvironment() {
        // Baileys doesn't use browser, so this always succeeds
        return {
            success: true,
            message: 'Baileys implementation does not require browser - no browser test needed',
            implementation: 'baileys',
            browserRequired: false
        };
    }
}
WhatsAppBaileysService.instance = null;
exports.default = WhatsAppBaileysService;
