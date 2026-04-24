export const CANONICAL_SECTORS = [
  "biotech",
  "diagnostics",
  "oncology",
  "rare-disease",
  "metabolic",
  "medtech",
  "defense",
  "cuas",
  "aerospace",
  "space",
  "dual-use",
  "ai-infra",
  "ai-software",
  "semis",
  "quantum",
  "robotics",
  "cybersecurity",
  "fintech",
  "saas",
  "energy",
  "mining",
  "commodities",
  "consumer",
  "industrials",
  "healthcare-services",
  "real-estate",
  "spac",
  "bdc",
  "other",
] as const;

export type Sector = (typeof CANONICAL_SECTORS)[number];

export const GEOGRAPHIES = ["US", "HK", "LSE", "EU", "CA", "JP", "AU"] as const;
export type Geography = (typeof GEOGRAPHIES)[number];

export const STAGES = ["filed", "priced"] as const;
export type Stage = (typeof STAGES)[number];

export const EXCLUDES = ["spac", "bdc"] as const;
export type Exclude = (typeof EXCLUDES)[number];

export interface Channel {
  id: string;
  name: string;
  telegram_chat_id: string;
  is_active: boolean;
  sectors: string[]; // '*' means any
  min_raise_usd: number;
  geographies: Geography[];
  stages: Stage[];
  excludes: Exclude[];
  created_at?: string;
  updated_at?: string;
}

export interface Ipo {
  ticker: string;
  company_name: string;
  exchange: string | null;
  stage: Stage;
  sectors: Sector[];
  deal_size_usd: number | null;
  price_low: number | null;
  price_high: number | null;
  shares_offered: number | null;
  expected_date: string | null; // ISO date
  business_description: string | null;
  source: "finnhub" | "edgar";
  source_url: string | null;
  is_spac: boolean;
  classification_confidence: number | null;
  first_seen_at?: string;
  updated_at?: string;
}

export interface Alert {
  id: string;
  ipo_ticker: string;
  channel_id: string;
  telegram_message_id: number | null;
  sent_at: string;
}

export interface SourceLog {
  id: string;
  source: string;
  items_fetched: number;
  error: string | null;
  scanned_at: string;
}

// Input shape the pipeline builds before upsert. Raw sources produce this.
export type IpoDraft = Omit<
  Ipo,
  "sectors" | "is_spac" | "classification_confidence" | "first_seen_at" | "updated_at"
> & {
  sectors?: Sector[];
  is_spac?: boolean;
  classification_confidence?: number | null;
};
