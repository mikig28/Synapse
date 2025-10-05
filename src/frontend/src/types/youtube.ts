export type VideoModerationStatus = 'pending' | 'approved' | 'hidden';

export interface RecommendationVideo {
  _id: string;
  userId: string;
  source: 'youtube';
  videoId: string;
  subscriptionId?: string;
  title: string;
  channelTitle?: string;
  description?: string;
  thumbnails?: Record<string, { url: string; width?: number; height?: number }>;
  publishedAt?: string;
  relevance?: number;
  status: VideoModerationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LanguageFilter {
  mode: 'include' | 'exclude';
  languages: string[]; // ISO 639-1 language codes
}

export interface KeywordSubscription {
  _id: string;
  userId: string;
  keywords: string[];
  includeShorts: boolean;
  freshnessDays: number;
  maxPerFetch: number;
  isActive: boolean;
  lastFetchedAt?: string;
  nextPageToken?: string;
  autoFetchEnabled: boolean;
  autoFetchIntervalMinutes?: number;
  autoFetchNextRunAt?: string;
  autoFetchLastRunAt?: string;
  autoFetchStatus?: 'idle' | 'running' | 'success' | 'error';
  autoFetchLastError?: string;
  autoFetchLastFetchedCount?: number;
  autoFetchTimezone?: string;
  languageFilter?: LanguageFilter;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedRecommendations {
  items: RecommendationVideo[];
  total: number;
  page: number;
  pageSize: number;
}


