/**
 * WhatsApp Unified Routes
 * Complete WhatsApp Web functionality through unified service
 */

import express from 'express';
import {
  getAllChats,
  getPrivateChats,
  getGroupChats,
  getChatMessages,
  sendMessage,
  downloadMedia,
  getServiceStatus,
  getQRCode
} from '../controllers/whatsappUnifiedController';

const router = express.Router();

// Authentication routes
router.get('/qr-code', getQRCode);
router.get('/status', getServiceStatus);

// Chat listing routes
router.get('/chats', getAllChats); // NEW: Unified chats endpoint (groups + private)
router.get('/private-chats', getPrivateChats); // Backward compatibility
router.get('/groups', getGroupChats); // Groups only

// Chat interaction routes
router.get('/chats/:chatId/messages', getChatMessages); // Get messages for specific chat
router.post('/chats/:chatId/messages', sendMessage); // Send message to chat

// Media handling routes
router.post('/chats/:chatId/messages/:messageId/download', downloadMedia); // Download media

export default router;