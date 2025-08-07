import { vectorDatabaseService } from './vectorDatabaseService';
import Note, { INote } from '../models/Note';
import BookmarkItem, { IBookmarkItem } from '../models/BookmarkItem';
import Task, { ITask } from '../models/Task';
import Idea, { IIdea } from '../models/Idea';
import VideoItem, { IVideoItem } from '../models/VideoItem';
import NewsItem, { INewsItem } from '../models/NewsItem';
import WhatsAppMessage, { IWhatsAppMessage } from '../models/WhatsAppMessage';
import TelegramItem, { ITelegramItem } from '../models/TelegramItem';
import Meeting, { IMeeting } from '../models/Meeting';
import { ISmartChunk } from '../models/Document';

class SearchIndexingService {
  public async indexNote(note: INote): Promise<void> {
    try {
      const content = `${note.title}\n${note.content}`;
      const embedding = await vectorDatabaseService.generateEmbedding(content);

      const chunk: ISmartChunk = {
        id: note._id.toString(),
        content: content,
        embedding: embedding,
        type: 'full_document',
        level: 0,
        semanticScore: 1,
        startIndex: 0,
        endIndex: content.length,
        metadata: {
          keywords: [],
        }
      };

      await vectorDatabaseService.storeDocumentChunks(
        note.userId.toString(),
        note._id.toString(),
        [chunk],
        {
          documentType: 'note',
          title: note.title,
          tags: note.tags,
          createdAt: note.createdAt,
        }
      );
      console.log(`[SearchIndexingService] Indexed note ${note._id}`);
    } catch (error) {
      console.error(`[SearchIndexingService] Error indexing note ${note._id}:`, error);
    }
  }

  public async indexBookmark(bookmark: IBookmarkItem): Promise<void> {
    try {
      const content = `${bookmark.title || bookmark.fetchedTitle}\n${bookmark.summary || bookmark.fetchedDescription}`;
      const embedding = await vectorDatabaseService.generateEmbedding(content);

      const chunk: ISmartChunk = {
          id: bookmark._id.toString(),
          content: content,
          embedding: embedding,
          type: 'full_document',
          level: 0,
          semanticScore: 1,
          startIndex: 0,
          endIndex: content.length,
          metadata: {
            keywords: [],
          }
      };

      await vectorDatabaseService.storeDocumentChunks(
        bookmark.userId.toString(),
        bookmark._id.toString(),
        [chunk],
        {
          documentType: 'bookmark',
          title: bookmark.title || bookmark.fetchedTitle,
          tags: bookmark.tags,
          createdAt: bookmark.createdAt,
          url: bookmark.originalUrl,
        }
      );
      console.log(`[SearchIndexingService] Indexed bookmark ${bookmark._id}`);
    } catch (error) {
      console.error(`[SearchIndexingService] Error indexing bookmark ${bookmark._id}:`, error);
    }
  }

  public async indexTask(task: ITask): Promise<void> {
    try {
        const content = `${task.title}\n${task.description}`;
        const embedding = await vectorDatabaseService.generateEmbedding(content);

        const chunk: ISmartChunk = {
            id: task._id.toString(),
            content: content,
            embedding: embedding,
            type: 'full_document',
            level: 0,
            semanticScore: 1,
            startIndex: 0,
            endIndex: content.length,
            metadata: {
                keywords: [],
            }
        };

        await vectorDatabaseService.storeDocumentChunks(
            task.userId.toString(),
            task._id.toString(),
            [chunk],
            {
                documentType: 'task',
                title: task.title,
                createdAt: task.createdAt,
                status: task.status,
                priority: task.priority,
                dueDate: task.dueDate,
            }
        );
        console.log(`[SearchIndexingService] Indexed task ${task._id}`);
    } catch (error) {
        console.error(`[SearchIndexingService] Error indexing task ${task._id}:`, error);
    }
  }
}

export const searchIndexingService = new SearchIndexingService();

// Add post-save hooks to models
Note.schema.post('save', async function (doc) {
  await searchIndexingService.indexNote(doc);
});

BookmarkItem.schema.post('save', async function (doc) {
  await searchIndexingService.indexBookmark(doc);
});

Task.schema.post('save', async function (doc) {
    await searchIndexingService.indexTask(doc);
});

// TODO: Add hooks for other models: Idea, VideoItem, NewsItem, WhatsAppMessage, TelegramItem, Meeting
