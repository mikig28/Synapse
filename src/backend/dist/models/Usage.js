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
exports.Usage = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const UsageSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    period: {
        start: { type: Date, required: true, index: true },
        end: { type: Date, required: true, index: true },
        type: {
            type: String,
            enum: ['daily', 'weekly', 'monthly'],
            required: true,
            index: true
        }
    },
    features: {
        searches: {
            count: { type: Number, default: 0 },
            uniqueQueries: { type: Number, default: 0 },
            avgResponseTime: { type: Number, default: 0 },
            totalResultsReturned: { type: Number, default: 0 }
        },
        agents: {
            executionsCount: { type: Number, default: 0 },
            totalExecutionTime: { type: Number, default: 0 },
            uniqueAgentsUsed: { type: Number, default: 0 },
            scheduledAgentsCount: { type: Number, default: 0 }
        },
        data: {
            documentsUploaded: { type: Number, default: 0 },
            documentsAnalyzed: { type: Number, default: 0 },
            totalStorageUsed: { type: Number, default: 0 },
            exportJobsCreated: { type: Number, default: 0 }
        },
        integrations: {
            whatsappMessages: { type: Number, default: 0 },
            telegramMessages: { type: Number, default: 0 },
            calendarEvents: { type: Number, default: 0 },
            newsArticlesProcessed: { type: Number, default: 0 }
        },
        content: {
            notesCreated: { type: Number, default: 0 },
            ideasCreated: { type: Number, default: 0 },
            tasksCreated: { type: Number, default: 0 },
            meetingsCreated: { type: Number, default: 0 },
            bookmarksAdded: { type: Number, default: 0 }
        },
        advanced: {
            vectorSearchQueries: { type: Number, default: 0 },
            aiSummariesGenerated: { type: Number, default: 0 },
            videoTranscriptions: { type: Number, default: 0 },
            ttsGenerations: { type: Number, default: 0 }
        }
    },
    api: {
        totalRequests: { type: Number, default: 0 },
        averageRequestsPerHour: { type: Number, default: 0 },
        peakHourRequests: { type: Number, default: 0 },
        errorRate: { type: Number, default: 0 },
        avgResponseTime: { type: Number, default: 0 }
    },
    patterns: {
        mostActiveHours: [{ type: Number }],
        mostUsedFeatures: [{ type: String }],
        sessionDuration: { type: Number, default: 0 },
        loginFrequency: { type: Number, default: 0 }
    },
    resources: {
        computeTime: { type: Number, default: 0 },
        bandwidthUsed: { type: Number, default: 0 },
        apiCallsExternal: { type: Number, default: 0 },
        storageOperations: { type: Number, default: 0 }
    },
    billing: {
        estimatedCost: { type: Number, default: 0 },
        tier: {
            type: String,
            enum: ['free', 'starter', 'pro', 'enterprise'],
            default: 'free'
        },
        overageFlags: [{ type: String }],
        credits: {
            used: { type: Number, default: 0 },
            remaining: { type: Number, default: 1000 }, // Default free credits
            type: {
                type: String,
                enum: ['api_calls', 'compute_time', 'storage', 'features'],
                default: 'api_calls'
            }
        }
    },
    metadata: {
        platform: { type: String, default: 'web' },
        userAgent: { type: String, default: '' },
        location: {
            country: { type: String },
            region: { type: String },
            timezone: { type: String }
        },
        deviceInfo: {
            type: {
                type: String,
                enum: ['desktop', 'mobile', 'tablet'],
                default: 'desktop'
            },
            os: { type: String, default: '' },
            browser: { type: String, default: '' }
        }
    },
    flags: {
        isPowerUser: { type: Boolean, default: false },
        isNewUser: { type: Boolean, default: true },
        isChurnRisk: { type: Boolean, default: false },
        hasHitLimits: { type: Boolean, default: false }
    }
}, {
    timestamps: true
});
// Compound indexes for efficient querying
UsageSchema.index({ userId: 1, 'period.start': 1, 'period.type': 1 });
UsageSchema.index({ 'period.start': 1, 'period.end': 1 });
UsageSchema.index({ 'billing.tier': 1, 'flags.isPowerUser': 1 });
UsageSchema.index({ 'flags.isChurnRisk': 1, updatedAt: 1 });
// Virtual for total feature usage score
UsageSchema.virtual('totalUsageScore').get(function () {
    const features = this.features;
    return (features.searches.count +
        features.agents.executionsCount +
        features.data.documentsUploaded +
        features.integrations.whatsappMessages +
        features.integrations.telegramMessages +
        features.content.notesCreated +
        features.content.ideasCreated +
        features.content.tasksCreated +
        features.advanced.vectorSearchQueries +
        features.advanced.aiSummariesGenerated);
});
// Method to check if user has exceeded limits for their tier
UsageSchema.methods.checkUsageLimits = function () {
    const limits = this.getTierLimits();
    const overages = [];
    // Check various limits based on tier
    if (this.features.searches.count > limits.searches) {
        overages.push('searches');
    }
    if (this.features.agents.executionsCount > limits.agentExecutions) {
        overages.push('agent_executions');
    }
    if (this.features.data.totalStorageUsed > limits.storage) {
        overages.push('storage');
    }
    if (this.api.totalRequests > limits.apiRequests) {
        overages.push('api_requests');
    }
    this.billing.overageFlags = overages;
    this.flags.hasHitLimits = overages.length > 0;
    return overages;
};
// Method to get tier limits
UsageSchema.methods.getTierLimits = function () {
    const tierLimits = {
        free: {
            searches: 100,
            agentExecutions: 10,
            storage: 100 * 1024 * 1024, // 100MB
            apiRequests: 1000,
            exportJobs: 3
        },
        starter: {
            searches: 1000,
            agentExecutions: 100,
            storage: 1024 * 1024 * 1024, // 1GB
            apiRequests: 10000,
            exportJobs: 10
        },
        pro: {
            searches: 10000,
            agentExecutions: 1000,
            storage: 10 * 1024 * 1024 * 1024, // 10GB
            apiRequests: 100000,
            exportJobs: 50
        },
        enterprise: {
            searches: Infinity,
            agentExecutions: Infinity,
            storage: Infinity,
            apiRequests: Infinity,
            exportJobs: Infinity
        }
    };
    return tierLimits[this.billing.tier] || tierLimits.free;
};
// Method to calculate estimated cost
UsageSchema.methods.calculateEstimatedCost = function () {
    const pricing = {
        searchCost: 0.001, // $0.001 per search
        agentExecutionCost: 0.01, // $0.01 per agent execution
        storageCost: 0.000001, // $0.000001 per byte per month
        apiRequestCost: 0.0001, // $0.0001 per API request
        aiSummaryCost: 0.05 // $0.05 per AI summary
    };
    const cost = ((this.features.searches.count * pricing.searchCost) +
        (this.features.agents.executionsCount * pricing.agentExecutionCost) +
        (this.features.data.totalStorageUsed * pricing.storageCost) +
        (this.api.totalRequests * pricing.apiRequestCost) +
        (this.features.advanced.aiSummariesGenerated * pricing.aiSummaryCost));
    this.billing.estimatedCost = Math.round(cost * 100) / 100; // Round to 2 decimal places
    return this.billing.estimatedCost;
};
const Usage = mongoose_1.default.model('Usage', UsageSchema);
exports.Usage = Usage;
exports.default = Usage;
