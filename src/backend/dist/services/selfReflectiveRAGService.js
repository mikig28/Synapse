"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selfReflectiveRAGService = exports.SelfReflectiveRAGService = void 0;
const vectorDatabaseService_1 = require("./vectorDatabaseService");
const openai_1 = require("openai");
class SelfReflectiveRAGService {
    constructor() {
        this.openai = new openai_1.OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    /**
     * Main query processing method
     */
    async processQuery(query) {
        try {
            console.log(`[SelfReflectiveRAG]: Processing query: "${query.query}" for user ${query.userId}`);
            // Search for relevant documents
            const searchResults = await vectorDatabaseService_1.vectorDatabaseService.semanticSearch(query.query, {
                userId: query.userId,
                topK: 5,
                minScore: 0.5,
            });
            console.log(`[SelfReflectiveRAG]: Found ${searchResults.length} relevant documents`);
            if (searchResults.length === 0) {
                return {
                    answer: "I couldn't find any relevant documents for your query. Please try a different search term or upload more documents.",
                    sources: [],
                    confidence: 0,
                    qualityScore: 0,
                    iterationCount: 1,
                    searchStrategy: query.searchStrategy || 'semantic',
                    suggestions: ['Try using different keywords', 'Upload more documents', 'Be more specific in your query'],
                };
            }
            // Prepare context from search results
            const context = searchResults.map(result => result.content).join('\n\n');
            // Generate response using OpenAI
            const systemPrompt = `You are a helpful AI assistant that answers questions based on the provided context. 
      Use only the information from the context to answer questions. If you cannot find the answer in the context, say so.
      
      Context:
      ${context}`;
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: query.query }
                ],
                max_tokens: 500,
                temperature: 0.7,
            });
            const answer = response.choices[0]?.message?.content || 'I could not generate a response.';
            // Calculate confidence and quality scores
            const confidence = Math.min(0.9, searchResults.length * 0.2);
            const qualityScore = Math.min(0.95, searchResults.reduce((sum, r) => sum + r.score, 0) / searchResults.length);
            return {
                answer,
                sources: searchResults.map(result => ({
                    id: result.id,
                    content: result.content.substring(0, 200) + '...',
                    score: result.score,
                    metadata: result.metadata,
                })),
                confidence,
                qualityScore,
                iterationCount: 1,
                searchStrategy: query.searchStrategy || 'semantic',
                debugInfo: query.includeDebugInfo ? {
                    searchResults: searchResults.length,
                    contextLength: context.length,
                    model: 'gpt-3.5-turbo',
                } : undefined,
                suggestions: searchResults.length < 3 ? ['Try using different keywords', 'Upload more documents'] : undefined,
            };
        }
        catch (error) {
            console.error('[SelfReflectiveRAG]: Error processing query:', error);
            return {
                answer: 'I encountered an error while processing your query. Please try again.',
                sources: [],
                confidence: 0,
                qualityScore: 0,
                iterationCount: 1,
                searchStrategy: query.searchStrategy || 'semantic',
                suggestions: ['Try again with a different query', 'Check your internet connection'],
            };
        }
    }
}
exports.SelfReflectiveRAGService = SelfReflectiveRAGService;
exports.selfReflectiveRAGService = new SelfReflectiveRAGService();
