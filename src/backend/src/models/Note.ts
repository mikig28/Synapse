import mongoose, { Schema, Document } from 'mongoose';

export interface INote extends Document {
  userId: mongoose.Types.ObjectId;
  title?: string;
  content: string;
  source?: string; // e.g., 'telegram', 'manual'
  telegramMessageId?: mongoose.Types.ObjectId; // Link to original TelegramItem
  rawTranscription?: string; // To store the full transcription if source is voice
  createdAt: Date;
  updatedAt: Date;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

const NoteSchema = new Schema<INote>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String },
    content: { type: String, required: true },
    source: { type: String },
    telegramMessageId: { type: Schema.Types.ObjectId, ref: 'TelegramItem' },
    rawTranscription: { type: String },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] }
    }
  },
  { timestamps: true }
);

NoteSchema.index({ userId: 1, createdAt: -1 });
NoteSchema.index({ location: '2dsphere' });

const Note = mongoose.model<INote>('Note', NoteSchema);

export default Note; 