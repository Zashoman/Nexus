-- Intelligence Briefing System — Database Schema
-- Run this in the Supabase SQL Editor

-- Table: intel_sources
CREATE TABLE intel_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'api', 'scraper')),
  url TEXT NOT NULL,
  tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
  category TEXT NOT NULL,
  subcategory TEXT,
  is_active BOOLEAN DEFAULT true,
  fetch_interval_minutes INTEGER DEFAULT 60,
  last_fetched_at TIMESTAMPTZ,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: intel_items
CREATE TABLE intel_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  ai_summary TEXT,
  original_url TEXT NOT NULL,
  source_id UUID REFERENCES intel_sources(id),
  source_name TEXT NOT NULL,
  source_tier INTEGER NOT NULL,
  category TEXT NOT NULL,
  subcategories TEXT[] DEFAULT '{}',
  relevance_score NUMERIC(3,2),
  impact_level TEXT CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
  is_filtered_out BOOLEAN DEFAULT false,
  filter_reason TEXT,
  published_at TIMESTAMPTZ,
  ingested_at TIMESTAMPTZ DEFAULT now(),
  raw_content TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_intel_items_category ON intel_items(category);
CREATE INDEX idx_intel_items_ingested ON intel_items(ingested_at DESC);
CREATE INDEX idx_intel_items_hash ON intel_items(content_hash);
CREATE INDEX idx_intel_items_relevance ON intel_items(relevance_score DESC);
CREATE INDEX idx_intel_items_impact ON intel_items(impact_level);

-- Table: intel_item_groups
CREATE TABLE intel_item_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_item_id UUID REFERENCES intel_items(id),
  grouped_item_ids UUID[] NOT NULL,
  group_title TEXT NOT NULL,
  source_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: intel_ratings
CREATE TABLE intel_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES intel_items(id),
  rating TEXT NOT NULL CHECK (rating IN ('signal', 'noise', 'starred', 'irrelevant')),
  feedback_note TEXT,
  item_category TEXT,
  item_subcategories TEXT[],
  item_source_name TEXT,
  item_keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_intel_ratings_rating ON intel_ratings(rating);
CREATE INDEX idx_intel_ratings_category ON intel_ratings(item_category);

-- Table: intel_filter_profile
CREATE TABLE intel_filter_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_type TEXT NOT NULL CHECK (profile_type IN ('keyword_boost', 'keyword_suppress', 'source_boost', 'source_suppress', 'category_weight')),
  profile_key TEXT NOT NULL,
  weight NUMERIC(5,2) DEFAULT 1.0,
  sample_count INTEGER DEFAULT 0,
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_type, profile_key)
);

-- Table: intel_beliefs
CREATE TABLE intel_beliefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  initial_confidence NUMERIC(5,2) NOT NULL CHECK (initial_confidence BETWEEN 0 AND 100),
  current_confidence NUMERIC(5,2) NOT NULL CHECK (current_confidence BETWEEN 0 AND 100),
  evidence_for INTEGER DEFAULT 0,
  evidence_against INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'validated', 'challenged', 'retired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: intel_belief_evidence
CREATE TABLE intel_belief_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  belief_id UUID REFERENCES intel_beliefs(id) ON DELETE CASCADE,
  item_id UUID REFERENCES intel_items(id),
  direction TEXT NOT NULL CHECK (direction IN ('supports', 'challenges', 'neutral')),
  strength NUMERIC(3,2) NOT NULL CHECK (strength BETWEEN 0 AND 1),
  ai_reasoning TEXT NOT NULL,
  source_tier INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_belief_evidence_belief ON intel_belief_evidence(belief_id);
CREATE INDEX idx_belief_evidence_direction ON intel_belief_evidence(direction);

-- Table: intel_fetch_log
CREATE TABLE intel_fetch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES intel_sources(id),
  items_fetched INTEGER DEFAULT 0,
  items_new INTEGER DEFAULT 0,
  items_duplicate INTEGER DEFAULT 0,
  items_filtered INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
