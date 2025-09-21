import mongoose, { Document, Schema } from 'mongoose';

export interface IVideoSource extends Document {
  userId: mongoose.Types.ObjectId;
  kind: 'youtube';
  createdAt: Date;
  updatedAt: Date;
}

const VideoSourceSchema = new Schema<IVideoSource>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: ['youtube'], required: true, default: 'youtube', index: true },
  },
  { timestamps: true }
);

VideoSourceSchema.index({ userId: 1, kind: 1 }, { unique: true });

const VideoSource = mongoose.model<IVideoSource>('VideoSource', VideoSourceSchema);
export default VideoSource;


