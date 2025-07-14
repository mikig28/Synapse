import mongoose, { Schema, Document } from 'mongoose';

// Define Point interface for GeoJSON
interface Point {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface ITask extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'deferred';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
  reminderEnabled?: boolean; // Toggle for Telegram reminders
  source?: string; // e.g., 'telegram', 'manual', 'voice_memo'
  telegramMessageId?: mongoose.Types.ObjectId; // Link to original TelegramItem
  rawTranscription?: string; // To store the full transcription if source is voice
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'deferred'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    dueDate: { type: Date },
    reminderEnabled: { type: Boolean, default: false },
    source: { type: String },
    telegramMessageId: { type: Schema.Types.ObjectId, ref: 'TelegramItem' },
    rawTranscription: { type: String, required: false },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },
      required: false
    }
  },
  { timestamps: true }
);

TaskSchema.index({ userId: 1, status: 1, createdAt: -1 });
TaskSchema.index({ location: '2dsphere' });

const Task = mongoose.model<ITask>('Task', TaskSchema);

export default Task; 