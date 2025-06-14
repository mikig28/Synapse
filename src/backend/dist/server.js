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
const whatsappRoutes_1 = __importDefault(require("./api/routes/whatsappRoutes")); // Import WhatsApp routes
const database_1 = require("./config/database"); // Import database connection
const authRoutes_1 = __importDefault(require("./api/routes/authRoutes")); // Import auth routes
const telegramService_1 = require("./services/telegramService"); // Import Telegram Bot initializer
const agentService_1 = require("./services/agentService"); // Import agent service
const agentScheduler_1 = require("./services/agentScheduler"); // Import agent scheduler
const agentsController_1 = require("./api/controllers/agentsController"); // Import agent services initializer
const agents_1 = require("./services/agents"); // Import agent executors registry
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
dotenv_1.default.config();
const app = (0, express_1.default)();
const rawPort = process.env.PORT || '3001'; // Read as string
const PORT = parseInt(rawPort, 10); // Convert to number
// Define Frontend URL from environment variable or default to localhost
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
console.log(`[CORS Setup] Allowed origin for Express CORS: ${frontendUrl}`); // Log the origin being used
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
        origin: function (requestOrigin, callback) {
            // Log the origin for every connection attempt
            console.log(`[Socket.IO CORS] Request origin: ${requestOrigin}`);
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!requestOrigin) {
                console.log('[Socket.IO CORS] Allowing request with no origin.');
                return callback(null, true);
            }
            if (allowedSocketOrigins.includes(requestOrigin)) {
                console.log(`[Socket.IO CORS] Origin ${requestOrigin} is allowed.`);
                return callback(null, true);
            }
            else {
                console.error(`[Socket.IO CORS] Origin ${requestOrigin} is NOT allowed.`);
                return callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});
exports.io = io;
// Middleware
app.use((0, cors_1.default)({
    origin: [frontendUrl, "https://synapse-frontend.onrender.com"], // MODIFIED - Added your specific production frontend URL
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // MODIFIED - Added OPTIONS for preflight requests
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"], // Added more headers
    credentials: true // Allow credentials (cookies, authorization headers, etc.)
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
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
// API Routes
app.use('/api/v1/whatsapp', whatsappRoutes_1.default);
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
// Socket.IO connection handler
io.on('connection', (socket) => {
    console.log(`[Socket.IO]: Client connected: ${socket.id}`);
    // Handle client disconnection
    socket.on('disconnect', () => {
        console.log(`[Socket.IO]: Client disconnected: ${socket.id}`);
    });
    // You can add more event listeners for this socket here
    // e.g., socket.on('join_room', (room) => { socket.join(room); });
});
const startServer = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error('FATAL ERROR: MONGODB_URI is not defined.');
            process.exit(1);
        }
        await mongoose_1.default.connect(mongoUri);
        await (0, database_1.connectToDatabase)(); // Calls the Mongoose connection logic
        (0, telegramService_1.initializeTelegramBot)(); // Initialize and start the Telegram bot polling
        // Initialize agent services
        const agentService = new agentService_1.AgentService();
        const agentScheduler = new agentScheduler_1.AgentScheduler(agentService);
        // Register agent executors
        (0, agents_1.registerAgentExecutors)(agentService);
        // Initialize agent controller dependencies
        (0, agentsController_1.initializeAgentServices)(agentService, agentScheduler);
        // Start the agent scheduler
        await agentScheduler.start();
        console.log('[Server] Agent scheduler started successfully');
        httpServer.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on port ${PORT}`);
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
