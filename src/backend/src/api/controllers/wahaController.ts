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
    const wahaStatus = wahaService.getStatus();
    
    // Convert WAHA status to format expected by frontend
    const status = {
      connected: wahaStatus.isReady,
      authenticated: wahaStatus.isReady, // Add authenticated field
      lastHeartbeat: new Date(),
      serviceStatus: wahaStatus.status,
      isReady: wahaStatus.isReady,
      isClientReady: wahaStatus.isReady,
      groupsCount: 0,
      privateChatsCount: 0,
      messagesCount: 0,
      qrAvailable: wahaStatus.qrAvailable,
      timestamp: wahaStatus.timestamp,
      monitoredKeywords: []
    };
    
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
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: 'Missing chatId parameter'
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
 * Webhook handler for WAHA events
 */
export const webhook = async (req: Request, res: Response) => {
  try {
    const wahaService = getWAHAService();
    wahaService.handleWebhook(req.body);
    
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
    await wahaService.stopSession();
    await wahaService.startSession();
    
    res.json({
      success: true,
      message: 'WhatsApp service restart initiated'
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
    
    // Get fresh chats data
    await wahaService.getChats();
    
    res.json({
      success: true,
      message: 'WhatsApp chats refreshed successfully'
    });
  } catch (error) {
    console.error('[WAHA Controller] Error refreshing chats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh WhatsApp chats'
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