/**
 * WAHA Routes - Modern WhatsApp API Routes
 * Replaces whatsappRoutes.ts with WAHA-based implementation
 */

import { Router } from 'express';
import {
  getStatus,
  getQR,
  sendMessage,
  sendMedia,
  getChats,
  getMessages,
  startSession,
  stopSession,
  webhook,
  healthCheck
} from '../controllers/wahaController';

const router = Router();

// Health check
router.get('/health', healthCheck);

// Session management
router.post('/session/start', startSession);
router.post('/session/stop', stopSession);
router.get('/status', getStatus);

// Authentication
router.get('/qr', getQR);

// Messaging
router.post('/send', sendMessage);
router.post('/send-media', sendMedia);

// Chat management
router.get('/chats', getChats);
router.get('/messages/:chatId', getMessages);

// Webhook for WAHA events
router.post('/webhook', webhook);

// Legacy compatibility routes (for gradual migration)
router.get('/connection-status', getStatus);
router.post('/send-message', sendMessage);

export default router;