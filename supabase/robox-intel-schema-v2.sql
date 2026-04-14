-- RoboX Intel Schema v2
-- Adds: signal notes, snooze, history trail, digest recipients table,
-- scoring config table.
--
-- Idempotent: safe to re-run.

-- ============================================
-- Add notes and snooze columns to signals
-- ============================================
ALTER TABLE robox_signals
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_robox_signals_snoozed_until
  ON robox_signals(snoozed_until)
  WHERE snoozed_until IS NOT NULL;

-- ============================================
-- Signal history trail
-- ============================================
CREATE TABLE IF NOT EXISTS robox_signal_history (
  id            SERIAL PRIMARY KEY,
  signal_id     INTEGER NOT NULL REFERENCES robox_signals(id) ON DELETE CASCADE,
  event_type    VARCHAR(30) NOT NULL, -- 'created','status_change','relevance_change','note_added','snoozed','unsnoozed','auto_archived'
  from_value    TEXT,
  to_value      TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_robox_signal_history_signal_id
  ON robox_signal_history(signal_id, created_at DESC);

ALTER TABLE robox_signal_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all access to robox_signal_history"
    ON robox_signal_history FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- Platform settings (singleton row with key/value pairs)
-- ============================================
CREATE TABLE IF NOT EXISTS robox_settings (
  key           VARCHAR(100) PRIMARY KEY,
  value         JSONB NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE robox_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all access to robox_settings"
    ON robox_settings FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed default settings
INSERT INTO robox_settings (key, value)
VALUES
  ('auto_archive_days',      '30'::jsonb),
  ('llm_enabled',            'true'::jsonb),
  ('velocity_threshold',     '3'::jsonb),
  ('velocity_window_hours',  '24'::jsonb),
  ('digest_recipients',      '[]'::jsonb),
  ('digest_send_time_utc',   '"08:00"'::jsonb)
ON CONFLICT (key) DO NOTHING;
