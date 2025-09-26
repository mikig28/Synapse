
import { describe, it, expect } from '@jest/globals';
import { scoreRelevance } from '../services/relevance';

describe.skip('scoreRelevance', () => {
  it('returns higher scores for exact matches', () => {
    const query = 'project roadmap';
    const exact = 'project roadmap';
    const partial = 'roadmap for project alpha';
    const unrelated = 'budget report';

    const exactScore = scoreRelevance(query, exact);
    const partialScore = scoreRelevance(query, partial);
    const unrelatedScore = scoreRelevance(query, unrelated);

    expect(exactScore).toBeGreaterThan(partialScore);
    expect(partialScore).toBeGreaterThan(unrelatedScore);
  });
});
