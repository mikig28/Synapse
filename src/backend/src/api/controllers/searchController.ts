import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { vectorDatabaseService, SearchResult as VectorSearchResult, SearchOptions } from '../../services/vectorDatabaseService';
import Document from '../../models/Document';
import Note from '../../models/Note';
import BookmarkItem from '../../models/BookmarkItem';
import Task from '../../models/Task';
import Idea from '../../models/Idea';
import VideoItem from '../../models/VideoItem';
import NewsItem from '../../models/NewsItem';
import WhatsAppMessage from '../../models/WhatsAppMessage';
import WhatsAppImage from '../../models/WhatsAppImage';
import TelegramItem from '../../models/TelegramItem';
import Meeting from '../../models/Meeting';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

interface SearchResult {
  id: string;
  type: string;
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
 * Universal search across all content types using Vector Search
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
      minScore,
    } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    console.log(`[UniversalSearch] Searching for: "${query}" with strategy: ${strategy} for user: ${userId}`);

    const defaultMinScore = typeof minScore === 'number'
      ? Number(minScore)
      : (strategy === 'semantic' ? 0.55 : strategy === 'hybrid' ? 0.5 : 0.35);

    const searchOptions: SearchOptions = {
        topK: limit + offset, // Fetch enough results for pagination
        userId,
        filter: {},
    };

    if (contentTypes && !contentTypes.includes('all')) {
        searchOptions.filter!.documentType = { $in: contentTypes };
    }

    let searchResults: VectorSearchResult[] = [];
    let effectiveStrategy = strategy;

    switch (strategy) {
        case 'semantic':
            console.log('[UniversalSearch] Using semantic search strategy');
            searchResults = await vectorDatabaseService.semanticSearch(query, searchOptions);
            break;
        case 'keyword':
             console.log('[UniversalSearch] Using keyword (hybrid) search strategy');
             // Using hybrid search for keyword as it combines keyword matching
            searchResults = await vectorDatabaseService.hybridSearch(query, { ...searchOptions, keywordWeight: 0.7, semanticWeight: 0.3 });
            break;
        case 'hybrid':
        default:
            console.log('[UniversalSearch] Using hybrid search strategy');
            searchResults = await vectorDatabaseService.hybridSearch(query, searchOptions);
            break;
    }

    const relevantVectorResults = (searchResults || []).filter(r => (r.score ?? 0) >= defaultMinScore);
    if (relevantVectorResults.length === 0) {
      const fallback = await keywordFallbackSearch({ userId, query, limit: limit + offset, contentTypes });
      searchResults = fallback;
      if (strategy !== 'keyword') { effectiveStrategy = 'keyword_fallback'; }
    } else {
      searchResults = relevantVectorResults;
    }

    const resultsByType: Record<string, number> = {};
    const processedResults: SearchResult[] = searchResults.map(result => {
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

    const response: UniversalSearchResponse = {
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

  } catch (error) {
    console.error('[UniversalSearch] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during search',
      searchTime: Date.now() - startTime
    });
  }
};

// Simple keyword fallback search across Mongo collections when vector results aren't relevant
async function keywordFallbackSearch({
  userId,
  query,
  limit,
  contentTypes,
}: {
  userId: string;
  query: string;
  limit: number;
  contentTypes: string[];
}): Promise<VectorSearchResult[]> {
  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const includeAll = !contentTypes || contentTypes.includes('all');

    const searches: Promise<any[]>[] = [];

    if (includeAll || contentTypes.includes('document')) {
      searches.push(
        Document.find({ userId: userObjectId, $or: [{ title: regex }, { content: regex }] })
          .limit(20)
          .lean()
      );
    }
    if (includeAll || contentTypes.includes('note')) {
      searches.push(
        Note.find({ userId: userObjectId, $or: [{ title: regex }, { content: regex }] })
          .limit(20)
          .lean()
      );
    }
    if (includeAll || contentTypes.includes('bookmark')) {
      searches.push(
        BookmarkItem.find({ userId: userObjectId, $or: [{ title: regex }, { fetchedTitle: regex }, { summary: regex }, { fetchedDescription: regex }] })
          .limit(20)
          .lean()
      );
    }
    if (includeAll || contentTypes.includes('task')) {
      searches.push(
        Task.find({ userId: userObjectId, $or: [{ title: regex }, { description: regex }] })
          .limit(20)
          .lean()
      );
    }
    if (includeAll || contentTypes.includes('idea')) {
      searches.push(
        Idea.find({ userId: userObjectId, content: regex })
          .limit(20)
          .lean()
      );
    }
    if (includeAll || contentTypes.includes('image')) {
      searches.push(
        WhatsAppImage.find({
          userId: userObjectId,
          $or: [
            { caption: regex },
            { 'aiAnalysis.description': regex },
            { 'aiAnalysis.mainCategory': regex },
            { 'aiAnalysis.tags': regex },
            { tags: regex }
          ]
        })
          .limit(20)
          .lean()
      );
      searches.push(
        TelegramItem.find({
          synapseUserId: userObjectId,
          messageType: 'photo',
          $or: [
            { text: regex },
            { 'aiAnalysis.description': regex },
            { 'aiAnalysis.mainCategory': regex },
            { 'aiAnalysis.tags': regex }
          ]
        })
          .limit(20)
          .lean()
      );
    }

    const results = (await Promise.all(searches)).flat();

    const mapped: VectorSearchResult[] = results.slice(0, limit).map((doc: any) => {
      // Determine type
      let type = doc.documentType;
      if (!type) {
        if (doc.messageId || doc.caption || doc.aiAnalysis?.description) {
          type = 'image';
        } else if (doc.content && !doc.title) {
          type = 'idea';
        } else if (doc.fetchedTitle || doc.summary) {
          type = 'bookmark';
        } else if (doc.description !== undefined) {
          type = 'task';
        } else {
          type = 'document';
        }
      }

      // Get title based on content type
      let title: string;
      if (type === 'image') {
        title = doc.caption || doc.aiAnalysis?.description || doc.text || 'Image';
      } else {
        title = doc.title || doc.fetchedTitle || (doc.content ? (doc.content as string).slice(0, 60) : 'Untitled');
      }

      // Get content based on content type
      let content: string;
      if (type === 'image') {
        const parts: string[] = [];
        if (doc.caption) parts.push(doc.caption);
        if (doc.aiAnalysis?.description) parts.push(doc.aiAnalysis.description);
        if (doc.aiAnalysis?.mainCategory) parts.push(doc.aiAnalysis.mainCategory);
        if (doc.text) parts.push(doc.text);
        content = parts.join(' ');
      } else {
        content = doc.content || doc.summary || doc.fetchedDescription || '';
      }

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
          createdAt: doc.createdAt || doc.receivedAt || new Date(),
          url: doc.publicUrl || undefined,
        },
      } as VectorSearchResult;
    });

    return mapped;
  } catch (error) {
    console.error('[KeywordFallbackSearch] Error:', error);
    return [];
  }
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
      whatsappImageCount,
      telegramImageCount,
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
      WhatsAppImage.countDocuments({ userId: userObjectId }),
      TelegramItem.countDocuments({ synapseUserId: userObjectId, messageType: 'photo' }),
      TelegramItem.countDocuments({ synapseUserId: userObjectId }),
      Meeting.countDocuments({ userId: userObjectId })
    ]);

    // WhatsApp messages don't have userId, so count differently
    const whatsappCount = await WhatsAppMessage.countDocuments({});
    
    // Total images from both sources
    const imageCount = whatsappImageCount + telegramImageCount;

    const stats = {
      totalSearchableItems: documentCount + noteCount + bookmarkCount + taskCount + ideaCount + videoCount + newsCount + telegramCount + meetingCount + whatsappCount + imageCount,
      byType: {
        documents: documentCount,
        notes: noteCount,
        bookmarks: bookmarkCount,
        tasks: taskCount,
        ideas: ideaCount,
        videos: videoCount,
        news: newsCount,
        images: imageCount,
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
