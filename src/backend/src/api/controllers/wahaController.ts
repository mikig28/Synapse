/**
 * WAHA Controller - Modern WhatsApp API Controller
 * Replaces whatsappController.ts with WAHA-based implementation
 */

import { Request, Response } from 'express';
import WAHAService from '../../services/wahaService';
import POLLING_CONFIG from '../../config/polling.config';

// Cache for status responses to prevent excessive API calls
interface StatusCache {
  data: any;
  timestamp: number;
}

const statusCache: StatusCache = {
  data: null,
  timestamp: 0
};

const CACHE_DURATION = POLLING_CONFIG.backend.statusCacheDuration;

// Monitoring statistics
const monitoringStats = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  apiCalls: 0,
  errors: 0,
  lastReset: new Date()
};

// Get WAHA service instance
const getWAHAService = () => {
  return WAHAService.getInstance();
};

/**
 * Get monitoring statistics
 */
export const getMonitoringStats = async (req: Request, res: Response) => {
  try {
    const uptime = Date.now() - monitoringStats.lastReset.getTime();
    const cacheHitRate = monitoringStats.totalRequests > 0 
      ? (monitoringStats.cacheHits / monitoringStats.totalRequests * 100).toFixed(2) 
      : 0;
    
    res.json({
      success: true,
      data: {
        ...monitoringStats,
        uptime,
        cacheHitRate: `${cacheHitRate}%`,
        averageApiCallsPerMinute: (monitoringStats.apiCalls / (uptime / 60000)).toFixed(2)
      }
    });
  } catch (error) {
    console.error('[WAHA Controller] Error getting monitoring stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get monitoring statistics'
    });
  }
};

/**
 * Get WhatsApp connection status
 */
export const getStatus = async (req: Request, res: Response) => {
  try {
    monitoringStats.totalRequests++;
    
    // Check if we have cached data that's still fresh
    const now = Date.now();
    if (statusCache.data && (now - statusCache.timestamp) < CACHE_DURATION) {
      console.log('[WAHA Controller] Returning cached status');
      monitoringStats.cacheHits++;
      return res.json({
        success: true,
        data: statusCache.data
      });
    }

    monitoringStats.cacheMisses++;
    monitoringStats.apiCalls++;
    
    const wahaService = getWAHAService();
    
    // Try to get status with connection test
    let wahaStatus;
    let sessionDetails;
    try {
      wahaStatus = await wahaService.getStatus();
      
      // Get detailed session information to properly determine authentication
      try {
        sessionDetails = await wahaService.getSessionStatus();
        console.log('[WAHA Controller] Session details:', sessionDetails);
      } catch (sessionError) {
        console.warn('[WAHA Controller] Could not get session details:', sessionError);
        sessionDetails = null;
      }
      
      // If service claims to be ready but we haven't tested recently, verify connection
      if (wahaStatus.isReady) {
        try {
          await wahaService.healthCheck();
        } catch (healthError) {
          console.warn('[WAHA Controller] Health check failed during status request:', healthError);
          wahaStatus.isReady = false;
          wahaStatus.status = 'disconnected';
        }
      }
    } catch (serviceError) {
      console.error('[WAHA Controller] WAHA service error:', serviceError);
      wahaStatus = {
        isReady: false,
        status: 'error',
        qrAvailable: false,
        timestamp: new Date().toISOString()
      };
      sessionDetails = null;
    }
    
    // Determine authentication status based on session details
    const isAuthenticated = sessionDetails?.status === 'WORKING';
    const isConnected = wahaStatus.isReady && isAuthenticated;
    const qrAvailable = sessionDetails?.status === 'SCAN_QR_CODE';
    
    console.log('[WAHA Controller] Status determination:', {
      sessionStatus: sessionDetails?.status,
      wahaReady: wahaStatus.isReady,
      isAuthenticated,
      isConnected,
      qrAvailable
    });
    
    // Avoid fetching chats here to keep status fast and prevent 50x under latency
    const groupsCount = undefined as unknown as number;
    const privateChatsCount = undefined as unknown as number;
    const messagesCount = undefined as unknown as number;

    // Convert WAHA status to format expected by frontend
    const status = {
      connected: isConnected,
      authenticated: isAuthenticated,
      lastHeartbeat: new Date(),
      serviceStatus: sessionDetails?.status || wahaStatus.status,
      isReady: isConnected,
      isClientReady: isConnected,
      groupsCount,
      privateChatsCount,
      messagesCount,
      qrAvailable: qrAvailable,
      timestamp: wahaStatus.timestamp,
      monitoredKeywords: [],
      serviceType: 'waha'
    };
    
    // Cache the status
    statusCache.data = status;
    statusCache.timestamp = now;
    
    // Check if we need to emit authentication status change via Socket.IO
    const io_instance = (global as any).io;
    if (io_instance && isAuthenticated) {
      // Only emit if we detect a new authentication (this prevents spam)
      const currentTime = Date.now();
      const lastEmit = (global as any).lastAuthStatusEmit || 0;
      
      if (currentTime - lastEmit > 10000) { // Only emit every 10 seconds max
        console.log('[WAHA Controller] Emitting authentication status via Socket.IO');
        io_instance.emit('whatsapp:status', {
          connected: true,
          authenticated: true,
          isReady: true,
          authMethod: 'qr',
          serviceType: 'waha',
          timestamp: new Date().toISOString()
        });
        (global as any).lastAuthStatusEmit = currentTime;
      }
    }
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('[WAHA Controller] Error getting status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp status'
    });
  }
};

/**
 * Get QR code for WhatsApp Web authentication
 */
export const getQR = async (req: Request, res: Response) => {
  try {
    console.log('[WAHA Controller] QR code request received');
    const wahaService = getWAHAService();
    const force = String(req.query.force || '').toLowerCase() === 'true';
    
    // Check service health first
    try {
      await wahaService.healthCheck();
      console.log('[WAHA Controller] Service health check passed');
    } catch (healthError) {
      console.error('[WAHA Controller] Service health check failed:', healthError);
      return res.status(503).json({
        success: false,
        error: 'WAHA service is not available. Please check service status.',
        suggestion: 'Try restarting the WAHA service'
      });
    }
    
    const qrDataUrl = await wahaService.getQRCode(undefined, force);
    console.log('[WAHA Controller] ✅ QR code generated successfully');
    
    res.json({
      success: true,
      data: {
        qrCode: qrDataUrl,
        message: 'QR code ready for scanning with WhatsApp mobile app'
      }
    });
  } catch (error) {
    console.error('[WAHA Controller] ❌ Error getting QR code:', error);
    
    // Provide more specific error messages based on the error type
    let statusCode = 500;
    let userMessage = 'Failed to generate QR code';
    
    if (error instanceof Error) {
      if (error.message.includes('not ready') || error.message.includes('422')) {
        statusCode = 422;
        userMessage = 'Session needs to be restarted. Please try again.';
      } else if (error.message.includes('not responding') || error.message.includes('502')) {
        statusCode = 502;
        userMessage = 'WhatsApp service is not responding. Please check service availability.';
      } else if (error.message.includes('timeout')) {
        statusCode = 408;
        userMessage = 'QR code generation timed out. Please try again.';
      } else if (error.message.includes('429') || error.message.toLowerCase().includes('too many')) {
        statusCode = 429;
        userMessage = 'Too many linking attempts. Please wait a minute and try again.';
      }
    }
    
    res.status(statusCode).json({
      success: false,
      error: userMessage,
      technical: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Send text message
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    console.log('[WAHA Controller] Send message request received:', {
      body: req.body,
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
      }
    });
    
    const { chatId, message, text, session } = req.body;
    
    if (!chatId || (!message && !text)) {
      console.log('[WAHA Controller] ❌ Missing required fields:', { chatId, message, text });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: chatId and message/text'
      });
    }

    const wahaService = getWAHAService();
    const messageText = message || text;
    const sessionName = session || 'default';
    
    console.log('[WAHA Controller] Attempting to send message:', {
      chatId,
      messageLength: messageText.length,
      messagePreview: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
      session: sessionName
    });
    
    const result = await wahaService.sendMessage(chatId, messageText, sessionName);
    
    console.log('[WAHA Controller] ✅ Message sent successfully:', result);
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[WAHA Controller] ❌ Error sending message:', {
      error: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    res.status(500).json({
      success: false,
      error: 'Failed to send message: ' + error.message,
      details: error.response?.data || error.message
    });
  }
};

/**
 * Send media message
 */
export const sendMedia = async (req: Request, res: Response) => {
  try {
    const { chatId, mediaUrl, caption } = req.body;
    
    if (!chatId || !mediaUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: chatId and mediaUrl'
      });
    }

    const wahaService = getWAHAService();
    const result = await wahaService.sendMedia(chatId, mediaUrl, caption);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[WAHA Controller] Error sending media:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send media'
    });
  }
};

/**
 * Get all chats with WAHA-compliant pagination and filtering
 */
export const getChats = async (req: Request, res: Response) => {
  try {
    const wahaService = getWAHAService();
    
    // Check session status first - temporarily log for debugging
    const status = await wahaService.getStatus();
    console.log('[WAHA Controller DEBUG] Session status for getChats:', status);
    
    // Temporarily disable isReady check to debug authentication issues
    if (!status.isReady) {
      console.log('[WAHA Controller DEBUG] Session not ready but continuing for debugging');
      // return res.status(400).json({
      //   success: false,
      //   error: 'WhatsApp session is not ready',
      //   details: {
      //     status: status.status,
      //     suggestion: 'Please authenticate with WhatsApp first'
      //   }
      // });
    }
    
    // Parse WAHA-compliant query parameters
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      sortBy: req.query.sortBy as 'conversationTimestamp' | 'id' | 'name' | undefined,
      sortOrder: req.query.sortOrder as 'desc' | 'asc' | undefined,
      exclude: req.query.exclude ? (req.query.exclude as string).split(',') : undefined
    };
    
    console.log('[WAHA Controller] Getting chats with options:', options);
    const startTime = Date.now();
    const chats = await wahaService.getChats(undefined, options);
    const duration = Date.now() - startTime;
    
    console.log(`[WAHA Controller] ✅ Successfully fetched ${chats.length} chats in ${duration}ms`);
    
    res.json({
      success: true,
      data: chats,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: chats.length,
        hasMore: options.limit ? chats.length >= options.limit : false
      },
      meta: {
        count: chats.length,
        loadTime: duration
      }
    });
  } catch (error: any) {
    console.error('[WAHA Controller] Error getting chats:', error);
    
    let statusCode = 500;
    let errorMessage = 'Failed to get chats';
    let suggestion = 'Please try again or check your connection';
    
    if (error.message?.includes('timeout')) {
      statusCode = 408;
      errorMessage = 'Chat loading timed out';
      suggestion = 'The WhatsApp service is taking longer than expected. Please try again in a moment.';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      statusCode = 503;
      errorMessage = 'WhatsApp service unavailable';
      suggestion = 'The WhatsApp service is temporarily unavailable. Please try again later.';
    } else if (error.response?.status === 401) {
      statusCode = 401;
      errorMessage = 'WhatsApp authentication required';
      suggestion = 'Please authenticate with WhatsApp first.';
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: {
        suggestion,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get messages from specific chat
 */
export const getMessages = async (req: Request, res: Response) => {
  try {
    // Support both URL param and query param for chatId
    let chatId: string | undefined = req.params.chatId || (req.query.chatId as string | undefined);
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Validate and sanitize chatId to prevent [object Object] errors
    if (chatId) {
      // Check if chatId is an object (shouldn't happen but defensive coding)
      // Note: typeof null === 'object' in JavaScript, so we need to check for null explicitly
      if (chatId !== null && typeof chatId === 'object') {
        console.error('[WAHA Controller] ❌ chatId is an object:', chatId);
        // Type assertion to tell TypeScript chatId is not null here
        const chatIdObj = chatId as any;
        if ('id' in chatIdObj) {
          chatId = chatIdObj.id;
        } else if ('_id' in chatIdObj) {
          chatId = chatIdObj._id;
        } else {
          return res.status(400).json({
            success: false,
            error: 'Invalid chatId format',
            details: { receivedType: typeof chatId }
          });
        }
      }
      
      // Convert to string if needed
      chatId = String(chatId);
      // TypeScript type guard - chatId is definitely a string now
      
      // Check for literal "[object Object]" string
      if (chatId === '[object Object]' || chatId.includes('[object')) {
        console.error('[WAHA Controller] ❌ Invalid chatId "[object Object]" detected');
        return res.status(400).json({
          success: false,
          error: 'Invalid chatId received',
          details: { chatId, hint: 'Frontend sent an object instead of string' }
        });
      }
    }
    
    const wahaService = getWAHAService();
    
    if (!chatId) {
      // If no chatId provided, get recent messages from all chats
      console.log('[WAHA Controller] No chatId provided, fetching recent messages from all chats');
      try {
        const allMessages = await wahaService.getRecentMessages(limit);
        console.log('[WAHA Controller] Found recent messages:', allMessages.length);
        return res.json({
          success: true,
          data: allMessages
        });
      } catch (recentError) {
        console.warn('[WAHA Controller] Failed to get recent messages, returning empty array:', recentError);
        return res.json({
          success: true,
          data: []
        });
      }
    }

    const messages = await wahaService.getMessages(chatId as string, limit);
    console.log('[WAHA Controller] Found messages for chat', chatId, ':', messages.length);
    
    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('[WAHA Controller] Error getting messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages'
    });
  }
};

/**
 * Start WhatsApp session
 */
export const startSession = async (req: Request, res: Response) => {
  try {
    const { sessionName } = req.body;
    const wahaService = getWAHAService();
    
    const session = await wahaService.startSession(sessionName);
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('[WAHA Controller] Error starting session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start session'
    });
  }
};

/**
 * Stop WhatsApp session
 */
export const stopSession = async (req: Request, res: Response) => {
  try {
    const { sessionName } = req.body;
    const wahaService = getWAHAService();
    
    await wahaService.stopSession(sessionName);
    
    res.json({
      success: true,
      message: 'Session stopped successfully'
    });
  } catch (error) {
    console.error('[WAHA Controller] Error stopping session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop session'
    });
  }
};

/**
 * Webhook handler for WAHA events (following WAHA documentation structure)
 */
export const webhook = async (req: Request, res: Response) => {
  try {
    console.log('[WAHA Controller] WAHA webhook received:', req.body);
    const wahaService = getWAHAService();
    
    // Handle the webhook through the service
    await wahaService.handleWebhook(req.body);
    
    // Additional Socket.IO broadcasting for session status changes
    // WAHA event structure: { id, timestamp, event, session, payload }
    if (req.body.event === 'session.status') {
      const io_instance = (global as any).io;
      if (io_instance) {
        const eventData = req.body.payload;
        const sessionName = req.body.session;
        const sessionStatus = eventData.status;
        const isAuthenticated = sessionStatus === 'WORKING';
        
        console.log('[WAHA Controller] Broadcasting session status change via Socket.IO:', {
          sessionName,
          sessionStatus,
          isAuthenticated,
          eventId: req.body.id
        });
        
        io_instance.emit('whatsapp:status', {
          connected: isAuthenticated,
          authenticated: isAuthenticated,
          isReady: isAuthenticated,
          authMethod: 'qr',
          serviceType: 'waha',
          sessionName: sessionName,
          sessionStatus: sessionStatus,
          timestamp: new Date().toISOString()
        });
        
        // Also emit general status update when authenticated
        if (isAuthenticated) {
          console.log('[WAHA Controller] 🎉 Authentication successful! Broadcasting to all clients');
          io_instance.emit('whatsapp:authenticated', {
            method: 'qr',
            serviceType: 'waha',
            sessionName: sessionName,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[WAHA Controller] Error handling webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to handle webhook'
    });
  }
};

/**
 * Send phone authentication code
 */
export const sendPhoneAuthCode = async (req: Request, res: Response) => {
  try {
    console.log('[WAHA Controller] Phone auth code request received:', req.body);
    const { phoneNumber } = req.body;
    
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      console.error('[WAHA Controller] Invalid phone number in request:', phoneNumber);
      return res.status(400).json({
        success: false,
        error: 'Phone number is required and must be a string'
      });
    }
    
    // Clean phone number (remove non-digits)
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    console.log('[WAHA Controller] Cleaned phone number:', cleanedPhone);
    
    if (cleanedPhone.length < 10) {
      console.error('[WAHA Controller] Phone number too short:', cleanedPhone);
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
      });
    }
    
    console.log('[WAHA Controller] Getting WAHA service instance...');
    const wahaService = getWAHAService();
    
    console.log('[WAHA Controller] Requesting phone code via WAHA service...');
    const result = await wahaService.requestPhoneCode(cleanedPhone);
    
    console.log('[WAHA Controller] WAHA service result:', result);
    
    if (result.success) {
      console.log('[WAHA Controller] ✅ Phone code request successful');
      res.json({
        success: true,
        message: 'Verification code generated. Enter it in your WhatsApp app.',
        data: {
          phoneNumber: cleanedPhone,
          codeRequested: true,
          pairingCode: result.code || null
        }
      });
    } else {
      console.log('[WAHA Controller] ❌ Phone code request failed:', result.error);
      
      // Check if it's a known error that means phone auth is not supported
      if (result.error?.includes('not available') || result.error?.includes('not supported')) {
        console.log('[WAHA Controller] Phone auth not supported, directing user to QR method');
        res.status(422).json({
          success: false,
          error: 'Phone number authentication is not available with the current WhatsApp configuration. Please use QR code authentication instead.',
          fallbackMethod: 'qr',
          code: 'PHONE_AUTH_NOT_SUPPORTED'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to send verification code'
        });
      }
    }
  } catch (error: any) {
    console.error('[WAHA Controller] ❌ Exception sending phone auth code:', error);
    
    // Check if it's a network/connection error to WAHA service
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.response?.status >= 500) {
      console.log('[WAHA Controller] WAHA service unavailable, directing user to QR method');
      res.status(503).json({
        success: false,
        error: 'WhatsApp service is temporarily unavailable. Please try QR code authentication instead.',
        fallbackMethod: 'qr',
        code: 'SERVICE_UNAVAILABLE'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send verification code: ' + error.message
      });
    }
  }
};

/**
 * Verify phone authentication code
 */
export const verifyPhoneAuthCode = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, code } = req.body;
    
    if (!phoneNumber || !code) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and verification code are required'
      });
    }
    
    if (typeof code !== 'string' || code.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'Verification code must be 6 digits'
      });
    }
    
    const wahaService = getWAHAService();
    const result = await wahaService.verifyPhoneCode(phoneNumber, code);
    
    if (result.success) {
      // Emit connection status update to frontend
      const io_instance = (global as any).io;
      if (io_instance) {
        io_instance.emit('whatsapp:status', {
          connected: true,
          authenticated: true,
          authMethod: 'phone',
          phoneNumber: phoneNumber
        });
      }
      
      res.json({
        success: true,
        message: 'Phone verification successful - WhatsApp connected',
        data: {
          authenticated: true,
          phoneNumber: phoneNumber
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Invalid verification code'
      });
    }
  } catch (error: any) {
    console.error('[WAHA Controller] Error verifying phone auth code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify code: ' + error.message
    });
  }
};

/**
 * Get WhatsApp groups with WAHA-compliant pagination and enhanced metadata
 */
export const getGroups = async (req: Request, res: Response) => {
  try {
    const wahaService = getWAHAService();
    
    // Check session status first - temporarily log for debugging
    const status = await wahaService.getStatus();
    console.log('[WAHA Controller DEBUG] Session status for getGroups:', status);
    
    // Temporarily disable isReady check to debug authentication issues
    if (!status.isReady) {
      console.log('[WAHA Controller DEBUG] Session not ready but continuing for debugging');
      // return res.status(400).json({
      //   success: false,
      //   error: 'WhatsApp session is not ready',
      //   details: {
      //     status: status.status,
      //     suggestion: 'Please authenticate with WhatsApp first'
      //   }
      // });
    }
    
    // Parse WAHA-compliant query parameters for groups
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      sortBy: req.query.sortBy as 'id' | 'subject' | undefined,
      sortOrder: req.query.sortOrder as 'desc' | 'asc' | undefined,
      exclude: req.query.exclude ? (req.query.exclude as string).split(',') : undefined
    };
    
    console.log('[WAHA Controller] Getting groups with options:', options);
    const startTime = Date.now();
    
    // Try WAHA-compliant groups endpoint first
    let groups = await wahaService.getGroups(undefined, options);
    if (!groups || groups.length === 0) {
      console.log('[WAHA Controller] No groups found, trying refresh...');
      // Ask WAHA to refresh then try again quickly
      const refreshResult = await wahaService.refreshGroups();
      console.log('[WAHA Controller] Group refresh result:', refreshResult);
      groups = await wahaService.getGroups(undefined, options);
    }
    
    const duration = Date.now() - startTime;
    console.log(`[WAHA Controller] ✅ Successfully fetched ${groups.length} groups in ${duration}ms`);
    
    res.json({
      success: true,
      data: groups,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: groups.length,
        hasMore: options.limit ? groups.length >= options.limit : false
      },
      metadata: {
        groupsWithAdminRole: groups.filter(g => g.role === 'ADMIN').length,
        groupsWithRestrictions: groups.filter(g => g.settings?.messagesAdminOnly || g.settings?.infoAdminOnly).length,
        totalParticipants: groups.reduce((sum, g) => sum + (g.participantCount || 0), 0)
      },
      meta: {
        count: groups.length,
        loadTime: duration
      }
    });
  } catch (error: any) {
    console.error('[WAHA Controller] Error getting groups:', error);
    
    let statusCode = 500;
    let errorMessage = 'Failed to get WhatsApp groups';
    let suggestion = 'Please try again or check your connection';
    
    if (error.message?.includes('timeout')) {
      statusCode = 408;
      errorMessage = 'Group loading timed out';
      suggestion = 'The WhatsApp service is taking longer than expected. Please try again in a moment.';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      statusCode = 503;
      errorMessage = 'WhatsApp service unavailable';
      suggestion = 'The WhatsApp service is temporarily unavailable. Please try again later.';
    } else if (error.response?.status === 401) {
      statusCode = 401;
      errorMessage = 'WhatsApp authentication required';
      suggestion = 'Please authenticate with WhatsApp first.';
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: {
        suggestion,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get WhatsApp private chats
 */
export const getPrivateChats = async (req: Request, res: Response) => {
  try {
    const wahaService = getWAHAService();
    
    // Check session status first - temporarily log for debugging
    const status = await wahaService.getStatus();
    console.log('[WAHA Controller DEBUG] Session status for getPrivateChats:', status);
    
    // Temporarily disable isReady check to debug authentication issues
    if (!status.isReady) {
      console.log('[WAHA Controller DEBUG] Session not ready but continuing for debugging');
      // return res.status(400).json({
      //   success: false,
      //   error: 'WhatsApp session is not ready',
      //   details: {
      //     status: status.status,
      //     suggestion: 'Please authenticate with WhatsApp first'
      //   }
      // });
    }
    
    // Parse pagination/sorting options
    const limit = req.query.limit ? Math.max(1, Math.min(500, parseInt(req.query.limit as string))) : undefined;
    const offset = req.query.offset ? Math.max(0, parseInt(req.query.offset as string)) : undefined;
    const sortBy = (req.query.sortBy as 'conversationTimestamp' | 'id' | 'name' | undefined) || 'conversationTimestamp';
    const sortOrder = (req.query.sortOrder as 'desc' | 'asc' | undefined) || 'desc';
    
    console.log('[WAHA Controller] Fetching private chats...', { limit, offset, sortBy, sortOrder });
    const startTime = Date.now();

    // Request chats with options to let service use WAHA-compliant params
    const chats = await wahaService.getChats(undefined, { limit, offset, sortBy, sortOrder });
    
    // Filter only private chats (not @g.us)
    let privateChats = chats.filter(chat => !chat.isGroup && !(typeof chat.id === 'string' && chat.id.includes('@g.us')));

    // Sort client-side as a fallback if WAHA ignored params
    if (sortBy === 'conversationTimestamp') {
      privateChats = privateChats.sort((a, b) => (sortOrder === 'desc' ? (b.timestamp || 0) - (a.timestamp || 0) : (a.timestamp || 0) - (b.timestamp || 0)));
    } else if (sortBy === 'name') {
      privateChats = privateChats.sort((a, b) => (sortOrder === 'desc' ? (b.name || '').localeCompare(a.name || '') : (a.name || '').localeCompare(b.name || '')));
    } else if (sortBy === 'id') {
      privateChats = privateChats.sort((a, b) => (sortOrder === 'desc' ? (b.id || '').localeCompare(a.id || '') : (a.id || '').localeCompare(b.id || '')));
    }

    // Apply pagination client-side if WAHA ignored params
    const total = privateChats.length;
    let paged = privateChats;
    if (typeof limit === 'number') {
      const start = typeof offset === 'number' ? offset : 0;
      paged = privateChats.slice(start, start + limit);
    }

    const duration = Date.now() - startTime;
    console.log(`[WAHA Controller] ✅ Successfully fetched ${paged.length}/${total} private chats in ${duration}ms`);
    
    res.json({
      success: true,
      data: paged,
      pagination: {
        limit,
        offset: typeof offset === 'number' ? offset : 0,
        total,
        hasMore: typeof limit === 'number' ? (typeof offset === 'number' ? offset + paged.length < total : paged.length < total) : false
      },
      meta: {
        count: paged.length,
        loadTime: duration
      }
    });
  } catch (error: any) {
    console.error('[WAHA Controller] Error getting private chats:', error);
    
    let statusCode = 500;
    let errorMessage = 'Failed to get WhatsApp private chats';
    let suggestion = 'Please try again or check your connection';
    
    if (error.message?.includes('timeout')) {
      statusCode = 408;
      errorMessage = 'Private chat loading timed out';
      suggestion = 'The WhatsApp service is taking longer than expected. Please try again in a moment.';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      statusCode = 503;
      errorMessage = 'WhatsApp service unavailable';
      suggestion = 'The WhatsApp service is temporarily unavailable. Please try again later.';
    } else if (error.response?.status === 401) {
      statusCode = 401;
      errorMessage = 'WhatsApp authentication required';
      suggestion = 'Please authenticate with WhatsApp first.';
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: {
        suggestion,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Restart WhatsApp session
 */
export const restartSession = async (req: Request, res: Response) => {
  try {
    console.log('[WAHA Controller] Restart session request received');
    const wahaService = getWAHAService();
    
    const session = await wahaService.restartSession();
    console.log('[WAHA Controller] ✅ Session restarted successfully');
    
    res.json({
      success: true,
      message: 'WhatsApp session restarted successfully',
      data: {
        sessionStatus: session.status,
        sessionName: session.name,
        isReady: session.status === 'WORKING',
        qrAvailable: session.status === 'SCAN_QR_CODE'
      }
    });
  } catch (error) {
    console.error('[WAHA Controller] ❌ Error restarting session:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restart WhatsApp service',
      suggestion: 'Please check WAHA service availability and try again'
    });
  }
};

/**
 * Force restart WhatsApp session
 */
export const forceRestart = async (req: Request, res: Response) => {
  try {
    console.log('[WAHA Controller] Force restart session request received');
    const wahaService = getWAHAService();
    
    // Stop monitoring during restart
    wahaService.stopStatusMonitoring();
    
    // Force restart the session
    const session = await wahaService.restartSession();
    console.log('[WAHA Controller] ✅ Force restart completed');
    
    // Resume monitoring
    wahaService.startStatusMonitoring();
    
    res.json({
      success: true,
      message: 'WhatsApp service force restart completed',
      data: {
        sessionStatus: session.status,
        sessionName: session.name,
        isReady: session.status === 'WORKING',
        qrAvailable: session.status === 'SCAN_QR_CODE'
      }
    });
  } catch (error) {
    console.error('[WAHA Controller] ❌ Error force restarting session:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to force restart WhatsApp service',
      suggestion: 'Please check WAHA service availability and try again'
    });
  }
};

/**
 * Refresh WhatsApp chats - triggers fresh fetch
 */
/**
 * Get group participants (WAHA-compliant)
 */
export const getGroupParticipants = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const wahaService = getWAHAService();
    
    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: 'Group ID is required'
      });
    }
    
    console.log(`[WAHA Controller] Getting participants for group: ${groupId}`);
    const participants = await wahaService.getGroupParticipants(groupId);
    
    res.json({
      success: true,
      data: participants,
      groupId: groupId,
      participantCount: participants.length
    });
  } catch (error) {
    console.error('[WAHA Controller] Error getting group participants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get group participants'
    });
  }
};

/**
 * Get specific group details (WAHA-compliant)
 */
export const getGroupDetails = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const wahaService = getWAHAService();
    
    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: 'Group ID is required'
      });
    }
    
    console.log(`[WAHA Controller] Getting details for group: ${groupId}`);
    const groupDetails = await wahaService.getGroupDetails(groupId);
    
    if (!groupDetails) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }
    
    res.json({
      success: true,
      data: groupDetails
    });
  } catch (error) {
    console.error('[WAHA Controller] Error getting group details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get group details'
    });
  }
};

/**
 * Refresh groups using WAHA-compliant endpoint
 */
export const refreshGroups = async (req: Request, res: Response) => {
  try {
    const wahaService = getWAHAService();
    console.log('[WAHA Controller] Refreshing groups...');
    
    const result = await wahaService.refreshGroups();
    
    res.json({
      success: result.success,
      message: result.message || 'Groups refresh completed',
      data: result
    });
  } catch (error) {
    console.error('[WAHA Controller] Error refreshing groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh groups'
    });
  }
};

export const refreshChats = async (req: Request, res: Response) => {
  try {
    const wahaService = getWAHAService();
    const status = await wahaService.getStatus();
    
    // Check if WAHA service is ready
    if (!status.isReady) {
      return res.json({
        success: false,
        error: 'WAHA service is not ready. Please ensure WhatsApp is connected and try again.',
        details: {
          isReady: status.isReady,
          status: status.status,
          suggestion: 'Please authenticate with WhatsApp first'
        }
      });
    }
    
    console.log('[WAHA Controller] Refreshing chats - fetching fresh data...');
    
    // Get fresh chats data directly (this will use the optimized chat fetching)
    const chats = await wahaService.getChats();
    
    console.log(`[WAHA Controller] ✅ Chat refresh complete: ${chats.length} chats retrieved`);
    
    res.json({
      success: true,
      message: 'WhatsApp chats refreshed successfully',
      data: {
        timestamp: new Date().toISOString(),
        chatCount: chats.length,
        groups: chats.filter(chat => chat.isGroup).length,
        privateChats: chats.filter(chat => !chat.isGroup).length
      }
    });
  } catch (error: any) {
    console.error('[WAHA Controller] Error refreshing chats:', error);
    
    // Provide more helpful error messages
    let userFriendlyMessage = 'Failed to refresh WhatsApp chats';
    let statusCode = 500;
    
    if (error.message?.includes('not ready') || error.message?.includes('not available')) {
      userFriendlyMessage = 'WAHA service is not connected. Please authenticate with WhatsApp first.';
      statusCode = 400;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      userFriendlyMessage = 'Cannot connect to WAHA service. Please check service availability.';
      statusCode = 503;
    } else if (error.message?.includes('timeout')) {
      userFriendlyMessage = 'Chat refresh timed out. WAHA service may be overloaded.';
      statusCode = 408;
    }
    
    res.status(statusCode).json({
      success: false,
      error: userFriendlyMessage,
      technicalError: error.message,
      suggestion: statusCode === 400 ? 'Please authenticate with WhatsApp first' : 'Please try again in a few seconds'
    });
  }
};

/**
 * Force history sync (placeholder for compatibility)
 */
export const forceHistorySync = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      message: 'History sync is automatically handled by WAHA service'
    });
  } catch (error) {
    console.error('[WAHA Controller] Error in force history sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync history'
    });
  }
};

/**
 * Get monitored keywords (placeholder for compatibility)
 */
export const getMonitoredKeywords = async (req: Request, res: Response) => {
  try {
    // For now, return empty array since WAHA handles monitoring differently
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('[WAHA Controller] Error getting monitored keywords:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get monitored keywords'
    });
  }
};

/**
 * Add monitored keyword (placeholder for compatibility)
 */
export const addMonitoredKeyword = async (req: Request, res: Response) => {
  try {
    const { keyword } = req.body;
    
    res.json({
      success: true,
      message: `Keyword "${keyword}" monitoring is handled by WAHA service`,
      monitoredKeywords: []
    });
  } catch (error) {
    console.error('[WAHA Controller] Error adding monitored keyword:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add monitored keyword'
    });
  }
};

/**
 * Remove monitored keyword (placeholder for compatibility)
 */
export const removeMonitoredKeyword = async (req: Request, res: Response) => {
  try {
    const { keyword } = req.params;
    
    res.json({
      success: true,
      message: `Keyword "${keyword}" monitoring is handled by WAHA service`,
      monitoredKeywords: []
    });
  } catch (error) {
    console.error('[WAHA Controller] Error removing monitored keyword:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove monitored keyword'
    });
  }
};

/**
 * Health check endpoint
 */
export const healthCheck = async (req: Request, res: Response) => {
  try {
    const wahaService = getWAHAService();
    const isHealthy = await wahaService.healthCheck();
    
    res.json({
      success: true,
      data: {
        waha: isHealthy,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[WAHA Controller] Health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'WAHA service is not healthy'
    });
  }
};

/**
 * Initialize/Create session endpoint
 */
export const initializeSession = async (req: Request, res: Response) => {
  try {
    console.log('[WAHA Controller] 🚀 MANUAL session initialization request received');
    const wahaService = getWAHAService();
    
    // First check current session status
    let currentStatus;
    try {
      currentStatus = await wahaService.getSessionStatus();
      console.log('[WAHA Controller] Current session status before creation:', currentStatus);
    } catch (statusError) {
      console.log('[WAHA Controller] Session status check failed (expected for new session):', statusError);
    }
    
    const session = await wahaService.startSession();
    console.log('[WAHA Controller] ✅ Session creation completed:', session);
    
    res.json({
      success: true,
      data: {
        sessionName: session.name,
        sessionStatus: session.status,
        currentStatus: currentStatus,
        message: 'Session initialized successfully'
      }
    });
  } catch (error: any) {
    console.error('[WAHA Controller] ❌ Error initializing session:', error);
    console.error('[WAHA Controller] Error details:', {
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
      message: error?.message
    });
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to initialize session',
      details: {
        status: error?.response?.status,
        data: error?.response?.data
      }
    });
  }
};

/**
 * Restart failed session endpoint
 */
export const restartFailedSession = async (req: Request, res: Response) => {
  try {
    console.log('[WAHA Controller] 🔄 Session restart request received');
    const wahaService = getWAHAService();
    
    // Check current session status
    let currentStatus;
    try {
      currentStatus = await wahaService.getSessionStatus();
      console.log('[WAHA Controller] Current session status before restart:', currentStatus);
    } catch (statusError) {
      console.log('[WAHA Controller] Session status check failed:', statusError);
      currentStatus = { status: 'UNKNOWN' };
    }
    
    // Attempt restart
    const restartResult = await wahaService.restartFailedSession();
    
    if (restartResult) {
      console.log('[WAHA Controller] ✅ Session restarted successfully');
      
      // Get new session status
      let newStatus;
      try {
        newStatus = await wahaService.getSessionStatus();
      } catch (error) {
        newStatus = { status: 'STARTING' };
      }
      
      res.json({
        success: true,
        data: {
          message: 'Session restarted successfully',
          previousStatus: currentStatus.status,
          currentStatus: newStatus.status,
          needsQR: newStatus.status === 'SCAN_QR_CODE' || newStatus.status === 'STARTING'
        }
      });
    } else {
      console.log('[WAHA Controller] ❌ Session restart failed');
      res.status(500).json({
        success: false,
        error: 'Failed to restart session',
        data: {
          previousStatus: currentStatus.status,
          suggestion: 'Try again or restart the WAHA service'
        }
      });
    }
  } catch (error: any) {
    console.error('[WAHA Controller] ❌ Error restarting session:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to restart session',
      details: {
        status: error?.response?.status,
        data: error?.response?.data
      }
    });
  }
};

/**
 * Auto-recover session from FAILED state
 */
export const autoRecoverSession = async (req: Request, res: Response) => {
  try {
    console.log('[WAHA Controller] 🔄 Auto-recovery request received');
    const wahaService = getWAHAService();
    
    // Check if auto-recovery is needed
    const currentStatus = await wahaService.getSessionStatus();
    console.log('[WAHA Controller] Current session status:', currentStatus);
    
    if (currentStatus.status !== 'FAILED') {
      return res.json({
        success: true,
        data: {
          message: 'Session is not in FAILED state - no recovery needed',
          status: currentStatus.status
        }
      });
    }
    
    // Attempt auto-recovery
    const recoveryResult = await wahaService.autoRecoverSession();
    
    if (recoveryResult) {
      const newStatus = await wahaService.getSessionStatus();
      res.json({
        success: true,
        data: {
          message: 'Session auto-recovery completed',
          previousStatus: 'FAILED',
          currentStatus: newStatus.status,
          needsQR: newStatus.status === 'SCAN_QR_CODE' || newStatus.status === 'STARTING'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Auto-recovery failed',
        data: {
          suggestion: 'Try manual session restart or WAHA service restart'
        }
      });
    }
  } catch (error: any) {
    console.error('[WAHA Controller] ❌ Error in auto-recovery:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Auto-recovery failed',
      details: error?.response?.data || error.message
    });
  }
};

/**
 * Get media URL from WAHA for a specific message
 */
export const getMediaUrl = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { sessionName } = req.query;
    
    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required'
      });
    }
    
    const wahaService = getWAHAService();
    const mediaUrl = await wahaService.getMediaUrl(messageId, sessionName as string);
    
    if (mediaUrl) {
      res.json({
        success: true,
        data: { mediaUrl }
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Media not found for this message'
      });
    }
  } catch (error: any) {
    console.error('[WAHA Controller] Error getting media URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get media URL'
    });
  }
};

/**
 * Download media file from WAHA
 */
export const downloadMedia = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { sessionName } = req.query;
    
    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required'
      });
    }
    
    const wahaService = getWAHAService();
    const mediaBuffer = await wahaService.downloadMedia(messageId, sessionName as string);
    
    if (mediaBuffer) {
      // Set appropriate headers for file download
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="media_${messageId}"`,
        'Content-Length': mediaBuffer.length.toString()
      });
      
      res.send(mediaBuffer);
    } else {
      res.status(404).json({
        success: false,
        error: 'Media not found or could not be downloaded'
      });
    }
  } catch (error: any) {
    console.error('[WAHA Controller] Error downloading media:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download media'
    });
  }
};

/**
 * Get media messages for a specific chat
 */
export const getMediaMessages = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: 'Chat ID is required'
      });
    }
    
    // Import the WhatsAppMessage model
    const { default: WhatsAppMessage } = await import('../../models/WhatsAppMessage');
    
    // Query for media messages in the specified chat
    const mediaMessages = await WhatsAppMessage.find({
      $or: [
        { from: chatId },
        { to: chatId }
      ],
      localMediaGridFsId: { $exists: true, $ne: null }
    })
    .populate('contactId')
    .sort({ timestamp: -1 })
    .skip(offset)
    .limit(limit);
    
    // Transform messages for frontend
    const transformedMessages = mediaMessages.map(msg => ({
      id: msg._id,
      wahaMessageId: msg.messageId,
      chatId: msg.to,
      from: msg.from,
      message: msg.message,
      timestamp: msg.timestamp,
      type: msg.type,
      mediaUrl: msg.mediaUrl,
      localMediaGridFsId: msg.localMediaGridFsId,
      mimeType: msg.mimeType,
      mediaSize: msg.mediaSize,
      filename: msg.filename,
      caption: msg.caption,
      contact: msg.contactId
    }));
    
    res.json({
      success: true,
      data: transformedMessages,
      pagination: {
        offset,
        limit,
        total: transformedMessages.length
      }
    });
  } catch (error: any) {
    console.error('[WAHA Controller] Error getting media messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get media messages'
    });
  }
};

/**
 * Move WhatsApp media message to Images section
 */
export const moveMediaToImages = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    
    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required'
      });
    }
    
    // Import required models
    const { default: WhatsAppMessage } = await import('../../models/WhatsAppMessage');
    const { default: TelegramItem } = await import('../../models/TelegramItem');
    
    // Find the WhatsApp message
    const whatsappMessage = await WhatsAppMessage.findById(messageId).populate('contactId');
    
    if (!whatsappMessage) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }
    
    if (!whatsappMessage.localMediaGridFsId) {
      return res.status(400).json({
        success: false,
        error: 'Message does not contain media'
      });
    }
    
    // Check if already moved to images
    const existingTelegramItem = await TelegramItem.findOne({
      mediaGridFsId: whatsappMessage.localMediaGridFsId
    });
    
    if (existingTelegramItem) {
      return res.json({
        success: true,
        message: 'Media already exists in Images section',
        data: { telegramItemId: existingTelegramItem._id }
      });
    }
    
    // Create new TelegramItem for images section
    const telegramItem = new TelegramItem({
      messageType: 'photo',
      from: (whatsappMessage.contactId as any)?.name || whatsappMessage.from,
      fromUsername: (whatsappMessage.contactId as any)?.name || whatsappMessage.from,
      chatTitle: `WhatsApp: ${(whatsappMessage.contactId as any)?.name || whatsappMessage.from}`,
      content: whatsappMessage.caption || '',
      receivedAt: whatsappMessage.timestamp,
      mediaGridFsId: whatsappMessage.localMediaGridFsId,
      source: 'whatsapp',
      whatsappMessageId: whatsappMessage._id
    });
    
    await telegramItem.save();
    
    res.json({
      success: true,
      message: 'Media moved to Images section successfully',
      data: { telegramItemId: telegramItem._id }
    });
  } catch (error: any) {
    console.error('[WAHA Controller] Error moving media to images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to move media to images'
    });
  }
};

/**
 * Delete WhatsApp media message
 */
export const deleteMediaMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    
    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required'
      });
    }
    
    // Import required models and GridFS
    const { default: WhatsAppMessage } = await import('../../models/WhatsAppMessage');
    const { getBucket } = await import('../../config/gridfs');
    const { ObjectId } = await import('mongodb');
    
    // Find the message
    const message = await WhatsAppMessage.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }
    
    // Delete from GridFS if media exists
    if (message.localMediaGridFsId) {
      try {
        const bucket = getBucket();
        await bucket.delete(new ObjectId(message.localMediaGridFsId));
        console.log('[WAHA Controller] Media file deleted from GridFS:', message.localMediaGridFsId);
      } catch (gridError) {
        console.warn('[WAHA Controller] Failed to delete from GridFS:', gridError);
        // Continue with message deletion even if GridFS deletion fails
      }
    }
    
    // Delete the message from database
    await WhatsAppMessage.findByIdAndDelete(messageId);
    
    res.json({
      success: true,
      message: 'Media message deleted successfully'
    });
  } catch (error: any) {
    console.error('[WAHA Controller] Error deleting media message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete media message'
    });
  }
};