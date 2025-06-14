export interface NewsItem {
  _id: string;
  userId: string;
  agentId?: string;
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
  language?: string;
  summary?: string;
  tags?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  relevanceScore?: number;
  status: 'pending' | 'summarized' | 'archived' | 'error';
  isRead: boolean;
  isFavorite: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewsStatistics {
  totalItems: number;
  unreadItems: number;
  favoriteItems: number;
  archivedItems: number;
  last24Hours: number;
  last7Days: number;
  readPercentage: number;
}

export interface NewsPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}