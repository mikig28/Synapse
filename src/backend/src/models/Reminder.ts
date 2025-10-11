import mongoose, { Schema, Document } from 'mongoose';

// Reminder status types
export type ReminderStatus = 'pending' | 'sent' | 'cancelled' | 'failed';

// Reminder priority types
export type ReminderPriority = 'low' | 'medium' | 'high';

// Reminder interface
export interface IReminder extends Document {
  userId: mongoose.Types.ObjectId;
  bookmarkId: mongoose.Types.ObjectId;
  scheduledFor: Date;
  reminderMessage: string;
  status: ReminderStatus;
  telegramChatId: number;

  // Metadata from voice memo analysis
  extractedTags?: string[];
  extractedNotes?: string;
  priority?: ReminderPriority;

  // Tracking fields
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  failureReason?: string;
  failureCount?: number;

  // Recurrence support (future enhancement)
  recurrencePattern?: string;
  isRecurring?: boolean;

  // Original temporal expression from voice memo
  temporalExpression?: string;

  // Instance methods
  markAsSent(): Promise<IReminder>;
  markAsFailed(reason: string): Promise<IReminder>;
  cancel(): Promise<IReminder>;
  reschedule(newDate: Date): Promise<IReminder>;
}

// Static methods interface
export interface IReminderModel extends mongoose.Model<IReminder> {
  getDueReminders(limit?: number): Promise<IReminder[]>;
  getPendingRemindersByUser(userId: mongoose.Types.ObjectId, limit?: number): Promise<IReminder[]>;
  getRemindersByBookmark(bookmarkId: mongoose.Types.ObjectId): Promise<IReminder[]>;
}

const ReminderSchema: Schema<IReminder> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    bookmarkId: {
      type: Schema.Types.ObjectId,
      ref: 'BookmarkItem',
      required: true,
      index: true
    },
    scheduledFor: {
      type: Date,
      required: true,
      index: true
    },
    reminderMessage: {
      type: String,
      required: true,
      maxlength: 1000
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'cancelled', 'failed'],
      default: 'pending',
      required: true,
      index: true
    },
    telegramChatId: {
      type: Number,
      required: true
    },

    // Metadata fields
    extractedTags: {
      type: [String],
      default: []
    },
    extractedNotes: {
      type: String,
      maxlength: 2000
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },

    // Tracking fields
    sentAt: {
      type: Date
    },
    failureReason: {
      type: String,
      maxlength: 500
    },
    failureCount: {
      type: Number,
      default: 0,
      min: 0
    },

    // Recurrence (future feature)
    recurrencePattern: {
      type: String
    },
    isRecurring: {
      type: Boolean,
      default: false
    },

    // Original temporal expression
    temporalExpression: {
      type: String,
      maxlength: 200
    }
  },
  {
    timestamps: true // Automatically adds createdAt and updatedAt
  }
);

// Compound indexes for efficient querying
ReminderSchema.index({ userId: 1, status: 1, scheduledFor: 1 });
ReminderSchema.index({ bookmarkId: 1, status: 1 });
ReminderSchema.index({ status: 1, scheduledFor: 1 }); // For scheduler queries

// Instance methods
ReminderSchema.methods.markAsSent = async function(): Promise<IReminder> {
  this.status = 'sent';
  this.sentAt = new Date();
  return await this.save();
};

ReminderSchema.methods.markAsFailed = async function(reason: string): Promise<IReminder> {
  this.status = 'failed';
  this.failureReason = reason;
  this.failureCount = (this.failureCount || 0) + 1;
  return await this.save();
};

ReminderSchema.methods.cancel = async function(): Promise<IReminder> {
  this.status = 'cancelled';
  return await this.save();
};

ReminderSchema.methods.reschedule = async function(newDate: Date): Promise<IReminder> {
  this.scheduledFor = newDate;
  this.status = 'pending';
  this.failureReason = undefined;
  return await this.save();
};

// Static methods
ReminderSchema.statics.getDueReminders = async function(limit?: number): Promise<IReminder[]> {
  const now = new Date();
  let query = this.find({
    status: 'pending',
    scheduledFor: { $lte: now }
  })
  .populate('bookmarkId')
  .sort({ priority: -1, scheduledFor: 1 }); // High priority first, then oldest

  if (limit) {
    query = query.limit(limit);
  }

  return await query;
};

ReminderSchema.statics.getPendingRemindersByUser = async function(
  userId: mongoose.Types.ObjectId,
  limit?: number
): Promise<IReminder[]> {
  let query = this.find({
    userId,
    status: 'pending'
  })
  .populate('bookmarkId')
  .sort({ scheduledFor: 1 }); // Earliest first

  if (limit) {
    query = query.limit(limit);
  }

  return await query;
};

ReminderSchema.statics.getRemindersByBookmark = async function(
  bookmarkId: mongoose.Types.ObjectId
): Promise<IReminder[]> {
  return await this.find({ bookmarkId })
    .sort({ scheduledFor: -1 });
};

// Pre-save validation
ReminderSchema.pre('save', function(next) {
  // Ensure scheduled date is in the future for pending reminders
  if (this.status === 'pending' && this.scheduledFor < new Date()) {
    // Only enforce for new reminders, not updates
    if (this.isNew) {
      return next(new Error('Reminder scheduled date must be in the future'));
    }
  }

  next();
});

const Reminder = mongoose.model<IReminder, IReminderModel>('Reminder', ReminderSchema);

export default Reminder;
