"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkingService = exports.ChunkingService = void 0;
const openai_1 = require("openai");
const tiktoken_1 = require("tiktoken");
const uuid_1 = require("uuid");
const vectorDatabaseService_1 = require("./vectorDatabaseService");
const compromise_1 = __importDefault(require("compromise"));
class ChunkingService {
    constructor() {
        this.openai = new openai_1.OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        // Initialize tiktoken for token counting
        this.tiktoken = tiktoken_1.encode;
    }
    /**
     * Main chunking method that routes to appropriate strategy
     */
    async chunkDocument(content, options) {
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
        }
        catch (error) {
            console.error('[ChunkingService]: Error in chunking:', error);
            throw error;
        }
    }
    /**
     * Fixed-size chunking with overlap
     */
    fixedSizeChunking(content, options) {
        const chunks = [];
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
                    id: (0, uuid_1.v4)(),
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
    recursiveChunking(content, options) {
        const separators = this.getSeparators(options.documentType);
        return this.recursiveChunkingSplit(content, separators, options, 0);
    }
    recursiveChunkingSplit(content, separators, options, level) {
        const chunks = [];
        if (separators.length === 0 || this.getTokenCount(content) <= options.maxChunkSize) {
            // Base case: no more separators or content is small enough
            if (content.length >= options.minChunkSize) {
                chunks.push({
                    id: (0, uuid_1.v4)(),
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
            if (part.trim().length === 0)
                continue;
            if (this.getTokenCount(part) <= options.maxChunkSize) {
                if (part.length >= options.minChunkSize) {
                    chunks.push({
                        id: (0, uuid_1.v4)(),
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
            }
            else {
                // Recursively split larger parts
                const subChunks = this.recursiveChunkingSplit(part, remainingSeparators, options, level + 1);
                chunks.push(...subChunks);
            }
        }
        return chunks;
    }
    /**
     * Semantic chunking based on meaning and context
     */
    async semanticChunking(content, options) {
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
        }
        catch (error) {
            console.error('[ChunkingService]: Error in semantic chunking:', error);
            throw error;
        }
    }
    /**
     * Agentic chunking using LLM reasoning
     */
    async agenticChunking(content, options) {
        try {
            const context = {
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
        }
        catch (error) {
            console.error('[ChunkingService]: Error in agentic chunking:', error);
            throw error;
        }
    }
    /**
     * Hybrid chunking combining multiple strategies
     */
    async hybridChunking(content, options) {
        try {
            // Step 1: Use recursive chunking for initial split
            const recursiveChunks = this.recursiveChunking(content, {
                ...options,
                strategy: 'recursive',
                maxChunkSize: options.maxChunkSize * 2, // Larger initial chunks
            });
            // Step 2: Apply semantic refinement to large chunks
            const refinedChunks = [];
            for (const chunk of recursiveChunks) {
                if (this.getTokenCount(chunk.content) > options.maxChunkSize) {
                    // Apply semantic chunking to oversized chunks
                    const semanticSubChunks = await this.semanticChunking(chunk.content, {
                        ...options,
                        strategy: 'semantic',
                    });
                    refinedChunks.push(...semanticSubChunks);
                }
                else {
                    refinedChunks.push(chunk);
                }
            }
            // Step 3: Apply agentic post-processing for optimization
            return await this.agenticPostProcessing(refinedChunks, options);
        }
        catch (error) {
            console.error('[ChunkingService]: Error in hybrid chunking:', error);
            throw error;
        }
    }
    /**
     * Helper methods
     */
    getSeparators(documentType) {
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
    getTokenCount(text) {
        return this.tiktoken(text).length;
    }
    detokenize(tokens) {
        // Simplified detokenization - in production use proper tiktoken decoder
        return tokens.map(t => String.fromCharCode(t)).join('');
    }
    inferChunkType(content) {
        const trimmed = content.trim();
        if (trimmed.startsWith('#'))
            return 'heading';
        if (trimmed.startsWith('```') || trimmed.includes('function ') || trimmed.includes('class '))
            return 'code';
        if (trimmed.startsWith('|') || trimmed.includes('|---'))
            return 'table';
        if (trimmed.match(/^[\s]*[-*+]\s/m))
            return 'list';
        if (trimmed.startsWith('>'))
            return 'quote';
        return 'paragraph';
    }
    extractKeywords(text) {
        try {
            const doc = (0, compromise_1.default)(text);
            const keywords = [];
            // Extract nouns and proper nouns
            keywords.push(...doc.nouns().out('array'));
            keywords.push(...doc.people().out('array'));
            keywords.push(...doc.places().out('array'));
            keywords.push(...doc.organizations().out('array'));
            // Remove duplicates and filter short words
            return [...new Set(keywords)]
                .filter(word => word.length > 2)
                .slice(0, 10);
        }
        catch (error) {
            console.error('[ChunkingService]: Error extracting keywords:', error);
            return [];
        }
    }
    splitIntoSentences(content) {
        // Simple sentence splitting - in production use more sophisticated NLP
        return content
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }
    async generateSentenceEmbeddings(sentences) {
        const embeddings = [];
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
    calculateSemanticSimilarities(embeddings) {
        const similarities = [];
        for (let i = 0; i < embeddings.length - 1; i++) {
            const similarity = this.cosineSimilarity(embeddings[i], embeddings[i + 1]);
            similarities.push(similarity);
        }
        return similarities;
    }
    cosineSimilarity(a, b) {
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (normA * normB);
    }
    identifySemanticBoundaries(similarities, sentences) {
        const boundaries = [];
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
    createSemanticChunks(sentences, boundaries, options) {
        const chunks = [];
        let currentChunk = [];
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
                        id: (0, uuid_1.v4)(),
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
                if (shouldBreak)
                    boundaryIndex++;
            }
        }
        return chunks;
    }
    async generateChunkEmbeddings(chunks) {
        for (const chunk of chunks) {
            chunk.embedding = await vectorDatabaseService_1.vectorDatabaseService.generateEmbedding(chunk.content);
        }
        return chunks;
    }
    extractTitle(content) {
        const lines = content.split('\n');
        const firstLine = lines[0].trim();
        if (firstLine.startsWith('#')) {
            return firstLine.replace(/^#+\s*/, '');
        }
        return firstLine.substring(0, 100);
    }
    analyzeContentStructure(content) {
        const structure = [];
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('#')) {
                structure.push(`heading_${trimmed.split(' ')[0].length}`);
            }
            else if (trimmed.startsWith('```')) {
                structure.push('code_block');
            }
            else if (trimmed.startsWith('|')) {
                structure.push('table');
            }
            else if (trimmed.match(/^[\s]*[-*+]\s/)) {
                structure.push('list');
            }
            else if (trimmed.length > 0) {
                structure.push('paragraph');
            }
        }
        return structure;
    }
    buildAgenticChunkingPrompt(content, context, options) {
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
    parseAgenticResponse(response) {
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('No valid JSON found in response');
        }
        catch (error) {
            console.error('[ChunkingService]: Error parsing agentic response:', error);
            return { boundaries: [], strategy: 'fallback', reasoning: 'Parsing failed' };
        }
    }
    applyAgenticDecisions(content, decisions, options) {
        const chunks = [];
        const boundaries = decisions.boundaries || [];
        let lastPosition = 0;
        for (const boundary of boundaries) {
            const chunkContent = content.substring(lastPosition, boundary.position);
            if (chunkContent.length >= options.minChunkSize) {
                chunks.push({
                    id: (0, uuid_1.v4)(),
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
                    id: (0, uuid_1.v4)(),
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
    async agenticPostProcessing(chunks, options) {
        // Apply LLM-based post-processing to optimize chunk boundaries
        // This is a simplified implementation
        return chunks;
    }
    /**
     * Validate chunk quality
     */
    validateChunks(chunks) {
        const issues = [];
        const suggestions = [];
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
exports.ChunkingService = ChunkingService;
// Export singleton instance
exports.chunkingService = new ChunkingService();
