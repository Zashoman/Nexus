export interface WeeklyData {
  id: string;
  week_label: string;
  week_date: string;
  total_transactions: number | null;
  offplan_transactions: number | null;
  secondary_transactions: number | null;
  mortgage_registrations: number | null;
  cash_transactions: number | null;
  total_value_aed_billions: number | null;
  dfm_re_index: number | null;
  emaar_share_price: number | null;
  damac_share_price: number | null;
  listing_inventory: number | null;
  data_source: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlyData {
  id: string;
  month_label: string;
  month_date: string;
  dewa_new_connections: number | null;
  airport_passengers_millions: number | null;
  moasher_price_index: number | null;
  avg_price_psf_apartment: number | null;
  avg_price_psf_villa: number | null;
  rental_index: number | null;
  new_supply_units: number | null;
  population_estimate: number | null;
  data_source: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Baseline {
  id: string;
  metric_key: string;
  baseline_value: number;
  label: string;
  description: string | null;
  updated_at: string;
}

export interface UpdateLogEntry {
  id: string;
  update_type: 'manual_weekly' | 'manual_monthly' | 'auto_refresh' | 'baseline_change';
  description: string;
  data_snapshot: Record<string, unknown> | null;
  updated_by: string | null;
  created_at: string;
}

export interface REUser {
  id: string;
  email: string;
  role: 'owner' | 'viewer';
  invited_at: string;
  last_login: string | null;
}

export interface RefreshResult {
  total_transactions: number | null;
  offplan_transactions: number | null;
  secondary_transactions: number | null;
  mortgage_registrations: number | null;
  cash_transactions: number | null;
  total_value_aed_billions: number | null;
  dfm_re_index: number | null;
  emaar_share_price: number | null;
  listing_inventory: number | null;
  data_date: string;
  sources: string[];
}

export interface KPIStat {
  key: string;
  label: string;
  value: number | null;
  baseline: number;
  changePercent: number | null;
  trend: number[];
}

export type WeeklyField = keyof Omit<WeeklyData, 'id' | 'week_label' | 'week_date' | 'data_source' | 'notes' | 'created_by' | 'created_at' | 'updated_at'>;
export type MonthlyField = keyof Omit<MonthlyData, 'id' | 'month_label' | 'month_date' | 'data_source' | 'notes' | 'created_by' | 'created_at' | 'updated_at'>;
