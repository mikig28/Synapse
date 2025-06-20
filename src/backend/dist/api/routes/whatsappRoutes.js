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
exports.default = router;
