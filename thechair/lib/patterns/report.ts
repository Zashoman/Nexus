// Phase 1 patterns report builder. Blends a hardcoded baseline with any
// sessions submitted via the in-memory store so the UI shows movement in dev.
// Phase 4 replaces the hardcoded baseline with real aggregations + a nightly
// Anthropic phrase-clustering pass.

import type { PatternsReport } from '../types';
import { store } from '../mock-store';

export function buildPatternsReport(): PatternsReport {
  const sessions = store.listSessions();

  const tagCounts: Record<string, number> = {};
  for (const s of sessions) {
    for (const tag of s.tags) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
  }

  return {
    regime_distribution: [
      { regime: 'calm', count: 31 },
      { regime: 'elevated', count: 42 },
      { regime: 'stressed', count: 14 },
      { regime: 'dislocation', count: 3 },
    ],
    tag_frequency: Object.entries({
      waiting_for_confirmation: 12,
      not_yet: 9,
      conviction: 7,
      reducing: 4,
      adding: 3,
      waiting: 16,
      ...tagCounts,
    })
      .map(([tag, count]) => ({
        tag,
        count,
        regime_breakdown: { calm: 0, elevated: 0, stressed: 0, dislocation: 0 },
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    streak_current: 6,
    streak_longest: 23,
    thesis_execution_gap: { triggers_hit: 11, positions_entered: 4 },
    phrase_clusters: [
      { phrase: 'waiting for confirmation', count: 12 },
      { phrase: 'not yet', count: 9 },
      { phrase: 'let me see', count: 7 },
      { phrase: 'I should have', count: 5 },
      { phrase: 'next week', count: 4 },
    ],
    last_30_days: Array.from({ length: 30 }).map((_, i) => ({
      date: new Date(Date.now() - i * 86400000).toISOString(),
      regime: (['calm', 'elevated', 'stressed', 'dislocation'] as const)[i % 4],
      word_count: 120 + ((i * 17) % 200),
    })),
  };
}
