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
const BookmarkItemSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    telegramMessageId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'TelegramItem', required: false },
    originalUrl: { type: String, required: true },
    sourcePlatform: {
        type: String,
        enum: ['X', 'LinkedIn', 'Reddit', 'Other'],
        required: true,
    },
    title: { type: String, default: '' },
    summary: { type: String, default: '' },
    tags: { type: [String], default: [] },
    rawPageContent: { type: String },
    status: {
        type: String,
        enum: ['pending_summary', 'summarized', 'error', 'metadata_fetched'],
        default: 'pending_summary',
    },
    fetchedTitle: { type: String },
    fetchedDescription: { type: String },
    fetchedImageUrl: { type: String },
    fetchedVideoUrl: { type: String },
}, { timestamps: true } // Automatically adds createdAt and updatedAt fields
);
// Index for efficient querying
BookmarkItemSchema.index({ userId: 1, createdAt: -1 });
BookmarkItemSchema.index({ userId: 1, sourcePlatform: 1 });
BookmarkItemSchema.index({ originalUrl: 1, userId: 1 }, { unique: true }); // Prevent duplicate bookmarks per user
const BookmarkItem = mongoose_1.default.model('BookmarkItem', BookmarkItemSchema);
exports.default = BookmarkItem;
// You might want to add a getBookmarksCollection function here if you follow the pattern
// from other models, e.g.:
// import { getDb } from '../config/database';
// export const getBookmarksCollection = () => getDb().collection<BookmarkItem>('bookmarks'); 
