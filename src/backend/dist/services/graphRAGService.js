"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphRAGService = exports.GraphRAGService = void 0;
const openai_1 = require("openai");
const uuid_1 = require("uuid");
const compromise_1 = __importDefault(require("compromise"));
class GraphRAGService {
    constructor() {
        this.entityCache = new Map();
        this.relationshipCache = new Map();
        this.openai = new openai_1.OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    /**
     * Extract entities and relationships from document chunks
     */
    async extractKnowledgeGraph(chunks, documentId, documentTitle) {
        try {
            console.log(`[GraphRAG]: Extracting knowledge graph from ${chunks.length} chunks`);
            const startTime = Date.now();
            const allEntities = [];
            const allRelationships = [];
            // Process chunks in parallel for better performance
            const chunkPromises = chunks.map(chunk => this.processChunk(chunk, documentId, documentTitle));
            const chunkResults = await Promise.all(chunkPromises);
            // Combine results
            chunkResults.forEach(result => {
                allEntities.push(...result.entities);
                allRelationships.push(...result.relationships);
            });
            // Entity resolution and deduplication
            const resolvedEntities = await this.resolveEntities(allEntities);
            const resolvedRelationships = await this.resolveRelationships(allRelationships, resolvedEntities);
            // Cross-chunk relationship detection
            const crossChunkRelationships = await this.detectCrossChunkRelationships(resolvedEntities, chunks);
            const finalRelationships = [...resolvedRelationships, ...crossChunkRelationships];
            const processingTime = Date.now() - startTime;
            return {
                entities: resolvedEntities,
                relationships: finalRelationships,
                confidence: this.calculateOverallConfidence(resolvedEntities, finalRelationships),
                processingTime,
            };
        }
        catch (error) {
            console.error('[GraphRAG]: Error extracting knowledge graph:', error);
            throw error;
        }
    }
    /**
     * Process individual chunk for entity and relationship extraction
     */
    async processChunk(chunk, documentId, documentTitle) {
        const entities = await this.extractEntitiesFromChunk(chunk);
        const relationships = await this.extractRelationshipsFromChunk(chunk, entities);
        return { entities, relationships };
    }
    /**
     * Extract entities from a single chunk
     */
    async extractEntitiesFromChunk(chunk) {
        try {
            // First, use NLP library for quick entity detection
            const nlpEntities = this.extractEntitiesWithNLP(chunk);
            // Then use LLM for more sophisticated extraction
            const llmEntities = await this.extractEntitiesWithLLM(chunk);
            // Combine and deduplicate
            const combinedEntities = this.combineEntityResults(nlpEntities, llmEntities, chunk);
            return combinedEntities;
        }
        catch (error) {
            console.error('[GraphRAG]: Error extracting entities from chunk:', error);
            return [];
        }
    }
    /**
     * Extract entities using NLP library
     */
    extractEntitiesWithNLP(chunk) {
        const entities = [];
        const doc = (0, compromise_1.default)(chunk.content);
        // Extract people
        const people = doc.people().out('array');
<<<<<<< HEAD
        people.forEach((person) => {
=======
        people.forEach(person => {
>>>>>>> 89764ec2 (fix: Resolve three critical documentation system bugs)
            entities.push({
                id: (0, uuid_1.v4)(),
                entity: person,
                type: 'person',
                confidence: 0.7,
                mentions: [{
                        chunkId: chunk.id,
                        position: chunk.content.indexOf(person),
                        context: this.extractContext(chunk.content, person),
                        confidence: 0.7,
                    }],
                aliases: [],
                attributes: {},
            });
        });
        // Extract places
        const places = doc.places().out('array');
<<<<<<< HEAD
        places.forEach((place) => {
=======
        places.forEach(place => {
>>>>>>> 89764ec2 (fix: Resolve three critical documentation system bugs)
            entities.push({
                id: (0, uuid_1.v4)(),
                entity: place,
                type: 'place',
                confidence: 0.7,
                mentions: [{
                        chunkId: chunk.id,
                        position: chunk.content.indexOf(place),
                        context: this.extractContext(chunk.content, place),
                        confidence: 0.7,
                    }],
                aliases: [],
                attributes: {},
            });
        });
        // Extract organizations
        const organizations = doc.organizations().out('array');
<<<<<<< HEAD
        organizations.forEach((org) => {
=======
        organizations.forEach(org => {
>>>>>>> 89764ec2 (fix: Resolve three critical documentation system bugs)
            entities.push({
                id: (0, uuid_1.v4)(),
                entity: org,
                type: 'organization',
                confidence: 0.7,
                mentions: [{
                        chunkId: chunk.id,
                        position: chunk.content.indexOf(org),
                        context: this.extractContext(chunk.content, org),
                        confidence: 0.7,
                    }],
                aliases: [],
                attributes: {},
            });
        });
        return entities;
    }
    /**
     * Extract entities using LLM
     */
    async extractEntitiesWithLLM(chunk) {
        const prompt = `
Extract entities from this text chunk:

"${chunk.content}"

Instructions:
1. Identify all significant entities (people, places, organizations, concepts, events, products)
2. Provide entity type, description, and confidence score
3. Include context where each entity appears
4. Focus on entities that are important for understanding the text

Return JSON array:
[
  {
    "entity": "Entity Name",
    "type": "person|place|organization|concept|event|product|other",
    "description": "Brief description of the entity",
    "confidence": 0.8,
    "context": "Context where entity appears",
    "attributes": {
      "key": "value"
    }
  }
]
`;
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert entity extraction system. Extract entities from text and return valid JSON.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.1,
            max_tokens: 2000,
        });
        const entities = this.parseJSONResponse(response.choices[0].message.content);
        return entities.map((entity) => ({
            id: (0, uuid_1.v4)(),
            entity: entity.entity,
            type: entity.type || 'other',
            description: entity.description,
            confidence: entity.confidence || 0.5,
            mentions: [{
                    chunkId: chunk.id,
                    position: chunk.content.indexOf(entity.entity),
                    context: entity.context || this.extractContext(chunk.content, entity.entity),
                    confidence: entity.confidence || 0.5,
                }],
            aliases: [],
            attributes: entity.attributes || {},
        }));
    }
    /**
     * Extract relationships from a chunk
     */
    async extractRelationshipsFromChunk(chunk, entities) {
        if (entities.length < 2)
            return [];
        const prompt = `
Extract relationships between entities in this text:

Text: "${chunk.content}"

Entities: ${entities.map(e => e.entity).join(', ')}

Instructions:
1. Identify relationships between the entities
2. Provide relationship type and description
3. Include confidence score and evidence
4. Focus on meaningful relationships only

Return JSON array:
[
  {
    "sourceEntity": "Entity 1",
    "targetEntity": "Entity 2",
    "relationshipType": "works_for|located_in|part_of|related_to|etc",
    "description": "Description of the relationship",
    "confidence": 0.8,
    "evidence": ["Supporting text from the document"]
  }
]
`;
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert relationship extraction system. Extract relationships between entities and return valid JSON.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.1,
            max_tokens: 1500,
        });
        const relationships = this.parseJSONResponse(response.choices[0].message.content);
        return relationships.map((rel) => {
            const sourceEntity = entities.find(e => e.entity === rel.sourceEntity);
            const targetEntity = entities.find(e => e.entity === rel.targetEntity);
            if (!sourceEntity || !targetEntity)
                return null;
            return {
                id: (0, uuid_1.v4)(),
                sourceEntityId: sourceEntity.id,
                targetEntityId: targetEntity.id,
                relationshipType: rel.relationshipType,
                description: rel.description,
                confidence: rel.confidence || 0.5,
                evidence: rel.evidence || [],
                attributes: {},
            };
        }).filter(Boolean);
    }
    /**
     * Resolve and deduplicate entities
     */
    async resolveEntities(entities) {
        const entityGroups = new Map();
        // Group similar entities
        for (const entity of entities) {
            const key = entity.entity.toLowerCase().trim();
            if (!entityGroups.has(key)) {
                entityGroups.set(key, []);
            }
            entityGroups.get(key).push(entity);
        }
        const resolvedEntities = [];
        // Resolve each group
        for (const [key, group] of entityGroups) {
            if (group.length === 1) {
                resolvedEntities.push(group[0]);
            }
            else {
                const resolved = await this.resolveEntityGroup(group);
                resolvedEntities.push(resolved);
            }
        }
        return resolvedEntities;
    }
    /**
     * Resolve a group of similar entities
     */
    async resolveEntityGroup(entities) {
        // Merge entities with same name
        const canonical = entities[0];
        // Combine mentions
        const allMentions = [];
        const allAliases = [];
        const allAttributes = {};
        entities.forEach(entity => {
            allMentions.push(...entity.mentions);
            allAliases.push(...entity.aliases);
            Object.assign(allAttributes, entity.attributes);
        });
        // Calculate average confidence
        const avgConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length;
        return {
            id: canonical.id,
            entity: canonical.entity,
            type: canonical.type,
            description: canonical.description,
            confidence: avgConfidence,
            mentions: allMentions,
            aliases: [...new Set(allAliases)],
            attributes: allAttributes,
        };
    }
    /**
     * Resolve relationships
     */
    async resolveRelationships(relationships, entities) {
        // Remove duplicate relationships
        const uniqueRelationships = new Map();
        relationships.forEach(rel => {
            const key = `${rel.sourceEntityId}-${rel.targetEntityId}-${rel.relationshipType}`;
            if (!uniqueRelationships.has(key)) {
                uniqueRelationships.set(key, rel);
            }
            else {
                // Merge evidence
                const existing = uniqueRelationships.get(key);
                existing.evidence.push(...rel.evidence);
                existing.confidence = Math.max(existing.confidence, rel.confidence);
            }
        });
        return Array.from(uniqueRelationships.values());
    }
    /**
     * Detect relationships across chunks
     */
    async detectCrossChunkRelationships(entities, chunks) {
        const crossChunkRelationships = [];
        // Find entities that appear in multiple chunks
        const entityChunkMap = new Map();
        entities.forEach(entity => {
            entity.mentions.forEach(mention => {
                if (!entityChunkMap.has(entity.id)) {
                    entityChunkMap.set(entity.id, []);
                }
                if (!entityChunkMap.get(entity.id).includes(mention.chunkId)) {
                    entityChunkMap.get(entity.id).push(mention.chunkId);
                }
            });
        });
        // Analyze co-occurrence patterns
        const coOccurrences = this.analyzeCoOccurrences(entities, entityChunkMap);
        // Generate relationships for strong co-occurrences
        for (const [entityPair, strength] of coOccurrences) {
            if (strength > 0.5) {
                const [entity1Id, entity2Id] = entityPair.split('-');
                const entity1 = entities.find(e => e.id === entity1Id);
                const entity2 = entities.find(e => e.id === entity2Id);
                if (entity1 && entity2) {
                    const relationship = await this.inferRelationship(entity1, entity2, chunks);
                    if (relationship) {
                        crossChunkRelationships.push(relationship);
                    }
                }
            }
        }
        return crossChunkRelationships;
    }
    /**
     * Analyze co-occurrence patterns
     */
    analyzeCoOccurrences(entities, entityChunkMap) {
        const coOccurrences = new Map();
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const entity1 = entities[i];
                const entity2 = entities[j];
                const chunks1 = entityChunkMap.get(entity1.id) || [];
                const chunks2 = entityChunkMap.get(entity2.id) || [];
                const intersection = chunks1.filter(c => chunks2.includes(c));
                const union = [...new Set([...chunks1, ...chunks2])];
                const jaccardSimilarity = intersection.length / union.length;
                if (jaccardSimilarity > 0) {
                    const key = `${entity1.id}-${entity2.id}`;
                    coOccurrences.set(key, jaccardSimilarity);
                }
            }
        }
        return coOccurrences;
    }
    /**
     * Infer relationship between entities
     */
    async inferRelationship(entity1, entity2, chunks) {
        // Get contexts where both entities appear
        const sharedContexts = chunks.filter(chunk => chunk.content.includes(entity1.entity) && chunk.content.includes(entity2.entity));
        if (sharedContexts.length === 0)
            return null;
        const context = sharedContexts.map(c => c.content).join('\n\n');
        const prompt = `
Analyze the relationship between these entities based on the context:

Entity 1: ${entity1.entity} (${entity1.type})
Entity 2: ${entity2.entity} (${entity2.type})

Context:
${context.substring(0, 1000)}

Determine if there's a meaningful relationship and return JSON:
{
  "hasRelationship": true,
  "relationshipType": "works_for|located_in|part_of|related_to|etc",
  "description": "Description of the relationship",
  "confidence": 0.8,
  "evidence": ["Supporting text"]
}
`;
        const response = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert at inferring relationships between entities. Return valid JSON.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.1,
            max_tokens: 500,
        });
        const result = this.parseJSONResponse(response.choices[0].message.content);
        if (result.hasRelationship) {
            return {
                id: (0, uuid_1.v4)(),
                sourceEntityId: entity1.id,
                targetEntityId: entity2.id,
                relationshipType: result.relationshipType,
                description: result.description,
                confidence: result.confidence || 0.5,
                evidence: result.evidence || [],
                attributes: {},
            };
        }
        return null;
    }
    /**
     * Generate graph summary
     */
    async generateGraphSummary(entities, relationships, documentTitle) {
        const keyEntities = entities
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 10)
            .map(e => e.entity);
        const keyRelationships = relationships
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 10)
            .map(r => r.description);
        const prompt = `
Generate a concise summary of this knowledge graph:

Document: ${documentTitle}
Key Entities: ${keyEntities.join(', ')}
Key Relationships: ${keyRelationships.join(', ')}

Provide:
1. A brief description of what the document is about
2. Main topics covered
3. Key insights from the entity relationships

Return JSON:
{
  "description": "Brief description",
  "topics": ["topic1", "topic2"],
  "keyInsights": ["insight1", "insight2"],
  "confidence": 0.8
}
`;
        const response = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert at summarizing knowledge graphs. Return valid JSON.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.1,
            max_tokens: 500,
        });
        const result = this.parseJSONResponse(response.choices[0].message.content);
        return {
            title: documentTitle,
            description: result.description || 'No description available',
            keyEntities,
            keyRelationships,
            topics: result.topics || [],
            confidence: result.confidence || 0.5,
        };
    }
    /**
     * Convert to IGraphNode format
     */
    convertToGraphNodes(entities) {
        return entities.map(entity => ({
            id: entity.id,
            entity: entity.entity,
            type: entity.type,
            description: entity.description,
            confidence: entity.confidence,
            mentions: entity.mentions,
            relationships: [], // Will be populated from relationships
        }));
    }
    /**
     * Convert to IDocumentRelationship format
     */
    convertToDocumentRelationships(relationships, documentId) {
        // This would convert entity relationships to document relationships
        // For now, return empty array as document relationships are different
        return [];
    }
    /**
     * Helper methods
     */
    extractContext(text, entity) {
        const index = text.indexOf(entity);
        const start = Math.max(0, index - 50);
        const end = Math.min(text.length, index + entity.length + 50);
        return text.substring(start, end);
    }
    combineEntityResults(nlpEntities, llmEntities, chunk) {
        const combined = [...nlpEntities, ...llmEntities];
        // Simple deduplication based on entity name
        const unique = new Map();
        combined.forEach(entity => {
            const key = entity.entity.toLowerCase().trim();
            if (!unique.has(key)) {
                unique.set(key, entity);
            }
            else {
                // Merge information
                const existing = unique.get(key);
                existing.confidence = Math.max(existing.confidence, entity.confidence);
                existing.mentions.push(...entity.mentions);
            }
        });
        return Array.from(unique.values());
    }
    calculateOverallConfidence(entities, relationships) {
        if (entities.length === 0)
            return 0;
        const entityConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length;
        const relationshipConfidence = relationships.length > 0
            ? relationships.reduce((sum, r) => sum + r.confidence, 0) / relationships.length
            : 0;
        return (entityConfidence + relationshipConfidence) / 2;
    }
    parseJSONResponse(content) {
        try {
            if (typeof content === 'string') {
                const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                    content.match(/\{[\s\S]*\}/) ||
                    content.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[1] || jsonMatch[0]);
                }
                return JSON.parse(content);
            }
            return content;
        }
        catch (error) {
            console.error('[GraphRAG]: Error parsing JSON response:', error);
            return [];
        }
    }
}
exports.GraphRAGService = GraphRAGService;
// Export singleton instance
exports.graphRAGService = new GraphRAGService();
