import axiosInstance from './axiosConfig';

export interface SearchResult {
  id: string;
  type: 'document' | 'note' | 'bookmark' | 'task' | 'idea' | 'video' | 'news' | 'whatsapp' | 'telegram' | 'meeting';
  title: string;
  content: string;
  excerpt: string;
  score: number;
  createdAt: string;
  metadata?: any;
}

export interface UniversalSearchResponse {
  query: string;
  totalResults: number;
  results: SearchResult[];
  resultsByType: Record<string, number>;
  searchTime: number;
  strategy: string;
}

export interface SearchRequest {
  query: string;
  strategy?: 'hybrid' | 'semantic' | 'keyword';
  limit?: number;
  offset?: number;
  contentTypes?: string[];
  includeDebugInfo?: boolean;
}

export interface SearchStats {
  totalSearchableItems: number;
  byType: Record<string, number>;
}

class SearchService {
  private baseUrl = '/api/v1/search';

  /**
   * Perform universal search across all content types
   */
  async universalSearch(request: SearchRequest): Promise<UniversalSearchResponse> {
    try {
      const response = await axiosInstance.post(`${this.baseUrl}/universal`, request);
      return response.data.data;
    } catch (error: any) {
      console.error('Search error:', error);
      throw new Error(error.response?.data?.error || 'Search failed');
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(query: string, limit: number = 10): Promise<string[]> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/suggestions`, {
        params: { query, limit }
      });
      return response.data.data;
    } catch (error: any) {
      console.error('Search suggestions error:', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Get search statistics for the user
   */
  async getSearchStats(): Promise<SearchStats> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/stats`);
      return response.data.data;
    } catch (error: any) {
      console.error('Search stats error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get search stats');
    }
  }

  /**
   * Quick search for specific content type
   */
  async quickSearch(query: string, contentType: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      const response = await this.universalSearch({
        query,
        contentTypes: [contentType],
        limit,
        strategy: 'hybrid'
      });
      return response.results;
    } catch (error) {
      console.error(`Quick search error for ${contentType}:`, error);
      return [];
    }
  }

  /**
   * Search with real-time suggestions
   */
  async searchWithSuggestions(query: string): Promise<{
    results: UniversalSearchResponse;
    suggestions: string[];
  }> {
    try {
      const [results, suggestions] = await Promise.all([
        this.universalSearch({ query, limit: 20 }),
        this.getSearchSuggestions(query, 5)
      ]);

      return { results, suggestions };
    } catch (error) {
      console.error('Search with suggestions error:', error);
      throw error;
    }
  }
}

export const searchService = new SearchService();
export default searchService;