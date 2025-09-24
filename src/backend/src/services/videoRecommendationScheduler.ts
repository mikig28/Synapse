import cron from 'node-cron';
import mongoose from 'mongoose';
import KeywordSubscription, { IKeywordSubscription } from '../models/KeywordSubscription';
import { fetchForUser } from './fetchVideos';
import {
  AUTO_FETCH_DEFAULT_INTERVAL_MINUTES,
  clampAutoFetchInterval,
  computeNextAutoFetchRun,
} from '../utils/videoAutoFetch';

interface SchedulerOptions {
  cronExpression?: string;
  concurrency?: number;
}

interface PendingSubscription {
  subscription: IKeywordSubscription;
}

export class VideoRecommendationScheduler {
  private cronTask: cron.ScheduledTask | null = null;
  private isRunning = false;
  private concurrency: number;
  private activeExecutions = 0;
  private queue: PendingSubscription[] = [];

  constructor(private readonly options: SchedulerOptions = {}) {
    this.concurrency = Math.max(1, options.concurrency ?? 2);
  }

  public start() {
    if (this.isRunning) {
      return;
    }
    const cronExpression = this.options.cronExpression ?? '* * * * *'; // every minute
    this.cronTask = cron.schedule(cronExpression, () => {
      void this.tick();
    });
    this.isRunning = true;
    console.log('[VideoScheduler] Started video recommendation scheduler');
  }

  public stop() {
    this.cronTask?.stop();
    this.cronTask = null;
    this.isRunning = false;
    console.log('[VideoScheduler] Stopped video recommendation scheduler');
  }

  private async tick() {
    try {
      const now = new Date();
      const dueSubs = await KeywordSubscription.find({
        autoFetchEnabled: true,
        isActive: true,
        autoFetchNextRunAt: { $lte: now },
      })
        .limit(50)
        .lean();

      if (!dueSubs.length) {
        return;
      }

      const ids = dueSubs.map(sub => sub._id);
      const fetchedSubs = await KeywordSubscription.find({ _id: { $in: ids } });

      for (const sub of fetchedSubs) {
        if (this.activeExecutions >= this.concurrency) {
          this.queue.push({ subscription: sub });
        } else {
          void this.runSubscription(sub);
        }
      }
    } catch (error) {
      console.error('[VideoScheduler] Tick error', error);
    }
  }

  private async dequeue() {
    if (this.queue.length === 0 || this.activeExecutions >= this.concurrency) {
      return;
    }
    const next = this.queue.shift();
    if (!next) {
      return;
    }
    await this.runSubscription(next.subscription);
  }

  private async runSubscription(subscription: IKeywordSubscription) {
    this.activeExecutions += 1;
    try {
      const interval = clampAutoFetchInterval(subscription.autoFetchIntervalMinutes);
      subscription.autoFetchStatus = 'running';
      subscription.autoFetchLastError = undefined;
      subscription.autoFetchLastRunAt = new Date();
      subscription.autoFetchNextRunAt = computeNextAutoFetchRun(interval, subscription.autoFetchLastRunAt, subscription.autoFetchTimezone);
      await subscription.save();

      const userId = (subscription.userId as mongoose.Types.ObjectId).toString();
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) {
        throw new Error('YouTube API key not configured');
      }

      const result = await fetchForUser({
        userId,
        apiKey,
        subscriptionId: (subscription._id as mongoose.Types.ObjectId).toString(),
      });

      subscription.autoFetchStatus = 'success';
      subscription.autoFetchLastFetchedCount = result.fetched;
      subscription.lastFetchedAt = new Date();
      subscription.autoFetchLastRunAt = new Date();
      await subscription.save();

      console.log(
        `[VideoScheduler] Auto-fetch success for subscription ${subscription._id}: ${result.fetched} videos`
      );
    } catch (error) {
      console.error('[VideoScheduler] Auto-fetch error', error);
      subscription.autoFetchStatus = 'error';
      subscription.autoFetchLastError = error instanceof Error ? error.message : 'Unknown error';
      subscription.autoFetchLastRunAt = new Date();
      subscription.autoFetchNextRunAt = computeNextAutoFetchRun(
        clampAutoFetchInterval(subscription.autoFetchIntervalMinutes),
        new Date(Date.now() + 5 * 60 * 1000),
        subscription.autoFetchTimezone
      );
      await subscription.save();
    } finally {
      this.activeExecutions = Math.max(0, this.activeExecutions - 1);
      await this.dequeue();
    }
  }
}

export const videoRecommendationScheduler = new VideoRecommendationScheduler({ concurrency: 2 });
