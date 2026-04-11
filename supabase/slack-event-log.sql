-- Debug table: logs every Slack event received by the app
CREATE TABLE IF NOT EXISTS slack_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT,
  event_data JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slack_event_log_received
  ON slack_event_log(received_at DESC);

ALTER TABLE slack_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage slack_event_log"
  ON slack_event_log FOR ALL
  USING (true);
