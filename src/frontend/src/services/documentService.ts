import axiosInstance from './axiosConfig';

export interface Document {
  _id: string;
  title: string;
  content: string;
  documentType: string;
  summary?: string;
  metadata: {
    category: string;
    tags: string[];
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
    fileSize?: number;
    originalFilename?: string;
    lastProcessedAt?: string;
    processingErrors?: string[];
  };
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  estimatedTokens?: number;
  processingProgress?: number;
  chunks?: any[];
  graphNodes?: any[];
  embeddings?: {
    text: number[];
    semantic: number[];
  };
  sharedWith?: any[];
  versions?: any[];
  currentVersion?: string;
}

export interface DocumentStats {
  totalDocuments: number;
  statusCounts: { _id: string; count: number }[];
  typeCounts: { _id: string; count: number }[];
  vectorDatabase: {
    totalDocuments: number;
    totalChunks: number;
    databaseType: string;
    indexStatus: string;
  };
}

export interface SearchResult {
  answer: string;
  sources: any[];
  confidence: number;
  qualityScore: number;
  iterationCount: number;
  searchStrategy: string;
  suggestions?: string[];
  debugInfo?: any;
}

export interface PaginatedResponse<T> {
  documents: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface DocumentFilters {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  category?: string;
  tags?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateDocumentRequest {
  title: string;
  content: string;
  documentType?: string;
  category?: string;
  tags?: string[];
  chunkingStrategy?: string;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  'metadata.category'?: string;
  'metadata.tags'?: string[];
  comment?: string;
}

export interface SearchRequest {
  query: string;
  strategy?: 'semantic' | 'hybrid' | 'keyword';
  includeDebugInfo?: boolean;
  maxIterations?: number;
  confidenceThreshold?: number;
  filter?: Record<string, any>;
}

class DocumentService {
  private baseUrl = '/documents';

  /**
   * Get all documents with optional filters and pagination
   */
  async getDocuments(filters: DocumentFilters = {}): Promise<PaginatedResponse<Document>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await axiosInstance.get(`${this.baseUrl}?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Get a specific document by ID
   */
  async getDocument(id: string): Promise<Document> {
    const response = await axiosInstance.get(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  /**
   * Create a new document
   */
  async createDocument(document: CreateDocumentRequest): Promise<Document> {
    const response = await axiosInstance.post(this.baseUrl, document);
    return response.data.data;
  }

  /**
   * Update an existing document
   */
  async updateDocument(id: string, updates: UpdateDocumentRequest): Promise<Document> {
    const response = await axiosInstance.put(`${this.baseUrl}/${id}`, updates);
    return response.data.data;
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<void> {
    await axiosInstance.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Upload a document file
   */
  async uploadDocument(
    file: File, 
    metadata: {
      title?: string;
      category?: string;
      chunkingStrategy?: string;
      tags?: string[];
    } = {},
    onProgress?: (progress: number) => void
  ): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (metadata.title) formData.append('title', metadata.title);
    if (metadata.category) formData.append('category', metadata.category);
    if (metadata.chunkingStrategy) formData.append('chunkingStrategy', metadata.chunkingStrategy);
    if (metadata.tags) formData.append('tags', metadata.tags.join(','));

    const response = await axiosInstance.post(`${this.baseUrl}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    
    return response.data.data;
  }


  /**
   * Search documents using AI-powered RAG
   */
  async searchDocuments(searchRequest: SearchRequest): Promise<SearchResult> {
    const response = await axiosInstance.post(`${this.baseUrl}/search`, searchRequest);
    return response.data.data;
  }

  /**
   * Get document processing status
   */
  async getProcessingStatus(id: string): Promise<{
    status: string;
    progress: number;
    errors: string[];
    lastProcessedAt: string;
  }> {
    const response = await axiosInstance.get(`${this.baseUrl}/${id}/processing-status`);
    return response.data.data;
  }

  /**
   * Get similar documents
   */
  async getSimilarDocuments(id: string, limit: number = 5): Promise<any[]> {
    const response = await axiosInstance.get(`${this.baseUrl}/${id}/similar?limit=${limit}`);
    return response.data.data;
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(): Promise<DocumentStats> {
    const response = await axiosInstance.get(`${this.baseUrl}/stats`);
    return response.data.data;
  }

  /**
   * Download document as file
   */
  async downloadDocument(id: string): Promise<void> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/${id}/download`, {
        responseType: 'blob',
      });

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'document.txt';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download link
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading document:', error);
      throw error;
    }
  }

  /**
   * Get document content in various formats
   */
  async exportDocument(id: string, format: 'pdf' | 'markdown' | 'text' = 'text'): Promise<Blob> {
    const response = await axiosInstance.get(`${this.baseUrl}/${id}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Share document with other users
   */
  async shareDocument(
    id: string,
    shareWith: {
      userId: string;
      permissions: 'read' | 'write' | 'admin';
    }[]
  ): Promise<Document> {
    const response = await axiosInstance.post(`${this.baseUrl}/${id}/share`, { shareWith });
    return response.data.data;
  }

  /**
   * Get document version history
   */
  async getDocumentVersions(id: string): Promise<any[]> {
    const response = await axiosInstance.get(`${this.baseUrl}/${id}/versions`);
    return response.data.data;
  }

  /**
   * Restore document to a previous version
   */
  async restoreDocumentVersion(id: string, versionId: string): Promise<Document> {
    const response = await axiosInstance.post(`${this.baseUrl}/${id}/restore`, { versionId });
    return response.data.data;
  }

  /**
   * Get document analytics
   */
  async getDocumentAnalytics(id: string): Promise<{
    views: number;
    searches: number;
    lastAccessed: string;
    popularChunks: any[];
    relatedDocuments: any[];
  }> {
    const response = await axiosInstance.get(`${this.baseUrl}/${id}/analytics`);
    return response.data.data;
  }

  /**
   * Bulk operations
   */
  async bulkDelete(ids: string[]): Promise<void> {
    await axiosInstance.delete(`${this.baseUrl}/bulk`, { data: { ids } });
  }

  async bulkUpdateTags(ids: string[], tags: string[]): Promise<void> {
    await axiosInstance.patch(`${this.baseUrl}/bulk/tags`, { ids, tags });
  }

  async bulkUpdateCategory(ids: string[], category: string): Promise<void> {
    await axiosInstance.patch(`${this.baseUrl}/bulk/category`, { ids, category });
  }

  /**
   * Get document suggestions based on content
   */
  async getDocumentSuggestions(content: string, limit: number = 5): Promise<Document[]> {
    const response = await axiosInstance.post(`${this.baseUrl}/suggestions`, { content, limit });
    return response.data.data;
  }

  /**
   * Generate document summary
   */
  async generateSummary(id: string): Promise<string> {
    const response = await axiosInstance.post(`${this.baseUrl}/${id}/summarize`);
    return response.data.data.summary;
  }

  /**
   * Extract entities from document
   */
  async extractEntities(id: string): Promise<any[]> {
    const response = await axiosInstance.post(`${this.baseUrl}/${id}/extract-entities`);
    return response.data.data;
  }

  /**
   * Get document knowledge graph
   */
  async getKnowledgeGraph(id: string): Promise<{
    nodes: any[];
    edges: any[];
    summary: string;
  }> {
    const response = await axiosInstance.get(`${this.baseUrl}/${id}/knowledge-graph`);
    return response.data.data;
  }

  /**
   * Auto-categorize document
   */
  async autoCategorize(id: string): Promise<{
    category: string;
    confidence: number;
    suggestions: string[];
  }> {
    const response = await axiosInstance.post(`${this.baseUrl}/${id}/auto-categorize`);
    return response.data.data;
  }

  /**
   * Generate document tags
   */
  async generateTags(id: string): Promise<{
    tags: string[];
    confidence: number;
  }> {
    const response = await axiosInstance.post(`${this.baseUrl}/${id}/generate-tags`);
    return response.data.data;
  }

  /**
   * Validate document quality
   */
  async validateDocument(id: string): Promise<{
    score: number;
    issues: string[];
    suggestions: string[];
  }> {
    const response = await axiosInstance.post(`${this.baseUrl}/${id}/validate`);
    return response.data.data;
  }

  /**
   * Get document embeddings
   */
  async getEmbeddings(id: string): Promise<{
    text: number[];
    semantic: number[];
    summary?: number[];
  }> {
    const response = await axiosInstance.get(`${this.baseUrl}/${id}/embeddings`);
    return response.data.data;
  }

  /**
   * Compare documents
   */
  async compareDocuments(id1: string, id2: string): Promise<{
    similarity: number;
    differences: string[];
    commonTopics: string[];
  }> {
    const response = await axiosInstance.post(`${this.baseUrl}/compare`, { id1, id2 });
    return response.data.data;
  }

  /**
   * Get document recommendations
   */
  async getRecommendations(id: string, limit: number = 10): Promise<Document[]> {
    const response = await axiosInstance.get(`${this.baseUrl}/${id}/recommendations?limit=${limit}`);
    return response.data.data;
  }

  /**
   * Provide feedback on search results
   */
  async provideFeedback(
    queryId: string,
    feedback: {
      helpful: boolean;
      accurate: boolean;
      complete: boolean;
      comment?: string;
    }
  ): Promise<void> {
    await axiosInstance.post(`${this.baseUrl}/feedback`, { queryId, feedback });
  }

  /**
   * Get search history
   */
  async getSearchHistory(limit: number = 50): Promise<any[]> {
    const response = await axiosInstance.get(`${this.baseUrl}/search-history?limit=${limit}`);
    return response.data.data;
  }

  /**
   * Clear search history
   */
  async clearSearchHistory(): Promise<void> {
    await axiosInstance.delete(`${this.baseUrl}/search-history`);
  }


  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<{
    vectorDatabase: boolean;
    aiServices: boolean;
    processingQueue: number;
    systemLoad: number;
  }> {
    const response = await axiosInstance.get(`${this.baseUrl}/health`);
    return response.data.data;
  }
}

export const documentService = new DocumentService();
export default documentService;