"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSearchIndexes = initializeSearchIndexes;
exports.dropSearchIndexes = dropSearchIndexes;
exports.getIndexInfo = getIndexInfo;
const Document_1 = __importDefault(require("../models/Document"));
const Note_1 = __importDefault(require("../models/Note"));
const BookmarkItem_1 = __importDefault(require("../models/BookmarkItem"));
const Task_1 = __importDefault(require("../models/Task"));
const Idea_1 = __importDefault(require("../models/Idea"));
const VideoItem_1 = __importDefault(require("../models/VideoItem"));
const NewsItem_1 = __importDefault(require("../models/NewsItem"));
const WhatsAppMessage_1 = __importDefault(require("../models/WhatsAppMessage"));
const TelegramItem_1 = __importDefault(require("../models/TelegramItem"));
const Meeting_1 = __importDefault(require("../models/Meeting"));
/**
 * Initialize search indexes for optimal query performance
 */
async function initializeSearchIndexes() {
    console.log('[SearchIndexes] Initializing search indexes...');
    try {
        // Documents - Drop existing conflicting index first
        try {
            await Document_1.default.collection.dropIndex('title_text_content_text_summary_text');
            console.log('[SearchIndexes] Dropped conflicting text index');
        }
        catch (error) {
            // Index might not exist, which is fine
        }
        // Documents - Text indexes for title, content, and metadata
        await Document_1.default.collection.createIndex({
            title: 'text',
            content: 'text',
            'metadata.category': 'text',
            'metadata.tags': 'text',
            searchKeywords: 'text',
            autoTags: 'text'
        }, {
            name: 'document_text_search',
            weights: {
                title: 10,
                content: 5,
                'metadata.tags': 8,
                searchKeywords: 8,
                autoTags: 6,
                'metadata.category': 4
            }
        });
        // Documents - User-specific searches
        await Document_1.default.collection.createIndex({ userId: 1, title: 1 });
        await Document_1.default.collection.createIndex({ userId: 1, 'metadata.processingStatus': 1 });
        await Document_1.default.collection.createIndex({ userId: 1, createdAt: -1 });
        // Notes - Text search indexes
        await Note_1.default.collection.createIndex({
            title: 'text',
            content: 'text',
            rawTranscription: 'text'
        }, {
            name: 'note_text_search',
            weights: {
                title: 10,
                content: 5,
                rawTranscription: 3
            }
        });
        // Notes - User and source indexes
        await Note_1.default.collection.createIndex({ userId: 1, title: 1 });
        await Note_1.default.collection.createIndex({ userId: 1, source: 1 });
        await Note_1.default.collection.createIndex({ userId: 1, createdAt: -1 });
        // BookmarkItems - Text search indexes
        await BookmarkItem_1.default.collection.createIndex({
            title: 'text',
            summary: 'text',
            fetchedTitle: 'text',
            fetchedDescription: 'text',
            rawPageContent: 'text',
            tags: 'text',
            redditPostContent: 'text'
        }, {
            name: 'bookmark_text_search',
            weights: {
                title: 10,
                fetchedTitle: 10,
                summary: 8,
                fetchedDescription: 6,
                tags: 7,
                redditPostContent: 4,
                rawPageContent: 2
            }
        });
        // BookmarkItems - User and platform indexes
        await BookmarkItem_1.default.collection.createIndex({ userId: 1, title: 1 });
        await BookmarkItem_1.default.collection.createIndex({ userId: 1, sourcePlatform: 1 });
        await BookmarkItem_1.default.collection.createIndex({ userId: 1, status: 1 });
        await BookmarkItem_1.default.collection.createIndex({ userId: 1, createdAt: -1 });
        // Tasks - Text search indexes
        await Task_1.default.collection.createIndex({
            title: 'text',
            description: 'text',
            tags: 'text'
        }, {
            name: 'task_text_search',
            weights: {
                title: 10,
                description: 5,
                tags: 8
            }
        });
        // Tasks - User and status indexes
        await Task_1.default.collection.createIndex({ userId: 1, title: 1 });
        await Task_1.default.collection.createIndex({ userId: 1, status: 1 });
        await Task_1.default.collection.createIndex({ userId: 1, priority: 1 });
        await Task_1.default.collection.createIndex({ userId: 1, dueDate: 1 });
        await Task_1.default.collection.createIndex({ userId: 1, createdAt: -1 });
        // Ideas - Text search indexes
        await Idea_1.default.collection.createIndex({
            title: 'text',
            description: 'text',
            tags: 'text'
        }, {
            name: 'idea_text_search',
            weights: {
                title: 10,
                description: 5,
                tags: 8
            }
        });
        // Ideas - User and category indexes
        await Idea_1.default.collection.createIndex({ userId: 1, title: 1 });
        await Idea_1.default.collection.createIndex({ userId: 1, category: 1 });
        await Idea_1.default.collection.createIndex({ userId: 1, status: 1 });
        await Idea_1.default.collection.createIndex({ userId: 1, createdAt: -1 });
        // VideoItems - Text search indexes
        await VideoItem_1.default.collection.createIndex({
            title: 'text',
            summary: 'text',
            transcript: 'text',
            tags: 'text'
        }, {
            name: 'video_text_search',
            weights: {
                title: 10,
                summary: 8,
                transcript: 4,
                tags: 7
            }
        });
        // VideoItems - User and platform indexes
        await VideoItem_1.default.collection.createIndex({ userId: 1, title: 1 });
        await VideoItem_1.default.collection.createIndex({ userId: 1, platform: 1 });
        await VideoItem_1.default.collection.createIndex({ userId: 1, status: 1 });
        await VideoItem_1.default.collection.createIndex({ userId: 1, createdAt: -1 });
        // NewsItems - Text search indexes
        await NewsItem_1.default.collection.createIndex({
            title: 'text',
            summary: 'text',
            content: 'text',
            tags: 'text'
        }, {
            name: 'news_text_search',
            weights: {
                title: 10,
                summary: 8,
                content: 5,
                tags: 7
            }
        });
        // NewsItems - User and source indexes
        await NewsItem_1.default.collection.createIndex({ userId: 1, title: 1 });
        await NewsItem_1.default.collection.createIndex({ userId: 1, source: 1 });
        await NewsItem_1.default.collection.createIndex({ userId: 1, category: 1 });
        await NewsItem_1.default.collection.createIndex({ userId: 1, publishedAt: -1 });
        // WhatsAppMessages - Text search indexes (no userId field)
        await WhatsAppMessage_1.default.collection.createIndex({
            body: 'text',
            contactName: 'text',
            groupName: 'text'
        }, {
            name: 'whatsapp_text_search',
            weights: {
                body: 10,
                contactName: 8,
                groupName: 8
            }
        });
        // WhatsAppMessages - Chat and time indexes
        await WhatsAppMessage_1.default.collection.createIndex({ chatId: 1, timestamp: -1 });
        await WhatsAppMessage_1.default.collection.createIndex({ isGroup: 1, timestamp: -1 });
        await WhatsAppMessage_1.default.collection.createIndex({ contactName: 1 });
        await WhatsAppMessage_1.default.collection.createIndex({ groupName: 1 });
        // TelegramItems - Text search indexes
        await TelegramItem_1.default.collection.createIndex({
            text: 'text',
            caption: 'text',
            tags: 'text'
        }, {
            name: 'telegram_text_search',
            weights: {
                text: 10,
                caption: 8,
                tags: 7
            }
        });
        // TelegramItems - User and message indexes
        await TelegramItem_1.default.collection.createIndex({ userId: 1, text: 1 });
        await TelegramItem_1.default.collection.createIndex({ userId: 1, messageType: 1 });
        await TelegramItem_1.default.collection.createIndex({ userId: 1, messageDate: -1 });
        await TelegramItem_1.default.collection.createIndex({ userId: 1, fromUser: 1 });
        // Meetings - Text search indexes
        await Meeting_1.default.collection.createIndex({
            title: 'text',
            summary: 'text',
            transcript: 'text',
            participants: 'text'
        }, {
            name: 'meeting_text_search',
            weights: {
                title: 10,
                summary: 8,
                transcript: 4,
                participants: 6
            }
        });
        // Meetings - User and time indexes
        await Meeting_1.default.collection.createIndex({ userId: 1, title: 1 });
        await Meeting_1.default.collection.createIndex({ userId: 1, status: 1 });
        await Meeting_1.default.collection.createIndex({ userId: 1, startTime: -1 });
        console.log('[SearchIndexes] ✅ All search indexes created successfully');
    }
    catch (error) {
        console.error('[SearchIndexes] ❌ Error creating search indexes:', error);
        throw error;
    }
}
/**
 * Drop all search indexes (for maintenance/recreation)
 */
async function dropSearchIndexes() {
    console.log('[SearchIndexes] Dropping existing search indexes...');
    try {
        const collections = [
            Document_1.default.collection,
            Note_1.default.collection,
            BookmarkItem_1.default.collection,
            Task_1.default.collection,
            Idea_1.default.collection,
            VideoItem_1.default.collection,
            NewsItem_1.default.collection,
            WhatsAppMessage_1.default.collection,
            TelegramItem_1.default.collection,
            Meeting_1.default.collection
        ];
        for (const collection of collections) {
            try {
                // Drop text search indexes by name
                const collectionName = collection.collectionName;
                const textIndexName = `${collectionName.toLowerCase()}_text_search`;
                try {
                    await collection.dropIndex(textIndexName);
                    console.log(`[SearchIndexes] Dropped text index for ${collectionName}`);
                }
                catch (error) {
                    // Index might not exist, which is fine
                    console.log(`[SearchIndexes] Text index ${textIndexName} doesn't exist or already dropped`);
                }
            }
            catch (error) {
                console.log(`[SearchIndexes] Error dropping indexes for ${collection.collectionName}:`, error);
            }
        }
        console.log('[SearchIndexes] ✅ Search indexes dropped successfully');
    }
    catch (error) {
        console.error('[SearchIndexes] ❌ Error dropping search indexes:', error);
        throw error;
    }
}
/**
 * Get information about existing indexes
 */
async function getIndexInfo() {
    console.log('[SearchIndexes] Getting index information...');
    const indexInfo = {};
    try {
        const collections = [
            { name: 'documents', collection: Document_1.default.collection },
            { name: 'notes', collection: Note_1.default.collection },
            { name: 'bookmarks', collection: BookmarkItem_1.default.collection },
            { name: 'tasks', collection: Task_1.default.collection },
            { name: 'ideas', collection: Idea_1.default.collection },
            { name: 'videos', collection: VideoItem_1.default.collection },
            { name: 'news', collection: NewsItem_1.default.collection },
            { name: 'whatsapp', collection: WhatsAppMessage_1.default.collection },
            { name: 'telegram', collection: TelegramItem_1.default.collection },
            { name: 'meetings', collection: Meeting_1.default.collection }
        ];
        for (const { name, collection } of collections) {
            try {
                const indexes = await collection.indexes();
                indexInfo[name] = indexes;
                console.log(`[SearchIndexes] ${name}: ${indexes.length} indexes`);
            }
            catch (error) {
                console.log(`[SearchIndexes] Error getting indexes for ${name}:`, error);
                indexInfo[name] = [];
            }
        }
        return indexInfo;
    }
    catch (error) {
        console.error('[SearchIndexes] ❌ Error getting index information:', error);
        throw error;
    }
}
