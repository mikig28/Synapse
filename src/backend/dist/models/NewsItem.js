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
const NewsItemSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    agentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agent' },
    runId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'AgentRun' },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    content: { type: String },
    url: { type: String, required: true },
    urlToImage: { type: String },
    source: {
        id: { type: String },
        name: { type: String, required: true, trim: true },
    },
    author: { type: String, trim: true },
    publishedAt: { type: Date, required: true },
    category: { type: String, trim: true },
    language: { type: String, default: 'en' },
    country: { type: String },
    summary: { type: String },
    tags: { type: [String], default: [] },
    sentiment: {
        type: String,
        enum: ['positive', 'negative', 'neutral'],
    },
    relevanceScore: { type: Number, min: 0, max: 1 },
    status: {
        type: String,
        enum: ['pending', 'summarized', 'archived', 'error'],
        default: 'pending',
    },
    isRead: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false },
    readAt: { type: Date },
    contentHash: { type: String, sparse: true }, // MD5 hash for duplicate detection
    metadata: { type: mongoose_1.Schema.Types.Mixed }, // Additional metadata storage
    generatedImage: {
        url: { type: String },
        source: { type: String, enum: ['unsplash', 'replicate'] },
        attribution: { type: String }
    }
}, { timestamps: true });
// Index for efficient querying
NewsItemSchema.index({ userId: 1, createdAt: -1 });
NewsItemSchema.index({ userId: 1, isRead: 1 });
NewsItemSchema.index({ userId: 1, isFavorite: 1 });
NewsItemSchema.index({ userId: 1, category: 1 });
NewsItemSchema.index({ userId: 1, publishedAt: -1 });
NewsItemSchema.index({ url: 1, userId: 1 }, { unique: true }); // Prevent duplicate news items per user
NewsItemSchema.index({ agentId: 1, createdAt: -1 });
NewsItemSchema.index({ runId: 1, createdAt: -1 });
NewsItemSchema.index({ contentHash: 1, createdAt: -1 }); // Index for content-based duplicate detection
// Method to mark as read
NewsItemSchema.methods.markAsRead = function () {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
};
// Method to toggle favorite
NewsItemSchema.methods.toggleFavorite = function () {
    this.isFavorite = !this.isFavorite;
    return this.save();
};
const NewsItem = mongoose_1.default.model('NewsItem', NewsItemSchema);
exports.default = NewsItem;
