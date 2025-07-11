import mongoose, { Schema, Document } from 'mongoose';

export interface INewsItem extends Document {
  userId: mongoose.Types.ObjectId;
  agentId?: mongoose.Types.ObjectId; // Which agent discovered this news item
  runId?: mongoose.Types.ObjectId; // Which agent run discovered this news item
  title: string;
  description?: string;
  content?: string;
  url: string;
  urlToImage?: string;
  source: {
    id?: string;
    name: string;
  };
  author?: string;
  publishedAt: Date;
  category?: string;
  language?: string;
  country?: string;
  summary?: string;
  tags?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  relevanceScore?: number; // AI-determined relevance score (0-1)
  status: 'pending' | 'summarized' | 'archived' | 'error';
  isRead: boolean;
  isFavorite: boolean;
  readAt?: Date;
  contentHash?: string; // MD5 hash of title + url for duplicate detection
  metadata?: any; // Additional metadata from agents
  generatedImage?: {
    url: string;
    source: 'unsplash' | 'replicate';
    attribution?: string;
  }; // AI-generated or fetched image for this news item
  createdAt: Date;
  updatedAt: Date;
  
  // Method signatures
  markAsRead(): Promise<INewsItem>;
  toggleFavorite(): Promise<INewsItem>;
}

const NewsItemSchema: Schema<INewsItem> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent' },
    runId: { type: Schema.Types.ObjectId, ref: 'AgentRun' },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    content: { type: String },
    url: { type: String, required: true },
    urlToImage: { type: String },
    source: {
      id: { type: String },
      name: { type: String, required: true, trim: true },
    },
    author: { type: String, trim: true },
    publishedAt: { type: Date, required: true },
    category: { type: String, trim: true },
    language: { type: String, default: 'en' },
    country: { type: String },
    summary: { type: String },
    tags: { type: [String], default: [] },
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
    },
    relevanceScore: { type: Number, min: 0, max: 1 },
    status: {
      type: String,
      enum: ['pending', 'summarized', 'archived', 'error'],
      default: 'pending',
    },
    isRead: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false },
    readAt: { type: Date },
    contentHash: { type: String, sparse: true }, // MD5 hash for duplicate detection
    metadata: { type: Schema.Types.Mixed }, // Additional metadata storage
    generatedImage: {
      url: { type: String },
      source: { type: String, enum: ['unsplash', 'replicate'] },
      attribution: { type: String }
    }
  },
  { timestamps: true }
);

// Index for efficient querying
NewsItemSchema.index({ userId: 1, createdAt: -1 });
NewsItemSchema.index({ userId: 1, isRead: 1 });
NewsItemSchema.index({ userId: 1, isFavorite: 1 });
NewsItemSchema.index({ userId: 1, category: 1 });
NewsItemSchema.index({ userId: 1, publishedAt: -1 });
NewsItemSchema.index({ url: 1, userId: 1 }, { unique: true }); // Prevent duplicate news items per user
NewsItemSchema.index({ agentId: 1, createdAt: -1 });
NewsItemSchema.index({ runId: 1, createdAt: -1 });
NewsItemSchema.index({ contentHash: 1, createdAt: -1 }); // Index for content-based duplicate detection

// Method to mark as read
NewsItemSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Method to toggle favorite
NewsItemSchema.methods.toggleFavorite = function () {
  this.isFavorite = !this.isFavorite;
  return this.save();
};

const NewsItem = mongoose.model<INewsItem>('NewsItem', NewsItemSchema);

export default NewsItem;