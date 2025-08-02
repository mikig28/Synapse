"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSearchStats = exports.getSearchSuggestions = exports.universalSearch = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
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
const selfReflectiveRAGService_1 = require("../../services/selfReflectiveRAGService");
/**
 * Universal search across all content types
 */
const universalSearch = async (req, res) => {
    const startTime = Date.now();
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { query, strategy = 'hybrid', limit = 50, offset = 0, contentTypes = ['all'], includeDebugInfo = false } = req.body;
        if (!query || query.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Query is required' });
        }
        console.log(`[UniversalSearch] Searching for: "${query}" with strategy: ${strategy}`);
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const searchRegex = new RegExp(query.trim(), 'i');
        const results = [];
        const resultsByType = {};
        // Define which content types to search
        const typesToSearch = contentTypes.includes('all') ?
            ['document', 'note', 'bookmark', 'task', 'idea', 'video', 'news', 'whatsapp', 'telegram', 'meeting'] :
            contentTypes;
        // Search Documents (using existing RAG service for advanced search)
        if (typesToSearch.includes('document')) {
            try {
                const documentResults = await selfReflectiveRAGService_1.selfReflectiveRAGService.processQuery({
                    query,
                    userId,
                    searchStrategy: strategy,
                    includeDebugInfo: false,
                });
                if (documentResults.sources && documentResults.sources.length > 0) {
                    for (const source of documentResults.sources.slice(0, 10)) {
                        results.push({
                            id: source.metadata?.documentId || source.id,
                            type: 'document',
                            title: source.metadata?.title || 'Untitled Document',
                            content: source.content || '',
                            excerpt: source.content?.substring(0, 200) + '...' || '',
                            score: source.score || 0.8,
                            createdAt: source.metadata?.createdAt || new Date(),
                            metadata: {
                                category: source.metadata?.category,
                                tags: source.metadata?.tags,
                                documentType: source.metadata?.documentType
                            }
                        });
                    }
                }
                resultsByType.document = documentResults.sources?.length || 0;
            }
            catch (error) {
                console.error('[UniversalSearch] Document search error:', error);
                resultsByType.document = 0;
            }
        }
        // Search Notes
        if (typesToSearch.includes('note')) {
            try {
                const notes = await Note_1.default.find({
                    userId: userObjectId,
                    $or: [
                        { title: searchRegex },
                        { content: searchRegex },
                        { rawTranscription: searchRegex }
                    ]
                })
                    .sort({ updatedAt: -1 })
                    .limit(10);
                for (const note of notes) {
                    results.push({
                        id: note._id.toString(),
                        type: 'note',
                        title: note.title || 'Untitled Note',
                        content: note.content,
                        excerpt: note.content.substring(0, 200) + '...',
                        score: calculateTextScore(query, (note.title || '') + ' ' + note.content),
                        createdAt: note.createdAt,
                        metadata: {
                            source: note.source,
                            hasLocation: !!note.location
                        }
                    });
                }
                resultsByType.note = notes.length;
            }
            catch (error) {
                console.error('[UniversalSearch] Note search error:', error);
                resultsByType.note = 0;
            }
        }
        // Search Bookmarks
        if (typesToSearch.includes('bookmark')) {
            try {
                const bookmarks = await BookmarkItem_1.default.find({
                    userId: userObjectId,
                    $or: [
                        { title: searchRegex },
                        { summary: searchRegex },
                        { fetchedTitle: searchRegex },
                        { fetchedDescription: searchRegex },
                        { rawPageContent: searchRegex },
                        { tags: { $in: [searchRegex] } }
                    ]
                })
                    .sort({ updatedAt: -1 })
                    .limit(10);
                for (const bookmark of bookmarks) {
                    const title = bookmark.title || bookmark.fetchedTitle || 'Untitled Bookmark';
                    const content = bookmark.summary || bookmark.fetchedDescription || '';
                    results.push({
                        id: bookmark._id.toString(),
                        type: 'bookmark',
                        title,
                        content,
                        excerpt: content.substring(0, 200) + '...',
                        score: calculateTextScore(query, title + ' ' + content),
                        createdAt: bookmark.createdAt || new Date(),
                        metadata: {
                            url: bookmark.originalUrl,
                            platform: bookmark.sourcePlatform,
                            status: bookmark.status,
                            tags: bookmark.tags
                        }
                    });
                }
                resultsByType.bookmark = bookmarks.length;
            }
            catch (error) {
                console.error('[UniversalSearch] Bookmark search error:', error);
                resultsByType.bookmark = 0;
            }
        }
        // Search Tasks
        if (typesToSearch.includes('task')) {
            try {
                const tasks = await Task_1.default.find({
                    userId: userObjectId,
                    $or: [
                        { title: searchRegex },
                        { description: searchRegex }
                    ]
                })
                    .sort({ updatedAt: -1 })
                    .limit(10);
                for (const task of tasks) {
                    results.push({
                        id: task._id.toString(),
                        type: 'task',
                        title: task.title,
                        content: task.description || '',
                        excerpt: (task.description || '').substring(0, 200) + '...',
                        score: calculateTextScore(query, task.title + ' ' + (task.description || '')),
                        createdAt: task.createdAt,
                        metadata: {
                            status: task.status,
                            priority: task.priority,
                            dueDate: task.dueDate
                        }
                    });
                }
                resultsByType.task = tasks.length;
            }
            catch (error) {
                console.error('[UniversalSearch] Task search error:', error);
                resultsByType.task = 0;
            }
        }
        // Search Ideas
        if (typesToSearch.includes('idea')) {
            try {
                const ideas = await Idea_1.default.find({
                    userId: userObjectId,
                    content: searchRegex
                })
                    .sort({ updatedAt: -1 })
                    .limit(10);
                for (const idea of ideas) {
                    results.push({
                        id: idea._id.toString(),
                        type: 'idea',
                        title: 'Idea',
                        content: idea.content,
                        excerpt: idea.content.substring(0, 200) + '...',
                        score: calculateTextScore(query, idea.content),
                        createdAt: idea.createdAt,
                        metadata: {
                            source: idea.source
                        }
                    });
                }
                resultsByType.idea = ideas.length;
            }
            catch (error) {
                console.error('[UniversalSearch] Idea search error:', error);
                resultsByType.idea = 0;
            }
        }
        // Search Videos
        if (typesToSearch.includes('video')) {
            try {
                const videos = await VideoItem_1.default.find({
                    userId: userObjectId,
                    $or: [
                        { title: searchRegex },
                        { summary: searchRegex }
                    ]
                })
                    .sort({ createdAt: -1 })
                    .limit(10);
                for (const video of videos) {
                    results.push({
                        id: video._id.toString(),
                        type: 'video',
                        title: video.title || 'Untitled Video',
                        content: video.summary || '',
                        excerpt: (video.summary || '').substring(0, 200) + '...',
                        score: calculateTextScore(query, video.title + ' ' + (video.summary || '')),
                        createdAt: video.createdAt,
                        metadata: {
                            url: video.originalUrl,
                            videoId: video.videoId,
                            platform: video.sourcePlatform,
                            channel: video.channelTitle,
                            watchedStatus: video.watchedStatus
                        }
                    });
                }
                resultsByType.video = videos.length;
            }
            catch (error) {
                console.error('[UniversalSearch] Video search error:', error);
                resultsByType.video = 0;
            }
        }
        // Search News
        if (typesToSearch.includes('news')) {
            try {
                const news = await NewsItem_1.default.find({
                    userId: userObjectId,
                    $or: [
                        { title: searchRegex },
                        { summary: searchRegex },
                        { content: searchRegex },
                        { tags: { $in: [searchRegex] } }
                    ]
                })
                    .sort({ publishedAt: -1 })
                    .limit(10);
                for (const newsItem of news) {
                    results.push({
                        id: newsItem._id.toString(),
                        type: 'news',
                        title: newsItem.title,
                        content: newsItem.summary || newsItem.content || '',
                        excerpt: (newsItem.summary || newsItem.content || '').substring(0, 200) + '...',
                        score: calculateTextScore(query, newsItem.title + ' ' + (newsItem.summary || '')),
                        createdAt: newsItem.publishedAt || newsItem.createdAt,
                        metadata: {
                            url: newsItem.url,
                            source: newsItem.source,
                            category: newsItem.category,
                            tags: newsItem.tags
                        }
                    });
                }
                resultsByType.news = news.length;
            }
            catch (error) {
                console.error('[UniversalSearch] News search error:', error);
                resultsByType.news = 0;
            }
        }
        // Search WhatsApp Messages
        if (typesToSearch.includes('whatsapp')) {
            try {
                const whatsappMessages = await WhatsAppMessage_1.default.find({
                    message: searchRegex
                })
                    .sort({ timestamp: -1 })
                    .limit(10);
                for (const message of whatsappMessages) {
                    results.push({
                        id: message._id.toString(),
                        type: 'whatsapp',
                        title: `WhatsApp: ${message.from || 'Unknown'}`,
                        content: message.message,
                        excerpt: message.message.substring(0, 200) + '...',
                        score: calculateTextScore(query, message.message),
                        createdAt: message.timestamp,
                        metadata: {
                            from: message.from,
                            to: message.to,
                            type: message.type,
                            status: message.status,
                            isIncoming: message.isIncoming
                        }
                    });
                }
                resultsByType.whatsapp = whatsappMessages.length;
            }
            catch (error) {
                console.error('[UniversalSearch] WhatsApp search error:', error);
                resultsByType.whatsapp = 0;
            }
        }
        // Search Telegram Items
        if (typesToSearch.includes('telegram')) {
            try {
                const telegramItems = await TelegramItem_1.default.find({
                    synapseUserId: userObjectId,
                    text: searchRegex
                })
                    .sort({ receivedAt: -1 })
                    .limit(10);
                for (const telegram of telegramItems) {
                    const content = telegram.text || '';
                    results.push({
                        id: telegram._id.toString(),
                        type: 'telegram',
                        title: `Telegram: ${telegram.fromUsername || 'Unknown'}`,
                        content,
                        excerpt: content.substring(0, 200) + '...',
                        score: calculateTextScore(query, content),
                        createdAt: telegram.receivedAt,
                        metadata: {
                            messageType: telegram.messageType,
                            fromUserId: telegram.fromUserId,
                            fromUsername: telegram.fromUsername,
                            chatTitle: telegram.chatTitle,
                            chatId: telegram.chatId
                        }
                    });
                }
                resultsByType.telegram = telegramItems.length;
            }
            catch (error) {
                console.error('[UniversalSearch] Telegram search error:', error);
                resultsByType.telegram = 0;
            }
        }
        // Search Meetings
        if (typesToSearch.includes('meeting')) {
            try {
                const meetings = await Meeting_1.default.find({
                    userId: userObjectId,
                    $or: [
                        { title: searchRegex },
                        { summary: searchRegex },
                        { transcription: searchRegex }
                    ]
                })
                    .sort({ meetingDate: -1 })
                    .limit(10);
                for (const meeting of meetings) {
                    results.push({
                        id: meeting._id.toString(),
                        type: 'meeting',
                        title: meeting.title,
                        content: meeting.summary || meeting.transcription || '',
                        excerpt: (meeting.summary || meeting.transcription || '').substring(0, 200) + '...',
                        score: calculateTextScore(query, meeting.title + ' ' + (meeting.summary || '')),
                        createdAt: meeting.meetingDate,
                        metadata: {
                            duration: meeting.duration,
                            status: meeting.status,
                            hasAudio: !!meeting.audioFilePath,
                            description: meeting.description
                        }
                    });
                }
                resultsByType.meeting = meetings.length;
            }
            catch (error) {
                console.error('[UniversalSearch] Meeting search error:', error);
                resultsByType.meeting = 0;
            }
        }
        // Sort results by score (descending) and apply pagination
        const sortedResults = results
            .sort((a, b) => b.score - a.score)
            .slice(offset, offset + limit);
        const searchTime = Date.now() - startTime;
        const response = {
            query,
            totalResults: results.length,
            results: sortedResults,
            resultsByType,
            searchTime,
            strategy
        };
        console.log(`[UniversalSearch] Found ${results.length} results in ${searchTime}ms`);
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
 * Simple text relevance scoring
 */
function calculateTextScore(query, text) {
    if (!text || !query)
        return 0;
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    // Exact phrase match gets highest score
    if (textLower.includes(queryLower)) {
        return 1.0;
    }
    // Word matches
    const queryWords = queryLower.split(/\s+/);
    const textWords = textLower.split(/\s+/);
    let matchCount = 0;
    for (const queryWord of queryWords) {
        if (textWords.some(textWord => textWord.includes(queryWord))) {
            matchCount++;
        }
    }
    // Score based on percentage of query words found
    return matchCount / queryWords.length;
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
