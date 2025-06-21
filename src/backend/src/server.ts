import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose'; // Import mongoose to check connection state
import http from 'http'; // Import http module
import { Server as SocketIOServer } from 'socket.io'; // Import Server from socket.io
import whatsappRoutes from './api/routes/whatsappRoutes'; // Import WhatsApp routes
import { connectToDatabase } from './config/database'; // Import database connection
import authRoutes from './api/routes/authRoutes'; // Import auth routes
import { initializeTelegramBot } from './services/telegramService'; // Import Telegram Bot initializer
import { AgentService } from './services/agentService'; // Import agent service
import { AgentScheduler } from './services/agentScheduler'; // Import agent scheduler
import { initializeAgentServices } from './api/controllers/agentsController'; // Import agent services initializer
import { registerAgentExecutors } from './services/agents'; // Import agent executors registry
import WhatsAppService from './services/whatsappService'; // Import WhatsApp service
import captureRoutes from './api/routes/captureRoutes'; // Import capture routes
import path from 'path'; // <-- Import path module
import fs from 'fs'; // <-- Import fs module
import bookmarkRoutes from './api/routes/bookmarksRoutes'; // Import bookmark routes
import videoRoutes from './api/routes/videosRoutes'; // Added video routes
import tasksRoutes from './api/routes/tasksRoutes'; // Add this
import notesRoutes from './api/routes/notesRoutes'; // Add this
import ideasRoutes from './api/routes/ideasRoutes'; // Add this
import meetingsRoutes from './api/routes/meetingsRoutes'; // Add meetings routes
import userRoutes from './api/routes/userRoutes'; // <-- IMPORT USER ROUTES
import mediaRoutes from './api/routes/media'; // Import media routes
import agentsRoutes from './api/routes/agentsRoutes'; // Import agents routes
import newsRoutes from './api/routes/newsRoutes'; // Import news routes
import ttsRoutes from './api/routes/ttsRoutes'; // Import text-to-speech routes

dotenv.config();

const app: Express = express();
const rawPort = process.env.PORT || '3001'; // Read as string
const PORT = parseInt(rawPort, 10); // Convert to number

// Define Frontend URL from environment variable or default to localhost
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
console.log(`[CORS Setup] Allowed origin for Express CORS: ${frontendUrl}`); // Log the origin being used

// Create HTTP server and pass it to Socket.IO
const httpServer = http.createServer(app);

// Define allowed origins for Socket.IO
const allowedSocketOrigins = [
  frontendUrl, // From environment variable
  "https://synapse-frontend.onrender.com" // Explicitly add production URL
];
// For development, you might also want to add your local dev URL if it's different
// e.g., if frontendUrl is for production, add "http://localhost:5173" here for local testing

console.log(`[Socket.IO CORS Setup] Allowed origins for Socket.IO: ${allowedSocketOrigins.join(', ')}`);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: function (requestOrigin, callback) {
      // Log the origin for every connection attempt
      console.log(`[Socket.IO CORS] Request origin: ${requestOrigin}`);
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!requestOrigin) {
        console.log('[Socket.IO CORS] Allowing request with no origin.');
        return callback(null, true);
      }
      
      // Enhanced allowed origins for Socket.IO
      const socketAllowedOrigins = [
        frontendUrl, 
        "https://synapse-frontend.onrender.com",
        "http://localhost:5173",
        "http://localhost:3000"
      ];
      
      if (socketAllowedOrigins.includes(requestOrigin)) {
        console.log(`[Socket.IO CORS] Origin ${requestOrigin} is allowed.`);
        return callback(null, true);
      } else {
        console.error(`[Socket.IO CORS] Origin ${requestOrigin} is NOT allowed.`);
        // Temporarily allow all for debugging
        console.log('[Socket.IO CORS] Allowing anyway for debugging');
        return callback(null, true);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }
});

// Middleware - Enhanced CORS configuration
app.use(cors({
  origin: function (requestOrigin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!requestOrigin) return callback(null, true);
    
    const allowedOrigins = [
      frontendUrl, 
      "https://synapse-frontend.onrender.com",
      "http://localhost:5173", // Local development
      "http://localhost:3000"  // Alternative local port
    ];
    
    if (allowedOrigins.includes(requestOrigin)) {
      return callback(null, true);
    } else {
      console.log(`[CORS] Blocked origin: ${requestOrigin}`);
      return callback(null, true); // Allow all for now to debug
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser support
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global request logger for API v1 routes
app.use('/api/v1', (req: Request, res: Response, next: NextFunction) => {
  console.log(`[API Logger] Path: ${req.path}, Method: ${req.method}`);
  console.log('[API Logger] Authorization Header:', req.headers.authorization ? 'Present' : 'Absent');
  if (req.headers.authorization) {
    // Log only the first few characters of the token for brevity and security
    const authHeaderParts = req.headers.authorization.split(' ');
    if (authHeaderParts.length === 2 && authHeaderParts[0].toLowerCase() === 'bearer') {
      console.log('[API Logger] Auth Header Value (Bearer Token Type):', authHeaderParts[1].substring(0, 20) + '...');
    } else {
      console.log('[API Logger] Auth Header Value (Other Type):', req.headers.authorization.substring(0, 20) + '...');
    }
  } else {
    console.log('[API Logger] No Authorization Header found.');
  }
  next();
});

// Create public directories if they don't exist
const publicDir = path.join(__dirname, '..', 'public'); // Assuming public is one level up from src, adjust if necessary
const uploadsDir = path.join(publicDir, 'uploads');
const telegramMediaDir = path.join(uploadsDir, 'telegram_media');

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(telegramMediaDir)) fs.mkdirSync(telegramMediaDir);

console.log(`[Static Files] Serving static files from /public mapped to physical directory: ${publicDir}`); // ADDED THIS LINE

// Serve static files from the 'public' directory
app.use('/public', express.static(publicDir)); // Serve files under /public URL path

// API Routes
app.use('/api/v1/whatsapp', whatsappRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/capture', captureRoutes); // Use capture routes
app.use('/api/v1/bookmarks', bookmarkRoutes); // Use bookmark routes
app.use('/api/v1/videos', videoRoutes); // Use video routes
app.use('/api/v1/media', mediaRoutes); // Use media routes
app.use('/api/v1/tasks', tasksRoutes); // Add this
app.use('/api/v1/notes', notesRoutes); // Add this
app.use('/api/v1/ideas', ideasRoutes); // Add this
app.use('/api/v1/meetings', meetingsRoutes); // Add meetings routes
app.use('/api/v1/users', userRoutes); // <-- USE USER ROUTES
app.use('/api/v1/agents', agentsRoutes); // Use agents routes
app.use('/api/v1/news', newsRoutes); // Use news routes
app.use('/api/v1/tts', ttsRoutes); // Use TTS proxy route

// Basic route for testing
app.get('/', (req: Request, res: Response) => {
  const readyState = mongoose.connection.readyState;
  let dbStatus = 'Unknown';
  // https://mongoosejs.com/docs/api/connection.html#connection_Connection-readyState
  switch (readyState) {
    case 0: dbStatus = 'Disconnected'; break;
    case 1: dbStatus = 'Connected'; break;
    case 2: dbStatus = 'Connecting'; break;
    case 3: dbStatus = 'Disconnecting'; break;
    default: dbStatus = `Unknown state: ${readyState}`;
  }
  res.send(`Synapse Backend is running! MongoDB (Mongoose) status: ${dbStatus}`);
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`[Socket.IO]: Client connected: ${socket.id}`);

  // Handle user room joining
  socket.on('join', (room: string) => {
    socket.join(room);
    console.log(`[Socket.IO]: Client ${socket.id} joined room: ${room}`);
  });

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
    
    // Debug: Log environment variables for troubleshooting
    console.log('[Server] Environment Variables Check:', {
      NODE_ENV: process.env.NODE_ENV,
      FRONTEND_URL: process.env.FRONTEND_URL,
      CREWAI_SERVICE_URL: process.env.CREWAI_SERVICE_URL
    });

    if (!mongoUri) {
      console.error('FATAL ERROR: MONGODB_URI is not defined.');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    await connectToDatabase(); // Calls the Mongoose connection logic
    initializeTelegramBot(); // Initialize and start the Telegram bot polling

    // Initialize WhatsApp service
    const whatsappService = WhatsAppService.getInstance();
    await whatsappService.initialize();
    console.log('[Server] WhatsApp service initialized successfully');

    // Initialize agent services
    const agentService = new AgentService();
    const agentScheduler = new AgentScheduler(agentService);
    
    // Register agent executors
    registerAgentExecutors(agentService);
    
    // Initialize agent controller dependencies
    initializeAgentServices(agentService, agentScheduler);
    
    // Start the agent scheduler
    await agentScheduler.start();
    console.log('[Server] Agent scheduler started successfully');

    // Make io available globally for real-time updates
    (global as any).io = io;

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
      // The "[mongoose]: Mongoose connected to DB" log from database.ts confirms success
    });
  } catch (error) {
    console.error('[server]: Failed to start server or connect to database', error);
    process.exit(1);
  }
};

startServer();

// Export io instance so it can be used in other modules (e.g., telegramService)
export { io };

export default app; // Optional: export app for testing purposes
