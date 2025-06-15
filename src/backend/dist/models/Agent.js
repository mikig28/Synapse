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
const AgentSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: ['twitter', 'news', 'crewai_news', 'custom'],
        required: true,
    },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    configuration: {
        // Twitter agent configuration
        keywords: { type: [String], default: [] },
        minLikes: { type: Number, default: 0 },
        minRetweets: { type: Number, default: 0 },
        excludeReplies: { type: Boolean, default: true },
        // News agent configuration
        newsSources: { type: [String], default: [] },
        categories: { type: [String], default: [] },
        language: { type: String, default: 'en' },
        // CrewAI agent configuration
        topics: { type: [String], default: [] },
        crewaiSources: {
            reddit: { type: Boolean, default: true },
            linkedin: { type: Boolean, default: true },
            telegram: { type: Boolean, default: true },
            news_websites: { type: Boolean, default: true },
        },
        // Common configuration
        schedule: { type: String, default: '0 */6 * * *' }, // Every 6 hours by default
        maxItemsPerRun: { type: Number, default: 10 },
    },
    lastRun: { type: Date },
    nextRun: { type: Date },
    status: {
        type: String,
        enum: ['idle', 'running', 'error', 'paused'],
        default: 'idle',
    },
    errorMessage: { type: String },
    statistics: {
        totalRuns: { type: Number, default: 0 },
        successfulRuns: { type: Number, default: 0 },
        failedRuns: { type: Number, default: 0 },
        totalItemsProcessed: { type: Number, default: 0 },
        totalItemsAdded: { type: Number, default: 0 },
    },
}, { timestamps: true });
// Index for efficient querying
AgentSchema.index({ userId: 1, type: 1 });
AgentSchema.index({ userId: 1, isActive: 1 });
AgentSchema.index({ nextRun: 1, isActive: 1 });
const Agent = mongoose_1.default.model('Agent', AgentSchema);
exports.default = Agent;
