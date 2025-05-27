import mongoose, { Document, Schema } from 'mongoose';

export interface IVideoItem extends Document {
  userId: mongoose.Types.ObjectId;
  originalUrl: string;
  videoId: string;
  title: string;
  thumbnailUrl?: string;
  channelTitle?: string;
  sourcePlatform: 'YouTube'; // For now, only YouTube
  watchedStatus: 'unwatched' | 'watching' | 'watched';
  summary?: string; // AI-generated summary of the video
  telegramMessageId?: mongoose.Types.ObjectId; // Optional: if it came from a Telegram capture
  createdAt: Date;
  updatedAt: Date;
}

const VideoItemSchema = new Schema<IVideoItem>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    originalUrl: { type: String, required: true },
    videoId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    thumbnailUrl: { type: String },
    channelTitle: { type: String },
    sourcePlatform: { type: String, enum: ['YouTube'], required: true, default: 'YouTube' },
    watchedStatus: {
      type: String,
      enum: ['unwatched', 'watching', 'watched'],
      default: 'unwatched',
      required: true,
    },
    summary: { type: String }, // AI-generated summary field
    telegramMessageId: { type: Schema.Types.ObjectId, ref: 'TelegramItem' }, // Optional link
  },
  { timestamps: true }
);

// Compound index to ensure a user doesn't have the same videoId saved multiple times.
VideoItemSchema.index({ userId: 1, videoId: 1 }, { unique: true });

const VideoItem = mongoose.model<IVideoItem>('VideoItem', VideoItemSchema);

export default VideoItem; 