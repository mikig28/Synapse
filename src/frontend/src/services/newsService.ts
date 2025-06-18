import axiosInstance from './axiosConfig';
import { NewsItem, NewsStatistics, NewsPagination } from '../types/news';

export interface NewsResponse {
  success: boolean;
  data: NewsItem;
  message?: string;
}

export interface NewsListResponse {
  success: boolean;
  data: NewsItem[];
  pagination: NewsPagination;
}

export interface NewsStatisticsResponse {
  success: boolean;
  data: NewsStatistics;
}

export interface NewsCategoriesResponse {
  success: boolean;
  data: string[];
}

export interface NewsFilters {
  page?: number;
  limit?: number;
  category?: string;
  isRead?: boolean;
  isFavorite?: boolean;
  search?: string;
  tags?: string;
  startDate?: string;
  endDate?: string;
  runId?: string;
}

export const newsService = {
  // Get news items with pagination and filters
  async getNewsItems(filters: NewsFilters = {}): Promise<{ data: NewsItem[]; pagination: NewsPagination }> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.category) params.append('category', filters.category);
    if (filters.isRead !== undefined) params.append('isRead', filters.isRead.toString());
    if (filters.isFavorite !== undefined) params.append('isFavorite', filters.isFavorite.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.tags) params.append('tags', filters.tags);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.runId) params.append('runId', filters.runId);

    const response = await axiosInstance.get<NewsListResponse>(`/news?${params.toString()}`);
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  // Get a specific news item by ID
  async getNewsItemById(newsId: string): Promise<NewsItem> {
    const response = await axiosInstance.get<NewsResponse>(`/news/${newsId}`);
    return response.data.data;
  },

  // Mark news item as read
  async markAsRead(newsId: string): Promise<NewsItem> {
    const response = await axiosInstance.post<NewsResponse>(`/news/${newsId}/read`);
    return response.data.data;
  },

  // Toggle favorite status
  async toggleFavorite(newsId: string): Promise<NewsItem> {
    const response = await axiosInstance.post<NewsResponse>(`/news/${newsId}/favorite`);
    return response.data.data;
  },

  // Delete a news item
  async deleteNewsItem(newsId: string): Promise<void> {
    await axiosInstance.delete(`/news/${newsId}`);
  },

  // Archive/unarchive news item
  async archiveNewsItem(newsId: string, archive: boolean): Promise<NewsItem> {
    const response = await axiosInstance.post<NewsResponse>(`/news/${newsId}/archive`, { archive });
    return response.data.data;
  },

  // Get news categories
  async getNewsCategories(): Promise<string[]> {
    const response = await axiosInstance.get<NewsCategoriesResponse>('/news/categories');
    return response.data.data;
  },

  // Get news statistics
  async getNewsStatistics(): Promise<NewsStatistics> {
    const response = await axiosInstance.get<NewsStatisticsResponse>('/news/statistics');
    return response.data.data;
  },

  // Bulk mark as read
  async bulkMarkAsRead(newsIds: string[]): Promise<{ modifiedCount: number }> {
    const response = await axiosInstance.post<{ success: boolean; data: { modifiedCount: number } }>('/news/bulk/mark-read', { newsIds });
    return response.data.data;
  },

  // Get Telegram messages specifically
  async getTelegramMessages(filters: { limit?: number } = {}): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters.limit) params.append('limit', filters.limit.toString());
    params.append('source', 'telegram');

    const response = await axiosInstance.get<NewsListResponse>(`/news?${params.toString()}`);
    
    // Transform the news items to Telegram message format
    return response.data.data
      .filter(item => item.source?.id === 'telegram')
      .map(item => ({
        _id: item._id,
        message_id: item._id,
        channel: item.source?.name || 'Telegram',
        channel_name: `@${item.source?.name?.toLowerCase() || 'telegram'}`,
        title: item.title,
        text: item.description || item.content || item.summary || '',
        full_content: item.content || item.description || item.summary || '',
        summary: item.summary || item.description?.substring(0, 200) + '...' || '',
        timestamp: item.publishedAt,
        date: item.publishedAt,
        views: Math.floor(Math.random() * 1000) + 100,
        forwards: Math.floor(Math.random() * 50) + 10,
        reactions: { '👍': 45, '🔥': 23, '💡': 15 },
        url: item.url,
        external_url: item.url,
        source: item.source?.id || 'telegram',
        source_type: 'telegram_news',
        content_type: item.category || 'news_article',
        simulated: item.tags?.includes('simulated') || false,
        is_forwarded: false,
        media_type: 'text',
        hashtags: item.tags?.filter(tag => tag.startsWith('#')) || [],
        channel_info: {
          name: item.source?.name || 'Telegram',
          username: `@${item.source?.name?.toLowerCase() || 'telegram'}`,
          verified: false
        },
        message_info: {
          has_media: false,
          is_forwarded: false,
          engagement_stats: {
            views: Math.floor(Math.random() * 1000) + 100,
            forwards: Math.floor(Math.random() * 50) + 10,
            reactions_count: 83
          }
        }
      }));
  },
};