import mongoose, { Schema, Document } from 'mongoose';

export interface IUserInterest extends Document {
  userId: mongoose.Types.ObjectId;
  topics: string[]; // General topics: AI, Technology, Business, Science, etc.
  keywords: string[]; // Specific keywords: Claude AI, React, Startups, etc.
  sources: string[]; // Preferred sources: techcrunch, the-verge, bbc-news, etc.
  categories: string[]; // News categories: technology, business, science, health, etc.
  excludeKeywords: string[]; // Keywords to avoid
  languages: string[]; // Preferred languages: en, he, etc.
  refreshInterval: number; // How often to fetch news (in minutes)
  autoFetchEnabled: boolean; // Auto-fetch news or manual only
  maxArticlesPerFetch: number; // Maximum articles to fetch per cycle
  createdAt: Date;
  updatedAt: Date;
}

const UserInterestSchema: Schema<IUserInterest> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true // One interest profile per user
    },
    topics: {
      type: [String],
      default: ['technology', 'business', 'science']
    },
    keywords: {
      type: [String],
      default: []
    },
    sources: {
      type: [String],
      default: [] // Empty means all sources
    },
    categories: {
      type: [String],
      default: ['technology', 'business', 'science', 'general']
    },
    excludeKeywords: {
      type: [String],
      default: []
    },
    languages: {
      type: [String],
      default: ['en']
    },
    refreshInterval: {
      type: Number,
      default: 30, // 30 minutes
      min: 15,
      max: 1440 // Max 1 day
    },
    autoFetchEnabled: {
      type: Boolean,
      default: true
    },
    maxArticlesPerFetch: {
      type: Number,
      default: 50,
      min: 10,
      max: 200
    }
  },
  { timestamps: true }
);

// Indexes for efficient querying
UserInterestSchema.index({ userId: 1 });
UserInterestSchema.index({ topics: 1 });
UserInterestSchema.index({ categories: 1 });

const UserInterest = mongoose.model<IUserInterest>('UserInterest', UserInterestSchema);

export default UserInterest;
