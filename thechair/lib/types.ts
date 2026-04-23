export type Regime = 'calm' | 'elevated' | 'stressed' | 'dislocation';

export interface MarketTile {
  key: string;
  label: string;
  value: string;        // display value, preformatted
  raw: number | null;   // raw numeric for charts
  percentile?: number;  // 0-100 within 5Y lookback
  direction?: 'up' | 'down' | 'flat';
  duration?: string;    // "3d above 75", etc.
  stale?: boolean;
  note?: string;
}

export interface MarketSnapshot {
  captured_at: string;
  regime: Regime;
  regime_score: number;
  tiles: MarketTile[];
  sub_signals: Record<string, number>; // 0-100 contribution per sub-signal
}

export interface WatchlistItem {
  id: number;
  ticker: string;
  thesis: string;
  trigger_price: number | null;
  invalidator: string | null;
  added_at: string;
  archived_at: string | null;
  active: boolean;
  // Enriched (optional, present on detail/list endpoints)
  price?: number;
  iv_rank?: number;
  drawdown_52w?: number;
  trigger_hit?: boolean;
}

export interface MentorQuestion {
  n: number;
  text: string;
  highlight_terms?: string[];
}

export interface MentorRead {
  text: string;
  flagged_patterns?: string[];
  watch_for?: string;
}

export interface Session {
  id: number;
  session_number: number;
  created_at: string;
  regime: Regime;
  regime_score: number;
  market_snapshot: MarketSnapshot;
  questions: MentorQuestion[];
  answers: string[];
  mentor_read: MentorRead | null;
  word_count: number;
  tags: string[];
  completed_at: string | null;
  backed_up_at: string | null;
}

export interface PatternsReport {
  regime_distribution: Array<{ regime: Regime; count: number }>;
  tag_frequency: Array<{ tag: string; count: number; regime_breakdown: Record<Regime, number> }>;
  streak_current: number;
  streak_longest: number;
  thesis_execution_gap: { triggers_hit: number; positions_entered: number };
  phrase_clusters: Array<{ phrase: string; count: number }>;
  last_30_days: Array<{ date: string; regime: Regime; word_count: number }>;
}
