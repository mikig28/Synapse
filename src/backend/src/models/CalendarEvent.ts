import mongoose, { Document, Schema } from 'mongoose';

export interface ICalendarEvent extends Document {
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  color?: string;
  userId: mongoose.Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Google Calendar sync fields
  googleEventId?: string;
  lastSyncAt?: Date;
  syncStatus?: 'synced' | 'pending' | 'error' | 'local_only';
  location?: string;
  attendees?: string[];
  organizer?: string;
}

const CalendarEventSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
    },
    color: {
      type: String,
      default: 'bg-blue-500', // Default blue color for local events
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Google Calendar sync fields
    googleEventId: {
      type: String,
      index: true, // For quick lookups during sync
    },
    lastSyncAt: {
      type: Date,
    },
    syncStatus: {
      type: String,
      enum: ['synced', 'pending', 'error', 'local_only'],
      default: 'local_only',
    },
    location: {
      type: String,
    },
    attendees: [{
      type: String,
    }],
    organizer: {
      type: String,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const CalendarEvent = mongoose.model<ICalendarEvent>('CalendarEvent', CalendarEventSchema);

export default CalendarEvent;
