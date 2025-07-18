import { OpenAI } from 'openai';
import { ISmartChunk, IGraphNode } from '../models/Document';

interface KnowledgeGraphResult {
  entities: IGraphNode[];
  relationships: any[];
  confidence: number;
  processingTime: number;
}

export class GraphRAGService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async extractKnowledgeGraph(
    chunks: ISmartChunk[],
    documentId: string,
    documentTitle?: string
  ): Promise<KnowledgeGraphResult> {
    const startTime = Date.now();
    
    try {
      console.log(`[GraphRAGService]: Extracting knowledge graph for document: ${documentTitle}`);
      
      const entities: IGraphNode[] = [];
      const relationships: any[] = [];
      
      // Extract entities from each chunk
      for (const chunk of chunks) {
        const chunkEntities = await this.extractEntitiesFromChunk(chunk);
        entities.push(...chunkEntities);
      }
      
      // Remove duplicates and merge similar entities
      const uniqueEntities = this.deduplicateEntities(entities);
      
      // Extract relationships between entities
      const extractedRelationships = await this.extractRelationships(uniqueEntities, chunks);
      relationships.push(...extractedRelationships);
      
      const processingTime = Date.now() - startTime;
      console.log(`[GraphRAGService]: Extracted ${uniqueEntities.length} entities and ${relationships.length} relationships`);
      
      return {
        entities: uniqueEntities,
        relationships,
        confidence: this.calculateOverallConfidence(uniqueEntities, relationships),
        processingTime,
      };
    } catch (error) {
      console.error('[GraphRAGService]: Error extracting knowledge graph:', error);
      return {
        entities: [],
        relationships: [],
        confidence: 0,
        processingTime: Date.now() - startTime,
      };
    }
  }

  private async extractEntitiesFromChunk(chunk: ISmartChunk): Promise<IGraphNode[]> {
    const entities: IGraphNode[] = [];
    const text = chunk.content;

    // Simple pattern-based entity extraction
    // In production, use more sophisticated NLP libraries
    
    // Extract person names (capitalized words)
    const personMatches = text.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g) || [];
    personMatches.forEach((match, index) => {
      entities.push({
        id: `person_${chunk.id}_${index}`,
        entity: match,
        type: 'person',
        confidence: 0.7,
        mentions: [{
          chunkId: chunk.id,
          position: text.indexOf(match),
          context: this.extractContext(text, match),
        }],
        relationships: [],
      });
    });

    // Extract organizations (words ending with common org suffixes)
    const orgMatches = text.match(/\b[A-Z][a-zA-Z]*\s+(Inc|Corp|LLC|Ltd|Company|Organization)\b/g) || [];
    orgMatches.forEach((match, index) => {
      entities.push({
        id: `org_${chunk.id}_${index}`,
        entity: match,
        type: 'organization',
        confidence: 0.8,
        mentions: [{
          chunkId: chunk.id,
          position: text.indexOf(match),
          context: this.extractContext(text, match),
        }],
        relationships: [],
      });
    });

    // Extract locations (capitalized place names)
    const locationMatches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:City|State|Country|Street|Avenue|Road))\b/g) || [];
    locationMatches.forEach((match, index) => {
      entities.push({
        id: `place_${chunk.id}_${index}`,
        entity: match,
        type: 'place',
        confidence: 0.6,
        mentions: [{
          chunkId: chunk.id,
          position: text.indexOf(match),
          context: this.extractContext(text, match),
        }],
        relationships: [],
      });
    });

    return entities;
  }

  private extractContext(text: string, entity: string): string {
    const index = text.indexOf(entity);
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + entity.length + 50);
    return text.substring(start, end);
  }

  private deduplicateEntities(entities: IGraphNode[]): IGraphNode[] {
    const uniqueEntities: IGraphNode[] = [];
    const seen = new Set<string>();

    for (const entity of entities) {
      const key = `${entity.type}_${entity.entity.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueEntities.push(entity);
      } else {
        // Merge with existing entity
        const existing = uniqueEntities.find(e => 
          e.type === entity.type && 
          e.entity.toLowerCase() === entity.entity.toLowerCase()
        );
        if (existing) {
          existing.mentions.push(...entity.mentions);
          existing.confidence = Math.max(existing.confidence, entity.confidence);
        }
      }
    }

    return uniqueEntities;
  }

  private async extractRelationships(entities: IGraphNode[], chunks: ISmartChunk[]): Promise<any[]> {
    const relationships: any[] = [];

    // Simple relationship extraction based on co-occurrence in same chunk
    for (const chunk of chunks) {
      const chunkEntities = entities.filter(e => 
        e.mentions.some(m => m.chunkId === chunk.id)
      );

      // Create relationships between entities in the same chunk
      for (let i = 0; i < chunkEntities.length; i++) {
        for (let j = i + 1; j < chunkEntities.length; j++) {
          const sourceEntity = chunkEntities[i];
          const targetEntity = chunkEntities[j];

          relationships.push({
            id: `rel_${sourceEntity.id}_${targetEntity.id}`,
            sourceEntityId: sourceEntity.id,
            targetEntityId: targetEntity.id,
            relationshipType: 'similar',
            description: `${sourceEntity.entity} and ${targetEntity.entity} appear together`,
            confidence: 0.5,
            evidence: [chunk.content.substring(0, 100) + '...'],
            attributes: {
              chunkId: chunk.id,
            },
          });
        }
      }
    }

    return relationships;
  }

  private calculateOverallConfidence(entities: IGraphNode[], relationships: any[]): number {
    if (entities.length === 0) return 0;

    const entityConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length;
    const relationshipConfidence = relationships.length > 0 
      ? relationships.reduce((sum, r) => sum + (r.confidence || 0.5), 0) / relationships.length 
      : 0;

    return (entityConfidence + relationshipConfidence) / 2;
  }

  convertToGraphNodes(entities: IGraphNode[]): IGraphNode[] {
    return entities.map(entity => ({
      id: entity.id,
      entity: entity.entity,
      type: entity.type,
      description: entity.description,
      confidence: entity.confidence,
      mentions: entity.mentions,
      relationships: [], // Will be populated separately
    }));
  }
}

export const graphRAGService = new GraphRAGService();