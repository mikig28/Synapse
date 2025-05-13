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
const VideoItemSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    originalUrl: { type: String, required: true },
    videoId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    thumbnailUrl: { type: String },
    channelTitle: { type: String },
    sourcePlatform: { type: String, enum: ['YouTube'], required: true, default: 'YouTube' },
    watchedStatus: {
        type: String,
        enum: ['unwatched', 'watching', 'watched'],
        default: 'unwatched',
        required: true,
    },
    telegramMessageId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'TelegramItem' }, // Optional link
}, { timestamps: true });
// Compound index to ensure a user doesn't have the same videoId saved multiple times.
VideoItemSchema.index({ userId: 1, videoId: 1 }, { unique: true });
const VideoItem = mongoose_1.default.model('VideoItem', VideoItemSchema);
exports.default = VideoItem;
