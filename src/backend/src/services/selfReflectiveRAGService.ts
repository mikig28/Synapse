<<<<<<< HEAD
import { StateGraph, END, START } from '@langchain/langgraph';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
=======
>>>>>>> 89764ec2 (fix: Resolve three critical documentation system bugs)
import { vectorDatabaseService } from './vectorDatabaseService';
import { OpenAI } from 'openai';
import mongoose from 'mongoose';

<<<<<<< HEAD
// State annotation for the RAG workflow
const GraphState = Annotation.Root({
  query: Annotation<string>(),
  retrievedDocuments: Annotation<any[]>(),
  reformulatedQuery: Annotation<string>(),
  response: Annotation<string>(),
  confidence: Annotation<number>(),
  needsRetrieval: Annotation<boolean>(),
  needsReformulation: Annotation<boolean>(),
  iterationCount: Annotation<number>(),
  userId: Annotation<string>(),
  conversationHistory: Annotation<any[]>(),
  qualityScore: Annotation<number>(),
  sources: Annotation<any[]>(),
  feedback: Annotation<any>(),
  searchStrategy: Annotation<string>(),
  retrievalAttempts: Annotation<number[]>(),
  debugInfo: Annotation<any>(),
  filter: Annotation<any>(),
});

=======
>>>>>>> 89764ec2 (fix: Resolve three critical documentation system bugs)
interface RAGQuery {
  query: string;
  userId: string;
  conversationHistory?: any[];
  maxIterations?: number;
  confidenceThreshold?: number;
  searchStrategy?: 'semantic' | 'hybrid' | 'keyword';
  includeDebugInfo?: boolean;
  filter?: Record<string, any>;
}

interface RAGResponse {
  answer: string;
  sources: any[];
  confidence: number;
  qualityScore: number;
  iterationCount: number;
  searchStrategy: string;
  debugInfo?: any;
  suggestions?: string[];
}

export class SelfReflectiveRAGService {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
<<<<<<< HEAD
  /**
   * Build the self-reflective RAG workflow using LangGraph
   */
  private buildWorkflow(): any { // StateGraph<typeof GraphState> {
    const workflow = new StateGraph(GraphState as any);
    
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
    // Note: LangGraph API has version compatibility issues
    // These edges are commented out for now
    /*
    workflow
      .addEdge('__start__', 'analyze_query')
      .addEdge('analyze_query', 'retrieve_documents')
      .addEdge('retrieve_documents', 'grade_documents')
      .addConditionalEdges(
        'grade_documents',
        this.routeAfterGrading.bind(this),
        {
          'generate': 'generate_response',
          'reformulate': 'reformulate_query',
          'web_search': 'web_search',
        }
      )
      .addEdge('reformulate_query', 'retrieve_documents')
      .addEdge('web_search', 'generate_response')
      .addEdge('generate_response', 'evaluate_response')
      .addConditionalEdges(
        'evaluate_response',
        this.routeAfterEvaluation.bind(this),
        {
          'final': 'final_response',
          'retry': 'reformulate_query',
        }
      )
      .addEdge('final_response', '__end__');
    */
    
    return workflow;
  }
  
  /**
   * Analyze the incoming query
   */
  private async analyzeQuery(state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> {
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
      new SystemMessage('You are a query analysis expert. Respond only with valid JSON.'),
      new HumanMessage(prompt),
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
  private async retrieveDocuments(state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> {
    console.log('[SelfReflectiveRAG]: Retrieving documents with strategy:', state.searchStrategy);
    
    const searchQuery = state.reformulatedQuery || state.query;
    
    try {
      let documents;
      
      switch (state.searchStrategy) {
        case 'semantic':
          documents = await vectorDatabaseService.semanticSearch(searchQuery, {
            userId: state.userId,
            topK: 10,
            minScore: 0.5,
            filter: state.filter,
          });
          break;
        case 'hybrid':
          documents = await vectorDatabaseService.hybridSearch(searchQuery, {
            userId: state.userId,
            topK: 10,
            minScore: 0.5,
            filter: state.filter,
          });
          break;
        default:
          documents = await vectorDatabaseService.semanticSearch(searchQuery, {
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
    } catch (error) {
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
  private async gradeDocuments(state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> {
    console.log('[SelfReflectiveRAG]: Grading document relevance');
    
    const relevantDocuments = [];
    const documentGrades: DocumentRelevanceScore[] = [];
    
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
  private async gradeDocumentRelevance(query: string, document: any): Promise<DocumentRelevanceScore> {
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
      new SystemMessage('You are a document relevance grader. Respond only with valid JSON.'),
      new HumanMessage(prompt),
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
  private async reformulateQuery(state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> {
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
      new SystemMessage('You are a query reformulation expert. Respond only with valid JSON.'),
      new HumanMessage(prompt),
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
  private async generateResponse(state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> {
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
      new SystemMessage(`You are a helpful AI assistant with access to a knowledge base. 
      Answer queries using the provided context and maintain conversation continuity.`),
      new HumanMessage(prompt),
    ]);
    
    return {
      response: typeof response.content === 'string' ? response.content : 'I apologize, but I cannot generate a response at this time.',
      sources: state.retrievedDocuments || [],
    };
  }
  
  /**
   * Evaluate response quality
   */
  private async evaluateResponse(state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> {
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
      new SystemMessage('You are a response quality evaluator. Respond only with valid JSON.'),
      new HumanMessage(prompt),
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
  private async webSearch(state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> {
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
  private async finalResponse(state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> {
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
  private routeAfterGrading(state: typeof GraphState.State): string {
    const relevantDocs = state.retrievedDocuments?.length || 0;
    const attempts = state.retrievalAttempts?.length || 0;
    
    if (relevantDocs >= 2) {
      return 'generate';
    } else if (attempts < 3) {
      return 'reformulate';
    } else {
      return 'web_search';
    }
  }
  
  /**
   * Routing logic after response evaluation
   */
  private routeAfterEvaluation(state: typeof GraphState.State): string {
    const quality = state.qualityScore || 0;
    const iterations = state.iterationCount || 0;
    
    if (quality >= 0.7 || iterations >= 3) {
      return 'final';
    } else {
      return 'retry';
    }
  }
  
  /**
   * Generate helpful suggestions
   */
  private generateSuggestions(state: typeof GraphState.State): string[] {
    const suggestions: string[] = [];
    
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
  private parseJSONResponse(content: any): any {
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
    } catch (error) {
      console.error('[SelfReflectiveRAG]: Error parsing JSON response:', error);
      return {};
    }
  }
  
  /**
   * Main query processing method
   */
=======
>>>>>>> 89764ec2 (fix: Resolve three critical documentation system bugs)
  async processQuery(query: RAGQuery): Promise<RAGResponse> {
    try {
      console.log(`[SelfReflectiveRAG]: Processing query: "${query.query}" for user ${query.userId}`);
      
      // Search for relevant documents
      const searchResults = await vectorDatabaseService.semanticSearch(query.query, {
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
    } catch (error) {
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

export const selfReflectiveRAGService = new SelfReflectiveRAGService();