"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const whatsapp_web_js_1 = require("whatsapp-web.js");
const qrcode_1 = __importDefault(require("qrcode"));
const events_1 = require("events");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
class WhatsAppService extends events_1.EventEmitter {
    constructor() {
        super();
        this.client = null;
        this.isReady = false;
        this.isClientReady = false;
        this.connectionStatus = 'disconnected';
        this.qrString = null;
        this.groups = [];
        this.privateChats = [];
        this.messages = [];
        this.monitoredKeywords = ['פתק 2', 'פתק2', 'petak 2', 'petak2', 'פתק'];
        this.reconnectAttempts = 0;
        this.MAX_RECONNECT_ATTEMPTS = 5;
        this.loadSession();
    }
    static getInstance() {
        if (!WhatsAppService.instance) {
            WhatsAppService.instance = new WhatsAppService();
        }
        return WhatsAppService.instance;
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
                lastUpdate: Date.now()
            };
            const sessionPath = path_1.default.join(process.cwd(), 'whatsapp_session_backup.json');
            fs_extra_1.default.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));
            console.log('📥 WhatsApp session data saved');
        }
        catch (error) {
            console.log('❌ Failed to save WhatsApp session:', error.message);
        }
    }
    async initialize() {
        try {
            console.log('🔄 Initializing WhatsApp client...');
            this.isClientReady = false;
            this.isReady = false;
            this.connectionStatus = 'initializing';
            this.qrString = null;
            this.emit('status', { ready: false, message: 'Initializing WhatsApp...' });
            if (this.client) {
                try {
                    await this.client.destroy();
                    console.log('🗑️ Previous WhatsApp client destroyed');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
                catch (destroyError) {
                    console.log('⚠️ Warning during WhatsApp client cleanup:', destroyError.message);
                }
            }
            const puppeteerConfig = {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--disable-default-apps',
                    '--disable-sync',
                    '--disable-translate',
                    '--hide-scrollbars',
                    '--mute-audio'
                ],
                timeout: 120000,
                defaultViewport: null,
                ignoreDefaultArgs: ['--disable-extensions', '--enable-automation'],
                handleSIGINT: false,
                handleSIGTERM: false,
                handleSIGHUP: false,
                protocolTimeout: 180000
            };
            this.client = new whatsapp_web_js_1.Client({
                authStrategy: new whatsapp_web_js_1.LocalAuth({
                    dataPath: './whatsapp_auth_data',
                    clientId: 'synapse-whatsapp'
                }),
                puppeteer: puppeteerConfig,
                webVersionCache: {
                    type: 'remote',
                    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
                },
                qrMaxRetries: 5,
                authTimeoutMs: 0,
                takeoverOnConflict: false
            });
            this.setupClientHandlers();
            await this.client.initialize();
            this.reconnectAttempts = 0;
            console.log('✅ WhatsApp Client initialized successfully');
        }
        catch (error) {
            console.error('❌ Failed to initialize WhatsApp client:', error.message);
            this.connectionStatus = 'error';
            this.emit('status', { ready: false, message: `Initialization failed: ${error.message}` });
            if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
                this.reconnectAttempts++;
                const delay = 10000 + (this.reconnectAttempts * 5000);
                console.log(`🔄 Retrying WhatsApp initialization in ${delay / 1000}s... Attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);
                setTimeout(() => this.initialize(), delay);
            }
            else {
                console.error('❌ Max WhatsApp reconnection attempts reached');
                this.connectionStatus = 'failed';
                this.emit('status', { ready: false, message: 'WhatsApp connection failed. Please restart the service.' });
            }
        }
    }
    setupClientHandlers() {
        if (!this.client)
            return;
        this.client.on('qr', (qr) => {
            console.log('🔗 WhatsApp QR Code received');
            this.qrString = qr;
            this.connectionStatus = 'qr_ready';
            qrcode_1.default.toDataURL(qr, (err, url) => {
                if (!err) {
                    console.log('📱 WhatsApp QR Code generated');
                    this.emit('qr', { qr: url, status: 'qr_ready' });
                }
                else {
                    console.error('❌ Error generating WhatsApp QR code:', err);
                    this.emit('qr', { qr: qr, status: 'qr_ready' });
                }
            });
        });
        this.client.on('authenticated', () => {
            console.log('🔐 WhatsApp authenticated successfully!');
            this.connectionStatus = 'authenticated';
            this.emit('status', { ready: false, message: 'WhatsApp authenticating...' });
        });
        this.client.on('auth_failure', (message) => {
            console.log('❌ WhatsApp authentication failed:', message);
            this.isClientReady = false;
            this.isReady = false;
            this.connectionStatus = 'auth_failed';
            this.qrString = null;
            this.emit('status', { ready: false, message: 'WhatsApp authentication failed. Please scan QR code again.' });
            this.emit('auth_failure', { status: 'auth_failed' });
            setTimeout(() => {
                console.log('🔄 Re-initializing WhatsApp after auth failure...');
                this.initialize();
            }, 5000);
        });
        this.client.on('ready', async () => {
            console.log('✅ WhatsApp Client is ready!');
            this.isClientReady = true;
            this.isReady = true;
            this.connectionStatus = 'connected';
            this.qrString = null;
            this.emit('status', { ready: true, message: 'WhatsApp connected successfully!' });
            this.emit('ready', { status: 'connected' });
            console.log('🎯 WhatsApp monitoring keywords:', this.monitoredKeywords.join(', '));
            console.log('⏳ Waiting for WhatsApp to stabilize...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            this.emit('chats_updated', {
                groups: this.groups,
                privateChats: this.privateChats,
                groupsCount: this.groups.length,
                privateChatsCount: this.privateChats.length,
                timestamp: new Date().toISOString(),
                discoveryMode: true,
                message: 'Ready - discovering chats from incoming messages'
            });
            this.saveSession();
        });
        this.client.on('message', async (message) => {
            try {
                await this.handleIncomingMessage(message);
            }
            catch (error) {
                console.error('❌ Error handling WhatsApp message:', error.message);
            }
        });
        this.client.on('disconnected', (reason) => {
            console.log('❌ WhatsApp Client disconnected:', reason);
            this.isClientReady = false;
            this.isReady = false;
            this.connectionStatus = 'disconnected';
            this.emit('status', { ready: false, message: `WhatsApp disconnected: ${reason}` });
            if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
                this.reconnectAttempts++;
                console.log(`🔄 Attempting to reconnect WhatsApp... (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);
                setTimeout(() => {
                    this.initialize();
                }, 10000);
            }
        });
    }
    async handleIncomingMessage(message) {
        try {
            if (message.from === 'status@broadcast' || message.id.remote === 'status@broadcast') {
                return;
            }
            const chat = await message.getChat();
            const contact = await message.getContact();
            if (chat.id._serialized === 'status@broadcast') {
                return;
            }
            await this.updateChatFromMessage(chat);
            const messageData = {
                id: message.id._serialized,
                body: message.body,
                from: message.from,
                fromMe: message.fromMe,
                timestamp: message.timestamp,
                type: message.type,
                isGroup: chat.isGroup,
                groupName: chat.isGroup ? chat.name : undefined,
                contactName: contact.pushname || contact.name || 'Unknown',
                chatId: chat.id._serialized,
                time: new Date().toLocaleString('he-IL'),
                isMedia: message.hasMedia || message.type !== 'chat'
            };
            this.messages.unshift(messageData);
            if (this.messages.length > 100) {
                this.messages = this.messages.slice(0, 100);
            }
            if (chat.isGroup) {
                const isMonitored = this.checkGroupAgainstKeywords(chat.name);
                if (isMonitored) {
                    console.log('🎯 MONITORED WhatsApp GROUP MESSAGE DETECTED!');
                    this.emit('monitoredMessage', {
                        ...messageData,
                        isMonitored: true,
                        alert: true
                    });
                }
            }
            this.emit('newMessage', messageData);
        }
        catch (error) {
            console.error('❌ Error processing WhatsApp message:', error.message);
        }
    }
    async updateChatFromMessage(chat) {
        try {
            if (!chat || !chat.id || !chat.id._serialized) {
                return;
            }
            let participantCount = 0;
            let description = '';
            if (chat.isGroup) {
                try {
                    // Use type assertion to handle TypeScript limitations with whatsapp-web.js types
                    const participants = chat.participants;
                    participantCount = participants ? participants.length : 0;
                    description = chat.description || '';
                }
                catch (participantError) {
                    console.log(`⚠️ Could not get participant count for WhatsApp group ${chat.name}`);
                }
            }
            const chatData = {
                id: chat.id._serialized,
                name: chat.name || 'Unknown',
                lastMessage: new Date().toISOString(),
                timestamp: Date.now(),
                isGroup: chat.isGroup,
                participantCount: participantCount,
                description: description
            };
            if (chat.isGroup) {
                const existingGroupIndex = this.groups.findIndex(g => g.id === chat.id._serialized);
                if (existingGroupIndex === -1) {
                    this.groups.push(chatData);
                    console.log(`📁 New WhatsApp group discovered: "${chat.name}"`);
                    if (this.checkGroupAgainstKeywords(chat.name)) {
                        console.log('🎯 DISCOVERED MONITORED WhatsApp GROUP VIA MESSAGE!');
                    }
                    this.emit('chats_updated', {
                        groups: this.groups,
                        privateChats: this.privateChats,
                        groupsCount: this.groups.length,
                        privateChatsCount: this.privateChats.length,
                        timestamp: new Date().toISOString(),
                        newGroup: chatData
                    });
                }
            }
            else {
                const existingChatIndex = this.privateChats.findIndex(c => c.id === chat.id._serialized);
                if (existingChatIndex === -1) {
                    this.privateChats.push(chatData);
                    console.log(`👤 New WhatsApp private chat discovered: "${chat.name}"`);
                    if (this.privateChats.length > 100) {
                        this.privateChats = this.privateChats.slice(-100);
                    }
                    this.emit('chats_updated', {
                        groups: this.groups,
                        privateChats: this.privateChats,
                        groupsCount: this.groups.length,
                        privateChatsCount: this.privateChats.length,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }
        catch (error) {
            console.log('⚠️ Error updating WhatsApp chat from message:', error.message);
        }
    }
    checkGroupAgainstKeywords(groupName) {
        if (!groupName)
            return false;
        const lowerGroupName = groupName.toLowerCase();
        return this.monitoredKeywords.some(keyword => lowerGroupName.includes(keyword.toLowerCase()));
    }
    async sendMessage(to, message) {
        if (!this.isReady || !this.client) {
            throw new Error('WhatsApp not connected');
        }
        const messageText = Buffer.from(message, 'utf8').toString('utf8');
        console.log(`📤 Sending WhatsApp message to ${to}: "${messageText}"`);
        await this.client.sendMessage(to, messageText);
    }
    async refreshChats() {
        if (!this.isClientReady || !this.client) {
            throw new Error('WhatsApp client not ready');
        }
        try {
            console.log('🔄 Refreshing WhatsApp chats...');
            const chats = await this.client.getChats();
            const groupChats = chats.filter(chat => chat.isGroup);
            const privateChatsData = chats.filter(chat => !chat.isGroup && chat.id._serialized !== 'status@broadcast').slice(0, 100);
            this.groups = [];
            this.privateChats = [];
            for (const chat of groupChats) {
                try {
                    if (!chat || !chat.id || !chat.id._serialized || !chat.name) {
                        continue;
                    }
                    const groupData = {
                        id: chat.id._serialized,
                        name: chat.name,
                        lastMessage: new Date().toISOString(),
                        timestamp: Date.now(),
                        isGroup: true,
                        participantCount: 0,
                        description: ''
                    };
                    try {
                        // Use type assertion to handle TypeScript limitations
                        const participants = chat.participants;
                        groupData.participantCount = participants ? participants.length : 0;
                        groupData.description = chat.description || '';
                    }
                    catch (participantError) {
                        console.log(`⚠️ Could not get participant count for ${chat.name}`);
                    }
                    this.groups.push(groupData);
                    if (this.checkGroupAgainstKeywords(chat.name)) {
                        console.log(`🎯 Found monitored WhatsApp group: "${chat.name}"`);
                    }
                }
                catch (chatError) {
                    console.log(`⚠️ Error processing WhatsApp group:`, chatError.message);
                    continue;
                }
            }
            for (const chat of privateChatsData) {
                try {
                    if (!chat || !chat.id || !chat.id._serialized) {
                        continue;
                    }
                    const contact = await chat.getContact();
                    const name = contact.pushname || contact.name || chat.name || chat.id.user;
                    this.privateChats.push({
                        id: chat.id._serialized,
                        name: name,
                        lastMessage: new Date().toISOString(),
                        timestamp: Date.now(),
                        isGroup: false
                    });
                }
                catch (chatError) {
                    console.log(`⚠️ Error processing WhatsApp private chat:`, chatError.message);
                    continue;
                }
            }
            this.saveSession();
            console.log(`✅ WhatsApp chats refreshed - ${this.groups.length} groups, ${this.privateChats.length} private chats`);
            this.emit('chats_updated', {
                groups: this.groups,
                privateChats: this.privateChats,
                groupsCount: this.groups.length,
                privateChatsCount: this.privateChats.length,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('❌ Error refreshing WhatsApp chats:', error.message);
            throw error;
        }
    }
    addMonitoredKeyword(keyword) {
        const trimmedKeyword = keyword.trim();
        if (!this.monitoredKeywords.some(k => k.toLowerCase() === trimmedKeyword.toLowerCase())) {
            this.monitoredKeywords.push(trimmedKeyword);
            this.saveSession();
            console.log(`🔍 Now monitoring WhatsApp keyword: "${trimmedKeyword}"`);
        }
    }
    removeMonitoredKeyword(keyword) {
        const index = this.monitoredKeywords.findIndex(k => k.toLowerCase() === keyword.toLowerCase());
        if (index > -1) {
            this.monitoredKeywords.splice(index, 1);
            this.saveSession();
            console.log(`🗑️ Stopped monitoring WhatsApp keyword: "${keyword}"`);
            return true;
        }
        return false;
    }
    getStatus() {
        const monitoredGroupsFound = this.groups.filter(group => this.checkGroupAgainstKeywords(group.name));
        return {
            status: this.connectionStatus,
            isReady: this.isReady,
            isClientReady: this.isClientReady,
            groupsCount: this.groups.length,
            privateChatsCount: this.privateChats.length,
            messagesCount: this.messages.length,
            monitoredKeywords: this.monitoredKeywords,
            qrAvailable: !!this.qrString,
            timestamp: new Date().toISOString()
        };
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
    getMonitoredKeywords() {
        return this.monitoredKeywords;
    }
    getQRCode() {
        return this.qrString;
    }
    async restart() {
        console.log('🔄 Restarting WhatsApp client...');
        if (this.client) {
            try {
                await this.client.destroy();
                console.log('🗑️ WhatsApp client destroyed successfully');
            }
            catch (destroyError) {
                console.log('⚠️ Warning during WhatsApp client destruction:', destroyError.message);
            }
        }
        this.qrString = null;
        this.isReady = false;
        this.isClientReady = false;
        this.connectionStatus = 'disconnected';
        this.reconnectAttempts = 0;
        this.groups = [];
        this.privateChats = [];
        this.messages = [];
        this.emit('status', { ready: false, message: 'Restarting WhatsApp client...' });
        setTimeout(() => {
            this.initialize();
        }, 3000);
    }
    async clearAuth() {
        console.log('🗑️ Clearing WhatsApp authentication data...');
        if (this.client) {
            try {
                await this.client.destroy();
                console.log('🛑 WhatsApp client stopped');
            }
            catch (error) {
                console.log('⚠️ Warning during WhatsApp client stop:', error.message);
            }
        }
        try {
            await fs_extra_1.default.remove('./whatsapp_auth_data');
            console.log('🗂️ WhatsApp auth data directory cleared');
        }
        catch (error) {
            console.log('⚠️ Warning clearing WhatsApp auth data:', error.message);
        }
        try {
            const sessionPath = path_1.default.join(process.cwd(), 'whatsapp_session_backup.json');
            if (fs_extra_1.default.existsSync(sessionPath)) {
                await fs_extra_1.default.remove(sessionPath);
                console.log('📄 WhatsApp session backup cleared');
            }
        }
        catch (error) {
            console.log('⚠️ Warning clearing WhatsApp session backup:', error.message);
        }
        this.qrString = null;
        this.isReady = false;
        this.isClientReady = false;
        this.connectionStatus = 'disconnected';
        this.reconnectAttempts = 0;
        this.groups = [];
        this.privateChats = [];
        this.messages = [];
        this.emit('status', { ready: false, message: 'WhatsApp authentication data cleared. Restarting...' });
        setTimeout(() => {
            console.log('🔄 Restarting WhatsApp with clean state...');
            this.initialize();
        }, 2000);
    }
}
WhatsAppService.instance = null;
exports.default = WhatsAppService;
