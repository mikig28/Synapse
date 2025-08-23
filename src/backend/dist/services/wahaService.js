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
        this.statusMonitorInterval = null;
        this.lastQrDataUrl = null;
        this.lastQrGeneratedAt = null;
        this.qrReuseWindowMs = 25000; // reuse same QR for up to ~25s
        this.qrRequestCooldownMs = 5000; // avoid hammering WAHA
        // Session status cache
        this.sessionStatusCache = {
            data: null,
            timestamp: 0
        };
        this.SESSION_CACHE_DURATION = 10000; // 10 seconds
        // Health check cache
        this.lastHealthCheckResult = null;
        this.lastHealthCheckTimestamp = 0;
        this.wahaBaseUrl = process.env.WAHA_SERVICE_URL || 'https://synapse-waha.onrender.com';
        // Get WAHA API key from environment variables
        const wahaApiKey = process.env.WAHA_API_KEY;
        const headers = {
            'Content-Type': 'application/json',
        };
        // Add API key authentication if provided
        if (wahaApiKey) {
            headers['X-API-Key'] = wahaApiKey;
            console.log('[WAHA Service] ✅ API key authentication configured');
        }
        else {
            console.warn('[WAHA Service] ⚠️ No WAHA_API_KEY found - API requests may fail with 401');
        }
        this.httpClient = axios_1.default.create({
            baseURL: this.wahaBaseUrl,
            timeout: 90000, // Increased to 90 seconds for Render.com cold starts and heavy chat loads
            headers,
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
        // Set up event listeners for authentication
        this.on('authenticated', this.handleAuthentication.bind(this));
    }
    /**
     * Handle authentication event - fetch chats automatically with retry logic
     */
    async handleAuthentication(authData) {
        try {
            console.log('[WAHA Service] 🎉 Handling authentication event:', authData);
            // Wait for the session to stabilize
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Try to fetch chats with retry logic since WAHA might need time to sync
            console.log('[WAHA Service] Fetching chats after authentication...');
            let chats = [];
            let attempts = 0;
            const maxAttempts = 3;
            while (attempts < maxAttempts && chats.length === 0) {
                attempts++;
                try {
                    chats = await this.getChats();
                    console.log(`[WAHA Service] Attempt ${attempts}: fetched ${chats.length} chats`);
                    if (chats.length === 0 && attempts < maxAttempts) {
                        console.log(`[WAHA Service] No chats found, waiting 3s before retry ${attempts + 1}/${maxAttempts}`);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                }
                catch (error) {
                    console.error(`[WAHA Service] Chat fetch attempt ${attempts} failed:`, error);
                    if (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }
            console.log(`[WAHA Service] ✅ Authentication handling complete: ${chats.length} chats after ${attempts} attempts`);
            // Emit chats updated event
            this.emit('chats_updated', {
                groups: chats.filter(chat => chat.isGroup),
                privateChats: chats.filter(chat => !chat.isGroup),
                totalCount: chats.length
            });
            // Broadcast via Socket.IO if available
            const io_instance = global.io;
            if (io_instance) {
                console.log('[WAHA Service] Broadcasting chats update via Socket.IO');
                io_instance.emit('whatsapp:chats_updated', {
                    groups: chats.filter(chat => chat.isGroup),
                    privateChats: chats.filter(chat => !chat.isGroup),
                    totalCount: chats.length,
                    fetchAttempts: attempts
                });
            }
        }
        catch (error) {
            console.error('[WAHA Service] ❌ Error handling authentication:', error);
        }
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
            const healthCheckResult = await this.healthCheck();
            this.isReady = healthCheckResult.healthy;
            this.connectionStatus = healthCheckResult.healthy ? 'connected' : 'disconnected';
            // Start default session (don't fail initialization if this fails)
            try {
                await this.startSession();
                // Check session status
                const status = await this.getSessionStatus();
                this.connectionStatus = status.status;
                this.isReady = status.status === 'WORKING';
                console.log(`[WAHA Service] ✅ Initialized. Status: ${status.status}`);
            }
            catch (sessionError) {
                console.warn('[WAHA Service] ⚠️ Failed to start/check session during initialization:', sessionError);
                // Service is healthy but session failed - still usable for QR generation
                this.connectionStatus = 'session_failed';
                this.isReady = true; // Still mark as ready for basic operations
            }
            this.emit('ready');
            // Start status monitoring after successful initialization
            this.startStatusMonitoring();
            // Try to initialize default session immediately
            this.initializeDefaultSession();
        }
        catch (error) {
            console.error('[WAHA Service] ❌ Initialization failed:', error);
            this.connectionStatus = 'failed';
            this.isReady = false;
            this.emit('error', error);
            // Don't throw initialization errors - allow fallback to Baileys
            console.log('[WAHA Service] 🔄 Will allow fallback to Baileys service');
        }
    }
    /**
     * Start periodic status monitoring
     */
    startStatusMonitoring() {
        // Clear any existing monitor
        this.stopStatusMonitoring();
        console.log('[WAHA Service] Starting periodic status monitoring');
        this.statusMonitorInterval = setInterval(async () => {
            try {
                await this.getStatus(); // This will emit events if status changes
            }
            catch (error) {
                console.error('[WAHA Service] Error during status monitoring:', error);
            }
        }, 5000); // Check every 5 seconds
    }
    /**
     * Stop periodic status monitoring
     */
    stopStatusMonitoring() {
        if (this.statusMonitorInterval) {
            console.log('[WAHA Service] Stopping periodic status monitoring');
            clearInterval(this.statusMonitorInterval);
            this.statusMonitorInterval = null;
        }
    }
    /**
     * Initialize default session (create if doesn't exist)
     */
    async initializeDefaultSession() {
        try {
            console.log('[WAHA Service] Initializing default session...');
            // Wait a moment for WAHA service to be fully ready
            await new Promise(resolve => setTimeout(resolve, 2000));
            const session = await this.startSession();
            console.log(`[WAHA Service] ✅ Default session initialized with status: ${session.status}`);
        }
        catch (error) {
            console.error('[WAHA Service] ⚠️ Could not initialize default session (will try again later):', error);
            // Retry after 10 seconds
            setTimeout(() => {
                this.initializeDefaultSession();
            }, 10000);
        }
    }
    /**
     * Perform a health check on the WAHA service
     */
    async healthCheck() {
        try {
            // Check if we've done a health check recently
            const now = Date.now();
            if (this.lastHealthCheckResult &&
                (now - this.lastHealthCheckTimestamp) < 30000) { // 30 seconds cache
                console.log('[WAHA Service] Returning cached health check');
                return this.lastHealthCheckResult;
            }
            const healthEndpoints = ['/api/version', '/api/sessions', '/ping', '/'];
            const results = [];
            for (const endpoint of healthEndpoints) {
                try {
                    const response = await this.httpClient.get(endpoint, {
                        timeout: 5000,
                        validateStatus: (status) => status < 500
                    });
                    results.push({
                        endpoint,
                        status: response.status,
                        success: response.status < 400
                    });
                    // If we get a successful response from any endpoint, consider service healthy
                    if (response.status < 400) {
                        const result = {
                            healthy: true,
                            details: {
                                endpoints: results,
                                lastCheck: new Date().toISOString()
                            }
                        };
                        // Cache the result
                        this.lastHealthCheckResult = result;
                        this.lastHealthCheckTimestamp = now;
                        return result;
                    }
                }
                catch (error) {
                    results.push({
                        endpoint,
                        status: 0,
                        success: false,
                        error: error.message
                    });
                }
            }
            // If we get here, all endpoints failed
            const result = {
                healthy: false,
                details: {
                    endpoints: results,
                    lastCheck: new Date().toISOString()
                }
            };
            // Cache even failed results to prevent hammering
            this.lastHealthCheckResult = result;
            this.lastHealthCheckTimestamp = now;
            return result;
        }
        catch (error) {
            console.error('[WAHA Service] Health check error:', error);
            const result = {
                healthy: false,
                details: {
                    error: error.message,
                    lastCheck: new Date().toISOString()
                }
            };
            // Cache the error result
            this.lastHealthCheckResult = result;
            this.lastHealthCheckTimestamp = Date.now();
            return result;
        }
    }
    /**
     * Start a WhatsApp session
     */
    async startSession(sessionName = this.defaultSession) {
        try {
            console.log(`[WAHA Service] Starting session management for '${sessionName}'`);
            // Prepare webhook URL at the top level to avoid scope issues
            const webhookUrl = process.env.BACKEND_URL || 'https://synapse-backend-7lq6.onrender.com';
            const fullWebhookUrl = `${webhookUrl}/api/v1/waha/webhook`;
            console.log(`[WAHA Service] 🔧 FIXED: Using BACKEND webhook URL: ${fullWebhookUrl}`);
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
                else if (sessionData?.status === 'WORKING' || sessionData?.status === 'SCAN_QR_CODE' || sessionData?.status === 'STARTING') {
                    console.log(`[WAHA Service] ✅ Session '${sessionName}' is already active (${sessionData?.status})`);
                    return sessionData;
                }
            }
            catch (getError) {
                if (getError.response?.status === 404) {
                    console.log(`[WAHA Service] Session '${sessionName}' doesn't exist, will create new one`);
                    sessionExists = false;
                }
                else {
                    console.error(`[WAHA Service] Unexpected error checking session:`, getError);
                    throw getError;
                }
            }
            // If session doesn't exist, create it
            if (!sessionExists) {
                console.log(`[WAHA Service] Creating new session '${sessionName}'...`);
                const engine = process.env.WAHA_ENGINE?.trim();
                const createPayload = { name: sessionName };
                if (engine) {
                    createPayload.engine = engine;
                    console.log(`[WAHA Service] Using configured WAHA engine: ${engine}`);
                }
                console.log(`[WAHA Service] Making POST request to /api/sessions with payload:`, createPayload);
                // Create session (minimal payload; webhooks added after successful start)
                const response = await this.httpClient.post('/api/sessions', createPayload);
                console.log(`[WAHA Service] ✅ Session creation response:`, response.status);
                console.log(`[WAHA Service] 📋 Full response data:`, JSON.stringify(response.data, null, 2));
                sessionData = response.data;
                sessionExists = true;
                // CRITICAL: Wait for WAHA to initialize the session
                console.log(`[WAHA Service] ⏳ Waiting 3 seconds for WAHA to initialize session...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                // Verify session was actually created by listing all sessions
                try {
                    const allSessions = await this.httpClient.get('/api/sessions');
                    console.log(`[WAHA Service] 📋 All sessions after creation:`, allSessions.data);
                }
                catch (listError) {
                    console.log(`[WAHA Service] ⚠️ Could not list sessions:`, listError);
                }
            }
            // Always try to start the session after creation with retry logic
            if (sessionExists) {
                let startSuccess = false;
                let attempts = 0;
                const maxAttempts = 3;
                while (!startSuccess && attempts < maxAttempts) {
                    attempts++;
                    try {
                        console.log(`[WAHA Service] 🚀 Starting session '${sessionName}' (attempt ${attempts}/${maxAttempts}) with POST /api/sessions/${sessionName}/start`);
                        // First verify session exists before starting
                        const sessionCheck = await this.httpClient.get(`/api/sessions/${sessionName}`);
                        console.log(`[WAHA Service] ✅ Session exists before start attempt:`, sessionCheck.data);
                        const startResponse = await this.httpClient.post(`/api/sessions/${sessionName}/start`);
                        console.log(`[WAHA Service] ✅ Session '${sessionName}' start response:`, startResponse.status, startResponse.data);
                        startSuccess = true;
                    }
                    catch (startError) {
                        console.error(`[WAHA Service] ❌ Failed to start session '${sessionName}' (attempt ${attempts}):`, startError.message);
                        console.error(`[WAHA Service] Start error details:`, {
                            status: startError?.response?.status,
                            statusText: startError?.response?.statusText,
                            data: startError?.response?.data
                        });
                        if (attempts < maxAttempts) {
                            console.log(`[WAHA Service] ⏳ Waiting 2 seconds before retry...`);
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    }
                }
                if (!startSuccess) {
                    console.error(`[WAHA Service] ❌ Failed to start session after ${maxAttempts} attempts`);
                }
                else {
                    // After successful start, add webhooks
                    try {
                        console.log(`[WAHA Service] 🔗 Adding webhooks to session '${sessionName}'...`);
                        await this.httpClient.post(`/api/sessions/${sessionName}/config`, {
                            webhooks: [
                                {
                                    url: fullWebhookUrl,
                                    events: ['session.status', 'message'],
                                    hmac: null,
                                    retries: {
                                        delaySeconds: 2,
                                        attempts: 15
                                    }
                                }
                            ]
                        });
                        console.log(`[WAHA Service] ✅ Webhooks added successfully`);
                    }
                    catch (webhookError) {
                        console.error(`[WAHA Service] ⚠️ Failed to add webhooks (non-critical):`, webhookError);
                    }
                }
            }
            // Ensure we return proper session data
            if (!sessionData || !sessionData.name) {
                console.log(`[WAHA Service] ⚠️ Session data incomplete, fetching fresh status...`);
                try {
                    sessionData = await this.getSessionStatus(sessionName);
                }
                catch (fetchError) {
                    console.error(`[WAHA Service] ❌ Could not fetch session status:`, fetchError);
                    // Return minimal session data
                    sessionData = { name: sessionName, status: 'STARTING' };
                }
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
     * Get session status (with caching to reduce API calls)
     */
    async getSessionStatus(sessionName = 'default') {
        try {
            // Check cache first
            const now = Date.now();
            if (this.sessionStatusCache.data &&
                (now - this.sessionStatusCache.timestamp) < this.SESSION_CACHE_DURATION) {
                console.log('[WAHA Service] Returning cached session status');
                return this.sessionStatusCache.data;
            }
            const response = await this.httpClient.get(`/api/sessions/${sessionName}`);
            // Cache the response
            this.sessionStatusCache.data = response.data;
            this.sessionStatusCache.timestamp = now;
            console.log(`[WAHA Service] Session '${sessionName}' status:`, {
                status: response.data?.status,
                me: response.data?.me,
                engine: response.data?.engine
            });
            return response.data;
        }
        catch (error) {
            // Return cached data if available on error
            if (this.sessionStatusCache.data) {
                console.warn('[WAHA Service] Error fetching session status, returning cached data:', error.message);
                return this.sessionStatusCache.data;
            }
            if (error.response?.status === 404) {
                console.error(`[WAHA Service] Session '${sessionName}' not found`);
                throw new Error('Session not found. Please create a new session.');
            }
            console.error('[WAHA Service] Error getting session status:', error.message);
            throw error;
        }
    }
    /**
     * Get QR code for session (following WAHA API documentation)
     */
    async getQRCode(sessionName = this.defaultSession, force = false) {
        console.log(`[WAHA Service] Starting QR code generation for session '${sessionName}', force=${force}`);
        try {
            // Throttle QR requests to avoid device-link rate limits
            const now = Date.now();
            if (!force && this.lastQrGeneratedAt && now - this.lastQrGeneratedAt < this.qrRequestCooldownMs) {
                console.log('[WAHA Service] ⏳ Throttling QR requests; returning recent QR');
                if (this.lastQrDataUrl)
                    return this.lastQrDataUrl;
            }
            // Reuse a fresh QR within a short window to avoid regenerating constantly
            if (!force && this.lastQrGeneratedAt && now - this.lastQrGeneratedAt < this.qrReuseWindowMs && this.lastQrDataUrl) {
                console.log('[WAHA Service] 🔁 Reusing cached QR within reuse window');
                return this.lastQrDataUrl;
            }
            // Ensure session exists and is in a proper state for QR
            console.log(`[WAHA Service] Ensuring session '${sessionName}' exists and is configured...`);
            let current = await this.getSessionStatus(sessionName);
            if (current.status === 'STOPPED' || current.status === 'FAILED') {
                await this.startSession(sessionName);
                current = await this.getSessionStatus(sessionName);
            }
            // Wait for session to reach SCAN_QR_CODE state with longer timeout
            console.log(`[WAHA Service] Waiting for session '${sessionName}' to reach QR ready state...`);
            await this.waitForSessionState(sessionName, ['SCAN_QR_CODE'], 30000); // 30 seconds for stability
            // Get QR code using WAHA's proper endpoint: GET /api/{session}/auth/qr (per official docs)
            console.log(`[WAHA Service] Requesting QR code from GET /api/${sessionName}/auth/qr`);
            const response = await this.httpClient.get(`/api/${sessionName}/auth/qr`, {
                responseType: 'arraybuffer',
                timeout: 15000, // 15 second timeout for QR generation
                validateStatus: (status) => status === 200 // Only accept 200 status
            });
            console.log(`[WAHA Service] QR code response received, status: ${response.status}`);
            if (response.data && response.data.byteLength > 0) {
                const base64 = Buffer.from(response.data).toString('base64');
                console.log(`[WAHA Service] ✅ QR code converted to base64, length: ${base64.length}`);
                const dataUrl = `data:image/png;base64,${base64}`;
                this.lastQrDataUrl = dataUrl;
                this.lastQrGeneratedAt = Date.now();
                return dataUrl;
            }
            else {
                throw new Error('Empty QR code response from WAHA service');
            }
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Failed to get QR code for '${sessionName}':`, error);
            console.error(`[WAHA Service] Error details:`, {
                status: error?.response?.status,
                statusText: error?.response?.statusText,
                data: error?.response?.data?.toString?.() || error?.response?.data
            });
            // Handle specific error cases
            if (error?.response?.status === 422) {
                throw new Error('Session is not ready for QR code generation. Please restart the session.');
            }
            else if (error?.response?.status === 404) {
                throw new Error('QR code endpoint not found. Please check WAHA service configuration.');
            }
            else if (error?.response?.status === 502) {
                throw new Error('WAHA service is not responding. Please check service availability.');
            }
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to get QR code: ${errorMessage}`);
        }
    }
    /**
     * Send text message
     */
    async sendMessage(chatId, text, sessionName = this.defaultSession) {
        try {
            console.log(`[WAHA Service] Sending message to ${chatId} in session '${sessionName}'...`);
            console.log(`[WAHA Service] Message details:`, {
                chatId,
                textLength: text.length,
                textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                sessionName,
                wahaBaseUrl: this.wahaBaseUrl
            });
            // Check session status first
            try {
                const sessionStatus = await this.getSessionStatus(sessionName);
                console.log(`[WAHA Service] Session status before send:`, sessionStatus);
                if (sessionStatus.status !== 'WORKING') {
                    throw new Error(`Session not ready for sending. Status: ${sessionStatus.status}`);
                }
            }
            catch (statusError) {
                console.warn(`[WAHA Service] Could not check session status before send:`, statusError);
                // Continue anyway - might still work
            }
            // WAHA API structure: POST /api/{session}/sendText
            const endpoint = `/api/${sessionName}/sendText`;
            const payload = { chatId, text };
            console.log(`[WAHA Service] Making request to: ${this.wahaBaseUrl}${endpoint}`);
            console.log(`[WAHA Service] Request payload:`, payload);
            const response = await this.httpClient.post(endpoint, payload);
            console.log(`[WAHA Service] ✅ Message sent to ${chatId}. Response:`, response.data);
            return response.data;
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Failed to send message to ${chatId}:`, {
                error: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    baseURL: error.config?.baseURL,
                    timeout: error.config?.timeout
                }
            });
            throw error;
        }
    }
    /**
     * Send media message
     */
    async sendMedia(chatId, mediaUrl, caption, sessionName = this.defaultSession) {
        try {
            console.log(`[WAHA Service] Sending media to ${chatId} in session '${sessionName}'...`);
            // WAHA API structure: POST /api/{session}/sendFile
            const response = await this.httpClient.post(`/api/${sessionName}/sendFile`, {
                chatId,
                file: {
                    url: mediaUrl
                },
                caption
            });
            console.log(`[WAHA Service] ✅ Media sent to ${chatId}`);
            return response.data;
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Failed to send media to ${chatId}:`, error.response?.status, error.response?.data);
            throw error;
        }
    }
    /**
     * Get chats with WAHA-compliant pagination and filtering
     */
    async getChats(sessionName = this.defaultSession, options = {}) {
        try {
            console.log(`[WAHA Service] Getting chats for session '${sessionName}'...`);
            // Check session status first
            const sessionStatus = await this.getSessionStatus(sessionName);
            console.log(`[WAHA Service] Session '${sessionName}' status: ${sessionStatus.status}`);
            if (sessionStatus.status !== 'WORKING') {
                console.log(`[WAHA Service] Session not in WORKING status (${sessionStatus.status}), returning empty chats`);
                return [];
            }
            const normalizeChats = (raw) => {
                if (Array.isArray(raw))
                    return raw;
                if (Array.isArray(raw?.chats))
                    return raw.chats;
                if (Array.isArray(raw?.data))
                    return raw.data;
                return [];
            };
            const mapChats = (items) => {
                return (items || []).map((chat) => ({
                    id: chat.id,
                    name: chat.name || chat.subject || chat.title || chat.id,
                    // Robust group detection: WAHA may omit isGroup. Treat *@g.us as group.
                    isGroup: Boolean(chat.isGroup) || (typeof chat.id === 'string' && chat.id.includes('@g.us')),
                    lastMessage: chat.lastMessage?.body,
                    timestamp: chat.lastMessage?.timestamp,
                    participantCount: chat.participantCount
                }));
            };
            const tryOverview = async () => {
                try {
                    console.log(`[WAHA Service] Trying chats overview with 90s timeout...`);
                    const res = await this.httpClient.get(`/api/${sessionName}/chats/overview`, { timeout: 90000 });
                    const items = normalizeChats(res.data);
                    console.log(`[WAHA Service] ✅ Chats overview successful; got ${items.length} items`);
                    if (items.length > 0) {
                        return mapChats(items);
                    }
                    else {
                        console.log('[WAHA Service] Overview endpoint returned empty result, will try direct /chats');
                        return null;
                    }
                }
                catch (e) {
                    const errorMsg = e?.response?.status === 404 ? 'Overview endpoint not available (404)' : `${e?.message || e}`;
                    console.log(`[WAHA Service] ❌ Chats overview failed: ${errorMsg}`);
                    if (errorMsg.includes('timeout')) {
                        console.log(`[WAHA Service] Overview endpoint timed out after 90s, will try direct /chats`);
                    }
                    return null;
                }
            };
            const tryChats = async (timeoutMs) => {
                try {
                    // Build WAHA-compliant query parameters with performance optimizations
                    const params = new URLSearchParams();
                    // Use smaller initial limit to reduce timeout risk
                    const effectiveLimit = options.limit || 50; // Default to 50 chats initially for better performance
                    params.append('limit', effectiveLimit.toString());
                    if (options.offset)
                        params.append('offset', options.offset.toString());
                    if (options.sortBy)
                        params.append('sortBy', options.sortBy);
                    if (options.sortOrder)
                        params.append('sortOrder', options.sortOrder);
                    if (options.exclude?.length)
                        params.append('exclude', options.exclude.join(','));
                    const queryString = params.toString();
                    const endpoint = `/api/${sessionName}/chats${queryString ? `?${queryString}` : ''}`;
                    console.log(`[WAHA Service] Trying direct /chats endpoint with ${timeoutMs / 1000}s timeout...`);
                    console.log(`[WAHA Service] Using WAHA-compliant endpoint: ${endpoint}`);
                    const res = await this.httpClient.get(endpoint, { timeout: timeoutMs });
                    const items = normalizeChats(res.data);
                    console.log(`[WAHA Service] ✅ Direct /chats successful; got ${items.length} items`);
                    return mapChats(items);
                }
                catch (e) {
                    const errorMsg = e?.message || e;
                    console.log(`[WAHA Service] ❌ /chats failed (${timeoutMs / 1000}s): ${errorMsg}`);
                    if (errorMsg.includes('timeout')) {
                        console.log(`[WAHA Service] Direct chats endpoint timed out after ${timeoutMs / 1000}s`);
                    }
                    return null;
                }
            };
            // Optimized attempt sequence: overview(90s) → chats(90s) → chats(60s) with progressive timeout reduction
            console.log(`[WAHA Service] Starting optimized chat loading sequence for session '${sessionName}'...`);
            let chats = await tryOverview();
            if (!chats || chats.length === 0) {
                console.log(`[WAHA Service] Overview failed or empty, trying direct /chats with extended timeout...`);
                chats = await tryChats(90000); // First attempt with 90s timeout for heavy loads/cold starts
            }
            if (!chats || chats.length === 0) {
                console.log(`[WAHA Service] First /chats attempt failed, retrying with medium timeout...`);
                await new Promise(resolve => setTimeout(resolve, 3000)); // Longer delay for WAHA to stabilize
                chats = await tryChats(60000); // Second attempt with 60s timeout
            }
            if (!chats || chats.length === 0) {
                console.log(`[WAHA Service] Second /chats attempt failed, final retry with standard timeout...`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Brief delay before final retry
                chats = await tryChats(30000); // Final attempt with 30s timeout (original failing timeout)
            }
            if (!chats || chats.length === 0) {
                console.warn('[WAHA Service] ⚠️ No chats retrieved from any endpoint after multiple attempts');
                console.warn('[WAHA Service] Possible causes:');
                console.warn('[WAHA Service] 1) WhatsApp session not fully synchronized with WAHA service');
                console.warn('[WAHA Service] 2) No WhatsApp chats exist for this account');
                console.warn('[WAHA Service] 3) WAHA service is experiencing heavy load (Render.com cold start)');
                console.warn('[WAHA Service] 4) Network connectivity issues between backend and WAHA service');
                console.warn('[WAHA Service] Suggestion: Wait a few moments and try refreshing, or check WAHA service logs');
                return [];
            }
            // Validate that we have meaningful chat data
            const validChats = chats.filter(chat => chat.id && chat.name);
            if (validChats.length !== chats.length) {
                console.warn(`[WAHA Service] Filtered out ${chats.length - validChats.length} invalid chats`);
            }
            // Enforce a hard cap to reduce memory usage when WAHA returns huge lists
            const limit = Math.max(1, parseInt(process.env.WAHA_CHATS_LIMIT || '300', 10));
            if (validChats.length > limit) {
                console.log(`[WAHA Service] Capping chats from ${validChats.length} to ${limit} (WAHA_CHATS_LIMIT)`);
                return validChats.slice(0, limit);
            }
            console.log(`[WAHA Service] ✅ Successfully retrieved ${validChats.length} valid chats`);
            return validChats;
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Failed to get chats for '${sessionName}':`, error.response?.status, error.response?.data);
            // Handle specific 422 error for session not ready
            if (error.response?.status === 422) {
                console.log(`[WAHA Service] Session not ready (422), returning empty chats`);
                return [];
            }
            // Return empty array instead of throwing to prevent 500 errors
            return [];
        }
    }
    /**
     * Get groups using WAHA groups endpoint (compliant), fallback to filtering chats
     */
    async getGroups(sessionName = this.defaultSession, options = {}) {
        try {
            // Ensure session is working
            const sessionStatus = await this.getSessionStatus(sessionName);
            if (sessionStatus.status !== 'WORKING') {
                return [];
            }
            try {
                // Build WAHA-compliant query parameters for groups
                const params = new URLSearchParams();
                if (options.limit)
                    params.append('limit', options.limit.toString());
                if (options.offset)
                    params.append('offset', options.offset.toString());
                if (options.sortBy)
                    params.append('sortBy', options.sortBy);
                if (options.sortOrder)
                    params.append('sortOrder', options.sortOrder);
                if (options.exclude?.length)
                    params.append('exclude', options.exclude.join(','));
                const queryString = params.toString();
                const endpoint = `/api/${sessionName}/groups${queryString ? `?${queryString}` : ''}`;
                console.log(`[WAHA Service] Using WAHA-compliant groups endpoint: ${endpoint}`);
                const res = await this.httpClient.get(endpoint);
                console.log(`[WAHA Service] Received ${res.data.length} groups`);
                return res.data.map((g) => ({
                    id: g.id || g.chatId || g.groupId,
                    name: g.name || g.subject || g.title || g.id,
                    description: g.description,
                    isGroup: true,
                    lastMessage: g.lastMessage?.body,
                    timestamp: g.lastMessage?.timestamp,
                    participantCount: g.participants?.length || g.participantCount || 0,
                    // Enhanced WAHA group metadata
                    inviteCode: g.invite || g.inviteCode,
                    picture: g.picture,
                    role: g.role, // 'ADMIN', 'MEMBER', etc.
                    settings: {
                        messagesAdminOnly: g.settings?.messagesAdminOnly,
                        infoAdminOnly: g.settings?.infoAdminOnly
                    }
                }));
            }
            catch (e) {
                if (e.response?.status === 404) {
                    console.log(`[WAHA Service] /groups endpoint not available, falling back to chats filter`);
                }
                else {
                    console.warn(`[WAHA Service] Groups endpoint error, falling back to chats filter`, e.message);
                }
                const chats = await this.getChats(sessionName);
                return chats.filter(c => c.isGroup || (typeof c.id === 'string' && c.id.includes('@g.us')));
            }
        }
        catch (err) {
            console.error('[WAHA Service] Failed to get groups:', err);
            return [];
        }
    }
    /**
     * Request WAHA to refresh groups (WAHA-compliant implementation)
     */
    async refreshGroups(sessionName = this.defaultSession) {
        console.log(`[WAHA Service] Refreshing groups for session '${sessionName}'`);
        // Try WAHA-compliant refresh endpoint first
        try {
            const response = await this.httpClient.post(`/api/${sessionName}/groups/refresh`, {}, { timeout: 15000 });
            console.log(`[WAHA Service] ✅ Groups refreshed successfully`);
            return { success: true, message: 'Groups refreshed successfully' };
        }
        catch (refreshError) {
            // If refresh endpoint doesn't exist (404), that's expected for many WAHA engines
            if (refreshError.response?.status === 404) {
                console.log(`[WAHA Service] Groups refresh endpoint not available (404) - this is normal for some WAHA engines`);
                console.log(`[WAHA Service] Groups are automatically refreshed by the WAHA service`);
                return { success: true, message: 'Groups are automatically refreshed by WAHA service (no manual refresh needed)' };
            }
            else if (refreshError.code === 'ECONNABORTED' || refreshError.message?.includes('timeout')) {
                console.log(`[WAHA Service] Groups refresh timed out - this may indicate heavy processing`);
                return { success: true, message: 'Groups refresh initiated (may take time to complete)' };
            }
            else {
                console.warn(`[WAHA Service] Groups refresh failed:`, refreshError.message);
                return { success: false, message: `Groups refresh failed: ${refreshError.message}` };
            }
        }
    }
    /**
     * Get group participants (WAHA-compliant)
     */
    async getGroupParticipants(groupId, sessionName = this.defaultSession) {
        try {
            console.log(`[WAHA Service] Getting participants for group '${groupId}'`);
            const response = await this.httpClient.get(`/api/${sessionName}/groups/${encodeURIComponent(groupId)}/participants`);
            return response.data || [];
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Failed to get group participants:`, error);
            return [];
        }
    }
    /**
     * Get specific group details (WAHA-compliant)
     */
    async getGroupDetails(groupId, sessionName = this.defaultSession) {
        try {
            console.log(`[WAHA Service] Getting details for group '${groupId}'`);
            const response = await this.httpClient.get(`/api/${sessionName}/groups/${encodeURIComponent(groupId)}`);
            return response.data;
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Failed to get group details:`, error);
            return null;
        }
    }
    /**
     * Get messages from chat
     */
    async getMessages(chatId, limit = 50, sessionName = this.defaultSession) {
        try {
            console.log(`[WAHA Service] Getting messages for chat '${chatId}' in session '${sessionName}'...`);
            // Check session status first
            const sessionStatus = await this.getSessionStatus(sessionName);
            console.log(`[WAHA Service] Session '${sessionName}' status: ${sessionStatus.status}`);
            if (sessionStatus.status !== 'WORKING') {
                console.log(`[WAHA Service] Session not in WORKING status (${sessionStatus.status}), returning empty messages`);
                return [];
            }
            // WAHA API endpoint structure: /api/{session}/chats/{chatId}/messages
            const response = await this.httpClient.get(`/api/${sessionName}/chats/${encodeURIComponent(chatId)}/messages`, {
                params: { limit },
                timeout: 20000
            });
            console.log(`[WAHA Service] Received ${response.data.length} messages`);
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
            console.error(`[WAHA Service] ❌ Failed to get messages for ${chatId}:`, error.response?.status, error.response?.data);
            // Handle specific 422 error for session not ready
            if (error.response?.status === 422) {
                console.log(`[WAHA Service] Session not ready (422), returning empty messages`);
                return [];
            }
            // Return empty array instead of throwing to prevent 500 errors
            return [];
        }
    }
    /**
     * Get recent messages from all chats
     */
    async getRecentMessages(limit = 50, sessionName = this.defaultSession) {
        try {
            console.log(`[WAHA Service] Getting recent messages from all chats in session '${sessionName}'...`);
            // Check session status first
            const sessionStatus = await this.getSessionStatus(sessionName);
            console.log(`[WAHA Service] Session '${sessionName}' status: ${sessionStatus.status}`);
            if (sessionStatus.status !== 'WORKING') {
                console.log(`[WAHA Service] Session not in WORKING status (${sessionStatus.status}), returning empty messages`);
                return [];
            }
            // Get all chats first
            const chats = await this.getChats(sessionName);
            if (!chats || chats.length === 0) {
                console.log(`[WAHA Service] No chats found, returning empty messages`);
                return [];
            }
            // Get messages from each chat (limit per chat to avoid overwhelming)
            const messagesPerChat = Math.max(1, Math.floor(limit / Math.min(chats.length, 10)));
            const allMessages = [];
            // Process first 10 chats with most recent activity
            const sortedChats = chats
                .filter(chat => chat.timestamp) // Only chats with recent activity
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                .slice(0, 10);
            console.log(`[WAHA Service] Getting messages from ${sortedChats.length} most active chats (${messagesPerChat} messages per chat)`);
            for (const chat of sortedChats) {
                try {
                    const chatMessages = await this.getMessages(chat.id, messagesPerChat, sessionName);
                    allMessages.push(...chatMessages);
                    // Stop if we've reached the limit
                    if (allMessages.length >= limit) {
                        break;
                    }
                }
                catch (chatError) {
                    console.warn(`[WAHA Service] Failed to get messages from chat ${chat.id}:`, chatError);
                    // Continue with other chats
                }
            }
            // Sort by timestamp descending and limit results
            const sortedMessages = allMessages
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, limit);
            console.log(`[WAHA Service] Collected ${sortedMessages.length} recent messages from ${sortedChats.length} chats`);
            return sortedMessages;
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Failed to get recent messages:`, error.response?.status, error.response?.data);
            return [];
        }
    }
    /**
     * Stop session
     */
    async stopSession(sessionName = this.defaultSession) {
        try {
            await this.httpClient.delete(`/api/sessions/${sessionName}`);
            console.log(`[WAHA Service] ✅ Session '${sessionName}' stopped`);
            this.connectionStatus = 'disconnected';
            this.isReady = false;
            // Invalidate cached QR on stop
            this.lastQrDataUrl = null;
            this.lastQrGeneratedAt = null;
        }
        catch (error) {
            // Don't throw error if session doesn't exist (404)
            if (error?.response?.status === 404) {
                console.log(`[WAHA Service] Session '${sessionName}' was already deleted`);
                this.connectionStatus = 'disconnected';
                this.isReady = false;
                this.lastQrDataUrl = null;
                this.lastQrGeneratedAt = null;
                return;
            }
            console.error(`[WAHA Service] ❌ Failed to stop session '${sessionName}':`, error);
            throw error;
        }
    }
    /**
     * Restart session by stopping and starting it
     */
    async restartSession(sessionName = this.defaultSession) {
        try {
            console.log(`[WAHA Service] Restarting session '${sessionName}'...`);
            // Stop existing session (ignore errors if it doesn't exist)
            try {
                await this.stopSession(sessionName);
                console.log(`[WAHA Service] Session '${sessionName}' stopped for restart`);
            }
            catch (stopError) {
                console.log(`[WAHA Service] Stop failed during restart (session may not exist):`, stopError);
            }
            // Wait a moment for cleanup
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Start new session
            const newSession = await this.startSession(sessionName);
            console.log(`[WAHA Service] ✅ Session '${sessionName}' restarted with status: ${newSession.status}`);
            // Invalidate cached QR on restart
            this.lastQrDataUrl = null;
            this.lastQrGeneratedAt = null;
            return newSession;
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Failed to restart session '${sessionName}':`, error);
            throw error;
        }
    }
    /**
     * Get overall service status
     */
    async getStatus() {
        try {
            // Quick health check with caching
            const healthResult = await this.healthCheck();
            const isHealthy = healthResult.healthy;
            let sessionStatus = null;
            let sessionDetails = null;
            // Only check session if service is healthy
            if (isHealthy) {
                try {
                    sessionDetails = await this.getSessionStatus();
                    sessionStatus = sessionDetails?.status || 'STOPPED';
                }
                catch (error) {
                    console.warn('[WAHA Service] Could not get session status:', error.message);
                    sessionStatus = 'STOPPED';
                }
            }
            return {
                isReady: isHealthy && sessionStatus === 'WORKING',
                status: sessionStatus || 'disconnected',
                qrAvailable: sessionStatus === 'SCAN_QR_CODE',
                timestamp: new Date().toISOString(),
                healthCheck: healthResult.details
            };
        }
        catch (error) {
            console.error('[WAHA Service] Error getting status:', error);
            return {
                isReady: false,
                status: 'error',
                qrAvailable: false,
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }
    /**
     * Webhook handler for WAHA events (following WAHA documentation event structure)
     */
    handleWebhook(payload) {
        try {
            console.log('[WAHA Service] Webhook received:', payload);
            // WAHA event structure: { id, timestamp, event, session, payload }
            const eventType = payload.event;
            const sessionName = payload.session;
            const eventData = payload.payload;
            const eventId = payload.id;
            const eventTimestamp = payload.timestamp;
            console.log(`[WAHA Service] Processing event '${eventType}' for session '${sessionName}'`);
            switch (eventType) {
                case 'message':
                    this.emit('message', eventData);
                    // Process image messages for group monitoring
                    this.processImageForGroupMonitoring(eventData);
                    break;
                case 'session.status':
                    const previousIsReady = this.isReady;
                    const newStatus = eventData.status;
                    this.connectionStatus = newStatus;
                    this.isReady = newStatus === 'WORKING';
                    console.log('[WAHA Service] Session status change:', {
                        eventId,
                        sessionName,
                        previousIsReady,
                        newStatus,
                        isNowReady: this.isReady,
                        timestamp: eventTimestamp
                    });
                    // Emit authentication event if we just became authenticated
                    if (!previousIsReady && this.isReady && newStatus === 'WORKING') {
                        console.log('[WAHA Service] 🎉 Authentication detected via webhook! Session is now WORKING');
                        this.emit('authenticated', {
                            method: 'qr',
                            sessionStatus: newStatus,
                            sessionName: sessionName,
                            eventId: eventId,
                            timestamp: new Date().toISOString()
                        });
                        // Broadcast to Socket.IO if available
                        const io_instance = global.io;
                        if (io_instance) {
                            console.log('[WAHA Service] Broadcasting authentication via Socket.IO');
                            io_instance.emit('whatsapp:status', {
                                connected: true,
                                authenticated: true,
                                isReady: true,
                                authMethod: 'qr',
                                serviceType: 'waha',
                                sessionName: sessionName,
                                timestamp: new Date().toISOString()
                            });
                        }
                    }
                    this.emit('status_change', {
                        ...eventData,
                        authenticated: this.isReady,
                        connected: this.isReady,
                        sessionName: sessionName,
                        eventId: eventId,
                        timestamp: new Date().toISOString()
                    });
                    break;
                default:
                    console.log(`[WAHA Service] Unknown webhook event: ${eventType}`, payload);
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
     * Request phone authentication code (using WAHA API - may not be available in all engines)
     */
    async requestPhoneCode(phoneNumber, sessionName = this.defaultSession) {
        try {
            console.log(`[WAHA Service] Requesting phone verification code for: ${phoneNumber}`);
            // Ensure session is created first
            await this.startSession(sessionName);
            // Use WAHA's phone authentication endpoint (may not be supported by all engines)
            const response = await this.httpClient.post(`/api/${sessionName}/auth/request-code`, {
                phoneNumber: phoneNumber.replace(/\D/g, '') // Remove non-digits
            });
            // Some WAHA engines return the pairing code to be entered on the phone.
            // Try to extract it from multiple possible shapes to be robust across versions.
            const data = response?.data || {};
            const possibleCode = data.code || data.pairingCode || data.pair_code || data?.data?.code || data?.payload?.code || undefined;
            if (data.success || response.status === 200) {
                console.log(`[WAHA Service] ✅ Phone verification code requested successfully${possibleCode ? ` (code: ${possibleCode})` : ''}`);
                return { success: true, code: possibleCode };
            }
            else {
                console.error(`[WAHA Service] ❌ Phone code request failed:`, data);
                return { success: false, error: data.message || 'Failed to request phone code' };
            }
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Error requesting phone code:`, error);
            // Check if it's a known error that means phone auth is not supported
            if (error.response?.status === 404 || error.response?.status === 501 || error.response?.status === 405) {
                return {
                    success: false,
                    error: 'Phone number authentication is not available with the current WAHA engine. Please use QR code authentication instead.'
                };
            }
            return { success: false, error: error.message || 'Failed to request phone code' };
        }
    }
    /**
     * Verify phone authentication code (using WAHA API - may not be available in all engines)
     */
    async verifyPhoneCode(phoneNumber, code, sessionName = this.defaultSession) {
        try {
            console.log(`[WAHA Service] Verifying phone code for: ${phoneNumber}`);
            // Use WAHA's phone verification endpoint (may not be supported by all engines)
            const response = await this.httpClient.post(`/api/${sessionName}/auth/authorize-code`, {
                phoneNumber: phoneNumber.replace(/\D/g, ''),
                code: code
            });
            if (response.data.success || response.status === 200) {
                console.log(`[WAHA Service] ✅ Phone verification successful`);
                this.connectionStatus = 'WORKING';
                this.isReady = true;
                this.emit('authenticated', {
                    method: 'phone',
                    phoneNumber,
                    sessionName,
                    timestamp: new Date().toISOString()
                });
                return { success: true };
            }
            else {
                console.error(`[WAHA Service] ❌ Phone verification failed:`, response.data);
                return { success: false, error: response.data.message || 'Invalid verification code' };
            }
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Error verifying phone code:`, error);
            // Check if it's a known error that means phone auth is not supported
            if (error.response?.status === 404 || error.response?.status === 501 || error.response?.status === 405) {
                return {
                    success: false,
                    error: 'Phone number authentication is not available with the current WAHA engine. Please use QR code authentication instead.'
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
    /**
     * Restart failed WAHA session - handles FAILED session states
     */
    async restartFailedSession(sessionName = this.defaultSession) {
        try {
            console.log(`[WAHA Service] 🔄 Attempting to restart session '${sessionName}'...`);
            // First, delete the failed session
            try {
                await this.httpClient.delete(`/api/sessions/${sessionName}`);
                console.log(`[WAHA Service] ✅ Deleted failed session '${sessionName}'`);
            }
            catch (deleteError) {
                console.log(`[WAHA Service] ⚠️ Could not delete session (might not exist):`, deleteError.response?.status);
            }
            // Wait for cleanup
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Start new session
            const response = await this.httpClient.post(`/api/sessions/${sessionName}/start`, {
                name: sessionName
            });
            console.log(`[WAHA Service] ✅ Started new session '${sessionName}':`, response.data);
            // Reset connection status
            this.connectionStatus = 'disconnected';
            this.emit('session_restarted', { session: sessionName });
            return true;
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Failed to restart session '${sessionName}':`, error.response?.data || error.message);
            return false;
        }
    }
    /**
     * Auto-recover from FAILED session state
     */
    async autoRecoverSession(sessionName = this.defaultSession) {
        try {
            const status = await this.getSessionStatus(sessionName);
            if (status.status === 'FAILED') {
                console.log(`[WAHA Service] 🔄 Auto-recovering FAILED session '${sessionName}'...`);
                return await this.restartFailedSession(sessionName);
            }
            return true;
        }
        catch (error) {
            console.error(`[WAHA Service] ❌ Auto-recovery failed for '${sessionName}':`, error.message);
            return false;
        }
    }
}
WAHAService.instance = null;
exports.default = WAHAService;
