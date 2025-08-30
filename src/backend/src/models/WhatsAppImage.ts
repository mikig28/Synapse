/**
 * WhatsApp Image Model
 * For images extracted from WhatsApp messages (WAHA + Puppeteer)
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppImage extends Document {
  messageId: string;
  chatId: string;
  chatName?: string;
  userId: mongoose.Types.ObjectId; // User who owns this image
  senderId: string; // WhatsApp sender ID
  senderName?: string;
  caption?: string;
  
  // File information
  filename: string;
  localPath: string; // Path to locally stored image
  publicUrl?: string; // URL to serve the image publicly
  size: number;
  mimeType: string;
  dimensions?: {
    width: number;
    height: number;
  };
  
  // Extraction details
  extractionMethod: 'puppeteer' | 'waha-plus';
  extractedAt: Date;
  extractedBy: mongoose.Types.ObjectId; // User who triggered the extraction
  
  // Status and metadata
  isGroup: boolean;
  status: 'extracted' | 'processing' | 'failed';
  error?: string;
  
  // Organization
  tags: string[];
  isBookmarked: boolean;
  isArchived: boolean;
  
  // Methods
  bookmark(): Promise<IWhatsAppImage>;
  archive(): Promise<IWhatsAppImage>;
  addTag(tag: string): Promise<IWhatsAppImage>;
  getPublicUrl(): string;
}

const WhatsAppImageSchema: Schema<IWhatsAppImage> = new Schema(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    chatId: {
      type: String,
      required: true,
      index: true
    },
    chatName: {
      type: String,
      trim: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    senderId: {
      type: String,
      required: true,
      index: true
    },
    senderName: {
      type: String,
      trim: true
    },
    caption: {
      type: String,
      maxlength: 2000
    },
    
    // File information
    filename: {
      type: String,
      required: true
    },
    localPath: {
      type: String,
      required: true
    },
    publicUrl: {
      type: String
    },
    size: {
      type: Number,
      required: true,
      min: 0
    },
    mimeType: {
      type: String,
      required: true
    },
    dimensions: {
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 }
    },
    
    // Extraction details
    extractionMethod: {
      type: String,
      enum: ['puppeteer', 'waha-plus'],
      required: true,
      default: 'puppeteer'
    },
    extractedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    extractedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    // Status and metadata
    isGroup: {
      type: Boolean,
      required: true,
      default: false
    },
    status: {
      type: String,
      enum: ['extracted', 'processing', 'failed'],
      required: true,
      default: 'processing'
    },
    error: {
      type: String
    },
    
    // Organization
    tags: [{
      type: String,
      trim: true
    }],
    isBookmarked: {
      type: Boolean,
      default: false,
      index: true
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    indexes: [
      { userId: 1, createdAt: -1 },
      { chatId: 1, createdAt: -1 },
      { senderId: 1, createdAt: -1 },
      { userId: 1, isArchived: 1, createdAt: -1 },
      { userId: 1, isBookmarked: 1, createdAt: -1 },
      { userId: 1, status: 1, createdAt: -1 }
    ]
  }
);

// Text search index for captions, tags, sender names, and chat names
WhatsAppImageSchema.index({ 
  caption: 'text', 
  tags: 'text',
  senderName: 'text',
  chatName: 'text'
});

// Static method to get images for user with filters
WhatsAppImageSchema.statics.getImagesForUser = function(
  userId: string, 
  options: { 
    chatId?: string;
    senderId?: string;
    isGroup?: boolean;
    bookmarked?: boolean;
    archived?: boolean;
    status?: string;
    search?: string;
    limit?: number;
    skip?: number;
  } = {}
) {
  const query: any = { userId };
  
  if (options.chatId) query.chatId = options.chatId;
  if (options.senderId) query.senderId = options.senderId;
  if (options.isGroup !== undefined) query.isGroup = options.isGroup;
  if (options.bookmarked !== undefined) query.isBookmarked = options.bookmarked;
  if (options.archived !== undefined) query.isArchived = options.archived;
  if (options.status) query.status = options.status;
  
  let queryBuilder = this.find(query);
  
  // Text search if provided
  if (options.search) {
    queryBuilder = queryBuilder.find({
      $text: { $search: options.search }
    });
  }
  
  return queryBuilder
    .populate('extractedBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

// Method to bookmark image
WhatsAppImageSchema.methods.bookmark = function(this: IWhatsAppImage) {
  this.isBookmarked = !this.isBookmarked;
  return this.save();
};

// Method to archive image
WhatsAppImageSchema.methods.archive = function(this: IWhatsAppImage) {
  this.isArchived = !this.isArchived;
  return this.save();
};

// Method to add tag
WhatsAppImageSchema.methods.addTag = function(this: IWhatsAppImage, tag: string) {
  const cleanTag = tag.trim().toLowerCase();
  if (!this.tags.includes(cleanTag)) {
    this.tags.push(cleanTag);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to get public URL
WhatsAppImageSchema.methods.getPublicUrl = function(this: IWhatsAppImage) {
  if (this.publicUrl) return this.publicUrl;
  
  // Generate public URL based on backend configuration
  const baseUrl = process.env.BACKEND_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${baseUrl}/api/v1/whatsapp/images/${this.messageId}`;
};

const WhatsAppImage = mongoose.model<IWhatsAppImage>('WhatsAppImage', WhatsAppImageSchema);

export default WhatsAppImage;