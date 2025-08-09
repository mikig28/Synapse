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
                const noResultsMessage = "I couldn't find any relevant documents for your query. Please try a different search term or upload more documents.";
                return {
                    answer: noResultsMessage,
                    response: noResultsMessage,
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
            // If no OpenAI API key is configured, provide a deterministic fallback answer
            if (!process.env.OPENAI_API_KEY) {
                const fallback = this.buildFallbackAnswer(query.query, searchResults);
                return fallback;
            }
            // Generate response using OpenAI (use a current, supported model)
            const systemPrompt = `You are a helpful AI assistant that answers questions based on the provided context. 
      Use only the information from the context to answer questions. If you cannot find the answer in the context, say so.
      
      Context:
      ${context}`;
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: query.query }
                ],
                max_tokens: 500,
                temperature: 0.7,
            });
            let answer = response.choices[0]?.message?.content || '';
            // If the model returned an empty answer, fall back to a deterministic summary
            if (!answer.trim()) {
                const fallback = this.buildFallbackAnswer(query.query, searchResults);
                return fallback;
            }
            // Calculate confidence and quality scores
            const confidence = Math.min(0.9, searchResults.length * 0.2);
            const qualityScore = Math.min(0.95, searchResults.reduce((sum, r) => sum + r.score, 0) / searchResults.length);
            return {
                answer,
                response: answer, // Add both for compatibility
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
                suggestions: searchResults.length > 0 ? [
                    'Ask more specific questions',
                    'Try different keywords',
                    'Search for related topics'
                ] : [
                    'Upload more documents',
                    'Try different search terms',
                    'Check document processing status'
                ],
                debugInfo: query.includeDebugInfo ? {
                    searchResults: searchResults.length,
                    contextLength: context.length,
                    model: 'gpt-4o-mini',
                } : undefined,
            };
        }
        catch (error) {
            console.error('[SelfReflectiveRAG]: Error processing query:', error);
            // Provide more specific error messages based on the error type
            let errorMessage = 'I encountered an error while processing your query.';
            let suggestions = ['Try again with a different query', 'Check if documents are uploaded'];
            if (error instanceof Error) {
                if (error.message.includes('Vector search failed')) {
                    errorMessage = 'Vector search is currently unavailable. This may be due to missing API keys or database connection issues.';
                    suggestions = [
                        'Documents may not be properly indexed yet',
                        'Try uploading documents first',
                        'Contact support if the issue persists'
                    ];
                }
                else if (error.message.includes('API key')) {
                    errorMessage = 'AI services are currently unavailable due to missing API configuration.';
                    suggestions = [
                        'API keys may need to be configured',
                        'Try again later',
                        'Contact administrator'
                    ];
                }
                else if (error.message.includes('rate limit') || error.message.includes('429')) {
                    errorMessage = 'AI services are temporarily rate limited. Please try again in a moment.';
                    suggestions = [
                        'Wait a few seconds and try again',
                        'Try a shorter query',
                        'Reduce search frequency'
                    ];
                }
            }
            const errorResponse = `❌ ${errorMessage}`;
            return {
                answer: errorResponse,
                response: errorResponse,
                sources: [],
                confidence: 0,
                qualityScore: 0,
                iterationCount: 1,
                searchStrategy: query.searchStrategy || 'semantic',
                suggestions,
            };
        }
    }
    buildFallbackAnswer(userQuery, searchResults) {
        // Take top 3 results and extract the most relevant snippets
        const top = searchResults
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
        const bulletPoints = top.map((r, idx) => {
            const snippet = r.content.length > 300 ? r.content.slice(0, 300) + '...' : r.content;
            return `${idx + 1}. ${snippet}`;
        }).join('\n');
        const answerText = `Based on your documents, here is what I found related to "${userQuery}":\n\n${bulletPoints}\n\nIf you need deeper analysis, configure an AI key to enable full answers.`;
        const confidence = Math.min(0.8, top.length * 0.25);
        const qualityScore = Math.min(0.85, top.reduce((sum, r) => sum + r.score, 0) / (top.length || 1));
        return {
            answer: answerText,
            response: answerText,
            sources: top.map(r => ({
                id: r.id,
                content: r.content.substring(0, 200) + '...',
                score: r.score,
                metadata: r.metadata,
            })),
            confidence,
            qualityScore,
            iterationCount: 1,
            searchStrategy: 'semantic',
            suggestions: [
                'Ask a more specific question',
                'Upload more relevant documents',
                'Provide additional context in your query'
            ],
            debugInfo: {
                fallbackUsed: true,
                reason: process.env.OPENAI_API_KEY ? 'Empty LLM response' : 'Missing OPENAI_API_KEY',
            }
        };
    }
}
exports.SelfReflectiveRAGService = SelfReflectiveRAGService;
exports.selfReflectiveRAGService = new SelfReflectiveRAGService();
