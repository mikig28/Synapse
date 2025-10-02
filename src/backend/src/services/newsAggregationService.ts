import axios from 'axios';
import crypto from 'crypto';
import RealNewsArticle, { IRealNewsArticle } from '../models/RealNewsArticle';
import UserInterest, { IUserInterest } from '../models/UserInterest';
import { logger } from '../utils/logger';

interface NewsAPIArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

export class NewsAggregationService {
  private newsApiKey: string | undefined;
  private newsApiBaseUrl = 'https://newsapi.org/v2';

  constructor() {
    this.newsApiKey = process.env.NEWS_API_KEY;
    if (!this.newsApiKey) {
      logger.warn('NEWS_API_KEY not found. NewsAPI integration will be limited.');
    }
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

      const articles: IRealNewsArticle[] = [];

      // Fetch from NewsAPI
      if (this.newsApiKey) {
        const newsApiArticles = await this.fetchFromNewsAPI(userInterest, options.limit);
        articles.push(...newsApiArticles);
      }

      // Fetch from HackerNews
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
   * Fetch news from NewsAPI based on user interests
   */
  private async fetchFromNewsAPI(
    userInterest: IUserInterest,
    limit: number = 50
  ): Promise<Partial<IRealNewsArticle>[]> {
    if (!this.newsApiKey) {
      return [];
    }

    try {
      const articles: Partial<IRealNewsArticle>[] = [];

      // Build query from topics and keywords
      const query = this.buildNewsAPIQuery(userInterest);

      if (!query) {
        logger.warn('No query built from user interests');
        return [];
      }

      // Fetch top headlines and everything endpoint
      const [headlines, everything] = await Promise.allSettled([
        this.fetchNewsAPIEndpoint('top-headlines', {
          q: query,
          language: userInterest.languages[0] || 'en',
          pageSize: Math.min(limit, 100)
        }),
        this.fetchNewsAPIEndpoint('everything', {
          q: query,
          language: userInterest.languages[0] || 'en',
          sortBy: 'publishedAt',
          pageSize: Math.min(limit, 100),
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // Last 7 days
        })
      ]);

      // Process headlines
      if (headlines.status === 'fulfilled' && headlines.value.articles) {
        articles.push(...this.convertNewsAPIArticles(headlines.value.articles, 'technology'));
      }

      // Process everything
      if (everything.status === 'fulfilled' && everything.value.articles) {
        articles.push(...this.convertNewsAPIArticles(everything.value.articles, 'general'));
      }

      return articles;
    } catch (error) {
      logger.error('Error fetching from NewsAPI:', error);
      return [];
    }
  }

  /**
   * Build NewsAPI query from user interests
   */
  private buildNewsAPIQuery(userInterest: IUserInterest): string {
    const terms: string[] = [];

    // Add topics
    if (userInterest.topics.length > 0) {
      terms.push(...userInterest.topics.slice(0, 3)); // Limit to 3 topics
    }

    // Add keywords
    if (userInterest.keywords.length > 0) {
      terms.push(...userInterest.keywords.slice(0, 3)); // Limit to 3 keywords
    }

    // Join with OR operator
    return terms.join(' OR ');
  }

  /**
   * Fetch from specific NewsAPI endpoint
   */
  private async fetchNewsAPIEndpoint(
    endpoint: string,
    params: Record<string, string | number>
  ): Promise<NewsAPIResponse> {
    const response = await axios.get(`${this.newsApiBaseUrl}/${endpoint}`, {
      params,
      headers: {
        'X-Api-Key': this.newsApiKey
      },
      timeout: 10000
    });

    return response.data;
  }

  /**
   * Convert NewsAPI articles to our format
   */
  private convertNewsAPIArticles(
    articles: NewsAPIArticle[],
    category: string
  ): Partial<IRealNewsArticle>[] {
    return articles
      .filter(article => article.title && article.url)
      .map(article => ({
        title: article.title,
        description: article.description || undefined,
        content: article.content || undefined,
        url: article.url,
        urlToImage: article.urlToImage || undefined,
        source: {
          id: article.source.id || undefined,
          name: article.source.name
        },
        author: article.author || undefined,
        publishedAt: new Date(article.publishedAt),
        category,
        language: 'en',
        fetchedAt: new Date(),
        externalId: this.generateExternalId(article.url),
        contentHash: this.generateContentHash(article.title, article.url)
      }));
  }

  /**
   * Fetch news from HackerNews
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

      const topStoryIds = topStoriesResponse.data.slice(0, 30); // Get top 30 stories

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

          // Only include stories with URLs (not Ask HN, etc.)
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
      isSaved: false, // Keep saved articles
      isFavorite: false // Keep favorite articles
    });

    logger.info(`Cleaned up ${result.deletedCount} old articles for user ${userId}`);
    return result.deletedCount;
  }
}

export const newsAggregationService = new NewsAggregationService();
