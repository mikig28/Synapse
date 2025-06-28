"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const ScheduledAgentSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
                validator: function (value) {
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
            type: mongoose_1.Schema.Types.ObjectId,
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
ScheduledAgentSchema.virtual('successRate').get(function () {
    if (this.executionCount === 0)
        return 0;
    return (this.successCount / this.executionCount) * 100;
});
// Pre-save middleware to calculate next execution time
ScheduledAgentSchema.pre('save', function (next) {
    if (this.isModified('schedule') || this.isModified('isActive')) {
        this.nextExecution = this.calculateNextExecution();
    }
    next();
});
// Method to calculate next execution time
ScheduledAgentSchema.methods.calculateNextExecution = function () {
    if (!this.isActive)
        return undefined;
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
ScheduledAgentSchema.methods.calculateCronNextRun = function (cronExpression, timezone = 'UTC') {
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
ScheduledAgentSchema.methods.markExecution = function (result) {
    this.lastExecuted = new Date();
    this.executionCount += 1;
    if (result.status === 'success') {
        this.successCount += 1;
    }
    else {
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
exports.default = mongoose_1.default.model('ScheduledAgent', ScheduledAgentSchema);
