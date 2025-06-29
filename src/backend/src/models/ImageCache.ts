import { Schema, model, Document } from 'mongoose';

export interface ImageCacheDoc extends Document {
  prompt: string;          // normalised prompt/topic
  url: string;             // CDN / Replicate URL
  source: 'unsplash' | 'replicate';  // Which service provided the image
  attribution?: string;    // Attribution text (required for Unsplash)
  createdAt: Date;
}

const imageCacheSchema = new Schema<ImageCacheDoc>({
  prompt: { 
    type: String, 
    required: true,
    index: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  url: { 
    type: String, 
    required: true 
  },
  source: {
    type: String,
    enum: ['unsplash', 'replicate'],
    required: true
  },
  attribution: {
    type: String,
    trim: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
});

// TTL index - expire after 7 days to keep cache fresh
imageCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

export default model<ImageCacheDoc>('ImageCache', imageCacheSchema); 