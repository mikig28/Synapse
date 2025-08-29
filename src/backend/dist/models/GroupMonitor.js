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
const GroupMonitorSchema = new mongoose_1.Schema({
    groupId: {
        type: String,
        required: true,
        index: true
    },
    groupName: {
        type: String,
        required: true,
        trim: true
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    targetPersons: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'PersonProfile',
            required: true
        }],
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    settings: {
        notifyOnMatch: {
            type: Boolean,
            default: true
        },
        saveAllImages: {
            type: Boolean,
            default: false
        },
        confidenceThreshold: {
            type: Number,
            default: 0.7,
            min: 0.1,
            max: 1.0
        },
        autoReply: {
            type: Boolean,
            default: false
        },
        replyMessage: {
            type: String,
            maxlength: 1000
        }
    },
    statistics: {
        totalMessages: {
            type: Number,
            default: 0
        },
        imagesProcessed: {
            type: Number,
            default: 0
        },
        personsDetected: {
            type: Number,
            default: 0
        },
        lastActivity: {
            type: Date
        }
    }
}, {
    timestamps: true,
    index: [
        { userId: 1, isActive: 1 },
        { groupId: 1, userId: 1 }
    ]
});
// Ensure unique monitoring per group per user
GroupMonitorSchema.index({ groupId: 1, userId: 1 }, { unique: true });
// Static method to get active monitors for user
GroupMonitorSchema.statics.getActiveMonitors = function (userId) {
    return this.find({
        userId: userId,
        isActive: true
    })
        .populate('targetPersons', 'name description')
        .sort({ updatedAt: -1 });
};
// Static method to find monitor by group
GroupMonitorSchema.statics.findByGroup = function (groupId) {
    return this.find({
        groupId: groupId,
        isActive: true
    }).populate('targetPersons', 'name faceEmbeddings');
};
// Method to increment statistics
GroupMonitorSchema.methods.incrementStats = function (type) {
    switch (type) {
        case 'messages':
            this.statistics.totalMessages += 1;
            break;
        case 'images':
            this.statistics.imagesProcessed += 1;
            break;
        case 'persons':
            this.statistics.personsDetected += 1;
            break;
    }
    this.statistics.lastActivity = new Date();
    return this.save();
};
// Method to toggle monitoring
GroupMonitorSchema.methods.toggleActive = function () {
    this.isActive = !this.isActive;
    return this.save();
};
const GroupMonitor = mongoose_1.default.model('GroupMonitor', GroupMonitorSchema);
exports.default = GroupMonitor;
