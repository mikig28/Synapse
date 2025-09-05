import mongoose, { Schema, Document } from 'mongoose';

export interface ISenderSummary {
  senderName: string;
  senderPhone: string;
  messageCount: number;
  summary: string;
  topKeywords: string[];
  topEmojis: string[];
  firstMessageTime: Date;
  lastMessageTime: Date;
}

export interface IGroupAnalytics {
  totalMessages: number;
  activeParticipants: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  topKeywords: string[];
  topEmojis: string[];
  messageTypes: {
    text: number;
    media: number;
    other: number;
  };
  activityPeaks: {
    hour: number;
    count: number;
  }[];
}

export interface IWhatsAppGroupSummary extends Document {
  groupId: string;
  groupName: string;
  userId: mongoose.Types.ObjectId;
  summaryDate: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  senderSummaries: ISenderSummary[];
  groupAnalytics: IGroupAnalytics;
  summary: string;
  generatedAt: Date;
  processingTimeMs: number;
  status: 'generating' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  markCompleted(processingTimeMs: number): Promise<void>;
  markFailed(errorMessage: string): Promise<void>;
}

const SenderSummarySchema = new Schema({
  senderName: { type: String, required: true },
  senderPhone: { type: String, required: true },
  messageCount: { type: Number, required: true, min: 0 },
  summary: { type: String, required: true, maxlength: 300 },
  topKeywords: [{ type: String, maxlength: 50 }],
  topEmojis: [{ type: String, maxlength: 10 }],
  firstMessageTime: { type: Date, required: true },
  lastMessageTime: { type: Date, required: true }
}, { _id: false });

const GroupAnalyticsSchema = new Schema({
  totalMessages: { type: Number, required: true, min: 0 },
  activeParticipants: { type: Number, required: true, min: 0 },
  timeRange: {
    start: { type: Date, required: true },
    end: { type: Date, required: true }
  },
  topKeywords: [{ type: String, maxlength: 50 }],
  topEmojis: [{ type: String, maxlength: 10 }],
  messageTypes: {
    text: { type: Number, default: 0, min: 0 },
    media: { type: Number, default: 0, min: 0 },
    other: { type: Number, default: 0, min: 0 }
  },
  activityPeaks: [{
    hour: { type: Number, min: 0, max: 23 },
    count: { type: Number, min: 0 }
  }]
}, { _id: false });

const WhatsAppGroupSummarySchema: Schema<IWhatsAppGroupSummary> = new Schema(
  {
    groupId: {
      type: String,
      required: true,
      index: true
    },
    groupName: {
      type: String,
      required: true,
      trim: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    summaryDate: {
      type: Date,
      required: true,
      index: true
    },
    timeRange: {
      start: { type: Date, required: true },
      end: { type: Date, required: true }
    },
    senderSummaries: [SenderSummarySchema],
    groupAnalytics: GroupAnalyticsSchema,
    summary: {
      type: String,
      required: true,
      maxlength: 2000
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    processingTimeMs: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['generating', 'completed', 'failed'],
      default: 'generating',
      index: true
    },
    errorMessage: {
      type: String,
      maxlength: 500
    }
  },
  {
    timestamps: true,
    index: [
      { userId: 1, summaryDate: -1 },
      { groupId: 1, summaryDate: -1 },
      { status: 1, createdAt: -1 }
    ]
  }
);

// Ensure unique summary per group per day per user
WhatsAppGroupSummarySchema.index(
  { groupId: 1, userId: 1, summaryDate: 1 },
  { unique: true }
);

// Static method to get recent summaries for user
WhatsAppGroupSummarySchema.statics.getRecentSummaries = function(
  userId: string, 
  days: number = 7
) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.find({
    userId: userId,
    summaryDate: { $gte: cutoffDate },
    status: 'completed'
  })
  .sort({ summaryDate: -1 })
  .limit(50);
};

// Static method to get summaries for specific group
WhatsAppGroupSummarySchema.statics.getGroupSummaries = function(
  groupId: string,
  userId: string,
  limit: number = 10
) {
  return this.find({
    groupId: groupId,
    userId: userId,
    status: 'completed'
  })
  .sort({ summaryDate: -1 })
  .limit(limit);
};

// Method to mark summary as completed
WhatsAppGroupSummarySchema.methods.markCompleted = function(
  this: IWhatsAppGroupSummary,
  processingTimeMs: number
) {
  this.status = 'completed';
  this.processingTimeMs = processingTimeMs;
  this.generatedAt = new Date();
  return this.save();
};

// Method to mark summary as failed
WhatsAppGroupSummarySchema.methods.markFailed = function(
  this: IWhatsAppGroupSummary,
  errorMessage: string
) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  this.processingTimeMs = Date.now() - this.createdAt.getTime();
  return this.save();
};

const WhatsAppGroupSummary = mongoose.model<IWhatsAppGroupSummary>(
  'WhatsAppGroupSummary', 
  WhatsAppGroupSummarySchema
);

export default WhatsAppGroupSummary;