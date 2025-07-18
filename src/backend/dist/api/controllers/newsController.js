"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhanceAnalysisReports = exports.generateTestImage = exports.getImageStats = exports.enhanceRecentNews = exports.enhanceNewsWithImage = exports.bulkMarkAsRead = exports.getNewsStatistics = exports.getNewsCategories = exports.archiveNewsItem = exports.deleteNewsItem = exports.toggleFavorite = exports.markAsRead = exports.getNewsItemById = exports.getNewsItems = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const NewsItem_1 = __importDefault(require("../../models/NewsItem"));
const newsEnhancementService_1 = require("../../services/newsEnhancementService");
const imageService_1 = require("../../services/imageService");
// Get all news items for the authenticated user with pagination
const getNewsItems = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const category = req.query.category;
        const source = req.query.source;
        const isRead = req.query.isRead;
        const isFavorite = req.query.isFavorite;
        const search = req.query.search;
        const tags = req.query.tags;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const runId = req.query.runId;
        const skip = (page - 1) * limit;
        // Build filter object
        const filter = { userId: new mongoose_1.default.Types.ObjectId(userId) };
        if (category) {
            filter.category = category;
        }
        if (source) {
            filter['source.id'] = source;
        }
        if (isRead !== undefined) {
            filter.isRead = isRead === 'true';
        }
        if (isFavorite !== undefined) {
            filter.isFavorite = isFavorite === 'true';
        }
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { summary: { $regex: search, $options: 'i' } },
                { 'source.name': { $regex: search, $options: 'i' } },
            ];
        }
        if (tags) {
            filter.tags = { $in: tags.split(',').map(tag => tag.trim()) };
        }
        if (startDate || endDate) {
            filter.publishedAt = {};
            if (startDate) {
                filter.publishedAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.publishedAt.$lte = new Date(endDate);
            }
        }
        if (runId) {
            filter.runId = new mongoose_1.default.Types.ObjectId(runId);
        }
        // Get total count
        const totalItems = await NewsItem_1.default.countDocuments(filter);
        const totalPages = Math.ceil(totalItems / limit);
        // Get news items
        const newsItems = await NewsItem_1.default.find(filter)
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('agentId', 'name type');
        res.json({
            success: true,
            data: newsItems,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        });
    }
    catch (error) {
        console.error('[NewsController] Error fetching news items:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch news items',
            message: error.message,
        });
    }
};
exports.getNewsItems = getNewsItems;
// Get a specific news item by ID
const getNewsItemById = async (req, res) => {
    try {
        const { newsId } = req.params;
        const userId = req.user.id;
        const newsItem = await NewsItem_1.default.findOne({
            _id: newsId,
            userId: new mongoose_1.default.Types.ObjectId(userId),
        }).populate('agentId', 'name type');
        if (!newsItem) {
            res.status(404).json({
                success: false,
                error: 'News item not found',
            });
            return;
        }
        res.json({
            success: true,
            data: newsItem,
        });
    }
    catch (error) {
        console.error('[NewsController] Error fetching news item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch news item',
            message: error.message,
        });
    }
};
exports.getNewsItemById = getNewsItemById;
// Mark news item as read
const markAsRead = async (req, res) => {
    try {
        const { newsId } = req.params;
        const userId = req.user.id;
        const newsItem = await NewsItem_1.default.findOne({
            _id: newsId,
            userId: new mongoose_1.default.Types.ObjectId(userId),
        });
        if (!newsItem) {
            res.status(404).json({
                success: false,
                error: 'News item not found',
            });
            return;
        }
        await newsItem.markAsRead();
        res.json({
            success: true,
            data: newsItem,
            message: 'News item marked as read',
        });
    }
    catch (error) {
        console.error('[NewsController] Error marking news item as read:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark news item as read',
            message: error.message,
        });
    }
};
exports.markAsRead = markAsRead;
// Toggle favorite status
const toggleFavorite = async (req, res) => {
    try {
        const { newsId } = req.params;
        const userId = req.user.id;
        const newsItem = await NewsItem_1.default.findOne({
            _id: newsId,
            userId: new mongoose_1.default.Types.ObjectId(userId),
        });
        if (!newsItem) {
            res.status(404).json({
                success: false,
                error: 'News item not found',
            });
            return;
        }
        await newsItem.toggleFavorite();
        res.json({
            success: true,
            data: newsItem,
            message: `News item ${newsItem.isFavorite ? 'added to' : 'removed from'} favorites`,
        });
    }
    catch (error) {
        console.error('[NewsController] Error toggling favorite:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle favorite',
            message: error.message,
        });
    }
};
exports.toggleFavorite = toggleFavorite;
// Delete a news item
const deleteNewsItem = async (req, res) => {
    try {
        const { newsId } = req.params;
        const userId = req.user.id;
        const result = await NewsItem_1.default.findOneAndDelete({
            _id: newsId,
            userId: new mongoose_1.default.Types.ObjectId(userId),
        });
        if (!result) {
            res.status(404).json({
                success: false,
                error: 'News item not found',
            });
            return;
        }
        res.json({
            success: true,
            message: 'News item deleted successfully',
        });
    }
    catch (error) {
        console.error('[NewsController] Error deleting news item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete news item',
            message: error.message,
        });
    }
};
exports.deleteNewsItem = deleteNewsItem;
// Archive/unarchive news item
const archiveNewsItem = async (req, res) => {
    try {
        const { newsId } = req.params;
        const userId = req.user.id;
        const { archive } = req.body; // true to archive, false to unarchive
        const newsItem = await NewsItem_1.default.findOne({
            _id: newsId,
            userId: new mongoose_1.default.Types.ObjectId(userId),
        });
        if (!newsItem) {
            res.status(404).json({
                success: false,
                error: 'News item not found',
            });
            return;
        }
        newsItem.status = archive ? 'archived' : 'pending';
        await newsItem.save();
        res.json({
            success: true,
            data: newsItem,
            message: `News item ${archive ? 'archived' : 'unarchived'} successfully`,
        });
    }
    catch (error) {
        console.error('[NewsController] Error archiving news item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to archive news item',
            message: error.message,
        });
    }
};
exports.archiveNewsItem = archiveNewsItem;
// Get news categories for the user
const getNewsCategories = async (req, res) => {
    try {
        const userId = req.user.id;
        const categories = await NewsItem_1.default.distinct('category', {
            userId: new mongoose_1.default.Types.ObjectId(userId),
            category: { $ne: null },
        });
        res.json({
            success: true,
            data: categories.filter(cat => cat), // Remove null/undefined values
        });
    }
    catch (error) {
        console.error('[NewsController] Error fetching news categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch news categories',
            message: error.message,
        });
    }
};
exports.getNewsCategories = getNewsCategories;
// Get news statistics for the user
const getNewsStatistics = async (req, res) => {
    try {
        const userId = req.user.id;
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const [totalItems, unreadItems, favoriteItems, archivedItems, last24Hours, last7Days,] = await Promise.all([
            NewsItem_1.default.countDocuments({ userId: userObjectId }),
            NewsItem_1.default.countDocuments({ userId: userObjectId, isRead: false }),
            NewsItem_1.default.countDocuments({ userId: userObjectId, isFavorite: true }),
            NewsItem_1.default.countDocuments({ userId: userObjectId, status: 'archived' }),
            NewsItem_1.default.countDocuments({
                userId: userObjectId,
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            }),
            NewsItem_1.default.countDocuments({
                userId: userObjectId,
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            }),
        ]);
        res.json({
            success: true,
            data: {
                totalItems,
                unreadItems,
                favoriteItems,
                archivedItems,
                last24Hours,
                last7Days,
                readPercentage: totalItems > 0 ? Math.round(((totalItems - unreadItems) / totalItems) * 100) : 0,
            },
        });
    }
    catch (error) {
        console.error('[NewsController] Error fetching news statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch news statistics',
            message: error.message,
        });
    }
};
exports.getNewsStatistics = getNewsStatistics;
// Bulk mark as read
const bulkMarkAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { newsIds } = req.body; // Array of news item IDs
        if (!Array.isArray(newsIds) || newsIds.length === 0) {
            res.status(400).json({
                success: false,
                error: 'Invalid or empty newsIds array',
            });
            return;
        }
        const result = await NewsItem_1.default.updateMany({
            _id: { $in: newsIds },
            userId: new mongoose_1.default.Types.ObjectId(userId),
        }, {
            $set: {
                isRead: true,
                readAt: new Date(),
            },
        });
        res.json({
            success: true,
            data: {
                modifiedCount: result.modifiedCount,
            },
            message: `${result.modifiedCount} news items marked as read`,
        });
    }
    catch (error) {
        console.error('[NewsController] Error bulk marking as read:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark news items as read',
            message: error.message,
        });
    }
};
exports.bulkMarkAsRead = bulkMarkAsRead;
// NEW: Image Enhancement Endpoints
/**
 * Enhance a specific news item with an image
 */
const enhanceNewsWithImage = async (req, res) => {
    try {
        const { newsId } = req.params;
        const { force = false } = req.body;
        const userId = req.user.id;
        const newsItem = await NewsItem_1.default.findOne({ _id: newsId, userId });
        if (!newsItem) {
            res.status(404).json({
                success: false,
                error: 'News item not found',
            });
            return;
        }
        const enhancedItem = await (0, newsEnhancementService_1.enhanceNewsItemWithImage)(newsItem, {
            skipExisting: !force
        });
        if (!enhancedItem) {
            res.status(400).json({
                success: false,
                error: 'Failed to enhance news item with image',
            });
            return;
        }
        res.json({
            success: true,
            data: enhancedItem,
            message: `Enhanced with ${enhancedItem.generatedImage?.source} image`
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to enhance news item',
            details: error.message,
        });
    }
};
exports.enhanceNewsWithImage = enhanceNewsWithImage;
/**
 * Enhance recent news items with images
 */
const enhanceRecentNews = async (req, res) => {
    try {
        const { hoursBack = 24, batchSize = 5, skipExisting = true } = req.body;
        const userId = req.user.id;
        const result = await (0, newsEnhancementService_1.enhanceRecentNewsItems)(userId, hoursBack, {
            batchSize,
            skipExisting
        });
        res.json({
            success: true,
            data: result,
            message: `Enhanced ${result.enhanced} news items with images`
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to enhance recent news items',
            details: error.message,
        });
    }
};
exports.enhanceRecentNews = enhanceRecentNews;
/**
 * Get image enhancement statistics
 */
const getImageStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const stats = await (0, newsEnhancementService_1.getImageEnhancementStats)(userId);
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get image enhancement statistics',
            details: error.message,
        });
    }
};
exports.getImageStats = getImageStats;
/**
 * Generate a test image for a given prompt
 */
const generateTestImage = async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            res.status(400).json({
                success: false,
                error: 'Prompt is required',
            });
            return;
        }
        const imageResult = await (0, imageService_1.getIllustration)(prompt);
        res.json({
            success: true,
            data: imageResult,
            message: `Generated ${imageResult.source} image for prompt: ${prompt}`
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to generate test image',
            details: error.message,
        });
    }
};
exports.generateTestImage = generateTestImage;
/**
 * Enhance existing analysis reports with images
 */
const enhanceAnalysisReports = async (req, res) => {
    try {
        const userId = req.user.id;
        const { force = false } = req.body;
        // Find analysis reports without images
        const filter = {
            userId: new mongoose_1.default.Types.ObjectId(userId),
            'source.id': 'crewai_analysis'
        };
        if (!force) {
            filter['generatedImage.url'] = { $exists: false };
        }
        const analysisReports = await NewsItem_1.default.find(filter)
            .sort({ createdAt: -1 })
            .limit(20); // Limit to 20 most recent reports
        if (analysisReports.length === 0) {
            res.json({
                success: true,
                data: { enhanced: 0, failed: 0, skipped: 0 },
                message: 'No analysis reports found to enhance'
            });
            return;
        }
        const result = await (0, newsEnhancementService_1.enhanceNewsItemsBatch)(analysisReports, {
            batchSize: 3,
            skipExisting: !force,
            maxRetries: 2
        });
        res.json({
            success: true,
            data: result,
            message: `Enhanced ${result.enhanced} analysis reports with images`
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to enhance analysis reports',
            details: error.message,
        });
    }
};
exports.enhanceAnalysisReports = enhanceAnalysisReports;
