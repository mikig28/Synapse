import mongoose, { Document, Schema } from 'mongoose';

export interface IScheduledAgent extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  agentConfig: {
    type: 'crewai' | 'custom';
    topics: string[];
    sources?: {
      reddit?: boolean;
      linkedin?: boolean;
      telegram?: boolean;
      news_websites?: boolean;
    };
    parameters?: {
      maxItemsPerRun?: number;
      qualityThreshold?: number;
      timeRange?: string;
    };
  };
  schedule: {
    type: 'cron' | 'interval';
    cronExpression?: string; // For cron: "0 9 * * *" (every day at 9 AM)
    intervalMinutes?: number; // For interval: 60 (every hour)
    timezone?: string; // e.g., "America/New_York"
  };
  isActive: boolean;
  lastExecuted?: Date;
  nextExecution?: Date;
  executionCount: number;
  successCount: number;
  failureCount: number;
  lastResult?: {
    status: 'success' | 'error';
    message?: string;
    reportId?: mongoose.Types.ObjectId;
    executedAt: Date;
    duration?: number; // in milliseconds
  };
  successRate: number; // Virtual property
  createdAt: Date;
  updatedAt: Date;
  
  // Method declarations
  calculateNextExecution(): Date | undefined;
  calculateCronNextRun(cronExpression: string, timezone?: string): Date;
  markExecution(result: { status: 'success' | 'error'; message?: string; reportId?: mongoose.Types.ObjectId; duration?: number }): Promise<this>;
}

const ScheduledAgentSchema = new Schema<IScheduledAgent>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  agentConfig: {
    type: {
      type: String,
      enum: ['crewai', 'custom'],
      required: true,
      default: 'crewai'
    },
    topics: [{
      type: String,
      required: true,
      trim: true
    }],
    sources: {
      reddit: { type: Boolean, default: true },
      linkedin: { type: Boolean, default: true },
      telegram: { type: Boolean, default: true },
      news_websites: { type: Boolean, default: true }
    },
    parameters: {
      maxItemsPerRun: { type: Number, default: 10, min: 1, max: 100 },
      qualityThreshold: { type: Number, default: 0.7, min: 0, max: 1 },
      timeRange: { type: String, default: '24h', enum: ['1h', '6h', '12h', '24h', '48h', '7d'] }
    }
  },
  schedule: {
    type: {
      type: String,
      enum: ['cron', 'interval'],
      required: true
    },
    cronExpression: {
      type: String,
      validate: {
        validator: function(this: IScheduledAgent, value: string) {
          if (this.schedule.type === 'cron') {
            // Basic cron validation (5 or 6 fields)
            const parts = value.split(' ');
            return parts.length >= 5 && parts.length <= 6;
          }
          return true;
        },
        message: 'Invalid cron expression format'
      }
    },
    intervalMinutes: {
      type: Number,
      min: 1,
      max: 10080 // Max 1 week in minutes
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastExecuted: {
    type: Date,
    index: true
  },
  nextExecution: {
    type: Date,
    index: true
  },
  executionCount: {
    type: Number,
    default: 0,
    min: 0
  },
  successCount: {
    type: Number,
    default: 0,
    min: 0
  },
  failureCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastResult: {
    status: {
      type: String,
      enum: ['success', 'error']
    },
    message: String,
    reportId: {
      type: Schema.Types.ObjectId,
      ref: 'NewsItem'
    },
    executedAt: Date,
    duration: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
ScheduledAgentSchema.index({ userId: 1, isActive: 1 });
ScheduledAgentSchema.index({ nextExecution: 1, isActive: 1 });
ScheduledAgentSchema.index({ 'schedule.type': 1 });

// Virtual for success rate
ScheduledAgentSchema.virtual('successRate').get(function(this: IScheduledAgent) {
  if (this.executionCount === 0) return 0;
  return (this.successCount / this.executionCount) * 100;
});

// Pre-save middleware to calculate next execution time
ScheduledAgentSchema.pre('save', function(this: IScheduledAgent, next) {
  if (this.isModified('schedule') || this.isModified('isActive')) {
    this.nextExecution = this.calculateNextExecution();
  }
  next();
});

// Method to calculate next execution time
ScheduledAgentSchema.methods.calculateNextExecution = function(this: IScheduledAgent): Date | undefined {
  if (!this.isActive) return undefined;

  const now = new Date();
  
  if (this.schedule.type === 'interval' && this.schedule.intervalMinutes) {
    const intervalMs = this.schedule.intervalMinutes * 60 * 1000;
    return new Date(now.getTime() + intervalMs);
  }
  
  if (this.schedule.type === 'cron' && this.schedule.cronExpression) {
    // For cron, we'll use a simple calculation for common patterns
    // In production, you'd want to use a proper cron library like 'node-cron' or 'cron-parser'
    return this.calculateCronNextRun(this.schedule.cronExpression, this.schedule.timezone);
  }
  
  return undefined;
};

// Helper method for cron calculation (simplified)
ScheduledAgentSchema.methods.calculateCronNextRun = function(this: IScheduledAgent, cronExpression: string, timezone: string = 'UTC'): Date {
  // This is a simplified implementation for common cron patterns
  // For production, use a proper cron parsing library
  const now = new Date();
  
  // Common patterns:
  // "0 9 * * *" - Daily at 9 AM
  // "0 */2 * * *" - Every 2 hours
  // "0 0 * * 1" - Every Monday at midnight
  
  const parts = cronExpression.split(' ');
  const [minute, hour, day, month, weekday] = parts;
  
  const next = new Date(now);
  next.setSeconds(0);
  next.setMilliseconds(0);
  
  // Set minute
  if (minute !== '*') {
    next.setMinutes(parseInt(minute));
  }
  
  // Set hour
  if (hour !== '*') {
    next.setHours(parseInt(hour));
  }
  
  // If the time has passed today, move to tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  
  return next;
};

// Method to mark execution
ScheduledAgentSchema.methods.markExecution = function(this: IScheduledAgent, result: { status: 'success' | 'error'; message?: string; reportId?: mongoose.Types.ObjectId; duration?: number }) {
  this.lastExecuted = new Date();
  this.executionCount += 1;
  
  if (result.status === 'success') {
    this.successCount += 1;
  } else {
    this.failureCount += 1;
  }
  
  this.lastResult = {
    status: result.status,
    message: result.message,
    reportId: result.reportId,
    executedAt: new Date(),
    duration: result.duration
  };
  
  // Calculate next execution
  this.nextExecution = this.calculateNextExecution();
  
  return this.save();
};

export default mongoose.model<IScheduledAgent>('ScheduledAgent', ScheduledAgentSchema);