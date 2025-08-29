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
        const { query, strategy = 'hybrid', limit = 50, offset = 0, contentTypes = ['all'], minScore, } = req.body;
        if (!query || query.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Query is required' });
        }
        console.log(`[UniversalSearch] Searching for: "${query}" with strategy: ${strategy} for user: ${userId}`);
        const defaultMinScore = typeof minScore === 'number'
            ? Number(minScore)
            : (strategy === 'semantic' ? 0.55 : strategy === 'hybrid' ? 0.5 : 0.35);
        const searchOptions = {
            topK: limit + offset, // Fetch enough results for pagination
            userId,
            filter: {},
        };
        if (contentTypes && !contentTypes.includes('all')) {
            searchOptions.filter.documentType = { $in: contentTypes };
        }
        let searchResults = [];
        let effectiveStrategy = strategy;
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
        const relevantVectorResults = (searchResults || []).filter(r => (r.score ?? 0) >= defaultMinScore);
        if (relevantVectorResults.length === 0) {
            const fallback = await keywordFallbackSearch({ userId, query, limit: limit + offset, contentTypes });
            searchResults = fallback;
            if (strategy !== 'keyword') {
                effectiveStrategy = 'keyword_fallback';
            }
        }
        else {
            searchResults = relevantVectorResults;
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
                excerpt: (result.content || '').substring(0, 200) + ((result.content || '').length > 200 ? '...' : ''),
                score: result.score,
                createdAt: new Date(result.metadata.createdAt || Date.now()),
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
            strategy: effectiveStrategy
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
// Simple keyword fallback search across Mongo collections when vector results aren't relevant
async function keywordFallbackSearch({ userId, query, limit, contentTypes, }) {
    try {
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const includeAll = !contentTypes || contentTypes.includes('all');
        const searches = [];
        if (includeAll || contentTypes.includes('document')) {
            searches.push(Document_1.default.find({ userId: userObjectId, $or: [{ title: regex }, { content: regex }] })
                .limit(20)
                .lean());
        }
        if (includeAll || contentTypes.includes('note')) {
            searches.push(Note_1.default.find({ userId: userObjectId, $or: [{ title: regex }, { content: regex }] })
                .limit(20)
                .lean());
        }
        if (includeAll || contentTypes.includes('bookmark')) {
            searches.push(BookmarkItem_1.default.find({ userId: userObjectId, $or: [{ title: regex }, { fetchedTitle: regex }, { summary: regex }, { fetchedDescription: regex }] })
                .limit(20)
                .lean());
        }
        if (includeAll || contentTypes.includes('task')) {
            searches.push(Task_1.default.find({ userId: userObjectId, $or: [{ title: regex }, { description: regex }] })
                .limit(20)
                .lean());
        }
        if (includeAll || contentTypes.includes('idea')) {
            searches.push(Idea_1.default.find({ userId: userObjectId, content: regex })
                .limit(20)
                .lean());
        }
        const results = (await Promise.all(searches)).flat();
        const mapped = results.slice(0, limit).map((doc) => {
            const type = doc.documentType || (doc.content && !doc.title ? 'idea' :
                doc.fetchedTitle || doc.summary ? 'bookmark' :
                    doc.description !== undefined ? 'task' : 'document');
            const title = doc.title || doc.fetchedTitle || (doc.content ? doc.content.slice(0, 60) : 'Untitled');
            const content = doc.content || doc.summary || doc.fetchedDescription || '';
            const lowerQ = query.toLowerCase();
            const inTitle = title.toLowerCase().includes(lowerQ);
            const inContent = (content || '').toLowerCase().includes(lowerQ);
            const score = inTitle ? 0.85 : inContent ? 0.65 : 0.4;
            return {
                id: String(doc._id),
                documentId: String(doc._id),
                chunkId: undefined,
                content: [title, content].filter(Boolean).join('\n').slice(0, 2000),
                score,
                metadata: {
                    documentType: type,
                    title,
                    createdAt: doc.createdAt || new Date(),
                },
            };
        });
        return mapped;
    }
    catch (error) {
        console.error('[KeywordFallbackSearch] Error:', error);
        return [];
    }
}
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
