import axios from 'axios';
import crypto from 'crypto';
import Parser from 'rss-parser';
import RealNewsArticle, { IRealNewsArticle } from '../models/RealNewsArticle';
import UserInterest, { IUserInterest } from '../models/UserInterest';
import { logger } from '../utils/logger';
import { FREE_NEWS_SOURCES, getSourcesByPreferences, type RSSSource } from '../config/freeNewsSources';

interface RSSItem {
  title?: string;
  link?: string;
  pubDate?: string;
  creator?: string;
  content?: string;
  contentSnippet?: string;
  guid?: string;
  categories?: string[];
  isoDate?: string;
  enclosure?: {
    url?: string;
    type?: string;
  };
}

export class RSSNewsAggregationService {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
  }

  /**
   * Fetch news for a specific user based on their interests
   */
  async fetchNewsForUser(
    userId: string,
    options: {
      forceRefresh?: boolean;
      limit?: number;
    } = {}
  ): Promise<IRealNewsArticle[]> {
    try {
      const userInterest = await UserInterest.findOne({ userId });

      if (!userInterest) {
        logger.info(`No user interests found for ${userId}, creating default interests`);
        await this.createDefaultInterests(userId);
        return [];
      }

      const articles: Partial<IRealNewsArticle>[] = [];

      // Get sources based on user preferences
      const sources = this.getRelevantSources(userInterest);
      logger.info(`Fetching news from ${sources.length} RSS sources for user ${userId}`);

      // Fetch from all RSS sources in parallel
      const rssArticles = await this.fetchFromRSSSources(userId, sources, options.limit);
      articles.push(...rssArticles);

      // Fetch from HackerNews (still free!)
      const hnArticles = await this.fetchFromHackerNews(userId, userInterest);
      articles.push(...hnArticles);

      // Deduplicate articles
      const uniqueArticles = this.deduplicateArticles(articles);

      // Save to database
      const savedArticles = await this.saveArticles(userId, uniqueArticles);

      logger.info(`Fetched ${savedArticles.length} new articles for user ${userId}`);
      return savedArticles;
    } catch (error) {
      logger.error('Error fetching news for user:', error);
      throw error;
    }
  }

  /**
   * Get relevant sources based on user interests
   */
  private getRelevantSources(userInterest: IUserInterest): RSSSource[] {
    // If user has specific source preferences, use those
    if (userInterest.sources && userInterest.sources.length > 0) {
      return getSourcesByPreferences([], userInterest.sources);
    }

    // Otherwise, get sources matching user categories
    if (userInterest.categories && userInterest.categories.length > 0) {
      return getSourcesByPreferences(userInterest.categories, []);
    }

    // Default: return all sources
    return FREE_NEWS_SOURCES;
  }

  /**
   * Fetch articles from RSS sources
   */
  private async fetchFromRSSSources(
    userId: string,
    sources: RSSSource[],
    limit: number = 50
  ): Promise<Partial<IRealNewsArticle>[]> {
    const allArticles: Partial<IRealNewsArticle>[] = [];

    // Fetch from each source (with concurrency limit)
    const batchSize = 5; // Process 5 sources at a time
    for (let i = 0; i < sources.length; i += batchSize) {
      const batch = sources.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(source => this.fetchFromRSSSource(source))
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          allArticles.push(...result.value);
        } else {
          logger.warn('Failed to fetch from RSS source:', result.reason);
        }
      }

      // Stop if we have enough articles
      if (allArticles.length >= limit) {
        break;
      }
    }

    // Return only the requested number of articles
    return allArticles.slice(0, limit);
  }

  /**
   * Fetch from a single RSS source
   */
  private async fetchFromRSSSource(source: RSSSource): Promise<Partial<IRealNewsArticle>[]> {
    try {
      logger.info(`Fetching RSS feed from ${source.name} (${source.url})`);

      const feed = await this.parser.parseURL(source.url);
      const articles: Partial<IRealNewsArticle>[] = [];

      if (!feed.items || feed.items.length === 0) {
        logger.warn(`No items found in RSS feed: ${source.name}`);
        return [];
      }

      for (const item of feed.items) {
        if (!item.title || !item.link) {
          continue;
        }

        // Extract image from enclosure or content
        let imageUrl: string | undefined;
        if (item.enclosure?.url && this.isImageUrl(item.enclosure.url)) {
          imageUrl = item.enclosure.url;
        }

        // Parse publication date
        const publishedAt = item.isoDate || item.pubDate
          ? new Date(item.isoDate || item.pubDate!)
          : new Date();

        articles.push({
          title: this.cleanText(item.title),
          description: this.cleanText(item.contentSnippet || item.content),
          content: this.cleanText(item.content),
          url: item.link,
          urlToImage: imageUrl,
          source: {
            id: source.id,
            name: source.name
          },
          author: item.creator,
          publishedAt,
          category: source.category,
          language: source.language,
          fetchedAt: new Date(),
          externalId: item.guid || this.generateExternalId(item.link),
          contentHash: this.generateContentHash(item.title, item.link),
          tags: item.categories || []
        });
      }

      logger.info(`Fetched ${articles.length} articles from ${source.name}`);
      return articles;
    } catch (error: any) {
      logger.error(`Error fetching RSS from ${source.name}:`, error.message);
      return [];
    }
  }

  /**
   * Check if URL is an image
   */
  private isImageUrl(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const urlLower = url.toLowerCase();
    return imageExtensions.some(ext => urlLower.includes(ext));
  }

  /**
   * Clean HTML and extra whitespace from text
   */
  private cleanText(text: string | undefined): string | undefined {
    if (!text) return undefined;

    // Remove HTML tags
    let cleaned = text.replace(/<[^>]*>/g, ' ');

    // Decode HTML entities
    cleaned = cleaned
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');

    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned || undefined;
  }

  /**
   * Fetch news from HackerNews (Free API!)
   */
  private async fetchFromHackerNews(
    userId: string,
    userInterest: IUserInterest
  ): Promise<Partial<IRealNewsArticle>[]> {
    try {
      // Fetch top stories
      const topStoriesResponse = await axios.get(
        'https://hacker-news.firebaseio.com/v0/topstories.json',
        { timeout: 10000 }
      );

      const topStoryIds = topStoriesResponse.data.slice(0, 30);

      // Fetch story details
      const stories = await Promise.allSettled(
        topStoryIds.map((id: number) =>
          axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { timeout: 5000 })
        )
      );

      const articles: Partial<IRealNewsArticle>[] = [];

      for (const result of stories) {
        if (result.status === 'fulfilled' && result.value.data) {
          const story = result.value.data;

          // Only include stories with URLs
          if (story.url) {
            articles.push({
              title: story.title,
              description: story.text || undefined,
              url: story.url,
              source: {
                id: 'hackernews',
                name: 'Hacker News'
              },
              author: story.by || undefined,
              publishedAt: new Date(story.time * 1000),
              category: 'technology',
              language: 'en',
              fetchedAt: new Date(),
              externalId: `hn-${story.id}`,
              contentHash: this.generateContentHash(story.title, story.url)
            });
          }
        }
      }

      return articles;
    } catch (error) {
      logger.error('Error fetching from HackerNews:', error);
      return [];
    }
  }

  /**
   * Deduplicate articles based on URL and content hash
   */
  private deduplicateArticles(articles: Partial<IRealNewsArticle>[]): Partial<IRealNewsArticle>[] {
    const seen = new Set<string>();
    const unique: Partial<IRealNewsArticle>[] = [];

    for (const article of articles) {
      const key = article.contentHash || article.url;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(article);
      }
    }

    return unique;
  }

  /**
   * Save articles to database
   */
  private async saveArticles(
    userId: string,
    articles: Partial<IRealNewsArticle>[]
  ): Promise<IRealNewsArticle[]> {
    const saved: IRealNewsArticle[] = [];

    for (const article of articles) {
      try {
        // Check if article already exists
        const existing = await RealNewsArticle.findOne({
          userId,
          url: article.url
        });

        if (!existing) {
          const newArticle = await RealNewsArticle.create({
            ...article,
            userId,
            isRead: false,
            isFavorite: false,
            isSaved: false
          });
          saved.push(newArticle);
        }
      } catch (error: any) {
        // Skip duplicate errors
        if (error.code !== 11000) {
          logger.error('Error saving article:', error);
        }
      }
    }

    return saved;
  }

  /**
   * Create default interests for a new user
   */
  async createDefaultInterests(userId: string): Promise<IUserInterest> {
    const defaultInterest = await UserInterest.create({
      userId,
      topics: ['technology', 'artificial intelligence', 'science'],
      keywords: ['AI', 'machine learning', 'startups', 'innovation'],
      categories: ['technology', 'business', 'science'],
      languages: ['en'],
      sources: [],
      excludeKeywords: [],
      refreshInterval: 30,
      autoFetchEnabled: true,
      maxArticlesPerFetch: 50
    });

    return defaultInterest;
  }

  /**
   * Generate external ID from URL
   */
  private generateExternalId(url: string): string {
    return crypto.createHash('md5').update(url).digest('hex');
  }

  /**
   * Generate content hash for deduplication
   */
  private generateContentHash(title: string, url: string): string {
    const content = `${title}|${url}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Clean up old articles (older than 30 days)
   */
  async cleanupOldArticles(userId: string): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await RealNewsArticle.deleteMany({
      userId,
      publishedAt: { $lt: thirtyDaysAgo },
      isSaved: false,
      isFavorite: false
    });

    logger.info(`Cleaned up ${result.deletedCount} old articles for user ${userId}`);
    return result.deletedCount;
  }

  /**
   * Get available free sources
   */
  getAvailableSources(): RSSSource[] {
    return FREE_NEWS_SOURCES;
  }
}

export const rssNewsAggregationService = new RSSNewsAggregationService();
