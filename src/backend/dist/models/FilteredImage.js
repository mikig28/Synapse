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
const FilteredImageSchema = new mongoose_1.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    groupId: {
        type: String,
        required: true,
        index: true
    },
    groupName: {
        type: String,
        required: true
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
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    originalCaption: {
        type: String,
        maxlength: 1000
    },
    detectedPersons: [{
            personId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'PersonProfile',
                required: true
            },
            personName: {
                type: String,
                required: true
            },
            confidence: {
                type: Number,
                required: true,
                min: 0,
                max: 1
            },
            boundingBox: {
                x: { type: Number, required: true },
                y: { type: Number, required: true },
                width: { type: Number, required: true },
                height: { type: Number, required: true }
            }
        }],
    processingDetails: {
        facesDetected: {
            type: Number,
            required: true,
            min: 0
        },
        processingTime: {
            type: Number,
            required: true
        },
        algorithm: {
            type: String,
            required: true,
            default: 'face_recognition'
        },
        status: {
            type: String,
            enum: ['processed', 'failed', 'pending'],
            required: true,
            default: 'pending'
        },
        error: {
            type: String
        }
    },
    metadata: {
        imageSize: {
            type: Number,
            required: true
        },
        imageDimensions: {
            width: { type: Number, required: true },
            height: { type: Number, required: true }
        },
        mimeType: {
            type: String,
            required: true
        }
    },
    isNotified: {
        type: Boolean,
        default: false,
        index: true
    },
    isArchived: {
        type: Boolean,
        default: false,
        index: true
    },
    tags: [{
            type: String,
            trim: true
        }]
}, {
    timestamps: true,
    index: [
        { userId: 1, createdAt: -1 },
        { groupId: 1, createdAt: -1 },
        { 'detectedPersons.personId': 1, createdAt: -1 },
        { isArchived: 1, userId: 1, createdAt: -1 }
    ]
});
// Text search index for captions and tags
FilteredImageSchema.index({
    originalCaption: 'text',
    tags: 'text',
    senderName: 'text',
    groupName: 'text'
});
// Static method to get images for user
FilteredImageSchema.statics.getImagesForUser = function (userId, options = {}) {
    const query = { userId };
    if (options.personId) {
        query['detectedPersons.personId'] = options.personId;
    }
    if (options.groupId) {
        query.groupId = options.groupId;
    }
    if (options.archived !== undefined) {
        query.isArchived = options.archived;
    }
    return this.find(query)
        .populate('detectedPersons.personId', 'name')
        .sort({ createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};
// Method to mark as notified
FilteredImageSchema.methods.markAsNotified = function () {
    this.isNotified = true;
    return this.save();
};
// Method to archive image
FilteredImageSchema.methods.archive = function () {
    this.isArchived = true;
    return this.save();
};
// Method to add tag
FilteredImageSchema.methods.addTag = function (tag) {
    if (!this.tags.includes(tag)) {
        this.tags.push(tag);
        return this.save();
    }
    return Promise.resolve(this);
};
const FilteredImage = mongoose_1.default.model('FilteredImage', FilteredImageSchema);
exports.default = FilteredImage;
