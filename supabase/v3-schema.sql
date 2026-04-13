-- ============================================================
-- Blue Tree Outreach Agent — V3 Schema Migration
-- ============================================================
-- New: Writer network, objection playbook, qualification rules,
-- training documents, vocabulary enforcement, cadence reminders
-- ============================================================

-- -----------------------------------------------------------
-- 1. Writers
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS writers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pen_name TEXT,
  website TEXT,
  linkedin TEXT,
  primary_verticals TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT,
  writing_style TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE writers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages writers" ON writers FOR ALL USING (true);

-- -----------------------------------------------------------
-- 2. Writer Publications (relationship tracking)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS writer_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  writer_id UUID REFERENCES writers(id) ON DELETE CASCADE NOT NULL,
  publication_name TEXT NOT NULL,
  publication_url TEXT,
  article_title TEXT,
  article_url TEXT NOT NULL,
  category TEXT,
  vertical_tags TEXT[] DEFAULT '{}',
  published_date DATE,
  dr_estimate INTEGER,
  traffic_estimate INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wp_writer ON writer_publications(writer_id);
CREATE INDEX IF NOT EXISTS idx_wp_publication ON writer_publications(publication_name);
CREATE INDEX IF NOT EXISTS idx_wp_vertical ON writer_publications USING GIN(vertical_tags);

ALTER TABLE writer_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages writer_publications" ON writer_publications FOR ALL USING (true);

-- -----------------------------------------------------------
-- 3. Objection Playbook
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS objection_playbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objection_pattern TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('sales', 'editorial', 'both')),
  counter_framework TEXT NOT NULL,
  example_response TEXT,
  example_context TEXT,
  success_rate REAL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE objection_playbook ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages objection_playbook" ON objection_playbook FOR ALL USING (true);

-- -----------------------------------------------------------
-- 4. Qualification Rules
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS qualification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type TEXT NOT NULL CHECK (signal_type IN ('strong', 'yellow', 'red')),
  description TEXT NOT NULL,
  score_weight INTEGER NOT NULL,
  auto_action TEXT NOT NULL DEFAULT 'none' CHECK (auto_action IN ('boost', 'warn', 'exclude', 'none')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE qualification_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages qualification_rules" ON qualification_rules FOR ALL USING (true);

-- -----------------------------------------------------------
-- 5. Training Documents
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS training_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'sales_playbook', 'editorial_guide', 'persona_voice',
    'email_examples', 'call_transcript'
  )),
  content TEXT NOT NULL,
  campaign_type TEXT,
  persona_id UUID,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE training_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages training_documents" ON training_documents FOR ALL USING (true);

-- -----------------------------------------------------------
-- 6. Schema updates to existing tables
-- -----------------------------------------------------------
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS approved_vocabulary TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS assigned_writers UUID[] DEFAULT '{}';
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS vocabulary_check_passed BOOLEAN DEFAULT TRUE;
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS cadence_step TEXT;
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS suggested_template TEXT;

-- Add contact_type to relationship_memory if not exists
DO $$ BEGIN
  ALTER TABLE relationship_memory ADD COLUMN IF NOT EXISTS contact_type TEXT DEFAULT 'prospect';
  ALTER TABLE relationship_memory ADD COLUMN IF NOT EXISTS objections_raised JSONB DEFAULT '[]';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- -----------------------------------------------------------
-- 7. Seed Writers (15 writers from v3 spec)
-- -----------------------------------------------------------
INSERT INTO writers (name, pen_name, website, linkedin, primary_verticals, bio) VALUES
('Nahla Davies', 'Nahla Davies', 'nahlawrites.com', NULL,
 '{"Cybersecurity/InfoSec","AI/ML","SaaS/Marketing","HR/Future of Work","Cloud Tech"}',
 'Former lead programmer at Inc. 5000 company. Clients included Samsung, Netflix, Sony. Most versatile writer with broadest publication reach.'),

('Kiara Taylor', 'Kiara Taylor', 'kiarataylor.com', NULL,
 '{"Personal Finance","Fintech/Investing","Fintech/Crypto"}',
 'Personal finance and fintech specialist. Primary fintech writer with strongest financial publication network.'),

('Isla Sibanda', 'Isla Sibanda', 'islasibanda.blog', NULL,
 '{"Cybersecurity/Zero Trust","Cybersecurity/Supply Chain","Cybersecurity/Cloud","SaaS/DevOps"}',
 'Deep cybersecurity specialist. Go-to for hardcore cybersecurity targeting enterprise security teams.'),

('Alex Williams', 'Alex Williams', 'williamstechcopy.com', NULL,
 '{"SaaS/Frontend Dev","AI/Engineering","SaaS/DevOps"}',
 'Frontend dev and engineering writer. Extremely strong relationship with The New Stack.'),

('Francois Moreau', 'Francois Moreau', 'francoismoreau.work', NULL,
 '{"Fintech/Commodities","Fintech/Crypto","Fintech/Payments","Fintech/Trade"}',
 'Fintech and commodities specialist. Best for payments, trading, and commodities clients.'),

('Courtney Lee Li', 'Courtney Lee Li', 'leelifeng.online', NULL,
 '{"Fintech/Southeast Asia","SaaS/Marketing","Cybersecurity/AI"}',
 'Versatile writer. Notable TechCrunch placement. Useful for Southeast Asian markets.'),

('Gary Espinosa', 'Gary Espinosa', 'garyespinosa.net', NULL,
 '{"AI/SaaS","AI/HR Tech","Cybersecurity/DevOps","SaaS/Cloud"}',
 'AI and cloud technology specialist. Strong for AI-focused and enterprise SaaS clients.'),

('Ryan Harris', 'Ryan Harris', 'ryanharris.co', NULL,
 '{"EdTech/Digital Safety","EdTech/AI","EdTech/SaaS"}',
 'EdTech and digital safety specialist. Primary writer for EdTech clients.'),

('Shanice Jones', 'Shanice Jones', 'shanicejones.com', NULL,
 '{"SaaS/Marketing","SaaS/eCommerce","AI/Marketing"}',
 'SaaS marketing and eCommerce specialist. Best for marketing tech and e-commerce clients.'),

('Ivan Vakulenko', 'Ivan Vakulenko', 'ivanvakulenko.org', NULL,
 '{"SaaS/DevOps","Fintech/AI","AI/SaaS"}',
 'DevOps and SaaS specialist. Strong Unito relationship. Best for DevOps and developer tools.'),

('Andrew Ginsberg', 'Andrew Ginsberg', 'andrewginsberg.net', NULL,
 '{"SaaS/Content Marketing","SaaS/Marketing","SaaS/eCommerce"}',
 'SaaS content marketing specialist. Best for content marketing and publishing tool clients.'),

('Fabian Sandoval', 'Fabian Sandoval', 'fabiansandovalwriter.com', NULL,
 '{"HR/Leadership","HR/Career","Cybersecurity/SaaS"}',
 'HR and leadership specialist. Best for HR tech and leadership development clients.'),

('Magnus Erikssen', 'Magnus Erikssen', 'magnuscopy.com', NULL,
 '{"SaaS/B2B Marketing","SaaS/UX Design","SaaS/eCommerce"}',
 'SaaS and UX design specialist. Best for design and user experience focused clients.'),

('Sam Bocetta', 'Sam Bocetta', 'bocetta.com', NULL,
 '{"Cybersecurity/InfoSec","Cybersecurity/Network","Cybersecurity/Privacy"}',
 'Veteran cybersecurity writer. Best for cybersecurity and privacy-focused clients.'),

('Gary Stevens', 'Gary Stevens', 'garystevenswriting.com', NULL,
 '{"Cybersecurity/Web","Cybersecurity/SMB","Cybersecurity/Encryption"}',
 'Cybersecurity and web security specialist. Best for SMB website owner audience.')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------
-- 8. Seed Objection Playbook
-- -----------------------------------------------------------
INSERT INTO objection_playbook (objection_pattern, campaign_type, counter_framework, example_response) VALUES
('over our budget|too expensive|can''t afford', 'sales',
 'Acknowledge → offer 5-link pilot → frame as long-term partnership → door open for scaling',
 'Totally understand budget is a priority. What we usually do in this situation is start with a focused 5-link pilot so you can validate the model before committing to a larger engagement. That way you see real placements, real metrics, and can decide from there. Most of our long-term clients started exactly this way.'),

('cost per mention is higher|more expensive than', 'sales',
 'Acknowledge number → volume hits target → reframe on quality (higher DR) → flex at higher tiers',
 'Fair point on the per-link cost. The difference is every placement we deliver is DR 50+ with a minimum 5K monthly traffic, editorially earned on real publications. At higher tiers the per-link cost comes down significantly. Happy to walk through the numbers.'),

('$100 per link|cheap links|budget links', 'sales',
 'Explain vendor-list vs editorially-earned distinction → placements last → offer trial PR campaign',
 'At that price point you are typically looking at vendor-list placements which carry real risk of being deindexed. Our model is fundamentally different: writer-led, editorially earned, with a 1-year link guarantee. The placements last because they are real content on real publications. Happy to run a small trial so you can compare the quality side by side.'),

('trust quality without the site list|show us sites first', 'sales',
 'Writer model explanation → examples of past placements → metrics guarantee → 1-year guarantee → paid pilot',
 'Great question. We work through a network of 15+ writers who have existing relationships at publications like ComputerWeekly, The New Stack, SecureWorld, and Fast Company. Because each placement is editorially earned, we guarantee DR 50+ and 5K+ monthly traffic with a 1-year link guarantee. The best way to validate is a paid pilot where you see the actual placements.'),

('need approval on every draft|want to review everything', 'sales',
 'Frame hands-off as benefit → editorial brief → offer initial review step → transition to hands-off',
 'Completely understand wanting oversight early on. What we do is set up an editorial brief upfront that covers your messaging, topics to avoid, and tone preferences. For the first month we can share drafts for review. Most clients move to hands-off once they see the quality is consistent. The whole model is designed to be hands-off so your team can focus on other priorities.'),

('have in-house DPR|already doing link building', 'sales',
 'Not an objection — position as complementary capacity → hit volume without adding headcount',
 'That is actually a great position to be in. Most of our growth-tier clients have an in-house team and use us for incremental capacity. We can hit 8-12 additional placements per month without you adding headcount, and our writer network covers verticals your team might not have relationships in.'),

('contract length|locked in|commitment', 'sales',
 'Month-to-month, 30 days notice → pro-rate fairly → no lock-in',
 'We are month-to-month with 30 days notice. No lock-in, no long-term commitment. We pro-rate fairly if you need to adjust. We keep clients because the results speak for themselves, not because of a contract.'),

('how fast will we see results|timeline', 'sales',
 'First links 3-4 weeks → steady flow month 2 → SEO impact 2-6 months',
 'First placements typically go live within 3-4 weeks. By month 2 you will have a steady flow. The SEO impact from those placements usually shows in rankings within 2-6 months depending on your competitive landscape. Happy to share a typical ramp timeline.'),

('don''t accept guest posts|no guest contributions', 'editorial',
 'Disqualifier — log in relationship memory, do not re-pitch',
 NULL),

('already covered this topic|we wrote about that', 'editorial',
 'Pivot to different angle, reference what they did cover',
 'Totally fair. I saw your piece on [topic] from [date]. What I had in mind was actually a different angle focused on [new angle]. Would that be worth exploring?'),

('not now|check back later|reach out in|circle back', 'both',
 'Create reminder with exact timeframe, acknowledge gracefully',
 'Completely understand. I will circle back [timeframe]. In the meantime, if anything changes on your end, feel free to reach out.'),

('send me a draft|let me see content', 'editorial',
 'Positive signal — escalate to content brief immediately',
 NULL),

('forward to another editor|not the right person', 'editorial',
 'Update contact, draft new pitch for the redirected editor',
 NULL)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------
-- 9. Seed Qualification Rules
-- -----------------------------------------------------------
INSERT INTO qualification_rules (signal_type, description, score_weight, auto_action) VALUES
('strong', 'Specific keyword or page target mentioned', 3, 'boost'),
('strong', 'Existing SEO or content team in place', 3, 'boost'),
('strong', 'Budget above £2K implied or stated', 3, 'boost'),
('strong', 'Currently working with another agency', 3, 'boost'),
('strong', 'Series A+ or post-revenue bootstrapped', 3, 'boost'),
('strong', 'Referrer is existing Blue Tree client', 3, 'boost'),
('yellow', 'Pre-seed or seed stage (offer pilot)', 1, 'warn'),
('yellow', 'Budget at floor level', 1, 'warn'),
('yellow', 'No in-house SEO team', 1, 'warn'),
('yellow', 'Multiple stakeholders in decision', 1, 'warn'),
('red', '"$100 per link" ask or similar budget mismatch', -5, 'exclude'),
('red', 'E-commerce, fashion, gambling, or adult vertical', -5, 'exclude'),
('red', 'Wants full site list before committing', -5, 'warn'),
('red', 'Refuses paid pilot', -5, 'exclude')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------
-- 10. Update case studies with v3 data
-- -----------------------------------------------------------
INSERT INTO case_studies (client_name, industry_tags, result_headline, result_detail, metrics, campaign_types) VALUES
('Cloudwards', '{"Cybersecurity","Cloud","Technology"}',
 '12K to 40K visitors in 9 months',
 'Cloudwards grew from 12K to 40K monthly visitors through Blue Tree editorial placements.',
 '{"traffic_before": 12000, "traffic_after": 40000, "timeframe": "9 months", "growth_pct": 233}',
 '{"sales","sponsored_link"}'),
('BrainStation', '{"EdTech","Education","Technology"}',
 '1,203% traffic growth in 16 months',
 'BrainStation achieved 1,203% traffic growth in 16 months through targeted editorial placements.',
 '{"growth_pct": 1203, "timeframe": "16 months"}',
 '{"sales","sponsored_link"}'),
('Cloud Defense', '{"Cybersecurity","SaaS","Cloud"}',
 '1 to 16,679 visitors in 25 months',
 'Cloud Defense went from 1 visitor to 16,679 monthly visitors in 25 months.',
 '{"traffic_before": 1, "traffic_after": 16679, "timeframe": "25 months"}',
 '{"sales","sponsored_link"}'),
('Farseer', '{"SaaS","Analytics"}',
 'Onboarded Q1 2026, 8 links/month',
 'Farseer onboarded in Q1 2026 with an 8-link per month editorial link building campaign.',
 '{"links_per_month": 8, "start_date": "Q1 2026"}',
 '{"sales","sponsored_link"}'),
('Coursebox', '{"SaaS","Education","EdTech"}',
 'Editorial link building campaign',
 'Coursebox is running an active editorial link building campaign with Blue Tree.',
 '{}',
 '{"sales","sponsored_link"}'),
('Right Way Parking', '{"Services","Parking"}',
 'Reactive PR campaigns',
 'Right Way Parking runs reactive PR campaigns through Blue Tree for media coverage.',
 '{}',
 '{"sales","sponsored_link"}')
ON CONFLICT DO NOTHING;
