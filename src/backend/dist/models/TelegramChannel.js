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
const TelegramChannelMessageSchema = new mongoose_1.Schema({
    messageId: { type: Number, required: true },
    text: { type: String },
    mediaType: {
        type: String,
        enum: ['photo', 'video', 'document', 'audio', 'voice', 'sticker']
    },
    mediaUrl: { type: String },
    mediaFileId: { type: String },
    author: { type: String },
    date: { type: Date, required: true },
    views: { type: Number, default: 0 },
    forwards: { type: Number, default: 0 },
    reactions: [{
            emoji: String,
            count: Number
        }],
    urls: [String],
    hashtags: [String]
}, { _id: false });
const TelegramChannelSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    channelId: { type: String, required: true }, // Can be @username or numeric ID
    channelTitle: { type: String, required: true },
    channelUsername: { type: String },
    channelDescription: { type: String },
    channelType: {
        type: String,
        enum: ['channel', 'group', 'supergroup'],
        default: 'channel'
    },
    isActive: { type: Boolean, default: true },
    lastFetchedMessageId: { type: Number },
    totalMessages: { type: Number, default: 0 },
    messages: [TelegramChannelMessageSchema],
    keywords: [String], // Optional filtering
    fetchInterval: { type: Number, default: 30 }, // Default 30 minutes
    lastFetchedAt: { type: Date },
    lastError: { type: String } // Store error messages
}, {
    timestamps: true,
    // Limit messages array size to prevent document size issues
    strict: true
});
// Indexes for efficient querying
TelegramChannelSchema.index({ userId: 1, channelId: 1 }, { unique: true });
TelegramChannelSchema.index({ userId: 1, isActive: 1 });
TelegramChannelSchema.index({ 'messages.date': -1 });
TelegramChannelSchema.index({ 'messages.hashtags': 1 });
// Limit messages array to last 1000 messages to prevent MongoDB document size limits
TelegramChannelSchema.pre('save', function () {
    if (this.messages && this.messages.length > 1000) {
        this.messages = this.messages.slice(-1000); // Keep latest 1000
    }
});
const TelegramChannel = mongoose_1.default.model('TelegramChannel', TelegramChannelSchema);
exports.default = TelegramChannel;
