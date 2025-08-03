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
  private searchCache = new Map<string, { data: any; timestamp: number }>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  /**
   * Perform universal search across all content types with caching
   */
  async universalSearch(request: SearchRequest): Promise<UniversalSearchResponse> {
    // Create cache key
    const cacheKey = `search:${JSON.stringify(request)}`;
    
    // Check cache first
    if (this.searchCache.has(cacheKey)) {
      const cached = this.searchCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('[SearchService] Returning cached result for:', request.query);
        return cached.data;
      }
      // Remove expired cache
      this.searchCache.delete(cacheKey);
    }

    try {
      console.log('[SearchService] Performing search:', request);
      const response = await axiosInstance.post(`${this.baseUrl}/universal`, request);
      const data = response.data.data;
      
      // Cache the result
      this.searchCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      // Clean up old cache entries (keep last 50)
      if (this.searchCache.size > 50) {
        const entries = Array.from(this.searchCache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        entries.slice(0, entries.length - 50).forEach(([key]) => {
          this.searchCache.delete(key);
        });
      }
      
      return data;
    } catch (error: any) {
      console.error('Search error:', error);
      throw new Error(error.response?.data?.error || 'Search failed');
    }
  }

  /**
   * Get search suggestions based on partial query with debouncing
   */
  async getSearchSuggestions(query: string, limit: number = 10): Promise<string[]> {
    if (query.length < 2) return [];
    
    const cacheKey = `suggestions:${query.toLowerCase()}:${limit}`;
    
    // Check cache first
    if (this.searchCache.has(cacheKey)) {
      const cached = this.searchCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
      this.searchCache.delete(cacheKey);
    }

    try {
      const response = await axiosInstance.get(`${this.baseUrl}/suggestions`, {
        params: { query, limit }
      });
      const data = response.data.data;
      
      // Cache suggestions
      this.searchCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
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
   * Search with real-time suggestions and optimized performance
   */
  async searchWithSuggestions(query: string, options?: Partial<SearchRequest>): Promise<{
    results: UniversalSearchResponse;
    suggestions: string[];
  }> {
    try {
      const searchRequest: SearchRequest = {
        query,
        limit: 20,
        strategy: 'hybrid',
        ...options
      };

      const [results, suggestions] = await Promise.all([
        this.universalSearch(searchRequest),
        this.getSearchSuggestions(query, 5)
      ]);

      return { results, suggestions };
    } catch (error) {
      console.error('Search with suggestions error:', error);
      throw error;
    }
  }

  /**
   * Clear search cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.searchCache.clear();
    console.log('[SearchService] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.searchCache.size,
      keys: Array.from(this.searchCache.keys())
    };
  }
}

export const searchService = new SearchService();
export default searchService;