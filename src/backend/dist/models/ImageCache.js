"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const imageCacheSchema = new mongoose_1.Schema({
    prompt: {
        type: String,
        required: true,
        index: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    url: {
        type: String,
        required: true
    },
    source: {
        type: String,
        enum: ['unsplash', 'replicate'],
        required: true
    },
    attribution: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});
// TTL index - expire after 7 days to keep cache fresh
imageCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });
exports.default = (0, mongoose_1.model)('ImageCache', imageCacheSchema);
