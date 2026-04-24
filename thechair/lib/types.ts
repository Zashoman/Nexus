export type Regime = 'calm' | 'elevated' | 'stressed' | 'dislocation';

export interface MarketTile {
  key: string;
  label: string;
  value: string;          // display value, preformatted
  raw: number | null;     // raw numeric for charts
  percentile?: number;    // 0-100 within 5Y lookback
  direction?: 'up' | 'down' | 'flat';
  duration?: string;      // "3d ↑", etc.
  stale?: boolean;
  note?: string;          // metric definition, surfaced in info tooltip
  description?: string;   // "what it's doing right now" one-liner
}

export interface MarketSnapshot {
  captured_at: string;
  regime: Regime;
  regime_score: number;
  tiles: MarketTile[];
  sub_signals: Record<string, number>; // 0-100 contribution per sub-signal
}

// Default drawdown alert thresholds in negative percent off the high-water mark.
// The live levels are stored in the `settings` table and editable from /settings;
// this constant is only the factory default used on first boot.
export const DEFAULT_DRAWDOWN_LEVELS: readonly number[] = [25, 30, 35, 40];

// Kept for backwards compatibility with earlier wiring; new code should call
// store.getDrawdownLevels() so user edits are respected.
export const DRAWDOWN_LEVELS = DEFAULT_DRAWDOWN_LEVELS as readonly [25, 30, 35, 40];
export type DrawdownLevel = number;

export interface WatchlistItem {
  id: number;
  ticker: string;
  thesis: string;
  trigger_price: number | null;
  invalidator: string | null;
  entry_price: number | null;
  entry_at: string | null;
  high_water_mark: number | null;     // peak price tracked since added (or 52w high)
  high_water_mark_at: string | null;  // when the high was set
  added_at: string;
  archived_at: string | null;
  active: boolean;
  // Enriched (optional, present on detail/list endpoints)
  price?: number;
  change_1d?: number;
  iv_rank?: number;
  drawdown_52w?: number;
  drawdown_from_entry?: number;
  drawdown_from_high?: number;        // signed % vs high_water_mark — the buy-zone signal
  levels_triggered?: DrawdownLevel[]; // which thresholds have been crossed since added
  deepest_level?: DrawdownLevel;      // the most-extreme level currently active
  trigger_hit?: boolean;              // user-defined trigger_price hit
}

export interface Alert {
  id: number;
  watchlist_id: number;
  ticker: string;
  kind: 'drawdown_level' | 'trigger_hit' | 'invalidator_hit';
  level?: DrawdownLevel;          // present when kind === 'drawdown_level'
  price: number;
  drawdown_from_high?: number;
  captured_at: string;
  acknowledged_at: string | null;
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
