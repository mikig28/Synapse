import mongoose, { Schema, Document } from 'mongoose';

// Keep the interface for type safety with the document structure
export interface IBookmarkItem extends Document { // Renaming to IBookmarkItem for consistency with ITelegramItem
  userId: mongoose.Types.ObjectId;
  telegramMessageId?: mongoose.Types.ObjectId;
  originalUrl: string;
  sourcePlatform: 'X' | 'LinkedIn' | 'Reddit' | 'Other';
  title?: string;
  summary?: string;
  tags?: string[];
  rawPageContent?: string;
  status?: 'pending' | 'summarized' | 'error' | 'metadata_fetched';
  // Fetched metadata fields (especially for LinkedIn/Other)
  fetchedTitle?: string;
  fetchedDescription?: string;
  fetchedImageUrl?: string;
  fetchedVideoUrl?: string;
  // Reddit-specific content fields
  redditPostContent?: string;
  redditAuthor?: string;
  redditSubreddit?: string;
  redditUpvotes?: number;
  redditNumComments?: number;
  redditCreatedUtc?: number;
  // Voice note fields
  voiceNoteTranscription?: string;
  voiceNoteAudioFileId?: string;
  voiceNoteTelegramMessageId?: mongoose.Types.ObjectId;
  // Voice memo analysis results
  voiceMemoAnalysis?: {
    tags: string[];
    notes?: string;
    priority: 'low' | 'medium' | 'high';
    hasReminder: boolean;
    confidence?: number;
  };
  reminderId?: mongoose.Types.ObjectId;
  createdAt: Date;
  // createdAt and updatedAt are automatically added by timestamps: true
}

const BookmarkItemSchema: Schema<IBookmarkItem> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    telegramMessageId: { type: Schema.Types.ObjectId, ref: 'TelegramItem', required: false },
    originalUrl: { type: String, required: true },
    sourcePlatform: {
      type: String,
      enum: ['X', 'LinkedIn', 'Reddit', 'Other'],
      required: true,
    },
    title: { type: String, default: '' },
    summary: { type: String, default: '' },
    tags: { type: [String], default: [] },
    rawPageContent: { type: String },
    status: {
      type: String,
      enum: ['pending', 'summarized', 'error', 'metadata_fetched'],
      default: 'pending',
    },
    fetchedTitle: { type: String },
    fetchedDescription: { type: String },
    fetchedImageUrl: { type: String },
    fetchedVideoUrl: { type: String },
    // Reddit-specific fields
    redditPostContent: { type: String },
    redditAuthor: { type: String },
    redditSubreddit: { type: String },
    redditUpvotes: { type: Number },
    redditNumComments: { type: Number },
    redditCreatedUtc: { type: Number },
    // Voice note fields
    voiceNoteTranscription: { type: String },
    voiceNoteAudioFileId: { type: String },
    voiceNoteTelegramMessageId: { type: Schema.Types.ObjectId, ref: 'TelegramItem' },
    // Voice memo analysis
    voiceMemoAnalysis: {
      type: {
        tags: { type: [String], default: [] },
        notes: { type: String },
        priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
        hasReminder: { type: Boolean, default: false },
        confidence: { type: Number, min: 0, max: 1 }
      },
      required: false
    },
    reminderId: { type: Schema.Types.ObjectId, ref: 'Reminder' },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

// Index for efficient querying
BookmarkItemSchema.index({ userId: 1, createdAt: -1 });
BookmarkItemSchema.index({ userId: 1, sourcePlatform: 1 });
BookmarkItemSchema.index({ originalUrl: 1, userId: 1 }, { unique: true }); // Prevent duplicate bookmarks per user

const BookmarkItem = mongoose.model<IBookmarkItem>('BookmarkItem', BookmarkItemSchema);

export default BookmarkItem;

// You might want to add a getBookmarksCollection function here if you follow the pattern
// from other models, e.g.:
// import { getDb } from '../config/database';
// export const getBookmarksCollection = () => getDb().collection<BookmarkItem>('bookmarks'); 