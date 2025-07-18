import { OpenAI } from 'openai';
import { ISmartChunk } from '../models/Document';

interface ChunkingOptions {
  strategy: 'semantic' | 'fixed' | 'agentic' | 'hybrid';
  maxChunkSize: number;
  chunkOverlap: number;
  minChunkSize: number;
  preserveStructure: boolean;
  documentType: string;
}

export class ChunkingService {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async chunkDocument(content: string, options: ChunkingOptions): Promise<ISmartChunk[]> {
    try {
      console.log(`[ChunkingService]: Chunking document with strategy: ${options.strategy}`);
      
      switch (options.strategy) {
        case 'semantic':
          return await this.semanticChunking(content, options);
        case 'fixed':
          return await this.fixedChunking(content, options);
        case 'agentic':
          return await this.agenticChunking(content, options);
        case 'hybrid':
        default:
          return await this.hybridChunking(content, options);
      }
    } catch (error) {
      console.error('[ChunkingService]: Error chunking document:', error);
      // Fallback to simple fixed chunking
      return await this.fixedChunking(content, options);
    }
  }

  private async fixedChunking(content: string, options: ChunkingOptions): Promise<ISmartChunk[]> {
    const chunks: ISmartChunk[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    let chunkIndex = 0;
    let currentPosition = 0;

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      const potentialChunk = currentChunk + (currentChunk ? '. ' : '') + trimmedSentence;
      
      if (potentialChunk.length > options.maxChunkSize && currentChunk.length > options.minChunkSize) {
        // Create chunk
        const chunk: ISmartChunk = {
          id: `chunk_${chunkIndex++}`,
          content: currentChunk,
          type: 'paragraph',
          level: 0,
          embedding: [], // Will be populated later
          semanticScore: 0.5,
          startIndex: currentPosition - currentChunk.length,
          endIndex: currentPosition,
          metadata: {
            keywords: this.extractKeywords(currentChunk),
          },
        };
        chunks.push(chunk);

        // Start new chunk with overlap
        const overlapWords = currentChunk.split(' ').slice(-Math.floor(options.chunkOverlap / 10));
        currentChunk = overlapWords.join(' ') + '. ' + trimmedSentence;
      } else {
        currentChunk = potentialChunk;
      }
      
      currentPosition += trimmedSentence.length + 2; // +2 for punctuation and space
    }

    // Add remaining content as final chunk
    if (currentChunk.trim().length > options.minChunkSize) {
      const chunk: ISmartChunk = {
        id: `chunk_${chunkIndex}`,
        content: currentChunk,
        type: 'paragraph',
        level: 0,
        embedding: [], // Will be populated later
        semanticScore: 0.5,
        startIndex: currentPosition - currentChunk.length,
        endIndex: currentPosition,
        metadata: {
          keywords: this.extractKeywords(currentChunk),
        },
      };
      chunks.push(chunk);
    }

    console.log(`[ChunkingService]: Created ${chunks.length} fixed chunks`);
    return chunks;
  }

  private async semanticChunking(content: string, options: ChunkingOptions): Promise<ISmartChunk[]> {
    // For now, use enhanced fixed chunking with semantic analysis
    const baseChunks = await this.fixedChunking(content, options);
    
    // Add semantic scoring
    return baseChunks.map((chunk, index) => ({
      ...chunk,
      semanticScore: this.calculateSemanticScore(chunk.content, index, baseChunks),
    }));
  }

  private async agenticChunking(content: string, options: ChunkingOptions): Promise<ISmartChunk[]> {
    // For now, fallback to semantic chunking
    return await this.semanticChunking(content, options);
  }

  private async hybridChunking(content: string, options: ChunkingOptions): Promise<ISmartChunk[]> {
    // Combine semantic and fixed strategies
    const semanticChunks = await this.semanticChunking(content, options);
    
    // Further refine chunks if needed
    const refinedChunks: ISmartChunk[] = [];
    
    for (const chunk of semanticChunks) {
      if (chunk.content.length > options.maxChunkSize * 1.5) {
        // Split large chunks
        const subChunks = await this.fixedChunking(chunk.content, {
          ...options,
          maxChunkSize: options.maxChunkSize,
        });
        
        subChunks.forEach((subChunk, index) => {
          refinedChunks.push({
            ...subChunk,
            id: `${chunk.id}_sub_${index}`,
            level: chunk.level + 1,
            metadata: {
              ...subChunk.metadata,
              parentChunkId: chunk.id,
            },
          });
        });
      } else {
        refinedChunks.push(chunk);
      }
    }

    console.log(`[ChunkingService]: Created ${refinedChunks.length} hybrid chunks`);
    return refinedChunks;
  }

  /**
   * Helper methods
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Count word frequency
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Return top keywords
    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  private calculateSemanticScore(content: string, index: number, allChunks: ISmartChunk[]): number {
    // Simple semantic scoring based on content overlap with neighboring chunks
    let score = 0.5;
    const contentWords = new Set(content.toLowerCase().split(/\s+/));
    
    // Check previous chunk
    if (index > 0) {
      const prevWords = new Set(allChunks[index - 1].content.toLowerCase().split(/\s+/));
      const overlap = [...contentWords].filter(word => prevWords.has(word)).length;
      score += (overlap / contentWords.size) * 0.25;
    }
    
    // Check next chunk
    if (index < allChunks.length - 1) {
      const nextWords = new Set(allChunks[index + 1].content.toLowerCase().split(/\s+/));
      const overlap = [...contentWords].filter(word => nextWords.has(word)).length;
      score += (overlap / contentWords.size) * 0.25;
    }
    
    return Math.min(1.0, score);
  }
}

export const chunkingService = new ChunkingService();