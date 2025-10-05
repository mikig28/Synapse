import axios, { AxiosError } from 'axios';

export interface YouTubeSearchArgs {
  q: string;
  publishedAfter?: string; // ISO
  order?: 'date' | 'rating' | 'relevance' | 'title' | 'videoCount' | 'viewCount';
  maxResults?: number; // 1..50 (API caps at 50)
  safeSearch?: 'moderate' | 'none' | 'strict';
  pageToken?: string;
  relevanceLanguage?: string; // ISO 639-1 language code for relevance
}

export interface YouTubeSearchItem {
  id: { kind: string; videoId?: string };
  snippet: {
    publishedAt: string;
    channelTitle?: string;
    title: string;
    description?: string;
    thumbnails?: Record<string, { url: string; width?: number; height?: number }>;
    defaultAudioLanguage?: string; // ISO 639-1 language code
    defaultLanguage?: string; // ISO 639-1 language code
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
    relevanceLanguage: args.relevanceLanguage, // Adds language preference to search
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

/**
 * Detect video language from YouTube snippet data
 * Returns ISO 639-1 language code or undefined if not detectable
 */
export function detectVideoLanguage(snippet: YouTubeSearchItem['snippet']): string | undefined {
  // Try defaultAudioLanguage first (most reliable)
  if (snippet.defaultAudioLanguage) {
    return snippet.defaultAudioLanguage.toLowerCase();
  }
  // Fallback to defaultLanguage
  if (snippet.defaultLanguage) {
    return snippet.defaultLanguage.toLowerCase();
  }
  return undefined;
}

/**
 * Check if video should be filtered based on language settings
 * @param videoLang - Detected video language (undefined if not detected)
 * @param filterMode - 'include' or 'exclude'
 * @param filterLangs - Array of language codes to filter
 * @returns true if video should be EXCLUDED, false if it should be INCLUDED
 */
export function shouldFilterByLanguage(
  videoLang: string | undefined,
  filterMode: 'include' | 'exclude',
  filterLangs: string[]
): boolean {
  if (!filterLangs || filterLangs.length === 0) {
    return false; // No filter, include all
  }

  // If video language is not detected, we can't filter
  // In 'include' mode: exclude unknown languages (conservative approach)
  // In 'exclude' mode: include unknown languages (allow unknown)
  if (!videoLang) {
    return filterMode === 'include'; // Exclude if mode is 'include', include if mode is 'exclude'
  }

  const normalizedLang = videoLang.toLowerCase();
  const normalizedFilterLangs = filterLangs.map(l => l.toLowerCase());
  const isInFilterList = normalizedFilterLangs.includes(normalizedLang);

  if (filterMode === 'include') {
    // Include mode: exclude if NOT in the list
    return !isInFilterList;
  } else {
    // Exclude mode: exclude if IN the list
    return isInFilterList;
  }
}


