"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchIndexingService = void 0;
const vectorDatabaseService_1 = require("./vectorDatabaseService");
const Note_1 = __importDefault(require("../models/Note"));
const BookmarkItem_1 = __importDefault(require("../models/BookmarkItem"));
const Task_1 = __importDefault(require("../models/Task"));
class SearchIndexingService {
    async indexNote(note) {
        try {
            const content = `${note.title}\n${note.content}`;
            const embedding = await vectorDatabaseService_1.vectorDatabaseService.generateEmbedding(content);
            const chunk = {
                id: note._id.toString(),
                content: content,
                embedding: embedding,
                type: 'paragraph',
                level: 0,
                semanticScore: 1,
                startIndex: 0,
                endIndex: content.length,
                metadata: {
                    keywords: [],
                }
            };
            await vectorDatabaseService_1.vectorDatabaseService.storeDocumentChunks(note.userId.toString(), note._id.toString(), [chunk], {
                documentType: 'note',
                title: note.title,
                createdAt: note.createdAt,
            });
            console.log(`[SearchIndexingService] Indexed note ${note._id}`);
        }
        catch (error) {
            console.error(`[SearchIndexingService] Error indexing note ${note._id}:`, error);
        }
    }
    async indexBookmark(bookmark) {
        try {
            const content = `${bookmark.title || bookmark.fetchedTitle}\n${bookmark.summary || bookmark.fetchedDescription}`;
            const embedding = await vectorDatabaseService_1.vectorDatabaseService.generateEmbedding(content);
            const chunk = {
                id: bookmark._id.toString(),
                content: content,
                embedding: embedding,
                type: 'paragraph',
                level: 0,
                semanticScore: 1,
                startIndex: 0,
                endIndex: content.length,
                metadata: {
                    keywords: [],
                }
            };
            await vectorDatabaseService_1.vectorDatabaseService.storeDocumentChunks(bookmark.userId.toString(), bookmark._id.toString(), [chunk], {
                documentType: 'bookmark',
                title: bookmark.title || bookmark.fetchedTitle,
                tags: bookmark.tags,
                createdAt: bookmark.createdAt,
                url: bookmark.originalUrl,
            });
            console.log(`[SearchIndexingService] Indexed bookmark ${bookmark._id}`);
        }
        catch (error) {
            console.error(`[SearchIndexingService] Error indexing bookmark ${bookmark._id}:`, error);
        }
    }
    async indexTask(task) {
        try {
            const content = `${task.title}\n${task.description}`;
            const embedding = await vectorDatabaseService_1.vectorDatabaseService.generateEmbedding(content);
            const chunk = {
                id: task._id.toString(),
                content: content,
                embedding: embedding,
                type: 'paragraph',
                level: 0,
                semanticScore: 1,
                startIndex: 0,
                endIndex: content.length,
                metadata: {
                    keywords: [],
                }
            };
            await vectorDatabaseService_1.vectorDatabaseService.storeDocumentChunks(task.userId.toString(), task._id.toString(), [chunk], {
                documentType: 'task',
                title: task.title,
                createdAt: task.createdAt,
                status: task.status,
                priority: task.priority,
                dueDate: task.dueDate,
            });
            console.log(`[SearchIndexingService] Indexed task ${task._id}`);
        }
        catch (error) {
            console.error(`[SearchIndexingService] Error indexing task ${task._id}:`, error);
        }
    }
}
exports.searchIndexingService = new SearchIndexingService();
// Add post-save hooks to models
Note_1.default.schema.post('save', async function (doc) {
    await exports.searchIndexingService.indexNote(doc);
});
BookmarkItem_1.default.schema.post('save', async function (doc) {
    await exports.searchIndexingService.indexBookmark(doc);
});
Task_1.default.schema.post('save', async function (doc) {
    await exports.searchIndexingService.indexTask(doc);
});
// TODO: Add hooks for other models: Idea, VideoItem, NewsItem, WhatsAppMessage, TelegramItem, Meeting
