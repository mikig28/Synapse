import cron from 'node-cron';
import UserInterest from '../models/UserInterest';
import { rssNewsAggregationService } from './rssNewsAggregationService';
import { newsRankingService } from './newsRankingService';
import { autoPushNewArticles } from './newsPushService';
import { logger } from '../utils/logger';

interface UserSchedule {
  userId: string;
  intervalId: NodeJS.Timeout;
  refreshInterval: number;
}

class NewsSchedulerService {
  private userSchedules: Map<string, UserSchedule> = new Map();
  private isRunning: boolean = false;

  constructor() {
    // Check for users needing refresh every minute
    this.startMainScheduler();
  }

  /**
   * Start the main scheduler that checks for users needing news refresh
   */
  private startMainScheduler(): void {
    if (this.isRunning) return;

    // Check every minute for users who need news refresh
    cron.schedule('* * * * *', async () => {
      await this.checkAndRefreshNews();
    });

    this.isRunning = true;
    logger.info('📰 News scheduler service started - checking for auto-refresh every minute');
  }

  /**
   * Check all users with auto-fetch enabled and refresh if needed
   */
  private async checkAndRefreshNews(): Promise<void> {
    try {
      // Find all users with auto-fetch enabled
      const usersWithAutoFetch = await UserInterest.find({
        autoFetchEnabled: true
      });

      if (usersWithAutoFetch.length === 0) {
        return;
      }

      const now = new Date();

      for (const userInterest of usersWithAutoFetch) {
        try {
          // Check if it's time to refresh based on lastFetchedAt and refreshInterval
          const lastFetchedAt = userInterest.updatedAt || userInterest.createdAt;
          const intervalMs = userInterest.refreshInterval * 60 * 1000;
          const timeSinceLastFetch = now.getTime() - lastFetchedAt.getTime();

          if (timeSinceLastFetch >= intervalMs) {
            logger.info(
              `🔄 Auto-refreshing news for user ${userInterest.userId} ` +
              `(interval: ${userInterest.refreshInterval} min, ` +
              `last fetch: ${Math.floor(timeSinceLastFetch / 60000)} min ago)`
            );

            await this.refreshNewsForUser(
              userInterest.userId.toString(),
              userInterest.maxArticlesPerFetch
            );
          }
        } catch (error: any) {
          logger.error(
            `Error checking refresh for user ${userInterest.userId}:`,
            error.message
          );
        }
      }
    } catch (error: any) {
      logger.error('Error checking for news refresh:', error.message);
    }
  }

  /**
   * Refresh news for a specific user
   */
  private async refreshNewsForUser(userId: string, limit: number = 50): Promise<void> {
    try {
      // Fetch new articles
      const articles = await rssNewsAggregationService.fetchNewsForUser(userId, {
        forceRefresh: true,
        limit
      });

      if (articles.length > 0) {
        // Rank articles
        const rankedArticles = await newsRankingService.rankArticles(userId, articles);

        // Auto-push articles if enabled
        await autoPushNewArticles(userId, rankedArticles);

        logger.info(`✅ Auto-fetched ${articles.length} articles for user ${userId}`);
      } else {
        logger.info(`ℹ️ No new articles found for user ${userId}`);
      }

      // Update the UserInterest to track last fetch time
      await UserInterest.findOneAndUpdate(
        { userId },
        { updatedAt: new Date() }
      );
    } catch (error: any) {
      logger.error(`Error refreshing news for user ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Manually trigger refresh for a user (called from API)
   */
  public async manualRefreshForUser(userId: string, limit: number = 50): Promise<number> {
    await this.refreshNewsForUser(userId, limit);

    // Update last fetch time
    await UserInterest.findOneAndUpdate(
      { userId },
      { updatedAt: new Date() }
    );

    const userInterest = await UserInterest.findOne({ userId });
    return userInterest?.refreshInterval || 30;
  }

  /**
   * Update user's auto-fetch settings
   */
  public async updateUserSchedule(userId: string): Promise<void> {
    try {
      const userInterest = await UserInterest.findOne({ userId });

      if (!userInterest) {
        logger.warn(`No user interest found for ${userId}`);
        return;
      }

      logger.info(
        `Updated schedule for user ${userId}: ` +
        `autoFetch=${userInterest.autoFetchEnabled}, ` +
        `interval=${userInterest.refreshInterval} min`
      );
    } catch (error: any) {
      logger.error(`Error updating user schedule for ${userId}:`, error.message);
    }
  }

  /**
   * Get scheduler status
   */
  public getStatus(): {
    isRunning: boolean;
    activeUsers: number;
  } {
    return {
      isRunning: this.isRunning,
      activeUsers: this.userSchedules.size
    };
  }

  /**
   * Initialize scheduler on server start
   */
  public async initialize(): Promise<void> {
    try {
      const usersWithAutoFetch = await UserInterest.find({
        autoFetchEnabled: true
      });

      logger.info(
        `📰 News scheduler initialized with ${usersWithAutoFetch.length} users ` +
        `having auto-fetch enabled`
      );
    } catch (error: any) {
      logger.error('Error initializing news scheduler:', error.message);
    }
  }
}

// Create singleton instance
export const newsSchedulerService = new NewsSchedulerService();

// Export class for testing
export { NewsSchedulerService };
