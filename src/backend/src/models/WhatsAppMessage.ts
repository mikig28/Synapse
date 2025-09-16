import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppMessageMetadata {
  forwarded?: boolean;
  forwardedMany?: boolean;
  referral?: {
    sourceUrl?: string;
    sourceId?: string;
    sourceType?: string;
  };
  isGroup?: boolean;
  groupId?: string;
  groupName?: string;
}

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

  // Media download information
  localPath?: string;
  fileSize?: number;
  mediaType?: 'image' | 'document' | 'voice' | 'video' | 'unknown';
  filename?: string;
  downloadStatus?: 'pending' | 'downloading' | 'completed' | 'failed';
  downloadError?: string;
  
  // Message context (for replies)
  contextMessageId?: string;
  contextFrom?: string;
  
  // Business messaging
  businessAccountId?: string;
  phoneNumberId?: string;
  
  // Metadata
  metadata?: IWhatsAppMessageMetadata;
  
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppMessageMetadataSchema: Schema<IWhatsAppMessageMetadata> = new Schema(
  {
    forwarded: { type: Boolean, default: false },
    forwardedMany: { type: Boolean, default: false },
    referral: {
      sourceUrl: String,
      sourceId: String,
      sourceType: String
    },
    isGroup: { type: Boolean, default: false, index: true },
    groupId: { type: String, index: true },
    groupName: { type: String, index: true }
  },
  {
    _id: false,
    id: false
  }
);

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

    // Media download fields
    localPath: { type: String },
    fileSize: { type: Number },
    mediaType: {
      type: String,
      enum: ['image', 'document', 'voice', 'video', 'unknown']
    },
    filename: { type: String },
    downloadStatus: {
      type: String,
      enum: ['pending', 'downloading', 'completed', 'failed'],
      default: 'pending'
    },
    downloadError: { type: String },
    
    // Context fields for replies
    contextMessageId: { type: String },
    contextFrom: { type: String },
    
    // Business messaging
    businessAccountId: { type: String },
    phoneNumberId: { type: String },
    
    // Metadata
    metadata: {
      type: WhatsAppMessageMetadataSchema,
      default: {}
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

// Group message indexes for efficient summary queries
WhatsAppMessageSchema.index({ 'metadata.isGroup': 1, 'metadata.groupName': 1, timestamp: -1 });
WhatsAppMessageSchema.index({ 'metadata.isGroup': 1, isIncoming: 1, timestamp: -1 });

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

// Static method to get messages with media
WhatsAppMessageSchema.statics.getMessagesWithMedia = function(contactId?: string, mediaType?: string, limit: number = 50) {
  const query: any = {};

  if (contactId) {
    query.contactId = contactId;
  }

  // Only messages that have media
  query.mediaUrl = { $exists: true, $ne: null };

  if (mediaType) {
    query.mediaType = mediaType;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('contactId');
};

// Static method to get media download statistics
WhatsAppMessageSchema.statics.getMediaStats = function(contactId?: string) {
  const matchStage: any = {};

  if (contactId) {
    matchStage.contactId = contactId;
  }

  // Only messages with media
  matchStage.mediaUrl = { $exists: true, $ne: null };

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          mediaType: '$mediaType',
          downloadStatus: '$downloadStatus'
        },
        count: { $sum: 1 },
        totalSize: { $sum: { $ifNull: ['$fileSize', 0] } }
      }
    },
    {
      $group: {
        _id: '$_id.mediaType',
        totalFiles: { $sum: '$count' },
        totalSize: { $sum: '$totalSize' },
        downloadStatuses: {
          $push: {
            status: '$_id.downloadStatus',
            count: '$count'
          }
        }
      }
    }
  ]);
};

// Method to update media download status
WhatsAppMessageSchema.methods.updateMediaDownloadStatus = function(
  status: 'pending' | 'downloading' | 'completed' | 'failed',
  localPath?: string,
  fileSize?: number,
  error?: string
) {
  this.downloadStatus = status;

  if (localPath) {
    this.localPath = localPath;
  }

  if (fileSize) {
    this.fileSize = fileSize;
  }

  if (error) {
    this.downloadError = error;
  }

  return this.save();
};

const WhatsAppMessage = mongoose.model<IWhatsAppMessage>('WhatsAppMessage', WhatsAppMessageSchema);

export default WhatsAppMessage;
