import mongoose, { Schema, Document } from 'mongoose';

export interface IIdea extends Document {
  userId: mongoose.Types.ObjectId;
  content: string;
  source?: string; // e.g., 'telegram', 'manual'
  telegramMessageId?: mongoose.Types.ObjectId; // Link to original TelegramItem
  rawTranscription?: string; // To store the full transcription if source is voice
  createdAt: Date;
  updatedAt: Date;
}

const IdeaSchema = new Schema<IIdea>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    source: { type: String },
    telegramMessageId: { type: Schema.Types.ObjectId, ref: 'TelegramItem' },
    rawTranscription: { type: String, required: false },
  },
  { timestamps: true }
);

IdeaSchema.index({ userId: 1, createdAt: -1 });

const Idea = mongoose.model<IIdea>('Idea', IdeaSchema);

export default Idea; 