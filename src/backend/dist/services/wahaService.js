"use strict";
/**
 * WAHA WhatsApp Service - HTTP API Wrapper
 * Replaces the complex WhatsAppBaileysService with simple HTTP calls to WAHA microservice
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const events_1 = require("events");
class WAHAService extends events_1.EventEmitter {
    constructor() {
        super();
        this.defaultSession = 'default';
        this.isReady = false;
        this.connectionStatus = 'disconnected';
        this.wahaBaseUrl = process.env.WAHA_SERVICE_URL || 'http://localhost:3000';
        this.httpClient = axios_1.default.create({
            baseURL: this.wahaBaseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        // Setup request interceptors for logging
        this.httpClient.interceptors.request.use((config) => {
            console.log(`[WAHA API] ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        });
        this.httpClient.interceptors.response.use((response) => {
            console.log(`[WAHA API] ✅ ${response.status} ${response.config.url}`);
            return response;
        }, (error) => {
            console.error(`[WAHA API] ❌ ${error.response?.status || 'NETWORK_ERROR'} ${error.config?.url}:`, error.message);
            return Promise.reject(error);
        });
        console.log(`[WAHA Service] Initialized with base URL: ${this.wahaBaseUrl}`);
    }
    static getInstance() {
        if (!WAHAService.instance) {
            WAHAService.instance = new WAHAService();
        }
        return WAHAService.instance;
    }
    /**
     * Initialize WAHA service - starts the default session
     */
    async initialize() {
        try {
            console.log('[WAHA Service] Initializing...');
            // Check if WAHA service is running
            await this.healthCheck();
            // Start default session
            await this.startSession();
            // Check session status
            const status = await this.getSessionStatus();
            this.connectionStatus = status.status;
            this.isReady = status.status === 'WORKING';
            console.log(`[WAHA Service] ✅ Initialized. Status: ${status.status}`);
            this.emit('ready');
        }
        catch (error) {
            console.error('[WAHA Service] ❌ Initialization failed:', error);
            this.connectionStatus = 'failed';
            this.emit('error', error);
            throw error;
        }
    }
    /**
     * Health check - verify WAHA service is running
     */
    async healthCheck() {
        try {
            // Use /api/version instead of /health (which requires Plus license)
            const response = await this.httpClient.get('/api/version');
            if (response.data && response.status === 200) {
                console.log('[WAHA Service] ✅ Health check passed (using /api/version)');
                return true;
            }
            else {
                throw new Error('Invalid version response');
            }
        }
        catch (error) {
            console.error('[WAHA Service] ❌ Health check failed:', error);
            // Try fallback to sessions endpoint
            try {
                await this.httpClient.get('/api/sessions');
                console.log('[WAHA Service] ✅ Health check passed (using /api/sessions fallback)');
                return true;
            }
            catch (fallbackError) {
                console.error('[WAHA Service] ❌ All health checks failed');
                throw new Error('WAHA service is not available');
            }
        }
    }
    /**
     * Start a WhatsApp session
     */
    async startSession(sessionName = this.defaultSession) {
        try {
            // First, try to get existing session
            try {
                const existingSession = await this.httpClient.get(`/api/sessions/${sessionName}`);
                console.log(`[WAHA Service] ✅ Session '${sessionName}' already exists`);
                return existingSession.data;
            }
            catch (getError) {
                // Session doesn't exist, create it
                console.log(`[WAHA Service] Creating new session '${sessionName}'...`);
            }
            // Create new session
            const response = await this.httpClient.post('/api/sessions', {
                name: sessionName,
                config: {
                    webhook: {
                        url: `${process.env.FRONTEND_URL || 'https://synapse-backend-7lq6.onrender.com'}/api/v1/whatsapp/webhook`,
                        events: ['message', 'session.status'],
                        retries: 3,
                    }
                }
            });
            console.log(`[WAHA Service] ✅ Session '${sessionName}' created successfully`);
            // Start the session
            try {
                await this.httpClient.post(`/api/sessions/${sessionName}/start`);
                console.log(`[WAHA Service] ✅ Session '${sessionName}' started successfully`);
            }
            catch (startError) {
                console.error(`[WAHA Service] ⚠️ Failed to start session '${sessionName}':`, startError);
                // Continue anyway, session might already be started
            }
            return response.data;
        }
        catch (error) {
            // Handle "already exists" error gracefully
            if (error.response?.status === 422 && error.response?.data?.message?.includes('already exists')) {
                console.log(`[WAHA Service] ✅ Session '${sessionName}' already exists (422 handled)`);
                // Try to get the existing session
                try {
                    const existingSession = await this.httpClient.get(`/api/sessions/${sessionName}`);
                    return existingSession.data;
                }
                catch (getError) {
                    console.error(`[WAHA Service] ❌ Could not retrieve existing session:`, getError);
                }
            }
            console.error(`[WAHA Service] ❌ Failed to start session '${sessionName}':`, error);
            throw error;
        }
    }
    /**
     * Get session status
     */
    async getSessionStatus(sessionName = this.defaultSession) {
        try {
            const response = await this.httpClient.get(`/api/sessions/${sessionName}`);
            return response.data;
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Failed to get session status for '${sessionName}':`, error);
            throw error;
        }
    }
    /**
     * Get QR code for session
     */
    async getQRCode(sessionName = this.defaultSession) {
        console.log(`[WAHA Service] Starting QR code generation for session '${sessionName}'`);
        try {
            // First ensure session is started
            console.log(`[WAHA Service] Ensuring session '${sessionName}' is started...`);
            await this.startSession(sessionName);
            console.log(`[WAHA Service] Session '${sessionName}' is ready`);
            // Get QR code using WAHA's auth endpoint
            console.log(`[WAHA Service] Requesting QR code from /api/${sessionName}/auth/qr`);
            const response = await this.httpClient.get(`/api/${sessionName}/auth/qr`, {
                responseType: 'arraybuffer'
            });
            console.log(`[WAHA Service] QR code response received, status: ${response.status}`);
            const base64 = Buffer.from(response.data).toString('base64');
            console.log(`[WAHA Service] QR code converted to base64, length: ${base64.length}`);
            return `data:image/png;base64,${base64}`;
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Failed to get QR code for '${sessionName}':`, error);
            console.error(`[WAHA Service] Error details:`, {
                status: error?.response?.status,
                statusText: error?.response?.statusText,
                data: error?.response?.data
            });
            // Try alternative screenshot endpoint as fallback
            try {
                console.log('[WAHA Service] Trying screenshot endpoint as fallback...');
                const response = await this.httpClient.get(`/api/screenshot`, {
                    params: { session: sessionName },
                    responseType: 'arraybuffer'
                });
                console.log(`[WAHA Service] Screenshot response received, status: ${response.status}`);
                const base64 = Buffer.from(response.data).toString('base64');
                return `data:image/png;base64,${base64}`;
            }
            catch (fallbackError) {
                console.error(`[WAHA Service] ❌ Both QR endpoints failed:`, fallbackError);
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to get QR code: ${errorMessage}`);
            }
        }
    }
    /**
     * Send text message
     */
    async sendMessage(chatId, text, sessionName = this.defaultSession) {
        try {
            const response = await this.httpClient.post('/api/sendText', {
                chatId,
                text,
                session: sessionName
            });
            console.log(`[WAHA Service] ✅ Message sent to ${chatId}`);
            return response.data;
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Failed to send message to ${chatId}:`, error);
            throw error;
        }
    }
    /**
     * Send media message
     */
    async sendMedia(chatId, mediaUrl, caption, sessionName = this.defaultSession) {
        try {
            const response = await this.httpClient.post('/api/sendFile', {
                chatId,
                file: {
                    url: mediaUrl
                },
                caption,
                session: sessionName
            });
            console.log(`[WAHA Service] ✅ Media sent to ${chatId}`);
            return response.data;
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Failed to send media to ${chatId}:`, error);
            throw error;
        }
    }
    /**
     * Get chats
     */
    async getChats(sessionName = this.defaultSession) {
        try {
            const response = await this.httpClient.get('/api/chats', {
                params: { session: sessionName }
            });
            return response.data.map((chat) => ({
                id: chat.id,
                name: chat.name || chat.id,
                isGroup: chat.isGroup || false,
                lastMessage: chat.lastMessage?.body,
                timestamp: chat.lastMessage?.timestamp,
                participantCount: chat.participantCount
            }));
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Failed to get chats for '${sessionName}':`, error);
            throw error;
        }
    }
    /**
     * Get messages from chat
     */
    async getMessages(chatId, limit = 50, sessionName = this.defaultSession) {
        try {
            const response = await this.httpClient.get('/api/messages', {
                params: {
                    chatId,
                    limit,
                    session: sessionName
                }
            });
            return response.data.map((msg) => ({
                id: msg.id,
                body: msg.body || '',
                from: msg.from,
                fromMe: msg.fromMe || false,
                timestamp: msg.timestamp,
                type: msg.type || 'text',
                isGroup: msg.chatId?.includes('@g.us') || false,
                contactName: msg.notifyName || msg.from,
                chatId: msg.chatId,
                time: new Date(msg.timestamp * 1000).toLocaleTimeString(),
                isMedia: msg.type !== 'text'
            }));
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Failed to get messages for ${chatId}:`, error);
            throw error;
        }
    }
    /**
     * Stop session
     */
    async stopSession(sessionName = this.defaultSession) {
        try {
            await this.httpClient.delete(`/api/sessions/${sessionName}`);
            console.log(`[WAHA Service] ✅ Session '${sessionName}' stopped`);
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Failed to stop session '${sessionName}':`, error);
            throw error;
        }
    }
    /**
     * Get service status (compatible with old interface)
     */
    getStatus() {
        return {
            status: this.connectionStatus,
            isReady: this.isReady,
            qrAvailable: this.connectionStatus === 'SCAN_QR_CODE',
            timestamp: new Date().toISOString()
        };
    }
    /**
     * Webhook handler for WAHA events
     */
    handleWebhook(payload) {
        try {
            console.log('[WAHA Service] Webhook received:', payload.event);
            switch (payload.event) {
                case 'message':
                    this.emit('message', payload.data);
                    // Process image messages for group monitoring
                    this.processImageForGroupMonitoring(payload.data);
                    break;
                case 'session.status':
                    this.connectionStatus = payload.data.status;
                    this.isReady = payload.data.status === 'WORKING';
                    this.emit('status_change', payload.data);
                    break;
                default:
                    console.log(`[WAHA Service] Unknown webhook event: ${payload.event}`);
            }
        }
        catch (error) {
            console.error('[WAHA Service] ❌ Webhook handling error:', error);
        }
    }
    /**
     * Process image messages for group monitoring
     */
    async processImageForGroupMonitoring(messageData) {
        try {
            // Check if message is an image and from a group
            if (!messageData.isMedia ||
                messageData.type !== 'image' ||
                !messageData.isGroup ||
                !messageData.mediaUrl) {
                return;
            }
            console.log('[WAHA Service] Processing image for group monitoring:', {
                messageId: messageData.id,
                groupId: messageData.chatId,
                groupName: messageData.groupName,
                from: messageData.from,
                mediaUrl: messageData.mediaUrl
            });
            // Send to group monitor webhook (fire and forget)
            const axios = require('axios');
            const baseUrl = process.env.FRONTEND_URL || 'https://synapse-backend-7lq6.onrender.com';
            axios.post(`${baseUrl}/api/v1/group-monitor/webhook/whatsapp-message`, {
                messageId: messageData.id,
                groupId: messageData.chatId,
                senderId: messageData.from,
                senderName: messageData.contactName || messageData.from,
                imageUrl: messageData.mediaUrl,
                caption: messageData.body
            }, {
                timeout: 5000
            }).catch((error) => {
                console.error('[WAHA Service] ❌ Failed to send image to group monitor:', error.message);
            });
        }
        catch (error) {
            console.error('[WAHA Service] ❌ Error processing image for group monitoring:', error);
        }
    }
}
WAHAService.instance = null;
exports.default = WAHAService;
