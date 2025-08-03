import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Document from '../../models/Document';
import Note from '../../models/Note';
import BookmarkItem from '../../models/BookmarkItem';
import Task from '../../models/Task';
import Idea from '../../models/Idea';
import VideoItem from '../../models/VideoItem';
import NewsItem from '../../models/NewsItem';
import WhatsAppMessage from '../../models/WhatsAppMessage';
import TelegramItem from '../../models/TelegramItem';
import Meeting from '../../models/Meeting';
import { selfReflectiveRAGService } from '../../services/selfReflectiveRAGService';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

interface SearchResult {
  id: string;
  type: 'document' | 'note' | 'bookmark' | 'task' | 'idea' | 'video' | 'news' | 'whatsapp' | 'telegram' | 'meeting';
  title: string;
  content: string;
  excerpt: string;
  score: number;
  createdAt: Date;
  metadata?: any;
}

interface UniversalSearchResponse {
  query: string;
  totalResults: number;
  results: SearchResult[];
  resultsByType: Record<string, number>;
  searchTime: number;
  strategy: string;
}

/**
 * Universal search across all content types
 */
export const universalSearch = async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { 
      query, 
      strategy = 'hybrid',
      limit = 50,
      offset = 0,
      contentTypes = ['all'],
      includeDebugInfo = false 
    } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    console.log(`[UniversalSearch] Searching for: "${query}" with strategy: ${strategy}`);

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const searchRegex = new RegExp(query.trim(), 'i');
    const results: SearchResult[] = [];
    const resultsByType: Record<string, number> = {};

    // Define which content types to search
    const typesToSearch = contentTypes.includes('all') ? 
      ['document', 'note', 'bookmark', 'task', 'idea', 'video', 'news', 'whatsapp', 'telegram', 'meeting'] :
      contentTypes;

    // Search Documents (using existing RAG service for advanced search)
    if (typesToSearch.includes('document')) {
      try {
        const documentResults = await selfReflectiveRAGService.processQuery({
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
      } catch (error) {
        console.error('[UniversalSearch] Document search error:', error);
        resultsByType.document = 0;
      }
    }

    // Search Notes
    if (typesToSearch.includes('note')) {
      try {
        const notes = await Note.find({
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
            id: (note._id as mongoose.Types.ObjectId).toString(),
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
      } catch (error) {
        console.error('[UniversalSearch] Note search error:', error);
        resultsByType.note = 0;
      }
    }

    // Search Bookmarks
    if (typesToSearch.includes('bookmark')) {
      try {
        const bookmarks = await BookmarkItem.find({
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
            id: (bookmark._id as mongoose.Types.ObjectId).toString(),
            type: 'bookmark',
            title,
            content,
            excerpt: content.substring(0, 200) + '...',
            score: calculateTextScore(query, title + ' ' + content),
            createdAt: (bookmark as any).createdAt || new Date(),
            metadata: {
              url: bookmark.originalUrl,
              platform: bookmark.sourcePlatform,
              status: bookmark.status,
              tags: bookmark.tags
            }
          });
        }
        resultsByType.bookmark = bookmarks.length;
      } catch (error) {
        console.error('[UniversalSearch] Bookmark search error:', error);
        resultsByType.bookmark = 0;
      }
    }

    // Search Tasks
    if (typesToSearch.includes('task')) {
      try {
        const tasks = await Task.find({
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
            id: (task._id as mongoose.Types.ObjectId).toString(),
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
      } catch (error) {
        console.error('[UniversalSearch] Task search error:', error);
        resultsByType.task = 0;
      }
    }

    // Search Ideas
    if (typesToSearch.includes('idea')) {
      try {
        const ideas = await Idea.find({
          userId: userObjectId,
          content: searchRegex
        })
        .sort({ updatedAt: -1 })
        .limit(10);

        for (const idea of ideas) {
          results.push({
            id: (idea._id as mongoose.Types.ObjectId).toString(),
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
      } catch (error) {
        console.error('[UniversalSearch] Idea search error:', error);
        resultsByType.idea = 0;
      }
    }

    // Search Videos
    if (typesToSearch.includes('video')) {
      try {
        const videos = await VideoItem.find({
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
            id: (video._id as mongoose.Types.ObjectId).toString(),
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
      } catch (error) {
        console.error('[UniversalSearch] Video search error:', error);
        resultsByType.video = 0;
      }
    }

    // Search News
    if (typesToSearch.includes('news')) {
      try {
        const news = await NewsItem.find({
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
            id: (newsItem._id as mongoose.Types.ObjectId).toString(),
            type: 'news',
            title: newsItem.title,
            content: newsItem.summary || newsItem.content || '',
            excerpt: (newsItem.summary || newsItem.content || '').substring(0, 200) + '...',
            score: calculateTextScore(query, newsItem.title + ' ' + (newsItem.summary || '')),
            createdAt: newsItem.publishedAt || (newsItem as any).createdAt,
            metadata: {
              url: newsItem.url,
              source: newsItem.source,
              category: newsItem.category,
              tags: newsItem.tags
            }
          });
        }
        resultsByType.news = news.length;
      } catch (error) {
        console.error('[UniversalSearch] News search error:', error);
        resultsByType.news = 0;
      }
    }

    // Search WhatsApp Messages
    if (typesToSearch.includes('whatsapp')) {
      try {
        const whatsappMessages = await WhatsAppMessage.find({
          message: searchRegex
        })
        .sort({ timestamp: -1 })
        .limit(10);

        for (const message of whatsappMessages) {
          results.push({
            id: (message._id as mongoose.Types.ObjectId).toString(),
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
      } catch (error) {
        console.error('[UniversalSearch] WhatsApp search error:', error);
        resultsByType.whatsapp = 0;
      }
    }

    // Search Telegram Items
    if (typesToSearch.includes('telegram')) {
      try {
        const telegramItems = await TelegramItem.find({
          synapseUserId: userObjectId,
          text: searchRegex
        })
        .sort({ receivedAt: -1 })
        .limit(10);

        for (const telegram of telegramItems) {
          const content = telegram.text || '';
          results.push({
            id: (telegram._id as mongoose.Types.ObjectId).toString(),
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
      } catch (error) {
        console.error('[UniversalSearch] Telegram search error:', error);
        resultsByType.telegram = 0;
      }
    }

    // Search Meetings
    if (typesToSearch.includes('meeting')) {
      try {
        const meetings = await Meeting.find({
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
            id: (meeting._id as mongoose.Types.ObjectId).toString(),
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
      } catch (error) {
        console.error('[UniversalSearch] Meeting search error:', error);
        resultsByType.meeting = 0;
      }
    }

    // Sort results by score (descending) and apply pagination
    const sortedResults = results
      .sort((a, b) => b.score - a.score)
      .slice(offset, offset + limit);

    const searchTime = Date.now() - startTime;
    
    const response: UniversalSearchResponse = {
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

  } catch (error) {
    console.error('[UniversalSearch] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during search',
      searchTime: Date.now() - startTime
    });
  }
};

/**
 * Simple text relevance scoring
 */
function calculateTextScore(query: string, text: string): number {
  if (!text || !query) return 0;
  
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
export const getSearchSuggestions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { query = '', limit = 10 } = req.query;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const suggestions: string[] = [];

    if (query && typeof query === 'string' && query.length > 1) {
      const searchRegex = new RegExp(`^${query}`, 'i');
      
      // Get title suggestions from various content types
      const [documents, notes, bookmarks, tasks, ideas] = await Promise.all([
        Document.find({ userId: userObjectId, title: searchRegex }).select('title').limit(5),
        Note.find({ userId: userObjectId, title: searchRegex }).select('title').limit(5),
        BookmarkItem.find({ userId: userObjectId, title: searchRegex }).select('title').limit(5),
        Task.find({ userId: userObjectId, title: searchRegex }).select('title').limit(5),
        Idea.find({ userId: userObjectId, content: searchRegex }).select('content').limit(5)
      ]);

      // Collect unique suggestions
      const allTitles = [
        ...documents.map(d => d.title).filter(Boolean),
        ...notes.map(n => n.title).filter(Boolean),
        ...bookmarks.map(b => b.title).filter(Boolean),
        ...tasks.map(t => t.title),
        ...ideas.map(i => i.content.substring(0, 50)).filter(Boolean) // Use content excerpt for ideas
      ];

      const uniqueSuggestions = [...new Set(allTitles)].filter((title): title is string => Boolean(title));
      const limitNum = limit ? Number(limit) : 10;
      suggestions.push(...uniqueSuggestions.slice(0, limitNum));
    }

    res.json({
      success: true,
      data: suggestions
    });

  } catch (error) {
    console.error('[SearchSuggestions] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Get search statistics for the user
 */
export const getSearchStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [
      documentCount,
      noteCount,
      bookmarkCount,
      taskCount,
      ideaCount,
      videoCount,
      newsCount,
      telegramCount,
      meetingCount
    ] = await Promise.all([
      Document.countDocuments({ userId: userObjectId }),
      Note.countDocuments({ userId: userObjectId }),
      BookmarkItem.countDocuments({ userId: userObjectId }),
      Task.countDocuments({ userId: userObjectId }),
      Idea.countDocuments({ userId: userObjectId }),
      VideoItem.countDocuments({ userId: userObjectId }),
      NewsItem.countDocuments({ userId: userObjectId }),
      TelegramItem.countDocuments({ userId: userObjectId }),
      Meeting.countDocuments({ userId: userObjectId })
    ]);

    // WhatsApp messages don't have userId, so count differently
    const whatsappCount = await WhatsAppMessage.countDocuments({});

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

  } catch (error) {
    console.error('[SearchStats] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};