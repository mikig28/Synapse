/**
 * Cost-Efficient Vector Database Service with Multi-Provider Embedding Support
 * 
 * Supports the following embedding providers (in order of cost-effectiveness):
 * 1. Voyage AI - $0.02/1M tokens (voyage-3-lite, 512-dim) - Best cost/performance ratio
 * 2. Gemini - $0.15/1M tokens (gemini-embedding-001, 768-dim) - Stable GA model
 * 3. OpenAI - $0.02/1M tokens (text-embedding-3-small) - Fallback option
 * 
 * Required Environment Variables:
 * - EMBEDDING_PROVIDER: Primary provider ('voyage' | 'gemini' | 'openai')
 * - EMBEDDING_FALLBACK_PROVIDERS: Comma-separated fallback providers
 * - VOYAGE_API_KEY: Voyage AI API key (get from https://www.voyageai.com/)
 * - GEMINI_API_KEY: Google Gemini API key (get from Google AI Studio)
 * - OPENAI_API_KEY: OpenAI API key (get from https://platform.openai.com/)
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { ChromaClient, OpenAIEmbeddingFunction } from 'chromadb';
import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { ISmartChunk } from '../models/Document';
import mongoose from 'mongoose';
import axios from 'axios';

// Embedding provider types
type EmbeddingProvider = 'voyage' | 'gemini' | 'openai';

// API Response types
interface VoyageEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    total_tokens: number;
  };
}

interface GeminiEmbeddingResponse {
  embedding: {
    values: number[];
  };
}

// Vector database configuration
interface VectorConfig {
  useProduction: boolean;
  pineconeApiKey?: string;
  pineconeIndexName?: string;
  chromaUrl?: string;
  embeddingProvider: EmbeddingProvider;
  fallbackProviders: EmbeddingProvider[];
  dimensionality: number;
  // Provider-specific configurations
  voyageApiKey?: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
}

interface VectorDocument {
  id: string;
  userId: string;
  documentId: string;
  chunkId?: string;
  content: string;
  metadata: {
    documentType: string;
    chunkType?: string;
    title?: string;
    tags?: string[];
    createdAt: Date;
    [key: string]: any;
  };
  embedding: number[];
}

export interface SearchResult {
  id: string;
  score: number;
  content: string;
  metadata: any;
  documentId: string;
  chunkId?: string;
}

export interface SearchOptions {
  topK?: number;
  minScore?: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
  userId?: string;
}

export class VectorDatabaseService {
  private pinecone: Pinecone | null = null;
  private chroma: ChromaClient | null = null;
  private openai: OpenAI;
  private config: VectorConfig;
  private embeddingFunction: OpenAIEmbeddingFunction | null = null;
  
  constructor() {
    const primaryProvider = (process.env.EMBEDDING_PROVIDER as EmbeddingProvider) || 'voyage';
    const fallbackProviders = (process.env.EMBEDDING_FALLBACK_PROVIDERS || 'gemini,openai').split(',') as EmbeddingProvider[];
    
    this.config = {
      useProduction: process.env.NODE_ENV === 'production',
      pineconeApiKey: process.env.PINECONE_API_KEY,
      pineconeIndexName: process.env.PINECONE_INDEX_NAME || 'synapse-docs',
      chromaUrl: process.env.CHROMA_URL || 'http://localhost:8000',
      embeddingProvider: primaryProvider,
      fallbackProviders: fallbackProviders,
      dimensionality: this.getDimensionalityForProvider(primaryProvider),
      voyageApiKey: process.env.VOYAGE_API_KEY,
      geminiApiKey: process.env.GEMINI_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
    };
    
    // Initialize OpenAI (still needed for fallback and some operations)
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    console.log(`[VectorDB]: Initialized with primary provider: ${primaryProvider}, fallbacks: ${fallbackProviders.join(', ')}`);
    this.initializeVectorDatabases();
  }
  
  private getDimensionalityForProvider(provider: EmbeddingProvider): number {
    switch (provider) {
      case 'voyage':
        return 512; // voyage-3-lite actually produces 512 dimensions, not 1024
      case 'gemini':
        return 768; // Using recommended truncated dimension for optimal quality
      case 'openai':
      default:
        return 1536; // OpenAI text-embedding-3-small: 1536 dimensions
    }
  }
  
  private async initializeVectorDatabases(): Promise<void> {
    try {
      // Initialize Pinecone for production
      if (this.config.useProduction && this.config.pineconeApiKey) {
        console.log('[VectorDB]: Initializing Pinecone for production...');
        try {
          this.pinecone = new Pinecone({
            apiKey: this.config.pineconeApiKey,
          });
          
          // Verify/create index
          await this.initializePineconeIndex();
          console.log('[VectorDB]: Pinecone initialized successfully');
        } catch (pineconeError) {
          console.warn('[VectorDB]: Failed to initialize Pinecone:', pineconeError);
          this.pinecone = null;
        }
      } else {
        console.log('[VectorDB]: Pinecone not configured - missing API key or not in production mode');
      }
      
      // Initialize Chroma for development/testing (only if not in production)
      if (!this.config.useProduction) {
        try {
          console.log('[VectorDB]: Initializing Chroma for development...');
          this.chroma = new ChromaClient({
            path: this.config.chromaUrl,
          });
          
          // Test connection with timeout
          const heartbeatPromise = this.chroma.heartbeat();
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('ChromaDB heartbeat timeout')), 10000)
          );
          
          await Promise.race([heartbeatPromise, timeoutPromise]);
          
          // Initialize OpenAI embedding function for Chroma if OpenAI key is available
          if (process.env.OPENAI_API_KEY) {
            this.embeddingFunction = new OpenAIEmbeddingFunction({
              openai_api_key: process.env.OPENAI_API_KEY,
              openai_model: 'text-embedding-3-small',
            });
            console.log('[VectorDB]: ChromaDB with OpenAI embeddings initialized successfully');
          } else {
            console.warn('[VectorDB]: ChromaDB initialized but OpenAI API key missing for embeddings');
          }
        } catch (chromaError) {
          console.warn('[VectorDB]: Failed to initialize ChromaDB (expected in production):', chromaError);
          this.chroma = null;
          this.embeddingFunction = null;
        }
      } else {
        console.log('[VectorDB]: Skipping ChromaDB initialization in production mode');
      }
      
      // Check if any vector database is available
      if (!this.pinecone && !this.chroma) {
        console.warn('[VectorDB]: No vector databases available - search functionality will be limited');
      } else {
        console.log('[VectorDB]: Vector databases initialized with available providers');
      }
    } catch (error) {
      console.error('[VectorDB]: Error during vector database initialization:', error);
      // Don't throw error - allow service to continue with limited functionality
    }
  }
  
  private async initializePineconeIndex(): Promise<void> {
    if (!this.pinecone || !this.config.pineconeIndexName) return;
    
    try {
      const existingIndexes = await this.pinecone.listIndexes();
      const existingIndex = existingIndexes.indexes?.find(
        index => index.name === this.config.pineconeIndexName
      );
      
      if (!existingIndex) {
        console.log(`[VectorDB]: Creating Pinecone index: ${this.config.pineconeIndexName}`);
        await this.pinecone.createIndex({
          name: this.config.pineconeIndexName,
          dimension: this.config.dimensionality,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1',
            },
          },
        });
        
        // Wait for index to be ready
        await new Promise(resolve => setTimeout(resolve, 10000));
      } else {
        // Check if existing index has the right dimensions
        const indexDimension = existingIndex.dimension;
        const expectedDimension = this.config.dimensionality;
        
        if (indexDimension !== expectedDimension) {
          console.warn(`[VectorDB]: Dimension mismatch! Index has ${indexDimension} dimensions but embedding provider ${this.config.embeddingProvider} produces ${expectedDimension} dimensions`);
          console.warn(`[VectorDB]: Consider either:`);
          console.warn(`[VectorDB]: 1. Recreating the index with correct dimensions`);
          console.warn(`[VectorDB]: 2. Switching to an embedding provider that matches the index dimensions`);
          
          // Suggest provider that matches existing index
          if (indexDimension === 1536) {
            console.warn(`[VectorDB]: Suggestion: Use EMBEDDING_PROVIDER=openai to match existing index`);
          } else if (indexDimension === 768) {
            console.warn(`[VectorDB]: Suggestion: Use EMBEDDING_PROVIDER=gemini to match existing index`);
          } else if (indexDimension === 512) {
            console.warn(`[VectorDB]: Suggestion: Use EMBEDDING_PROVIDER=voyage to match existing index`);
          }
          
          throw new Error(`Pinecone index dimension mismatch: expected ${expectedDimension}, got ${indexDimension}. Please fix configuration or recreate index.`);
        }
      }
      
      console.log(`[VectorDB]: Pinecone index ${this.config.pineconeIndexName} is ready with ${this.config.dimensionality} dimensions`);
    } catch (error) {
      console.error('[VectorDB]: Error initializing Pinecone index:', error);
      throw error;
    }
  }
  
  /**
   * Truncate text to fit within token limits
   * Rough estimation: 1 token ≈ 4 characters for English text
   */
  private truncateTextForEmbedding(text: string, maxTokens: number = 8000): string {
    const maxChars = maxTokens * 4; // Rough approximation
    
    if (text.length <= maxChars) {
      return text;
    }
    
    // Truncate and add ellipsis, but try to end at a word boundary
    const truncated = text.substring(0, maxChars);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > maxChars * 0.8) { // If we can find a space in the last 20%
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  }

  /**
   * Generate embeddings for text content using the configured provider with fallback
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const providers = [this.config.embeddingProvider, ...this.config.fallbackProviders];
    
    for (const provider of providers) {
      try {
        console.log(`[VectorDB]: Attempting embedding with provider: ${provider}`);
        const embedding = await this.generateEmbeddingWithProvider(text, provider);
        console.log(`[VectorDB]: Successfully generated embedding with ${provider} (${embedding.length} dimensions)`);
        return embedding;
      } catch (error) {
        console.error(`[VectorDB]: ${provider} embedding failed:`, error instanceof Error ? error.message : String(error));
        if (provider === providers[providers.length - 1]) {
          // Last provider failed, re-throw the error
          throw error;
        }
        console.log(`[VectorDB]: Falling back to next provider...`);
      }
    }
    
    throw new Error('All embedding providers failed');
  }

  /**
   * Generate embeddings using a specific provider with rate limiting
   */
  private async generateEmbeddingWithProvider(text: string, provider: EmbeddingProvider): Promise<number[]> {
    // Add small delay for all providers to prevent overwhelming APIs
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Truncate text based on provider limits
    const truncatedText = this.truncateTextForProvider(text, provider);
    
    if (truncatedText.length < text.length) {
      console.log(`[VectorDB]: Truncated text from ${text.length} to ${truncatedText.length} characters for ${provider}`);
    }

    switch (provider) {
      case 'voyage':
        return await this.generateVoyageEmbedding(truncatedText);
      case 'gemini':
        return await this.generateGeminiEmbedding(truncatedText);
      case 'openai':
        return await this.generateOpenAIEmbedding(truncatedText);
      default:
        throw new Error(`Unsupported embedding provider: ${provider}`);
    }
  }

  /**
   * Voyage AI embedding generation with rate limiting and retry logic
   */
  private async generateVoyageEmbedding(text: string, retryCount = 0): Promise<number[]> {
    if (!this.config.voyageApiKey) {
      throw new Error('Voyage AI API key not configured');
    }

    try {
      // Add small delay to prevent rate limiting
      if (retryCount > 0) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
        console.log(`[VectorDB]: Retrying Voyage AI request after ${delay}ms delay (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await axios.post<VoyageEmbeddingResponse>(
        'https://api.voyageai.com/v1/embeddings',
        {
          input: [text],
          model: 'voyage-3-lite', // Most cost-effective model
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.voyageApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      if (!response.data?.data?.[0]?.embedding) {
        throw new Error('Invalid response from Voyage AI API');
      }

      return response.data.data[0].embedding;
      
    } catch (error: any) {
      // Handle rate limiting with retry
      if (error.response?.status === 429 && retryCount < 3) {
        console.log(`[VectorDB]: Rate limited by Voyage AI (429), retrying in exponential backoff...`);
        return this.generateVoyageEmbedding(text, retryCount + 1);
      }
      
      // Log rate limit details if available
      if (error.response?.status === 429) {
        const resetTime = error.response.headers['x-ratelimit-reset'];
        const remaining = error.response.headers['x-ratelimit-remaining'];
        console.error(`[VectorDB]: Voyage AI rate limit exceeded. Remaining: ${remaining}, Reset: ${resetTime}`);
      }
      
      throw error;
    }
  }

  /**
   * Google Gemini embedding generation (using stable GA model gemini-embedding-001)
   */
  private async generateGeminiEmbedding(text: string): Promise<number[]> {
    if (!this.config.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const response = await axios.post<GeminiEmbeddingResponse>(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${this.config.geminiApiKey}`,
      {
        content: {
          parts: [{ text: text }]
        },
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: 768, // Use recommended truncated dimension
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    if (!response.data?.embedding?.values) {
      throw new Error('Invalid response from Gemini API');
    }

    return response.data.embedding.values;
  }

  /**
   * OpenAI embedding generation
   */
  private async generateOpenAIEmbedding(text: string): Promise<number[]> {
    if (!this.config.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }

  /**
   * Truncate text based on provider-specific limits
   */
  private truncateTextForProvider(text: string, provider: EmbeddingProvider): string {
    let maxTokens: number;
    
    switch (provider) {
      case 'voyage':
        maxTokens = 16000; // Voyage supports up to 16K tokens
        break;
      case 'gemini':
        maxTokens = 2000; // Gemini supports up to 2K tokens
        break;
      case 'openai':
      default:
        maxTokens = 8000; // OpenAI supports up to 8K tokens
        break;
    }
    
    return this.truncateTextForEmbedding(text, maxTokens);
  }
  
  /**
   * Store document chunks in vector database
   */
  async storeDocumentChunks(
    userId: string,
    documentId: string,
    chunks: ISmartChunk[],
    documentMetadata: any
  ): Promise<void> {
    try {
      const vectorDocuments: VectorDocument[] = [];
      
      // Process each chunk
      for (const chunk of chunks) {
        const vectorDoc: VectorDocument = {
          id: `${documentId}_${chunk.id}`,
          userId,
          documentId,
          chunkId: chunk.id,
          content: chunk.content,
          metadata: {
            documentType: documentMetadata.documentType,
            chunkType: chunk.type,
            title: documentMetadata.title,
            tags: documentMetadata.tags || [],
            createdAt: new Date(),
            level: chunk.level,
            semanticScore: chunk.semanticScore,
            startIndex: chunk.startIndex,
            endIndex: chunk.endIndex,
            keywords: chunk.metadata?.keywords || [],
          },
          embedding: chunk.embedding,
        };
        
        vectorDocuments.push(vectorDoc);
      }
      
      // Store in appropriate database
      if (this.config.useProduction && this.pinecone) {
        await this.storeToPinecone(vectorDocuments);
      } else if (this.chroma) {
        await this.storeToChroma(vectorDocuments);
      }
      
      console.log(`[VectorDB]: Stored ${vectorDocuments.length} chunks for document ${documentId}`);
    } catch (error) {
      console.error('[VectorDB]: Error storing document chunks:', error);
      throw error;
    }
  }
  
  /**
   * Store vectors in Pinecone
   */
  private async storeToPinecone(documents: VectorDocument[]): Promise<void> {
    if (!this.pinecone || !this.config.pineconeIndexName) return;
    
    const index = this.pinecone.index(this.config.pineconeIndexName);
    
    const vectors = documents.map(doc => ({
      id: doc.id,
      values: doc.embedding,
      metadata: {
        userId: doc.userId,
        documentId: doc.documentId,
        chunkId: doc.chunkId || '',
        content: doc.content,
        documentType: doc.metadata.documentType,
        chunkType: doc.metadata.chunkType || '',
        title: doc.metadata.title || '',
        tags: doc.metadata.tags ? doc.metadata.tags.join(',') : '',
        createdAt: doc.metadata.createdAt ? doc.metadata.createdAt.toISOString() : new Date().toISOString(),
      },
    }));
    
    // Batch upsert (Pinecone recommends batches of 100-1000)
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
    }
  }
  
  /**
   * Store vectors in Chroma
   */
  private async storeToChroma(documents: VectorDocument[]): Promise<void> {
    if (!this.chroma || !this.embeddingFunction) return;
    
    const collectionName = 'synapse-documents';
    
    // Get or create collection
    let collection;
    try {
      collection = await this.chroma.getCollection({
        name: collectionName,
        embeddingFunction: this.embeddingFunction,
      });
    } catch (error) {
      collection = await this.chroma.createCollection({
        name: collectionName,
        embeddingFunction: this.embeddingFunction,
      });
    }
    
    // Prepare data for Chroma
    const ids = documents.map(doc => doc.id);
    const embeddings = documents.map(doc => doc.embedding);
    const metadatas = documents.map(doc => ({
      userId: doc.userId,
      documentId: doc.documentId,
      chunkId: doc.chunkId || '',
      documentType: doc.metadata.documentType,
      chunkType: doc.metadata.chunkType || '',
      title: doc.metadata.title || '',
      tags: doc.metadata.tags ? doc.metadata.tags.join(',') : '',
      createdAt: doc.metadata.createdAt.toISOString(),
    }));
    const contents = documents.map(doc => doc.content);
    
    // Add documents to collection
    await collection.add({
      ids,
      embeddings,
      metadatas,
      documents: contents,
    });
  }
  
  /**
   * Semantic search across documents
   */
  async semanticSearch(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    try {
      console.log(`[VectorDB]: Starting semantic search for query: "${query}"`);
      console.log(`[VectorDB]: Using production: ${this.config.useProduction}, Pinecone available: ${!!this.pinecone}, ChromaDB available: ${!!this.chroma}`);
      
      // If using Chroma with an embeddingFunction (OpenAI), let Chroma compute the
      // query embedding via queryTexts to ensure dimensionality consistency.
      if (!this.config.useProduction && this.chroma && this.embeddingFunction) {
        console.log('[VectorDB]: Using ChromaDB queryTexts with embedded OpenAI function for consistent dimensions');
        return await this.searchInChromaByText(query, options);
      }
      
      // Otherwise, generate our own embedding
      const queryEmbedding = await this.generateEmbedding(query);
      console.log(`[VectorDB]: Generated embedding with ${queryEmbedding.length} dimensions`);
      
      // Search in appropriate database
      if (this.config.useProduction && this.pinecone) {
        console.log('[VectorDB]: Searching in Pinecone');
        return await this.searchInPinecone(queryEmbedding, options);
      } else if (this.chroma) {
        console.log('[VectorDB]: Searching in ChromaDB with provided embedding');
        return await this.searchInChroma(queryEmbedding, options);
      }
      
      console.warn('[VectorDB]: No vector database available for search');
      return [];
    } catch (error) {
      console.error('[VectorDB]: Error in semantic search:', error);
      throw new Error(`Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Search in Pinecone
   */
  private async searchInPinecone(
    queryEmbedding: number[],
    options: SearchOptions
  ): Promise<SearchResult[]> {
    if (!this.pinecone || !this.config.pineconeIndexName) return [];
    
    const index = this.pinecone.index(this.config.pineconeIndexName);
    
    const filter: Record<string, any> = {};
    if (options.userId) {
      filter.userId = options.userId;
    }
    if (options.filter) {
      Object.assign(filter, options.filter);
    }
    
    const response = await index.query({
      vector: queryEmbedding,
      topK: options.topK || 10,
      includeMetadata: options.includeMetadata !== false,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });
    
    return response.matches?.map(match => ({
      id: match.id,
      score: match.score || 0,
      content: String(match.metadata?.content || ''),
      metadata: match.metadata || {},
      documentId: String(match.metadata?.documentId || ''),
      chunkId: match.metadata?.chunkId ? String(match.metadata.chunkId) : undefined,
    })) || [];
  }
  
  /**
   * Search in Chroma using precomputed query embedding
   */
  private async searchInChroma(
    queryEmbedding: number[],
    options: SearchOptions
  ): Promise<SearchResult[]> {
    if (!this.chroma || !this.embeddingFunction) return [];
    
    const collectionName = 'synapse-documents';
    
    try {
      const collection = await this.chroma.getCollection({
        name: collectionName,
        embeddingFunction: this.embeddingFunction,
      });
      
      const where: Record<string, any> = {};
      if (options.userId) {
        where.userId = options.userId;
      }
      if (options.filter) {
        Object.assign(where, options.filter);
      }
      
      // Add timeout to query operation
      const queryPromise = collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: options.topK || 10,
        where: Object.keys(where).length > 0 ? where : undefined,
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('ChromaDB query timeout')), 15000)
      );
      
      const results = await Promise.race([queryPromise, timeoutPromise]);
      
      return this.transformChromaResults(results, options);
    } catch (error) {
      console.error('[VectorDB]: Error searching in Chroma:', error);
      return [];
    }
  }

  /**
   * Search in Chroma letting it compute embeddings from text (recommended when using embeddingFunction)
   */
  private async searchInChromaByText(
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    if (!this.chroma || !this.embeddingFunction) return [];

    const collectionName = 'synapse-documents';

    try {
      const collection = await this.chroma.getCollection({
        name: collectionName,
        embeddingFunction: this.embeddingFunction,
      });

      const where: Record<string, any> = {};
      if (options.userId) {
        where.userId = options.userId;
      }
      if (options.filter) {
        Object.assign(where, options.filter);
      }

      const queryPromise = collection.query({
        queryTexts: [query],
        nResults: options.topK || 10,
        where: Object.keys(where).length > 0 ? where : undefined,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('ChromaDB query timeout')), 15000)
      );

      const results = await Promise.race([queryPromise, timeoutPromise]);

      return this.transformChromaResults(results, options);
    } catch (error) {
      console.error('[VectorDB]: Error searching in Chroma by text:', error);
      return [];
    }
  }

  /**
   * Helper to transform Chroma results to SearchResult[]
   */
  private transformChromaResults(results: any, options: SearchOptions): SearchResult[] {
    const searchResults: SearchResult[] = [];

    if (results?.ids && results?.distances && results?.documents && results?.metadatas) {
      for (let i = 0; i < results.ids[0].length; i++) {
        const score = 1 - (results.distances[0][i] || 0); // Convert distance to similarity

        if (score >= (options.minScore || 0)) {
          searchResults.push({
            id: results.ids[0][i],
            score,
            content: results.documents[0][i] || '',
            metadata: results.metadatas[0][i] || {},
            documentId: (results.metadatas[0][i] as any)?.documentId || '',
            chunkId: (results.metadatas[0][i] as any)?.chunkId,
          });
        }
      }
    }

    return searchResults;
  }
  
  /**
   * Hybrid search combining semantic and keyword search
   */
  async hybridSearch(
    query: string,
    options: SearchOptions & { keywordWeight?: number; semanticWeight?: number } = {}
  ): Promise<SearchResult[]> {
    try {
      const keywordWeight = options.keywordWeight || 0.3;
      const semanticWeight = options.semanticWeight || 0.7;
      
      // Get semantic search results
      const semanticResults = await this.semanticSearch(query, {
        ...options,
        topK: (options.topK || 10) * 2, // Get more results for reranking
      });
      
      // Simple keyword matching (in production, you'd use BM25 or similar)
      const keywordResults = semanticResults.filter(result =>
        result.content.toLowerCase().includes(query.toLowerCase())
      );
      
      // Combine and rerank results
      const combinedResults = new Map<string, SearchResult>();
      
      semanticResults.forEach(result => {
        const combinedScore = result.score * semanticWeight;
        combinedResults.set(result.id, {
          ...result,
          score: combinedScore,
        });
      });
      
      keywordResults.forEach(result => {
        const existing = combinedResults.get(result.id);
        if (existing) {
          existing.score += keywordWeight;
        } else {
          combinedResults.set(result.id, {
            ...result,
            score: keywordWeight,
          });
        }
      });
      
      // Sort by combined score and return top results
      return Array.from(combinedResults.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, options.topK || 10);
    } catch (error) {
      console.error('[VectorDB]: Error in hybrid search:', error);
      throw error;
    }
  }
  
  /**
   * Find similar documents
   */
  async findSimilarDocuments(
    documentId: string,
    userId?: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      // This would typically use the document's embedding
      // For now, we'll use a simplified approach
      const options: SearchOptions = {
        topK: limit,
        userId,
        filter: {
          documentId: { $ne: documentId }, // Exclude the source document
        },
      };
      
      // In a real implementation, you'd get the document's embedding
      // and search for similar embeddings
      return [];
    } catch (error) {
      console.error('[VectorDB]: Error finding similar documents:', error);
      throw error;
    }
  }
  
  /**
   * Delete document from vector database
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      if (this.config.useProduction && this.pinecone) {
        await this.deleteFromPinecone(documentId);
      } else if (this.chroma) {
        await this.deleteFromChroma(documentId);
      }
      
      console.log(`[VectorDB]: Deleted document ${documentId} from vector database`);
    } catch (error) {
      console.error('[VectorDB]: Error deleting document:', error);
      throw error;
    }
  }
  
  private async deleteFromPinecone(documentId: string): Promise<void> {
    if (!this.pinecone || !this.config.pineconeIndexName) return;
    
    const index = this.pinecone.index(this.config.pineconeIndexName);
    
    // Delete all vectors for this document
    await index.deleteMany({
      filter: { documentId }
    });
  }
  
  private async deleteFromChroma(documentId: string): Promise<void> {
    if (!this.chroma || !this.embeddingFunction) return;
    
    const collectionName = 'synapse-documents';
    
    try {
      const collection = await this.chroma.getCollection({
        name: collectionName,
        embeddingFunction: this.embeddingFunction,
      });
      
      await collection.delete({
        where: { documentId }
      });
    } catch (error) {
      console.error('[VectorDB]: Error deleting from Chroma:', error);
    }
  }
  
  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalDocuments: number;
    totalChunks: number;
    databaseType: string;
    indexStatus: string;
    embeddingProvider: EmbeddingProvider;
    embeddingDimensions: number;
  }> {
    try {
      console.log('[VectorDB]: Getting stats...');
      console.log('[VectorDB]: Config:', {
        useProduction: this.config.useProduction,
        hasPinecone: !!this.pinecone,
        hasChroma: !!this.chroma,
        embeddingFunction: !!this.embeddingFunction
      });

      if (this.config.useProduction && this.pinecone && this.config.pineconeIndexName) {
        console.log('[VectorDB]: Fetching Pinecone stats...');
        try {
          const stats = await this.pinecone.index(this.config.pineconeIndexName).describeIndexStats();
          console.log('[VectorDB]: Pinecone stats:', stats);
          return {
            totalDocuments: stats.totalRecordCount || 0,
            totalChunks: stats.totalRecordCount || 0,
            databaseType: 'pinecone',
            indexStatus: 'ready',
            embeddingProvider: this.config.embeddingProvider,
            embeddingDimensions: this.config.dimensionality,
          };
        } catch (pineconeError) {
          console.error('[VectorDB]: Pinecone stats error:', pineconeError);
          throw pineconeError;
        }
      } else if (this.chroma && this.embeddingFunction) {
        console.log('[VectorDB]: Fetching Chroma stats...');
        try {
          const collections = await this.chroma.listCollections();
          console.log('[VectorDB]: Available collections:', collections);
          
          const synapseCollection = collections.find((c: any) => c.name === 'synapse-documents');
          console.log('[VectorDB]: Synapse collection found:', !!synapseCollection);
          
          if (synapseCollection) {
            const collection = await this.chroma.getCollection({
              name: 'synapse-documents',
              embeddingFunction: this.embeddingFunction,
            });
            
            const count = await collection.count();
            console.log('[VectorDB]: Collection count:', count);
            
            return {
              totalDocuments: count,
              totalChunks: count,
              databaseType: 'chroma',
              indexStatus: 'ready',
              embeddingProvider: this.config.embeddingProvider,
              embeddingDimensions: this.config.dimensionality,
            };
          } else {
            console.log('[VectorDB]: Synapse collection not found, returning empty stats');
            return {
              totalDocuments: 0,
              totalChunks: 0,
              databaseType: 'chroma',
              indexStatus: 'no_collection',
              embeddingProvider: this.config.embeddingProvider,
              embeddingDimensions: this.config.dimensionality,
            };
          }
        } catch (chromaError) {
          console.error('[VectorDB]: Chroma stats error:', chromaError);
          return {
            totalDocuments: 0,
            totalChunks: 0,
            databaseType: 'chroma',
            indexStatus: 'connection_error',
            embeddingProvider: this.config.embeddingProvider,
            embeddingDimensions: this.config.dimensionality,
          };
        }
      } else {
        console.log('[VectorDB]: No vector database configured or available');
        return {
          totalDocuments: 0,
          totalChunks: 0,
          databaseType: 'none',
          indexStatus: 'not_configured',
          embeddingProvider: this.config.embeddingProvider,
          embeddingDimensions: this.config.dimensionality,
        };
      }
    } catch (error) {
      console.error('[VectorDB]: Error getting stats:', error);
      return {
        totalDocuments: 0,
        totalChunks: 0,
        databaseType: 'error',
        indexStatus: 'error',
        embeddingProvider: this.config.embeddingProvider,
        embeddingDimensions: this.config.dimensionality,
      };
    }
  }
  
  /**
   * Recreate Pinecone index with correct dimensions (WARNING: This deletes all existing data)
   */
  async recreatePineconeIndex(): Promise<void> {
    if (!this.pinecone || !this.config.pineconeIndexName) {
      throw new Error('Pinecone not configured');
    }
    
    try {
      console.log(`[VectorDB]: WARNING: Recreating Pinecone index ${this.config.pineconeIndexName} - this will delete all existing data!`);
      
      // Delete existing index if it exists
      try {
        await this.pinecone.deleteIndex(this.config.pineconeIndexName);
        console.log(`[VectorDB]: Deleted existing index ${this.config.pineconeIndexName}`);
        
        // Wait for deletion to complete
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.log(`[VectorDB]: Index ${this.config.pineconeIndexName} didn't exist or couldn't be deleted`);
      }
      
      // Create new index with correct dimensions
      await this.pinecone.createIndex({
        name: this.config.pineconeIndexName,
        dimension: this.config.dimensionality,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      });
      
      console.log(`[VectorDB]: Created new Pinecone index ${this.config.pineconeIndexName} with ${this.config.dimensionality} dimensions`);
      
      // Wait for index to be ready
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      console.log(`[VectorDB]: Pinecone index is ready for use`);
    } catch (error) {
      console.error('[VectorDB]: Error recreating Pinecone index:', error);
      throw error;
    }
  }

  /**
   * Health check for vector databases and embedding providers
   */
  async healthCheck(): Promise<{
    pinecone: boolean;
    chroma: boolean;
    embeddings: boolean;
    embeddingProviders: Record<EmbeddingProvider, { available: boolean; tested: boolean; error?: string }>;
    primaryProvider: EmbeddingProvider;
    fallbackProviders: EmbeddingProvider[];
  }> {
    const health = {
      pinecone: false,
      chroma: false,
      embeddings: false,
      embeddingProviders: {} as Record<EmbeddingProvider, { available: boolean; tested: boolean; error?: string }>,
      primaryProvider: this.config.embeddingProvider,
      fallbackProviders: this.config.fallbackProviders,
    };
    
    // Test each embedding provider
    const providers: EmbeddingProvider[] = ['voyage', 'gemini', 'openai'];
    for (const provider of providers) {
      health.embeddingProviders[provider] = {
        available: this.isProviderConfigured(provider),
        tested: false,
      };
      
      if (health.embeddingProviders[provider].available) {
        try {
          await this.generateEmbeddingWithProvider('test', provider);
          health.embeddingProviders[provider].tested = true;
        } catch (error) {
          health.embeddingProviders[provider].error = error instanceof Error ? error.message : String(error);
        }
      }
    }
    
    // Test overall embedding service
    try {
      await this.generateEmbedding('test');
      health.embeddings = true;
    } catch (error) {
      console.error('[VectorDB]: Embedding service health check failed:', error);
    }
    
    try {
      // Test Pinecone
      if (this.pinecone) {
        await this.pinecone.listIndexes();
        health.pinecone = true;
      }
    } catch (error) {
      console.error('[VectorDB]: Pinecone health check failed:', error);
    }
    
    try {
      // Test Chroma
      if (this.chroma) {
        await this.chroma.listCollections();
        health.chroma = true;
      }
    } catch (error) {
      console.error('[VectorDB]: Chroma health check failed:', error);
    }
    
    return health;
  }

  /**
   * Check if a provider is properly configured
   */
  private isProviderConfigured(provider: EmbeddingProvider): boolean {
    switch (provider) {
      case 'voyage':
        return !!this.config.voyageApiKey;
      case 'gemini':
        return !!this.config.geminiApiKey;
      case 'openai':
        return !!this.config.openaiApiKey;
      default:
        return false;
    }
  }
}

// Export singleton instance
export const vectorDatabaseService = new VectorDatabaseService();