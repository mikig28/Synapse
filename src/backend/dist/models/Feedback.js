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
const FeedbackSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    email: {
        type: String,
        required: false,
        trim: true,
        lowercase: true
    },
    type: {
        type: String,
        required: true,
        enum: ['bug', 'feature', 'improvement', 'general', 'rating'],
        default: 'general'
    },
    category: {
        type: String,
        required: true,
        enum: ['ui', 'performance', 'functionality', 'content', 'mobile', 'other'],
        default: 'other'
    },
    priority: {
        type: String,
        required: true,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: function () {
            return this.type === 'rating';
        }
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    steps: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    expectedBehavior: {
        type: String,
        trim: true,
        maxlength: 500
    },
    actualBehavior: {
        type: String,
        trim: true,
        maxlength: 500
    },
    browserInfo: {
        userAgent: String,
        platform: String,
        language: String,
        viewport: {
            width: Number,
            height: Number
        }
    },
    context: {
        page: String,
        url: String,
        feature: String,
        sessionId: String
    },
    attachments: [{
            type: String,
            trim: true
        }],
    status: {
        type: String,
        required: true,
        enum: ['open', 'in_progress', 'resolved', 'closed', 'duplicate'],
        default: 'open'
    },
    tags: [{
            type: String,
            trim: true,
            lowercase: true
        }],
    adminNotes: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    resolvedAt: {
        type: Date
    },
    resolvedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    votes: {
        upvotes: {
            type: Number,
            default: 0
        },
        downvotes: {
            type: Number,
            default: 0
        },
        userVotes: {
            type: Map,
            of: String,
            enum: ['up', 'down'],
            default: new Map()
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for efficient queries
FeedbackSchema.index({ userId: 1, createdAt: -1 });
FeedbackSchema.index({ type: 1, status: 1 });
FeedbackSchema.index({ category: 1, priority: 1 });
FeedbackSchema.index({ status: 1, createdAt: -1 });
FeedbackSchema.index({ tags: 1 });
FeedbackSchema.index({ 'votes.upvotes': -1 });
// Text index for searching feedback
FeedbackSchema.index({
    title: 'text',
    description: 'text',
    tags: 'text'
}, {
    weights: {
        title: 10,
        description: 5,
        tags: 8
    }
});
// Virtual for total vote score
FeedbackSchema.virtual('voteScore').get(function () {
    return this.votes.upvotes - this.votes.downvotes;
});
// Virtual for user display name (for anonymous feedback)
FeedbackSchema.virtual('displayName').get(function () {
    if (this.userId) {
        return 'Registered User';
    }
    else if (this.email) {
        return this.email.split('@')[0] + '@***';
    }
    else {
        return 'Anonymous';
    }
});
// Pre-save middleware to auto-assign tags based on content
FeedbackSchema.pre('save', function (next) {
    // Auto-tag based on type and category
    const autoTags = [];
    autoTags.push(this.type);
    autoTags.push(this.category);
    autoTags.push(this.priority);
    // Add context-based tags
    if (this.context?.feature) {
        autoTags.push(this.context.feature.toLowerCase());
    }
    if (this.context?.page) {
        autoTags.push(this.context.page.toLowerCase());
    }
    // Merge with existing tags and remove duplicates
    this.tags = [...new Set([...this.tags, ...autoTags])];
    next();
});
// Static methods
FeedbackSchema.statics.getFeedbackStats = function () {
    return this.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                byType: {
                    $push: {
                        type: '$type',
                        count: 1
                    }
                },
                byStatus: {
                    $push: {
                        status: '$status',
                        count: 1
                    }
                },
                averageRating: {
                    $avg: {
                        $cond: [
                            { $eq: ['$type', 'rating'] },
                            '$rating',
                            null
                        ]
                    }
                },
                openCount: {
                    $sum: {
                        $cond: [
                            { $eq: ['$status', 'open'] },
                            1,
                            0
                        ]
                    }
                },
                resolvedCount: {
                    $sum: {
                        $cond: [
                            { $eq: ['$status', 'resolved'] },
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ]);
};
FeedbackSchema.statics.getTopIssues = function (limit = 10) {
    return this.find({
        status: { $in: ['open', 'in_progress'] },
        type: { $in: ['bug', 'improvement', 'feature'] }
    })
        .sort({ 'votes.upvotes': -1, createdAt: -1 })
        .limit(limit)
        .populate('userId', 'name email');
};
const Feedback = mongoose_1.default.model('Feedback', FeedbackSchema);
exports.default = Feedback;
