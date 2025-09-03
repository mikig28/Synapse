"use strict";
/**
 * WAHA Routes - Modern WhatsApp API Routes
 * Replaces whatsappRoutes.ts with WAHA-based implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wahaController_1 = require("../controllers/wahaController");
const router = (0, express_1.Router)();
// Health check
router.get('/health', wahaController_1.healthCheck);
// Session management
router.post('/session/start', wahaController_1.startSession);
router.post('/session/stop', wahaController_1.stopSession);
router.post('/session/initialize', wahaController_1.initializeSession);
router.get('/status', wahaController_1.getStatus);
router.get('/monitoring/stats', wahaController_1.getMonitoringStats);
// Authentication - WAHA compliant endpoints
router.post('/auth/qr', wahaController_1.getQR);
router.get('/qr', wahaController_1.getQR); // Legacy support during transition
router.post('/auth/phone', wahaController_1.sendPhoneAuthCode);
router.post('/auth/verify', wahaController_1.verifyPhoneAuthCode);
// Messaging
router.post('/send', wahaController_1.sendMessage);
router.post('/send-media', wahaController_1.sendMedia);
// Chat management
router.get('/chats', wahaController_1.getChats);
router.get('/groups', wahaController_1.getGroups);
router.get('/private-chats', wahaController_1.getPrivateChats);
router.get('/messages/:chatId', wahaController_1.getMessages);
router.get('/messages', wahaController_1.getMessages); // Support query param format
router.post('/refresh-chats', wahaController_1.refreshChats);
router.post('/refresh-groups', wahaController_1.refreshGroups);
// Session management
router.post('/restart', wahaController_1.restartSession);
router.post('/restart-failed', wahaController_1.restartFailedSession);
router.post('/recreate-session', wahaController_1.recreateSession);
router.post('/clear-caches', wahaController_1.clearCaches);
router.post('/auto-recover', wahaController_1.autoRecoverSession);
router.post('/force-restart', wahaController_1.forceRestart);
router.post('/force-history-sync', wahaController_1.forceHistorySync);
// Monitoring
router.get('/monitored-keywords', wahaController_1.getMonitoredKeywords);
router.post('/monitored-keywords', wahaController_1.addMonitoredKeyword);
router.delete('/monitored-keywords/:keyword', wahaController_1.removeMonitoredKeyword);
// Media extraction routes
router.post('/media/:messageId/extract-image', wahaController_1.extractImageFromMessage);
// Webhook for WAHA events
router.post('/webhook', wahaController_1.webhook);
// Legacy compatibility routes (for gradual migration)
router.get('/connection-status', wahaController_1.getStatus);
router.post('/send-message', wahaController_1.sendMessage);
exports.default = router;
