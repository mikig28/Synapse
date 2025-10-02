import RealNewsArticle, { IRealNewsArticle } from '../models/RealNewsArticle';
import UserInterest, { IUserInterest } from '../models/UserInterest';
import { vectorDatabaseService } from './vectorDatabaseService';
import { logger } from '../utils/logger';

export class NewsRankingService {
  /**
   * Calculate relevance scores for articles based on user interests
   */
  async rankArticles(userId: string, articles: IRealNewsArticle[]): Promise<IRealNewsArticle[]> {
    try {
      const userInterest = await UserInterest.findOne({ userId });

      if (!userInterest || articles.length === 0) {
        return articles;
      }

      // Calculate scores for each article
      const scoredArticles = await Promise.all(
        articles.map(async (article) => {
          const score = await this.calculateRelevanceScore(article, userInterest);
          article.relevanceScore = score;
          await article.save();
          return article;
        })
      );

      // Sort by relevance score (highest first) and recency
      return scoredArticles.sort((a, b) => {
        // Primary sort: relevance score
        const scoreDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
        if (Math.abs(scoreDiff) > 0.1) return scoreDiff;

        // Secondary sort: recency
        return b.publishedAt.getTime() - a.publishedAt.getTime();
      });
    } catch (error) {
      logger.error('Error ranking articles:', error);
      return articles;
    }
  }

  /**
   * Calculate relevance score for a single article
   */
  private async calculateRelevanceScore(
    article: IRealNewsArticle,
    userInterest: IUserInterest
  ): Promise<number> {
    let score = 0;
    let factors = 0;

    // Factor 1: Keyword matching (40% weight)
    const keywordScore = this.calculateKeywordScore(article, userInterest);
    score += keywordScore * 0.4;
    factors++;

    // Factor 2: Topic matching (30% weight)
    const topicScore = this.calculateTopicScore(article, userInterest);
    score += topicScore * 0.3;
    factors++;

    // Factor 3: Source preference (10% weight)
    const sourceScore = this.calculateSourceScore(article, userInterest);
    score += sourceScore * 0.1;
    factors++;

    // Factor 4: Freshness (20% weight)
    const freshnessScore = this.calculateFreshnessScore(article);
    score += freshnessScore * 0.2;
    factors++;

    // Factor 5: Negative keywords penalty
    const hasNegativeKeywords = this.hasExcludedKeywords(article, userInterest);
    if (hasNegativeKeywords) {
      score *= 0.5; // 50% penalty
    }

    // Normalize to 0-1
    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Calculate keyword matching score
   */
  private calculateKeywordScore(
    article: IRealNewsArticle,
    userInterest: IUserInterest
  ): number {
    if (userInterest.keywords.length === 0) return 0.5; // Neutral score

    const text = `${article.title} ${article.description || ''} ${article.content || ''}`.toLowerCase();
    const matches = userInterest.keywords.filter(keyword =>
      text.includes(keyword.toLowerCase())
    );

    return Math.min(matches.length / Math.max(userInterest.keywords.length, 1), 1);
  }

  /**
   * Calculate topic matching score
   */
  private calculateTopicScore(
    article: IRealNewsArticle,
    userInterest: IUserInterest
  ): number {
    if (userInterest.topics.length === 0) return 0.5; // Neutral score

    const text = `${article.title} ${article.description || ''} ${article.category || ''}`.toLowerCase();
    const matches = userInterest.topics.filter(topic =>
      text.includes(topic.toLowerCase())
    );

    return Math.min(matches.length / Math.max(userInterest.topics.length, 1), 1);
  }

  /**
   * Calculate source preference score
   */
  private calculateSourceScore(
    article: IRealNewsArticle,
    userInterest: IUserInterest
  ): number {
    if (userInterest.sources.length === 0) return 1; // No preference, full score

    const sourceId = article.source.id || article.source.name.toLowerCase().replace(/\s+/g, '-');
    const isPreferred = userInterest.sources.some(source =>
      sourceId.includes(source.toLowerCase())
    );

    return isPreferred ? 1 : 0.3; // Preferred sources get full score, others get 30%
  }

  /**
   * Calculate freshness score (newer is better)
   */
  private calculateFreshnessScore(article: IRealNewsArticle): number {
    const now = new Date();
    const articleAge = now.getTime() - article.publishedAt.getTime();
    const dayInMs = 24 * 60 * 60 * 1000;

    // Exponential decay: score decreases over time
    // Articles from today: 1.0
    // Articles from 1 day ago: ~0.75
    // Articles from 3 days ago: ~0.5
    // Articles from 7 days ago: ~0.25
    const ageInDays = articleAge / dayInMs;
    return Math.exp(-ageInDays / 3); // Decay constant: 3 days
  }

  /**
   * Check if article contains excluded keywords
   */
  private hasExcludedKeywords(
    article: IRealNewsArticle,
    userInterest: IUserInterest
  ): boolean {
    if (userInterest.excludeKeywords.length === 0) return false;

    const text = `${article.title} ${article.description || ''} ${article.content || ''}`.toLowerCase();
    return userInterest.excludeKeywords.some(keyword =>
      text.includes(keyword.toLowerCase())
    );
  }

  /**
   * Calculate semantic similarity using embeddings (advanced ranking)
   */
  async calculateSemanticSimilarity(
    article: IRealNewsArticle,
    userInterest: IUserInterest
  ): Promise<number> {
    try {
      // Create article text
      const articleText = `${article.title}. ${article.description || ''}`;

      // Create user interest text
      const interestText = [
        ...userInterest.topics,
        ...userInterest.keywords
      ].join(', ');

      // Get embeddings
      const [articleEmbedding, interestEmbedding] = await Promise.all([
        vectorDatabaseService.generateEmbedding(articleText),
        vectorDatabaseService.generateEmbedding(interestText)
      ]);

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(articleEmbedding, interestEmbedding);

      return similarity;
    } catch (error) {
      logger.error('Error calculating semantic similarity:', error);
      return 0.5; // Default neutral score
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Get trending topics from recent articles
   */
  async getTrendingTopics(userId: string, limit: number = 10): Promise<Array<{ topic: string; count: number }>> {
    try {
      const recentArticles = await RealNewsArticle.find({
        userId,
        publishedAt: { $gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } // Last 3 days
      });

      // Extract topics from titles and descriptions
      const topicCounts = new Map<string, number>();

      for (const article of recentArticles) {
        const text = `${article.title} ${article.description || ''}`.toLowerCase();
        const words = text.split(/\W+/).filter(word => word.length > 4);

        for (const word of words) {
          topicCounts.set(word, (topicCounts.get(word) || 0) + 1);
        }
      }

      // Sort by count and return top topics
      return Array.from(topicCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([topic, count]) => ({ topic, count }));
    } catch (error) {
      logger.error('Error getting trending topics:', error);
      return [];
    }
  }
}

export const newsRankingService = new NewsRankingService();
