import { vectorDatabaseService } from './vectorDatabaseService';
import Note, { INote } from '../models/Note';
import BookmarkItem, { IBookmarkItem } from '../models/BookmarkItem';
import Task, { ITask } from '../models/Task';
import Idea, { IIdea } from '../models/Idea';
import VideoItem, { IVideoItem } from '../models/VideoItem';
import NewsItem, { INewsItem } from '../models/NewsItem';
import WhatsAppMessage, { IWhatsAppMessage } from '../models/WhatsAppMessage';
import WhatsAppImage, { IWhatsAppImage } from '../models/WhatsAppImage';
import TelegramItem, { ITelegramItem } from '../models/TelegramItem';
import Meeting, { IMeeting } from '../models/Meeting';
import { ISmartChunk } from '../models/Document';
import mongoose from 'mongoose';

class SearchIndexingService {
  public async indexNote(note: INote): Promise<void> {
    try {
      const content = `${note.title}\n${note.content}`;
      const embedding = await vectorDatabaseService.generateEmbedding(content);

      const chunk: ISmartChunk = {
        id: (note._id as mongoose.Types.ObjectId).toString(),
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

      await vectorDatabaseService.storeDocumentChunks(
        note.userId.toString(),
        (note._id as mongoose.Types.ObjectId).toString(),
        [chunk],
        {
          documentType: 'note',
          title: note.title,
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
          id: (bookmark._id as mongoose.Types.ObjectId).toString(),
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

      await vectorDatabaseService.storeDocumentChunks(
        bookmark.userId.toString(),
        (bookmark._id as mongoose.Types.ObjectId).toString(),
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
            id: (task._id as mongoose.Types.ObjectId).toString(),
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

        await vectorDatabaseService.storeDocumentChunks(
            task.userId.toString(),
            (task._id as mongoose.Types.ObjectId).toString(),
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

  public async indexWhatsAppImage(image: IWhatsAppImage): Promise<void> {
    try {
      // Build searchable content from caption and AI analysis
      const parts: string[] = [];
      
      if (image.caption) parts.push(image.caption);
      if (image.aiAnalysis?.description) parts.push(image.aiAnalysis.description);
      if (image.aiAnalysis?.mainCategory) parts.push(image.aiAnalysis.mainCategory);
      if (image.aiAnalysis?.tags?.length) parts.push(image.aiAnalysis.tags.join(' '));
      if (image.tags?.length) parts.push(image.tags.join(' '));
      if (image.chatName) parts.push(image.chatName);
      if (image.senderName) parts.push(image.senderName);
      
      const content = parts.join('\n');
      
      if (!content.trim()) {
        console.log(`[SearchIndexingService] Skipping image ${image._id} - no searchable content`);
        return;
      }

      const embedding = await vectorDatabaseService.generateEmbedding(content);

      const chunk: ISmartChunk = {
        id: (image._id as mongoose.Types.ObjectId).toString(),
        content: content,
        embedding: embedding,
        type: 'paragraph',
        level: 0,
        semanticScore: 1,
        startIndex: 0,
        endIndex: content.length,
        metadata: {
          keywords: image.aiAnalysis?.tags || [],
        }
      };

      await vectorDatabaseService.storeDocumentChunks(
        image.userId.toString(),
        (image._id as mongoose.Types.ObjectId).toString(),
        [chunk],
        {
          documentType: 'image',
          title: image.caption || image.aiAnalysis?.description || 'Image',
          tags: [...(image.tags || []), ...(image.aiAnalysis?.tags || [])],
          createdAt: image.createdAt,
          chatName: image.chatName,
          senderName: image.senderName,
          category: image.aiAnalysis?.mainCategory,
          publicUrl: image.publicUrl || image.getPublicUrl(),
        }
      );
      console.log(`[SearchIndexingService] Indexed WhatsApp image ${image._id}`);
    } catch (error) {
      console.error(`[SearchIndexingService] Error indexing WhatsApp image ${image._id}:`, error);
    }
  }

  public async indexTelegramImage(item: ITelegramItem): Promise<void> {
    try {
      // Only index if it's a photo message
      if (item.messageType !== 'photo') {
        return;
      }

      // Build searchable content from text and AI analysis
      const parts: string[] = [];
      
      if (item.text) parts.push(item.text);
      if (item.aiAnalysis?.description) parts.push(item.aiAnalysis.description);
      if (item.aiAnalysis?.mainCategory) parts.push(item.aiAnalysis.mainCategory);
      if (item.aiAnalysis?.tags?.length) parts.push(item.aiAnalysis.tags.join(' '));
      if (item.chatTitle) parts.push(item.chatTitle);
      if (item.fromUsername) parts.push(item.fromUsername);
      
      const content = parts.join('\n');
      
      if (!content.trim()) {
        console.log(`[SearchIndexingService] Skipping telegram image ${item._id} - no searchable content`);
        return;
      }

      const embedding = await vectorDatabaseService.generateEmbedding(content);

      const chunk: ISmartChunk = {
        id: (item._id as mongoose.Types.ObjectId).toString(),
        content: content,
        embedding: embedding,
        type: 'paragraph',
        level: 0,
        semanticScore: 1,
        startIndex: 0,
        endIndex: content.length,
        metadata: {
          keywords: item.aiAnalysis?.tags || [],
        }
      };

      await vectorDatabaseService.storeDocumentChunks(
        item.synapseUserId!.toString(),
        (item._id as mongoose.Types.ObjectId).toString(),
        [chunk],
        {
          documentType: 'image',
          title: item.aiAnalysis?.description || item.text || 'Image',
          tags: item.aiAnalysis?.tags || [],
          createdAt: item.receivedAt,
          chatTitle: item.chatTitle,
          fromUsername: item.fromUsername,
          category: item.aiAnalysis?.mainCategory,
        }
      );
      console.log(`[SearchIndexingService] Indexed Telegram image ${item._id}`);
    } catch (error) {
      console.error(`[SearchIndexingService] Error indexing Telegram image ${item._id}:`, error);
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
