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
const TelegramItemSchema = new mongoose_1.Schema({
    synapseUserId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: false }, // Link to Synapse User
    telegramMessageId: { type: Number, required: true },
    chatId: { type: Number, required: true },
    chatTitle: { type: String },
    fromUserId: { type: Number },
    fromUsername: { type: String },
    text: { type: String },
    urls: { type: [String], default: [] }, // Added urls field
    messageType: { type: String, required: true, default: 'text' },
    mediaFileId: { type: String }, // For later use if we download media
    mediaLocalUrl: { type: String }, // For later use
    receivedAt: { type: Date, default: Date.now },
}, { timestamps: true } // Adds createdAt and updatedAt for the DB record itself
);
// Index for efficient querying, e.g., by messageId and chatId to avoid duplicates if needed
TelegramItemSchema.index({ telegramMessageId: 1, chatId: 1 }, { unique: false }); // unique: false, as edits create new messages
TelegramItemSchema.index({ synapseUserId: 1, receivedAt: -1 });
const TelegramItem = mongoose_1.default.model('TelegramItem', TelegramItemSchema);
exports.default = TelegramItem;
