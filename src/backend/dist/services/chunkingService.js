"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkingService = exports.ChunkingService = void 0;
const openai_1 = require("openai");
class ChunkingService {
    constructor() {
        this.openai = new openai_1.OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    async chunkDocument(content, options) {
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
        }
        catch (error) {
            console.error('[ChunkingService]: Error chunking document:', error);
            // Fallback to simple fixed chunking
            return await this.fixedChunking(content, options);
        }
    }
    async fixedChunking(content, options) {
        const chunks = [];
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        let currentChunk = '';
        let chunkIndex = 0;
        let currentPosition = 0;
        for (const sentence of sentences) {
            const trimmedSentence = sentence.trim();
            if (!trimmedSentence)
                continue;
            const potentialChunk = currentChunk + (currentChunk ? '. ' : '') + trimmedSentence;
            if (potentialChunk.length > options.maxChunkSize && currentChunk.length > options.minChunkSize) {
                // Create chunk
                const chunk = {
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
            }
            else {
                currentChunk = potentialChunk;
            }
            currentPosition += trimmedSentence.length + 2; // +2 for punctuation and space
        }
        // Add remaining content as final chunk
        if (currentChunk.trim().length > options.minChunkSize) {
            const chunk = {
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
    async semanticChunking(content, options) {
        // For now, use enhanced fixed chunking with semantic analysis
        const baseChunks = await this.fixedChunking(content, options);
        // Add semantic scoring
        return baseChunks.map((chunk, index) => ({
            ...chunk,
            semanticScore: this.calculateSemanticScore(chunk.content, index, baseChunks),
        }));
    }
    async agenticChunking(content, options) {
        // For now, fallback to semantic chunking
        return await this.semanticChunking(content, options);
    }
    async hybridChunking(content, options) {
        // Combine semantic and fixed strategies
        const semanticChunks = await this.semanticChunking(content, options);
        // Further refine chunks if needed
        const refinedChunks = [];
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
            }
            else {
                refinedChunks.push(chunk);
            }
        }
        console.log(`[ChunkingService]: Created ${refinedChunks.length} hybrid chunks`);
        return refinedChunks;
    }
    /**
     * Helper methods
     */
    extractKeywords(text) {
        // Simple keyword extraction
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3);
        // Count word frequency
        const wordCount = {};
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });
        // Return top keywords
        return Object.entries(wordCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([word]) => word);
    }
    calculateSemanticScore(content, index, allChunks) {
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
exports.ChunkingService = ChunkingService;
exports.chunkingService = new ChunkingService();
