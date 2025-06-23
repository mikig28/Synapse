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
      default: '#3174ad', // Default blue color
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const CalendarEvent = mongoose.model<ICalendarEvent>('CalendarEvent', CalendarEventSchema);

export default CalendarEvent;
