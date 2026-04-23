// Phase 2 entry point: turn today's context into the ordered list of questions.
// Phase 1 keeps the signature stable by reading from the mock bank, which itself
// is now watchlist-aware so every session is anchored on the names the user
// actually holds a view on.

import type { MentorQuestion, Regime, WatchlistItem } from '../types';
import { getMockQuestions } from './mock';

export interface MentorContext {
  regime: Regime;
  regime_score: number;
  market_tiles: Record<string, number | null>;
  watchlist: WatchlistItem[];
  recent_sessions: Array<{
    regime: Regime;
    tags: string[];
    word_count: number;
    created_at: string;
  }>;
  last_full_sessions: Array<{
    questions: MentorQuestion[];
    answers: string[];
  }>;
  ghost_tag_counts: Record<string, number>;
}

export async function buildQuestions(ctx: MentorContext): Promise<MentorQuestion[]> {
  return getMockQuestions(ctx.regime, ctx.watchlist);
}
