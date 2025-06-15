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
};