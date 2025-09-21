import mongoose, { Document, Schema } from 'mongoose';

export type VideoModerationStatus = 'pending' | 'approved' | 'hidden';

export interface IVideo extends Document {
  userId: mongoose.Types.ObjectId;
  source: 'youtube';
  videoId: string;
  subscriptionId?: mongoose.Types.ObjectId;
  title: string;
  channelTitle?: string;
  description?: string;
  thumbnails?: Record<string, { url: string; width?: number; height?: number }>;
  publishedAt?: Date;
  relevance?: number;
  status: VideoModerationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const VideoSchema = new Schema<IVideo>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    source: { type: String, enum: ['youtube'], required: true, default: 'youtube', index: true },
    videoId: { type: String, required: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'KeywordSubscription', index: true },
    title: { type: String, required: true },
    channelTitle: { type: String },
    description: { type: String },
    thumbnails: { type: Schema.Types.Mixed },
    publishedAt: { type: Date, index: true },
    relevance: { type: Number, default: 0, index: true },
    status: { type: String, enum: ['pending', 'approved', 'hidden'], default: 'pending', index: true },
  },
  { timestamps: true }
);

// Unique compound index to dedupe by user+source+videoId
VideoSchema.index({ userId: 1, source: 1, videoId: 1 }, { unique: true });

// Text index for search across title and description
VideoSchema.index({ title: 'text', description: 'text' });

const Video = mongoose.model<IVideo>('Video', VideoSchema);
export default Video;


