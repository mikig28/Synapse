import mongoose from 'mongoose';
import KeywordSubscription, { IKeywordSubscription } from '../models/KeywordSubscription';
import Video, { IVideo } from '../models/Video';
import { searchYouTube, isLikelyShort, YouTubeSearchArgs, detectVideoLanguage, shouldFilterByLanguage } from './youtube';
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
    console.log(`[FetchVideos] Processing subscription ${sub._id}: keywords="${sub.keywords.join(' ')}", languageFilter=${JSON.stringify(sub.languageFilter)}`);
    const since = new Date();
    since.setDate(since.getDate() - (sub.freshnessDays || 14));

    // If language filter is set to 'include' mode with languages, add relevanceLanguage hint
    const relevanceLanguage = sub.languageFilter?.mode === 'include' && sub.languageFilter.languages.length > 0
      ? sub.languageFilter.languages[0] // Use first language as relevance hint
      : undefined;

    const args: YouTubeSearchArgs = {
      q: sub.keywords.join(' '),
      publishedAfter: since.toISOString(),
      order: 'date',
      maxResults: Math.min(sub.maxPerFetch || 20, 50),
      safeSearch: 'moderate',
      pageToken: sub.nextPageToken,
      relevanceLanguage,
    };

    let remaining = sub.maxPerFetch || 20;
    let pageToken: string | undefined = sub.nextPageToken;

    let videosProcessed = 0;
    let videosFiltered = 0;
    let subUpserts = 0;
    while (remaining > 0) {
      const res = await searchYouTube(apiKey, { ...args, maxResults: Math.min(remaining, 50), pageToken });
      pageToken = res.nextPageToken;

      for (const item of res.items) {
        videosProcessed++;
        const vid = item.id?.videoId;
        if (!vid) {
          videosFiltered++;
          continue;
        }
        const title = item.snippet?.title || 'Untitled';
        if (!sub.includeShorts && isLikelyShort(title)) {
          videosFiltered++;
          continue;
        }

        // Apply language filter if configured
        if (sub.languageFilter && sub.languageFilter.languages.length > 0) {
          const videoLang = detectVideoLanguage(item.snippet);
          const shouldExclude = shouldFilterByLanguage(
            videoLang,
            sub.languageFilter.mode,
            sub.languageFilter.languages
          );
          if (shouldExclude) {
            console.log(`[FetchVideos] Filtered out video "${title}" (lang: ${videoLang || 'unknown'}, mode: ${sub.languageFilter.mode}, filter: ${sub.languageFilter.languages.join(',')})`);
            videosFiltered++;
            continue;
          } else if (videoLang) {
            console.log(`[FetchVideos] Accepted video "${title}" (lang: ${videoLang}, mode: ${sub.languageFilter.mode})`);
          }
        }

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
          status: 'pending',
        };

        try {
          await Video.updateOne(
            { userId: userObjectId, source: 'youtube', videoId: vid },
            { $setOnInsert: doc, $max: { relevance } },
            { upsert: true }
          );
          totalUpserts += 1;
          subUpserts += 1;
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
    console.log(`[FetchVideos] Subscription ${sub._id} complete: ${videosProcessed} videos processed, ${videosFiltered} filtered out, ${subUpserts} upserted`);
    sub.lastFetchedAt = new Date();
    await sub.save();
  }

  console.log(`[FetchVideos] Total fetched across all subscriptions: ${totalUpserts}`);
  return { fetched: totalUpserts };
}


