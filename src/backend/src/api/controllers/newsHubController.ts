import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import RealNewsArticle, { IRealNewsArticle } from '../../models/RealNewsArticle';
import { rssNewsAggregationService } from '../../services/rssNewsAggregationService';
import { newsRankingService } from '../../services/newsRankingService';
import { userInterestService } from '../../services/userInterestService';
import { autoPushNewArticles } from '../../services/newsPushService';
import { logger } from '../../utils/logger';
import { telegramBotManager } from '../../services/telegramBotManager';
import WhatsAppSessionManager from '../../services/whatsappSessionManager';

/**
 * Get personalized news feed for user
 */
export const getNewsFeed = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const {
      page = 1,
      limit = 20,
      category,
      source,
      isRead,
      isSaved,
      sortBy = 'relevance' // relevance, date, none
    } = req.query;

    // Build query
    const query: any = { userId };

    if (category) query.category = category;
    if (source) query['source.id'] = source;
    if (isRead !== undefined) query.isRead = isRead === 'true';
    if (isSaved !== undefined) query.isSaved = isSaved === 'true';

    // Get articles
    let articles: IRealNewsArticle[] = await RealNewsArticle.find(query)
      .sort({ publishedAt: -1 })
      .limit(Number(limit) * Number(page))
      .skip((Number(page) - 1) * Number(limit));

    // Rank articles if sorting by relevance
    if (sortBy === 'relevance') {
      articles = await newsRankingService.rankArticles(userId, articles);
    }

    // Get total count for pagination
    const totalCount = await RealNewsArticle.countDocuments(query);

    res.json({
      success: true,
      data: articles,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit)),
        totalItems: totalCount
      }
    });
  } catch (error: any) {
    logger.error('Error getting news feed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Manually refresh news for user
 */
export const refreshNews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { limit = 50 } = req.body;

    // Fetch new articles from RSS feeds (FREE!)
    const articles = await rssNewsAggregationService.fetchNewsForUser(userId, {
      forceRefresh: true,
      limit: Number(limit)
    });

    // Rank articles
    const rankedArticles = await newsRankingService.rankArticles(userId, articles);

    // Auto-push articles if enabled
    await autoPushNewArticles(userId, rankedArticles);

    res.json({
      success: true,
      data: rankedArticles,
      message: `Fetched ${articles.length} new articles`
    });
  } catch (error: any) {
    logger.error('Error refreshing news:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get user interests
 */
export const getUserInterests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    let interests = await userInterestService.getUserInterests(userId);

    // Create default if not exists
    if (!interests) {
      interests = await userInterestService.initializeDefaultInterests(userId);
    }

    res.json({ success: true, data: interests });
  } catch (error: any) {
    logger.error('Error getting user interests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update user interests
 */
export const updateUserInterests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      logger.warn('Unauthorized request to update interests - no user ID');
      res.status(401).json({ success: false, error: 'Unauthorized - Please log in' });
      return;
    }

    // Check MongoDB connection state
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      logger.error('MongoDB not connected. Connection state:', mongoose.connection.readyState);
      res.status(503).json({ 
        success: false, 
        error: 'Database is not connected. Please try again later.',
        debug: {
          connectionState: mongoose.connection.readyState,
          states: { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }
        }
      });
      return;
    }

    const updates = req.body;
    logger.info(`Updating interests for user ${userId}:`, updates);
    
    // Validate that updates is an object
    if (!updates || typeof updates !== 'object') {
      logger.error('Invalid updates object:', updates);
      res.status(400).json({ success: false, error: 'Invalid request body' });
      return;
    }
    
    const interests = await userInterestService.updateUserInterests(userId, updates);

    if (!interests) {
      logger.error('Failed to update interests - service returned null');
      res.status(500).json({ success: false, error: 'Failed to update interests' });
      return;
    }

    logger.info(`Successfully updated interests for user ${userId}`);
    res.json({
      success: true,
      data: interests,
      message: 'Interests updated successfully'
    });
  } catch (error: any) {
    logger.error('Error updating user interests:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      updates: req.body
    });
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Failed to update interests';
    let statusCode = 500;
    
    if (error.message && error.message.includes('Cast to ObjectId failed')) {
      errorMessage = 'Invalid user ID format';
      statusCode = 400;
    } else if (error.name === 'ValidationError') {
      errorMessage = `Validation error: ${error.message}`;
      statusCode = 400;
    } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      errorMessage = 'Database error - please try again';
      logger.error('MongoDB error details:', error);
    } else if (error.message && error.message.includes('buffering timed out')) {
      errorMessage = 'Database connection timeout. Please check if MongoDB is running.';
      statusCode = 503;
    }
    
    res.status(statusCode).json({ success: false, error: errorMessage });
  }
};

/**
 * Get trending topics
 */
export const getTrendingTopics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { limit = 10 } = req.query;
    const topics = await newsRankingService.getTrendingTopics(userId, Number(limit));

    res.json({ success: true, data: topics });
  } catch (error: any) {
    logger.error('Error getting trending topics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get available sources
 */
export const getAvailableSources = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sources = userInterestService.getAvailableSources();
    res.json({ success: true, data: sources });
  } catch (error: any) {
    logger.error('Error getting available sources:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get available categories
 */
export const getAvailableCategories = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const categories = userInterestService.getAvailableCategories();
    res.json({ success: true, data: categories });
  } catch (error: any) {
    logger.error('Error getting available categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Mark article as read
 */
export const markArticleAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const article = await RealNewsArticle.findOne({ _id: id, userId });

    if (!article) {
      res.status(404).json({ success: false, error: 'Article not found' });
      return;
    }

    await article.markAsRead();

    res.json({
      success: true,
      data: article,
      message: 'Article marked as read'
    });
  } catch (error: any) {
    logger.error('Error marking article as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Toggle article saved status
 */
export const toggleArticleSaved = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const article = await RealNewsArticle.findOne({ _id: id, userId });

    if (!article) {
      res.status(404).json({ success: false, error: 'Article not found' });
      return;
    }

    await article.toggleSaved();

    res.json({
      success: true,
      data: article,
      message: article.isSaved ? 'Article saved' : 'Article unsaved'
    });
  } catch (error: any) {
    logger.error('Error toggling article saved status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Toggle article favorite status
 */
export const toggleArticleFavorite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const article = await RealNewsArticle.findOne({ _id: id, userId });

    if (!article) {
      res.status(404).json({ success: false, error: 'Article not found' });
      return;
    }

    await article.toggleFavorite();

    res.json({
      success: true,
      data: article,
      message: article.isFavorite ? 'Article favorited' : 'Article unfavorited'
    });
  } catch (error: any) {
    logger.error('Error toggling article favorite status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get suggested topics based on reading history
 */
export const getSuggestedTopics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { limit = 10 } = req.query;
    const suggestions = await userInterestService.suggestTopics(userId, Number(limit));

    res.json({ success: true, data: suggestions });
  } catch (error: any) {
    logger.error('Error getting suggested topics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get news hub statistics
 */
export const getNewsHubStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const [totalArticles, unreadArticles, savedArticles, favoriteArticles, last24Hours] = await Promise.all([
      RealNewsArticle.countDocuments({ userId }),
      RealNewsArticle.countDocuments({ userId, isRead: false }),
      RealNewsArticle.countDocuments({ userId, isSaved: true }),
      RealNewsArticle.countDocuments({ userId, isFavorite: true }),
      RealNewsArticle.countDocuments({
        userId,
        publishedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalArticles,
        unreadArticles,
        savedArticles,
        favoriteArticles,
        last24Hours
      }
    });
  } catch (error: any) {
    logger.error('Error getting news hub stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Format article for messaging (for manual push endpoints)
 */
function formatArticleForMessaging(article: IRealNewsArticle): string {
  const lines = [
    `📰 *${article.title}*`,
    '',
    article.description ? article.description : '',
    '',
    `📅 ${new Date(article.publishedAt).toLocaleDateString()}`,
    `📰 Source: ${article.source.name}`,
    article.category ? `🏷️ Category: ${article.category}` : '',
    '',
    `🔗 Read more: ${article.url}`
  ];
  
  return lines.filter(line => line !== '').join('\n');
}

/**
 * Push article to user's Telegram bot
 */
export const pushArticleToTelegram = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    // Get the article
    const article = await RealNewsArticle.findOne({ _id: id, userId });
    if (!article) {
      res.status(404).json({ success: false, error: 'Article not found' });
      return;
    }

    // Get user's bot and send message
    const userBot = telegramBotManager.getBotForUser(userId);
    if (!userBot) {
      res.status(400).json({ 
        success: false, 
        error: 'No Telegram bot configured. Please set up your bot first.' 
      });
      return;
    }

    // Format article message
    const message = formatArticleForMessaging(article);

    // Send to user's own chat (bot will send to user who configured it)
    const success = await telegramBotManager.sendMessage(
      userId,
      parseInt(userId), // Send to user's own chat
      message,
      { parse_mode: 'Markdown' }
    );

    if (success) {
      res.json({
        success: true,
        message: 'Article sent to your Telegram bot'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send article to Telegram'
      });
    }
  } catch (error: any) {
    logger.error('Error pushing article to Telegram:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Push article to WhatsApp group
 */
export const pushArticleToWhatsApp = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { groupId } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    if (!groupId) {
      res.status(400).json({ success: false, error: 'Group ID is required' });
      return;
    }

    // Get the article
    const article = await RealNewsArticle.findOne({ _id: id, userId });
    if (!article) {
      res.status(404).json({ success: false, error: 'Article not found' });
      return;
    }

    // Format article message
    const message = formatArticleForMessaging(article);

    // Send via WAHA
    const sessionManager = WhatsAppSessionManager.getInstance();
    const wahaService = await sessionManager.getSessionForUser(userId);
    await wahaService.sendMessage(groupId, message);

    res.json({
      success: true,
      message: 'Article sent to WhatsApp group'
    });
  } catch (error: any) {
    logger.error('Error pushing article to WhatsApp:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to send article to WhatsApp'
    });
  }
};
