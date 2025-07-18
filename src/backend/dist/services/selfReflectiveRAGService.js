"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selfReflectiveRAGService = exports.SelfReflectiveRAGService = void 0;
const langgraph_1 = require("@langchain/langgraph");
const messages_1 = require("@langchain/core/messages");
const openai_1 = require("@langchain/openai");
const anthropic_1 = require("@langchain/anthropic");
const vectorDatabaseService_1 = require("./vectorDatabaseService");
const langgraph_2 = require("@langchain/langgraph");
const openai_2 = require("openai");
// State annotation for the RAG workflow
const GraphState = langgraph_2.Annotation.Root({
    query: (0, langgraph_2.Annotation)(),
    retrievedDocuments: (0, langgraph_2.Annotation)(),
    reformulatedQuery: (0, langgraph_2.Annotation)(),
    response: (0, langgraph_2.Annotation)(),
    confidence: (0, langgraph_2.Annotation)(),
    needsRetrieval: (0, langgraph_2.Annotation)(),
    needsReformulation: (0, langgraph_2.Annotation)(),
    iterationCount: (0, langgraph_2.Annotation)(),
    userId: (0, langgraph_2.Annotation)(),
    conversationHistory: (0, langgraph_2.Annotation)(),
    qualityScore: (0, langgraph_2.Annotation)(),
    sources: (0, langgraph_2.Annotation)(),
    feedback: (0, langgraph_2.Annotation)(),
    searchStrategy: (0, langgraph_2.Annotation)(),
    retrievalAttempts: (0, langgraph_2.Annotation)(),
    debugInfo: (0, langgraph_2.Annotation)(),
});
class SelfReflectiveRAGService {
    constructor() {
        // Initialize models
        this.chatModel = process.env.ANTHROPIC_API_KEY
            ? new anthropic_1.ChatAnthropic({
                apiKey: process.env.ANTHROPIC_API_KEY,
                modelName: 'claude-3-sonnet-20240229',
                temperature: 0.1,
            })
            : new openai_1.ChatOpenAI({
                apiKey: process.env.OPENAI_API_KEY,
                modelName: 'gpt-4',
                temperature: 0.1,
            });
        this.gradeModel = new openai_1.ChatOpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            modelName: 'gpt-3.5-turbo',
            temperature: 0,
        });
        this.openai = new openai_2.OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        // Build the workflow
        this.workflow = this.buildWorkflow();
    }
    /**
     * Build the self-reflective RAG workflow using LangGraph
     */
    buildWorkflow() {
        const workflow = new langgraph_1.StateGraph(GraphState);
        // Define nodes
        workflow
            .addNode('analyze_query', this.analyzeQuery.bind(this))
            .addNode('retrieve_documents', this.retrieveDocuments.bind(this))
            .addNode('grade_documents', this.gradeDocuments.bind(this))
            .addNode('reformulate_query', this.reformulateQuery.bind(this))
            .addNode('generate_response', this.generateResponse.bind(this))
            .addNode('evaluate_response', this.evaluateResponse.bind(this))
            .addNode('web_search', this.webSearch.bind(this))
            .addNode('final_response', this.finalResponse.bind(this));
        // Define edges and conditional routing
        workflow
            .addEdge(langgraph_1.START, 'analyze_query')
            .addEdge('analyze_query', 'retrieve_documents')
            .addEdge('retrieve_documents', 'grade_documents')
            .addConditionalEdges('grade_documents', this.routeAfterGrading.bind(this), {
            'generate': 'generate_response',
            'reformulate': 'reformulate_query',
            'web_search': 'web_search',
        })
            .addEdge('reformulate_query', 'retrieve_documents')
            .addEdge('web_search', 'generate_response')
            .addEdge('generate_response', 'evaluate_response')
            .addConditionalEdges('evaluate_response', this.routeAfterEvaluation.bind(this), {
            'final': 'final_response',
            'retry': 'reformulate_query',
        })
            .addEdge('final_response', langgraph_1.END);
        return workflow;
    }
    /**
     * Analyze the incoming query
     */
    async analyzeQuery(state) {
        console.log('[SelfReflectiveRAG]: Analyzing query:', state.query);
        const prompt = `
Analyze this query and determine the best retrieval strategy:

Query: "${state.query}"
Conversation History: ${JSON.stringify(state.conversationHistory || [])}

Determine:
1. Query complexity (simple/medium/complex)
2. Query type (factual/analytical/creative/conversational)
3. Best search strategy (semantic/hybrid/keyword)
4. Expected answer type (brief/detailed/step-by-step)
5. Confidence in understanding (0-1)

Return JSON:
{
  "complexity": "medium",
  "type": "analytical",
  "strategy": "hybrid",
  "expectedAnswerType": "detailed",
  "confidence": 0.8,
  "reasoning": "Query asks for analysis of complex topic"
}
`;
        const response = await this.gradeModel.invoke([
            new messages_1.SystemMessage('You are a query analysis expert. Respond only with valid JSON.'),
            new messages_1.HumanMessage(prompt),
        ]);
        const analysis = this.parseJSONResponse(response.content);
        return {
            searchStrategy: analysis.strategy || 'hybrid',
            confidence: analysis.confidence || 0.5,
            debugInfo: {
                ...state.debugInfo,
                queryAnalysis: analysis,
            },
        };
    }
    /**
     * Retrieve relevant documents
     */
    async retrieveDocuments(state) {
        console.log('[SelfReflectiveRAG]: Retrieving documents with strategy:', state.searchStrategy);
        const searchQuery = state.reformulatedQuery || state.query;
        try {
            let documents;
            switch (state.searchStrategy) {
                case 'semantic':
                    documents = await vectorDatabaseService_1.vectorDatabaseService.semanticSearch(searchQuery, {
                        userId: state.userId,
                        topK: 10,
                        minScore: 0.5,
                        filter: state.filter,
                    });
                    break;
                case 'hybrid':
                    documents = await vectorDatabaseService_1.vectorDatabaseService.hybridSearch(searchQuery, {
                        userId: state.userId,
                        topK: 10,
                        minScore: 0.5,
                        filter: state.filter,
                    });
                    break;
                default:
                    documents = await vectorDatabaseService_1.vectorDatabaseService.semanticSearch(searchQuery, {
                        userId: state.userId,
                        topK: 10,
                        minScore: 0.5,
                        filter: state.filter,
                    });
            }
            return {
                retrievedDocuments: documents,
                retrievalAttempts: [...(state.retrievalAttempts || []), documents.length],
                debugInfo: {
                    ...state.debugInfo,
                    retrieval: {
                        query: searchQuery,
                        strategy: state.searchStrategy,
                        resultCount: documents.length,
                    },
                },
            };
        }
        catch (error) {
            console.error('[SelfReflectiveRAG]: Error retrieving documents:', error);
            return {
                retrievedDocuments: [],
                retrievalAttempts: [...(state.retrievalAttempts || []), 0],
            };
        }
    }
    /**
     * Grade document relevance
     */
    async gradeDocuments(state) {
        console.log('[SelfReflectiveRAG]: Grading document relevance');
        const relevantDocuments = [];
        const documentGrades = [];
        for (const doc of state.retrievedDocuments || []) {
            const grade = await this.gradeDocumentRelevance(state.query, doc);
            documentGrades.push(grade);
            if (grade.isRelevant) {
                relevantDocuments.push(doc);
            }
        }
        const relevanceRatio = relevantDocuments.length / (state.retrievedDocuments?.length || 1);
        return {
            retrievedDocuments: relevantDocuments,
            confidence: relevanceRatio,
            debugInfo: {
                ...state.debugInfo,
                grading: {
                    totalDocuments: state.retrievedDocuments?.length || 0,
                    relevantDocuments: relevantDocuments.length,
                    relevanceRatio,
                    grades: documentGrades,
                },
            },
        };
    }
    /**
     * Grade individual document relevance
     */
    async gradeDocumentRelevance(query, document) {
        const prompt = `
Grade the relevance of this document to the query:

Query: "${query}"
Document: "${document.content.substring(0, 500)}..."

Is this document relevant to answering the query?
Rate relevance from 0-1 and provide reasoning.

Return JSON:
{
  "relevanceScore": 0.8,
  "isRelevant": true,
  "reasoning": "Document contains specific information about the query topic"
}
`;
        const response = await this.gradeModel.invoke([
            new messages_1.SystemMessage('You are a document relevance grader. Respond only with valid JSON.'),
            new messages_1.HumanMessage(prompt),
        ]);
        const grade = this.parseJSONResponse(response.content);
        return {
            documentId: document.id,
            relevanceScore: grade.relevanceScore || 0,
            reasoning: grade.reasoning || 'No reasoning provided',
            isRelevant: grade.isRelevant || false,
        };
    }
    /**
     * Reformulate query if needed
     */
    async reformulateQuery(state) {
        console.log('[SelfReflectiveRAG]: Reformulating query');
        const prompt = `
Original query: "${state.query}"
Current reformulated query: "${state.reformulatedQuery || 'None'}"
Retrieval attempts: ${state.retrievalAttempts?.length || 0}
Retrieved documents: ${state.retrievedDocuments?.length || 0}

The current query didn't retrieve relevant documents. 
Reformulate the query to improve retrieval results.
Consider:
- Different keywords
- More specific terms
- Alternative phrasings
- Broader or narrower scope

Return JSON:
{
  "reformulatedQuery": "new query here",
  "reasoning": "explanation of changes",
  "confidence": 0.7,
  "strategy": "expansion"
}
`;
        const response = await this.chatModel.invoke([
            new messages_1.SystemMessage('You are a query reformulation expert. Respond only with valid JSON.'),
            new messages_1.HumanMessage(prompt),
        ]);
        const reformulation = this.parseJSONResponse(response.content);
        return {
            reformulatedQuery: reformulation.reformulatedQuery || state.query,
            debugInfo: {
                ...state.debugInfo,
                reformulation: reformulation,
            },
        };
    }
    /**
     * Generate response based on retrieved documents
     */
    async generateResponse(state) {
        console.log('[SelfReflectiveRAG]: Generating response');
        const context = state.retrievedDocuments
            ?.map(doc => `Source: ${doc.metadata?.title || 'Unknown'}\nContent: ${doc.content}`)
            .join('\n\n') || 'No context available';
        const prompt = `
Answer the following query using the provided context:

Query: "${state.query}"
Context:
${context}

Conversation History: ${JSON.stringify(state.conversationHistory || [])}

Instructions:
1. Provide a comprehensive answer based on the context
2. Cite your sources where appropriate
3. Be honest about limitations if context is insufficient
4. Maintain conversation flow if there's history
5. Be helpful and informative

Answer:
`;
        const response = await this.chatModel.invoke([
            new messages_1.SystemMessage(`You are a helpful AI assistant with access to a knowledge base. 
      Answer queries using the provided context and maintain conversation continuity.`),
            new messages_1.HumanMessage(prompt),
        ]);
        return {
            response: response.content || 'I apologize, but I cannot generate a response at this time.',
            sources: state.retrievedDocuments || [],
        };
    }
    /**
     * Evaluate response quality
     */
    async evaluateResponse(state) {
        console.log('[SelfReflectiveRAG]: Evaluating response quality');
        const prompt = `
Evaluate the quality of this response:

Query: "${state.query}"
Response: "${state.response}"
Available Context: ${state.retrievedDocuments?.length || 0} documents

Evaluate on:
1. Relevance to query (0-1)
2. Completeness (0-1)
3. Accuracy based on context (0-1)
4. Helpfulness (0-1)
5. Overall quality (0-1)

Return JSON:
{
  "relevance": 0.9,
  "completeness": 0.8,
  "accuracy": 0.9,
  "helpfulness": 0.8,
  "overallQuality": 0.85,
  "needsImprovement": false,
  "reasoning": "Response adequately addresses the query with good context"
}
`;
        const response = await this.gradeModel.invoke([
            new messages_1.SystemMessage('You are a response quality evaluator. Respond only with valid JSON.'),
            new messages_1.HumanMessage(prompt),
        ]);
        const evaluation = this.parseJSONResponse(response.content);
        return {
            qualityScore: evaluation.overallQuality || 0.5,
            confidence: evaluation.overallQuality || 0.5,
            debugInfo: {
                ...state.debugInfo,
                evaluation,
            },
        };
    }
    /**
     * Web search fallback (placeholder)
     */
    async webSearch(state) {
        console.log('[SelfReflectiveRAG]: Web search fallback');
        // Placeholder for web search integration
        // In production, you would integrate with search APIs
        return {
            retrievedDocuments: [],
            debugInfo: {
                ...state.debugInfo,
                webSearch: {
                    attempted: true,
                    query: state.query,
                    results: 0,
                },
            },
        };
    }
    /**
     * Final response preparation
     */
    async finalResponse(state) {
        console.log('[SelfReflectiveRAG]: Preparing final response');
        const suggestions = this.generateSuggestions(state);
        return {
            debugInfo: {
                ...state.debugInfo,
                finalStats: {
                    totalIterations: state.iterationCount || 1,
                    finalConfidence: state.confidence || 0.5,
                    finalQuality: state.qualityScore || 0.5,
                    sourceCount: state.sources?.length || 0,
                },
                suggestions,
            },
        };
    }
    /**
     * Routing logic after document grading
     */
    routeAfterGrading(state) {
        const relevantDocs = state.retrievedDocuments?.length || 0;
        const attempts = state.retrievalAttempts?.length || 0;
        if (relevantDocs >= 2) {
            return 'generate';
        }
        else if (attempts < 3) {
            return 'reformulate';
        }
        else {
            return 'web_search';
        }
    }
    /**
     * Routing logic after response evaluation
     */
    routeAfterEvaluation(state) {
        const quality = state.qualityScore || 0;
        const iterations = state.iterationCount || 0;
        if (quality >= 0.7 || iterations >= 3) {
            return 'final';
        }
        else {
            return 'retry';
        }
    }
    /**
     * Generate helpful suggestions
     */
    generateSuggestions(state) {
        const suggestions = [];
        if (state.qualityScore && state.qualityScore < 0.7) {
            suggestions.push('Consider refining your query for better results');
        }
        if (state.sources && state.sources.length === 0) {
            suggestions.push('No relevant documents found. Try different keywords');
        }
        if (state.retrievalAttempts && state.retrievalAttempts.length > 2) {
            suggestions.push('Multiple retrieval attempts were made. Consider adding more documents to your knowledge base');
        }
        return suggestions;
    }
    /**
     * Parse JSON response with error handling
     */
    parseJSONResponse(content) {
        try {
            if (typeof content === 'string') {
                // Try to extract JSON from markdown code blocks
                const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                    content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[1] || jsonMatch[0]);
                }
                return JSON.parse(content);
            }
            return content;
        }
        catch (error) {
            console.error('[SelfReflectiveRAG]: Error parsing JSON response:', error);
            return {};
        }
    }
    /**
     * Main query processing method
     */
    async processQuery(query) {
        try {
            console.log('[SelfReflectiveRAG]: Processing query:', query.query);
            const app = this.workflow.compile();
            const initialState = {
                query: query.query,
                userId: query.userId,
                conversationHistory: query.conversationHistory || [],
                retrievedDocuments: [],
                reformulatedQuery: '',
                response: '',
                confidence: 0,
                needsRetrieval: true,
                needsReformulation: false,
                iterationCount: 0,
                qualityScore: 0,
                sources: [],
                feedback: null,
                searchStrategy: query.searchStrategy || 'hybrid',
                retrievalAttempts: [],
                debugInfo: {},
            };
            const result = await app.invoke(initialState);
            return {
                answer: result.response || 'I apologize, but I cannot provide an answer at this time.',
                sources: result.sources || [],
                confidence: result.confidence || 0,
                qualityScore: result.qualityScore || 0,
                iterationCount: result.iterationCount || 1,
                searchStrategy: result.searchStrategy || 'hybrid',
                debugInfo: query.includeDebugInfo ? result.debugInfo : undefined,
                suggestions: result.debugInfo?.suggestions || [],
            };
        }
        catch (error) {
            console.error('[SelfReflectiveRAG]: Error processing query:', error);
            throw error;
        }
    }
    /**
     * Process feedback for continuous improvement
     */
    async processFeedback(queryId, feedback) {
        try {
            console.log('[SelfReflectiveRAG]: Processing feedback for query:', queryId);
            // Store feedback for model improvement
            // In production, you would store this in a database
            // and use it to fine-tune the models
            // For now, just log the feedback
            console.log('[SelfReflectiveRAG]: Feedback received:', feedback);
        }
        catch (error) {
            console.error('[SelfReflectiveRAG]: Error processing feedback:', error);
        }
    }
    /**
     * Get service statistics
     */
    async getStats() {
        // In production, you would track these metrics in a database
        return {
            totalQueries: 0,
            averageIterations: 0,
            averageConfidence: 0,
            averageQuality: 0,
            successRate: 0,
        };
    }
}
exports.SelfReflectiveRAGService = SelfReflectiveRAGService;
// Export singleton instance
exports.selfReflectiveRAGService = new SelfReflectiveRAGService();
