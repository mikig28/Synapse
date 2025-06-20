import { Request, Response } from 'express';
import WhatsAppMessage from '../../models/WhatsAppMessage';
import WhatsAppContact from '../../models/WhatsAppContact';
import { io } from '../../server';
import axios from 'axios';

interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: {
            body: string;
          };
          type: string;
          context?: {
            from: string;
            id: string;
          };
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

export const handleWhatsAppWebhook = async (req: Request, res: Response) => {
  console.log("[WhatsApp Webhook] Received webhook:");
  console.log("[WhatsApp Webhook] Headers:", JSON.stringify(req.headers, null, 2));
  console.log("[WhatsApp Webhook] Body:", JSON.stringify(req.body, null, 2));

  // WhatsApp webhook verification
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Webhook verification for Meta WhatsApp Business API
  if (mode && token) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'your_verify_token_here';
    
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[WhatsApp Webhook] WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
      return;
    } else {
      console.error('[WhatsApp Webhook] Failed validation. Token mismatch.');
      res.sendStatus(403);
      return;
    }
  }

  // Process incoming webhook payload
  try {
    const payload: WhatsAppWebhookPayload = req.body;
    
    if (payload.object === 'whatsapp_business_account') {
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            await processIncomingMessages(change.value);
          }
        }
      }
    }
    
    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('[WhatsApp Webhook] Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
};

async function processIncomingMessages(messageData: any) {
  const { messages, contacts, metadata } = messageData;
  
  if (messages) {
    for (const message of messages) {
      try {
        // Process contact information
        let contact = await WhatsAppContact.findOne({ phoneNumber: message.from });
        
        if (!contact) {
          // Find contact name from the contacts array if available
          const contactInfo = contacts?.find((c: any) => c.wa_id === message.from);
          
          contact = new WhatsAppContact({
            phoneNumber: message.from,
            name: contactInfo?.profile?.name || `Contact ${message.from}`,
            isOnline: true,
            lastSeen: new Date(),
            unreadCount: 1
          });
          
          await contact.save();
          console.log(`[WhatsApp] Created new contact: ${contact.name} (${contact.phoneNumber})`);
        } else {
          // Update existing contact
          contact.lastSeen = new Date();
          contact.unreadCount += 1;
          contact.isOnline = true;
          await contact.save();
        }
        
        // Save the message
        const whatsappMessage = new WhatsAppMessage({
          messageId: message.id,
          from: message.from,
          to: metadata.phone_number_id,
          message: message.text?.body || '',
          timestamp: new Date(parseInt(message.timestamp) * 1000),
          type: message.type,
          status: 'received',
          isIncoming: true,
          contactId: contact._id
        });
        
        await whatsappMessage.save();
        console.log(`[WhatsApp] Saved message from ${contact.name}: ${message.text?.body}`);
        
        // Emit real-time update to frontend
        const io_instance = (global as any).io;
        if (io_instance) {
          io_instance.emit('whatsapp:message', {
            message: whatsappMessage,
            contact: contact
          });
        }
        
        // Auto-reply logic (if enabled)
        await handleAutoReply(message, contact);
        
      } catch (error) {
        console.error('[WhatsApp] Error processing message:', error);
      }
    }
  }
}

async function handleAutoReply(incomingMessage: any, contact: any) {
  // Simple auto-reply logic - can be enhanced based on business rules
  const autoReplyEnabled = process.env.WHATSAPP_AUTO_REPLY_ENABLED === 'true';
  
  if (!autoReplyEnabled) return;
  
  const businessHours = isBusinessHours();
  let replyMessage = '';
  
  if (businessHours) {
    replyMessage = "Thank you for contacting us! We'll get back to you shortly.";
  } else {
    replyMessage = "Thank you for your message. We're currently closed but will respond during business hours.";
  }
  
  // Here you would integrate with WhatsApp Business API to send the reply
  // For now, we'll just log it
  console.log(`[WhatsApp Auto-Reply] Would send to ${contact.name}: ${replyMessage}`);
}

function isBusinessHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Business hours: Monday-Friday, 9 AM - 6 PM
  return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
}

// Get all WhatsApp contacts for a user
export const getWhatsAppContacts = async (req: Request, res: Response) => {
  try {
    const contacts = await WhatsAppContact.find()
      .sort({ lastSeen: -1 })
      .limit(50);
    
    res.json({
      success: true,
      data: contacts
    });
  } catch (error) {
    console.error('[WhatsApp] Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contacts'
    });
  }
};

// Get messages for a specific contact
export const getContactMessages = async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const messages = await WhatsAppMessage.find({ contactId })
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('contactId');
    
    res.json({
      success: true,
      data: messages.reverse() // Reverse to show chronological order
    });
  } catch (error) {
    console.error('[WhatsApp] Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
};

// Send a WhatsApp message
export const sendWhatsAppMessage = async (req: Request, res: Response) => {
  try {
    const { to, message, type = 'text' } = req.body;
    
    // Here you would integrate with WhatsApp Business API
    // For now, we'll simulate sending and save to database
    
    const contact = await WhatsAppContact.findOne({ phoneNumber: to });
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }
    
    const whatsappMessage = new WhatsAppMessage({
      messageId: `msg_${Date.now()}`,
      from: process.env.WHATSAPP_BUSINESS_PHONE || 'business',
      to: to,
      message: message,
      timestamp: new Date(),
      type: type,
      status: 'sent',
      isIncoming: false,
      contactId: contact._id
    });
    
    await whatsappMessage.save();
    
    // Reset unread count for this contact
    contact.unreadCount = 0;
    await contact.save();
    
    // Emit real-time update
    const io_instance = (global as any).io;
    if (io_instance) {
      io_instance.emit('whatsapp:message', {
        message: whatsappMessage,
        contact: contact
      });
    }
    
    console.log(`[WhatsApp] Message sent to ${contact.name}: ${message}`);
    
    res.json({
      success: true,
      data: whatsappMessage
    });
  } catch (error) {
    console.error('[WhatsApp] Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
};

// Get WhatsApp statistics
export const getWhatsAppStats = async (req: Request, res: Response) => {
  try {
    const totalContacts = await WhatsAppContact.countDocuments();
    const totalMessages = await WhatsAppMessage.countDocuments();
    
    // Messages this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const messagesThisWeek = await WhatsAppMessage.countDocuments({
      timestamp: { $gte: weekAgo }
    });
    
    // Calculate response rate (simplified)
    const incomingMessages = await WhatsAppMessage.countDocuments({ isIncoming: true });
    const outgoingMessages = await WhatsAppMessage.countDocuments({ isIncoming: false });
    const responseRate = incomingMessages > 0 ? Math.round((outgoingMessages / incomingMessages) * 100) : 0;
    
    res.json({
      success: true,
      data: {
        totalContacts,
        totalMessages,
        messagesThisWeek,
        responseRate,
        avgResponseTime: 120 // This would be calculated from actual data
      }
    });
  } catch (error) {
    console.error('[WhatsApp] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
};

// Update WhatsApp configuration
export const updateWhatsAppConfig = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, webhookUrl, verifyToken, autoReply } = req.body;
    
    // Here you would save configuration to database or environment
    // For now, we'll just return success
    
    console.log('[WhatsApp] Configuration updated:', {
      phoneNumber,
      webhookUrl,
      autoReply
    });
    
    res.json({
      success: true,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    console.error('[WhatsApp] Error updating config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration'
    });
  }
};

// Get WhatsApp connection status
export const getConnectionStatus = async (req: Request, res: Response) => {
  try {
    // Here you would check the actual connection status with WhatsApp Business API
    const status = {
      connected: true, // This would be determined by actual API health check
      lastHeartbeat: new Date(),
      webhookConfigured: true,
      businessPhoneVerified: true
    };
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('[WhatsApp] Error checking connection status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check connection status'
    });
  }
}; 