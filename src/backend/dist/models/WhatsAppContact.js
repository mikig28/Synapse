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
const WhatsAppContactSchema = new mongoose_1.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        index: true,
        // Remove non-numeric characters for consistency
        set: (v) => v.replace(/[^\d+]/g, '')
    },
    name: {
        type: String,
        required: true,
        index: true
    },
    avatar: { type: String },
    lastSeen: {
        type: Date,
        default: Date.now,
        index: true
    },
    isOnline: {
        type: Boolean,
        default: false,
        index: true
    },
    unreadCount: {
        type: Number,
        default: 0,
        min: 0
    },
    lastMessage: { type: String },
    lastMessageTimestamp: {
        type: Date,
        index: true
    },
    // Contact information
    email: {
        type: String,
        lowercase: true,
        validate: {
            validator: function (v) {
                return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Invalid email format'
        }
    },
    company: { type: String },
    jobTitle: { type: String },
    website: { type: String },
    address: {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String
    },
    // Business information
    businessAccountId: { type: String },
    isBusinessContact: {
        type: Boolean,
        default: false,
        index: true
    },
    labels: [{
            type: String,
            index: true
        }],
    // Interaction tracking
    totalMessages: {
        type: Number,
        default: 0,
        min: 0
    },
    totalIncomingMessages: {
        type: Number,
        default: 0,
        min: 0
    },
    totalOutgoingMessages: {
        type: Number,
        default: 0,
        min: 0
    },
    firstMessageDate: { type: Date },
    lastIncomingMessageDate: { type: Date },
    lastOutgoingMessageDate: { type: Date },
    // Contact preferences
    isBlocked: {
        type: Boolean,
        default: false,
        index: true
    },
    isMuted: {
        type: Boolean,
        default: false
    },
    muteUntil: { type: Date },
    preferredLanguage: {
        type: String,
        default: 'en'
    },
    timezone: { type: String },
    // Marketing and automation
    tags: [{
            type: String,
            index: true
        }],
    customFields: {
        type: Map,
        of: mongoose_1.Schema.Types.Mixed
    },
    segments: [String],
    optInStatus: {
        type: String,
        enum: ['opted_in', 'opted_out', 'pending'],
        default: 'pending'
    },
    // Metadata
    source: {
        type: String,
        enum: ['inbound', 'imported', 'manual', 'api'],
        default: 'inbound'
    },
    notes: { type: String }
}, {
    timestamps: true,
    // Enable text search on name and notes
    index: [
        { name: 'text', notes: 'text' },
        { lastSeen: -1 },
        { lastMessageTimestamp: -1 },
        { totalMessages: -1 }
    ]
});
// Compound indexes for efficient queries
WhatsAppContactSchema.index({ isBlocked: 1, lastSeen: -1 });
WhatsAppContactSchema.index({ isBusinessContact: 1, lastMessageTimestamp: -1 });
WhatsAppContactSchema.index({ tags: 1, lastSeen: -1 });
WhatsAppContactSchema.index({ labels: 1, lastMessageTimestamp: -1 });
// Virtual for full name with company
WhatsAppContactSchema.virtual('displayName').get(function () {
    return this.company ? `${this.name} (${this.company})` : this.name;
});
// Method to update message statistics
WhatsAppContactSchema.methods.updateMessageStats = function (isIncoming) {
    this.totalMessages += 1;
    if (isIncoming) {
        this.totalIncomingMessages += 1;
        this.lastIncomingMessageDate = new Date();
        this.unreadCount += 1;
    }
    else {
        this.totalOutgoingMessages += 1;
        this.lastOutgoingMessageDate = new Date();
        this.unreadCount = 0; // Reset unread count when we send a message
    }
    this.lastMessageTimestamp = new Date();
    if (!this.firstMessageDate) {
        this.firstMessageDate = new Date();
    }
    return this.save();
};
// Method to mark all messages as read
WhatsAppContactSchema.methods.markAllAsRead = function () {
    this.unreadCount = 0;
    return this.save();
};
// Method to block/unblock contact
WhatsAppContactSchema.methods.toggleBlock = function () {
    this.isBlocked = !this.isBlocked;
    return this.save();
};
// Method to mute/unmute contact
WhatsAppContactSchema.methods.toggleMute = function (duration) {
    this.isMuted = !this.isMuted;
    if (this.isMuted && duration) {
        this.muteUntil = new Date(Date.now() + duration * 60 * 1000); // duration in minutes
    }
    else {
        this.muteUntil = undefined;
    }
    return this.save();
};
// Static method to search contacts
WhatsAppContactSchema.statics.searchContacts = function (query, limit = 20) {
    const searchRegex = new RegExp(query, 'i');
    return this.find({
        $or: [
            { name: searchRegex },
            { phoneNumber: searchRegex },
            { email: searchRegex },
            { company: searchRegex },
            { notes: searchRegex }
        ]
    })
        .sort({ lastMessageTimestamp: -1 })
        .limit(limit);
};
// Static method to get active contacts (with recent messages)
WhatsAppContactSchema.statics.getActiveContacts = function (days = 30, limit = 50) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return this.find({
        lastMessageTimestamp: { $gte: cutoffDate }
    })
        .sort({ lastMessageTimestamp: -1 })
        .limit(limit);
};
// Pre-save middleware to update lastSeen when isOnline changes
WhatsAppContactSchema.pre('save', function (next) {
    if (this.isModified('isOnline') && this.isOnline) {
        this.lastSeen = new Date();
    }
    next();
});
const WhatsAppContact = mongoose_1.default.model('WhatsAppContact', WhatsAppContactSchema);
exports.default = WhatsAppContact;
