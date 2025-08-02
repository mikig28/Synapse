"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const whatsappController_1 = require("../controllers/whatsappController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Webhook routes (no auth required for WhatsApp webhook calls)
router.get('/webhook', whatsappController_1.handleWhatsAppWebhook);
router.post('/webhook', whatsappController_1.handleWhatsAppWebhook);
// Protected routes (require authentication)
router.use(authMiddleware_1.authMiddleware);
// Contact management
router.get('/contacts', whatsappController_1.getWhatsAppContacts);
router.get('/contacts/:contactId/messages', whatsappController_1.getContactMessages);
// Message management
router.post('/send', whatsappController_1.sendWhatsAppMessage);
// Analytics and statistics
router.get('/stats', whatsappController_1.getWhatsAppStats);
// Configuration
router.post('/config', whatsappController_1.updateWhatsAppConfig);
router.get('/status', whatsappController_1.getConnectionStatus);
// WhatsApp Web.js service management
router.get('/qr', whatsappController_1.getQRCode);
router.post('/restart', whatsappController_1.restartWhatsAppService);
// Phone number authentication
router.post('/auth/phone', whatsappController_1.sendPhoneAuthCode);
router.post('/auth/verify', whatsappController_1.verifyPhoneAuthCode);
// Groups and chats
router.get('/groups', whatsappController_1.getWhatsAppGroups);
router.get('/private-chats', whatsappController_1.getWhatsAppPrivateChats);
router.get('/messages', whatsappController_1.getWhatsAppMessages);
router.post('/refresh-chats', whatsappController_1.refreshWhatsAppChats);
// Monitoring
router.get('/monitored-keywords', whatsappController_1.getMonitoredKeywords);
router.post('/monitored-keywords', whatsappController_1.addMonitoredKeyword);
router.delete('/monitored-keywords/:keyword', whatsappController_1.removeMonitoredKeyword);
// Authentication management
router.post('/clear-auth', whatsappController_1.clearWhatsAppAuth);
// Diagnostics
router.get('/diagnostics', whatsappController_1.getDiagnostics);
// Force restart (clears auth and restarts)
router.post('/force-restart', whatsappController_1.forceRestart);
// Force history sync (requests chat history explicitly)
router.post('/force-history-sync', whatsappController_1.forceHistorySync);
exports.default = router;
