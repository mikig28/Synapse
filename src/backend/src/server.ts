import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose'; // Import mongoose to check connection state
import http from 'http'; // Import http module
import { Server as SocketIOServer } from 'socket.io'; // Import Server from socket.io
import whatsappRoutes from './api/routes/whatsappRoutes'; // Import WhatsApp routes (legacy)
import wahaRoutes from './api/routes/wahaRoutes'; // Import WAHA routes (modern)
import whatsappUnifiedRoutes from './api/routes/whatsappUnifiedRoutes'; // Import WhatsApp Unified routes (complete)
import { connectToDatabase } from './config/database'; // Import database connection
import authRoutes from './api/routes/authRoutes'; // Import auth routes
import { initializeTelegramService } from './services/telegramServiceNew'; // Import new multi-user Telegram service
import { telegramBotManager } from './services/telegramBotManager'; // Import telegram bot manager
import { AgentService } from './services/agentService'; // Import agent service
import { AgentScheduler } from './services/agentScheduler'; // Import agent scheduler
import { initializeAgentServices } from './api/controllers/agentsController'; // Import agent services initializer
import { registerAgentExecutors } from './services/agents'; // Import agent executors registry
import WhatsAppBaileysService from './services/whatsappBaileysService'; // Import WhatsApp Baileys service (legacy)
import WAHAService from './services/wahaService'; // Import WAHA service (modern)
import WhatsAppUnifiedService from './services/whatsappUnifiedService'; // Import WhatsApp Unified service (complete)
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
import placesRoutes from './api/routes/placesRoutes'; // Import places routes
import documentsRoutes from './api/routes/documentsRoutes'; // Import documents routes
import groupMonitorRoutes from './api/routes/groupMonitorRoutes'; // Import group monitor routes
import searchRoutes from './api/routes/searchRoutes'; // Import search routes
import exportRoutes from './api/routes/exportRoutes'; // Import export routes
import feedbackRoutes from './api/routes/feedbackRoutes'; // Import feedback routes
import usageRoutes from './api/routes/usageRoutes'; // Import usage routes
import telegramChannelRoutes from './api/routes/telegramChannelRoutes'; // Import telegram channel routes
import whatsappImagesRoutes from './api/routes/whatsappImagesRoutes'; // Import WhatsApp images routes
import whatsappSummaryRoutes from './api/routes/whatsappSummaryRoutes'; // Import WhatsApp summary routes
import { generateTodaySummary } from './api/controllers/whatsappSummaryController'; // Direct import for WhatsApp summary endpoint
import { authMiddleware } from './api/middleware/authMiddleware'; // Import auth middleware
import { initializeTaskReminderScheduler } from './services/taskReminderService'; // Import task reminder service
import { schedulerService } from './services/schedulerService'; // Import scheduler service
import { agui } from './services/aguiEmitter'; // Import AG-UI emitter
import { createAgentCommandEvent } from './services/aguiMapper'; // Import AG-UI mapper
import { initializeSearchIndexes } from './config/searchIndexes'; // Import search indexes initializer
import { trackApiUsage } from './middleware/usageTracking'; // Import usage tracking middleware
import './services/searchIndexingService'; // Import to initialize search indexing hooks

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

// Set server timeout to 2 minutes (120 seconds) for long-running operations
httpServer.timeout = 120000; // 2 minutes
httpServer.keepAliveTimeout = 65000; // 65 seconds (should be less than timeout)
httpServer.headersTimeout = 66000; // 66 seconds (should be slightly higher than keepAliveTimeout)

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

// Middleware - Simplified CORS to avoid preflight failures on Render
app.use(cors({
  origin: true,
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Usage tracking middleware (should be after auth but before routes)
app.use(trackApiUsage);

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

// API Routes - WhatsApp (Unified as primary, WAHA as fallback)
app.use('/api/v1/whatsapp-unified', whatsappUnifiedRoutes); // NEW: Unified WhatsApp Web functionality
app.use('/api/v1/whatsapp', wahaRoutes); // WAHA routes for monitoring/fallback
app.use('/api/v1/whatsapp-legacy', whatsappRoutes); // Legacy Baileys routes (fallback)
app.use('/api/v1/waha', wahaRoutes); // Keep WAHA routes for direct access
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
app.use('/api/v1/places', placesRoutes); // Use places routes
app.use('/api/v1/documents', documentsRoutes); // Use documents routes
app.use('/api/v1/group-monitor', groupMonitorRoutes); // Use group monitor routes
app.use('/api/v1/search', searchRoutes); // Use search routes
app.use('/api/v1/export', exportRoutes); // Use export routes
app.use('/api/v1/feedback', feedbackRoutes); // Use feedback routes
app.use('/api/v1/usage', usageRoutes); // Use usage routes
app.use('/api/v1/telegram-channels', telegramChannelRoutes); // Use telegram channels routes
app.use('/api/v1/whatsapp/images', whatsappImagesRoutes); // Use WhatsApp images extraction routes

// TEMPORARY: Simple test endpoint (no auth required) - BEFORE routes
app.get('/api/v1/whatsapp-summary/test', (req: Request, res: Response) => {
  console.log('[Server] Test endpoint hit successfully');
  res.json({ success: true, message: 'WhatsApp summary service is running', timestamp: new Date().toISOString() });
});

// REAL WhatsApp Summary Generation Route (no auth for testing) - BEFORE routes
app.post('/api/v1/whatsapp-summary/generate-today-noauth', async (req: Request, res: Response) => {
  try {
    console.log('[WhatsApp Summary] Real implementation called with body:', req.body);
    const { groupId, timezone = 'UTC' } = req.body;

    if (!groupId) {
      console.log('[WhatsApp Summary] Error: No groupId provided');
      return res.status(400).json({
        success: false,
        error: 'Group ID is required'
      });
    }

    // Use today's date
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    console.log(`[WhatsApp Summary] Generating summary for group ${groupId} on date ${today}`);

    // Create a mock request object with the required body
    const mockReq = {
      body: { groupId, date: today, timezone }
    } as Request;

    // Call the real controller function
    await generateTodaySummary(mockReq, res);

  } catch (error) {
    console.error('[WhatsApp Summary] Real implementation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate WhatsApp summary: ' + (error as Error).message
    });
  }
});
console.log('[Server] WhatsApp no-auth summary route loaded successfully');

// Direct route for WhatsApp summary generation (primary endpoint)
app.post('/api/v1/whatsapp-summary/generate-today-direct', authMiddleware, generateTodaySummary);
console.log('[Server] WhatsApp summary direct route loaded successfully');

console.log('[Server] Loading WhatsApp summary routes...');
app.use('/api/v1/whatsapp-summary', whatsappSummaryRoutes); // Use WhatsApp summary routes
console.log('[Server] WhatsApp summary routes loaded successfully');

// **AG-UI Protocol Endpoints**

// Test endpoint to manually emit AG-UI events for debugging
app.get('/api/v1/ag-ui/test-event', (req: Request, res: Response) => {
  try {
    console.log('[AG-UI Test] Manually emitting test event');

    // Emit a test event using proper AG-UI event structure
    agui.emitEvent({
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
  } catch (error) {
    console.error('[AG-UI Test] Error emitting test event:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Server-Sent Events endpoint for AG-UI protocol
app.get('/api/v1/ag-ui/events', (req: Request, res: Response) => {
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
    const userId = req.query.userId as string || req.headers['x-user-id'] as string;
    const sessionId = req.query.sessionId as string || req.headers['x-session-id'] as string;

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
    let subscription: any = null;
    let heartbeatInterval: NodeJS.Timeout | null = null;
    let isAlive = true;

    // Cleanup function - declare before it's used
    const cleanup = () => {
      if (!isAlive) return;
      isAlive = false;

      console.log('[AG-UI SSE] Cleaning up connection');

      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
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
      } catch (error) {
        console.error('[AG-UI SSE] Error closing response:', error);
      }
    };

    // Add connection timeout (30 seconds for initial setup)
    const connectionTimeout = setTimeout(() => {
      console.log('[AG-UI SSE] Initial connection timeout, closing');
      cleanup();
    }, 30000);

    try {
      subscription = agui.subscribe((event) => {
        if (!isAlive || req.destroyed || res.destroyed) {
          return;
        }

        try {
          // Filter events by user/session if specified
          const eventUserId = (event as any).userId;
          const eventSessionId = (event as any).sessionId;

          if (userId && eventUserId && eventUserId !== userId) {
            return; // Skip events not for this user
          }

          if (sessionId && eventSessionId && eventSessionId !== sessionId) {
            return; // Skip events not for this session
          }

          // Send event to client
          const eventData = `data: ${JSON.stringify(event)}\n\n`;
          res.write(eventData);
        } catch (error) {
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
        } catch (error) {
          console.error('[AG-UI SSE] Heartbeat failed:', error);
          cleanup();
        }
      }, 30000);

      console.log('[AG-UI SSE] Connection established successfully');
      clearTimeout(connectionTimeout); // Clear initial connection timeout

    } catch (subscriptionError) {
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

  } catch (error) {
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
  socket.on('join', (room: string) => {
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
      const agentService = (global as any).agentService;

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
    } catch (error) {
      console.error('[Socket.IO AG-UI]: Error handling command:', error);
      socket.emit('ag_ui_cmd_ack', {
        command: commandData.command,
        agentId: commandData.agentId,
        success: false,
        error: (error as Error).message,
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

    // Make io available globally for real-time updates
    (global as any).io = io;

    // **AG-UI Protocol: Bridge AG-UI events to Socket.IO**
    agui.subscribe((event) => {
      try {
        // Emit AG-UI events to all connected Socket.IO clients
        const eventUserId = (event as any).userId;
        const eventSessionId = (event as any).sessionId;

        if (eventUserId) {
          // Send to specific user
          io.to(`user_${eventUserId}`).emit('ag_ui_event', event);
        } else if (eventSessionId) {
          // Send to specific session
          io.to(`session_${eventSessionId}`).emit('ag_ui_event', event);
        } else {
          // Broadcast to all connected clients
          io.emit('ag_ui_event', event);
        }

        console.log(`[AG-UI Bridge] Bridged event ${event.type} via Socket.IO`);
      } catch (error) {
        console.error('[AG-UI Bridge] Error bridging event to Socket.IO:', error);
      }
    });

    console.log('[AG-UI] Protocol initialized and bridged to Socket.IO');

    // Start HTTP server immediately for Render port detection
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`🌐 Server is binding to 0.0.0.0:${PORT}`);
      console.log(`📦 Environment PORT: ${process.env.PORT || 'not set'}`);
      console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
      console.log(`✅ Health check available at: http://0.0.0.0:${PORT}/health`);
      console.log(`🎯 RENDER DEPLOYMENT READY - Service is accessible!`);
      
      // Initialize other services asynchronously in background to prevent deployment timeout
      initializeServicesInBackground();
    });
  } catch (error) {
    console.error('[server]: Failed to start server or connect to database', error);
    process.exit(1);
  }
};

// Initialize all other services asynchronously after server is running
const initializeServicesInBackground = async () => {
  console.log('[Server] 🔄 Starting background service initialization...');
  
  try {
    // Initialize search indexes for optimal search performance
    try {
      await initializeSearchIndexes();
      console.log('[Server] ✅ Search indexes initialized successfully');
    } catch (error) {
      console.error('[Server] ❌ Failed to initialize search indexes:', error);
      // Don't exit - search will still work without optimal indexes
    }

    await initializeTelegramService(); // Initialize multi-user Telegram service
    
    // Initialize existing bot configurations for users
    try {
      console.log('[Server] 🤖 Initializing existing Telegram bots...');
      await telegramBotManager.initializeExistingBots();
      console.log('[Server] ✅ Existing Telegram bots initialized successfully');
    } catch (error) {
      console.error('[Server] ❌ Failed to initialize existing Telegram bots:', error);
      // Don't exit - bots can be configured individually later
    }

    // Initialize WAHA service (modern WhatsApp implementation) with retry logic
    console.log('[Server] 🔄 Initializing WAHA service with network retry...');
    let wahaInitialized = false;

    // Try WAHA initialization with retries (network issues on Render.com)
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Server] WAHA initialization attempt ${attempt}/3...`);
        const wahaService = WAHAService.getInstance();
        await wahaService.initialize();
        console.log('[Server] ✅ WAHA service initialized successfully');
        
        // Initialize WhatsApp Unified Service after WAHA is ready
        try {
          console.log('[Server] 🚀 Initializing WhatsApp Unified service...');
          const unifiedService = WhatsAppUnifiedService.getInstance();
          await unifiedService.initialize();
          console.log('[Server] ✅ WhatsApp Unified service initialized successfully (full WhatsApp Web functionality available)');
        } catch (unifiedError) {
          console.warn('[Server] ⚠️ WhatsApp Unified service failed to initialize:', unifiedError);
          console.log('[Server] Continuing with WAHA-only functionality...');
        }
        
        wahaInitialized = true;
        break;
      } catch (wahaError) {
        console.error(`[Server] ❌ WAHA attempt ${attempt} failed:`, wahaError);
        if (attempt < 3) {
          console.log(`[Server] Retrying WAHA in ${attempt * 5} seconds...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 5000)); // 5s, 10s delays
        } else {
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
          const wahaService = WAHAService.getInstance();
          await wahaService.initialize();
          console.log('[Server] ✅ WAHA service connected via background retry!');
          
          // Initialize unified service after background WAHA success
          try {
            const unifiedService = WhatsAppUnifiedService.getInstance();
            await unifiedService.initialize();
            console.log('[Server] ✅ WhatsApp Unified service initialized via background retry!');
          } catch (unifiedError) {
            console.warn('[Server] ⚠️ WhatsApp Unified service failed in background retry:', unifiedError);
          }
          
          clearInterval(backgroundRetry);
        } catch (error) {
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
    const whatsappService = WhatsAppBaileysService.getInstance();
    whatsappService.initialize(); // Note: This is async and doesn't wait for actual connection
    console.log('[Server] WhatsApp Baileys service initialization started (LEGACY - will be removed)');
    } catch (whatsappError) {
      console.error('[Server] WhatsApp Baileys service failed to start initialization:', whatsappError);
      console.log('[Server] Continuing without legacy WhatsApp service...');
      // Don't crash the server if WhatsApp fails
    }

    // Initialize agent services
    const agentService = new AgentService();
    const agentScheduler = new AgentScheduler(agentService);

    // Register agent executors
    registerAgentExecutors(agentService);

    // Initialize scheduler service with the configured agent service
    schedulerService.setAgentService(agentService);
    await schedulerService.initializeExistingSchedules();
    console.log('[Server] Scheduler service initialized with AgentService');

    // Initialize agent controller dependencies
    initializeAgentServices(agentService, agentScheduler);

    // Start the agent scheduler
    await agentScheduler.start();
    console.log('[Server] Agent scheduler started successfully');

    // Initialize task reminder scheduler
    initializeTaskReminderScheduler();
    console.log('[Server] Task reminder scheduler initialized');

    // Make agent service available globally for AG-UI commands
    (global as any).agentService = agentService;

    console.log('[Server] ✅ All background services initialized successfully');
  } catch (error) {
    console.error('[Server] ❌ Background service initialization failed:', error);
    // Don't crash the server - let it continue with basic functionality
  }
};

startServer();

// Export io instance so it can be used in other modules (e.g., telegramService)
export { io };

export default app; // Optional: export app for testing purposes
