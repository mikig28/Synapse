import express from 'express';
import { handleWhatsAppWebhook } from '../controllers/whatsappController';

const router = express.Router();

// Route to handle incoming WhatsApp messages (webhook)
// WhatsApp typically sends GET for verification and POST for messages
router.get('/webhook', handleWhatsAppWebhook);
router.post('/webhook', handleWhatsAppWebhook);

export default router; 