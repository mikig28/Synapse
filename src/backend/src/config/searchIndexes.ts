import mongoose from 'mongoose';
import Document from '../models/Document';
import Note from '../models/Note';
import BookmarkItem from '../models/BookmarkItem';
import Task from '../models/Task';
import Idea from '../models/Idea';
import VideoItem from '../models/VideoItem';
import NewsItem from '../models/NewsItem';
import WhatsAppMessage from '../models/WhatsAppMessage';
import TelegramItem from '../models/TelegramItem';
import Meeting from '../models/Meeting';

/**
 * Initialize search indexes for optimal query performance
 */
export async function initializeSearchIndexes(): Promise<void> {
  console.log('[SearchIndexes] Initializing search indexes...');
  
  try {
    // Documents - Drop existing conflicting index first
    try {
      await Document.collection.dropIndex('title_text_content_text_summary_text');
      console.log('[SearchIndexes] Dropped conflicting text index');
    } catch (error) {
      // Index might not exist, which is fine
    }
    
    // Documents - Text indexes for title, content, and metadata
    await Document.collection.createIndex(
      { 
        title: 'text', 
        content: 'text',
        'metadata.category': 'text',
        'metadata.tags': 'text',
        searchKeywords: 'text',
        autoTags: 'text'
      },
      { 
        name: 'document_text_search',
        weights: {
          title: 10,
          content: 5,
          'metadata.tags': 8,
          searchKeywords: 8,
          autoTags: 6,
          'metadata.category': 4
        }
      }
    );

    // Documents - User-specific searches
    await Document.collection.createIndex({ userId: 1, title: 1 });
    await Document.collection.createIndex({ userId: 1, 'metadata.processingStatus': 1 });
    await Document.collection.createIndex({ userId: 1, createdAt: -1 });

    // Notes - Text search indexes
    await Note.collection.createIndex(
      { 
        title: 'text', 
        content: 'text',
        rawTranscription: 'text'
      },
      { 
        name: 'note_text_search',
        weights: {
          title: 10,
          content: 5,
          rawTranscription: 3
        }
      }
    );

    // Notes - User and source indexes
    await Note.collection.createIndex({ userId: 1, title: 1 });
    await Note.collection.createIndex({ userId: 1, source: 1 });
    await Note.collection.createIndex({ userId: 1, createdAt: -1 });

    // BookmarkItems - Text search indexes
    await BookmarkItem.collection.createIndex(
      { 
        title: 'text',
        summary: 'text',
        fetchedTitle: 'text',
        fetchedDescription: 'text',
        rawPageContent: 'text',
        tags: 'text',
        redditPostContent: 'text'
      },
      { 
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
      }
    );

    // BookmarkItems - User and platform indexes
    await BookmarkItem.collection.createIndex({ userId: 1, title: 1 });
    await BookmarkItem.collection.createIndex({ userId: 1, sourcePlatform: 1 });
    await BookmarkItem.collection.createIndex({ userId: 1, status: 1 });
    await BookmarkItem.collection.createIndex({ userId: 1, createdAt: -1 });

    // Tasks - Text search indexes
    await Task.collection.createIndex(
      { 
        title: 'text',
        description: 'text',
        tags: 'text'
      },
      { 
        name: 'task_text_search',
        weights: {
          title: 10,
          description: 5,
          tags: 8
        }
      }
    );

    // Tasks - User and status indexes
    await Task.collection.createIndex({ userId: 1, title: 1 });
    await Task.collection.createIndex({ userId: 1, status: 1 });
    await Task.collection.createIndex({ userId: 1, priority: 1 });
    await Task.collection.createIndex({ userId: 1, dueDate: 1 });
    await Task.collection.createIndex({ userId: 1, createdAt: -1 });

    // Ideas - Text search indexes
    await Idea.collection.createIndex(
      { 
        title: 'text',
        description: 'text',
        tags: 'text'
      },
      { 
        name: 'idea_text_search',
        weights: {
          title: 10,
          description: 5,
          tags: 8
        }
      }
    );

    // Ideas - User and category indexes
    await Idea.collection.createIndex({ userId: 1, title: 1 });
    await Idea.collection.createIndex({ userId: 1, category: 1 });
    await Idea.collection.createIndex({ userId: 1, status: 1 });
    await Idea.collection.createIndex({ userId: 1, createdAt: -1 });

    // VideoItems - Text search indexes
    await VideoItem.collection.createIndex(
      { 
        title: 'text',
        summary: 'text',
        transcript: 'text',
        tags: 'text'
      },
      { 
        name: 'video_text_search',
        weights: {
          title: 10,
          summary: 8,
          transcript: 4,
          tags: 7
        }
      }
    );

    // VideoItems - User and platform indexes
    await VideoItem.collection.createIndex({ userId: 1, title: 1 });
    await VideoItem.collection.createIndex({ userId: 1, platform: 1 });
    await VideoItem.collection.createIndex({ userId: 1, status: 1 });
    await VideoItem.collection.createIndex({ userId: 1, createdAt: -1 });

    // NewsItems - Text search indexes
    await NewsItem.collection.createIndex(
      { 
        title: 'text',
        summary: 'text',
        content: 'text',
        tags: 'text'
      },
      { 
        name: 'news_text_search',
        weights: {
          title: 10,
          summary: 8,
          content: 5,
          tags: 7
        }
      }
    );

    // NewsItems - User and source indexes
    await NewsItem.collection.createIndex({ userId: 1, title: 1 });
    await NewsItem.collection.createIndex({ userId: 1, source: 1 });
    await NewsItem.collection.createIndex({ userId: 1, category: 1 });
    await NewsItem.collection.createIndex({ userId: 1, publishedAt: -1 });

    // WhatsAppMessages - Text search indexes (no userId field)
    await WhatsAppMessage.collection.createIndex(
      { 
        body: 'text',
        contactName: 'text',
        groupName: 'text'
      },
      { 
        name: 'whatsapp_text_search',
        weights: {
          body: 10,
          contactName: 8,
          groupName: 8
        }
      }
    );

    // WhatsAppMessages - Chat and time indexes
    await WhatsAppMessage.collection.createIndex({ chatId: 1, timestamp: -1 });
    await WhatsAppMessage.collection.createIndex({ isGroup: 1, timestamp: -1 });
    await WhatsAppMessage.collection.createIndex({ contactName: 1 });
    await WhatsAppMessage.collection.createIndex({ groupName: 1 });

    // TelegramItems - Text search indexes
    await TelegramItem.collection.createIndex(
      { 
        text: 'text',
        caption: 'text',
        tags: 'text'
      },
      { 
        name: 'telegram_text_search',
        weights: {
          text: 10,
          caption: 8,
          tags: 7
        }
      }
    );

    // TelegramItems - User and message indexes
    await TelegramItem.collection.createIndex({ userId: 1, text: 1 });
    await TelegramItem.collection.createIndex({ userId: 1, messageType: 1 });
    await TelegramItem.collection.createIndex({ userId: 1, messageDate: -1 });
    await TelegramItem.collection.createIndex({ userId: 1, fromUser: 1 });

    // Meetings - Text search indexes
    await Meeting.collection.createIndex(
      { 
        title: 'text',
        summary: 'text',
        transcript: 'text',
        participants: 'text'
      },
      { 
        name: 'meeting_text_search',
        weights: {
          title: 10,
          summary: 8,
          transcript: 4,
          participants: 6
        }
      }
    );

    // Meetings - User and time indexes
    await Meeting.collection.createIndex({ userId: 1, title: 1 });
    await Meeting.collection.createIndex({ userId: 1, status: 1 });
    await Meeting.collection.createIndex({ userId: 1, startTime: -1 });

    console.log('[SearchIndexes] ✅ All search indexes created successfully');

  } catch (error) {
    console.error('[SearchIndexes] ❌ Error creating search indexes:', error);
    throw error;
  }
}

/**
 * Drop all search indexes (for maintenance/recreation)
 */
export async function dropSearchIndexes(): Promise<void> {
  console.log('[SearchIndexes] Dropping existing search indexes...');
  
  try {
    const collections = [
      Document.collection,
      Note.collection,
      BookmarkItem.collection,
      Task.collection,
      Idea.collection,
      VideoItem.collection,
      NewsItem.collection,
      WhatsAppMessage.collection,
      TelegramItem.collection,
      Meeting.collection
    ];

    for (const collection of collections) {
      try {
        // Drop text search indexes by name
        const collectionName = collection.collectionName;
        const textIndexName = `${collectionName.toLowerCase()}_text_search`;
        
        try {
          await collection.dropIndex(textIndexName);
          console.log(`[SearchIndexes] Dropped text index for ${collectionName}`);
        } catch (error) {
          // Index might not exist, which is fine
          console.log(`[SearchIndexes] Text index ${textIndexName} doesn't exist or already dropped`);
        }
      } catch (error) {
        console.log(`[SearchIndexes] Error dropping indexes for ${collection.collectionName}:`, error);
      }
    }

    console.log('[SearchIndexes] ✅ Search indexes dropped successfully');

  } catch (error) {
    console.error('[SearchIndexes] ❌ Error dropping search indexes:', error);
    throw error;
  }
}

/**
 * Get information about existing indexes
 */
export async function getIndexInfo(): Promise<Record<string, any[]>> {
  console.log('[SearchIndexes] Getting index information...');
  
  const indexInfo: Record<string, any[]> = {};
  
  try {
    const collections = [
      { name: 'documents', collection: Document.collection },
      { name: 'notes', collection: Note.collection },
      { name: 'bookmarks', collection: BookmarkItem.collection },
      { name: 'tasks', collection: Task.collection },
      { name: 'ideas', collection: Idea.collection },
      { name: 'videos', collection: VideoItem.collection },
      { name: 'news', collection: NewsItem.collection },
      { name: 'whatsapp', collection: WhatsAppMessage.collection },
      { name: 'telegram', collection: TelegramItem.collection },
      { name: 'meetings', collection: Meeting.collection }
    ];

    for (const { name, collection } of collections) {
      try {
        const indexes = await collection.indexes();
        indexInfo[name] = indexes;
        console.log(`[SearchIndexes] ${name}: ${indexes.length} indexes`);
      } catch (error) {
        console.log(`[SearchIndexes] Error getting indexes for ${name}:`, error);
        indexInfo[name] = [];
      }
    }

    return indexInfo;

  } catch (error) {
    console.error('[SearchIndexes] ❌ Error getting index information:', error);
    throw error;
  }
}