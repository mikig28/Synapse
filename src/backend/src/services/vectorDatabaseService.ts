import { Pinecone } from '@pinecone-database/pinecone';
import { ChromaApi, OpenAIEmbeddingFunction } from 'chromadb';
import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { ISmartChunk } from '../models/Document';
import mongoose from 'mongoose';

// Vector database configuration
interface VectorConfig {
  useProduction: boolean;
  pineconeApiKey?: string;
  pineconeIndexName?: string;
  chromaUrl?: string;
  embeddingModel: 'openai' | 'cohere' | 'huggingface';
  dimensionality: number;
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

interface SearchResult {
  id: string;
  score: number;
  content: string;
  metadata: any;
  documentId: string;
  chunkId?: string;
}

interface SearchOptions {
  topK?: number;
  minScore?: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
  userId?: string;
}

export class VectorDatabaseService {
  private pinecone: Pinecone | null = null;
  private chroma: ChromaApi | null = null;
  private openai: OpenAI;
  private config: VectorConfig;
  private embeddingFunction: OpenAIEmbeddingFunction | null = null;
  
  constructor() {
    this.config = {
      useProduction: process.env.NODE_ENV === 'production',
      pineconeApiKey: process.env.PINECONE_API_KEY,
      pineconeIndexName: process.env.PINECONE_INDEX_NAME || 'synapse-docs',
      chromaUrl: process.env.CHROMA_URL || 'http://localhost:8000',
      embeddingModel: (process.env.EMBEDDING_MODEL as any) || 'openai',
      dimensionality: parseInt(process.env.EMBEDDING_DIMENSION || '1536'),
    };
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.initializeVectorDatabases();
  }
  
  private async initializeVectorDatabases(): Promise<void> {
    try {
      // Initialize Pinecone for production
      if (this.config.useProduction && this.config.pineconeApiKey) {
        console.log('[VectorDB]: Initializing Pinecone for production...');
        this.pinecone = new Pinecone({
          apiKey: this.config.pineconeApiKey,
        });
        
        // Verify/create index
        await this.initializePineconeIndex();
      }
      
      // Initialize Chroma for development/testing
      console.log('[VectorDB]: Initializing Chroma for development...');
      this.chroma = new ChromaApi({
        path: this.config.chromaUrl,
      });
      
      // Initialize OpenAI embedding function for Chroma
      this.embeddingFunction = new OpenAIEmbeddingFunction({
        openai_api_key: process.env.OPENAI_API_KEY || '',
        openai_model: 'text-embedding-3-small',
      });
      
      console.log('[VectorDB]: Vector databases initialized successfully');
    } catch (error) {
      console.error('[VectorDB]: Error initializing vector databases:', error);
      throw error;
    }
  }
  
  private async initializePineconeIndex(): Promise<void> {
    if (!this.pinecone || !this.config.pineconeIndexName) return;
    
    try {
      const existingIndexes = await this.pinecone.listIndexes();
      const indexExists = existingIndexes.indexes?.some(
        index => index.name === this.config.pineconeIndexName
      );
      
      if (!indexExists) {
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
      }
      
      console.log(`[VectorDB]: Pinecone index ${this.config.pineconeIndexName} is ready`);
    } catch (error) {
      console.error('[VectorDB]: Error initializing Pinecone index:', error);
      throw error;
    }
  }
  
  /**
   * Generate embeddings for text content
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('[VectorDB]: Error generating embedding:', error);
      throw error;
    }
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
        chunkId: doc.chunkId,
        content: doc.content,
        ...doc.metadata,
        createdAt: doc.metadata.createdAt ? doc.metadata.createdAt.toISOString() : undefined,
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
      ...doc.metadata,
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
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Search in appropriate database
      if (this.config.useProduction && this.pinecone) {
        return await this.searchInPinecone(queryEmbedding, options);
      } else if (this.chroma) {
        return await this.searchInChroma(queryEmbedding, options);
      }
      
      return [];
    } catch (error) {
      console.error('[VectorDB]: Error in semantic search:', error);
      throw error;
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
      chunkId: match.metadata?.chunkId,
    })) || [];
  }
  
  /**
   * Search in Chroma
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
      
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: options.topK || 10,
        where: Object.keys(where).length > 0 ? where : undefined,
      });
      
      const searchResults: SearchResult[] = [];
      
      if (results.ids && results.distances && results.documents && results.metadatas) {
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
    } catch (error) {
      console.error('[VectorDB]: Error searching in Chroma:', error);
      return [];
    }
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
  }> {
    try {
      if (this.config.useProduction && this.pinecone) {
        const stats = await this.pinecone.index(this.config.pineconeIndexName!).describeIndexStats();
        return {
          totalDocuments: stats.totalRecordCount || 0,
          totalChunks: stats.totalRecordCount || 0,
          databaseType: 'pinecone',
          indexStatus: 'ready',
        };
      } else if (this.chroma) {
        const collections = await this.chroma.listCollections();
        const synapseCollection = collections.find((c: any) => c.name === 'synapse-documents');
        
        if (synapseCollection) {
          const collection = await this.chroma.getCollection({
            name: 'synapse-documents',
            embeddingFunction: this.embeddingFunction!,
          });
          
          const count = await collection.count();
          
          return {
            totalDocuments: count,
            totalChunks: count,
            databaseType: 'chroma',
            indexStatus: 'ready',
          };
        }
      }
      
      return {
        totalDocuments: 0,
        totalChunks: 0,
        databaseType: 'none',
        indexStatus: 'not_initialized',
      };
    } catch (error) {
      console.error('[VectorDB]: Error getting stats:', error);
      return {
        totalDocuments: 0,
        totalChunks: 0,
        databaseType: 'error',
        indexStatus: 'error',
      };
    }
  }
  
  /**
   * Health check for vector databases
   */
  async healthCheck(): Promise<{
    pinecone: boolean;
    chroma: boolean;
    embeddings: boolean;
  }> {
    const health = {
      pinecone: false,
      chroma: false,
      embeddings: false,
    };
    
    try {
      // Test embedding generation
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
}

// Export singleton instance
export const vectorDatabaseService = new VectorDatabaseService();