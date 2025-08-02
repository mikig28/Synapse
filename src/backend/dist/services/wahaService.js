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
        this.wahaBaseUrl = process.env.WAHA_SERVICE_URL || 'https://synapse-waha.onrender.com';
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
        console.log('[WAHA Service] 🔍 Starting health check...');
        // Try multiple health check endpoints with longer timeouts for network stability
        const healthEndpoints = ['/api/version', '/api/sessions', '/ping'];
        for (const endpoint of healthEndpoints) {
            try {
                console.log(`[WAHA Service] Trying health check: ${endpoint}`);
                const response = await this.httpClient.get(endpoint, {
                    timeout: 15000, // 15 second timeout for Render.com network delays
                });
                if (response.status === 200) {
                    console.log(`[WAHA Service] ✅ Health check passed using ${endpoint}`);
                    return true;
                }
            }
            catch (error) {
                console.log(`[WAHA Service] Health check ${endpoint} failed:`, error?.response?.status || error.code);
                // Continue to next endpoint
            }
        }
        console.error('[WAHA Service] ❌ All health check endpoints failed');
        throw new Error('WAHA service is not responding to any health checks');
    }
    /**
     * Start a WhatsApp session
     */
    async startSession(sessionName = this.defaultSession) {
        try {
            console.log(`[WAHA Service] Starting session management for '${sessionName}'`);
            // First, try to get existing session and check its status
            let sessionExists = false;
            let sessionData = null;
            try {
                const existingSession = await this.httpClient.get(`/api/sessions/${sessionName}`);
                sessionExists = true;
                sessionData = existingSession.data;
                console.log(`[WAHA Service] Session '${sessionName}' exists with status: ${sessionData?.status || 'unknown'}`);
                // If session is stopped, we need to start it
                if (sessionData?.status === 'STOPPED') {
                    console.log(`[WAHA Service] Session '${sessionName}' is stopped, attempting to start...`);
                    await this.httpClient.post(`/api/sessions/${sessionName}/start`);
                    console.log(`[WAHA Service] ✅ Session '${sessionName}' started from stopped state`);
                    return sessionData;
                }
                else if (sessionData?.status === 'WORKING' || sessionData?.status === 'SCAN_QR_CODE') {
                    console.log(`[WAHA Service] ✅ Session '${sessionName}' is already active`);
                    return sessionData;
                }
            }
            catch (getError) {
                console.log(`[WAHA Service] Session '${sessionName}' doesn't exist, will create new one`);
                sessionExists = false;
            }
            // If session doesn't exist, create it
            if (!sessionExists) {
                console.log(`[WAHA Service] Creating new session '${sessionName}'...`);
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
                sessionData = response.data;
            }
            // Always try to start the session after creation
            try {
                await this.httpClient.post(`/api/sessions/${sessionName}/start`);
                console.log(`[WAHA Service] ✅ Session '${sessionName}' started successfully`);
            }
            catch (startError) {
                console.error(`[WAHA Service] ⚠️ Failed to start session '${sessionName}':`, startError);
                // Don't throw here, session might already be starting
            }
            return sessionData;
        }
        catch (error) {
            // Handle "already exists" error gracefully
            if (error.response?.status === 422 && error.response?.data?.message?.includes('already exists')) {
                console.log(`[WAHA Service] ✅ Session '${sessionName}' already exists (422 handled)`);
                // Try to get the existing session and start it if needed
                try {
                    const existingSession = await this.httpClient.get(`/api/sessions/${sessionName}`);
                    const sessionData = existingSession.data;
                    // If it's stopped, start it
                    if (sessionData?.status === 'STOPPED') {
                        await this.httpClient.post(`/api/sessions/${sessionName}/start`);
                        console.log(`[WAHA Service] ✅ Restarted stopped session '${sessionName}'`);
                    }
                    return sessionData;
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
            // Wait for session to be in SCAN_QR_CODE state
            console.log(`[WAHA Service] Waiting for session '${sessionName}' to be ready for QR...`);
            await this.waitForSessionState(sessionName, ['SCAN_QR_CODE'], 30000); // 30 second timeout
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
    /**
     * Request phone authentication code (using WAHA API)
     */
    async requestPhoneCode(phoneNumber, sessionName = this.defaultSession) {
        try {
            console.log(`[WAHA Service] Requesting phone verification code for: ${phoneNumber}`);
            // Ensure session is created first
            await this.startSession(sessionName);
            // Use WAHA's phone authentication endpoint
            const response = await this.httpClient.post(`/api/${sessionName}/auth/phone/request`, {
                phoneNumber: phoneNumber.replace(/\D/g, '') // Remove non-digits
            });
            if (response.data.success) {
                console.log(`[WAHA Service] ✅ Phone verification code requested successfully`);
                return { success: true };
            }
            else {
                console.error(`[WAHA Service] ❌ Phone code request failed:`, response.data.message);
                return { success: false, error: response.data.message || 'Failed to request phone code' };
            }
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Error requesting phone code:`, error);
            // Check if it's a known error that means phone auth is not supported
            if (error.response?.status === 404 || error.response?.status === 501) {
                return {
                    success: false,
                    error: 'Phone number authentication is not available with the current WAHA configuration. Please use QR code authentication instead.'
                };
            }
            return { success: false, error: error.message || 'Failed to request phone code' };
        }
    }
    /**
     * Verify phone authentication code (using WAHA API)
     */
    async verifyPhoneCode(phoneNumber, code, sessionName = this.defaultSession) {
        try {
            console.log(`[WAHA Service] Verifying phone code for: ${phoneNumber}`);
            // Use WAHA's phone verification endpoint
            const response = await this.httpClient.post(`/api/${sessionName}/auth/phone/verify`, {
                phoneNumber: phoneNumber.replace(/\D/g, ''),
                code: code
            });
            if (response.data.success) {
                console.log(`[WAHA Service] ✅ Phone verification successful`);
                this.connectionStatus = 'WORKING';
                this.isReady = true;
                this.emit('authenticated', { method: 'phone', phoneNumber });
                return { success: true };
            }
            else {
                console.error(`[WAHA Service] ❌ Phone verification failed:`, response.data.message);
                return { success: false, error: response.data.message || 'Invalid verification code' };
            }
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Error verifying phone code:`, error);
            // Check if it's a known error that means phone auth is not supported
            if (error.response?.status === 404 || error.response?.status === 501) {
                return {
                    success: false,
                    error: 'Phone number authentication is not available with the current WAHA configuration. Please use QR code authentication instead.'
                };
            }
            return { success: false, error: error.message || 'Failed to verify phone code' };
        }
    }
    /**
     * Wait for session to reach expected state
     */
    async waitForSessionState(sessionName, expectedStates, timeoutMs = 30000) {
        const startTime = Date.now();
        const pollInterval = 2000; // Check every 2 seconds
        while (Date.now() - startTime < timeoutMs) {
            try {
                const sessionStatus = await this.getSessionStatus(sessionName);
                console.log(`[WAHA Service] Session '${sessionName}' current state: ${sessionStatus.status}`);
                if (expectedStates.includes(sessionStatus.status)) {
                    console.log(`[WAHA Service] ✅ Session '${sessionName}' reached expected state: ${sessionStatus.status}`);
                    return;
                }
                if (sessionStatus.status === 'FAILED' || sessionStatus.status === 'STOPPED') {
                    throw new Error(`Session failed or stopped: ${sessionStatus.status}`);
                }
                console.log(`[WAHA Service] Waiting for session '${sessionName}' to transition from ${sessionStatus.status} to one of [${expectedStates.join(', ')}]...`);
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
            catch (error) {
                console.error(`[WAHA Service] Error checking session state:`, error);
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
        }
        throw new Error(`Timeout waiting for session '${sessionName}' to reach state [${expectedStates.join(', ')}]`);
    }
}
WAHAService.instance = null;
exports.default = WAHAService;
