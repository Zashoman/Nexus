// ============================================
// RoboX Intel - Type Definitions
// ============================================

export type SignalType =
  | 'funding'
  | 'hiring'
  | 'press_release'
  | 'research'
  | 'competitor'
  | 'dataset'
  | 'grant'
  | 'quote'
  | 'social'
  | 'conference'
  | 'news';

export type Relevance = 'high' | 'medium' | 'low';

export type SignalStatus = 'new' | 'reviewing' | 'queued' | 'acted' | 'dismissed';

export type CompanyTier = 'hot_lead' | 'prospect' | 'academic' | 'competitor';

export type SourceCategory =
  | 'news'
  | 'research'
  | 'pr_wires'
  | 'funding'
  | 'datasets'
  | 'social'
  | 'grants'
  | 'events'
  | 'hiring'
  | 'quotes';

export type SourceType = 'free' | 'manual' | 'paid';

export type SourceStatus = 'active' | 'paused' | 'not_connected';

export type MediaContactType = 'journalist' | 'newsletter' | 'publication';

// ============================================
// Database Row Types
// ============================================

export interface Signal {
  id: number;
  type: SignalType;
  title: string;
  company: string;
  source: string;
  source_key: string | null;
  url: string;
  date: string;
  summary: string;
  suggested_action: string;
  relevance: Relevance;
  status: SignalStatus;
  tags: string[] | null;
  raw_content: string | null;
  created_at: string;
  updated_at: string;
  acted_at: string | null;
  dedup_hash: string | null;
}

export interface Company {
  id: number;
  name: string;
  tier: CompanyTier;
  status: string | null;
  raised: string | null;
  valuation: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  signal_count?: number;
}

export interface Source {
  id: number;
  name: string;
  source_key: string;
  category: SourceCategory;
  type: SourceType;
  cost: string | null;
  status: SourceStatus;
  config: Record<string, unknown> | null;
  description: string | null;
  signal_count: number;
  last_fetched: string | null;
  created_at: string;
}

export interface MediaContact {
  id: number;
  name: string;
  outlet: string;
  type: MediaContactType;
  beat: string | null;
  notes: string | null;
  relevance: Relevance;
  linkedin_url: string | null;
  email: string | null;
  created_at: string;
}

export interface PitchAngle {
  id: number;
  title: string;
  target_outlets: string;
  hook: string;
  created_at: string;
}

// ============================================
// API Response Types
// ============================================

export interface SignalsResponse {
  signals: Signal[];
  total: number;
}

export interface StatsResponse {
  newCount: number;
  highPriorityCount: number;
  closedCount: number;
  activeSourcesCount: number;
  trackedCompaniesCount: number;
  hotLeadCount: number;
  signalsThisWeek: number;
  avgTimeToAction: number;
}

// ============================================
// Fetcher Types
// ============================================

export interface FetcherResult {
  title: string;
  company: string;
  url: string;
  date: string;
  rawContent: string;
  sourceKey: string;
}

// ============================================
// UI Constants
// ============================================

export const SIGNAL_COLORS: Record<SignalType, string> = {
  funding: '#22c55e',
  hiring: '#3b82f6',
  press_release: '#f97316',
  research: '#a855f7',
  competitor: '#ef4444',
  dataset: '#06b6d4',
  grant: '#10b981',
  quote: '#f59e0b',
  social: '#ec4899',
  conference: '#8b5cf6',
  news: '#64748b',
};

export const TIER_COLORS: Record<CompanyTier, string> = {
  hot_lead: '#22c55e',
  prospect: '#3b82f6',
  academic: '#a855f7',
  competitor: '#ef4444',
};

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  funding: 'Funding',
  hiring: 'Hiring',
  press_release: 'Press Release',
  research: 'Research',
  competitor: 'Competitor',
  dataset: 'Dataset',
  grant: 'Grant',
  quote: 'Quote',
  social: 'Social',
  conference: 'Conference',
  news: 'News',
};

export const SIGNAL_TYPE_ICONS: Record<SignalType, string> = {
  funding: '$',
  hiring: 'H',
  press_release: 'PR',
  research: 'R',
  competitor: '!',
  dataset: 'D',
  grant: 'G',
  quote: 'Q',
  social: '@',
  conference: 'C',
  news: 'N',
};

export const STATUS_ORDER: SignalStatus[] = ['new', 'reviewing', 'queued', 'acted', 'dismissed'];

export const RELEVANCE_ORDER: Relevance[] = ['high', 'medium', 'low'];
