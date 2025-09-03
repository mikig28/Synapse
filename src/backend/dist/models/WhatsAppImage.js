"use strict";
/**
 * WhatsApp Image Model
 * For images extracted from WhatsApp messages (WAHA + Puppeteer)
 */
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
const WhatsAppImageSchema = new mongoose_1.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    chatId: {
        type: String,
        required: true,
        index: true
    },
    chatName: {
        type: String,
        trim: true
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    senderId: {
        type: String,
        required: true,
        index: true
    },
    senderName: {
        type: String,
        trim: true
    },
    caption: {
        type: String,
        maxlength: 2000
    },
    // File information
    filename: {
        type: String,
        required: true
    },
    localPath: {
        type: String,
        required: true
    },
    publicUrl: {
        type: String
    },
    size: {
        type: Number,
        required: true,
        min: 0
    },
    mimeType: {
        type: String,
        required: true
    },
    dimensions: {
        width: { type: Number, min: 0 },
        height: { type: Number, min: 0 }
    },
    // Extraction details
    extractionMethod: {
        type: String,
        enum: ['puppeteer', 'waha-plus'],
        required: true,
        default: 'puppeteer'
    },
    extractedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    extractedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Status and metadata
    isGroup: {
        type: Boolean,
        required: true,
        default: false
    },
    status: {
        type: String,
        enum: ['extracted', 'processing', 'failed'],
        required: true,
        default: 'processing'
    },
    error: {
        type: String
    },
    // Organization
    tags: [{
            type: String,
            trim: true
        }],
    isBookmarked: {
        type: Boolean,
        default: false,
        index: true
    },
    isArchived: {
        type: Boolean,
        default: false,
        index: true
    }
}, {
    timestamps: true,
    indexes: [
        { userId: 1, createdAt: -1 },
        { chatId: 1, createdAt: -1 },
        { senderId: 1, createdAt: -1 },
        { userId: 1, isArchived: 1, createdAt: -1 },
        { userId: 1, isBookmarked: 1, createdAt: -1 },
        { userId: 1, status: 1, createdAt: -1 }
    ]
});
// Text search index for captions, tags, sender names, and chat names
WhatsAppImageSchema.index({
    caption: 'text',
    tags: 'text',
    senderName: 'text',
    chatName: 'text'
});
// Static method to get images for user with filters
WhatsAppImageSchema.statics.getImagesForUser = function (userId, options = {}) {
    const query = { userId };
    if (options.chatId)
        query.chatId = options.chatId;
    if (options.senderId)
        query.senderId = options.senderId;
    if (options.isGroup !== undefined)
        query.isGroup = options.isGroup;
    if (options.bookmarked !== undefined)
        query.isBookmarked = options.bookmarked;
    if (options.archived !== undefined)
        query.isArchived = options.archived;
    if (options.status)
        query.status = options.status;
    let queryBuilder = this.find(query);
    // Text search if provided
    if (options.search) {
        queryBuilder = queryBuilder.find({
            $text: { $search: options.search }
        });
    }
    return queryBuilder
        .populate('extractedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};
// Method to bookmark image
WhatsAppImageSchema.methods.bookmark = function () {
    this.isBookmarked = !this.isBookmarked;
    return this.save();
};
// Method to archive image
WhatsAppImageSchema.methods.archive = function () {
    this.isArchived = !this.isArchived;
    return this.save();
};
// Method to add tag
WhatsAppImageSchema.methods.addTag = function (tag) {
    const cleanTag = tag.trim().toLowerCase();
    if (!this.tags.includes(cleanTag)) {
        this.tags.push(cleanTag);
        return this.save();
    }
    return Promise.resolve(this);
};
// Method to get public URL
WhatsAppImageSchema.methods.getPublicUrl = function () {
    if (this.publicUrl)
        return this.publicUrl;
    // Generate public URL based on backend configuration
    const baseUrl = process.env.BACKEND_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/api/v1/whatsapp/images/${this.messageId}`;
};
const WhatsAppImage = mongoose_1.default.model('WhatsAppImage', WhatsAppImageSchema);
exports.default = WhatsAppImage;
