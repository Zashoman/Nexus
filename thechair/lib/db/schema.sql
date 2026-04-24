-- The Chair — SQLite schema
-- All timestamps stored as ISO 8601 UTC strings; display layer converts to LOCAL_TZ.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Sessions / journal entries
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_number INTEGER NOT NULL UNIQUE,         -- 1..300
  created_at TEXT NOT NULL,                       -- ISO 8601 UTC
  regime TEXT NOT NULL,                           -- 'calm' | 'elevated' | 'stressed' | 'dislocation'
  regime_score REAL NOT NULL,                     -- composite 0-100
  market_snapshot TEXT NOT NULL,                  -- JSON: all tile values at session start
  questions TEXT NOT NULL,                        -- JSON: array of questions
  answers TEXT NOT NULL,                          -- JSON: array of answers (parallel to questions)
  mentor_read TEXT,                               -- post-session summary
  word_count INTEGER NOT NULL,                    -- total words across answers
  tags TEXT,                                      -- JSON array of derived tags
  completed_at TEXT,                              -- null until submit
  backed_up_at TEXT                               -- null until Google Sheets synced
);
CREATE INDEX IF NOT EXISTS idx_sessions_regime ON sessions(regime);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);

-- Watchlist
CREATE TABLE IF NOT EXISTS watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker TEXT NOT NULL,
  thesis TEXT NOT NULL,
  trigger_price REAL,
  invalidator TEXT,
  entry_price REAL,                               -- price captured when added to The Chair
  entry_at TEXT,                                  -- when entry_price was set
  high_water_mark REAL,                           -- peak price tracked (52w high or all-time-since-added)
  high_water_mark_at TEXT,                        -- when high_water_mark was last updated
  levels_triggered TEXT NOT NULL DEFAULT '[]',    -- JSON array of crossed levels e.g. [25,30]
  added_at TEXT NOT NULL,
  archived_at TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

-- Thesis revisions (version history per name)
CREATE TABLE IF NOT EXISTS thesis_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  watchlist_id INTEGER NOT NULL REFERENCES watchlist(id),
  version INTEGER NOT NULL,
  thesis TEXT NOT NULL,
  trigger_price REAL,
  invalidator TEXT,
  created_at TEXT NOT NULL,
  reason TEXT
);

-- Market data time series
CREATE TABLE IF NOT EXISTS market_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  captured_at TEXT NOT NULL,
  vxn REAL,
  vxn_vix_ratio REAL,
  vix_term REAL,
  vvix REAL,
  qqq_skew_25d REAL,
  implied_corr REAL,
  realized_corr REAL,
  dealer_gamma REAL,
  equity_pc_5d REAL,
  hy_oas REAL,
  move_index REAL,
  ndx_pct_above_50dma REAL,
  ndx_top10_share REAL,
  nyse_new_highs INTEGER,
  nyse_new_lows INTEGER,
  list_iv_rank_above_90 INTEGER,
  regime TEXT NOT NULL,
  regime_score REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_snapshots_captured ON market_snapshots(captured_at);

-- Per-name IV and drawdown snapshots
CREATE TABLE IF NOT EXISTS watchlist_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  watchlist_id INTEGER NOT NULL REFERENCES watchlist(id),
  captured_at TEXT NOT NULL,
  price REAL NOT NULL,
  iv_rank REAL,
  hv_30d REAL,
  drawdown_52w REAL,
  pct_above_50dma INTEGER
);
CREATE INDEX IF NOT EXISTS idx_wl_snapshots_captured ON watchlist_snapshots(captured_at);

-- Alerts
-- One row per actionable event. The polling worker writes a row when a
-- watchlist name newly crosses one of the four drawdown levels (25/30/35/40)
-- below its high_water_mark, when its user-defined trigger_price fires, or
-- when a configured invalidator is met. UI surfaces unacknowledged rows.
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  watchlist_id INTEGER NOT NULL REFERENCES watchlist(id),
  kind TEXT NOT NULL,                             -- 'drawdown_level' | 'trigger_hit' | 'invalidator_hit'
  level INTEGER,                                  -- 25 | 30 | 35 | 40 when kind = 'drawdown_level'
  price REAL NOT NULL,
  drawdown_from_high REAL,
  captured_at TEXT NOT NULL,
  acknowledged_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_alerts_captured ON alerts(captured_at);
CREATE INDEX IF NOT EXISTS idx_alerts_unacked ON alerts(acknowledged_at) WHERE acknowledged_at IS NULL;

-- Settings / runtime state
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Migration tracking
CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL
);
