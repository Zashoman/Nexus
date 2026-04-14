-- RoboX Intel Platform Schema
-- Market intelligence for robotics training data startup

-- ============================================
-- SIGNALS TABLE
-- ============================================
CREATE TABLE robox_signals (
  id            SERIAL PRIMARY KEY,
  type          VARCHAR(20) NOT NULL CHECK (type IN ('funding','hiring','press_release','research','competitor','dataset','grant','quote','social','conference','news')),
  title         VARCHAR(300) NOT NULL,
  company       VARCHAR(200) NOT NULL,
  source        VARCHAR(100) NOT NULL,
  source_key    VARCHAR(50),
  url           TEXT NOT NULL,
  date          DATE NOT NULL,
  summary       TEXT NOT NULL,
  suggested_action TEXT NOT NULL,
  relevance     VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (relevance IN ('high','medium','low')),
  status        VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','queued','acted','dismissed')),
  tags          TEXT[],
  raw_content   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  acted_at      TIMESTAMPTZ,
  dedup_hash    VARCHAR(64) UNIQUE
);

CREATE INDEX idx_robox_signals_status ON robox_signals(status);
CREATE INDEX idx_robox_signals_type ON robox_signals(type);
CREATE INDEX idx_robox_signals_relevance ON robox_signals(relevance);
CREATE INDEX idx_robox_signals_date ON robox_signals(date DESC);
CREATE INDEX idx_robox_signals_company ON robox_signals(company);

-- ============================================
-- COMPANIES TABLE
-- ============================================
CREATE TABLE robox_companies (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL UNIQUE,
  tier          VARCHAR(20) NOT NULL CHECK (tier IN ('hot_lead','prospect','academic','competitor')),
  status        VARCHAR(100),
  raised        VARCHAR(50),
  valuation     VARCHAR(50),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SOURCES TABLE
-- ============================================
CREATE TABLE robox_sources (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  source_key    VARCHAR(50) NOT NULL UNIQUE,
  category      VARCHAR(30) NOT NULL CHECK (category IN ('news','research','pr_wires','funding','datasets','social','grants','events','hiring','quotes')),
  type          VARCHAR(20) NOT NULL CHECK (type IN ('free','manual','paid')),
  cost          VARCHAR(20),
  status        VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','not_connected')),
  config        JSONB,
  description   TEXT,
  signal_count  INTEGER DEFAULT 0,
  last_fetched  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEDIA CONTACTS TABLE
-- ============================================
CREATE TABLE robox_media_contacts (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  outlet        VARCHAR(100) NOT NULL,
  type          VARCHAR(20) NOT NULL CHECK (type IN ('journalist','newsletter','publication')),
  beat          VARCHAR(100),
  notes         TEXT,
  relevance     VARCHAR(10) DEFAULT 'medium',
  linkedin_url  TEXT,
  email         VARCHAR(200),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PITCH ANGLES TABLE
-- ============================================
CREATE TABLE robox_pitch_angles (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  target_outlets TEXT NOT NULL,
  hook          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (allow all for now)
-- ============================================
ALTER TABLE robox_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE robox_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE robox_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE robox_media_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE robox_pitch_angles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to robox_signals" ON robox_signals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to robox_companies" ON robox_companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to robox_sources" ON robox_sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to robox_media_contacts" ON robox_media_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to robox_pitch_angles" ON robox_pitch_angles FOR ALL USING (true) WITH CHECK (true);
