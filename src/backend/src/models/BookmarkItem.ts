import mongoose, { Schema, Document } from 'mongoose';

// Keep the interface for type safety with the document structure
export interface IBookmarkItem extends Document { // Renaming to IBookmarkItem for consistency with ITelegramItem
  userId: mongoose.Types.ObjectId;
  telegramMessageId?: mongoose.Types.ObjectId;
  originalUrl: string;
  sourcePlatform: 'X' | 'LinkedIn' | 'Other';
  title?: string;
  summary?: string;
  tags?: string[];
  rawPageContent?: string;
  status?: 'pending_summary' | 'summarized' | 'error' | 'metadata_fetched';
  // Fetched metadata fields (especially for LinkedIn/Other)
  fetchedTitle?: string;
  fetchedDescription?: string;
  fetchedImageUrl?: string;
  // createdAt and updatedAt are automatically added by timestamps: true
}

const BookmarkItemSchema: Schema<IBookmarkItem> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    telegramMessageId: { type: Schema.Types.ObjectId, ref: 'TelegramItem', required: false },
    originalUrl: { type: String, required: true },
    sourcePlatform: {
      type: String,
      enum: ['X', 'LinkedIn', 'Other'],
      required: true,
    },
    title: { type: String, default: '' },
    summary: { type: String, default: '' },
    tags: { type: [String], default: [] },
    rawPageContent: { type: String },
    status: {
      type: String,
      enum: ['pending_summary', 'summarized', 'error', 'metadata_fetched'],
      default: 'pending_summary',
    },
    fetchedTitle: { type: String },
    fetchedDescription: { type: String },
    fetchedImageUrl: { type: String },
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