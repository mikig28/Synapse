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
const WhatsAppMessageSchema = new mongoose_1.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    from: {
        type: String,
        required: true,
        index: true
    },
    to: {
        type: String,
        required: true,
        index: true
    },
    message: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['text', 'image', 'document', 'audio', 'video', 'location', 'contact'],
        required: true,
        default: 'text'
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read', 'failed', 'received'],
        required: true,
        default: 'sent'
    },
    isIncoming: {
        type: Boolean,
        required: true,
        index: true
    },
    contactId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'WhatsAppContact',
        required: true,
        index: true
    },
    // Media fields
    mediaId: { type: String },
    mediaUrl: { type: String },
    mimeType: { type: String },
    caption: { type: String },
    // Context fields for replies
    contextMessageId: { type: String },
    contextFrom: { type: String },
    // Business messaging
    businessAccountId: { type: String },
    phoneNumberId: { type: String },
    // Metadata
    metadata: {
        forwarded: { type: Boolean, default: false },
        forwardedMany: { type: Boolean, default: false },
        referral: {
            sourceUrl: String,
            sourceId: String,
            sourceType: String
        }
    }
}, {
    timestamps: true,
    // Optimize for common queries
    index: [
        { contactId: 1, timestamp: -1 },
        { from: 1, timestamp: -1 },
        { to: 1, timestamp: -1 },
        { status: 1, timestamp: -1 }
    ]
});
// Compound indexes for efficient queries
WhatsAppMessageSchema.index({ contactId: 1, timestamp: -1 });
WhatsAppMessageSchema.index({ from: 1, to: 1, timestamp: -1 });
WhatsAppMessageSchema.index({ isIncoming: 1, timestamp: -1 });
// Text search index for message content
WhatsAppMessageSchema.index({ message: 'text' });
// Method to mark message as read
WhatsAppMessageSchema.methods.markAsRead = function () {
    this.status = 'read';
    return this.save();
};
// Static method to get conversation between two parties
WhatsAppMessageSchema.statics.getConversation = function (contact1, contact2, limit = 50) {
    return this.find({
        $or: [
            { from: contact1, to: contact2 },
            { from: contact2, to: contact1 }
        ]
    })
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('contactId');
};
// Static method to get unread messages count
WhatsAppMessageSchema.statics.getUnreadCount = function (contactId) {
    return this.countDocuments({
        contactId: contactId,
        isIncoming: true,
        status: { $in: ['received', 'delivered'] }
    });
};
const WhatsAppMessage = mongoose_1.default.model('WhatsAppMessage', WhatsAppMessageSchema);
exports.default = WhatsAppMessage;
