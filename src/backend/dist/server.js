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
const captureRoutes_1 = __importDefault(require("./api/routes/captureRoutes")); // Import capture routes
const path_1 = __importDefault(require("path")); // <-- Import path module
const fs_1 = __importDefault(require("fs")); // <-- Import fs module
const bookmarksRoutes_1 = __importDefault(require("./api/routes/bookmarksRoutes")); // Import bookmark routes
const videosRoutes_1 = __importDefault(require("./api/routes/videosRoutes")); // Added video routes
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Create HTTP server and pass it to Socket.IO
const httpServer = http_1.default.createServer(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "http://localhost:5173", // Frontend URL, adjust if different
        methods: ["GET", "POST"]
    }
});
exports.io = io;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
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
// Serve static files from the 'public' directory
app.use('/public', express_1.default.static(publicDir)); // Serve files under /public URL path
// API Routes
app.use('/api/v1/whatsapp', whatsappRoutes_1.default);
app.use('/api/v1/auth', authRoutes_1.default);
app.use('/api/v1/capture', captureRoutes_1.default); // Use capture routes
app.use('/api/v1/bookmarks', bookmarksRoutes_1.default); // Use bookmark routes
app.use('/api/v1/videos', videosRoutes_1.default); // Use video routes
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
        await (0, database_1.connectToDatabase)(); // Calls the Mongoose connection logic
        (0, telegramService_1.initializeTelegramBot)(); // Initialize and start the Telegram bot polling
        httpServer.listen(PORT, () => {
            console.log(`[server]: Backend server is running (HTTP & WebSocket) at http://localhost:${PORT}`);
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
