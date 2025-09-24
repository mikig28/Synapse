import mongoose, { Document, Schema } from 'mongoose';

export interface IKeywordSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  keywords: string[];
  includeShorts: boolean;
  freshnessDays: number; // default 14
  maxPerFetch: number; // default 20
  isActive: boolean;
  lastFetchedAt?: Date;
  nextPageToken?: string; // optional nice-to-have
  autoFetchEnabled: boolean;
  autoFetchIntervalMinutes?: number;
  autoFetchNextRunAt?: Date;
  autoFetchLastRunAt?: Date;
  autoFetchStatus: 'idle' | 'running' | 'success' | 'error';
  autoFetchLastError?: string;
  autoFetchLastFetchedCount?: number;
  autoFetchTimezone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const KeywordSubscriptionSchema = new Schema<IKeywordSubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    keywords: { type: [String], required: true, default: [] },
    includeShorts: { type: Boolean, required: true, default: true },
    freshnessDays: { type: Number, required: true, default: 14, min: 1, max: 90 },
    maxPerFetch: { type: Number, required: true, default: 20, min: 1, max: 50 },
    isActive: { type: Boolean, required: true, default: true },
    lastFetchedAt: { type: Date },
    nextPageToken: { type: String },
    autoFetchEnabled: { type: Boolean, required: true, default: false, index: true },
    autoFetchIntervalMinutes: { type: Number, min: 15, max: 10080, default: 1440 },
    autoFetchNextRunAt: { type: Date, index: true },
    autoFetchLastRunAt: { type: Date },
    autoFetchStatus: {
      type: String,
      enum: ['idle', 'running', 'success', 'error'],
      default: 'idle',
      index: true,
    },
    autoFetchLastError: { type: String },
    autoFetchLastFetchedCount: { type: Number, min: 0 },
    autoFetchTimezone: { type: String, default: 'UTC' },
  },
  { timestamps: true }
);

// Prevent duplicate identical keyword sets per user by using a normalized key
KeywordSubscriptionSchema.index(
  { userId: 1, keywords: 1 },
  { unique: false }
);

KeywordSubscriptionSchema.index({ autoFetchEnabled: 1, autoFetchNextRunAt: 1 });

const KeywordSubscription = mongoose.model<IKeywordSubscription>('KeywordSubscription', KeywordSubscriptionSchema);
export default KeywordSubscription;


