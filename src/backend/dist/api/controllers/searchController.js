"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSearchStats = exports.getSearchSuggestions = exports.universalSearch = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const vectorDatabaseService_1 = require("../../services/vectorDatabaseService");
const Document_1 = __importDefault(require("../../models/Document"));
const Note_1 = __importDefault(require("../../models/Note"));
const BookmarkItem_1 = __importDefault(require("../../models/BookmarkItem"));
const Task_1 = __importDefault(require("../../models/Task"));
const Idea_1 = __importDefault(require("../../models/Idea"));
const VideoItem_1 = __importDefault(require("../../models/VideoItem"));
const NewsItem_1 = __importDefault(require("../../models/NewsItem"));
const WhatsAppMessage_1 = __importDefault(require("../../models/WhatsAppMessage"));
const TelegramItem_1 = __importDefault(require("../../models/TelegramItem"));
const Meeting_1 = __importDefault(require("../../models/Meeting"));
/**
 * Universal search across all content types using Vector Search
 */
const universalSearch = async (req, res) => {
    const startTime = Date.now();
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { query, strategy = 'hybrid', limit = 50, offset = 0, contentTypes = ['all'], } = req.body;
        if (!query || query.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Query is required' });
        }
        console.log(`[UniversalSearch] Searching for: "${query}" with strategy: ${strategy} for user: ${userId}`);
        const searchOptions = {
            topK: limit + offset, // Fetch enough results for pagination
            userId,
            filter: {},
        };
        if (contentTypes && !contentTypes.includes('all')) {
            searchOptions.filter.documentType = { $in: contentTypes };
        }
        let searchResults = [];
        switch (strategy) {
            case 'semantic':
                console.log('[UniversalSearch] Using semantic search strategy');
                searchResults = await vectorDatabaseService_1.vectorDatabaseService.semanticSearch(query, searchOptions);
                break;
            case 'keyword':
                console.log('[UniversalSearch] Using keyword (hybrid) search strategy');
                // Using hybrid search for keyword as it combines keyword matching
                searchResults = await vectorDatabaseService_1.vectorDatabaseService.hybridSearch(query, { ...searchOptions, keywordWeight: 0.7, semanticWeight: 0.3 });
                break;
            case 'hybrid':
            default:
                console.log('[UniversalSearch] Using hybrid search strategy');
                searchResults = await vectorDatabaseService_1.vectorDatabaseService.hybridSearch(query, searchOptions);
                break;
        }
        const resultsByType = {};
        const processedResults = searchResults.map(result => {
            const type = result.metadata.documentType || 'unknown';
            resultsByType[type] = (resultsByType[type] || 0) + 1;
            return {
                id: result.documentId || result.id,
                type: type,
                title: result.metadata.title || 'Untitled',
                content: result.content,
                excerpt: result.content.substring(0, 200) + '...',
                score: result.score,
                createdAt: new Date(result.metadata.createdAt),
                metadata: result.metadata,
            };
        });
        const paginatedResults = processedResults.slice(offset, offset + limit);
        const searchTime = Date.now() - startTime;
        const response = {
            query,
            totalResults: processedResults.length,
            results: paginatedResults,
            resultsByType,
            searchTime,
            strategy
        };
        console.log(`[UniversalSearch] Found ${processedResults.length} results in ${searchTime}ms`);
        console.log(`[UniversalSearch] Results by type:`, resultsByType);
        res.json({
            success: true,
            data: response,
        });
    }
    catch (error) {
        console.error('[UniversalSearch] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during search',
            searchTime: Date.now() - startTime
        });
    }
};
exports.universalSearch = universalSearch;
/**
 * Get search suggestions based on user's content
 */
const getSearchSuggestions = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { query = '', limit = 10 } = req.query;
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const suggestions = [];
        if (query && typeof query === 'string' && query.length > 1) {
            const searchRegex = new RegExp(`^${query}`, 'i');
            // Get title suggestions from various content types
            const [documents, notes, bookmarks, tasks, ideas] = await Promise.all([
                Document_1.default.find({ userId: userObjectId, title: searchRegex }).select('title').limit(5),
                Note_1.default.find({ userId: userObjectId, title: searchRegex }).select('title').limit(5),
                BookmarkItem_1.default.find({ userId: userObjectId, title: searchRegex }).select('title').limit(5),
                Task_1.default.find({ userId: userObjectId, title: searchRegex }).select('title').limit(5),
                Idea_1.default.find({ userId: userObjectId, content: searchRegex }).select('content').limit(5)
            ]);
            // Collect unique suggestions
            const allTitles = [
                ...documents.map(d => d.title).filter(Boolean),
                ...notes.map(n => n.title).filter(Boolean),
                ...bookmarks.map(b => b.title).filter(Boolean),
                ...tasks.map(t => t.title),
                ...ideas.map(i => i.content.substring(0, 50)).filter(Boolean) // Use content excerpt for ideas
            ];
            const uniqueSuggestions = [...new Set(allTitles)].filter((title) => Boolean(title));
            const limitNum = limit ? Number(limit) : 10;
            suggestions.push(...uniqueSuggestions.slice(0, limitNum));
        }
        res.json({
            success: true,
            data: suggestions
        });
    }
    catch (error) {
        console.error('[SearchSuggestions] Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getSearchSuggestions = getSearchSuggestions;
/**
 * Get search statistics for the user
 */
const getSearchStats = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const [documentCount, noteCount, bookmarkCount, taskCount, ideaCount, videoCount, newsCount, telegramCount, meetingCount] = await Promise.all([
            Document_1.default.countDocuments({ userId: userObjectId }),
            Note_1.default.countDocuments({ userId: userObjectId }),
            BookmarkItem_1.default.countDocuments({ userId: userObjectId }),
            Task_1.default.countDocuments({ userId: userObjectId }),
            Idea_1.default.countDocuments({ userId: userObjectId }),
            VideoItem_1.default.countDocuments({ userId: userObjectId }),
            NewsItem_1.default.countDocuments({ userId: userObjectId }),
            TelegramItem_1.default.countDocuments({ userId: userObjectId }),
            Meeting_1.default.countDocuments({ userId: userObjectId })
        ]);
        // WhatsApp messages don't have userId, so count differently
        const whatsappCount = await WhatsAppMessage_1.default.countDocuments({});
        const stats = {
            totalSearchableItems: documentCount + noteCount + bookmarkCount + taskCount + ideaCount + videoCount + newsCount + telegramCount + meetingCount + whatsappCount,
            byType: {
                documents: documentCount,
                notes: noteCount,
                bookmarks: bookmarkCount,
                tasks: taskCount,
                ideas: ideaCount,
                videos: videoCount,
                news: newsCount,
                telegram: telegramCount,
                meetings: meetingCount,
                whatsapp: whatsappCount
            }
        };
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('[SearchStats] Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getSearchStats = getSearchStats;
