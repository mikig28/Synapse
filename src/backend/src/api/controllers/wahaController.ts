/**
 * WAHA Controller - Modern WhatsApp API Controller
 * Replaces whatsappController.ts with WAHA-based implementation
 */

import { Request, Response } from 'express';
import WAHAService from '../../services/wahaService';

// Get WAHA service instance
const getWAHAService = () => {
  return WAHAService.getInstance();
};

/**
 * Get WhatsApp connection status
 */
export const getStatus = async (req: Request, res: Response) => {
  try {
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
    
    // Convert WAHA status to format expected by frontend
    const status = {
      connected: isConnected,
      authenticated: isAuthenticated,
      lastHeartbeat: new Date(),
      serviceStatus: sessionDetails?.status || wahaStatus.status,
      isReady: isConnected,
      isClientReady: isConnected,
      groupsCount: 0,
      privateChatsCount: 0,
      messagesCount: 0,
      qrAvailable: qrAvailable,
      timestamp: wahaStatus.timestamp,
      monitoredKeywords: [],
      serviceType: 'waha'
    };
    
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
    console.log('[WAHA Controller] WAHA service instance obtained');
    
    // First ensure session exists and is properly initialized
    try {
      console.log('[WAHA Controller] Ensuring session is initialized...');
      await wahaService.startSession();
      console.log('[WAHA Controller] Session initialization completed');
    } catch (sessionError) {
      console.error('[WAHA Controller] Session initialization failed:', sessionError);
      // Continue anyway - the getQRCode method will handle session creation
    }
    
    const qrDataUrl = await wahaService.getQRCode();
    console.log('[WAHA Controller] QR code generated successfully');
    
    res.json({
      success: true,
      data: {
        qrCode: qrDataUrl,
        message: 'QR code available for scanning'
      }
    });
  } catch (error) {
    console.error('[WAHA Controller] Error getting QR code:', error);
    console.error('[WAHA Controller] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error
    });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get QR code'
    });
  }
};

/**
 * Send text message
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { chatId, message, text } = req.body;
    
    if (!chatId || (!message && !text)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: chatId and message/text'
      });
    }

    const wahaService = getWAHAService();
    const messageText = message || text;
    
    const result = await wahaService.sendMessage(chatId, messageText);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[WAHA Controller] Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
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
 * Get all chats
 */
export const getChats = async (req: Request, res: Response) => {
  try {
    const wahaService = getWAHAService();
    const chats = await wahaService.getChats();
    
    res.json({
      success: true,
      data: chats
    });
  } catch (error) {
    console.error('[WAHA Controller] Error getting chats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chats'
    });
  }
};

/**
 * Get messages from specific chat
 */
export const getMessages = async (req: Request, res: Response) => {
  try {
    // Support both URL param and query param for chatId
    const chatId = req.params.chatId || req.query.chatId as string;
    const limit = parseInt(req.query.limit as string) || 50;
    
    if (!chatId) {
      // If no chatId provided, return empty messages array instead of error
      console.log('[WAHA Controller] No chatId provided, returning empty messages');
      return res.json({
        success: true,
        data: []
      });
    }

    const wahaService = getWAHAService();
    const messages = await wahaService.getMessages(chatId, limit);
    
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
    wahaService.handleWebhook(req.body);
    
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
    const { phoneNumber } = req.body;
    
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required and must be a string'
      });
    }
    
    // Clean phone number (remove non-digits)
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    
    if (cleanedPhone.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
      });
    }
    
    const wahaService = getWAHAService();
    const result = await wahaService.requestPhoneCode(cleanedPhone);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Verification code sent to your phone',
        data: {
          phoneNumber: cleanedPhone,
          codeRequested: true
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to send verification code'
      });
    }
  } catch (error: any) {
    console.error('[WAHA Controller] Error sending phone auth code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send verification code: ' + error.message
    });
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
 * Get WhatsApp groups  
 */
export const getGroups = async (req: Request, res: Response) => {
  try {
    const wahaService = getWAHAService();
    const chats = await wahaService.getChats();
    
    // Filter only groups
    const groups = chats.filter(chat => chat.isGroup);
    
    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    console.error('[WAHA Controller] Error getting groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp groups'
    });
  }
};

/**
 * Get WhatsApp private chats
 */
export const getPrivateChats = async (req: Request, res: Response) => {
  try {
    const wahaService = getWAHAService();
    const chats = await wahaService.getChats();
    
    // Filter only private chats
    const privateChats = chats.filter(chat => !chat.isGroup);
    
    res.json({
      success: true,
      data: privateChats
    });
  } catch (error) {
    console.error('[WAHA Controller] Error getting private chats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp private chats'
    });
  }
};

/**
 * Restart WhatsApp session
 */
export const restartSession = async (req: Request, res: Response) => {
  try {
    const wahaService = getWAHAService();
    
    // Stop and start the session
    try {
      await wahaService.stopSession();
    } catch (stopError) {
      console.log('[WAHA Controller] Stop session failed (session may not exist):', stopError);
    }
    
    // Always try to start/create session
    const session = await wahaService.startSession();
    
    res.json({
      success: true,
      message: 'WhatsApp service restart initiated',
      data: {
        sessionStatus: session.status,
        sessionName: session.name
      }
    });
  } catch (error) {
    console.error('[WAHA Controller] Error restarting session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restart WhatsApp service'
    });
  }
};

/**
 * Force restart WhatsApp session
 */
export const forceRestart = async (req: Request, res: Response) => {
  try {
    const wahaService = getWAHAService();
    
    // Force stop and start the session
    await wahaService.stopSession();
    await wahaService.startSession();
    
    res.json({
      success: true,
      message: 'WhatsApp service force restart initiated'
    });
  } catch (error) {
    console.error('[WAHA Controller] Error force restarting session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to force restart WhatsApp service'
    });
  }
};

/**
 * Refresh WhatsApp chats
 */
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
    
    // Get fresh chats data
    await wahaService.getChats();
    
    res.json({
      success: true,
      message: 'WhatsApp chats refreshed successfully',
      data: {
        timestamp: new Date().toISOString()
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
    console.log('[WAHA Controller] Session initialization request received');
    const wahaService = getWAHAService();
    
    const session = await wahaService.startSession();
    
    res.json({
      success: true,
      data: {
        sessionName: session.name,
        sessionStatus: session.status,
        message: 'Session initialized successfully'
      }
    });
  } catch (error) {
    console.error('[WAHA Controller] Error initializing session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize session'
    });
  }
};