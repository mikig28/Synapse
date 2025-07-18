import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

// Multi-modal content interfaces
export interface IImageData {
  id: string;
  url?: string;
  gridFsId?: string;
  caption?: string;
  extractedText?: string;
  embedding?: number[];
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
    size?: number;
  };
}

export interface IVideoData {
  id: string;
  url?: string;
  gridFsId?: string;
  title?: string;
  description?: string;
  transcript?: string;
  summary?: string;
  embedding?: number[];
  metadata?: {
    duration?: number;
    format?: string;
    size?: number;
  };
}

export interface ICodeData {
  id: string;
  content: string;
  language: string;
  filename?: string;
  embedding?: number[];
  metadata?: {
    lines?: number;
    functions?: string[];
    classes?: string[];
  };
}

// Advanced chunk interface for semantic chunking
export interface ISmartChunk {
  id: string;
  content: string;
  type: 'paragraph' | 'section' | 'heading' | 'code' | 'table' | 'list' | 'quote';
  level: number; // Hierarchy level (0 = document, 1 = section, 2 = subsection, etc.)
  embedding: number[];
  semanticScore: number; // Similarity score with surrounding chunks
  startIndex: number;
  endIndex: number;
  metadata?: {
    heading?: string;
    parentChunkId?: string;
    childChunkIds?: string[];
    keywords?: string[];
    agenticReason?: string;
  };
}

// Graph-based relationship interface
export interface IDocumentRelationship {
  relatedDocumentId: mongoose.Types.ObjectId;
  relationshipType: 'references' | 'similar' | 'contradicts' | 'builds_on' | 'updated_by';
  strength: number; // 0-1 confidence score
  extractedContext?: string;
  metadata?: {
    extractedAt: Date;
    method: 'semantic' | 'citation' | 'manual' | 'ai_detected';
  };
}

// Knowledge graph entities
export interface IGraphNode {
  id: string;
  entity: string;
  type: 'person' | 'place' | 'organization' | 'concept' | 'event' | 'product' | 'other';
  description?: string;
  confidence: number;
  mentions: {
    chunkId: string;
    position: number;
    context: string;
  }[];
  relationships: {
    targetEntityId: string;
    relationshipType: string;
    confidence: number;
  }[];
}

// Document metadata interface
export interface IDocumentMetadata {
  originalFilename?: string;
  fileSize?: number;
  mimeType?: string;
  language?: string;
  author?: string;
  createdDate?: Date;
  modifiedDate?: Date;
  source?: string;
  tags?: string[];
  category?: string;
  confidenceScore?: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingErrors?: string[];
  lastProcessedAt?: Date;
}

// Version control for collaborative editing
export interface IDocumentVersion {
  versionId: string;
  userId: mongoose.Types.ObjectId;
  changeType: 'create' | 'update' | 'delete' | 'restore';
  timestamp: Date;
  changes: {
    field: string;
    oldValue?: any;
    newValue?: any;
  }[];
  comment?: string;
}

// Main document interface
export interface IDocument extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  summary?: string;
  documentType: 'pdf' | 'markdown' | 'text' | 'code' | 'webpage' | 'video' | 'audio' | 'image' | 'mixed';
  
  // Multi-modal content
  multiModalContent: {
    text: string;
    images: IImageData[];
    videos: IVideoData[];
    code: ICodeData[];
  };
  
  // AI-generated embeddings
  embeddings: {
    text: number[];
    image?: number[];
    semantic: number[];
    summary?: number[];
  };
  
  // Advanced chunking
  chunks: ISmartChunk[];
  
  // Graph-based knowledge
  graphNodes: IGraphNode[];
  relationships: IDocumentRelationship[];
  
  // Metadata and processing
  metadata: IDocumentMetadata;
  
  // Version control
  versions: IDocumentVersion[];
  currentVersion: string;
  
  // Collaborative features
  sharedWith: {
    userId: mongoose.Types.ObjectId;
    permissions: 'read' | 'write' | 'admin';
    sharedAt: Date;
  }[];
  
  // Search and discovery
  searchKeywords: string[];
  autoTags: string[];
  
  // Integration with existing Synapse content
  sourceType?: 'telegram' | 'upload' | 'web_scrape' | 'manual';
  sourceId?: mongoose.Types.ObjectId; // Link to TelegramItem, BookmarkItem, etc.
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
  
  // Location support (inherited from existing Note model)
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

const DocumentSchema = new Schema<IDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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
      relatedDocumentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
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
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      changeType: { 
        type: String, 
        enum: ['create', 'update', 'delete', 'restore'],
        required: true 
      },
      timestamp: { type: Date, default: Date.now },
      changes: [{
        field: { type: String, required: true },
        oldValue: { type: Schema.Types.Mixed },
        newValue: { type: Schema.Types.Mixed }
      }],
      comment: { type: String }
    }],
    
    currentVersion: { type: String, required: true },
    
    // Collaborative features
    sharedWith: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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
    sourceId: { type: Schema.Types.ObjectId },
    
    // Timestamps
    lastAccessedAt: { type: Date, default: Date.now },
    
    // Location support
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] }
    }
  },
  { 
    timestamps: true,
    // Add text index for full-text search
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

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
DocumentSchema.virtual('estimatedTokens').get(function() {
  return Math.ceil(this.content.length / 4); // Rough estimate: 4 chars per token
});

// Virtual for processing progress
DocumentSchema.virtual('processingProgress').get(function() {
  const totalSteps = 5; // chunking, embedding, entity extraction, relationships, completion
  let completedSteps = 0;
  
  if (this.chunks.length > 0) completedSteps++;
  if (this.embeddings.text.length > 0) completedSteps++;
  if (this.graphNodes.length > 0) completedSteps++;
  if (this.relationships.length > 0) completedSteps++;
  if (this.metadata.processingStatus === 'completed') completedSteps++;
  
  return Math.round((completedSteps / totalSteps) * 100);
});

// Pre-save middleware to update version info
DocumentSchema.pre('save', function(next) {
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
DocumentSchema.statics.findSimilarDocuments = function(userId: mongoose.Types.ObjectId, embedding: number[], limit: number = 10) {
  // This will be implemented when we add vector database support
  // For now, return empty array
  return this.find({ userId }).limit(limit);
};

// Instance method to add a new version
DocumentSchema.methods.addVersion = function(userId: mongoose.Types.ObjectId, changeType: string, changes: any[], comment?: string) {
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

const Document = mongoose.model<IDocument>('Document', DocumentSchema);

export default Document;