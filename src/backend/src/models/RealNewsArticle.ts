import mongoose, { Schema, Document } from 'mongoose';

export interface IRealNewsArticle extends Document {
  userId: mongoose.Types.ObjectId;
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
  language: string;
  relevanceScore?: number; // AI-calculated score (0-1) based on user interests
  sentiment?: 'positive' | 'negative' | 'neutral';
  isRead: boolean;
  isFavorite: boolean;
  isSaved: boolean; // Saved for later reading
  readAt?: Date;
  savedAt?: Date;
  tags?: string[]; // Auto-generated tags
  externalId?: string; // ID from external news API
  fetchedAt: Date; // When article was fetched
  contentHash?: string; // For deduplication
  createdAt: Date;
  updatedAt: Date;

  // Method signatures
  markAsRead(): Promise<IRealNewsArticle>;
  toggleFavorite(): Promise<IRealNewsArticle>;
  toggleSaved(): Promise<IRealNewsArticle>;
}

const RealNewsArticleSchema: Schema<IRealNewsArticle> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    content: {
      type: String
    },
    url: {
      type: String,
      required: true
    },
    urlToImage: {
      type: String
    },
    source: {
      id: { type: String },
      name: { type: String, required: true, trim: true }
    },
    author: {
      type: String,
      trim: true
    },
    publishedAt: {
      type: Date,
      required: true,
      index: true
    },
    category: {
      type: String,
      trim: true,
      index: true
    },
    language: {
      type: String,
      default: 'en'
    },
    relevanceScore: {
      type: Number,
      min: 0,
      max: 1,
      index: true
    },
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral']
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    isFavorite: {
      type: Boolean,
      default: false,
      index: true
    },
    isSaved: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date
    },
    savedAt: {
      type: Date
    },
    tags: {
      type: [String],
      default: []
    },
    externalId: {
      type: String
    },
    fetchedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    contentHash: {
      type: String,
      sparse: true
    }
  },
  { timestamps: true }
);

// Compound indexes for efficient querying
RealNewsArticleSchema.index({ userId: 1, publishedAt: -1 });
RealNewsArticleSchema.index({ userId: 1, relevanceScore: -1 });
RealNewsArticleSchema.index({ userId: 1, isRead: 1, publishedAt: -1 });
RealNewsArticleSchema.index({ userId: 1, isSaved: 1, publishedAt: -1 });
RealNewsArticleSchema.index({ userId: 1, category: 1, publishedAt: -1 });
RealNewsArticleSchema.index({ url: 1, userId: 1 }, { unique: true }); // Prevent duplicates per user
RealNewsArticleSchema.index({ contentHash: 1, userId: 1 }); // Content-based deduplication

// Method to mark as read
RealNewsArticleSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Method to toggle favorite
RealNewsArticleSchema.methods.toggleFavorite = function () {
  this.isFavorite = !this.isFavorite;
  return this.save();
};

// Method to toggle saved
RealNewsArticleSchema.methods.toggleSaved = function () {
  this.isSaved = !this.isSaved;
  this.savedAt = this.isSaved ? new Date() : undefined;
  return this.save();
};

const RealNewsArticle = mongoose.model<IRealNewsArticle>('RealNewsArticle', RealNewsArticleSchema);

export default RealNewsArticle;
