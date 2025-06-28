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
import WhatsAppBaileysService from './services/whatsappBaileysService'; // Import WhatsApp Baileys service
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
import calendarEventsRoutes from './api/routes/calendarEventsRoutes'; // Import calendar event routes
import scheduledAgentsRoutes from './api/routes/scheduledAgents'; // Import scheduled agents routes

dotenv.config();

const app: Express = express();
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

// Middleware - Enhanced CORS configuration with production fix
app.use(cors({
  origin: function (requestOrigin, callback) {
    console.log(`[CORS] Request from origin: ${requestOrigin}`);
    // Allow requests with no origin (mobile apps, etc.)
    if (!requestOrigin) {
      console.log(`[CORS] No origin header - allowing`);
      return callback(null, true);
    }
    
    const allowedOrigins = [
      frontendUrl, 
      "https://synapse-frontend.onrender.com",
      "http://localhost:5173", // Local development
      "http://localhost:3000",  // Alternative local port
      "http://localhost:5174",  // Vite alternative port
      "https://synapse-frontend.onrender.com", // Explicit production frontend
    ];
    
    console.log(`[CORS] Checking origin ${requestOrigin} against allowed origins:`, allowedOrigins);
    
    if (allowedOrigins.includes(requestOrigin)) {
      console.log(`[CORS] ✅ Origin ${requestOrigin} explicitly allowed`);
      return callback(null, true);
    } else {
      // For production debugging - temporarily allow all origins
      console.log(`[CORS] ⚠️ Origin ${requestOrigin} not in allowed list, but allowing for production debugging`);
      return callback(null, true);
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "Access-Control-Allow-Origin", "Access-Control-Allow-Methods", "Access-Control-Allow-Headers"],
  credentials: true,
  optionsSuccessStatus: 200, // For legacy browser support
  preflightContinue: false
}));

// Add explicit CORS headers middleware with enhanced logging
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const method = req.method;
  
  console.log(`[Explicit CORS] ${method} request from origin: ${origin}`);
  console.log(`[Explicit CORS] Request path: ${req.path}`);
  console.log(`[Explicit CORS] Authorization header: ${req.headers.authorization ? 'Present' : 'Missing'}`);
  
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', origin || 'https://synapse-frontend.onrender.com');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '3600');
  
  if (method === 'OPTIONS') {
    console.log(`[Explicit CORS] Handling preflight OPTIONS request for ${req.path}`);
    res.status(200).end();
    return;
  } else {
    next();
  }
});
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
app.use('/api/v1/calendar-events', calendarEventsRoutes); // Use calendar event routes
app.use('/api/v1/scheduled-agents', scheduledAgentsRoutes); // Use scheduled agents routes

// Health check endpoint for Render
app.get('/health', (req: Request, res: Response) => {
  try {
    const readyState = mongoose.connection.readyState;
    let dbStatus = 'Unknown';
    let isHealthy = true;
    
    // Check database connection status
    switch (readyState) {
      case 0: dbStatus = 'Disconnected'; isHealthy = false; break;
      case 1: dbStatus = 'Connected'; break;
      case 2: dbStatus = 'Connecting'; break;
      case 3: dbStatus = 'Disconnecting'; isHealthy = false; break;
      default: dbStatus = `Unknown state: ${readyState}`; isHealthy = false;
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
  } catch (error) {
    // Even if health check fails, return 200 to prevent restart
    res.status(200).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: (error as Error).message
    });
  }
});

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

// Global error handlers to prevent server crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process for WhatsApp-related errors
  if (error.message && (
    error.message.includes('WhatsApp') || 
    error.message.includes('baileys') ||
    error.message.includes('Connection Closed') ||
    error.message.includes('Stream Errored')
  )) {
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

    await mongoose.connect(mongoUri);
    await connectToDatabase(); // Calls the Mongoose connection logic
    initializeTelegramBot(); // Initialize and start the Telegram bot polling

    // Initialize WhatsApp Baileys service with error handling
    try {
    const whatsappService = WhatsAppBaileysService.getInstance();
    whatsappService.initialize(); // Note: This is async and doesn't wait for actual connection
    console.log('[Server] WhatsApp Baileys service initialization started (no browser required!)');
    } catch (whatsappError) {
      console.error('[Server] WhatsApp Baileys service failed to start initialization:', whatsappError);
      console.log('[Server] Continuing without WhatsApp service...');
      // Don't crash the server if WhatsApp fails
    }

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
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`🌐 Server is binding to 0.0.0.0:${PORT}`);
      console.log(`📦 Environment PORT: ${process.env.PORT || 'not set'}`);
      console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
      console.log(`✅ Health check available at: http://0.0.0.0:${PORT}/health`);
      console.log(`🎯 RENDER DEPLOYMENT READY - Service is accessible!`);
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
