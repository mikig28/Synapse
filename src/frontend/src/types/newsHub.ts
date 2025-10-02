export interface RealNewsArticle {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  content?: string;
  url: string;
  urlToImage?: string;
  source: {
    id?: string;
    name: string;
  };
  author?: string;
  publishedAt: string;
  category?: string;
  language: string;
  relevanceScore?: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  isRead: boolean;
  isFavorite: boolean;
  isSaved: boolean;
  readAt?: string;
  savedAt?: string;
  tags?: string[];
  externalId?: string;
  fetchedAt: string;
  contentHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserInterest {
  _id: string;
  userId: string;
  topics: string[];
  keywords: string[];
  sources: string[];
  categories: string[];
  excludeKeywords: string[];
  languages: string[];
  refreshInterval: number;
  autoFetchEnabled: boolean;
  maxArticlesPerFetch: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewsSource {
  id: string;
  name: string;
  category: string;
}

export interface TrendingTopic {
  topic: string;
  count: number;
}

export interface NewsHubStats {
  totalArticles: number;
  unreadArticles: number;
  savedArticles: number;
  favoriteArticles: number;
  last24Hours: number;
}

export interface NewsFeedParams {
  page?: number;
  limit?: number;
  category?: string;
  source?: string;
  isRead?: boolean;
  isSaved?: boolean;
  sortBy?: 'relevance' | 'date' | 'none';
}

export interface NewsFeedResponse {
  success: boolean;
  data: RealNewsArticle[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
