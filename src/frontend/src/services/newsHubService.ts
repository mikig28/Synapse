import axios from 'axios';
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Create axios instance with auth token
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1/news-hub`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

class NewsHubService {
  /**
   * Get personalized news feed
   */
  async getNewsFeed(params: NewsFeedParams = {}): Promise<NewsFeedResponse> {
    const response = await api.get<NewsFeedResponse>('/feed', { params });
    return response.data;
  }

  /**
   * Manually refresh news
   */
  async refreshNews(limit: number = 50): Promise<ApiResponse<RealNewsArticle[]>> {
    const response = await api.post<ApiResponse<RealNewsArticle[]>>('/refresh', { limit });
    return response.data;
  }

  /**
   * Get news hub statistics
   */
  async getStats(): Promise<ApiResponse<NewsHubStats>> {
    const response = await api.get<ApiResponse<NewsHubStats>>('/stats');
    return response.data;
  }

  /**
   * Get user interests
   */
  async getUserInterests(): Promise<ApiResponse<UserInterest>> {
    const response = await api.get<ApiResponse<UserInterest>>('/interests');
    return response.data;
  }

  /**
   * Update user interests
   */
  async updateInterests(updates: Partial<UserInterest>): Promise<ApiResponse<UserInterest>> {
    const response = await api.post<ApiResponse<UserInterest>>('/interests', updates);
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
    const response = await api.get<ApiResponse<string[]>>('/interests/suggestions', {
      params: { limit }
    });
    return response.data;
  }

  /**
   * Get trending topics
   */
  async getTrendingTopics(limit: number = 10): Promise<ApiResponse<TrendingTopic[]>> {
    const response = await api.get<ApiResponse<TrendingTopic[]>>('/trending', {
      params: { limit }
    });
    return response.data;
  }

  /**
   * Get available news sources
   */
  async getAvailableSources(): Promise<ApiResponse<NewsSource[]>> {
    const response = await api.get<ApiResponse<NewsSource[]>>('/sources');
    return response.data;
  }

  /**
   * Get available categories
   */
  async getAvailableCategories(): Promise<ApiResponse<string[]>> {
    const response = await api.get<ApiResponse<string[]>>('/categories');
    return response.data;
  }

  /**
   * Mark article as read
   */
  async markAsRead(articleId: string): Promise<ApiResponse<RealNewsArticle>> {
    const response = await api.post<ApiResponse<RealNewsArticle>>(`/articles/${articleId}/read`);
    return response.data;
  }

  /**
   * Toggle article saved status
   */
  async toggleSaved(articleId: string): Promise<ApiResponse<RealNewsArticle>> {
    const response = await api.post<ApiResponse<RealNewsArticle>>(`/articles/${articleId}/save`);
    return response.data;
  }

  /**
   * Toggle article favorite status
   */
  async toggleFavorite(articleId: string): Promise<ApiResponse<RealNewsArticle>> {
    const response = await api.post<ApiResponse<RealNewsArticle>>(`/articles/${articleId}/favorite`);
    return response.data;
  }
}

export const newsHubService = new NewsHubService();
