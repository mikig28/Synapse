"use strict";
/**
 * WhatsApp Images Controller
 * Handles on-demand image extraction from WhatsApp messages
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = exports.initializeService = exports.checkExtractionStatus = exports.getExtractionStats = exports.deleteImage = exports.updateImage = exports.serveImageFile = exports.getImageByMessageId = exports.getUserImages = exports.extractImage = void 0;
const whatsappImageService_1 = __importDefault(require("../../services/whatsappImageService"));
const path_1 = __importDefault(require("path"));
// Get WhatsApp Image service instance
const getImageService = () => {
    return whatsappImageService_1.default.getInstance();
};
/**
 * Extract image from WhatsApp message on-demand
 */
const extractImage = async (req, res) => {
    try {
        const { messageId, chatId, chatName, senderId, senderName, caption, isGroup } = req.body;
        // Get user ID from authenticated request
        const userId = req.user?.id?.toString();
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        if (!messageId || !chatId || !senderId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: messageId, chatId, and senderId are required'
            });
        }
        console.log(`[WhatsApp Images] Extract request for message ${messageId} by user ${userId}`);
        const imageService = getImageService();
        // Initialize service if not already initialized
        if (!imageService.isReady()) {
            await imageService.initialize();
        }
        const result = await imageService.extractImageOnDemand({
            messageId,
            chatId,
            chatName,
            senderId,
            senderName,
            caption,
            isGroup: Boolean(isGroup),
            userId
        });
        if (result.success) {
            console.log(`[WhatsApp Images] ✅ Successfully extracted image for message ${messageId}`);
            res.json({
                success: true,
                data: {
                    ...result.image?.toObject(),
                    alreadyExists: result.alreadyExists || false
                }
            });
        }
        else {
            console.error(`[WhatsApp Images] ❌ Failed to extract image: ${result.error}`);
            res.status(400).json({
                success: false,
                error: result.error || 'Failed to extract image'
            });
        }
    }
    catch (error) {
        console.error('[WhatsApp Images] Error in extract image:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during image extraction'
        });
    }
};
exports.extractImage = extractImage;
/**
 * Get user's extracted WhatsApp images with filters
 */
const getUserImages = async (req, res) => {
    try {
        const userId = req.user?.id?.toString();
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const { chatId, senderId, isGroup, bookmarked, archived, search, limit, skip } = req.query;
        const options = {
            chatId: chatId,
            senderId: senderId,
            isGroup: isGroup === 'true' ? true : isGroup === 'false' ? false : undefined,
            bookmarked: bookmarked === 'true' ? true : bookmarked === 'false' ? false : undefined,
            archived: archived === 'true' ? true : archived === 'false' ? false : undefined,
            search: search,
            limit: limit ? parseInt(limit, 10) : undefined,
            skip: skip ? parseInt(skip, 10) : undefined
        };
        const imageService = getImageService();
        const images = await imageService.getUserImages(userId, options);
        console.log(`[WhatsApp Images] Retrieved ${images.length} images for user ${userId}`);
        res.json({
            success: true,
            data: images,
            pagination: {
                limit: options.limit || 50,
                skip: options.skip || 0,
                total: images.length
            }
        });
    }
    catch (error) {
        console.error('[WhatsApp Images] Error getting user images:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve images'
        });
    }
};
exports.getUserImages = getUserImages;
/**
 * Get specific image by message ID
 */
const getImageByMessageId = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user?.id?.toString();
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        if (!messageId) {
            return res.status(400).json({
                success: false,
                error: 'Message ID is required'
            });
        }
        const imageService = getImageService();
        const image = await imageService.getImageByMessageId(messageId, userId);
        if (!image) {
            return res.status(404).json({
                success: false,
                error: 'Image not found'
            });
        }
        res.json({
            success: true,
            data: image
        });
    }
    catch (error) {
        console.error('[WhatsApp Images] Error getting image by message ID:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve image'
        });
    }
};
exports.getImageByMessageId = getImageByMessageId;
/**
 * Serve image file
 */
const serveImageFile = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user?.id?.toString();
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        if (!messageId) {
            return res.status(400).json({
                success: false,
                error: 'Message ID is required'
            });
        }
        const imageService = getImageService();
        const imageFile = await imageService.getImageFile(messageId, userId);
        if (!imageFile) {
            return res.status(404).json({
                success: false,
                error: 'Image file not found'
            });
        }
        // Set appropriate headers
        res.setHeader('Content-Type', imageFile.mimeType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        // Stream the file
        res.sendFile(path_1.default.resolve(imageFile.path));
    }
    catch (error) {
        console.error('[WhatsApp Images] Error serving image file:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to serve image file'
        });
    }
};
exports.serveImageFile = serveImageFile;
/**
 * Update image (bookmark, archive, tags)
 */
const updateImage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user?.id?.toString();
        const { bookmark, archive, addTags, removeTags } = req.body;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        if (!messageId) {
            return res.status(400).json({
                success: false,
                error: 'Message ID is required'
            });
        }
        const imageService = getImageService();
        const updatedImage = await imageService.updateImage(messageId, userId, {
            bookmark,
            archive,
            addTags: addTags ? (Array.isArray(addTags) ? addTags : [addTags]) : undefined,
            removeTags: removeTags ? (Array.isArray(removeTags) ? removeTags : [removeTags]) : undefined
        });
        if (!updatedImage) {
            return res.status(404).json({
                success: false,
                error: 'Image not found'
            });
        }
        res.json({
            success: true,
            data: updatedImage
        });
    }
    catch (error) {
        console.error('[WhatsApp Images] Error updating image:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update image'
        });
    }
};
exports.updateImage = updateImage;
/**
 * Delete extracted image
 */
const deleteImage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user?.id?.toString();
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        if (!messageId) {
            return res.status(400).json({
                success: false,
                error: 'Message ID is required'
            });
        }
        const imageService = getImageService();
        const deleted = await imageService.deleteImage(messageId, userId);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Image not found'
            });
        }
        res.json({
            success: true,
            message: 'Image deleted successfully'
        });
    }
    catch (error) {
        console.error('[WhatsApp Images] Error deleting image:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete image'
        });
    }
};
exports.deleteImage = deleteImage;
/**
 * Get extraction statistics for user
 */
const getExtractionStats = async (req, res) => {
    try {
        const userId = req.user?.id?.toString();
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const imageService = getImageService();
        const stats = await imageService.getExtractionStats(userId);
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('[WhatsApp Images] Error getting extraction stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve statistics'
        });
    }
};
exports.getExtractionStats = getExtractionStats;
/**
 * Check extraction status (if image is already extracted)
 */
const checkExtractionStatus = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user?.id?.toString();
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        if (!messageId) {
            return res.status(400).json({
                success: false,
                error: 'Message ID is required'
            });
        }
        const imageService = getImageService();
        const image = await imageService.getImageByMessageId(messageId, userId);
        res.json({
            success: true,
            data: {
                messageId,
                isExtracted: !!image,
                status: image?.status || 'not_extracted',
                extractedAt: image?.extractedAt || null,
                publicUrl: image?.getPublicUrl() || null
            }
        });
    }
    catch (error) {
        console.error('[WhatsApp Images] Error checking extraction status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check extraction status'
        });
    }
};
exports.checkExtractionStatus = checkExtractionStatus;
/**
 * Initialize image extraction service
 */
const initializeService = async (req, res) => {
    try {
        console.log('[WhatsApp Images] Service initialization request received');
        const imageService = getImageService();
        if (imageService.isReady()) {
            return res.json({
                success: true,
                message: 'Image extraction service is already initialized',
                ready: true
            });
        }
        await imageService.initialize();
        res.json({
            success: true,
            message: 'Image extraction service initialized successfully',
            ready: true
        });
    }
    catch (error) {
        console.error('[WhatsApp Images] Error initializing service:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initialize image extraction service',
            details: error.message
        });
    }
};
exports.initializeService = initializeService;
/**
 * Health check for image extraction service
 */
const healthCheck = async (req, res) => {
    try {
        const imageService = getImageService();
        const isReady = imageService.isReady();
        res.json({
            success: true,
            data: {
                ready: isReady,
                service: 'whatsapp-image-extraction',
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[WhatsApp Images] Error in health check:', error);
        res.status(500).json({
            success: false,
            error: 'Health check failed'
        });
    }
};
exports.healthCheck = healthCheck;
