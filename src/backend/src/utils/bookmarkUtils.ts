import { processAndCreateBookmark } from '../api/controllers/bookmarksController';

export type SupportedBookmarkPlatform = 'X' | 'LinkedIn' | 'Reddit' | 'Other';
export type BookmarkCaptureSource = 'telegram' | 'whatsapp';

const SOCIAL_MEDIA_PATTERNS: Record<Exclude<SupportedBookmarkPlatform, 'Other'>, RegExp> = {
  X: /https?:\/\/(twitter\.com|x\.com)\/.+\/status\/\d+/i,
  LinkedIn: /https?:\/\/(?:www\.)?linkedin\.com\/(posts|feed\/update|pulse)\//i,
  Reddit: /https?:\/\/(?:www\.)?reddit\.com\/r\//i,
};

const URL_REGEX = /https?:\/\/[^\s<>'"\]]+/gi;

export const extractUrlsFromText = (text?: string): string[] => {
  if (!text) {
    return [];
  }

  const matches = text.match(URL_REGEX);
  if (!matches) {
    return [];
  }

  return matches.map(url => url.trim());
};

export const classifyUrlPlatform = (url: string): SupportedBookmarkPlatform => {
  for (const [platform, pattern] of Object.entries(SOCIAL_MEDIA_PATTERNS)) {
    if (pattern.test(url)) {
      return platform as SupportedBookmarkPlatform;
    }
  }
  return 'Other';
};

interface ProcessUrlsForBookmarksParams {
  userId: string;
  urls?: string[] | null;
  source: BookmarkCaptureSource;
  sourceMessageId?: string;
  logContext?: Record<string, unknown>;
}

export const processUrlsForBookmarks = async ({
  userId,
  urls,
  source,
  sourceMessageId,
  logContext = {},
}: ProcessUrlsForBookmarksParams): Promise<void> => {
  if (!urls || urls.length === 0) {
    return;
  }

  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
  if (uniqueUrls.length === 0) {
    return;
  }

  for (const url of uniqueUrls) {
    const platform = classifyUrlPlatform(url);

    try {
      const contextDetails = {
        source,
        platform,
        url,
        ...logContext,
      };
      console.log('[BookmarkCapture] Processing URL', contextDetails);

      await processAndCreateBookmark(
        userId,
        url,
        platform,
        source === 'telegram' ? sourceMessageId : undefined,
      );
    } catch (error) {
      console.error('[BookmarkCapture] Failed to create bookmark', {
        source,
        platform,
        url,
        ...logContext,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
};
