"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = exports.getDocumentStats = exports.getSimilarDocuments = exports.getProcessingStatus = exports.searchDocuments = exports.deleteDocument = exports.updateDocument = exports.createDocument = exports.uploadDocument = exports.getDocument = exports.getDocuments = void 0;
const Document_1 = __importDefault(require("../../models/Document"));
const chunkingService_1 = require("../../services/chunkingService");
const vectorDatabaseService_1 = require("../../services/vectorDatabaseService");
const graphRAGService_1 = require("../../services/graphRAGService");
const selfReflectiveRAGService_1 = require("../../services/selfReflectiveRAGService");
const server_1 = require("../../server");
const mongoose_1 = __importDefault(require("mongoose"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    dest: 'uploads/',
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
        }
        else {
            cb(new Error('Unsupported file type'), false);
        }
    },
});
exports.upload = upload;
/**
 * Get all documents for a user
 */
const getDocuments = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { page = 1, limit = 20, search, type, category, tags, sortBy = 'createdAt', sortOrder = 'desc', } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const query = { userId: new mongoose_1.default.Types.ObjectId(userId) };
        // Add filters
        if (search) {
            query.$text = { $search: search };
        }
        if (type) {
            query.documentType = type;
        }
        if (category) {
            query['metadata.category'] = category;
        }
        if (tags) {
            const tagArray = tags.split(',').map(tag => tag.trim());
            query['metadata.tags'] = { $in: tagArray };
        }
        const documents = await Document_1.default.find(query)
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(Number(limit))
            .populate('userId', 'email');
        const total = await Document_1.default.countDocuments(query);
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
    }
    catch (error) {
        console.error('Error getting documents:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getDocuments = getDocuments;
/**
 * Get a specific document
 */
const getDocument = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const document = await Document_1.default.findOne({
            _id: new mongoose_1.default.Types.ObjectId(id),
            userId: new mongoose_1.default.Types.ObjectId(userId),
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
    }
    catch (error) {
        console.error('Error getting document:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getDocument = getDocument;
/**
 * Upload and process a document
 */
const uploadDocument = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        const { title, category, tags, chunkingStrategy = 'hybrid' } = req.body;
        // Create document record
        const document = new Document_1.default({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            title: title || file.originalname,
            content: '', // Will be populated after processing
            documentType: getDocumentType(file.mimetype),
            metadata: {
                originalFilename: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype,
                category: category || 'general',
                tags: tags ? tags.split(',').map((tag) => tag.trim()) : [],
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
            currentVersion: '1.0.0',
            sharedWith: [],
            searchKeywords: [],
            autoTags: [],
            sourceType: 'upload',
        });
        const savedDocument = await document.save();
        // Process document asynchronously
        processDocumentAsync(savedDocument, file.path, chunkingStrategy);
        res.json({
            success: true,
            data: savedDocument,
            message: 'Document uploaded successfully. Processing in background.',
        });
    }
    catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.uploadDocument = uploadDocument;
/**
 * Create a document from text
 */
const createDocument = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { title, content, documentType = 'text', category, tags, chunkingStrategy = 'hybrid', } = req.body;
        if (!title || !content) {
            return res.status(400).json({ success: false, error: 'Title and content are required' });
        }
        const document = new Document_1.default({
            userId: new mongoose_1.default.Types.ObjectId(userId),
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
    }
    catch (error) {
        console.error('Error creating document:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.createDocument = createDocument;
/**
 * Update a document
 */
const updateDocument = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const document = await Document_1.default.findOne({
            _id: new mongoose_1.default.Types.ObjectId(id),
            userId: new mongoose_1.default.Types.ObjectId(userId),
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
                    key.split('.').reduce((obj, k) => obj[k], document) :
                    document[key];
                changes.push({
                    field: key,
                    oldValue,
                    newValue: updates[key],
                });
                if (key.includes('.')) {
                    const [parent, child] = key.split('.');
                    document[parent][child] = updates[key];
                }
                else {
                    document[key] = updates[key];
                }
            }
        }
        // Add version
        await document.addVersion(new mongoose_1.default.Types.ObjectId(userId), 'update', changes, updates.comment);
        // If content changed, reprocess
        if (updates.content) {
            document.metadata.processingStatus = 'pending';
            processDocumentAsync(document, null, 'hybrid');
        }
        res.json({
            success: true,
            data: document,
        });
    }
    catch (error) {
        console.error('Error updating document:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.updateDocument = updateDocument;
/**
 * Delete a document
 */
const deleteDocument = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const document = await Document_1.default.findOneAndDelete({
            _id: new mongoose_1.default.Types.ObjectId(id),
            userId: new mongoose_1.default.Types.ObjectId(userId),
        });
        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }
        // Delete from vector database
        await vectorDatabaseService_1.vectorDatabaseService.deleteDocument(id);
        res.json({
            success: true,
            message: 'Document deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.deleteDocument = deleteDocument;
/**
 * Search documents using RAG
 */
const searchDocuments = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { query, strategy = 'hybrid', includeDebugInfo = false } = req.body;
        if (!query) {
            return res.status(400).json({ success: false, error: 'Query is required' });
        }
        const searchResults = await selfReflectiveRAGService_1.selfReflectiveRAGService.processQuery({
            query,
            userId,
            searchStrategy: strategy,
            includeDebugInfo,
        });
        res.json({
            success: true,
            data: searchResults,
        });
    }
    catch (error) {
        console.error('Error searching documents:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.searchDocuments = searchDocuments;
/**
 * Get document processing status
 */
const getProcessingStatus = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const document = await Document_1.default.findOne({
            _id: new mongoose_1.default.Types.ObjectId(id),
            userId: new mongoose_1.default.Types.ObjectId(userId),
        });
        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }
        res.json({
            success: true,
            data: {
                status: document.metadata.processingStatus,
                progress: document.processingProgress,
                errors: document.metadata.processingErrors,
                lastProcessedAt: document.metadata.lastProcessedAt,
            },
        });
    }
    catch (error) {
        console.error('Error getting processing status:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getProcessingStatus = getProcessingStatus;
/**
 * Get similar documents
 */
const getSimilarDocuments = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const { limit = 5 } = req.query;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const similarDocuments = await vectorDatabaseService_1.vectorDatabaseService.findSimilarDocuments(id, userId, Number(limit));
        res.json({
            success: true,
            data: similarDocuments,
        });
    }
    catch (error) {
        console.error('Error getting similar documents:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getSimilarDocuments = getSimilarDocuments;
/**
 * Get document statistics
 */
const getDocumentStats = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const totalDocuments = await Document_1.default.countDocuments({
            userId: new mongoose_1.default.Types.ObjectId(userId)
        });
        const statusCounts = await Document_1.default.aggregate([
            { $match: { userId: new mongoose_1.default.Types.ObjectId(userId) } },
            { $group: { _id: '$metadata.processingStatus', count: { $sum: 1 } } },
        ]);
        const typeCounts = await Document_1.default.aggregate([
            { $match: { userId: new mongoose_1.default.Types.ObjectId(userId) } },
            { $group: { _id: '$documentType', count: { $sum: 1 } } },
        ]);
        const vectorStats = await vectorDatabaseService_1.vectorDatabaseService.getStats();
        res.json({
            success: true,
            data: {
                totalDocuments,
                statusCounts,
                typeCounts,
                vectorDatabase: vectorStats,
            },
        });
    }
    catch (error) {
        console.error('Error getting document stats:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getDocumentStats = getDocumentStats;
/**
 * Async document processing
 */
async function processDocumentAsync(document, filePath, chunkingStrategy) {
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
        const chunks = await chunkingService_1.chunkingService.chunkDocument(document.content, {
            strategy: chunkingStrategy,
            maxChunkSize: 1000,
            chunkOverlap: 100,
            minChunkSize: 100,
            preserveStructure: true,
            documentType: document.documentType,
        });
        // Generate embeddings for chunks
        for (const chunk of chunks) {
            chunk.embedding = await vectorDatabaseService_1.vectorDatabaseService.generateEmbedding(chunk.content);
        }
        document.chunks = chunks;
        // Extract knowledge graph
        const knowledgeGraph = await graphRAGService_1.graphRAGService.extractKnowledgeGraph(chunks, document._id.toString(), document.title);
        document.graphNodes = graphRAGService_1.graphRAGService.convertToGraphNodes(knowledgeGraph.entities);
        // Generate document embeddings
        document.embeddings.text = await vectorDatabaseService_1.vectorDatabaseService.generateEmbedding(document.content);
        document.embeddings.semantic = await vectorDatabaseService_1.vectorDatabaseService.generateEmbedding(`${document.title} ${document.content}`);
        // Store in vector database
        await vectorDatabaseService_1.vectorDatabaseService.storeDocumentChunks(document.userId.toString(), document._id.toString(), chunks, {
            title: document.title,
            documentType: document.documentType,
            tags: document.metadata.tags,
        });
        // Update status
        document.metadata.processingStatus = 'completed';
        document.metadata.lastProcessedAt = new Date();
        await document.save();
        // Emit real-time update
        if (server_1.io) {
            server_1.io.emit('document_processed', {
                documentId: document._id.toString(),
                userId: document.userId.toString(),
                status: 'completed',
            });
        }
        console.log(`[DocumentProcessor]: Successfully processed document ${document._id}`);
    }
    catch (error) {
        console.error(`[DocumentProcessor]: Error processing document ${document._id}:`, error);
        // Update status
        document.metadata.processingStatus = 'failed';
        document.metadata.processingErrors = [error.message];
        await document.save();
        // Emit error
        if (server_1.io) {
            server_1.io.emit('document_processing_error', {
                documentId: document._id.toString(),
                userId: document.userId.toString(),
                error: error.message,
            });
        }
    }
    finally {
        // Cleanup temporary file
        if (filePath && fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
    }
}
/**
 * Extract content from file
 */
async function extractContentFromFile(filePath, documentType) {
    const content = fs_1.default.readFileSync(filePath, 'utf8');
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
function getDocumentType(mimeType) {
    const typeMap = {
        'application/pdf': 'pdf',
        'text/plain': 'text',
        'text/markdown': 'markdown',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'pdf',
        'text/html': 'webpage',
        'application/json': 'code',
    };
    return typeMap[mimeType] || 'text';
}
