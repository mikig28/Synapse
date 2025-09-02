/**
 * WAHA Routes - Modern WhatsApp API Routes
 * Replaces whatsappRoutes.ts with WAHA-based implementation
 */

import { Router } from 'express';
import {
  getStatus,
  getMonitoringStats,
  getQR,
  sendMessage,
  sendMedia,
  getChats,
  getMessages,
  startSession,
  stopSession,
  webhook,
  healthCheck,
  initializeSession,
  sendPhoneAuthCode,
  verifyPhoneAuthCode,
  getGroups,
  getPrivateChats,
  restartSession,
  restartFailedSession,
  recreateSession,
  clearCaches,
  autoRecoverSession,
  forceRestart,
  refreshChats,
  refreshGroups,
  forceHistorySync,
  getMonitoredKeywords,
  addMonitoredKeyword,
  removeMonitoredKeyword,
  extractImageFromMessage
} from '../controllers/wahaController';

const router = Router();

// Health check
router.get('/health', healthCheck);

// Session management
router.post('/session/start', startSession);
router.post('/session/stop', stopSession);
router.post('/session/initialize', initializeSession);
router.get('/status', getStatus);
router.get('/monitoring/stats', getMonitoringStats);

// Authentication - WAHA compliant endpoints
router.post('/auth/qr', getQR);
router.get('/qr', getQR); // Legacy support during transition
router.post('/auth/phone', sendPhoneAuthCode);
router.post('/auth/verify', verifyPhoneAuthCode);

// Messaging
router.post('/send', sendMessage);
router.post('/send-media', sendMedia);

// Chat management
router.get('/chats', getChats);
router.get('/groups', getGroups);
router.get('/private-chats', getPrivateChats);
router.get('/messages/:chatId', getMessages);
router.get('/messages', getMessages); // Support query param format
router.post('/refresh-chats', refreshChats);
router.post('/refresh-groups', refreshGroups);

// Session management
router.post('/restart', restartSession);
router.post('/restart-failed', restartFailedSession);
router.post('/recreate-session', recreateSession);
router.post('/clear-caches', clearCaches);
router.post('/auto-recover', autoRecoverSession);
router.post('/force-restart', forceRestart);
router.post('/force-history-sync', forceHistorySync);

// Monitoring
router.get('/monitored-keywords', getMonitoredKeywords);
router.post('/monitored-keywords', addMonitoredKeyword);
router.delete('/monitored-keywords/:keyword', removeMonitoredKeyword);

// Media extraction routes
router.post('/media/:messageId/extract-image', extractImageFromMessage);

// Webhook for WAHA events
router.post('/webhook', webhook);

// Legacy compatibility routes (for gradual migration)
router.get('/connection-status', getStatus);
router.post('/send-message', sendMessage);

export default router;