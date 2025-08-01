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
    const status = wahaService.getStatus();
    
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
    const wahaService = getWAHAService();
    const qrDataUrl = await wahaService.getQRCode();
    
    res.json({
      success: true,
      data: {
        qr: qrDataUrl,
        available: true
      }
    });
  } catch (error) {
    console.error('[WAHA Controller] Error getting QR code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get QR code'
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