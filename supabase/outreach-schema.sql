-- ============================================================
-- Blue Tree Outreach Agent — Database Schema
-- ============================================================
-- This schema supports the full outreach platform:
--   - Campaign management (sponsored link, sales, editorial)
--   - Editorial persona profiles
--   - Email thread tracking and classification
--   - AI-generated draft management
--   - Team feedback loop for continuous learning
--   - Apollo prospect enrichment (sales)
--   - Optimization cycle tracking
--   - Audit logging
-- ============================================================

-- -----------------------------------------------------------
-- 1. User profiles (extends Supabase Auth)
-- -----------------------------------------------------------
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'team_member', 'client')) DEFAULT 'team_member',
  avatar_url TEXT,
  slack_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 2. Campaigns
-- -----------------------------------------------------------
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sponsored_link', 'sales', 'editorial')),
  sensitivity TEXT NOT NULL CHECK (sensitivity IN ('low', 'medium', 'high', 'very_high')),
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'draft')) DEFAULT 'draft',
  goals JSONB DEFAULT '{}',
  constraints JSONB DEFAULT '{}',
  cadence_rules JSONB DEFAULT '{}',
  tone_guidelines TEXT,
  forbidden_words TEXT[] DEFAULT '{}',
  slack_channel_id TEXT,
  instantly_campaign_ids TEXT[] DEFAULT '{}',
  managed_agent_session_id TEXT,
  polling_interval_minutes INTEGER DEFAULT 15,
  polling_interval_off_hours INTEGER DEFAULT 60,
  business_hours_start TIME DEFAULT '09:00',
  business_hours_end TIME DEFAULT '18:00',
  business_hours_timezone TEXT DEFAULT 'America/New_York',
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_type ON campaigns(type);

-- -----------------------------------------------------------
-- 3. Campaign team assignments
-- -----------------------------------------------------------
CREATE TABLE campaign_assignments (
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'approver', 'viewer')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (campaign_id, user_id)
);

-- -----------------------------------------------------------
-- 4. Editorial personas
-- -----------------------------------------------------------
CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pen_name TEXT NOT NULL,
  email_address TEXT,
  writing_style TEXT,
  example_emails JSONB DEFAULT '[]',
  avg_email_length INTEGER,
  typical_pitch_structure TEXT,
  follow_up_style TEXT,
  vocabulary_notes TEXT,
  tone_keywords TEXT[] DEFAULT '{}',
  forbidden_patterns TEXT[] DEFAULT '{}',
  performance_stats JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 5. Email threads
-- -----------------------------------------------------------
CREATE TABLE email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instantly_thread_id TEXT UNIQUE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id),
  contact_email TEXT,
  contact_name TEXT,
  publication_name TEXT,
  publication_dr INTEGER,
  publication_vertical TEXT,
  classification TEXT,
  classification_confidence REAL,
  outcome TEXT,
  status TEXT NOT NULL CHECK (status IN (
    'new', 'pending_approval', 'approved', 'sent',
    'scheduled', 'skipped', 'archived'
  )) DEFAULT 'new',
  thread_data JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  last_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_threads_campaign ON email_threads(campaign_id);
CREATE INDEX idx_threads_status ON email_threads(status);
CREATE INDEX idx_threads_classification ON email_threads(classification);
CREATE INDEX idx_threads_last_reply ON email_threads(last_reply_at DESC);
CREATE INDEX idx_threads_instantly_id ON email_threads(instantly_thread_id);

-- -----------------------------------------------------------
-- 6. Agent-generated drafts
-- -----------------------------------------------------------
CREATE TABLE drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id),
  draft_version INTEGER NOT NULL DEFAULT 1,
  subject_line TEXT,
  body TEXT NOT NULL,
  classification TEXT,
  recommended_action TEXT CHECK (recommended_action IN (
    'send_now', 'delay', 'skip', 'escalate'
  )),
  recommended_send_time TIMESTAMPTZ,
  confidence_score REAL,
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'approved', 'revised', 'skipped', 'sent', 'scheduled'
  )) DEFAULT 'pending',
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  slack_message_ts TEXT,
  slack_channel_id TEXT,
  agent_context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drafts_thread ON drafts(thread_id);
CREATE INDEX idx_drafts_campaign ON drafts(campaign_id);
CREATE INDEX idx_drafts_status ON drafts(status);
CREATE INDEX idx_drafts_pending ON drafts(status) WHERE status = 'pending';

-- -----------------------------------------------------------
-- 7. Team feedback on drafts
-- -----------------------------------------------------------
CREATE TABLE draft_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES email_threads(id),
  campaign_id UUID REFERENCES campaigns(id),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'confirmed', 'revised', 'skipped', 'delayed',
    'reclassified', 'escalated'
  )),
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  original_draft TEXT,
  revised_draft TEXT,
  revision_instructions TEXT,
  classification_correction TEXT,
  delay_until TIMESTAMPTZ,
  feedback_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_draft ON draft_feedback(draft_id);
CREATE INDEX idx_feedback_campaign ON draft_feedback(campaign_id);
CREATE INDEX idx_feedback_type ON draft_feedback(feedback_type);

-- -----------------------------------------------------------
-- 8. Historical email patterns (from ingestion + learning)
-- -----------------------------------------------------------
CREATE TABLE email_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_type TEXT NOT NULL,
  persona_id UUID REFERENCES personas(id),
  pattern_type TEXT NOT NULL,
  pattern_data JSONB NOT NULL DEFAULT '{}',
  success_rate REAL,
  sample_size INTEGER DEFAULT 0,
  vertical TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patterns_type ON email_patterns(campaign_type, pattern_type);
CREATE INDEX idx_patterns_persona ON email_patterns(persona_id);

-- -----------------------------------------------------------
-- 9. Optimization cycles
-- -----------------------------------------------------------
CREATE TABLE optimization_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  cycle_date DATE NOT NULL,
  performance_data JSONB DEFAULT '{}',
  winners JSONB DEFAULT '[]',
  losers JSONB DEFAULT '[]',
  new_variants JSONB DEFAULT '[]',
  retired_variants JSONB DEFAULT '[]',
  recommendations TEXT,
  status TEXT NOT NULL CHECK (status IN (
    'generated', 'pending_approval', 'approved', 'applied'
  )) DEFAULT 'generated',
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_optimization_campaign ON optimization_cycles(campaign_id);
CREATE INDEX idx_optimization_date ON optimization_cycles(cycle_date DESC);

-- -----------------------------------------------------------
-- 10. Apollo prospects (sales campaigns)
-- -----------------------------------------------------------
CREATE TABLE prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  apollo_contact_id TEXT,
  email TEXT,
  full_name TEXT,
  job_title TEXT,
  company_name TEXT,
  company_size TEXT,
  industry TEXT,
  funding_stage TEXT,
  tech_stack JSONB DEFAULT '[]',
  linkedin_url TEXT,
  enrichment_data JSONB DEFAULT '{}',
  web_research JSONB DEFAULT '{}',
  custom_opener TEXT,
  custom_subject_line TEXT,
  status TEXT NOT NULL CHECK (status IN (
    'new', 'email_generated', 'approved',
    'loaded_to_instantly', 'replied', 'converted'
  )) DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prospects_campaign ON prospects(campaign_id);
CREATE INDEX idx_prospects_status ON prospects(status);
CREATE INDEX idx_prospects_email ON prospects(email);

-- -----------------------------------------------------------
-- 11. Blacklisted contacts
-- -----------------------------------------------------------
CREATE TABLE blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  domain TEXT,
  publication_name TEXT,
  reason TEXT,
  added_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blacklist_email ON blacklist(email);
CREATE INDEX idx_blacklist_domain ON blacklist(domain);

-- -----------------------------------------------------------
-- 12. Escalation rules
-- -----------------------------------------------------------
CREATE TABLE escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  trigger_keywords TEXT[] NOT NULL DEFAULT '{}',
  trigger_sentiment TEXT,
  escalate_to UUID REFERENCES user_profiles(id),
  slack_channel_override TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 13. Agent polling state
-- -----------------------------------------------------------
CREATE TABLE polling_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE UNIQUE,
  last_poll_at TIMESTAMPTZ,
  last_successfully_processed_at TIMESTAMPTZ,
  events_processed_count INTEGER DEFAULT 0,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 14. Audit log
-- -----------------------------------------------------------
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- -----------------------------------------------------------
-- 15. API connection configuration
-- -----------------------------------------------------------
CREATE TABLE api_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL CHECK (service IN (
    'instantly', 'apollo', 'hubspot', 'slack'
  )),
  config JSONB NOT NULL DEFAULT '{}',
  is_connected BOOLEAN NOT NULL DEFAULT FALSE,
  last_verified_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_api_connections_service ON api_connections(service);

-- -----------------------------------------------------------
-- 16. Notification preferences
-- -----------------------------------------------------------
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
  daily_digest_enabled BOOLEAN DEFAULT TRUE,
  daily_digest_time TIME DEFAULT '09:00',
  weekly_digest_enabled BOOLEAN DEFAULT TRUE,
  weekly_digest_day INTEGER DEFAULT 1,
  slack_dm_enabled BOOLEAN DEFAULT TRUE,
  email_notifications_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------
-- Row-Level Security Policies
-- -----------------------------------------------------------

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE polling_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Helper function: check user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: check if user has campaign access
CREATE OR REPLACE FUNCTION has_campaign_access(user_uuid UUID, camp_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles WHERE id = user_uuid AND role IN ('admin', 'manager')
    UNION ALL
    SELECT 1 FROM campaign_assignments WHERE user_id = user_uuid AND campaign_id = camp_id
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- User profiles: users can read their own, admins/managers can read all
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid() OR get_user_role(auth.uid()) IN ('admin', 'manager'));

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can manage all profiles"
  ON user_profiles FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

-- Campaigns: admins/managers see all, team members see assigned only
CREATE POLICY "Admins and managers see all campaigns"
  ON campaigns FOR SELECT
  USING (get_user_role(auth.uid()) IN ('admin', 'manager'));

CREATE POLICY "Team members see assigned campaigns"
  ON campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_assignments
      WHERE campaign_id = campaigns.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers manage campaigns"
  ON campaigns FOR ALL
  USING (get_user_role(auth.uid()) IN ('admin', 'manager'));

-- Email threads: access follows campaign access
CREATE POLICY "Users see threads for accessible campaigns"
  ON email_threads FOR SELECT
  USING (has_campaign_access(auth.uid(), campaign_id));

CREATE POLICY "Admins and managers manage threads"
  ON email_threads FOR ALL
  USING (get_user_role(auth.uid()) IN ('admin', 'manager'));

-- Drafts: access follows campaign access
CREATE POLICY "Users see drafts for accessible campaigns"
  ON drafts FOR SELECT
  USING (has_campaign_access(auth.uid(), campaign_id));

CREATE POLICY "Approvers can update drafts"
  ON drafts FOR UPDATE
  USING (has_campaign_access(auth.uid(), campaign_id));

-- Draft feedback: access follows campaign access
CREATE POLICY "Users see feedback for accessible campaigns"
  ON draft_feedback FOR SELECT
  USING (has_campaign_access(auth.uid(), campaign_id));

CREATE POLICY "Users can create feedback"
  ON draft_feedback FOR INSERT
  WITH CHECK (has_campaign_access(auth.uid(), campaign_id));

-- Personas: all authenticated users can view
CREATE POLICY "Authenticated users can view personas"
  ON personas FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers manage personas"
  ON personas FOR ALL
  USING (get_user_role(auth.uid()) IN ('admin', 'manager'));

-- Email patterns: all authenticated users can view
CREATE POLICY "Authenticated users can view patterns"
  ON email_patterns FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Optimization cycles: access follows campaign access
CREATE POLICY "Users see optimization for accessible campaigns"
  ON optimization_cycles FOR SELECT
  USING (has_campaign_access(auth.uid(), campaign_id));

-- Prospects: access follows campaign access
CREATE POLICY "Users see prospects for accessible campaigns"
  ON prospects FOR SELECT
  USING (has_campaign_access(auth.uid(), campaign_id));

-- Blacklist: admins and managers
CREATE POLICY "Admins and managers manage blacklist"
  ON blacklist FOR ALL
  USING (get_user_role(auth.uid()) IN ('admin', 'manager'));

-- Escalation rules: access follows campaign access
CREATE POLICY "Users see escalation rules for accessible campaigns"
  ON escalation_rules FOR SELECT
  USING (
    campaign_id IS NULL
    OR has_campaign_access(auth.uid(), campaign_id)
  );

-- Polling state: admins and managers
CREATE POLICY "Admins and managers see polling state"
  ON polling_state FOR ALL
  USING (get_user_role(auth.uid()) IN ('admin', 'manager'));

-- Audit log: admins only
CREATE POLICY "Admins can view audit log"
  ON audit_log FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- API connections: admins only
CREATE POLICY "Admins manage API connections"
  ON api_connections FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

-- Notification preferences: users manage their own
CREATE POLICY "Users manage own notification preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid());

-- -----------------------------------------------------------
-- Updated_at trigger function
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_personas_updated_at
  BEFORE UPDATE ON personas FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_email_threads_updated_at
  BEFORE UPDATE ON email_threads FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_email_patterns_updated_at
  BEFORE UPDATE ON email_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON prospects FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_polling_state_updated_at
  BEFORE UPDATE ON polling_state FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_api_connections_updated_at
  BEFORE UPDATE ON api_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();
