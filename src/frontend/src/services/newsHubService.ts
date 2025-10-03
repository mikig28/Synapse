import axiosInstance from './axiosConfig';
import type {
  RealNewsArticle,
  UserInterest,
  NewsSource,
  TrendingTopic,
  NewsHubStats,
  NewsFeedParams,
  NewsFeedResponse,
  ApiResponse
} from '../types/newsHub';

// Use the configured axios instance which already handles authentication
const api = axiosInstance;

class NewsHubService {
  /**
   * Get personalized news feed
   */
  async getNewsFeed(params: NewsFeedParams = {}): Promise<NewsFeedResponse> {
    const response = await api.get<NewsFeedResponse>('/news-hub/feed', { params });
    return response.data;
  }

  /**
   * Manually refresh news
   */
  async refreshNews(limit: number = 50): Promise<ApiResponse<RealNewsArticle[]>> {
    const response = await api.post<ApiResponse<RealNewsArticle[]>>('/news-hub/refresh', { limit });
    return response.data;
  }

  /**
   * Get news hub statistics
   */
  async getStats(): Promise<ApiResponse<NewsHubStats>> {
    const response = await api.get<ApiResponse<NewsHubStats>>('/news-hub/stats');
    return response.data;
  }

  /**
   * Get user interests
   */
  async getUserInterests(): Promise<ApiResponse<UserInterest>> {
    const response = await api.get<ApiResponse<UserInterest>>('/news-hub/interests');
    return response.data;
  }

  /**
   * Update user interests
   */
  async updateInterests(updates: Partial<UserInterest>): Promise<ApiResponse<UserInterest>> {
    const response = await api.post<ApiResponse<UserInterest>>('/news-hub/interests', updates);
    return response.data;
  }

  /**
   * Update user interests (alias for backwards compatibility)
   */
  async updateUserInterests(updates: Partial<UserInterest>): Promise<ApiResponse<UserInterest>> {
    return this.updateInterests(updates);
  }

  /**
   * Get suggested topics based on reading history
   */
  async getSuggestedTopics(limit: number = 10): Promise<ApiResponse<string[]>> {
    const response = await api.get<ApiResponse<string[]>>('/news-hub/interests/suggestions', {
      params: { limit }
    });
    return response.data;
  }

  /**
   * Get trending topics
   */
  async getTrendingTopics(limit: number = 10): Promise<ApiResponse<TrendingTopic[]>> {
    const response = await api.get<ApiResponse<TrendingTopic[]>>('/news-hub/trending', {
      params: { limit }
    });
    return response.data;
  }

  /**
   * Get available news sources
   */
  async getAvailableSources(): Promise<ApiResponse<NewsSource[]>> {
    const response = await api.get<ApiResponse<NewsSource[]>>('/news-hub/sources');
    return response.data;
  }

  /**
   * Get available categories
   */
  async getAvailableCategories(): Promise<ApiResponse<string[]>> {
    const response = await api.get<ApiResponse<string[]>>('/news-hub/categories');
    return response.data;
  }

  /**
   * Mark article as read
   */
  async markAsRead(articleId: string): Promise<ApiResponse<RealNewsArticle>> {
    const response = await api.post<ApiResponse<RealNewsArticle>>(`/news-hub/articles/${articleId}/read`);
    return response.data;
  }

  /**
   * Toggle article saved status
   */
  async toggleSaved(articleId: string): Promise<ApiResponse<RealNewsArticle>> {
    const response = await api.post<ApiResponse<RealNewsArticle>>(`/news-hub/articles/${articleId}/save`);
    return response.data;
  }

  /**
   * Toggle article favorite status
   */
  async toggleFavorite(articleId: string): Promise<ApiResponse<RealNewsArticle>> {
    const response = await api.post<ApiResponse<RealNewsArticle>>(`/news-hub/articles/${articleId}/favorite`);
    return response.data;
  }

  /**
   * Push article to Telegram bot
   */
  async pushToTelegram(articleId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>(`/news-hub/articles/${articleId}/push/telegram`);
    return response.data;
  }

  /**
   * Push article to WhatsApp group
   */
  async pushToWhatsApp(articleId: string, groupId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>(`/news-hub/articles/${articleId}/push/whatsapp`, { groupId });
    return response.data;
  }
}

export const newsHubService = new NewsHubService();
