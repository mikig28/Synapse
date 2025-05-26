import mongoose, { Schema, Document } from 'mongoose';

export interface IMeeting extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  audioFilePath?: string;
  audioFileName?: string;
  audioFileSize?: number;
  duration?: number; // in seconds
  transcription?: string;
  summary?: string;
  keyHighlights?: string[];
  extractedTasks?: Array<{
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    taskId?: mongoose.Types.ObjectId; // Reference to created Task
  }>;
  extractedNotes?: Array<{
    content: string;
    noteId?: mongoose.Types.ObjectId; // Reference to created Note
  }>;
  transcriptionMethod?: 'local' | 'api' | 'dedicated';
  status: 'recording' | 'processing' | 'completed' | 'failed';
  processingProgress?: number; // 0-100
  errorMessage?: string;
  meetingDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingSchema = new Schema<IMeeting>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    audioFilePath: { type: String },
    audioFileName: { type: String },
    audioFileSize: { type: Number },
    duration: { type: Number },
    transcription: { type: String },
    summary: { type: String },
    keyHighlights: [{ type: String }],
    extractedTasks: [{
      title: { type: String, required: true },
      description: { type: String },
      priority: { 
        type: String, 
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      },
      taskId: { type: Schema.Types.ObjectId, ref: 'Task' }
    }],
    extractedNotes: [{
      content: { type: String, required: true },
      noteId: { type: Schema.Types.ObjectId, ref: 'Note' }
    }],
    transcriptionMethod: {
      type: String,
      enum: ['local', 'api', 'dedicated'],
      default: 'api'
    },
    status: {
      type: String,
      enum: ['recording', 'processing', 'completed', 'failed'],
      default: 'processing'
    },
    processingProgress: { type: Number, default: 0, min: 0, max: 100 },
    errorMessage: { type: String },
    meetingDate: { type: Date, required: true }
  },
  { timestamps: true }
);

MeetingSchema.index({ userId: 1, meetingDate: -1 });
MeetingSchema.index({ userId: 1, status: 1 });
MeetingSchema.index({ userId: 1, createdAt: -1 });

const Meeting = mongoose.model<IMeeting>('Meeting', MeetingSchema);

export default Meeting;
