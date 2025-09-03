"use strict";
/**
 * WhatsApp Image Service
 * Manages on-demand image extraction and integration with the images page
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const whatsappImageExtractor_1 = __importDefault(require("./whatsappImageExtractor"));
const WhatsAppImage_1 = __importDefault(require("../models/WhatsAppImage"));
const promises_1 = __importDefault(require("fs/promises"));
const mongoose_1 = __importDefault(require("mongoose"));
class WhatsAppImageService {
    constructor() {
        this.initialized = false;
        this.extractor = new whatsappImageExtractor_1.default();
    }
    static getInstance() {
        if (!WhatsAppImageService.instance) {
            WhatsAppImageService.instance = new WhatsAppImageService();
        }
        return WhatsAppImageService.instance;
    }
    /**
     * Initialize the service
     */
    async initialize() {
        if (this.initialized)
            return;
        try {
            console.log('[WhatsApp Image Service] Initializing...');
            await this.extractor.initialize();
            this.initialized = true;
            console.log('[WhatsApp Image Service] ✅ Initialized successfully');
        }
        catch (error) {
            console.error('[WhatsApp Image Service] ❌ Initialization failed:', error);
            throw error;
        }
    }
    /**
     * Extract image on-demand when user requests it
     */
    async extractImageOnDemand(request) {
        if (!this.initialized) {
            await this.initialize();
        }
        try {
            console.log(`[WhatsApp Image Service] Processing extract request for message ${request.messageId}`);
            // Check if image already exists
            const existing = await WhatsAppImage_1.default.findOne({
                messageId: request.messageId,
                userId: request.userId
            });
            if (existing) {
                console.log(`[WhatsApp Image Service] Image already exists for message ${request.messageId}`);
                return {
                    success: true,
                    image: existing,
                    alreadyExists: true
                };
            }
            // Create database record with processing status
            const imageRecord = new WhatsAppImage_1.default({
                messageId: request.messageId,
                chatId: request.chatId,
                chatName: request.chatName,
                userId: new mongoose_1.default.Types.ObjectId(request.userId),
                senderId: request.senderId,
                senderName: request.senderName,
                caption: request.caption,
                filename: `${request.messageId}_processing.jpg`, // Temporary filename
                localPath: '', // Will be set after extraction
                size: 0,
                mimeType: 'image/jpeg',
                extractionMethod: 'puppeteer',
                extractedBy: new mongoose_1.default.Types.ObjectId(request.userId),
                isGroup: request.isGroup || false,
                status: 'processing'
            });
            await imageRecord.save();
            // Extract the image using Puppeteer
            const extractionResult = await this.extractor.extractImage(request.messageId, request.chatId);
            if (!extractionResult.success) {
                // Update record with failure
                imageRecord.status = 'failed';
                imageRecord.error = extractionResult.error;
                await imageRecord.save();
                return {
                    success: false,
                    error: extractionResult.error,
                    image: imageRecord
                };
            }
            // Update record with successful extraction
            if (extractionResult.metadata && extractionResult.localPath) {
                imageRecord.filename = extractionResult.metadata.filename;
                imageRecord.localPath = extractionResult.localPath;
                imageRecord.size = extractionResult.metadata.size;
                imageRecord.mimeType = extractionResult.metadata.mimeType;
                imageRecord.dimensions = extractionResult.metadata.dimensions;
                imageRecord.status = 'extracted';
                imageRecord.publicUrl = imageRecord.getPublicUrl();
                await imageRecord.save();
                console.log(`[WhatsApp Image Service] ✅ Successfully extracted image for message ${request.messageId}`);
                return {
                    success: true,
                    image: imageRecord
                };
            }
            else {
                imageRecord.status = 'failed';
                imageRecord.error = 'Invalid extraction result';
                await imageRecord.save();
                return {
                    success: false,
                    error: 'Invalid extraction result',
                    image: imageRecord
                };
            }
        }
        catch (error) {
            console.error(`[WhatsApp Image Service] ❌ Error extracting image:`, error);
            return {
                success: false,
                error: error.message || 'Unknown error occurred'
            };
        }
    }
    /**
     * Get user's WhatsApp images with filters
     */
    async getUserImages(userId, options = {}) {
        try {
            // Only return successfully extracted images by default
            const queryOptions = {
                ...options,
                status: 'extracted'
            };
            return await WhatsAppImage_1.default.getImagesForUser(userId, queryOptions);
        }
        catch (error) {
            console.error('[WhatsApp Image Service] Error getting user images:', error);
            return [];
        }
    }
    /**
     * Get image by message ID for a specific user
     */
    async getImageByMessageId(messageId, userId) {
        try {
            return await WhatsAppImage_1.default.findOne({
                messageId,
                userId,
                status: 'extracted'
            }).populate('extractedBy', 'name email');
        }
        catch (error) {
            console.error('[WhatsApp Image Service] Error getting image by message ID:', error);
            return null;
        }
    }
    /**
     * Serve image file
     */
    async getImageFile(messageId, userId) {
        try {
            const image = await this.getImageByMessageId(messageId, userId);
            if (!image || !image.localPath) {
                return null;
            }
            // Check if file exists
            try {
                await promises_1.default.access(image.localPath);
                return {
                    path: image.localPath,
                    mimeType: image.mimeType
                };
            }
            catch {
                console.warn(`[WhatsApp Image Service] Image file not found: ${image.localPath}`);
                return null;
            }
        }
        catch (error) {
            console.error('[WhatsApp Image Service] Error getting image file:', error);
            return null;
        }
    }
    /**
     * Update image metadata (bookmark, archive, tags)
     */
    async updateImage(messageId, userId, updates) {
        try {
            const image = await WhatsAppImage_1.default.findOne({ messageId, userId });
            if (!image)
                return null;
            // Handle bookmark toggle
            if (updates.bookmark !== undefined) {
                image.isBookmarked = updates.bookmark;
            }
            // Handle archive toggle
            if (updates.archive !== undefined) {
                image.isArchived = updates.archive;
            }
            // Handle adding tags
            if (updates.addTags) {
                for (const tag of updates.addTags) {
                    await image.addTag(tag);
                }
            }
            // Handle removing tags
            if (updates.removeTags) {
                image.tags = image.tags.filter(tag => !updates.removeTags.includes(tag));
            }
            await image.save();
            return image;
        }
        catch (error) {
            console.error('[WhatsApp Image Service] Error updating image:', error);
            return null;
        }
    }
    /**
     * Delete extracted image
     */
    async deleteImage(messageId, userId) {
        try {
            const image = await WhatsAppImage_1.default.findOne({ messageId, userId });
            if (!image)
                return false;
            // Delete file from disk
            try {
                if (image.localPath) {
                    await promises_1.default.unlink(image.localPath);
                }
            }
            catch (error) {
                console.warn('[WhatsApp Image Service] Could not delete file:', error);
            }
            // Delete database record
            await WhatsAppImage_1.default.deleteOne({ _id: image._id });
            console.log(`[WhatsApp Image Service] ✅ Deleted image for message ${messageId}`);
            return true;
        }
        catch (error) {
            console.error('[WhatsApp Image Service] Error deleting image:', error);
            return false;
        }
    }
    /**
     * Get extraction statistics for a user
     */
    async getExtractionStats(userId) {
        try {
            const stats = await WhatsAppImage_1.default.aggregate([
                { $match: { userId: new mongoose_1.default.Types.ObjectId(userId) } },
                {
                    $facet: {
                        statusCounts: [
                            { $group: { _id: '$status', count: { $sum: 1 } } }
                        ],
                        bookmarkedCount: [
                            { $match: { isBookmarked: true } },
                            { $count: 'count' }
                        ],
                        archivedCount: [
                            { $match: { isArchived: true } },
                            { $count: 'count' }
                        ],
                        chatCounts: [
                            {
                                $group: {
                                    _id: { chatId: '$chatId', chatName: '$chatName' },
                                    count: { $sum: 1 }
                                }
                            },
                            { $limit: 20 },
                            { $sort: { count: -1 } }
                        ],
                        totalCount: [
                            { $count: 'count' }
                        ]
                    }
                }
            ]);
            const result = stats[0];
            // Process status counts
            const statusMap = { total: 0, extracted: 0, processing: 0, failed: 0 };
            result.statusCounts.forEach((item) => {
                statusMap[item._id] = item.count;
            });
            statusMap.total = result.totalCount[0]?.count || 0;
            return {
                ...statusMap,
                bookmarked: result.bookmarkedCount[0]?.count || 0,
                archived: result.archivedCount[0]?.count || 0,
                byChat: result.chatCounts.map((item) => ({
                    chatId: item._id.chatId,
                    chatName: item._id.chatName,
                    count: item.count
                }))
            };
        }
        catch (error) {
            console.error('[WhatsApp Image Service] Error getting stats:', error);
            return {
                total: 0, extracted: 0, processing: 0, failed: 0,
                bookmarked: 0, archived: 0, byChat: []
            };
        }
    }
    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            await this.extractor.cleanup();
            this.initialized = false;
            console.log('[WhatsApp Image Service] 🧹 Cleanup completed');
        }
        catch (error) {
            console.error('[WhatsApp Image Service] Error during cleanup:', error);
        }
    }
    /**
     * Check if extractor is ready
     */
    isReady() {
        return this.initialized;
    }
}
exports.default = WhatsAppImageService;
