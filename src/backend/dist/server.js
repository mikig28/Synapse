"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose")); // Import mongoose to check connection state
const http_1 = __importDefault(require("http")); // Import http module
const socket_io_1 = require("socket.io"); // Import Server from socket.io
const whatsappRoutes_1 = __importDefault(require("./api/routes/whatsappRoutes")); // Import WhatsApp routes (legacy)
const wahaRoutes_1 = __importDefault(require("./api/routes/wahaRoutes")); // Import WAHA routes (modern)
const database_1 = require("./config/database"); // Import database connection
const authRoutes_1 = __importDefault(require("./api/routes/authRoutes")); // Import auth routes
const telegramService_1 = require("./services/telegramService"); // Import Telegram Bot initializer
const agentService_1 = require("./services/agentService"); // Import agent service
const agentScheduler_1 = require("./services/agentScheduler"); // Import agent scheduler
const agentsController_1 = require("./api/controllers/agentsController"); // Import agent services initializer
const agents_1 = require("./services/agents"); // Import agent executors registry
const whatsappBaileysService_1 = __importDefault(require("./services/whatsappBaileysService")); // Import WhatsApp Baileys service (legacy)
const wahaService_1 = __importDefault(require("./services/wahaService")); // Import WAHA service (modern)
const captureRoutes_1 = __importDefault(require("./api/routes/captureRoutes")); // Import capture routes
const path_1 = __importDefault(require("path")); // <-- Import path module
const fs_1 = __importDefault(require("fs")); // <-- Import fs module
const bookmarksRoutes_1 = __importDefault(require("./api/routes/bookmarksRoutes")); // Import bookmark routes
const videosRoutes_1 = __importDefault(require("./api/routes/videosRoutes")); // Added video routes
const tasksRoutes_1 = __importDefault(require("./api/routes/tasksRoutes")); // Add this
const notesRoutes_1 = __importDefault(require("./api/routes/notesRoutes")); // Add this
const ideasRoutes_1 = __importDefault(require("./api/routes/ideasRoutes")); // Add this
const meetingsRoutes_1 = __importDefault(require("./api/routes/meetingsRoutes")); // Add meetings routes
const userRoutes_1 = __importDefault(require("./api/routes/userRoutes")); // <-- IMPORT USER ROUTES
const media_1 = __importDefault(require("./api/routes/media")); // Import media routes
const agentsRoutes_1 = __importDefault(require("./api/routes/agentsRoutes")); // Import agents routes
const newsRoutes_1 = __importDefault(require("./api/routes/newsRoutes")); // Import news routes
const ttsRoutes_1 = __importDefault(require("./api/routes/ttsRoutes")); // Import text-to-speech routes
const calendarEventsRoutes_1 = __importDefault(require("./api/routes/calendarEventsRoutes")); // Import calendar event routes
const scheduledAgents_1 = __importDefault(require("./api/routes/scheduledAgents")); // Import scheduled agents routes
const placesRoutes_1 = __importDefault(require("./api/routes/placesRoutes")); // Import places routes
const documentsRoutes_1 = __importDefault(require("./api/routes/documentsRoutes")); // Import documents routes
const groupMonitorRoutes_1 = __importDefault(require("./api/routes/groupMonitorRoutes")); // Import group monitor routes
const searchRoutes_1 = __importDefault(require("./api/routes/searchRoutes")); // Import search routes
const exportRoutes_1 = __importDefault(require("./api/routes/exportRoutes")); // Import export routes
const feedbackRoutes_1 = __importDefault(require("./api/routes/feedbackRoutes")); // Import feedback routes
const usageRoutes_1 = __importDefault(require("./api/routes/usageRoutes")); // Import usage routes
const taskReminderService_1 = require("./services/taskReminderService"); // Import task reminder service
const schedulerService_1 = require("./services/schedulerService"); // Import scheduler service
const aguiEmitter_1 = require("./services/aguiEmitter"); // Import AG-UI emitter
const searchIndexes_1 = require("./config/searchIndexes"); // Import search indexes initializer
const usageTracking_1 = require("./middleware/usageTracking"); // Import usage tracking middleware
require("./services/searchIndexingService"); // Import to initialize search indexing hooks
dotenv_1.default.config();
const app = (0, express_1.default)();
const rawPort = process.env.PORT || '3001'; // Read as string
const PORT = parseInt(rawPort, 10); // Convert to number
// Define Frontend URL from environment variable or default to localhost
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
console.log(`[CORS Setup] Allowed origin for Express CORS: ${frontendUrl}`); // Log the origin being used
console.log(`[CORS Setup] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[CORS Setup] All environment variables related to frontend:`);
console.log(`  - FRONTEND_URL: ${process.env.FRONTEND_URL}`);
console.log(`  - PORT: ${process.env.PORT}`);
console.log(`  - NODE_ENV: ${process.env.NODE_ENV}`);
// Create HTTP server and pass it to Socket.IO
const httpServer = http_1.default.createServer(app);
// Define allowed origins for Socket.IO
const allowedSocketOrigins = [
    frontendUrl, // From environment variable
    "https://synapse-frontend.onrender.com" // Explicitly add production URL
];
// For development, you might also want to add your local dev URL if it's different
// e.g., if frontendUrl is for production, add "http://localhost:5173" here for local testing
console.log(`[Socket.IO CORS Setup] Allowed origins for Socket.IO: ${allowedSocketOrigins.join(', ')}`);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: [
            "https://synapse-frontend.onrender.com",
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:5174"
        ],
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true
    },
    // Render.com optimized settings for better WebSocket stability
    transports: ['polling', 'websocket'], // Start with polling, upgrade to WebSocket
    allowEIO3: true, // Allow Engine.IO v3 for compatibility
    pingTimeout: 120000, // 2 minutes (longer for Render.com)
    pingInterval: 60000, // 1 minute (less frequent pings)
    upgradeTimeout: 60000, // 1 minute for WebSocket upgrade
    maxHttpBufferSize: 1e6, // 1MB
    allowUpgrades: true // Allow transport upgrades
});
exports.io = io;
// Middleware - Enhanced CORS configuration with production fix
app.use((0, cors_1.default)({
    origin: function (requestOrigin, callback) {
        console.log(`[CORS] Request from origin: ${requestOrigin}`);
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!requestOrigin) {
            console.log(`[CORS] No origin header - allowing`);
            return callback(null, true);
        }
        const allowedOrigins = [
            "https://synapse-frontend.onrender.com",
            "https://synapse-backend-7lq6.onrender.com", // Backend for Socket.IO
            "http://localhost:5173", // Local development
            "http://localhost:3000", // Alternative local port
            "http://localhost:5174", // Vite alternative port
            "http://localhost:3001", // Backend local
        ];
        console.log(`[CORS] Checking origin ${requestOrigin} against allowed origins:`, allowedOrigins);
        if (allowedOrigins.includes(requestOrigin)) {
            console.log(`[CORS] ✅ Origin ${requestOrigin} explicitly allowed`);
            return callback(null, true);
        }
        else {
            console.log(`[CORS] ❌ Origin ${requestOrigin} not in allowed list`);
            return callback(new Error('Not allowed by CORS'), false);
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "Cache-Control"],
    credentials: true,
    optionsSuccessStatus: 200,
    preflightContinue: false
}));
// Add explicit CORS headers middleware
app.use((req, res, next) => {
    const origin = req.headers.origin;
    // Always set CORS headers for Socket.IO compatibility
    if (origin && [
        "https://synapse-frontend.onrender.com",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:5174"
    ].includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept, Origin, Cache-Control');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '3600');
    if (req.method === 'OPTIONS') {
        console.log(`[CORS] Handling preflight OPTIONS for ${req.path} from ${origin}`);
        res.status(200).end();
        return;
    }
    next();
});
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Usage tracking middleware (should be after auth but before routes)
app.use(usageTracking_1.trackApiUsage);
// Global request logger for API v1 routes
app.use('/api/v1', (req, res, next) => {
    console.log(`[API Logger] Path: ${req.path}, Method: ${req.method}`);
    console.log('[API Logger] Authorization Header:', req.headers.authorization ? 'Present' : 'Absent');
    if (req.headers.authorization) {
        // Log only the first few characters of the token for brevity and security
        const authHeaderParts = req.headers.authorization.split(' ');
        if (authHeaderParts.length === 2 && authHeaderParts[0].toLowerCase() === 'bearer') {
            console.log('[API Logger] Auth Header Value (Bearer Token Type):', authHeaderParts[1].substring(0, 20) + '...');
        }
        else {
            console.log('[API Logger] Auth Header Value (Other Type):', req.headers.authorization.substring(0, 20) + '...');
        }
    }
    else {
        console.log('[API Logger] No Authorization Header found.');
    }
    next();
});
// Create public directories if they don't exist
const publicDir = path_1.default.join(__dirname, '..', 'public'); // Assuming public is one level up from src, adjust if necessary
const uploadsDir = path_1.default.join(publicDir, 'uploads');
const telegramMediaDir = path_1.default.join(uploadsDir, 'telegram_media');
if (!fs_1.default.existsSync(publicDir))
    fs_1.default.mkdirSync(publicDir);
if (!fs_1.default.existsSync(uploadsDir))
    fs_1.default.mkdirSync(uploadsDir);
if (!fs_1.default.existsSync(telegramMediaDir))
    fs_1.default.mkdirSync(telegramMediaDir);
console.log(`[Static Files] Serving static files from /public mapped to physical directory: ${publicDir}`); // ADDED THIS LINE
// Serve static files from the 'public' directory
app.use('/public', express_1.default.static(publicDir)); // Serve files under /public URL path
// API Routes - WhatsApp (WAHA as primary service)
app.use('/api/v1/whatsapp', wahaRoutes_1.default); // Primary WAHA routes
app.use('/api/v1/whatsapp-legacy', whatsappRoutes_1.default); // Legacy Baileys routes (fallback)
app.use('/api/v1/waha', wahaRoutes_1.default); // Keep WAHA routes for direct access
app.use('/api/v1/auth', authRoutes_1.default);
app.use('/api/v1/capture', captureRoutes_1.default); // Use capture routes
app.use('/api/v1/bookmarks', bookmarksRoutes_1.default); // Use bookmark routes
app.use('/api/v1/videos', videosRoutes_1.default); // Use video routes
app.use('/api/v1/media', media_1.default); // Use media routes
app.use('/api/v1/tasks', tasksRoutes_1.default); // Add this
app.use('/api/v1/notes', notesRoutes_1.default); // Add this
app.use('/api/v1/ideas', ideasRoutes_1.default); // Add this
app.use('/api/v1/meetings', meetingsRoutes_1.default); // Add meetings routes
app.use('/api/v1/users', userRoutes_1.default); // <-- USE USER ROUTES
app.use('/api/v1/agents', agentsRoutes_1.default); // Use agents routes
app.use('/api/v1/news', newsRoutes_1.default); // Use news routes
app.use('/api/v1/tts', ttsRoutes_1.default); // Use TTS proxy route
app.use('/api/v1/calendar-events', calendarEventsRoutes_1.default); // Use calendar event routes
app.use('/api/v1/scheduled-agents', scheduledAgents_1.default); // Use scheduled agents routes
app.use('/api/v1/places', placesRoutes_1.default); // Use places routes
app.use('/api/v1/documents', documentsRoutes_1.default); // Use documents routes
app.use('/api/v1/group-monitor', groupMonitorRoutes_1.default); // Use group monitor routes
app.use('/api/v1/search', searchRoutes_1.default); // Use search routes
app.use('/api/v1/export', exportRoutes_1.default); // Use export routes
app.use('/api/v1/feedback', feedbackRoutes_1.default); // Use feedback routes
app.use('/api/v1/usage', usageRoutes_1.default); // Use usage routes
// **AG-UI Protocol Endpoints**
// Test endpoint to manually emit AG-UI events for debugging
app.get('/api/v1/ag-ui/test-event', (req, res) => {
    try {
        console.log('[AG-UI Test] Manually emitting test event');
        // Emit a test event using proper AG-UI event structure
        aguiEmitter_1.agui.emitEvent({
            type: 'TEXT_MESSAGE_CONTENT',
            timestamp: new Date().toISOString(),
            messageId: 'test-message-' + Date.now(),
            delta: 'This is a test AG-UI event from the backend',
            rawEvent: {
                agentId: 'test-agent',
                source: 'manual-test',
                message: 'Test event successfully triggered',
                timestamp: new Date().toISOString()
            }
        });
        res.json({
            success: true,
            message: 'Test AG-UI event emitted',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('[AG-UI Test] Error emitting test event:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Server-Sent Events endpoint for AG-UI protocol
app.get('/api/v1/ag-ui/events', (req, res) => {
    console.log('[AG-UI SSE] Client connected to events stream');
    // Check if connection was already closed
    if (req.destroyed || res.headersSent) {
        console.log('[AG-UI SSE] Connection already closed');
        return;
    }
    try {
        // Set SSE headers with proper CORS
        const origin = req.headers.origin || 'https://synapse-frontend.onrender.com';
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Headers': 'Cache-Control, Content-Type, Authorization, X-Requested-With, Accept, Origin',
            'Access-Control-Allow-Credentials': 'true',
            'X-Accel-Buffering': 'no', // Disable nginx buffering
            'Content-Encoding': 'identity' // Prevent compression
        });
        // Get user ID from query params or headers
        const userId = req.query.userId || req.headers['x-user-id'];
        const sessionId = req.query.sessionId || req.headers['x-session-id'];
        console.log('[AG-UI SSE] Connection params:', { userId, sessionId, origin });
        // Send initial connection event
        const initialEvent = {
            type: 'CONNECTION_ESTABLISHED',
            timestamp: new Date().toISOString(),
            userId: userId || 'anonymous',
            sessionId: sessionId || 'default'
        };
        res.write(`data: ${JSON.stringify(initialEvent)}\n\n`);
        // Subscribe to AG-UI events
        let subscription = null;
        let heartbeatInterval = null;
        let isAlive = true;
        // Cleanup function - declare before it's used
        const cleanup = () => {
            if (!isAlive)
                return;
            isAlive = false;
            console.log('[AG-UI SSE] Cleaning up connection');
            if (subscription) {
                try {
                    subscription.unsubscribe();
                }
                catch (error) {
                    console.error('[AG-UI SSE] Error unsubscribing:', error);
                }
            }
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
            }
            // Try to close the response if it's still open
            try {
                if (!res.destroyed && !res.headersSent) {
                    res.end();
                }
            }
            catch (error) {
                console.error('[AG-UI SSE] Error closing response:', error);
            }
        };
        // Add connection timeout (30 seconds for initial setup)
        const connectionTimeout = setTimeout(() => {
            console.log('[AG-UI SSE] Initial connection timeout, closing');
            cleanup();
        }, 30000);
        try {
            subscription = aguiEmitter_1.agui.subscribe((event) => {
                if (!isAlive || req.destroyed || res.destroyed) {
                    return;
                }
                try {
                    // Filter events by user/session if specified
                    const eventUserId = event.userId;
                    const eventSessionId = event.sessionId;
                    if (userId && eventUserId && eventUserId !== userId) {
                        return; // Skip events not for this user
                    }
                    if (sessionId && eventSessionId && eventSessionId !== sessionId) {
                        return; // Skip events not for this session
                    }
                    // Send event to client
                    const eventData = `data: ${JSON.stringify(event)}\n\n`;
                    res.write(eventData);
                }
                catch (error) {
                    console.error('[AG-UI SSE] Error sending event:', error);
                    cleanup();
                }
            });
            // Set up heartbeat to keep connection alive (every 30 seconds)
            heartbeatInterval = setInterval(() => {
                if (!isAlive || req.destroyed || res.destroyed) {
                    cleanup();
                    return;
                }
                try {
                    const heartbeat = {
                        type: 'HEARTBEAT',
                        timestamp: new Date().toISOString()
                    };
                    res.write(`data: ${JSON.stringify(heartbeat)}\n\n`);
                }
                catch (error) {
                    console.error('[AG-UI SSE] Heartbeat failed:', error);
                    cleanup();
                }
            }, 30000);
            console.log('[AG-UI SSE] Connection established successfully');
            clearTimeout(connectionTimeout); // Clear initial connection timeout
        }
        catch (subscriptionError) {
            console.error('[AG-UI SSE] Error setting up subscription:', subscriptionError);
            cleanup();
            return;
        }
        // Handle client disconnect
        req.on('close', () => {
            console.log('[AG-UI SSE] Client disconnected from events stream');
            cleanup();
        });
        req.on('error', (error) => {
            console.error('[AG-UI SSE] Request error:', error);
            cleanup();
        });
        res.on('close', () => {
            console.log('[AG-UI SSE] Response closed');
            cleanup();
        });
        res.on('error', (error) => {
            console.error('[AG-UI SSE] Response error:', error);
            cleanup();
        });
        // Set a timeout for long-running connections (10 minutes)
        const timeout = setTimeout(() => {
            console.log('[AG-UI SSE] Connection timeout, closing');
            cleanup();
        }, 10 * 60 * 1000);
        // Clear timeout when connection closes
        res.on('close', () => {
            clearTimeout(timeout);
        });
    }
    catch (error) {
        console.error('[AG-UI SSE] Error setting up SSE endpoint:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'Failed to establish SSE connection',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
});
// Health check endpoint for Render
app.get('/health', (req, res) => {
    try {
        const readyState = mongoose_1.default.connection.readyState;
        let dbStatus = 'Unknown';
        let isHealthy = true;
        // Check database connection status
        switch (readyState) {
            case 0:
                dbStatus = 'Disconnected';
                isHealthy = false;
                break;
            case 1:
                dbStatus = 'Connected';
                break;
            case 2:
                dbStatus = 'Connecting';
                break;
            case 3:
                dbStatus = 'Disconnecting';
                isHealthy = false;
                break;
            default:
                dbStatus = `Unknown state: ${readyState}`;
                isHealthy = false;
        }
        const healthStatus = {
            status: isHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: {
                status: dbStatus,
                readyState: readyState
            },
            memory: process.memoryUsage(),
            version: process.version
        };
        // Return 200 even if degraded to prevent restart loops
        res.status(200).json(healthStatus);
    }
    catch (error) {
        // Even if health check fails, return 200 to prevent restart
        res.status(200).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});
// Basic route for testing
app.get('/', (req, res) => {
    const readyState = mongoose_1.default.connection.readyState;
    let dbStatus = 'Unknown';
    // https://mongoosejs.com/docs/api/connection.html#connection_Connection-readyState
    switch (readyState) {
        case 0:
            dbStatus = 'Disconnected';
            break;
        case 1:
            dbStatus = 'Connected';
            break;
        case 2:
            dbStatus = 'Connecting';
            break;
        case 3:
            dbStatus = 'Disconnecting';
            break;
        default: dbStatus = `Unknown state: ${readyState}`;
    }
    res.send(`Synapse Backend is running! MongoDB (Mongoose) status: ${dbStatus}`);
});
// Socket.IO connection handler with enhanced error handling
io.on('connection', (socket) => {
    console.log(`[Socket.IO]: Client connected: ${socket.id} from ${socket.handshake.address}`);
    // Handle connection errors
    socket.on('connect_error', (error) => {
        console.error(`[Socket.IO]: Connection error for ${socket.id}:`, error);
    });
    // Handle disconnection with reason
    socket.on('disconnect', (reason) => {
        console.log(`[Socket.IO]: Client disconnected: ${socket.id}, reason: ${reason}`);
    });
    // Handle user room joining
    socket.on('join', (room) => {
        socket.join(room);
        console.log(`[Socket.IO]: Client ${socket.id} joined room: ${room}`);
    });
    // **AG-UI Protocol: Handle AG-UI command events from frontend**
    socket.on('ag_ui_cmd', async (commandData) => {
        try {
            console.log(`[Socket.IO AG-UI]: Received command:`, commandData);
            const { command, agentId, userId } = commandData;
            if (!command || !agentId) {
                console.warn('[Socket.IO AG-UI]: Invalid command data');
                return;
            }
            // Get agent service instance from global scope (set during startup)
            const agentService = global.agentService;
            if (!agentService) {
                console.error('[Socket.IO AG-UI]: Agent service not available');
                return;
            }
            let result = null;
            // Execute the command
            switch (command) {
                case 'pause':
                    result = await agentService.pauseAgent(agentId);
                    break;
                case 'resume':
                    result = await agentService.resumeAgent(agentId);
                    break;
                case 'cancel':
                    result = await agentService.cancelAgent(agentId);
                    break;
                case 'restart':
                    result = await agentService.resetAgentStatus(agentId);
                    break;
                default:
                    console.warn(`[Socket.IO AG-UI]: Unknown command: ${command}`);
                    return;
            }
            // Send acknowledgment back to client
            socket.emit('ag_ui_cmd_ack', {
                command,
                agentId,
                success: !!result,
                timestamp: new Date().toISOString()
            });
            console.log(`[Socket.IO AG-UI]: Executed command ${command} for agent ${agentId}`);
        }
        catch (error) {
            console.error('[Socket.IO AG-UI]: Error handling command:', error);
            socket.emit('ag_ui_cmd_ack', {
                command: commandData.command,
                agentId: commandData.agentId,
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
    // Handle client disconnection
    socket.on('disconnect', () => {
        console.log(`[Socket.IO]: Client disconnected: ${socket.id}`);
    });
    // You can add more event listeners for this socket here
    // e.g., socket.on('join_room', (room) => { socket.join(room); });
});
// Global error handlers to prevent server crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, just log the error
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit the process for WhatsApp-related errors
    if (error.message && (error.message.includes('WhatsApp') ||
        error.message.includes('baileys') ||
        error.message.includes('Connection Closed') ||
        error.message.includes('Stream Errored'))) {
        console.log('📱 WhatsApp-related error caught, continuing server operation...');
        return;
    }
    // For other critical errors, exit gracefully
    process.exit(1);
});
const startServer = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        // Debug: Log environment variables for troubleshooting
        console.log('[Server] Environment Variables Check:', {
            NODE_ENV: process.env.NODE_ENV,
            FRONTEND_URL: process.env.FRONTEND_URL,
            CREWAI_SERVICE_URL: process.env.CREWAI_SERVICE_URL
        });
        // Force redeploy with Puppeteer fix - v2
        if (!mongoUri) {
            console.error('FATAL ERROR: MONGODB_URI is not defined.');
            process.exit(1);
        }
        await mongoose_1.default.connect(mongoUri);
        await (0, database_1.connectToDatabase)(); // Calls the Mongoose connection logic
        // Initialize search indexes for optimal search performance
        try {
            await (0, searchIndexes_1.initializeSearchIndexes)();
            console.log('[Server] ✅ Search indexes initialized successfully');
        }
        catch (error) {
            console.error('[Server] ❌ Failed to initialize search indexes:', error);
            // Don't exit - search will still work without optimal indexes
        }
        (0, telegramService_1.initializeTelegramBot)(); // Initialize and start the Telegram bot polling
        // Initialize WAHA service (modern WhatsApp implementation) with retry logic
        console.log('[Server] 🔄 Initializing WAHA service with network retry...');
        let wahaInitialized = false;
        // Try WAHA initialization with retries (network issues on Render.com)
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`[Server] WAHA initialization attempt ${attempt}/3...`);
                const wahaService = wahaService_1.default.getInstance();
                await wahaService.initialize();
                console.log('[Server] ✅ WAHA service initialized successfully');
                wahaInitialized = true;
                break;
            }
            catch (wahaError) {
                console.error(`[Server] ❌ WAHA attempt ${attempt} failed:`, wahaError);
                if (attempt < 3) {
                    console.log(`[Server] Retrying WAHA in ${attempt * 5} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, attempt * 5000)); // 5s, 10s delays
                }
                else {
                    console.log('[Server] ⚠️ WAHA initialization failed after 3 attempts');
                    console.log('[Server] Using Baileys fallback (WAHA will retry in background)');
                }
            }
        }
        // If WAHA failed, set up background retry
        if (!wahaInitialized) {
            console.log('[Server] 🔄 Setting up WAHA background retry (every 30 seconds)...');
            const backgroundRetry = setInterval(async () => {
                try {
                    console.log('[Server] 🔄 Background WAHA retry...');
                    const wahaService = wahaService_1.default.getInstance();
                    await wahaService.initialize();
                    console.log('[Server] ✅ WAHA service connected via background retry!');
                    clearInterval(backgroundRetry);
                }
                catch (error) {
                    console.log('[Server] Background WAHA retry failed, will try again...');
                }
            }, 30000); // Every 30 seconds
            // Stop trying after 10 minutes
            setTimeout(() => {
                clearInterval(backgroundRetry);
                console.log('[Server] Stopped WAHA background retries after 10 minutes');
            }, 600000);
        }
        // Legacy: Initialize WhatsApp Baileys service (fallback - will be removed)
        try {
            const whatsappService = whatsappBaileysService_1.default.getInstance();
            whatsappService.initialize(); // Note: This is async and doesn't wait for actual connection
            console.log('[Server] WhatsApp Baileys service initialization started (LEGACY - will be removed)');
        }
        catch (whatsappError) {
            console.error('[Server] WhatsApp Baileys service failed to start initialization:', whatsappError);
            console.log('[Server] Continuing without legacy WhatsApp service...');
            // Don't crash the server if WhatsApp fails
        }
        // Initialize agent services
        const agentService = new agentService_1.AgentService();
        const agentScheduler = new agentScheduler_1.AgentScheduler(agentService);
        // Register agent executors
        (0, agents_1.registerAgentExecutors)(agentService);
        // Initialize scheduler service with the configured agent service
        schedulerService_1.schedulerService.setAgentService(agentService);
        await schedulerService_1.schedulerService.initializeExistingSchedules();
        console.log('[Server] Scheduler service initialized with AgentService');
        // Initialize agent controller dependencies
        (0, agentsController_1.initializeAgentServices)(agentService, agentScheduler);
        // Start the agent scheduler
        await agentScheduler.start();
        console.log('[Server] Agent scheduler started successfully');
        // Initialize task reminder scheduler
        (0, taskReminderService_1.initializeTaskReminderScheduler)();
        console.log('[Server] Task reminder scheduler initialized');
        // Make io available globally for real-time updates
        global.io = io;
        // Make agent service available globally for AG-UI commands
        global.agentService = agentService;
        // **AG-UI Protocol: Bridge AG-UI events to Socket.IO**
        aguiEmitter_1.agui.subscribe((event) => {
            try {
                // Emit AG-UI events to all connected Socket.IO clients
                const eventUserId = event.userId;
                const eventSessionId = event.sessionId;
                if (eventUserId) {
                    // Send to specific user
                    io.to(`user_${eventUserId}`).emit('ag_ui_event', event);
                }
                else if (eventSessionId) {
                    // Send to specific session
                    io.to(`session_${eventSessionId}`).emit('ag_ui_event', event);
                }
                else {
                    // Broadcast to all connected clients
                    io.emit('ag_ui_event', event);
                }
                console.log(`[AG-UI Bridge] Bridged event ${event.type} via Socket.IO`);
            }
            catch (error) {
                console.error('[AG-UI Bridge] Error bridging event to Socket.IO:', error);
            }
        });
        console.log('[AG-UI] Protocol initialized and bridged to Socket.IO');
        httpServer.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server is running on port ${PORT}`);
            console.log(`🌐 Server is binding to 0.0.0.0:${PORT}`);
            console.log(`📦 Environment PORT: ${process.env.PORT || 'not set'}`);
            console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
            console.log(`✅ Health check available at: http://0.0.0.0:${PORT}/health`);
            console.log(`🎯 RENDER DEPLOYMENT READY - Service is accessible!`);
            // The "[mongoose]: Mongoose connected to DB" log from database.ts confirms success
        });
    }
    catch (error) {
        console.error('[server]: Failed to start server or connect to database', error);
        process.exit(1);
    }
};
startServer();
exports.default = app; // Optional: export app for testing purposes
