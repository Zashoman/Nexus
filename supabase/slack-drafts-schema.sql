-- ============================================================
-- Slack Draft Tracking Table
-- ============================================================
-- Stores the context for each draft posted to Slack so we can
-- regenerate it with feedback from thread replies.
-- ============================================================

CREATE TABLE IF NOT EXISTS slack_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_channel TEXT NOT NULL,
  slack_message_ts TEXT NOT NULL,

  -- Email source data
  email_id TEXT,
  sender_name TEXT,
  sender_email TEXT,
  subject TEXT,
  reply_text TEXT,
  thread_html TEXT,
  campaign_name TEXT,
  account_email TEXT,

  -- Draft state
  current_draft TEXT NOT NULL,
  original_draft TEXT,
  revision_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'skipped', 'snoozed', 'sent'
  )),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_slack_drafts_message
  ON slack_drafts(slack_channel, slack_message_ts);

CREATE INDEX IF NOT EXISTS idx_slack_drafts_status
  ON slack_drafts(status);

CREATE INDEX IF NOT EXISTS idx_slack_drafts_created
  ON slack_drafts(created_at DESC);

-- Allow service role to access (the API uses service role)
ALTER TABLE slack_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage slack_drafts"
  ON slack_drafts FOR ALL
  USING (true);
