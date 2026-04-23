// Phase 2: scan prior session answers for phrase clusters that match today's
// context (e.g., "waiting" showed up in stressed regimes 12 times). Surfaces
// the top N into the mentor context so the question generator can cite them.

import type { Regime } from '../types';

export interface PriorMatch {
  phrase: string;
  count: number;
  regimes: Regime[];
}

export function findPriorMatches(
  _answers: string[][],
  _regime: Regime
): PriorMatch[] {
  // Phase 1: no-op. Phase 2: light regex-based clustering, optionally backed by
  // a nightly Anthropic call for phrase-level normalization.
  return [];
}
