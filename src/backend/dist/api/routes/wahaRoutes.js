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
router.get('/status', wahaController_1.getStatus);
// Authentication
router.get('/qr', wahaController_1.getQR);
// Messaging
router.post('/send', wahaController_1.sendMessage);
router.post('/send-media', wahaController_1.sendMedia);
// Chat management
router.get('/chats', wahaController_1.getChats);
router.get('/messages/:chatId', wahaController_1.getMessages);
// Webhook for WAHA events
router.post('/webhook', wahaController_1.webhook);
// Legacy compatibility routes (for gradual migration)
router.get('/connection-status', wahaController_1.getStatus);
router.post('/send-message', wahaController_1.sendMessage);
exports.default = router;
