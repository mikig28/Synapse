import { OpenAI } from 'openai';
import { encode } from 'tiktoken';
import { v4 as uuidv4 } from 'uuid';
import { ISmartChunk } from '../models/Document';
import { vectorDatabaseService } from './vectorDatabaseService';
import { marked } from 'marked';
import { parse } from 'node-html-parser';
import nlp from 'compromise';

interface ChunkingOptions {
  strategy: 'fixed' | 'recursive' | 'semantic' | 'agentic' | 'hybrid';
  maxChunkSize: number;
  chunkOverlap: number;
  minChunkSize: number;
  preserveStructure: boolean;
  documentType: string;
  language?: string;
}

interface SemanticBoundary {
  position: number;
  type: 'paragraph' | 'section' | 'heading' | 'topic_shift' | 'code_block';
  confidence: number;
  metadata?: any;
}

interface AgenticChunkingContext {
  documentType: string;
  title: string;
  contentStructure: string[];
  userIntent?: string;
  domainKnowledge?: string;
}

export class ChunkingService {
  private openai: OpenAI;
  private tiktoken: any;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Initialize tiktoken for token counting
    this.tiktoken = encode;
  }
  
  /**
   * Main chunking method that routes to appropriate strategy
   */
  async chunkDocument(
    content: string,
    options: ChunkingOptions
  ): Promise<ISmartChunk[]> {
    try {
      console.log(`[ChunkingService]: Starting ${options.strategy} chunking for ${options.documentType}`);
      
      switch (options.strategy) {
        case 'fixed':
          return this.fixedSizeChunking(content, options);
        case 'recursive':
          return this.recursiveChunking(content, options);
        case 'semantic':
          return await this.semanticChunking(content, options);
        case 'agentic':
          return await this.agenticChunking(content, options);
        case 'hybrid':
          return await this.hybridChunking(content, options);
        default:
          throw new Error(`Unsupported chunking strategy: ${options.strategy}`);
      }
    } catch (error) {
      console.error('[ChunkingService]: Error in chunking:', error);
      throw error;
    }
  }
  
  /**
   * Fixed-size chunking with overlap
   */
  private fixedSizeChunking(content: string, options: ChunkingOptions): ISmartChunk[] {
    const chunks: ISmartChunk[] = [];
    const tokens = this.tiktoken(content);
    
    let startPos = 0;
    let chunkIndex = 0;
    
    while (startPos < tokens.length) {
      const endPos = Math.min(startPos + options.maxChunkSize, tokens.length);
      const chunkTokens = tokens.slice(startPos, endPos);
      
      // Convert tokens back to text (simplified)
      const chunkText = this.detokenize(chunkTokens);
      
      if (chunkText.length >= options.minChunkSize) {
        chunks.push({
          id: uuidv4(),
          content: chunkText,
          type: 'paragraph',
          level: 0,
          embedding: [], // Will be populated later
          semanticScore: 0.5, // Default value
          startIndex: startPos,
          endIndex: endPos,
          metadata: {
            keywords: this.extractKeywords(chunkText),
          },
        });
      }
      
      startPos = endPos - options.chunkOverlap;
      chunkIndex++;
    }
    
    return chunks;
  }
  
  /**
   * Recursive chunking using hierarchical separators
   */
  private recursiveChunking(content: string, options: ChunkingOptions): ISmartChunk[] {
    const separators = this.getSeparators(options.documentType);
    return this.recursiveChunkingSplit(content, separators, options, 0);
  }
  
  private recursiveChunkingSplit(
    content: string,
    separators: string[],
    options: ChunkingOptions,
    level: number
  ): ISmartChunk[] {
    const chunks: ISmartChunk[] = [];
    
    if (separators.length === 0 || this.getTokenCount(content) <= options.maxChunkSize) {
      // Base case: no more separators or content is small enough
      if (content.length >= options.minChunkSize) {
        chunks.push({
          id: uuidv4(),
          content: content.trim(),
          type: this.inferChunkType(content),
          level,
          embedding: [],
          semanticScore: 0.5,
          startIndex: 0,
          endIndex: content.length,
          metadata: {
            keywords: this.extractKeywords(content),
          },
        });
      }
      return chunks;
    }
    
    const [separator, ...remainingSeparators] = separators;
    const parts = content.split(separator);
    
    for (const part of parts) {
      if (part.trim().length === 0) continue;
      
      if (this.getTokenCount(part) <= options.maxChunkSize) {
        if (part.length >= options.minChunkSize) {
          chunks.push({
            id: uuidv4(),
            content: part.trim(),
            type: this.inferChunkType(part),
            level,
            embedding: [],
            semanticScore: 0.5,
            startIndex: 0,
            endIndex: part.length,
            metadata: {
              keywords: this.extractKeywords(part),
            },
          });
        }
      } else {
        // Recursively split larger parts
        const subChunks = this.recursiveChunkingSplit(
          part,
          remainingSeparators,
          options,
          level + 1
        );
        chunks.push(...subChunks);
      }
    }
    
    return chunks;
  }
  
  /**
   * Semantic chunking based on meaning and context
   */
  private async semanticChunking(content: string, options: ChunkingOptions): Promise<ISmartChunk[]> {
    try {
      // Step 1: Split content into sentences
      const sentences = this.splitIntoSentences(content);
      
      // Step 2: Generate embeddings for each sentence
      const sentenceEmbeddings = await this.generateSentenceEmbeddings(sentences);
      
      // Step 3: Calculate semantic similarity between adjacent sentences
      const similarities = this.calculateSemanticSimilarities(sentenceEmbeddings);
      
      // Step 4: Identify semantic boundaries
      const boundaries = this.identifySemanticBoundaries(similarities, sentences);
      
      // Step 5: Create chunks based on boundaries
      const chunks = this.createSemanticChunks(sentences, boundaries, options);
      
      // Step 6: Generate embeddings for final chunks
      return await this.generateChunkEmbeddings(chunks);
    } catch (error) {
      console.error('[ChunkingService]: Error in semantic chunking:', error);
      throw error;
    }
  }
  
  /**
   * Agentic chunking using LLM reasoning
   */
  private async agenticChunking(content: string, options: ChunkingOptions): Promise<ISmartChunk[]> {
    try {
      const context: AgenticChunkingContext = {
        documentType: options.documentType,
        title: this.extractTitle(content),
        contentStructure: this.analyzeContentStructure(content),
      };
      
      const prompt = this.buildAgenticChunkingPrompt(content, context, options);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert document analyst specialized in intelligent content chunking. Your task is to analyze documents and determine optimal chunk boundaries based on semantic meaning, document structure, and content coherence.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      });
      
      const chunkingDecisions = this.parseAgenticResponse(response.choices[0].message.content || '');
      
      return this.applyAgenticDecisions(content, chunkingDecisions, options);
    } catch (error) {
      console.error('[ChunkingService]: Error in agentic chunking:', error);
      throw error;
    }
  }
  
  /**
   * Hybrid chunking combining multiple strategies
   */
  private async hybridChunking(content: string, options: ChunkingOptions): Promise<ISmartChunk[]> {
    try {
      // Step 1: Use recursive chunking for initial split
      const recursiveChunks = this.recursiveChunking(content, {
        ...options,
        strategy: 'recursive',
        maxChunkSize: options.maxChunkSize * 2, // Larger initial chunks
      });
      
      // Step 2: Apply semantic refinement to large chunks
      const refinedChunks: ISmartChunk[] = [];
      
      for (const chunk of recursiveChunks) {
        if (this.getTokenCount(chunk.content) > options.maxChunkSize) {
          // Apply semantic chunking to oversized chunks
          const semanticSubChunks = await this.semanticChunking(chunk.content, {
            ...options,
            strategy: 'semantic',
          });
          
          refinedChunks.push(...semanticSubChunks);
        } else {
          refinedChunks.push(chunk);
        }
      }
      
      // Step 3: Apply agentic post-processing for optimization
      return await this.agenticPostProcessing(refinedChunks, options);
    } catch (error) {
      console.error('[ChunkingService]: Error in hybrid chunking:', error);
      throw error;
    }
  }
  
  /**
   * Helper methods
   */
  private getSeparators(documentType: string): string[] {
    switch (documentType) {
      case 'markdown':
        return ['\n\n', '\n#', '\n##', '\n###', '\n', ' ', ''];
      case 'code':
        return ['\n\nclass ', '\n\nfunction ', '\n\n', '\n', ' ', ''];
      case 'pdf':
      case 'text':
        return ['\n\n', '\n', '. ', ' ', ''];
      default:
        return ['\n\n', '\n', '. ', ' ', ''];
    }
  }
  
  private getTokenCount(text: string): number {
    return this.tiktoken(text).length;
  }
  
  private detokenize(tokens: number[]): string {
    // Simplified detokenization - in production use proper tiktoken decoder
    return tokens.map(t => String.fromCharCode(t)).join('');
  }
  
  private inferChunkType(content: string): ISmartChunk['type'] {
    const trimmed = content.trim();
    
    if (trimmed.startsWith('#')) return 'heading';
    if (trimmed.startsWith('```') || trimmed.includes('function ') || trimmed.includes('class ')) return 'code';
    if (trimmed.startsWith('|') || trimmed.includes('|---')) return 'table';
    if (trimmed.match(/^[\s]*[-*+]\s/m)) return 'list';
    if (trimmed.startsWith('>')) return 'quote';
    
    return 'paragraph';
  }
  
  private extractKeywords(text: string): string[] {
    try {
      const doc = nlp(text);
      const keywords: string[] = [];
      
      // Extract nouns and proper nouns
      keywords.push(...doc.nouns().out('array'));
      keywords.push(...doc.people().out('array'));
      keywords.push(...doc.places().out('array'));
      keywords.push(...doc.organizations().out('array'));
      
      // Remove duplicates and filter short words
      return [...new Set(keywords)]
        .filter(word => word.length > 2)
        .slice(0, 10);
    } catch (error) {
      console.error('[ChunkingService]: Error extracting keywords:', error);
      return [];
    }
  }
  
  private splitIntoSentences(content: string): string[] {
    // Simple sentence splitting - in production use more sophisticated NLP
    return content
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  
  private async generateSentenceEmbeddings(sentences: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < sentences.length; i += batchSize) {
      const batch = sentences.slice(i, i + batchSize);
      
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
      });
      
      embeddings.push(...response.data.map(d => d.embedding));
    }
    
    return embeddings;
  }
  
  private calculateSemanticSimilarities(embeddings: number[][]): number[] {
    const similarities: number[] = [];
    
    for (let i = 0; i < embeddings.length - 1; i++) {
      const similarity = this.cosineSimilarity(embeddings[i], embeddings[i + 1]);
      similarities.push(similarity);
    }
    
    return similarities;
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    return dotProduct / (normA * normB);
  }
  
  private identifySemanticBoundaries(similarities: number[], sentences: string[]): SemanticBoundary[] {
    const boundaries: SemanticBoundary[] = [];
    const threshold = 0.7; // Similarity threshold for boundaries
    
    for (let i = 0; i < similarities.length; i++) {
      if (similarities[i] < threshold) {
        boundaries.push({
          position: i + 1,
          type: 'topic_shift',
          confidence: 1 - similarities[i],
        });
      }
    }
    
    return boundaries;
  }
  
  private createSemanticChunks(
    sentences: string[],
    boundaries: SemanticBoundary[],
    options: ChunkingOptions
  ): ISmartChunk[] {
    const chunks: ISmartChunk[] = [];
    let currentChunk: string[] = [];
    let boundaryIndex = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      currentChunk.push(sentences[i]);
      
      // Check if we've hit a boundary
      const shouldBreak = boundaryIndex < boundaries.length && 
                         boundaries[boundaryIndex].position === i + 1;
      
      if (shouldBreak || i === sentences.length - 1) {
        const content = currentChunk.join('. ');
        
        if (content.length >= options.minChunkSize) {
          chunks.push({
            id: uuidv4(),
            content,
            type: 'paragraph',
            level: 0,
            embedding: [],
            semanticScore: shouldBreak ? boundaries[boundaryIndex].confidence : 0.5,
            startIndex: 0,
            endIndex: content.length,
            metadata: {
              keywords: this.extractKeywords(content),
            },
          });
        }
        
        currentChunk = [];
        if (shouldBreak) boundaryIndex++;
      }
    }
    
    return chunks;
  }
  
  private async generateChunkEmbeddings(chunks: ISmartChunk[]): Promise<ISmartChunk[]> {
    for (const chunk of chunks) {
      chunk.embedding = await vectorDatabaseService.generateEmbedding(chunk.content);
    }
    
    return chunks;
  }
  
  private extractTitle(content: string): string {
    const lines = content.split('\n');
    const firstLine = lines[0].trim();
    
    if (firstLine.startsWith('#')) {
      return firstLine.replace(/^#+\s*/, '');
    }
    
    return firstLine.substring(0, 100);
  }
  
  private analyzeContentStructure(content: string): string[] {
    const structure: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        structure.push(`heading_${trimmed.split(' ')[0].length}`);
      } else if (trimmed.startsWith('```')) {
        structure.push('code_block');
      } else if (trimmed.startsWith('|')) {
        structure.push('table');
      } else if (trimmed.match(/^[\s]*[-*+]\s/)) {
        structure.push('list');
      } else if (trimmed.length > 0) {
        structure.push('paragraph');
      }
    }
    
    return structure;
  }
  
  private buildAgenticChunkingPrompt(
    content: string,
    context: AgenticChunkingContext,
    options: ChunkingOptions
  ): string {
    return `
Analyze the following ${context.documentType} document and determine optimal chunk boundaries:

Title: ${context.title}
Content Structure: ${context.contentStructure.join(', ')}
Max Chunk Size: ${options.maxChunkSize} tokens
Min Chunk Size: ${options.minChunkSize} tokens

Document Content:
${content.substring(0, 4000)}${content.length > 4000 ? '...' : ''}

Instructions:
1. Identify natural semantic boundaries in the content
2. Consider document structure (headings, paragraphs, code blocks, etc.)
3. Ensure chunks are coherent and self-contained
4. Respect the token limits while maintaining meaning
5. Provide reasoning for each boundary decision

Return your analysis in the following JSON format:
{
  "boundaries": [
    {
      "position": 150,
      "type": "section",
      "reason": "Natural break between introduction and main content",
      "confidence": 0.9
    }
  ],
  "strategy": "structure-aware",
  "reasoning": "Overall explanation of the chunking strategy"
}
`;
  }
  
  private parseAgenticResponse(response: string): any {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.error('[ChunkingService]: Error parsing agentic response:', error);
      return { boundaries: [], strategy: 'fallback', reasoning: 'Parsing failed' };
    }
  }
  
  private applyAgenticDecisions(
    content: string,
    decisions: any,
    options: ChunkingOptions
  ): ISmartChunk[] {
    const chunks: ISmartChunk[] = [];
    const boundaries = decisions.boundaries || [];
    
    let lastPosition = 0;
    
    for (const boundary of boundaries) {
      const chunkContent = content.substring(lastPosition, boundary.position);
      
      if (chunkContent.length >= options.minChunkSize) {
        chunks.push({
          id: uuidv4(),
          content: chunkContent.trim(),
          type: boundary.type || 'paragraph',
          level: 0,
          embedding: [],
          semanticScore: boundary.confidence || 0.5,
          startIndex: lastPosition,
          endIndex: boundary.position,
          metadata: {
            keywords: this.extractKeywords(chunkContent),
            agenticReason: boundary.reason,
          },
        });
      }
      
      lastPosition = boundary.position;
    }
    
    // Add final chunk
    if (lastPosition < content.length) {
      const finalContent = content.substring(lastPosition);
      if (finalContent.length >= options.minChunkSize) {
        chunks.push({
          id: uuidv4(),
          content: finalContent.trim(),
          type: 'paragraph',
          level: 0,
          embedding: [],
          semanticScore: 0.5,
          startIndex: lastPosition,
          endIndex: content.length,
          metadata: {
            keywords: this.extractKeywords(finalContent),
          },
        });
      }
    }
    
    return chunks;
  }
  
  private async agenticPostProcessing(
    chunks: ISmartChunk[],
    options: ChunkingOptions
  ): Promise<ISmartChunk[]> {
    // Apply LLM-based post-processing to optimize chunk boundaries
    // This is a simplified implementation
    return chunks;
  }
  
  /**
   * Validate chunk quality
   */
  validateChunks(chunks: ISmartChunk[]): {
    valid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    for (const chunk of chunks) {
      // Check chunk size
      if (chunk.content.length < 50) {
        issues.push(`Chunk ${chunk.id} is too short (${chunk.content.length} chars)`);
      }
      
      // Check for proper sentence endings
      if (!chunk.content.trim().match(/[.!?]$/)) {
        issues.push(`Chunk ${chunk.id} doesn't end with proper punctuation`);
      }
      
      // Check for meaningful content
      if (chunk.content.trim().split(' ').length < 5) {
        issues.push(`Chunk ${chunk.id} contains too few words`);
      }
    }
    
    // General suggestions
    if (chunks.length > 100) {
      suggestions.push('Consider increasing chunk size to reduce total number of chunks');
    }
    
    if (chunks.length < 5) {
      suggestions.push('Consider decreasing chunk size for better granularity');
    }
    
    return {
      valid: issues.length === 0,
      issues,
      suggestions,
    };
  }
}

// Export singleton instance
export const chunkingService = new ChunkingService();