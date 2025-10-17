import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import WhatsAppMessage from '../../models/WhatsAppMessage';
import WhatsAppContact from '../../models/WhatsAppContact';
import WAHAService from '../../services/wahaService';

// Get WhatsApp service singleton instance (lazy initialization)
// Now using WAHA Plus instead of Baileys for better group syncing
const getWhatsAppService = () => {
  const sessionId = process.env.WAHA_DEFAULT_SESSION || 'default';
  return WAHAService.getInstance(sessionId);
};

// Initialize WhatsApp service listeners when needed
let serviceInitialized = false;
const initializeWhatsAppService = () => {
  if (serviceInitialized) return;
  
  const whatsappService = getWhatsAppService();
  
  // Set up event listeners for WhatsApp service
  whatsappService.on('newMessage', async (messageData) => {
    await processWhatsAppWebMessage(messageData);
    
    // Emit to Socket.io clients
    const io_instance = (global as any).io;
    if (io_instance) {
      io_instance.emit('whatsapp:message', messageData);
    }
  });

  whatsappService.on('qr', (qrData) => {
    const io_instance = (global as any).io;
    if (io_instance) {
      io_instance.emit('whatsapp:qr', qrData);
    }
  });

  whatsappService.on('status', (statusData) => {
    const io_instance = (global as any).io;
    if (io_instance) {
      io_instance.emit('whatsapp:status', statusData);
    }
  });

  whatsappService.on('chats_updated', (chatsData) => {
    console.log('[WhatsApp Controller] Received chats_updated event:', {
      groupsCount: chatsData.groupsCount,
      privateChatsCount: chatsData.privateChatsCount,
      firstGroupName: chatsData.groups?.[0]?.name || 'None'
    });
    
    const io_instance = (global as any).io;
    if (io_instance) {
      console.log('[WhatsApp Controller] Emitting whatsapp:chats_updated to Socket.io clients');
      io_instance.emit('whatsapp:chats_updated', chatsData);
    } else {
      console.log('[WhatsApp Controller] No Socket.io instance available');
    }
  });
  
  serviceInitialized = true;
};

interface WhatsAppWebMessage {
  id: string;
  body: string;
  from: string;
  fromMe: boolean;
  timestamp: number;
  type: string;
  isGroup: boolean;
  groupName?: string;
  contactName: string;
  chatId: string;
  time: string;
  isMedia: boolean;
}

// Function to normalize Baileys message types to our schema-supported types
function normalizeMessageType(messageType: string): string {
  const typeMapping: { [key: string]: string } = {
    'conversation': 'text',
    'extendedTextMessage': 'text',
    'imageMessage': 'image',
    'videoMessage': 'video',
    'audioMessage': 'audio',
    'documentMessage': 'document',
    'stickerMessage': 'image',
    'reactionMessage': 'text',
    'groupInviteMessage': 'text',
    'pollCreationMessage': 'text',
    'pollUpdateMessage': 'text',
    'liveLocationMessage': 'location',
    'templateMessage': 'text',
    'buttonsMessage': 'text',
    'listMessage': 'text',
    'protocolMessage': 'text',
    'orderMessage': 'text',
    'paymentMessage': 'text',
    'viewOnceMessage': 'text',
    'highlyStructuredMessage': 'text',
    'senderKeyDistributionMessage': 'text',
    'fastRatchetKeySenderKeyDistributionMessage': 'text',
    'sendPaymentMessage': 'text',
    'requestPaymentMessage': 'text'
  };

  // If we have a mapping, use the normalized type, otherwise keep the original
  const allowedTypes = [
    'text', 'image', 'document', 'audio', 'video', 'location', 'contact',
    'extendedTextMessage', 'senderKeyDistributionMessage', 'conversation',
    'imageMessage', 'videoMessage', 'audioMessage', 'documentMessage',
    'stickerMessage', 'reactionMessage', 'groupInviteMessage',
    'pollCreationMessage', 'pollUpdateMessage', 'liveLocationMessage',
    'templateMessage', 'buttonsMessage', 'listMessage', 'protocolMessage',
    'orderMessage', 'paymentMessage', 'viewOnceMessage', 'highlyStructuredMessage',
    'fastRatchetKeySenderKeyDistributionMessage', 'sendPaymentMessage', 'requestPaymentMessage'
  ];

  // If the type is already in our allowed list, return it as-is
  if (allowedTypes.includes(messageType)) {
    return messageType;
  }

  // If we have a mapping, use it
  if (typeMapping[messageType]) {
    return typeMapping[messageType];
  }

  // Default fallback for unknown types
  return 'text';
}

export const handleWhatsAppWebhook = async (req: Request, res: Response) => {
  console.log("[WhatsApp Webhook] Received webhook from WhatsApp Web.js service:");
  console.log("[WhatsApp Webhook] Body:", JSON.stringify(req.body, null, 2));

  try {
    const messageData: WhatsAppWebMessage = req.body;
    
    // Process the message from WhatsApp Web.js service
    await processWhatsAppWebMessage(messageData);
    
    res.status(200).json({ success: true, message: 'Message processed' });
  } catch (error) {
    console.error('[WhatsApp Webhook] Error processing webhook:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

async function processWhatsAppWebMessage(messageData: WhatsAppWebMessage) {
  try {
    // Skip messages sent by us
    if (messageData.fromMe) {
      console.log('[WhatsApp] Skipping outgoing message');
      return;
    }

    // Extract phone number from 'from' field (format: number@c.us)
    const phoneNumber = messageData.from.split('@')[0];
    
    // Process contact information
    let contact = await WhatsAppContact.findOne({ phoneNumber });
    
    if (!contact) {
      contact = new WhatsAppContact({
        phoneNumber,
        name: messageData.contactName || `Contact ${phoneNumber}`,
        isOnline: true,
        lastSeen: new Date(),
        unreadCount: 1,
        isBusinessContact: messageData.isGroup || false,
        totalMessages: 1,
        totalIncomingMessages: 1,
        totalOutgoingMessages: 0
      });
      
      await contact.save();
      console.log(`[WhatsApp] Created new contact: ${contact.name} (${contact.phoneNumber})`);
    } else {
      // Update existing contact
      contact.lastSeen = new Date();
      contact.unreadCount += 1;
      contact.isOnline = true;
      contact.lastMessage = messageData.body || '[Media]';
      contact.lastMessageTimestamp = new Date();
      // Update contact statistics manually
      contact.totalMessages += 1;
      contact.totalIncomingMessages += 1;
      await contact.save();
      console.log(`[WhatsApp] Updated existing contact: ${contact.name}`);
    }
    
    // Normalize message type for database storage
    const normalizedType = normalizeMessageType(messageData.type);
    
    // Determine chat identifiers for proper grouping
    const chatId = (messageData as any).chatId || messageData.chatId;
    const isGroup = !!messageData.isGroup;
    const groupId = isGroup ? (chatId || undefined) : undefined;
    const groupName = isGroup ? ((messageData as any).groupName || undefined) : undefined;

    // Save the message
    const whatsappMessage = new WhatsAppMessage({
      messageId: messageData.id,
      from: phoneNumber,
      // Store the chat JID so summaries can filter by group
      to: chatId || 'business',
      message: messageData.body || '',
      timestamp: new Date(messageData.timestamp * 1000),
      type: normalizedType,
      status: 'received',
      isIncoming: true,
      contactId: contact._id,
      metadata: {
        isGroup,
        groupId,
        groupName,
        contactName: messageData.contactName,
        originalType: messageData.type // Store original type for debugging
      }
    });
    
    await whatsappMessage.save();
    console.log(`[WhatsApp] Saved message from ${contact.name}: ${messageData.body || '[Media]'}`);
    
    // Emit real-time update to frontend
    const io_instance = (global as any).io;
    if (io_instance) {
      io_instance.emit('whatsapp:message', {
        message: whatsappMessage,
        contact: contact
      });
    }
    
    // Auto-reply logic (if enabled)
    await handleAutoReply(messageData, contact);
    
  } catch (error) {
    console.error('[WhatsApp] Error processing message:', error);
  }
}

async function handleAutoReply(incomingMessage: WhatsAppWebMessage, contact: any) {
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
  
  // Send auto-reply through WhatsApp Web.js service
  try {
    await sendMessageViaService(incomingMessage.from, replyMessage);
    console.log(`[WhatsApp Auto-Reply] Sent to ${contact.name}: ${replyMessage}`);
  } catch (error: any) {
    console.error('[WhatsApp Auto-Reply] Failed to send:', error.message);
  }
}

function isBusinessHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Business hours: Monday-Friday, 9 AM - 6 PM
  return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
}

// Get all WhatsApp contacts for a user
export const getWhatsAppContacts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const contacts = await WhatsAppContact.find({ userId })
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
export const getContactMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { contactId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // First verify the contact belongs to this user
    const contact = await WhatsAppContact.findOne({ _id: contactId, userId });
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }
    
    const messages = await WhatsAppMessage.find({ userId, contactId })
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

// Helper function to send message via WhatsApp service
async function sendMessageViaService(to: string, message: string) {
  try {
    console.log('[WhatsApp Service Helper] Attempting to send message:', {
      to,
      messageLength: message.length,
      messagePreview: message.substring(0, 50) + (message.length > 50 ? '...' : '')
    });

    const whatsappService = getWhatsAppService();
    const serviceStatus = await whatsappService.getStatus();
    console.log('[WhatsApp Service Helper] Service status before send:', serviceStatus);

    if (!serviceStatus.isReady) {
      throw new Error(`WhatsApp service not ready. IsReady: ${serviceStatus.isReady}, Status: ${serviceStatus.status}`);
    }
    
    const result = await whatsappService.sendMessage(to, message);
    console.log('[WhatsApp Service Helper] ✅ Message sent via WhatsApp service:', result);
    return { success: true };
  } catch (error: any) {
    console.error('[WhatsApp Service Helper] ❌ Error sending message via service:', {
      error: error.message,
      stack: error.stack,
      to,
      messageLength: message?.length
    });
    throw error;
  }
}

// Send a WhatsApp message
export const sendWhatsAppMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    console.log('[WhatsApp Controller] Send message request received:', {
      userId,
      body: req.body,
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
      }
    });
    
    const { to, message, type = 'text' } = req.body;
    
    if (!to || !message) {
      console.log('[WhatsApp Controller] ❌ Missing required fields:', { to, message, type });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to and message'
      });
    }
    
    console.log('[WhatsApp Controller] Processing send request:', {
      userId,
      to,
      messageLength: message.length,
      messagePreview: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      type
    });
    
    // Find or create contact for this user
    let contact = await WhatsAppContact.findOne({ userId, phoneNumber: to });
    if (!contact) {
      contact = new WhatsAppContact({
        userId,
        phoneNumber: to,
        name: `Contact ${to}`,
        isOnline: false,
        lastSeen: new Date(),
        unreadCount: 0,
        totalMessages: 0,
        totalIncomingMessages: 0,
        totalOutgoingMessages: 0,
        isBusinessContact: false,
        isBlocked: false,
        isMuted: false
      });
      await contact.save();
    }

    // Format the 'to' field for WhatsApp Web.js (add @c.us if not present)
    const whatsappTo = to.includes('@') ? to : `${to}@c.us`;
    
    console.log('[WhatsApp Controller] Sending message via service:', { whatsappTo, messageLength: message.length });
    
    // Send message via WhatsApp Web.js service
    const serviceResponse = await sendMessageViaService(whatsappTo, message);
    
    console.log('[WhatsApp Controller] Service response received, saving to database...');
    
    // Save the message to our database
    const whatsappMessage = new WhatsAppMessage({
      userId,
      messageId: `msg_${Date.now()}`,
      from: 'business',
      to: to,
      message: message,
      timestamp: new Date(),
      type: type,
      status: 'sent',
      isIncoming: false,
      contactId: contact._id
    });
    
    console.log('[WhatsApp Controller] Attempting to save message to database...');
    await whatsappMessage.save();
    console.log('[WhatsApp Controller] Message saved to database successfully');
    
    // Update contact statistics
    contact.unreadCount = 0; // Reset since we're responding
    contact.lastMessage = message;
    contact.lastMessageTimestamp = new Date();
    // Update contact statistics manually
    contact.totalMessages += 1;
    contact.totalOutgoingMessages += 1;
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
      data: whatsappMessage,
      serviceResponse
    });
  } catch (error: any) {
    console.error('[WhatsApp Controller] ❌ Error sending message:', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body,
      name: error.name,
      cause: error.cause
    });
    
    // Determine if it's a validation error (400) or server error (500)
    const statusCode = error.message.includes('Missing required') || 
                      error.message.includes('WhatsApp service not ready') ? 400 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to send message: ' + error.message,
      details: error.stack
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

// Get WhatsApp connection status from WhatsApp service
export const getConnectionStatus = async (req: Request, res: Response) => {
  try {
    const whatsappService = getWhatsAppService();
    initializeWhatsAppService(); // Ensure listeners are set up
    const serviceStatus = await whatsappService.getStatus();

    const status = {
      connected: serviceStatus.isReady,
      authenticated: serviceStatus.isReady,
      lastHeartbeat: new Date(),
      serviceStatus: serviceStatus.status,
      isReady: serviceStatus.isReady,
      groupsCount: 0, // WAHA doesn't expose these in status
      privateChatsCount: 0,
      messagesCount: 0,
      qrAvailable: serviceStatus.qrAvailable || false,
      timestamp: serviceStatus.timestamp
    };

    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    console.error('[WhatsApp] Error checking connection status:', error);

    res.json({
      success: true,
      data: {
        connected: false,
        lastHeartbeat: new Date(),
        serviceStatus: 'error',
        isReady: false,
        error: error.message
      }
    });
  }
};

// Get QR Code for WhatsApp Web authentication
export const getQRCode = async (req: Request, res: Response) => {
  try {
    const whatsappService = getWhatsAppService();
    const { force } = req.query;
    const sessionId = process.env.WAHA_DEFAULT_SESSION || 'default';

    // WAHA uses getQRCode() method with session name and force parameter
    const qrCode = await whatsappService.getQRCode(sessionId, force === 'true');

    if (qrCode) {
      res.json({
        success: true,
        data: {
          qrCode: qrCode,
          message: 'QR code available for scanning'
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          qrCode: null,
          message: 'WhatsApp is already connected or QR code not yet generated'
        }
      });
    }
  } catch (error: any) {
    console.error('[WhatsApp] Error getting QR code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get QR code: ' + error.message
    });
  }
};

// Restart WhatsApp service
export const restartWhatsAppService = async (req: Request, res: Response) => {
  try {
    const whatsappService = getWhatsAppService();
    const sessionId = process.env.WAHA_DEFAULT_SESSION || 'default';
    initializeWhatsAppService();

    // WAHA uses restartSession() instead of restart()
    await whatsappService.restartSession(sessionId);

    res.json({
      success: true,
      message: 'WhatsApp service restart initiated'
    });
  } catch (error: any) {
    console.error('[WhatsApp] Error restarting service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restart WhatsApp service: ' + error.message
    });
  }
};

// Get WhatsApp groups
export const getWhatsAppGroups = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get groups directly from WAHA Plus service (supports fetching ALL groups)
    const whatsappService = getWhatsAppService();
    const sessionId = process.env.WAHA_DEFAULT_SESSION || 'default';

    console.log(`[WhatsApp] Fetching groups from WAHA Plus for session: ${sessionId}`);

    // WAHA getGroups() is async and fetches from WAHA API
    const serviceGroups = await whatsappService.getGroups(sessionId, {
      limit: 200 // Fetch up to 200 groups (increase if you have more)
    });

    // Transform to match expected format
    const groups = serviceGroups.map(group => ({
      _id: group.id,
      groupId: group.id,
      groupName: group.name,
      lastMessage: group.lastMessage || '',
      lastTimestamp: group.timestamp || Date.now(),
      messageCount: 0, // Could be enhanced to query database for actual count
      participantCount: group.participantCount || 0,
      description: group.description || '',
      isGroup: group.isGroup,
      // Additional WAHA Plus metadata
      inviteCode: group.inviteCode,
      picture: group.picture,
      role: group.role
    }));

    console.log(`[WhatsApp] ✅ Fetched ${groups.length} groups from WAHA Plus service`);

    res.json({
      success: true,
      data: groups
    });
  } catch (error: any) {
    console.error('[WhatsApp] Error getting groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp groups: ' + error.message
    });
  }
};

// Get WhatsApp private chats
export const getWhatsAppPrivateChats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Get private chats (contacts with recent messages) from database
    const privateChats = await WhatsAppContact.find({
      userId,
      lastMessageTimestamp: { $exists: true }
    })
    .sort({ lastMessageTimestamp: -1 })
    .limit(50);
    
    res.json({
      success: true,
      data: privateChats
    });
  } catch (error: any) {
    console.error('[WhatsApp] Error getting private chats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp private chats: ' + error.message
    });
  }
};

// Get WhatsApp messages
export const getWhatsAppMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit = 50, groupId, chatId } = req.query;
    
    // Support both groupId (legacy) and chatId (new) parameters
    const targetChatId = chatId || groupId;
    
    // Query database messages filtered by userId
    const query: any = { userId };
    if (targetChatId) {
      query['metadata.groupId'] = targetChatId;
    }
    
    const messages = await WhatsAppMessage.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit));
    
    res.json({
      success: true,
      data: messages
    });
  } catch (error: any) {
    console.error('[WhatsApp] Error getting messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp messages: ' + error.message
    });
  }
};

// Refresh WhatsApp chats (WAHA doesn't have a dedicated refresh method)
// This endpoint is deprecated - use getWhatsAppGroups() instead which fetches fresh data from WAHA
export const refreshWhatsAppChats = async (req: Request, res: Response) => {
  try {
    const whatsappService = getWhatsAppService();
    const sessionId = process.env.WAHA_DEFAULT_SESSION || 'default';

    // Check if WhatsApp is ready before attempting to fetch
    const status = await whatsappService.getStatus();

    if (!status.isReady) {
      return res.json({
        success: false,
        error: 'WhatsApp client is not ready. Please ensure WhatsApp is connected and try again.',
        details: {
          isReady: status.isReady,
          status: status.status,
          suggestion: status.qrAvailable ? 'Please scan the QR code first' : 'Please restart the WhatsApp service'
        }
      });
    }

    // WAHA doesn't have refreshChats() - instead fetch groups directly
    const groups = await whatsappService.getGroups(sessionId, { limit: 200 });

    res.json({
      success: true,
      message: 'WhatsApp chats refreshed successfully',
      data: {
        groupsCount: groups.length,
        privateChatsCount: 0, // WAHA doesn't distinguish in getGroups
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('[WhatsApp] Error refreshing chats:', error);

    // Provide more helpful error messages
    let userFriendlyMessage = 'Failed to refresh WhatsApp chats';
    let statusCode = 500;

    if (error.message.includes('not ready')) {
      userFriendlyMessage = 'WhatsApp is not connected. Please scan the QR code first.';
      statusCode = 400;
    } else if (error.message.includes('connection') || error.message.includes('socket')) {
      userFriendlyMessage = 'WhatsApp connection is unstable. Please try again in a moment.';
      statusCode = 503;
    } else if (error.message.includes('browser')) {
      userFriendlyMessage = 'WhatsApp service is having technical difficulties. Please try restarting the service.';
      statusCode = 503;
    }

    res.status(statusCode).json({
      success: false,
      error: userFriendlyMessage,
      technicalError: error.message,
      suggestion: statusCode === 400 ? 'Please authenticate with WhatsApp first' : 'Please try again in a few seconds'
    });
  }
};

// Add monitored keyword - NOT SUPPORTED BY WAHA
export const addMonitoredKeyword = async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Keyword monitoring is not supported by WAHA service',
    message: 'This feature was part of the previous Baileys implementation and is not available in WAHA Plus'
  });
};

// Remove monitored keyword - NOT SUPPORTED BY WAHA
export const removeMonitoredKeyword = async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Keyword monitoring is not supported by WAHA service',
    message: 'This feature was part of the previous Baileys implementation and is not available in WAHA Plus'
  });
};

// Get monitored keywords - NOT SUPPORTED BY WAHA
export const getMonitoredKeywords = async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Keyword monitoring is not supported by WAHA service',
    message: 'This feature was part of the previous Baileys implementation and is not available in WAHA Plus',
    data: []
  });
};

// Clear authentication data
export const clearWhatsAppAuth = async (req: Request, res: Response) => {
  try {
    const whatsappService = getWhatsAppService();
    const sessionId = process.env.WAHA_DEFAULT_SESSION || 'default';

    // WAHA uses stopSession() to clear authentication
    await whatsappService.stopSession(sessionId);

    res.json({
      success: true,
      message: 'WhatsApp authentication data cleared successfully'
    });
  } catch (error: any) {
    console.error('[WhatsApp] Error clearing auth data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear WhatsApp auth data: ' + error.message
    });
  }
};

// Diagnostic endpoint to check WAHA configuration
export const getDiagnostics = async (req: Request, res: Response) => {
  try {
    const whatsappService = getWhatsAppService();

    // Get status asynchronously
    const serviceStatus = await whatsappService.getStatus();

    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      renderEnvironment: !!process.env.RENDER,
      wahaServiceUrl: process.env.WAHA_SERVICE_URL,
      wahaDefaultSession: process.env.WAHA_DEFAULT_SESSION || 'default',
      hasWhatsAppService: !!whatsappService,
      whatsappServiceStatus: serviceStatus,
      systemInfo: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version
      }
    };

    // Note: testBrowserEnvironment is not supported by WAHA service
    // WAHA Plus handles browser management internally

    res.json({
      success: true,
      data: diagnostics
    });
  } catch (error: any) {
    console.error('[WhatsApp] Error getting diagnostics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get diagnostics: ' + error.message
    });
  }
};

export const forceRestart = async (req: Request, res: Response) => {
  try {
    console.log('[WhatsApp] Force restart requested');

    const whatsappService = getWhatsAppService();
    const sessionId = process.env.WAHA_DEFAULT_SESSION || 'default';

    // Stop session and restart completely
    await whatsappService.stopSession(sessionId);
    await whatsappService.restartSession(sessionId);

    res.json({
      success: true,
      message: 'WhatsApp service force restart initiated. This will clear all authentication data and restart from scratch.'
    });
  } catch (error: any) {
    console.error('[WhatsApp] Error during force restart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to force restart WhatsApp service: ' + error.message
    });
  }
};

export const forceHistorySync = async (req: Request, res: Response) => {
  // WAHA doesn't support force history sync - this was a Baileys-specific feature
  res.status(501).json({
    success: false,
    error: 'History sync is not supported by WAHA service',
    message: 'This feature was part of the previous Baileys implementation. WAHA Plus automatically syncs messages in real-time via webhooks.'
  });
};

// Request phone authentication code
export const sendPhoneAuthCode = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required and must be a string'
      });
    }

    console.log('[WhatsApp] Phone auth code requested for:', phoneNumber);

    const whatsappService = getWhatsAppService();
    const sessionId = process.env.WAHA_DEFAULT_SESSION || 'default';

    // Check if session is ready for pairing code
    let status = await whatsappService.getStatus();
    console.log('[WhatsApp] Current session status:', status);

    // If session is FAILED or STOPPED, automatically restart it first
    if (status.status === 'FAILED' || status.status === 'STOPPED') {
      console.log(`[WhatsApp] Session in ${status.status} state, attempting automatic restart...`);
      try {
        await whatsappService.restartSession(sessionId);
        // Wait for session to transition to SCAN_QR_CODE
        await new Promise(resolve => setTimeout(resolve, 5000));
        status = await whatsappService.getStatus();
        console.log('[WhatsApp] Session status after restart:', status.status);
      } catch (restartError) {
        console.error('[WhatsApp] Failed to restart session:', restartError);
        return res.status(503).json({
          success: false,
          error: 'Failed to restart WhatsApp session for pairing code',
          suggestion: 'Please try restarting the WhatsApp service manually',
          technicalDetails: restartError instanceof Error ? restartError.message : String(restartError)
        });
      }
    }

    // Now check if session is in correct state for pairing code
    if (status.status !== 'SCAN_QR_CODE') {
      console.warn('[WhatsApp] Session not in SCAN_QR_CODE state:', status.status);
      return res.status(400).json({
        success: false,
        error: `Session must be in SCAN_QR_CODE state to request pairing code. Current state: ${status.status}`,
        currentStatus: status.status,
        suggestion: status.status === 'WORKING'
          ? 'WhatsApp is already connected'
          : status.status === 'STARTING'
          ? 'Session is starting - please wait a moment and try again'
          : 'Please restart the WhatsApp service and try again'
      });
    }

    // Request pairing code from WAHA Plus
    const result = await whatsappService.requestPairingCode(sessionId, phoneNumber);
    console.log('[WhatsApp] ✅ Pairing code generated successfully:', {
      normalizedCode: result.alphanumericCode || result.code,
      displayCode: result.displayCode,
      digitsOnly: result.digitsOnly
    });

    return res.json({
      success: true,
      code: result.code, // Legacy clients still expect top-level code field
      message: 'Pairing code generated successfully. Enter this code in your WhatsApp app.',
      data: {
        phoneNumber,
        normalizedPhoneNumber: phoneNumber.replace(/[^\d]/g, ''),
        codeRequested: true,
        pairingCode: result.code,
        displayCode: result.displayCode,
        digitsOnly: result.digitsOnly,
        alphanumericCode: result.alphanumericCode,
        expiresInMinutes: 3
      },
      instructions: [
        '1. Open WhatsApp on your phone',
        '2. Go to Settings > Linked Devices',
        '3. Tap "Link a Device"',
        '4. Select "Link with phone number instead"',
        `5. Enter this code: ${result.displayCode || result.code}`,
        '6. Wait for connection confirmation'
      ]
    });

  } catch (error: any) {
    console.error('[WhatsApp] Error requesting phone auth code:', error);

    // Check if it's an engine compatibility issue
    if (error.message.includes('not supported by the current WAHA engine') ||
        error.message.includes('endpoint not found')) {
      return res.status(501).json({
        success: false,
        error: 'Phone number pairing is not supported by the current WhatsApp engine',
        message: 'Your WAHA service is using an engine that does not support pairing codes. Please use QR code authentication or switch to WEBJS engine.',
        fallbackMethod: 'qr',
        technicalDetails: error.message,
        engineRecommendation: 'Set WHATSAPP_DEFAULT_ENGINE=WEBJS in your environment variables'
      });
    }

    if (error.message.includes('returned a') && error.message.includes('pairing code')) {
      return res.status(502).json({
        success: false,
        error: 'WAHA service returned an invalid pairing code length',
        message: error.message,
        fallbackMethod: 'qr',
        suggestion: 'Verify your WAHA Plus instance supports phone pairing and try requesting a new code.',
        technicalDetails: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate pairing code: ' + error.message,
      fallbackMethod: 'qr',
      suggestion: 'Try using QR code authentication instead'
    });
  }
};

// Verify phone authentication code
export const verifyPhoneAuthCode = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and verification code are required'
      });
    }

    // WAHA pairing codes are typically 8 characters (format: XXXX-XXXX)
    const cleanCode = code.replace(/[^A-Z0-9]/g, ''); // Remove dashes and special chars
    if (cleanCode.length < 6 || cleanCode.length > 8) {
      return res.status(400).json({
        success: false,
        error: 'Verification code must be 6-8 characters'
      });
    }

    console.log('[WhatsApp] Verifying pairing code for phone:', phoneNumber);

    const whatsappService = getWhatsAppService();
    const sessionId = process.env.WAHA_DEFAULT_SESSION || 'default';

    // WAHA handles pairing code verification automatically when user enters code in WhatsApp app
    // We just need to check if the session is now authenticated
    const result = await whatsappService.verifyPairingCode(sessionId, cleanCode);

    if (result.success) {
      console.log('[WhatsApp] ✅ Session authenticated successfully via pairing code');

      // Emit connection status update to frontend
      const io_instance = (global as any).io;
      if (io_instance) {
        io_instance.emit('whatsapp:status', {
          connected: true,
          authenticated: true,
          authMethod: 'phone',
          phoneNumber: phoneNumber
        });
      }

      res.json({
        success: true,
        message: 'Phone verification successful - WhatsApp connected',
        data: {
          authenticated: true,
          phoneNumber: phoneNumber,
          sessionStatus: 'WORKING'
        }
      });
    } else {
      console.log('[WhatsApp] ⏳ Pairing code verification pending:', result.error);
      res.status(202).json({
        success: false,
        pending: true,
        error: result.error || 'Verification in progress',
        message: 'Please enter the pairing code in your WhatsApp app and wait for connection',
        suggestion: 'Check status again in a few seconds'
      });
    }
  } catch (error: any) {
    console.error('[WhatsApp] Error verifying phone auth code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify code: ' + error.message,
      suggestion: 'Please try requesting a new pairing code'
    });
  }
}; 
