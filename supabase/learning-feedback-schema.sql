-- ============================================================
-- Draft Revisions — feedback learning loop
-- ============================================================
-- Stores every revision the team makes to a draft, along with
-- the feedback text. The agent queries this when generating new
-- drafts to learn from past corrections.
-- ============================================================

CREATE TABLE IF NOT EXISTS draft_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_draft_id UUID REFERENCES slack_drafts(id) ON DELETE SET NULL,

  -- Revision sequence (1 = first revision, 2 = second, etc.)
  revision_number INTEGER NOT NULL DEFAULT 1,

  -- The drafts before and after
  original_draft TEXT NOT NULL,
  revised_draft TEXT NOT NULL,

  -- The feedback that triggered the revision
  feedback_text TEXT NOT NULL,

  -- Context for retrieval
  persona_name TEXT,
  campaign_name TEXT,
  account_email TEXT,
  sender_email TEXT,

  -- Slack user who gave feedback
  slack_user_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_draft_revisions_persona
  ON draft_revisions(persona_name);

CREATE INDEX IF NOT EXISTS idx_draft_revisions_campaign
  ON draft_revisions(campaign_name);

CREATE INDEX IF NOT EXISTS idx_draft_revisions_account
  ON draft_revisions(account_email);

CREATE INDEX IF NOT EXISTS idx_draft_revisions_created
  ON draft_revisions(created_at DESC);

ALTER TABLE draft_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage draft_revisions"
  ON draft_revisions FOR ALL
  USING (true);

-- ============================================================
-- Apollo Searches — track sales prospect searches
-- ============================================================

CREATE TABLE IF NOT EXISTS apollo_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_name TEXT,
  filters JSONB NOT NULL,
  total_results INTEGER DEFAULT 0,
  prospects JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'searching', 'enriching', 'generating_openers',
    'ready', 'exported', 'failed'
  )),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apollo_searches_created
  ON apollo_searches(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_apollo_searches_status
  ON apollo_searches(status);

ALTER TABLE apollo_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage apollo_searches"
  ON apollo_searches FOR ALL
  USING (true);

-- ============================================================
-- Ingestion Jobs — track historical email ingestion runs
-- ============================================================

CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL DEFAULT 'historical_ingestion',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'completed', 'failed'
  )),
  emails_fetched INTEGER DEFAULT 0,
  emails_classified INTEGER DEFAULT 0,
  patterns_extracted INTEGER DEFAULT 0,
  campaigns_processed TEXT[] DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_created
  ON ingestion_jobs(created_at DESC);

ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage ingestion_jobs"
  ON ingestion_jobs FOR ALL
  USING (true);
