export function scoreRelevance(text: string, keywords: string[]): number {
  if (!text || keywords.length === 0) return 0;
  const hay = text.toLowerCase();
  const set = new Set<string>();
  for (const k of keywords) {
    const kw = (k || '').toLowerCase().trim();
    if (kw) set.add(kw);
  }
  if (set.size === 0) return 0;

  let hits = 0;
  for (const kw of set) {
    if (hay.includes(kw)) hits += 1;
  }

  const raw = hits / set.size; // 0..1 coverage
  // Simple boost for multiple mentions
  const mentionCount = Array.from(set).reduce((acc, kw) => acc + (hay.split(kw).length - 1), 0);
  const boosted = raw + Math.min(mentionCount * 0.05, 0.5); // cap boost
  return Math.max(0, Math.min(1, boosted));
}


