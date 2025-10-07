/**
 * WAHA Routes - Modern WhatsApp API Routes
 * Replaces whatsappRoutes.ts with WAHA-based implementation
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
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
  extractImageFromMessage,
  getMediaFile,
  getMediaStats,
  triggerMessagePolling,
  backfillMessages
} from '../controllers/wahaController';

const router = Router();

// CORS middleware for WAHA routes
router.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://synapse-frontend.onrender.com',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, X-Request-ID');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Health check (no auth required)
router.get('/health', healthCheck);

// Webhook endpoint (no auth required - WhatsApp webhooks don't send auth)
router.post('/webhook', webhook);

// All other routes require authentication
router.use(authMiddleware);

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
// Compatibility: some frontends call /contacts for private chats
router.get('/contacts', getPrivateChats);
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

// Media serving routes
router.get('/media/:messageId', getMediaFile);
router.get('/media-stats', getMediaStats);

// Message polling and backfill routes
router.post('/trigger-polling', triggerMessagePolling);
router.post('/backfill-messages', backfillMessages);

// Legacy compatibility routes (for gradual migration)
router.get('/connection-status', getStatus);
router.post('/send-message', sendMessage);

export default router;