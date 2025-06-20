import express from 'express';
import { 
  handleWhatsAppWebhook,
  getWhatsAppContacts,
  getContactMessages,
  sendWhatsAppMessage,
  getWhatsAppStats,
  updateWhatsAppConfig,
  getConnectionStatus,
  getQRCode,
  restartWhatsAppService
} from '../controllers/whatsappController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Webhook routes (no auth required for WhatsApp webhook calls)
router.get('/webhook', handleWhatsAppWebhook);
router.post('/webhook', handleWhatsAppWebhook);

// Protected routes (require authentication)
router.use(authMiddleware);

// Contact management
router.get('/contacts', getWhatsAppContacts);
router.get('/contacts/:contactId/messages', getContactMessages);

// Message management
router.post('/send', sendWhatsAppMessage);

// Analytics and statistics
router.get('/stats', getWhatsAppStats);

// Configuration
router.post('/config', updateWhatsAppConfig);
router.get('/status', getConnectionStatus);

// WhatsApp Web.js service management
router.get('/qr', getQRCode);
router.post('/restart', restartWhatsAppService);

export default router; 