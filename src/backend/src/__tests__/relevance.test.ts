import { describe, it, expect } from 'vitest';
import { scoreRelevance } from '../services/relevance';

describe('scoreRelevance', () => {
  it('returns 0 for empty inputs', () => {
    expect(scoreRelevance('', [])).toBe(0);
  });

  it('scores higher when more keywords present', () => {
    const text = 'AI agents using TypeScript and YouTube API integration';
    const low = scoreRelevance(text, ['python']);
    const mid = scoreRelevance(text, ['typescript']);
    const high = scoreRelevance(text, ['typescript', 'youtube']);
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThanOrEqual(mid);
  });
});


