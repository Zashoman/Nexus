// Intelligence Briefing System — TypeScript Types

export type SourceType = 'rss' | 'api' | 'scraper';
export type SourceTier = 1 | 2 | 3;
export type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';
export type RatingValue = 'signal' | 'noise' | 'starred' | 'irrelevant';
export type BeliefStatus = 'active' | 'validated' | 'challenged' | 'retired';
export type EvidenceDirection = 'supports' | 'challenges' | 'neutral';
export type FilterProfileType =
  | 'keyword_boost'
  | 'keyword_suppress'
  | 'source_boost'
  | 'source_suppress'
  | 'category_weight';

export type IntelCategory =
  | 'frontier_models'
  | 'infrastructure_compute'
  | 'robotics_physical_ai'
  | 'health_bio_ai'
  | 'cybersecurity_ai'
  | 'regulation_policy'
  | 'drones_autonomous';

export const CATEGORY_LABELS: Record<IntelCategory, string> = {
  frontier_models: 'Frontier & Models',
  infrastructure_compute: 'Infrastructure & Compute',
  robotics_physical_ai: 'Robotics & Physical AI',
  health_bio_ai: 'Health & Bio AI',
  cybersecurity_ai: 'Cybersecurity AI',
  regulation_policy: 'Regulation & Policy',
  drones_autonomous: 'Drones & Autonomous',
};

export interface IntelSource {
  id: string;
  name: string;
  source_type: SourceType;
  url: string;
  tier: SourceTier;
  category: string;
  subcategory?: string;
  is_active: boolean;
  fetch_interval_minutes: number;
  last_fetched_at?: string;
  error_count: number;
  created_at: string;
}

export interface IntelItem {
  id: string;
  content_hash: string;
  title: string;
  summary?: string;
  ai_summary?: string;
  original_url: string;
  source_id: string;
  source_name: string;
  source_tier: SourceTier;
  category: IntelCategory;
  subcategories: string[];
  relevance_score?: number;
  impact_level?: ImpactLevel;
  is_filtered_out: boolean;
  filter_reason?: string;
  published_at?: string;
  ingested_at: string;
  raw_content?: string;
  metadata: Record<string, unknown>;
  // Joined data
  rating?: RatingValue;
  group_source_count?: number;
}

export interface IntelItemGroup {
  id: string;
  primary_item_id: string;
  grouped_item_ids: string[];
  group_title: string;
  source_count: number;
  created_at: string;
}

export interface IntelRating {
  id: string;
  item_id: string;
  rating: RatingValue;
  feedback_note?: string;
  item_category?: string;
  item_subcategories?: string[];
  item_source_name?: string;
  item_keywords?: string[];
  created_at: string;
}

export interface IntelFilterProfile {
  id: string;
  profile_type: FilterProfileType;
  profile_key: string;
  weight: number;
  sample_count: number;
  last_updated_at: string;
}

export interface IntelBelief {
  id: string;
  title: string;
  description: string;
  category: string;
  initial_confidence: number;
  current_confidence: number;
  evidence_for: number;
  evidence_against: number;
  status: BeliefStatus;
  created_at: string;
  updated_at: string;
  evidence_count_30d?: number;
  evidence_count_prior_30d?: number;
  evidence_velocity?: 'accelerating' | 'stable' | 'decelerating';
  velocity_updated_at?: string;
}

export interface IntelBeliefEvidence {
  id: string;
  belief_id: string;
  item_id: string;
  direction: EvidenceDirection;
  strength: number;
  ai_reasoning: string;
  source_tier: SourceTier;
  created_at: string;
  // Joined
  item?: IntelItem;
}

export interface IntelFetchLog {
  id: string;
  source_id: string;
  items_fetched: number;
  items_new: number;
  items_duplicate: number;
  items_filtered: number;
  error_message?: string;
  duration_ms: number;
  created_at: string;
}

// AI Processing types
export interface AIProcessedItem {
  summary: string;
  category: IntelCategory;
  subcategories: string[];
  relevance_score: number;
  impact_level: ImpactLevel;
  keywords: string[];
}

export interface BeliefEvaluation {
  direction: EvidenceDirection;
  strength: number;
  reasoning: string;
}

// API response types
export interface FetchResult {
  total_fetched: number;
  new_items: number;
  duplicates: number;
  filtered: number;
  errors: string[];
}

export interface SynthesisNarrative {
  date: string;
  narrative: string;
  belief_movements: {
    belief_id: string;
    title: string;
    direction: 'up' | 'down' | 'stable';
    change: number;
  }[];
  top_items: IntelItem[];
}
