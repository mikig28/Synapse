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
const DocumentSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    summary: { type: String },
    documentType: {
        type: String,
        enum: ['pdf', 'markdown', 'text', 'code', 'webpage', 'video', 'audio', 'image', 'mixed'],
        required: true
    },
    // Multi-modal content
    multiModalContent: {
        text: { type: String, default: '' },
        images: [{
                id: { type: String, required: true },
                url: { type: String },
                gridFsId: { type: String },
                caption: { type: String },
                extractedText: { type: String },
                embedding: { type: [Number] },
                metadata: {
                    width: { type: Number },
                    height: { type: Number },
                    format: { type: String },
                    size: { type: Number }
                }
            }],
        videos: [{
                id: { type: String, required: true },
                url: { type: String },
                gridFsId: { type: String },
                title: { type: String },
                description: { type: String },
                transcript: { type: String },
                summary: { type: String },
                embedding: { type: [Number] },
                metadata: {
                    duration: { type: Number },
                    format: { type: String },
                    size: { type: Number }
                }
            }],
        code: [{
                id: { type: String, required: true },
                content: { type: String, required: true },
                language: { type: String, required: true },
                filename: { type: String },
                embedding: { type: [Number] },
                metadata: {
                    lines: { type: Number },
                    functions: { type: [String] },
                    classes: { type: [String] }
                }
            }]
    },
    // AI-generated embeddings
    embeddings: {
        text: { type: [Number], default: [] },
        image: { type: [Number] },
        semantic: { type: [Number], default: [] },
        summary: { type: [Number] }
    },
    // Advanced chunking
    chunks: [{
            id: { type: String, required: true },
            content: { type: String, required: true },
            type: {
                type: String,
                enum: ['paragraph', 'section', 'heading', 'code', 'table', 'list', 'quote'],
                required: true
            },
            level: { type: Number, required: true },
            embedding: { type: [Number], required: true },
            semanticScore: { type: Number, required: true },
            startIndex: { type: Number, required: true },
            endIndex: { type: Number, required: true },
            metadata: {
                heading: { type: String },
                parentChunkId: { type: String },
                childChunkIds: { type: [String] },
                keywords: { type: [String] }
            }
        }],
    // Graph-based knowledge
    graphNodes: [{
            id: { type: String, required: true },
            entity: { type: String, required: true },
            type: {
                type: String,
                enum: ['person', 'place', 'organization', 'concept', 'event', 'product', 'other'],
                required: true
            },
            description: { type: String },
            confidence: { type: Number, required: true },
            mentions: [{
                    chunkId: { type: String, required: true },
                    position: { type: Number, required: true },
                    context: { type: String, required: true }
                }],
            relationships: [{
                    targetEntityId: { type: String, required: true },
                    relationshipType: { type: String, required: true },
                    confidence: { type: Number, required: true }
                }]
        }],
    relationships: [{
            relatedDocumentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Document', required: true },
            relationshipType: {
                type: String,
                enum: ['references', 'similar', 'contradicts', 'builds_on', 'updated_by'],
                required: true
            },
            strength: { type: Number, required: true },
            extractedContext: { type: String },
            metadata: {
                extractedAt: { type: Date, default: Date.now },
                method: {
                    type: String,
                    enum: ['semantic', 'citation', 'manual', 'ai_detected'],
                    required: true
                }
            }
        }],
    // Metadata and processing
    metadata: {
        originalFilename: { type: String },
        fileSize: { type: Number },
        mimeType: { type: String },
        language: { type: String },
        author: { type: String },
        createdDate: { type: Date },
        modifiedDate: { type: Date },
        source: { type: String },
        tags: { type: [String], default: [] },
        category: { type: String },
        confidenceScore: { type: Number },
        processingStatus: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending'
        },
        processingErrors: { type: [String], default: [] },
        lastProcessedAt: { type: Date }
    },
    // Version control
    versions: [{
            versionId: { type: String, required: true },
            userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            changeType: {
                type: String,
                enum: ['create', 'update', 'delete', 'restore'],
                required: true
            },
            timestamp: { type: Date, default: Date.now },
            changes: [{
                    field: { type: String, required: true },
                    oldValue: { type: mongoose_1.Schema.Types.Mixed },
                    newValue: { type: mongoose_1.Schema.Types.Mixed }
                }],
            comment: { type: String }
        }],
    currentVersion: { type: String, required: true },
    // Collaborative features
    sharedWith: [{
            userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            permissions: {
                type: String,
                enum: ['read', 'write', 'admin'],
                required: true
            },
            sharedAt: { type: Date, default: Date.now }
        }],
    // Search and discovery
    searchKeywords: { type: [String], default: [] },
    autoTags: { type: [String], default: [] },
    // Integration with existing Synapse content
    sourceType: {
        type: String,
        enum: ['telegram', 'upload', 'web_scrape', 'manual']
    },
    sourceId: { type: mongoose_1.Schema.Types.ObjectId },
    // Timestamps
    lastAccessedAt: { type: Date, default: Date.now },
    // Location support
    location: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] }
    }
}, {
    timestamps: true,
    // Add text index for full-text search
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for efficient querying
DocumentSchema.index({ userId: 1, createdAt: -1 });
DocumentSchema.index({ userId: 1, documentType: 1 });
DocumentSchema.index({ userId: 1, 'metadata.processingStatus': 1 });
DocumentSchema.index({ 'metadata.tags': 1 });
DocumentSchema.index({ 'metadata.category': 1 });
DocumentSchema.index({ searchKeywords: 1 });
DocumentSchema.index({ autoTags: 1 });
DocumentSchema.index({ title: 'text', content: 'text', summary: 'text' });
DocumentSchema.index({ location: '2dsphere' });
// Vector search indexes (for when we implement vector database)
DocumentSchema.index({ 'embeddings.text': 1 });
DocumentSchema.index({ 'embeddings.semantic': 1 });
// Compound indexes for complex queries
DocumentSchema.index({ userId: 1, 'metadata.processingStatus': 1, createdAt: -1 });
DocumentSchema.index({ userId: 1, documentType: 1, 'metadata.category': 1 });
// Virtual for document size estimation
DocumentSchema.virtual('estimatedTokens').get(function () {
    return Math.ceil(this.content.length / 4); // Rough estimate: 4 chars per token
});
// Virtual for processing progress
DocumentSchema.virtual('processingProgress').get(function () {
    const totalSteps = 5; // chunking, embedding, entity extraction, relationships, completion
    let completedSteps = 0;
    if (this.chunks.length > 0)
        completedSteps++;
    if (this.embeddings.text.length > 0)
        completedSteps++;
    if (this.graphNodes.length > 0)
        completedSteps++;
    if (this.relationships.length > 0)
        completedSteps++;
    if (this.metadata.processingStatus === 'completed')
        completedSteps++;
    return Math.round((completedSteps / totalSteps) * 100);
});
// Pre-save middleware to update version info
DocumentSchema.pre('save', function (next) {
    this.lastAccessedAt = new Date();
    if (this.isNew) {
        this.currentVersion = '1.0.0';
        this.versions.push({
            versionId: '1.0.0',
            userId: this.userId,
            changeType: 'create',
            timestamp: new Date(),
            changes: [],
            comment: 'Initial document creation'
        });
    }
    next();
});
// Static method to find documents by semantic similarity
DocumentSchema.statics.findSimilarDocuments = function (userId, embedding, limit = 10) {
    // This will be implemented when we add vector database support
    // For now, return empty array
    return this.find({ userId }).limit(limit);
};
// Instance method to add a new version
DocumentSchema.methods.addVersion = function (userId, changeType, changes, comment) {
    const version = this.versions.length + 1;
    const versionId = `${Math.floor(version / 10)}.${version % 10}.0`;
    this.versions.push({
        versionId,
        userId,
        changeType,
        timestamp: new Date(),
        changes,
        comment
    });
    this.currentVersion = versionId;
    return this.save();
};
const Document = mongoose_1.default.model('Document', DocumentSchema);
exports.default = Document;
