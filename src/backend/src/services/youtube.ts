import axios, { AxiosError } from 'axios';

export interface YouTubeSearchArgs {
  q: string;
  publishedAfter?: string; // ISO
  order?: 'date' | 'rating' | 'relevance' | 'title' | 'videoCount' | 'viewCount';
  maxResults?: number; // 1..50 (API caps at 50)
  safeSearch?: 'moderate' | 'none' | 'strict';
  pageToken?: string;
}

export interface YouTubeSearchItem {
  id: { kind: string; videoId?: string };
  snippet: {
    publishedAt: string;
    channelTitle?: string;
    title: string;
    description?: string;
    thumbnails?: Record<string, { url: string; width?: number; height?: number }>;
  };
}

export interface YouTubeSearchResponse {
  nextPageToken?: string;
  items: YouTubeSearchItem[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isQuotaOrRateLimit(error: unknown): boolean {
  const err = error as AxiosError<any>;
  if (!err || !err.response) return false;
  const status = err.response.status;
  if (status === 403 || status === 429) return true;
  // YouTube may return 400 with specific reason codes under errors[].reason
  const data = err.response.data as any;
  const reason = data?.error?.errors?.[0]?.reason;
  return reason === 'quotaExceeded' || reason === 'rateLimitExceeded' || reason === 'dailyLimitExceeded';
}

export async function searchYouTube(apiKey: string, args: YouTubeSearchArgs, maxRetries = 4): Promise<YouTubeSearchResponse> {
  const params: Record<string, any> = {
    key: apiKey,
    part: 'snippet',
    type: 'video',
    q: args.q,
    publishedAfter: args.publishedAfter,
    order: args.order || 'relevance',
    maxResults: Math.min(Math.max(args.maxResults ?? 20, 1), 50),
    safeSearch: args.safeSearch || 'moderate',
    pageToken: args.pageToken,
  };

  let attempt = 0;
  let backoffMs = 1000; // 1s
  while (true) {
    try {
      const res = await axios.get('https://www.googleapis.com/youtube/v3/search', { params });
      const data = res.data as any;
      const items: YouTubeSearchItem[] = (data.items || []) as YouTubeSearchItem[];
      return {
        nextPageToken: data.nextPageToken,
        items,
      };
    } catch (error) {
      attempt += 1;
      if (isQuotaOrRateLimit(error) && attempt <= maxRetries) {
        await sleep(backoffMs);
        backoffMs = Math.min(backoffMs * 2, 16000);
        continue;
      }
      throw error;
    }
  }
}

export function isLikelyShort(title: string): boolean {
  const t = (title || '').toLowerCase();
  // Heuristic: presence of 'shorts' or very short titles tend to be shorts; extremely rough
  if (t.includes('shorts') || t.includes('#shorts')) return true;
  if (t.length <= 25) return true;
  return false;
}


