-- ============================================================
-- Blue Tree Brain — Demo-ready upgrades
-- ============================================================
-- Two new tables added for the team-demo workflow:
--   1. instantly_queue     — stages approved pitches for review
--                            before they're imported into an
--                            Instantly campaign. Respects the
--                            read-only safety rail on the
--                            existing Instantly API client.
--   2. demo_feedback       — captures team feedback on each
--                            feature during live demos. Powers
--                            the /outreach/demo hub.
-- ============================================================

-- ------------------------------------------------------------
-- 1. instantly_queue
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS instantly_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Prospect snapshot (we keep the full record so the queue
  -- survives if the upstream pitch_studio_prospects sessionStorage is cleared)
  prospect_id TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  title TEXT,
  organization_name TEXT,
  organization_industry TEXT,

  -- Draft
  subject TEXT,
  opener TEXT,

  -- Target campaign
  instantly_campaign_id TEXT,
  instantly_campaign_name TEXT,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'exported', 'imported', 'skipped'
  )),
  queued_by TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instantly_queue_status
  ON instantly_queue(status);
CREATE INDEX IF NOT EXISTS idx_instantly_queue_campaign
  ON instantly_queue(instantly_campaign_id);
CREATE INDEX IF NOT EXISTS idx_instantly_queue_created
  ON instantly_queue(created_at DESC);

-- ------------------------------------------------------------
-- 2. demo_feedback
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS demo_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  feature_key TEXT NOT NULL,      -- e.g. 'inbox', 'sales', 'learning', etc.
  feature_label TEXT,              -- human-readable label shown on the hub
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  what_works TEXT,
  what_is_missing TEXT,
  would_use TEXT,                  -- free text: "yes/no/maybe, why"
  reviewer_name TEXT,              -- optional, team member signing feedback
  session_label TEXT,              -- e.g. "team-call-2026-04-14"

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_feedback_feature
  ON demo_feedback(feature_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_feedback_session
  ON demo_feedback(session_label, created_at DESC);
