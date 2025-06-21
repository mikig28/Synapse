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
  restartWhatsAppService,
  getWhatsAppGroups,
  getWhatsAppPrivateChats,
  getWhatsAppMessages,
  refreshWhatsAppChats,
  addMonitoredKeyword,
  removeMonitoredKeyword,
  getMonitoredKeywords,
  clearWhatsAppAuth,
  getDiagnostics
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

// Groups and chats
router.get('/groups', getWhatsAppGroups);
router.get('/private-chats', getWhatsAppPrivateChats);
router.get('/messages', getWhatsAppMessages);
router.post('/refresh-chats', refreshWhatsAppChats);

// Monitoring
router.get('/monitored-keywords', getMonitoredKeywords);
router.post('/monitored-keywords', addMonitoredKeyword);
router.delete('/monitored-keywords/:keyword', removeMonitoredKeyword);

// Authentication management
router.post('/clear-auth', clearWhatsAppAuth);

// Diagnostics
router.get('/diagnostics', getDiagnostics);

export default router; 