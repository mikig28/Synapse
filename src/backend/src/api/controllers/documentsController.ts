import { Request, Response } from 'express';
import Document, { IDocument, ISmartChunk } from '../../models/Document';
import { chunkingService } from '../../services/chunkingService';
import { vectorDatabaseService } from '../../services/vectorDatabaseService';
import { graphRAGService } from '../../services/graphRAGService';
import { selfReflectiveRAGService } from '../../services/selfReflectiveRAGService';
import { io } from '../../server';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('[DocumentController] Created uploads directory:', uploadsDir);
}

// Configure multer for file uploads
const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/html',
      'application/json',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type') as any, false);
    }
  },
});

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Get all documents for a user
 */
export const getDocuments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const {
      page = 1,
      limit = 20,
      search,
      type,
      category,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const query: any = { userId: new mongoose.Types.ObjectId(userId) };

    // Add filters
    if (search) {
      query.$text = { $search: search as string };
    }
    
    if (type) {
      query.documentType = type;
    }
    
    if (category) {
      query['metadata.category'] = category;
    }
    
    if (tags) {
      const tagArray = (tags as string).split(',').map(tag => tag.trim());
      query['metadata.tags'] = { $in: tagArray };
    }

    const documents = await Document.find(query)
      .sort({ [sortBy as string]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('userId', 'email');

    const total = await Document.countDocuments(query);

    res.json({
      success: true,
      data: {
        documents,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error getting documents:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Get a specific document
 */
export const getDocument = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const document = await Document.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    }).populate('userId', 'email');

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // Update last accessed time
    document.lastAccessedAt = new Date();
    await document.save();

    res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('Error getting document:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Upload and process a document
 */
export const uploadDocument = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('[uploadDocument] Starting upload process');
    
    const userId = req.user?.id;
    console.log('[uploadDocument] User ID:', userId);
    
    if (!userId) {
      console.log('[uploadDocument] No user ID found - unauthorized');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const file = req.file;
    console.log('[uploadDocument] File received:', file ? {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    } : 'No file');
    
    if (!file) {
      console.log('[uploadDocument] No file uploaded');
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { title, category, tags, chunkingStrategy = 'hybrid' } = req.body;
    console.log('[uploadDocument] Request body:', { title, category, tags, chunkingStrategy });

    console.log('[uploadDocument] Creating MongoDB ObjectId for userId:', userId);
    const userObjectId = new mongoose.Types.ObjectId(userId);
    console.log('[uploadDocument] Created userObjectId:', userObjectId);

    console.log('[uploadDocument] Getting document type for mimetype:', file.mimetype);
    const docType = getDocumentType(file.mimetype);
    console.log('[uploadDocument] Document type:', docType);

    console.log('[uploadDocument] Creating document object');
    // Create document record with all required fields
    const document = new Document({
      userId: userObjectId,
      title: title || file.originalname,
      content: 'File uploaded successfully. Content extraction pending.', // Required field
      documentType: docType,
      metadata: {
        originalFilename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        category: category || 'general',
        tags: tags ? tags.split(',').map((tag: string) => tag.trim()) : [],
        processingStatus: 'pending',
      },
      multiModalContent: {
        text: '',
        images: [],
        videos: [],
        code: [],
      },
      embeddings: {
        text: [],
        semantic: [],
      },
      chunks: [],
      graphNodes: [],
      relationships: [],
      versions: [],
      currentVersion: '1.0.0', // Required field
      sharedWith: [],
      searchKeywords: [],
      autoTags: [],
      sourceType: 'upload',
    });
    console.log('[uploadDocument] Document object created successfully');

    console.log('[uploadDocument] Attempting to save document to database');
    const savedDocument = await document.save();
    console.log('[uploadDocument] Document saved successfully with ID:', savedDocument._id);

    // Return response immediately - skip complex processing for now
    res.json({
      success: true,
      data: savedDocument,
      message: 'Document uploaded successfully.',
    });

    // Clean up the uploaded file
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        console.log('[uploadDocument] Cleaned up temporary file:', file.path);
      }
    } catch (cleanupError) {
      console.error('[uploadDocument] Failed to clean up file:', cleanupError);
    }

    console.log('[uploadDocument] Upload process completed successfully');

    // Start background processing asynchronously (non-blocking)
    setImmediate(async () => {
      try {
        console.log('[uploadDocument] Starting background processing for document:', savedDocument._id);
        
        // Update status to processing
        await Document.findByIdAndUpdate(savedDocument._id, {
          'metadata.processingStatus': 'processing'
        });

        // Process document in background with error handling
        await processDocumentAsync(savedDocument, file.path, chunkingStrategy);
        
        console.log('[uploadDocument] Background processing completed for document:', savedDocument._id);
      } catch (processError) {
        console.error('[uploadDocument] Background processing failed for document:', savedDocument._id, processError);
        
        // Update document status to failed
        try {
          await Document.findByIdAndUpdate(savedDocument._id, {
            'metadata.processingStatus': 'failed',
            'metadata.processingErrors': [(processError as Error).message]
          });
        } catch (updateError) {
          console.error('[uploadDocument] Failed to update document status after processing error:', updateError);
        }
      }
    });
  } catch (error) {
    console.error('[uploadDocument] Error uploading document:', error);
    console.error('[uploadDocument] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[uploadDocument] Error message:', error instanceof Error ? error.message : String(error));
    
    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
};

/**
 * Create a document from text
 */
export const createDocument = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const {
      title,
      content,
      documentType = 'text',
      category,
      tags,
      chunkingStrategy = 'hybrid',
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content are required' });
    }

    const document = new Document({
      userId: new mongoose.Types.ObjectId(userId),
      title,
      content,
      documentType,
      metadata: {
        category: category || 'general',
        tags: tags || [],
        processingStatus: 'pending',
      },
      multiModalContent: {
        text: content,
        images: [],
        videos: [],
        code: [],
      },
      embeddings: {
        text: [],
        semantic: [],
      },
      chunks: [],
      graphNodes: [],
      relationships: [],
      versions: [],
      currentVersion: '1.0.0',
      sharedWith: [],
      searchKeywords: [],
      autoTags: [],
      sourceType: 'manual',
    });

    const savedDocument = await document.save();

    // Process document asynchronously
    processDocumentAsync(savedDocument, null, chunkingStrategy);

    res.json({
      success: true,
      data: savedDocument,
      message: 'Document created successfully. Processing in background.',
    });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Update a document
 */
export const updateDocument = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const document = await Document.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const updates = req.body;
    const allowedUpdates = ['title', 'content', 'metadata.category', 'metadata.tags'];
    
    // Create version entry
    const changes = [];
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        const oldValue = key.includes('.') ? 
          key.split('.').reduce((obj: any, k: string) => obj[k], document) : 
          document[key as keyof typeof document];
        
        changes.push({
          field: key,
          oldValue,
          newValue: updates[key],
        });
        
        if (key.includes('.')) {
          const [parent, child] = key.split('.');
          (document as any)[parent][child] = updates[key];
        } else {
          (document as any)[key] = updates[key];
        }
      }
    }

    // Add version manually since method doesn't exist
    const version = document.versions.length + 1;
    const versionId = `${Math.floor(version / 10)}.${version % 10}.0`;
    
    document.versions.push({
      versionId,
      userId: new mongoose.Types.ObjectId(userId),
      changeType: 'update',
      timestamp: new Date(),
      changes,
      comment: updates.comment,
    });
    
    document.currentVersion = versionId;
    await document.save();

    // If content changed, reprocess
    if (updates.content) {
      document.metadata.processingStatus = 'pending';
      processDocumentAsync(document, null, 'hybrid');
    }

    res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Delete a document
 */
export const deleteDocument = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const document = await Document.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // Delete from vector database
    await vectorDatabaseService.deleteDocument(id);

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Search documents using RAG
 */
export const searchDocuments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { query, strategy = 'hybrid', includeDebugInfo = false } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    const searchResults = await selfReflectiveRAGService.processQuery({
      query,
      userId,
      searchStrategy: strategy,
      includeDebugInfo,
    });

    res.json({
      success: true,
      data: searchResults,
    });
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Get document processing status
 */
export const getProcessingStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const document = await Document.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    res.json({
      success: true,
      data: {
        status: document.metadata.processingStatus,
        progress: 50, // Simplified progress calculation
        errors: document.metadata.processingErrors,
        lastProcessedAt: document.metadata.lastProcessedAt,
      },
    });
  } catch (error) {
    console.error('Error getting processing status:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Get similar documents
 */
export const getSimilarDocuments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { limit = 5 } = req.query;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const similarDocuments = await vectorDatabaseService.findSimilarDocuments(
      id,
      userId,
      Number(limit)
    );

    res.json({
      success: true,
      data: similarDocuments,
    });
  } catch (error) {
    console.error('Error getting similar documents:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Get document statistics
 */
export const getDocumentStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const totalDocuments = await Document.countDocuments({ 
      userId: new mongoose.Types.ObjectId(userId) 
    });

    const statusCounts = await Document.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$metadata.processingStatus', count: { $sum: 1 } } },
    ]);

    const typeCounts = await Document.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$documentType', count: { $sum: 1 } } },
    ]);

    const vectorStats = await vectorDatabaseService.getStats();

    res.json({
      success: true,
      data: {
        totalDocuments,
        statusCounts,
        typeCounts,
        vectorDatabase: vectorStats,
      },
    });
  } catch (error) {
    console.error('Error getting document stats:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Async document processing
 */
async function processDocumentAsync(
  document: IDocument,
  filePath: string | null,
  chunkingStrategy: string
) {
  try {
    console.log(`[DocumentProcessor]: Processing document ${document._id}`);
    
    // Update status
    document.metadata.processingStatus = 'processing';
    await document.save();

    // Extract content if file upload
    if (filePath) {
      const content = await extractContentFromFile(filePath, document.documentType);
      document.content = content;
      document.multiModalContent.text = content;
    }

    // Generate chunks
    const chunks = await chunkingService.chunkDocument(document.content, {
      strategy: chunkingStrategy as any,
      maxChunkSize: 1000,
      chunkOverlap: 100,
      minChunkSize: 100,
      preserveStructure: true,
      documentType: document.documentType,
    });

    // Generate embeddings for chunks
    for (const chunk of chunks) {
      chunk.embedding = await vectorDatabaseService.generateEmbedding(chunk.content);
    }

    document.chunks = chunks;

    // Extract knowledge graph
    const knowledgeGraph = await graphRAGService.extractKnowledgeGraph(
      chunks,
      (document._id as mongoose.Types.ObjectId).toString(),
      document.title
    );

    document.graphNodes = graphRAGService.convertToGraphNodes(knowledgeGraph.entities);

    // Generate document embeddings
    document.embeddings.text = await vectorDatabaseService.generateEmbedding(document.content);
    document.embeddings.semantic = await vectorDatabaseService.generateEmbedding(
      `${document.title} ${document.content}`
    );

    // Store in vector database
    await vectorDatabaseService.storeDocumentChunks(
      document.userId.toString(),
      (document._id as mongoose.Types.ObjectId).toString(),
      chunks,
      {
        title: document.title,
        documentType: document.documentType,
        tags: document.metadata.tags,
      }
    );

    // Update status
    document.metadata.processingStatus = 'completed';
    document.metadata.lastProcessedAt = new Date();
    await document.save();

    // Emit real-time update
    if (io) {
      io.emit('document_processed', {
        documentId: (document._id as mongoose.Types.ObjectId).toString(),
        userId: document.userId.toString(),
        status: 'completed',
      });
    }

    console.log(`[DocumentProcessor]: Successfully processed document ${document._id}`);
  } catch (error) {
    console.error(`[DocumentProcessor]: Error processing document ${document._id}:`, error);
    
    // Update status
    document.metadata.processingStatus = 'failed';
    document.metadata.processingErrors = [(error as Error).message];
    await document.save();

    // Emit error
    if (io) {
      io.emit('document_processing_error', {
        documentId: (document._id as mongoose.Types.ObjectId).toString(),
        userId: document.userId.toString(),
        error: (error as Error).message,
      });
    }
  } finally {
    // Cleanup temporary file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

/**
 * Extract content from file
 */
async function extractContentFromFile(filePath: string, documentType: string): Promise<string> {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Basic content extraction - in production, use specialized libraries
  switch (documentType) {
    case 'pdf':
      // Use pdf-parse or similar
      return content;
    case 'text':
    case 'markdown':
      return content;
    default:
      return content;
  }
}

/**
 * Determine document type from MIME type
 */
function getDocumentType(mimeType: string): string {
  const typeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'text/plain': 'text',
    'text/markdown': 'markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'pdf',
    'text/html': 'webpage',
    'application/json': 'code',
  };

  return typeMap[mimeType] || 'text';
}

/**
 * Simplified upload endpoint for debugging
 */
export const uploadDocumentSimple = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('[uploadDocumentSimple] Starting simple upload process');
    
    const userId = req.user?.id;
    console.log('[uploadDocumentSimple] User ID:', userId);
    
    if (!userId) {
      console.log('[uploadDocumentSimple] No user ID found - unauthorized');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const file = req.file;
    console.log('[uploadDocumentSimple] File received:', file ? {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    } : 'No file');
    
    if (!file) {
      console.log('[uploadDocumentSimple] No file uploaded');
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Create a basic document structure to satisfy frontend expectations
    const basicDocument = {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(userId),
      title: file.originalname,
      content: '',
      documentType: getDocumentType(file.mimetype),
      metadata: {
        originalFilename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        category: 'general',
        tags: [],
        processingStatus: 'completed',
      },
      sourceType: 'upload',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    res.json({
      success: true,
      message: 'File uploaded successfully (simplified version)',
      data: basicDocument
    });
    
    // Clean up the uploaded file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
  } catch (error) {
    console.error('[uploadDocumentSimple] Error:', error);
    console.error('[uploadDocumentSimple] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: errorMessage
    });
  }
};

export { upload };