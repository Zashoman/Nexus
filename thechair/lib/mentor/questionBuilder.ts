// Phase 2 entry point: turn today's context into the ordered list of questions.
// Phase 1 keeps the signature stable by reading from the mock bank.

import type { MentorQuestion, Regime } from '../types';
import { getMockQuestions } from './mock';

export interface MentorContext {
  regime: Regime;
  regime_score: number;
  market_tiles: Record<string, number | null>;
  watchlist: Array<{
    ticker: string;
    price: number;
    drawdown_52w: number;
    iv_rank: number;
    trigger_hit: boolean;
    thesis: string;
  }>;
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
  // Phase 2 will call Anthropic with regime-specific system prompt + structured ctx.
  return getMockQuestions(ctx.regime);
}
