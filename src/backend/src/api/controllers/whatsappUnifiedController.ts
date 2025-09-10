/**
 * WhatsApp Unified Controller
 * Provides complete WhatsApp Web functionality through unified service
 * Handles both groups and private chats, sending, media downloads
 */

import { Request, Response } from 'express';
import WhatsAppUnifiedService from '../../services/whatsappUnifiedService';

// Get unified service instance
const getUnifiedService = () => {
  return WhatsAppUnifiedService.getInstance();
};

/**
 * Get all chats (groups + private) - unified interface
 * Replaces separate private-chats and groups endpoints
 */
export const getAllChats = async (req: Request, res: Response) => {
  try {
    console.log('[WhatsApp Unified Controller] Getting all chats (groups + private)...');
    
    const unifiedService = getUnifiedService();
    
    // Check service status first
    const status = await unifiedService.getStatus();
    if (!status.isReady) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp session is not ready',
        details: {
          wahaStatus: status.wahaStatus,
          suggestion: 'Please authenticate with WhatsApp first'
        }
      });
    }
    
    // Parse query parameters for pagination/filtering
    const limit = req.query.limit ? Math.max(1, Math.min(500, parseInt(req.query.limit as string))) : undefined;
    const offset = req.query.offset ? Math.max(0, parseInt(req.query.offset as string)) : undefined;
    const sortBy = (req.query.sortBy as 'conversationTimestamp' | 'name' | undefined) || 'conversationTimestamp';
    const sortOrder = (req.query.sortOrder as 'desc' | 'asc' | undefined) || 'desc';
    const includeArchived = req.query.includeArchived === 'true';
    const type = req.query.type as 'all' | 'groups' | 'private' | undefined; // Optional filter
    
    const startTime = Date.now();
    
    // Get all chats through unified service
    let allChats = await unifiedService.getAllChats({
      limit,
      offset,
      sortBy,
      sortOrder,
      includeArchived
    });
    
    // Apply type filtering if requested
    if (type === 'groups') {
      allChats = allChats.filter(chat => chat.isGroup);
    } else if (type === 'private') {
      allChats = allChats.filter(chat => !chat.isGroup);
    }
    
    const duration = Date.now() - startTime;
    
    // Calculate statistics
    const stats = {
      total: allChats.length,
      groups: allChats.filter(chat => chat.isGroup).length,
      private: allChats.filter(chat => !chat.isGroup).length
    };
    
    console.log(`[WhatsApp Unified Controller] ✅ Retrieved ${stats.total} chats (${stats.groups} groups, ${stats.private} private) in ${duration}ms`);
    
    res.json({
      success: true,
      data: allChats,
      stats,
      pagination: {
        limit,
        offset: offset || 0,
        total: stats.total,
        hasMore: limit ? (offset || 0) + allChats.length < stats.total : false
      },
      meta: {
        count: allChats.length,
        loadTime: duration,
        type: type || 'all'
      }
    });
  } catch (error: any) {
    console.error('[WhatsApp Unified Controller] Error getting all chats:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp chats',
      details: error.message
    });
  }
};

/**
 * Get private chats only (for backward compatibility)
 */
export const getPrivateChats = async (req: Request, res: Response) => {
  try {
    console.log('[WhatsApp Unified Controller] Getting private chats...');
    
    const unifiedService = getUnifiedService();
    const startTime = Date.now();
    
    const privateChats = await unifiedService.getPrivateChats({
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any
    });
    
    const duration = Date.now() - startTime;
    
    console.log(`[WhatsApp Unified Controller] ✅ Retrieved ${privateChats.length} private chats in ${duration}ms`);
    
    res.json({
      success: true,
      data: privateChats,
      pagination: {
        total: privateChats.length
      },
      meta: {
        count: privateChats.length,
        loadTime: duration,
        type: 'private'
      }
    });
  } catch (error: any) {
    console.error('[WhatsApp Unified Controller] Error getting private chats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get private chats',
      details: error.message
    });
  }
};

/**
 * Get group chats only
 */
export const getGroupChats = async (req: Request, res: Response) => {
  try {
    console.log('[WhatsApp Unified Controller] Getting group chats...');
    
    const unifiedService = getUnifiedService();
    const startTime = Date.now();
    
    const groupChats = await unifiedService.getGroups({
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any
    });
    
    const duration = Date.now() - startTime;
    
    console.log(`[WhatsApp Unified Controller] ✅ Retrieved ${groupChats.length} group chats in ${duration}ms`);
    
    res.json({
      success: true,
      data: groupChats,
      pagination: {
        total: groupChats.length
      },
      meta: {
        count: groupChats.length,
        loadTime: duration,
        type: 'groups'
      }
    });
  } catch (error: any) {
    console.error('[WhatsApp Unified Controller] Error getting group chats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get group chats',
      details: error.message
    });
  }
};

/**
 * Get messages for a specific chat
 */
export const getChatMessages = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    console.log(`[WhatsApp Unified Controller] Getting messages for chat: ${chatId}`);
    
    const unifiedService = getUnifiedService();
    const messages = await unifiedService.getMessages(chatId, { limit, offset });
    
    console.log(`[WhatsApp Unified Controller] ✅ Retrieved ${messages.length} messages for chat ${chatId}`);
    
    res.json({
      success: true,
      data: messages,
      pagination: {
        limit,
        offset,
        total: messages.length
      },
      meta: {
        chatId,
        count: messages.length
      }
    });
  } catch (error: any) {
    console.error('[WhatsApp Unified Controller] Error getting chat messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chat messages',
      details: error.message
    });
  }
};

/**
 * Send message to chat
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { text, media, replyTo } = req.body;
    
    console.log(`[WhatsApp Unified Controller] Sending message to chat: ${chatId}`);
    
    if (!text && !media) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required (text or media)'
      });
    }
    
    const unifiedService = getUnifiedService();
    const result = await unifiedService.sendMessage({
      chatId,
      content: {
        text,
        media,
        replyTo
      }
    });
    
    if (result.success) {
      console.log(`[WhatsApp Unified Controller] ✅ Message sent successfully to ${chatId}`);
      res.json({
        success: true,
        messageId: result.messageId,
        message: 'Message sent successfully'
      });
    } else {
      console.error(`[WhatsApp Unified Controller] ❌ Failed to send message to ${chatId}:`, result.error);
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send message'
      });
    }
  } catch (error: any) {
    console.error('[WhatsApp Unified Controller] Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      details: error.message
    });
  }
};

/**
 * Download media from message
 */
export const downloadMedia = async (req: Request, res: Response) => {
  try {
    const { chatId, messageId } = req.params;
    const autoExtract = req.query.autoExtract !== 'false'; // Default to true
    
    console.log(`[WhatsApp Unified Controller] Downloading media for message: ${messageId} in chat: ${chatId}`);
    
    const unifiedService = getUnifiedService();
    const result = await unifiedService.downloadMedia({
      messageId,
      chatId,
      autoExtract
    });
    
    if (result.success) {
      console.log(`[WhatsApp Unified Controller] ✅ Media downloaded successfully for message ${messageId}`);
      res.json({
        success: true,
        localPath: result.localPath,
        metadata: result.metadata,
        message: 'Media downloaded successfully'
      });
    } else {
      console.warn(`[WhatsApp Unified Controller] ❌ Media download failed for message ${messageId}:`, result.error);
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to download media'
      });
    }
  } catch (error: any) {
    console.error('[WhatsApp Unified Controller] Error downloading media:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download media',
      details: error.message
    });
  }
};

/**
 * Get service status and capabilities
 */
export const getServiceStatus = async (req: Request, res: Response) => {
  try {
    const unifiedService = getUnifiedService();
    const status = await unifiedService.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    console.error('[WhatsApp Unified Controller] Error getting service status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service status',
      details: error.message
    });
  }
};

/**
 * Get QR code for authentication
 */
export const getQRCode = async (req: Request, res: Response) => {
  try {
    const unifiedService = getUnifiedService();
    const qrCode = await unifiedService.getQRCode();
    
    res.json({
      success: true,
      qrCode,
      message: 'Scan this QR code with WhatsApp to authenticate'
    });
  } catch (error: any) {
    console.error('[WhatsApp Unified Controller] Error getting QR code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get QR code',
      details: error.message
    });
  }
};