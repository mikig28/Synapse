import mongoose from 'mongoose';
import KeywordSubscription, { IKeywordSubscription } from '../models/KeywordSubscription';
import Video, { IVideo } from '../models/Video';
import { searchYouTube, isLikelyShort, YouTubeSearchArgs } from './youtube';
import { scoreRelevance } from './relevance';

export interface FetchForUserArgs {
  userId: string;
  apiKey: string;
  subscriptionId?: string;
}

export async function fetchForUser({ userId, apiKey, subscriptionId }: FetchForUserArgs) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const subFilter: any = { userId: userObjectId, isActive: true };
  if (subscriptionId) {
    if (!mongoose.Types.ObjectId.isValid(subscriptionId)) return { fetched: 0 };
    subFilter._id = new mongoose.Types.ObjectId(subscriptionId);
  }

  const subs: IKeywordSubscription[] = await KeywordSubscription.find(subFilter);
  let totalUpserts = 0;

  for (const sub of subs) {
    const since = new Date();
    since.setDate(since.getDate() - (sub.freshnessDays || 14));

    const args: YouTubeSearchArgs = {
      q: sub.keywords.join(' '),
      publishedAfter: since.toISOString(),
      order: 'date',
      maxResults: Math.min(sub.maxPerFetch || 20, 50),
      safeSearch: 'moderate',
      pageToken: sub.nextPageToken,
    };

    let remaining = sub.maxPerFetch || 20;
    let pageToken: string | undefined = sub.nextPageToken;

    while (remaining > 0) {
      const res = await searchYouTube(apiKey, { ...args, maxResults: Math.min(remaining, 50), pageToken });
      pageToken = res.nextPageToken;

      for (const item of res.items) {
        const vid = item.id?.videoId;
        if (!vid) continue;
        const title = item.snippet?.title || 'Untitled';
        if (!sub.includeShorts && isLikelyShort(title)) continue;

        const description = item.snippet?.description || '';
        const text = `${title}\n${description}`;
        const relevance = scoreRelevance(text, sub.keywords);

        const doc: Partial<IVideo> = {
          userId: userObjectId,
          source: 'youtube',
          videoId: vid,
          subscriptionId: new mongoose.Types.ObjectId(sub._id as any),
          title,
          channelTitle: item.snippet?.channelTitle,
          description,
          thumbnails: item.snippet?.thumbnails as any,
          publishedAt: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt) : undefined,
          relevance,
          status: 'pending',
        };

        try {
          await Video.updateOne(
            { userId: userObjectId, source: 'youtube', videoId: vid },
            { $setOnInsert: doc, $max: { relevance } },
            { upsert: true }
          );
          totalUpserts += 1;
        } catch (e: any) {
          // Ignore duplicates due to unique index
          if (e && e.code === 11000) continue;
          throw e;
        }
      }

      remaining -= res.items.length;
      if (!pageToken) break;
    }

    // Optionally persist page token for next run (nice-to-have)
    if (pageToken && (!sub.nextPageToken || sub.nextPageToken !== pageToken)) {
      sub.nextPageToken = pageToken;
    }
    sub.lastFetchedAt = new Date();
    await sub.save();
  }

  return { fetched: totalUpserts };
}


