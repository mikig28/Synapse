import { OpenAI } from 'openai';
import { IGraphNode, IDocumentRelationship, ISmartChunk } from '../models/Document';
import { vectorDatabaseService } from './vectorDatabaseService';
import mongoose from 'mongoose';

interface EntityExtractionResult {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  confidence: number;
  processingTime: number;
}

interface ExtractedEntity {
  id: string;
  entity: string;
  type: 'person' | 'place' | 'organization' | 'concept' | 'event' | 'product' | 'other';
  description?: string;
  confidence: number;
  mentions: EntityMention[];
  aliases: string[];
  attributes: Record<string, any>;
}

interface EntityMention {
  chunkId: string;
  position: number;
  context: string;
  confidence: number;
}

interface ExtractedRelationship {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: string;
  description: string;
  confidence: number;
  evidence: string[];
  attributes: Record<string, any>;
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
    documentTitle: string
  ): Promise<EntityExtractionResult> {
    const startTime = Date.now();
    
    try {
      console.log(`[GraphRAGService]: Extracting knowledge graph for document: ${documentTitle}`);
      
      const entities: ExtractedEntity[] = [];
      const relationships: ExtractedRelationship[] = [];
      
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
  
  private async extractEntitiesFromChunk(chunk: ISmartChunk): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];
    
<<<<<<< HEAD
    // Extract people
    const people = doc.people().out('array');
    people.forEach((person: any) => {
=======
    // Simple entity extraction using regex patterns
    const text = chunk.content;
    
    // Extract people (capitalized words, common name patterns)
    const peopleMatches = text.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g) || [];
    peopleMatches.forEach((match, index) => {
>>>>>>> 89764ec2 (fix: Resolve three critical documentation system bugs)
      entities.push({
        id: `person_${chunk.id}_${index}`,
        entity: match,
        type: 'person',
        confidence: 0.7,
        mentions: [{
          chunkId: chunk.id,
          position: text.indexOf(match),
          context: this.extractContext(text, match),
          confidence: 0.7,
        }],
        aliases: [],
        attributes: {},
      });
    });
    
<<<<<<< HEAD
    // Extract places
    const places = doc.places().out('array');
    places.forEach((place: any) => {
=======
    // Extract places (capitalized words with location indicators)
    const placeMatches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:City|State|Country|Street|Avenue|Road|University|Hospital|School))\b/g) || [];
    placeMatches.forEach((match, index) => {
>>>>>>> 89764ec2 (fix: Resolve three critical documentation system bugs)
      entities.push({
        id: `place_${chunk.id}_${index}`,
        entity: match,
        type: 'place',
        confidence: 0.6,
        mentions: [{
          chunkId: chunk.id,
          position: text.indexOf(match),
          context: this.extractContext(text, match),
          confidence: 0.6,
        }],
        aliases: [],
        attributes: {},
      });
    });
    
<<<<<<< HEAD
    // Extract organizations
    const organizations = doc.organizations().out('array');
    organizations.forEach((org: any) => {
=======
    // Extract organizations (capitalized words with org indicators)
    const orgMatches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|LLC|Corp|Company|Organization|Foundation|Institute|Association))\.?\b/g) || [];
    orgMatches.forEach((match, index) => {
>>>>>>> 89764ec2 (fix: Resolve three critical documentation system bugs)
      entities.push({
        id: `org_${chunk.id}_${index}`,
        entity: match,
        type: 'organization',
        confidence: 0.8,
        mentions: [{
          chunkId: chunk.id,
          position: text.indexOf(match),
          context: this.extractContext(text, match),
          confidence: 0.8,
        }],
        aliases: [],
        attributes: {},
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
  
  private deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const uniqueEntities: ExtractedEntity[] = [];
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
  
  private async extractRelationships(
    entities: ExtractedEntity[],
    chunks: ISmartChunk[]
  ): Promise<ExtractedRelationship[]> {
    const relationships: ExtractedRelationship[] = [];
    
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
            relationshipType: 'co_occurs_with',
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
  
  private calculateOverallConfidence(entities: ExtractedEntity[], relationships: ExtractedRelationship[]): number {
    if (entities.length === 0) return 0;
    
    const entityConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length;
    const relationshipConfidence = relationships.length > 0 
      ? relationships.reduce((sum, r) => sum + r.confidence, 0) / relationships.length 
      : 0;
    
    return (entityConfidence + relationshipConfidence) / 2;
  }
  
  convertToGraphNodes(entities: ExtractedEntity[]): IGraphNode[] {
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