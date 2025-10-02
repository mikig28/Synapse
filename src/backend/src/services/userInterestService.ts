import UserInterest, { IUserInterest } from '../models/UserInterest';
import RealNewsArticle from '../models/RealNewsArticle';
import { logger } from '../utils/logger';
import { FREE_NEWS_SOURCES, getAvailableCategories as getRSSCategories } from '../config/freeNewsSources';

export class UserInterestService {
  /**
   * Get user interests
   */
  async getUserInterests(userId: string): Promise<IUserInterest | null> {
    try {
      const interests = await UserInterest.findOne({ userId });
      return interests;
    } catch (error) {
      logger.error('Error getting user interests:', error);
      throw error;
    }
  }

  /**
   * Create or update user interests
   */
  async updateUserInterests(
    userId: string,
    updates: Partial<IUserInterest>
  ): Promise<IUserInterest> {
    try {
      const interests = await UserInterest.findOneAndUpdate(
        { userId },
        { $set: updates },
        { new: true, upsert: true }
      );

      logger.info(`Updated interests for user ${userId}`);
      return interests;
    } catch (error) {
      logger.error('Error updating user interests:', error);
      throw error;
    }
  }

  /**
   * Add topic to user interests
   */
  async addTopic(userId: string, topic: string): Promise<IUserInterest> {
    try {
      const interests = await UserInterest.findOneAndUpdate(
        { userId },
        { $addToSet: { topics: topic } },
        { new: true, upsert: true }
      );

      logger.info(`Added topic "${topic}" for user ${userId}`);
      return interests;
    } catch (error) {
      logger.error('Error adding topic:', error);
      throw error;
    }
  }

  /**
   * Remove topic from user interests
   */
  async removeTopic(userId: string, topic: string): Promise<IUserInterest> {
    try {
      const interests = await UserInterest.findOneAndUpdate(
        { userId },
        { $pull: { topics: topic } },
        { new: true }
      );

      if (!interests) {
        throw new Error('User interests not found');
      }

      logger.info(`Removed topic "${topic}" for user ${userId}`);
      return interests;
    } catch (error) {
      logger.error('Error removing topic:', error);
      throw error;
    }
  }

  /**
   * Add keyword to user interests
   */
  async addKeyword(userId: string, keyword: string): Promise<IUserInterest> {
    try {
      const interests = await UserInterest.findOneAndUpdate(
        { userId },
        { $addToSet: { keywords: keyword } },
        { new: true, upsert: true }
      );

      logger.info(`Added keyword "${keyword}" for user ${userId}`);
      return interests;
    } catch (error) {
      logger.error('Error adding keyword:', error);
      throw error;
    }
  }

  /**
   * Remove keyword from user interests
   */
  async removeKeyword(userId: string, keyword: string): Promise<IUserInterest> {
    try {
      const interests = await UserInterest.findOneAndUpdate(
        { userId },
        { $pull: { keywords: keyword } },
        { new: true }
      );

      if (!interests) {
        throw new Error('User interests not found');
      }

      logger.info(`Removed keyword "${keyword}" for user ${userId}`);
      return interests;
    } catch (error) {
      logger.error('Error removing keyword:', error);
      throw error;
    }
  }

  /**
   * Suggest topics based on reading history
   */
  async suggestTopics(userId: string, limit: number = 10): Promise<string[]> {
    try {
      // Get user's read articles
      const readArticles = await RealNewsArticle.find({
        userId,
        isRead: true
      })
        .sort({ readAt: -1 })
        .limit(50);

      if (readArticles.length === 0) {
        return this.getDefaultTopicSuggestions();
      }

      // Extract categories and keywords from read articles
      const topicCounts = new Map<string, number>();

      for (const article of readArticles) {
        // Add category
        if (article.category) {
          topicCounts.set(article.category, (topicCounts.get(article.category) || 0) + 1);
        }

        // Extract keywords from title
        if (article.title) {
          const words = article.title.toLowerCase().split(/\W+/);
          for (const word of words) {
            if (word.length > 4) {
              topicCounts.set(word, (topicCounts.get(word) || 0) + 1);
            }
          }
        }

        // Add tags
        if (article.tags && article.tags.length > 0) {
          for (const tag of article.tags) {
            topicCounts.set(tag, (topicCounts.get(tag) || 0) + 1);
          }
        }
      }

      // Sort by frequency and return top suggestions
      const suggestions = Array.from(topicCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([topic]) => topic);

      return suggestions;
    } catch (error) {
      logger.error('Error suggesting topics:', error);
      return this.getDefaultTopicSuggestions();
    }
  }

  /**
   * Get default topic suggestions
   */
  private getDefaultTopicSuggestions(): string[] {
    return [
      'technology',
      'artificial intelligence',
      'business',
      'science',
      'startups',
      'innovation',
      'programming',
      'machine learning',
      'finance',
      'health'
    ];
  }

  /**
   * Get available news categories
   */
  getAvailableCategories(): string[] {
    return [
      'general',
      'technology',
      'business',
      'science',
      'health',
      'sports',
      'entertainment',
      'politics',
      'world',
      'finance',
      'innovation',
      'startups',
      'ai',
      'programming'
    ];
  }

  /**
   * Get available news sources (FREE RSS sources!)
   */
  getAvailableSources(): Array<{ id: string; name: string; category: string }> {
    return FREE_NEWS_SOURCES.map(source => ({
      id: source.id,
      name: source.name,
      category: source.category
    }));
  }

  /**
   * Initialize default interests for new user
   */
  async initializeDefaultInterests(userId: string): Promise<IUserInterest> {
    try {
      const existing = await UserInterest.findOne({ userId });
      if (existing) {
        return existing;
      }

      const defaultInterests = await UserInterest.create({
        userId,
        topics: ['technology', 'artificial intelligence', 'business'],
        keywords: ['AI', 'innovation', 'startups', 'machine learning'],
        categories: ['technology', 'business', 'science'],
        sources: [],
        excludeKeywords: [],
        languages: ['en'],
        refreshInterval: 30,
        autoFetchEnabled: true,
        maxArticlesPerFetch: 50
      });

      logger.info(`Initialized default interests for user ${userId}`);
      return defaultInterests;
    } catch (error) {
      logger.error('Error initializing default interests:', error);
      throw error;
    }
  }
}

export const userInterestService = new UserInterestService();
