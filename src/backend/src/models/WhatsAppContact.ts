import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppContact extends Document {
  userId: mongoose.Types.ObjectId;
  phoneNumber: string;
  name: string;
  avatar?: string;
  lastSeen: Date;
  isOnline: boolean;
  unreadCount: number;
  lastMessage?: string;
  lastMessageTimestamp?: Date;
  
  // Contact information
  email?: string;
  company?: string;
  jobTitle?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  
  // Business information
  businessAccountId?: string;
  isBusinessContact: boolean;
  labels?: string[];
  
  // Interaction tracking
  totalMessages: number;
  totalIncomingMessages: number;
  totalOutgoingMessages: number;
  firstMessageDate?: Date;
  lastIncomingMessageDate?: Date;
  lastOutgoingMessageDate?: Date;
  
  // Contact preferences
  isBlocked: boolean;
  isMuted: boolean;
  muteUntil?: Date;
  preferredLanguage?: string;
  timezone?: string;
  
  // Marketing and automation
  tags?: string[];
  customFields?: Map<string, any>;
  segments?: string[];
  optInStatus?: 'opted_in' | 'opted_out' | 'pending';
  
  // Metadata
  source?: 'inbound' | 'imported' | 'manual' | 'api';
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppContactSchema: Schema<IWhatsAppContact> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    phoneNumber: { 
      type: String, 
      required: true, 
      index: true,
      // Remove non-numeric characters for consistency
      set: (v: string) => v.replace(/[^\d+]/g, '')
    },
    name: { 
      type: String, 
      required: true,
      index: true 
    },
    avatar: { type: String },
    lastSeen: { 
      type: Date, 
      default: Date.now,
      index: true 
    },
    isOnline: { 
      type: Boolean, 
      default: false,
      index: true 
    },
    unreadCount: { 
      type: Number, 
      default: 0,
      min: 0 
    },
    lastMessage: { type: String },
    lastMessageTimestamp: { 
      type: Date,
      index: true 
    },
    
    // Contact information
    email: { 
      type: String,
      lowercase: true,
      validate: {
        validator: function(v: string) {
          return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Invalid email format'
      }
    },
    company: { type: String },
    jobTitle: { type: String },
    website: { type: String },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    },
    
    // Business information
    businessAccountId: { type: String },
    isBusinessContact: { 
      type: Boolean, 
      default: false,
      index: true 
    },
    labels: [{ 
      type: String,
      index: true 
    }],
    
    // Interaction tracking
    totalMessages: { 
      type: Number, 
      default: 0,
      min: 0 
    },
    totalIncomingMessages: { 
      type: Number, 
      default: 0,
      min: 0 
    },
    totalOutgoingMessages: { 
      type: Number, 
      default: 0,
      min: 0 
    },
    firstMessageDate: { type: Date },
    lastIncomingMessageDate: { type: Date },
    lastOutgoingMessageDate: { type: Date },
    
    // Contact preferences
    isBlocked: { 
      type: Boolean, 
      default: false,
      index: true 
    },
    isMuted: { 
      type: Boolean, 
      default: false 
    },
    muteUntil: { type: Date },
    preferredLanguage: { 
      type: String,
      default: 'en' 
    },
    timezone: { type: String },
    
    // Marketing and automation
    tags: [{ 
      type: String,
      index: true 
    }],
    customFields: {
      type: Map,
      of: Schema.Types.Mixed
    },
    segments: [String],
    optInStatus: {
      type: String,
      enum: ['opted_in', 'opted_out', 'pending'],
      default: 'pending'
    },
    
    // Metadata
    source: {
      type: String,
      enum: ['inbound', 'imported', 'manual', 'api'],
      default: 'inbound'
    },
    notes: { type: String }
  },
  { 
    timestamps: true,
    // Enable text search on name and notes
    index: [
      { name: 'text', notes: 'text' },
      { userId: 1, lastSeen: -1 },
      { userId: 1, lastMessageTimestamp: -1 },
      { userId: 1, totalMessages: -1 }
    ]
  }
);

// Ensure unique phoneNumber per user (contacts are unique per user)
WhatsAppContactSchema.index({ userId: 1, phoneNumber: 1 }, { unique: true });

// Compound indexes for efficient queries
WhatsAppContactSchema.index({ userId: 1, isBlocked: 1, lastSeen: -1 });
WhatsAppContactSchema.index({ userId: 1, isBusinessContact: 1, lastMessageTimestamp: -1 });
WhatsAppContactSchema.index({ userId: 1, tags: 1, lastSeen: -1 });
WhatsAppContactSchema.index({ userId: 1, labels: 1, lastMessageTimestamp: -1 });

// Virtual for full name with company
WhatsAppContactSchema.virtual('displayName').get(function() {
  return this.company ? `${this.name} (${this.company})` : this.name;
});

// Method to update message statistics
WhatsAppContactSchema.methods.updateMessageStats = function(isIncoming: boolean) {
  this.totalMessages += 1;
  
  if (isIncoming) {
    this.totalIncomingMessages += 1;
    this.lastIncomingMessageDate = new Date();
    this.unreadCount += 1;
  } else {
    this.totalOutgoingMessages += 1;
    this.lastOutgoingMessageDate = new Date();
    this.unreadCount = 0; // Reset unread count when we send a message
  }
  
  this.lastMessageTimestamp = new Date();
  
  if (!this.firstMessageDate) {
    this.firstMessageDate = new Date();
  }
  
  return this.save();
};

// Method to mark all messages as read
WhatsAppContactSchema.methods.markAllAsRead = function() {
  this.unreadCount = 0;
  return this.save();
};

// Method to block/unblock contact
WhatsAppContactSchema.methods.toggleBlock = function() {
  this.isBlocked = !this.isBlocked;
  return this.save();
};

// Method to mute/unmute contact
WhatsAppContactSchema.methods.toggleMute = function(duration?: number) {
  this.isMuted = !this.isMuted;
  
  if (this.isMuted && duration) {
    this.muteUntil = new Date(Date.now() + duration * 60 * 1000); // duration in minutes
  } else {
    this.muteUntil = undefined;
  }
  
  return this.save();
};

// Static method to search contacts (user-specific)
WhatsAppContactSchema.statics.searchContacts = function(userId: string, query: string, limit: number = 20) {
  const searchRegex = new RegExp(query, 'i');
  
  return this.find({
    userId: userId,
    $or: [
      { name: searchRegex },
      { phoneNumber: searchRegex },
      { email: searchRegex },
      { company: searchRegex },
      { notes: searchRegex }
    ]
  })
  .sort({ lastMessageTimestamp: -1 })
  .limit(limit);
};

// Static method to get active contacts (with recent messages) - user-specific
WhatsAppContactSchema.statics.getActiveContacts = function(userId: string, days: number = 30, limit: number = 50) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.find({
    userId: userId,
    lastMessageTimestamp: { $gte: cutoffDate }
  })
  .sort({ lastMessageTimestamp: -1 })
  .limit(limit);
};

// Pre-save middleware to update lastSeen when isOnline changes
WhatsAppContactSchema.pre('save', function(next) {
  if (this.isModified('isOnline') && this.isOnline) {
    this.lastSeen = new Date();
  }
  next();
});

const WhatsAppContact = mongoose.model<IWhatsAppContact>('WhatsAppContact', WhatsAppContactSchema);

export default WhatsAppContact;