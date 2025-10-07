import express, { Express, Request, Response, NextFunction } from 'express';
import compression from 'compression';
import { config as envConfig } from './config/env'; // Validate env vars FIRST
import logger from './config/logger'; // Production logger
import cors from 'cors';
import mongoose from 'mongoose'; // Import mongoose to check connection state
import http from 'http'; // Import http module
import { Server as SocketIOServer } from 'socket.io'; // Import Server from socket.io
import { createAdapter } from '@socket.io/redis-adapter'; // Redis adapter for horizontal scaling
import { createRedisClient, testRedisConnection } from './config/redis'; // Redis client
import requestIdMiddleware from './middleware/requestId'; // Request correlation
import rateLimiters from './middleware/rateLimiter'; // Rate limiting
import whatsappRoutes from './api/routes/whatsappRoutes'; // Import WhatsApp routes (legacy)
import wahaRoutes from './api/routes/wahaRoutes'; // Import WAHA routes (modern)
import whatsappGridFSRoutes from './api/routes/whatsappGridFSRoutes'; // Import WhatsApp GridFS routes
import { connectToDatabase } from './config/database'; // Import database connection
import authRoutes from './api/routes/authRoutes'; // Import auth routes
import { initializeTelegramService } from './services/telegramServiceNew'; // Import new multi-user Telegram service
import { telegramBotManager } from './services/telegramBotManager'; // Import telegram bot manager
import { AgentService } from './services/agentService'; // Import agent service
import { AgentScheduler } from './services/agentScheduler'; // Import agent scheduler
import { initializeAgentServices } from './api/controllers/agentsController'; // Import agent services initializer
import { registerAgentExecutors } from './services/agents'; // Import agent executors registry
import WhatsAppBaileysService from './services/whatsappBaileysService'; // Import WhatsApp Baileys service (legacy)
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
import imageAnalysisRoutes from './api/routes/imageAnalysisRoutes'; // Import image analysis routes
import agentsRoutes from './api/routes/agentsRoutes'; // Import agents routes
import newsRoutes from './api/routes/newsRoutes'; // Import news routes
import newsHubRoutes from './api/routes/newsHub'; // Import news hub routes
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
import migrationRoutes from './api/routes/migrationRoutes'; // Import migration routes
import adminRoutes from './api/routes/adminRoutes'; // Import admin routes
import { generateTodaySummary } from './api/controllers/whatsappSummaryController'; // Direct import for WhatsApp summary endpoint
import { authMiddleware } from './api/middleware/authMiddleware'; // Import auth middleware
import type { AuthenticatedRequest } from './api/middleware/authMiddleware';
import { initializeTaskReminderScheduler } from './services/taskReminderService'; // Import task reminder service
import { schedulerService } from './services/schedulerService'; // Import scheduler service
import { whatsappSummaryScheduleService } from './services/whatsappSummaryScheduleService';
import { agui } from './services/aguiEmitter'; // Import AG-UI emitter
import { createAgentCommandEvent } from './services/aguiMapper'; // Import AG-UI mapper
import { initializeSearchIndexes } from './config/searchIndexes'; // Import search indexes initializer
import { trackApiUsage } from './middleware/usageTracking'; // Import usage tracking middleware
import './services/searchIndexingService'; // Import to initialize search indexing hooks
import { videoRecommendationScheduler } from './services/videoRecommendationScheduler';
import { newsSchedulerService } from './services/newsSchedulerService'; // Import news scheduler service
import WhatsAppMessageCleanupService from './services/whatsappMessageCleanupService'; // Import WhatsApp message cleanup service

// Environment variables are validated in config/env.ts
const app: Express = express();
const PORT = envConfig.app.port;

// Log startup configuration
logger.info('Starting Synapse Backend', {
  nodeEnv: envConfig.app.nodeEnv,
  port: PORT,
  frontendUrl: envConfig.app.frontendUrl,
  isProduction: envConfig.app.isProduction,
  isRender: envConfig.app.isRender,
});

// Create HTTP server and pass it to Socket.IO
const httpServer = http.createServer(app);

// Set server timeout to 2 minutes (120 seconds) for long-running operations
httpServer.timeout = 120000; // 2 minutes
httpServer.keepAliveTimeout = 65000; // 65 seconds (should be less than timeout)
httpServer.headersTimeout = 66000; // 66 seconds (should be slightly higher than keepAliveTimeout)

// Whitelist CORS origins (SECURITY FIX - No wildcards in production)
const allowedOrigins = [
  envConfig.app.frontendUrl,
  'https://synapse-frontend.onrender.com',
  ...(envConfig.app.isDevelopment ? ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'] : []),
];

logger.info('CORS allowed origins', { origins: allowedOrigins });

// Initialize Socket.io server (Redis adapter will be configured after server start)
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
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

// PRODUCTION MIDDLEWARE STACK
// Order matters - security and monitoring first, then parsing, then routing

// 1. Compression for response optimization
app.use(compression());

// 2. Request correlation ID for distributed tracing
app.use(requestIdMiddleware);

// 3. CORS with whitelisted origins (SECURITY FIX)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      logger.info('CORS request allowed from origin', { origin });
      callback(null, true);
    } else {
      logger.warn('Blocked CORS request from unauthorized origin', { origin, allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "Cache-Control", "X-Request-ID"],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false,
}));

// Additional CORS debugging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info('Request received', { 
    method: req.method, 
    url: req.url, 
    origin: req.headers.origin,
    userAgent: req.headers['user-agent']
  });
  next();
});

// 4. Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. CORS test endpoint for debugging
app.get('/api/v1/cors-test', (req: Request, res: Response) => {
  res.json({ 
    message: 'CORS test successful', 
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// 5. Global rate limiting (100 requests/minute per IP)
app.use(rateLimiters.global);

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
app.use('/api/v1/whatsapp', wahaRoutes); // WAHA routes (primary per WAHA docs)
app.use('/api/v1/whatsapp-legacy', whatsappRoutes); // Legacy Baileys routes (explicit)
// Compatibility: also expose legacy endpoints under /whatsapp for paths WAHA doesn't implement (e.g., /contacts)
// Express will try WAHA first; if no route matches, it continues to legacy, avoiding conflicts.
app.use('/api/v1/whatsapp', whatsappRoutes);
app.use('/api/v1/waha', wahaRoutes); // Keep WAHA routes for direct access
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/capture', captureRoutes); // Use capture routes
app.use('/api/v1/bookmarks', bookmarkRoutes); // Use bookmark routes
app.use('/api/v1/videos', videoRoutes); // Use video routes
app.use('/api/v1/media', mediaRoutes); // Use media routes
app.use('/api/v1/image-analysis', imageAnalysisRoutes); // Use image analysis routes
app.use('/api/v1/tasks', tasksRoutes); // Add this
app.use('/api/v1/notes', notesRoutes); // Add this
app.use('/api/v1/ideas', ideasRoutes); // Add this
app.use('/api/v1/meetings', meetingsRoutes); // Add meetings routes
app.use('/api/v1/users', userRoutes); // <-- USE USER ROUTES
app.use('/api/v1/agents', agentsRoutes); // Use agents routes
app.use('/api/v1/news', newsRoutes); // Use news routes
app.use('/api/v1/news-hub', newsHubRoutes); // Use news hub routes
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
app.use('/api/v1/whatsapp-gridfs', whatsappGridFSRoutes); // Use WhatsApp GridFS image serving routes
app.use('/api/v1/admin', adminRoutes); // Use admin routes (requires admin role)

// TEMPORARY: Simple test endpoint (no auth required) - BEFORE routes
app.get('/api/v1/whatsapp-summary/test', (req: Request, res: Response) => {
  console.log('[Server] Test endpoint hit successfully');
  res.json({ success: true, message: 'WhatsApp summary service is running', timestamp: new Date().toISOString() });
});

// REAL WhatsApp Summary Generation Route (no auth for testing) - BEFORE routes
app.post('/api/v1/whatsapp-summary/generate-today-noauth', async (req: Request, res: Response) => {
  try {
    console.log('[WhatsApp Summary] Real implementation called with body:', req.body);
    const { groupId, timezone = 'UTC', userId: explicitUserId } = req.body;
    const fallbackUserId = req.query.userId as string | undefined;
    const userId = explicitUserId || fallbackUserId;

    if (!groupId) {
      console.log('[WhatsApp Summary] Error: No groupId provided');
      return res.status(400).json({
        success: false,
        error: 'Group ID is required'
      });
    }

    if (!userId) {
      console.log('[WhatsApp Summary] Error: No userId provided for no-auth route');
      return res.status(400).json({
        success: false,
        error: 'User ID is required for summary generation'
      });
    }

    // Use today's date
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    console.log(`[WhatsApp Summary] Generating summary for group ${groupId} on date ${today}`);

    // Create a mock request object with the required body
    const mockReq = {
      ...req,
      body: { groupId, date: today, timezone, chatType: req.body?.chatType },
      user: { id: String(userId), email: '' }
    } as AuthenticatedRequest;

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

// Migration routes (enabled temporarily for the WhatsApp metadata fix)
console.log('[Server] Loading migration routes (temporarily enabled for WhatsApp metadata fix)...');
app.use('/api/v1/migration', migrationRoutes); // Use migration routes
console.log('[Server] Migration routes loaded successfully');

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
    const origin = req.headers.origin;
    const allowedOrigins = [
      'https://synapse-frontend.onrender.com',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5174'
    ];
    
    const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : 'https://synapse-frontend.onrender.com';

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': corsOrigin,
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

// Import health controller
import healthController from './api/controllers/healthController';

// Health check endpoints
app.get('/health', healthController.quickHealthCheck);  // For load balancers
app.get('/api/v1/health/detailed', healthController.detailedHealthCheck);  // Detailed status
app.get('/api/v1/health/ready', healthController.readinessCheck);  // Kubernetes readiness
app.get('/api/v1/health/live', healthController.livenessCheck);  // Kubernetes liveness

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
    console.log('ðŸ“± WhatsApp-related error caught, continuing server operation...');
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
      console.log(`ðŸš€ Server is running on port ${PORT}`);
      console.log(`ðŸŒ Server is binding to 0.0.0.0:${PORT}`);
      console.log(`ðŸ“¦ Environment PORT: ${process.env.PORT || 'not set'}`);
      console.log(`ðŸ”§ NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
      console.log(`âœ… Health check available at: http://0.0.0.0:${PORT}/health`);
      console.log(`ðŸŽ¯ RENDER DEPLOYMENT READY - Service is accessible!`);
      
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
  console.log('[Server] Starting background service initialization...');
  
  try {
    // Initialize Redis adapter for Socket.io horizontal scaling
    try {
      logger.info('[Socket.io] Initializing Redis adapter for horizontal scaling...');

      const pubClient = await createRedisClient();
      const subClient = pubClient?.duplicate();

      if (pubClient && subClient) {
        await subClient.connect();

        // Configure Socket.io with Redis adapter
        io.adapter(createAdapter(pubClient, subClient));

        // Test Redis connection
        const isHealthy = await testRedisConnection(pubClient);

        if (isHealthy) {
          logger.info('[Socket.io] Redis adapter configured successfully');
          logger.info('[Socket.io] Server can now scale horizontally across multiple instances');
        } else {
          logger.error('[Socket.io] Redis health check failed');
        }
      } else {
        logger.warn('[Socket.io] Running without Redis adapter (single instance only)');
        logger.warn('[Socket.io] WebSocket events will NOT be shared across multiple server instances');
      }

    } catch (redisError) {
      logger.error('[Socket.io] Failed to initialize Redis adapter:', redisError);
      logger.warn('[Socket.io] Continuing with in-memory adapter (not suitable for production scale)');
      // Don't crash the server - Socket.io will use in-memory adapter as fallback
    }

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

    // Start video recommendation scheduler
    videoRecommendationScheduler.start();
    console.log('[Server] Video recommendation scheduler started');

    // Initialize and start news scheduler
    await newsSchedulerService.initialize();
    console.log('[Server] News auto-refresh scheduler started');

    if (process.env.WHATSAPP_SUMMARY_SCHEDULER_ENABLED !== 'false') {
      whatsappSummaryScheduleService.start();
      console.log('[Server] WhatsApp summary scheduler started');
    } else {
      console.log('[Server] WhatsApp summary scheduler disabled via env');
    }

    // Initialize WhatsApp message cleanup service
    const whatsappCleanupService = WhatsAppMessageCleanupService.getInstance();
    whatsappCleanupService.initialize();
    console.log('[Server] WhatsApp message cleanup service initialized (3-day retention)');

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
