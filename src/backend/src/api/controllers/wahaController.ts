/**
 * WAHA Controller - Modern WhatsApp API Controller
 * Replaces whatsappController.ts with WAHA-based implementation
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import WAHAService from '../../services/wahaService';
import WhatsAppSessionManager from '../../services/whatsappSessionManager';
import POLLING_CONFIG from '../../config/polling.config';
import { whatsappMediaService } from '../../services/whatsappMediaService';
import WhatsAppMessage from '../../models/WhatsAppMessage';
import WhatsAppContact from '../../models/WhatsAppContact';
import * as path from 'path';
import * as fs from 'fs';

// Monitoring statistics
const monitoringStats = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  apiCalls: 0,
  errors: 0,
  lastReset: new Date()
};

// Get WhatsApp Session Manager instance
const getSessionManager = () => {
  return WhatsAppSessionManager.getInstance();
};

// Get WAHA service for specific user
const getWAHAServiceForUser = async (userId: string) => {
  const sessionManager = getSessionManager();
  return await sessionManager.getSessionForUser(userId);
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
export const getStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    monitoringStats.totalRequests++;
    monitoringStats.apiCalls++;
    
    const userId = req.user!.id;
    const wahaService = await getWAHAServiceForUser(userId);
    
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
    
    // Get monitoring stats if available (cached for performance)
    let groupsCount = undefined as unknown as number;
    let privateChatsCount = undefined as unknown as number;
    let messagesCount = undefined as unknown as number;
    let imagesCount = 0;
    let lastActivity = new Date().toISOString();
    
    // Try to get cached counts from global monitoring stats
    let globalStats: any = null;
    try {
      globalStats = (global as any).wahaMonitoringStats;
      if (globalStats && globalStats.timestamp && (Date.now() - globalStats.timestamp < 300000)) { // 5 minutes cache
        groupsCount = globalStats.groupsCount || 0;
        privateChatsCount = globalStats.privateChatsCount || 0;
        messagesCount = globalStats.messagesCount || 0;
        imagesCount = globalStats.imagesCount || 0;
        lastActivity = globalStats.lastActivity || lastActivity;
      }
    } catch (statsError) {
      // Ignore stats errors, will use defaults
    }

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
      serviceType: 'waha',
      // Enhanced monitoring fields
      imagesCount: imagesCount,
      monitoringActive: isConnected && isAuthenticated,
      lastActivity: lastActivity
    };
    
    // Note: Per-user status caching removed for multi-user support
    
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
 * Get QR code for user's WhatsApp authentication
 */
export const getQR = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    console.log(`[WAHA Controller] QR code request received for user ${userId}`);
    const wahaService = await getWAHAServiceForUser(userId);
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
 * Send text message from user's session
 */
export const sendMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    console.log('[WAHA Controller] Send message request received:', {
      userId,
      body: req.body,
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
      }
    });
    
    const { chatId, message, text } = req.body;
    
    if (!chatId || (!message && !text)) {
      console.log('[WAHA Controller] ❌ Missing required fields:', { chatId, message, text });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: chatId and message/text'
      });
    }

    const wahaService = await getWAHAServiceForUser(userId);
    const messageText = message || text;
    
    console.log('[WAHA Controller] Attempting to send message:', {
      chatId,
      messageLength: messageText.length,
      messagePreview: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : '')
    });
    
    const result = await wahaService.sendMessage(chatId, messageText);
    
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
 * Send media message from user's session
 */
export const sendMedia = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { chatId, mediaUrl, caption } = req.body;
    
    if (!chatId || !mediaUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: chatId and mediaUrl'
      });
    }

    const userId = req.user!.id;
    const wahaService = await getWAHAServiceForUser(userId);
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
export const getChats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const wahaService = await getWAHAServiceForUser(userId);
    
    // Parse WAHA-compliant query parameters
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      sortBy: 'id' as 'id',
      sortOrder: req.query.sortOrder as 'desc' | 'asc' | undefined,
      exclude: req.query.exclude ? (req.query.exclude as string).split(',') : undefined
    };
    
    console.log('[WAHA Controller] Getting chats for user', userId, 'with options:', options);
    const startTime = Date.now();
    
    // Get chats from WAHA service (live data)
    const chats = await wahaService.getChats('default', options);
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
export const getMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const wahaService = await getWAHAServiceForUser(userId);
    
    // Support both URL param and query param for chatId
    let chatId: string | undefined = req.params.chatId || (req.query.chatId as string | undefined);
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Validate and sanitize chatId to prevent [object Object] errors
    if (chatId) {
      if (chatId !== null && typeof chatId === 'object') {
        console.error('[WAHA Controller] ❌ chatId is an object:', chatId);
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
      
      chatId = String(chatId);
      
      if (chatId === '[object Object]' || chatId.includes('[object')) {
        console.error('[WAHA Controller] ❌ Invalid chatId "[object Object]" detected');
        return res.status(400).json({
          success: false,
          error: 'Invalid chatId received',
          details: { chatId, hint: 'Frontend sent an object instead of string' }
        });
      }
    }
    
    // Get messages from WAHA service (live data)
    if (!chatId) {
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
export const startSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const wahaService = await getWAHAServiceForUser(userId);
    
    const session = await wahaService.startSession();
    
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
export const stopSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const wahaService = await getWAHAServiceForUser(userId);
    const sessionManager = getSessionManager();
    await sessionManager.stopSessionForUser(userId);
    
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
    const payload = req.body;
    
    // Validate WAHA webhook payload structure
    if (!payload.event || !payload.session) {
      console.warn('[WAHA Controller] ⚠️ Invalid webhook payload - missing event or session:', payload);
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook payload: missing event or session'
      });
    }
    
    console.log('[WAHA Controller] 📡 WAHA webhook received:', {
      event: payload.event,
      session: payload.session,
      id: payload.id,
      timestamp: payload.timestamp,
      payloadType: typeof payload.payload,
      headers: {
        'x-webhook-request-id': req.headers['x-webhook-request-id'],
        'x-webhook-timestamp': req.headers['x-webhook-timestamp'],
        'x-webhook-hmac': req.headers['x-webhook-hmac'] ? 'present' : 'absent'
      }
    });
    
    // Log message events specifically for debugging
    if (payload.event === 'message') {
      console.log('[WAHA Controller] 💬 Message webhook payload:', {
        messageId: payload.payload?.id,
        from: payload.payload?.from,
        to: payload.payload?.to,
        body: payload.payload?.body?.substring(0, 100),
        hasMedia: payload.payload?.hasMedia,
        type: payload.payload?.type,
        mimeType: payload.payload?.mimeType,
        media: payload.payload?.media ? 'present' : 'absent',
        mediaDetails: payload.payload?.media ? {
          url: payload.payload.media.url ? 'present' : 'absent',
          mimetype: payload.payload.media.mimetype,
          filename: payload.payload.media.filename,
          error: payload.payload.media.error
        } : null,
        isGroup: payload.payload?.isGroup,
        timestamp: payload.payload?.timestamp
      });
    }
    
    // TODO: Route webhook to correct user's session based on sessionId in webhook body
    // Temporarily disabled pending multi-user routing implementation
    console.warn('[WAHA Controller] Webhook processing temporarily disabled for multi-user migration');
    
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
export const sendPhoneAuthCode = async (req: AuthenticatedRequest, res: Response) => {
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
    
    console.log('[WAHA Controller] Getting WAHA service instance for user...');
    const userId = req.user!.id;
    const wahaService = await getWAHAServiceForUser(userId);
    
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
export const verifyPhoneAuthCode = async (req: AuthenticatedRequest, res: Response) => {
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
    
    const userId = req.user!.id;
    const wahaService = await getWAHAServiceForUser(userId);
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
export const getGroups = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const wahaService = await getWAHAServiceForUser(userId);
    
    // Parse WAHA-compliant query parameters for groups
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      sortBy: req.query.sortBy as 'id' | 'subject' | undefined,
      sortOrder: req.query.sortOrder as 'desc' | 'asc' | undefined,
      exclude: req.query.exclude ? (req.query.exclude as string).split(',') : undefined
    };
    
    console.log('[WAHA Controller] Getting groups for user', userId, 'with options:', options);
    const startTime = Date.now();
    
    // Get groups from WAHA service (live data)
    let groups = await wahaService.getGroups('default', options);
    if (!groups || groups.length === 0) {
      console.log('[WAHA Controller] No groups found, trying refresh...');
      const refreshResult = await wahaService.refreshGroups();
      console.log('[WAHA Controller] Group refresh result:', refreshResult);
      groups = await wahaService.getGroups('default', options);
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
export const getPrivateChats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const wahaService = await getWAHAServiceForUser(userId);
    
    // Parse pagination/sorting options
    const limit = req.query.limit ? Math.max(1, Math.min(500, parseInt(req.query.limit as string))) : undefined;
    const offset = req.query.offset ? Math.max(0, parseInt(req.query.offset as string)) : undefined;
    const sortBy = 'id';
    const sortOrder = (req.query.sortOrder as 'desc' | 'asc' | undefined) || 'desc';
    
    console.log('[WAHA Controller] Fetching private chats for user', userId, '...', { limit, offset, sortBy, sortOrder });
    const startTime = Date.now();

    // Get chats from WAHA and filter only private chats
    const chats = await wahaService.getChats('default', { limit, offset, sortBy, sortOrder });
    
    // Filter only private chats (not @g.us)
    let privateChats = chats.filter(chat => !chat.isGroup && !(typeof chat.id === 'string' && chat.id.includes('@g.us')));

    // Sort client-side as fallback
    privateChats = privateChats.sort((a, b) => (sortOrder === 'desc' ? (b.id || '').localeCompare(a.id || '') : (a.id || '').localeCompare(b.id || '')));

    // Apply pagination client-side if needed
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
export const restartSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('[WAHA Controller] Restart session request received');
    const userId = req.user!.id;
    const sessionManager = getSessionManager();
    await sessionManager.restartSessionForUser(userId);
    console.log('[WAHA Controller] ✅ Session restarted successfully');
    
    res.json({
      success: true,
      message: 'WhatsApp session restarted successfully'
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
export const forceRestart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('[WAHA Controller] Force restart session request received');
    const userId = req.user!.id;
    const sessionManager = getSessionManager();
    await sessionManager.stopSessionForUser(userId);
    const wahaService = await getWAHAServiceForUser(userId);
    
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
export const getGroupParticipants = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { groupId } = req.params;
    const wahaService = await getWAHAServiceForUser(userId);
    
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
export const getGroupDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { groupId } = req.params;
    const wahaService = await getWAHAServiceForUser(userId);
    
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
export const refreshGroups = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const wahaService = await getWAHAServiceForUser(userId);
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

export const refreshChats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const wahaService = await getWAHAServiceForUser(userId);
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
    // Health check doesn't require auth - use default session
    const wahaService = new (await import('../../services/wahaService')).default('health-check');
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
export const initializeSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('[WAHA Controller] 🚀 MANUAL session initialization request received');
    const userId = req.user!.id;
    const wahaService = await getWAHAServiceForUser(userId);
    
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
export const restartFailedSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('[WAHA Controller] 🔄 Session restart request received');
    const userId = req.user!.id;
    const sessionManager = getSessionManager();
    await sessionManager.restartSessionForUser(userId);
    
    // Check current session status
    const wahaService = await getWAHAServiceForUser(userId);
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
export const autoRecoverSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('[WAHA Controller] 🔄 Auto-recovery request received');
    const userId = req.user!.id;
    const sessionManager = getSessionManager();
    const result = await sessionManager.validateAndRecoverSession(userId);
    
    // Check if auto-recovery is needed
    const wahaService = await getWAHAServiceForUser(userId);
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
 * Extract image from WhatsApp message (Shula-style functionality)
 */
export const extractImageFromMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    
    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required'
      });
    }
    
    console.log(`[WAHA Controller] 📷 Extracting image from message: ${messageId}`);
    const userId = req.user!.id;
    const wahaService = await getWAHAServiceForUser(userId);
    
    // Extract image using WAHA service
    const extractionResult = await wahaService.extractImageFromMessage(messageId);
    
    if (extractionResult.success) {
      console.log(`[WAHA Controller] ✅ Image extracted successfully: ${extractionResult.filename}`);
      
      res.json({
        success: true,
        data: {
          messageId,
          filename: extractionResult.filename,
          filePath: extractionResult.filePath,
          fileSize: extractionResult.fileSize,
          mimeType: extractionResult.mimeType,
          extractedAt: new Date().toISOString(),
          message: 'Image extracted successfully'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: extractionResult.error || 'Failed to extract image from message'
      });
    }
  } catch (error: any) {
    console.error('[WAHA Controller] ❌ Error extracting image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to extract image: ' + (error?.message || 'Unknown error'),
      details: error?.response?.data || error.message
    });
  }
};
/**
 * Recreate session with new engine configuration
 * Use this when you change WAHA_ENGINE environment variable
 */
export const recreateSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('[WAHA Controller] 🔄 Session recreation request received');
    const userId = req.user!.id;
    const sessionManager = getSessionManager();
    await sessionManager.stopSessionForUser(userId);
    const wahaService = await getWAHAServiceForUser(userId);
    
    // Get current session info
    let currentStatus;
    try {
      currentStatus = await wahaService.getSessionStatus();
      console.log('[WAHA Controller] Current session status:', currentStatus);
    } catch (error) {
      currentStatus = { status: 'UNKNOWN', engine: { engine: 'UNKNOWN' } };
    }
    
    // Recreate session with new engine configuration
    console.log('[WAHA Controller] 🔧 Recreating session with new engine configuration...');
    const newSession = await wahaService.recreateSessionWithEngine();
    
    // Get updated status
    let newStatus;
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for session to initialize
      newStatus = await wahaService.getSessionStatus();
    } catch (error) {
      newStatus = { status: 'STARTING', engine: { engine: 'CONFIGURING' } };
    }
    
    console.log('[WAHA Controller] ✅ Session recreation completed');
    res.json({
      success: true,
      data: {
        message: 'Session recreated with new engine configuration',
        previousEngine: currentStatus?.engine?.engine || 'UNKNOWN',
        newEngine: newStatus?.engine?.engine || 'CONFIGURING',
        sessionStatus: newStatus?.status || 'STARTING',
        needsQR: newStatus?.status === 'SCAN_QR_CODE' || newStatus?.status === 'STARTING'
      }
    });
    
  } catch (error: any) {
    console.error('[WAHA Controller] ❌ Error recreating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recreate session: ' + (error?.message || 'Unknown error'),
      details: {
        status: error?.response?.status,
        message: error?.response?.data || error.message
      }
    });
  }
};

/**
 * Clear WAHA service caches and force fresh status check
 */
export const clearCaches = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('[WAHA Controller] 🗑️ Cache clearing request received');
    const userId = req.user!.id;
    const wahaService = await getWAHAServiceForUser(userId);
    
    // Clear all caches
    wahaService.clearAllCaches();
    
    // Get fresh status
    const freshStatus = await wahaService.getSessionStatus();
    
    console.log('[WAHA Controller] ✅ Caches cleared, fresh status retrieved');
    res.json({
      success: true,
      data: {
        message: 'Caches cleared successfully',
        freshStatus: {
          status: freshStatus.status,
          isAuthenticated: !!freshStatus.me,
          engine: freshStatus.engine,
          me: freshStatus.me
        }
      }
    });
    
  } catch (error: any) {
    console.error('[WAHA Controller] ❌ Error clearing caches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear caches: ' + (error?.message || 'Unknown error'),
      details: error?.response?.data || error.message
    });
  }
};

/**
 * Serve downloaded WhatsApp media files
 */
export const getMediaFile = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required'
      });
    }

    console.log(`[WAHA Controller] Serving media file for message: ${messageId}`);

    // Find the media file
    const mediaFile = whatsappMediaService.getMediaFile(messageId);

    if (!mediaFile || !mediaFile.exists) {
      return res.status(404).json({
        success: false,
        error: 'Media file not found'
      });
    }

    // Check if file exists on disk
    if (!fs.existsSync(mediaFile.path!)) {
      return res.status(404).json({
        success: false,
        error: 'Media file not found on disk'
      });
    }

    // Get file stats
    const stat = fs.statSync(mediaFile.path!);

    // Set appropriate headers
    const ext = path.extname(mediaFile.path!).toLowerCase();
    let contentType = 'application/octet-stream';

    // Set content type based on file extension
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.mp4':
        contentType = 'video/mp4';
        break;
      case '.mp3':
        contentType = 'audio/mpeg';
        break;
      case '.ogg':
        contentType = 'audio/ogg';
        break;
      case '.wav':
        contentType = 'audio/wav';
        break;
      case '.pdf':
        contentType = 'application/pdf';
        break;
      default:
        contentType = 'application/octet-stream';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    // Stream the file
    const fileStream = fs.createReadStream(mediaFile.path!);
    fileStream.pipe(res);

    // Handle stream errors
    fileStream.on('error', (error) => {
      console.error(`[WAHA Controller] Error streaming media file ${messageId}:`, error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Error streaming media file'
        });
      }
    });

  } catch (error: any) {
    console.error('[WAHA Controller] ❌ Error serving media file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to serve media file'
    });
  }
};

/**
 * Get media download statistics
 */
export const getMediaStats = async (req: Request, res: Response) => {
  try {
    const stats = whatsappMediaService.getStorageStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('[WAHA Controller] ❌ Error getting media stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get media statistics'
    });
  }
};

/**
 * Trigger manual message polling for testing
 */
export const triggerMessagePolling = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('[WAHA Controller] 🔄 Manual message polling triggered');
    const userId = req.user!.id;
    const wahaService = await getWAHAServiceForUser(userId);
    
    // Set polling timestamp for specified hours back or default 24 hours
    const hoursBack = req.query.hoursBack ? parseInt(req.query.hoursBack as string) : 24;
    const oldTimestamp = (wahaService as any).lastPolledTimestamp;
    
    // Temporarily set polling timestamp to capture recent messages
    (wahaService as any).lastPolledTimestamp = Date.now() - (hoursBack * 60 * 60 * 1000);
    console.log(`[WAHA Controller] 📅 Set polling timestamp to ${hoursBack} hours ago: ${new Date((wahaService as any).lastPolledTimestamp)}`);
    
    // Trigger manual polling
    await (wahaService as any).pollForNewMessages();
    
    console.log('[WAHA Controller] ✅ Manual polling completed');
    res.json({
      success: true,
      message: `Manual message polling completed for last ${hoursBack} hours`,
      data: {
        hoursBack,
        pollingTimestamp: new Date((wahaService as any).lastPolledTimestamp).toISOString(),
        previousTimestamp: new Date(oldTimestamp).toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('[WAHA Controller] ❌ Error triggering manual polling:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger manual polling: ' + error.message
    });
  }
};

/**
 * Create historical message backfill for specific date range
 */
export const backfillMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate, groupId } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required (YYYY-MM-DD format)'
      });
    }
    
    console.log(`[WAHA Controller] 📥 Starting message backfill: ${startDate} to ${endDate}`);
    const userId = req.user!.id;
    const wahaService = await getWAHAServiceForUser(userId);
    
    // Convert dates to timestamps
    const startTimestamp = new Date(startDate + 'T00:00:00Z').getTime();
    const endTimestamp = new Date(endDate + 'T23:59:59Z').getTime();
    
    // Temporarily set polling timestamp to start date
    const originalTimestamp = (wahaService as any).lastPolledTimestamp;
    (wahaService as any).lastPolledTimestamp = startTimestamp;
    
    let totalMessages = 0;
    const results = [];
    
    // Get all chats or specific group
    const chats = groupId ? 
      [await wahaService.getGroupDetails(groupId)] : 
      await wahaService.getChats('default', { limit: 100 });
    
    console.log(`[WAHA Controller] Processing ${chats.length} chats for backfill`);
    
    for (const chat of chats) {
      if (!chat.isGroup && !groupId) continue; // Only groups unless specific groupId provided
      
      try {
        // Get messages for this chat
        const messages = await wahaService.getMessages(chat.id, 100);
        
        for (const message of messages) {
          const messageTimestamp = (message.timestamp || 0) * 1000; // Convert to milliseconds
          
          // Only process messages in our date range
          if (messageTimestamp >= startTimestamp && messageTimestamp <= endTimestamp) {
            // Prepare message data
            const messageData = {
              id: message.id,
              timestamp: message.timestamp,
              from: message.from,
              fromMe: message.fromMe,
              body: message.body,
              type: message.type || 'text',
              chatId: chat.id,
              isGroup: chat.isGroup,
              groupName: chat.name,
              contactName: message.contactName || message.from,
              hasMedia: message.hasMedia || false,
              mimeType: message.mimeType,
              mediaUrl: message.mediaUrl
            };
            
            // Save to database
            await (wahaService as any).saveMessageToDatabase(messageData);
            totalMessages++;
          }
        }
        
        results.push({
          chatId: chat.id,
          chatName: chat.name,
          messageCount: messages.filter(m => {
            const ts = (m.timestamp || 0) * 1000;
            return ts >= startTimestamp && ts <= endTimestamp;
          }).length
        });
        
      } catch (chatError) {
        console.error(`[WAHA Controller] Error processing chat ${chat.id}:`, chatError);
        results.push({
          chatId: chat.id,
          chatName: chat.name,
          error: chatError.message
        });
      }
    }
    
    // Restore original timestamp
    (wahaService as any).lastPolledTimestamp = originalTimestamp;
    
    console.log(`[WAHA Controller] ✅ Backfill completed: ${totalMessages} messages processed`);
    res.json({
      success: true,
      message: `Message backfill completed`,
      data: {
        totalMessages,
        dateRange: { startDate, endDate },
        chatsProcessed: results.length,
        results
      }
    });
    
  } catch (error: any) {
    console.error('[WAHA Controller] ❌ Error during message backfill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to backfill messages: ' + error.message
    });
  }
};
