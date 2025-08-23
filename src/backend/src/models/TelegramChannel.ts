import mongoose, { Schema, Document } from 'mongoose';

export interface ITelegramChannelMessage {
  messageId: number;
  text?: string;
  mediaType?: 'photo' | 'video' | 'document' | 'audio' | 'voice' | 'sticker';
  mediaUrl?: string;
  mediaFileId?: string;
  author?: string;
  date: Date;
  views?: number;
  forwards?: number;
  reactions?: {
    emoji: string;
    count: number;
  }[];
  urls?: string[];
  hashtags?: string[];
}

export interface ITelegramChannel extends Document {
  userId: mongoose.Types.ObjectId; // Owner of this channel monitoring
  channelId: string; // Telegram channel ID (e.g., "@channelname" or "-1001234567890")
  channelTitle: string;
  channelUsername?: string; // @username if public
  channelDescription?: string;
  channelType: 'channel' | 'group' | 'supergroup';
  isActive: boolean; // Whether to continue monitoring
  lastFetchedMessageId?: number; // For pagination
  totalMessages: number;
  messages: ITelegramChannelMessage[];
  keywords?: string[]; // Optional keywords to filter messages
  fetchInterval: number; // Minutes between fetches (default: 30)
  lastFetchedAt?: Date;
  lastError?: string; // Last error message if any
  createdAt: Date;
  updatedAt: Date;
}

const TelegramChannelMessageSchema = new Schema<ITelegramChannelMessage>({
  messageId: { type: Number, required: true },
  text: { type: String },
  mediaType: { 
    type: String, 
    enum: ['photo', 'video', 'document', 'audio', 'voice', 'sticker'] 
  },
  mediaUrl: { type: String },
  mediaFileId: { type: String },
  author: { type: String },
  date: { type: Date, required: true },
  views: { type: Number, default: 0 },
  forwards: { type: Number, default: 0 },
  reactions: [{
    emoji: String,
    count: Number
  }],
  urls: [String],
  hashtags: [String]
}, { _id: false });

const TelegramChannelSchema: Schema<ITelegramChannel> = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  channelId: { type: String, required: true }, // Can be @username or numeric ID
  channelTitle: { type: String, required: true },
  channelUsername: { type: String },
  channelDescription: { type: String },
  channelType: { 
    type: String, 
    enum: ['channel', 'group', 'supergroup'], 
    default: 'channel' 
  },
  isActive: { type: Boolean, default: true },
  lastFetchedMessageId: { type: Number },
  totalMessages: { type: Number, default: 0 },
  messages: [TelegramChannelMessageSchema],
  keywords: [String], // Optional filtering
  fetchInterval: { type: Number, default: 30 }, // Default 30 minutes
  lastFetchedAt: { type: Date },
  lastError: { type: String } // Store error messages
}, { 
  timestamps: true,
  // Limit messages array size to prevent document size issues
  strict: true
});

// Indexes for efficient querying
TelegramChannelSchema.index({ userId: 1, channelId: 1 }, { unique: true });
TelegramChannelSchema.index({ userId: 1, isActive: 1 });
TelegramChannelSchema.index({ 'messages.date': -1 });
TelegramChannelSchema.index({ 'messages.hashtags': 1 });

// Limit messages array to last 1000 messages to prevent MongoDB document size limits
TelegramChannelSchema.pre('save', function() {
  if (this.messages && this.messages.length > 1000) {
    this.messages = this.messages.slice(-1000); // Keep latest 1000
  }
});

const TelegramChannel = mongoose.model<ITelegramChannel>('TelegramChannel', TelegramChannelSchema);

export default TelegramChannel;
