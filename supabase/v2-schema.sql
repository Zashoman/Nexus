-- ============================================================
-- Blue Tree Outreach Agent — v2 Schema Additions
-- ============================================================
-- New tables for content libraries, reminders, relationship
-- memory, and improved prospect tracking.
-- ============================================================

-- -----------------------------------------------------------
-- 1. Case Studies (sales + sponsored link campaigns)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  industry_tags TEXT[] NOT NULL DEFAULT '{}',
  result_headline TEXT NOT NULL,
  result_detail TEXT,
  metrics JSONB DEFAULT '{}',
  campaign_types TEXT[] DEFAULT '{sales,sponsored_link}',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_studies_active ON case_studies(active) WHERE active = true;

ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages case_studies" ON case_studies FOR ALL USING (true);

-- -----------------------------------------------------------
-- 2. Content Library (editorial campaigns)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  topic_tags TEXT[] NOT NULL DEFAULT '{}',
  url TEXT,
  summary TEXT,
  full_text TEXT,
  campaign_types TEXT[] DEFAULT '{editorial}',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_library_active ON content_library(active) WHERE active = true;

ALTER TABLE content_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages content_library" ON content_library FOR ALL USING (true);

-- -----------------------------------------------------------
-- 3. Reminders
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('auto', 'manual')),
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN (
    'upcoming', 'due_soon', 'overdue', 'completed', 'dismissed', 'snoozed'
  )),
  contact_name TEXT NOT NULL,
  contact_title TEXT,
  contact_email TEXT,
  company_or_publication TEXT,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  persona_id UUID REFERENCES personas(id) ON DELETE SET NULL,
  thread_id UUID REFERENCES email_threads(id) ON DELETE SET NULL,
  due_date DATE NOT NULL,
  original_due_date DATE,
  snooze_count INTEGER NOT NULL DEFAULT 0,
  original_reply TEXT,
  manual_note TEXT,
  ai_summary TEXT,
  suggested_action TEXT,
  created_by UUID REFERENCES user_profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_contact ON reminders(contact_email);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages reminders" ON reminders FOR ALL USING (true);

-- -----------------------------------------------------------
-- 4. Relationship Memory
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS relationship_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  interactions JSONB NOT NULL DEFAULT '[]',
  preferences JSONB DEFAULT '{}',
  constraints JSONB DEFAULT '{}',
  last_contact_date TIMESTAMPTZ,
  last_campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  last_persona_id UUID REFERENCES personas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_relationship_email ON relationship_memory(contact_email);

ALTER TABLE relationship_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages relationship_memory" ON relationship_memory FOR ALL USING (true);

-- -----------------------------------------------------------
-- 5. Do Not Contact list
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS do_not_contact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  reason TEXT,
  added_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dnc_email ON do_not_contact(email);

ALTER TABLE do_not_contact ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages do_not_contact" ON do_not_contact FOR ALL USING (true);

-- -----------------------------------------------------------
-- 6. Prospect Searches (history)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS prospect_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT,
  filters JSONB NOT NULL DEFAULT '{}',
  result_count INTEGER DEFAULT 0,
  emails_generated INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'ready', 'generating', 'sent'
  )),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  searched_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospect_searches_created ON prospect_searches(created_at DESC);

ALTER TABLE prospect_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages prospect_searches" ON prospect_searches FOR ALL USING (true);

-- -----------------------------------------------------------
-- 7. Seed initial case studies
-- -----------------------------------------------------------
INSERT INTO case_studies (client_name, industry_tags, result_headline, result_detail, metrics) VALUES
('Admiral Markets', '{"Fintech","Trading","Financial Services"}',
 '100K traffic increase in 8 months',
 'Blue Tree helped Admiral Markets achieve a 100K increase in monthly organic traffic through strategic editorial placements and high-authority backlinks in the fintech space.',
 '{"traffic_before": 150000, "traffic_after": 250000, "timeframe": "8 months", "growth_pct": 67}'
),
('Cloudwards', '{"SaaS","Cloud","Technology"}',
 '211% organic traffic growth',
 'Cloudwards saw a 211% increase in organic traffic through Blue Tree''s digital PR campaign, with placements in publications like ComputerWeekly and Harvard Business Review.',
 '{"growth_pct": 211, "timeframe": "12 months"}'
),
('Hostinger', '{"Web Hosting","SaaS","Technology"}',
 '211% organic growth in 12 months',
 'Hostinger achieved 211%+ organic growth from 364,061 to 550,585 monthly visitors through Blue Tree''s editorial placement strategy.',
 '{"traffic_before": 364061, "traffic_after": 550585, "timeframe": "12 months", "growth_pct": 51}'
),
('FreshBooks', '{"Accounting","SaaS","SMB"}',
 'Significant organic traffic increase',
 'FreshBooks saw meaningful organic traffic growth through strategic placements in accounting and business publications.',
 '{"timeframe": "ongoing"}'
),
('BrainStation', '{"EdTech","Education","Technology"}',
 'Industry authority growth',
 'BrainStation established authority in the edtech space through targeted editorial placements in technology and education publications.',
 '{"timeframe": "6 months"}'
),
('Atera', '{"IT Management","MSP","SaaS"}',
 'Cybersecurity thought leadership',
 'Atera positioned itself as a cybersecurity thought leader through guest posts in major IT and security publications.',
 '{"timeframe": "ongoing"}'
)
ON CONFLICT DO NOTHING;
