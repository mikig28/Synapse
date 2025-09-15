import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppMessage extends Document {
  messageId: string;
  from: string;
  to: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contact' | 'extendedTextMessage' | 'senderKeyDistributionMessage' | 'conversation' | 'imageMessage' | 'videoMessage' | 'audioMessage' | 'documentMessage' | 'stickerMessage' | 'reactionMessage' | 'groupInviteMessage' | 'pollCreationMessage' | 'pollUpdateMessage' | 'liveLocationMessage' | 'templateMessage' | 'buttonsMessage' | 'listMessage' | 'protocolMessage' | 'orderMessage' | 'paymentMessage' | 'viewOnceMessage' | 'highlyStructuredMessage' | 'fastRatchetKeySenderKeyDistributionMessage' | 'sendPaymentMessage' | 'requestPaymentMessage';
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  isIncoming: boolean;
  contactId: mongoose.Types.ObjectId;
  
  // Optional media information
  mediaId?: string;
  mediaUrl?: string;
  mimeType?: string;
  caption?: string;
  
  // Message context (for replies)
  contextMessageId?: string;
  contextFrom?: string;
  
  // Business messaging
  businessAccountId?: string;
  phoneNumberId?: string;
  
  // Metadata
  metadata?: {
    forwarded?: boolean;
    forwardedMany?: boolean;
    referral?: {
      sourceUrl?: string;
      sourceId?: string;
      sourceType?: string;
    };
    // Group/summary metadata used by summary queries
    isGroup?: boolean;
    groupId?: string;
    groupName?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppMessageSchema: Schema<IWhatsAppMessage> = new Schema(
  {
    messageId: { 
      type: String, 
      required: true, 
      unique: true,
      index: true 
    },
    from: { 
      type: String, 
      required: true,
      index: true 
    },
    to: { 
      type: String, 
      required: true,
      index: true 
    },
    message: { 
      type: String, 
      required: true 
    },
    timestamp: { 
      type: Date, 
      required: true,
      index: true 
    },
    type: {
      type: String,
      enum: [
        'text', 'image', 'document', 'audio', 'video', 'location', 'contact',
        'extendedTextMessage', 'senderKeyDistributionMessage', 'conversation',
        'imageMessage', 'videoMessage', 'audioMessage', 'documentMessage',
        'stickerMessage', 'reactionMessage', 'groupInviteMessage',
        'pollCreationMessage', 'pollUpdateMessage', 'liveLocationMessage',
        'templateMessage', 'buttonsMessage', 'listMessage', 'protocolMessage',
        'orderMessage', 'paymentMessage', 'viewOnceMessage', 'highlyStructuredMessage',
        'fastRatchetKeySenderKeyDistributionMessage', 'sendPaymentMessage', 'requestPaymentMessage'
      ],
      required: true,
      default: 'text'
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed', 'received'],
      required: true,
      default: 'sent'
    },
    isIncoming: { 
      type: Boolean, 
      required: true,
      index: true 
    },
    contactId: { 
      type: Schema.Types.ObjectId, 
      ref: 'WhatsAppContact', 
      required: true,
      index: true 
    },
    
    // Media fields
    mediaId: { type: String },
    mediaUrl: { type: String },
    mimeType: { type: String },
    caption: { type: String },
    
    // Context fields for replies
    contextMessageId: { type: String },
    contextFrom: { type: String },
    
    // Business messaging
    businessAccountId: { type: String },
    phoneNumberId: { type: String },
    
    // Metadata
    metadata: {
      forwarded: { type: Boolean, default: false },
      forwardedMany: { type: Boolean, default: false },
      referral: {
        sourceUrl: String,
        sourceId: String,
        sourceType: String
      },
      // Group/summary metadata used by summary queries
      isGroup: { type: Boolean, index: true },
      groupId: { type: String, index: true },
      groupName: { type: String, index: true }
    }
  },
  { 
    timestamps: true,
    // Optimize for common queries
    index: [
      { contactId: 1, timestamp: -1 },
      { from: 1, to: 1, timestamp: -1 },
      { status: 1, timestamp: -1 }
    ]
  }
);

// Compound indexes for efficient queries
WhatsAppMessageSchema.index({ contactId: 1, timestamp: -1 });
WhatsAppMessageSchema.index({ from: 1, to: 1, timestamp: -1 });
WhatsAppMessageSchema.index({ isIncoming: 1, timestamp: -1 });
// Summary query indexes
WhatsAppMessageSchema.index({ 'metadata.isGroup': 1, 'metadata.groupId': 1, timestamp: -1 });
WhatsAppMessageSchema.index({ 'metadata.groupName': 1, timestamp: -1 });

// Text search index for message content
WhatsAppMessageSchema.index({ message: 'text' });

// Method to mark message as read
WhatsAppMessageSchema.methods.markAsRead = function() {
  this.status = 'read';
  return this.save();
};

// Static method to get conversation between two parties
WhatsAppMessageSchema.statics.getConversation = function(contact1: string, contact2: string, limit: number = 50) {
  return this.find({
    $or: [
      { from: contact1, to: contact2 },
      { from: contact2, to: contact1 }
    ]
  })
  .sort({ timestamp: -1 })
  .limit(limit)
  .populate('contactId');
};

// Static method to get unread messages count
WhatsAppMessageSchema.statics.getUnreadCount = function(contactId: string) {
  return this.countDocuments({
    contactId: contactId,
    isIncoming: true,
    status: { $in: ['received', 'delivered'] }
  });
};

const WhatsAppMessage = mongoose.model<IWhatsAppMessage>('WhatsAppMessage', WhatsAppMessageSchema);

export default WhatsAppMessage;
