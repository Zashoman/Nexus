import { WeeklyData, Baseline, KPIStat } from '@/types/realestate';

const WEEKLY_KPI_KEYS: { key: string; field: keyof WeeklyData; label: string }[] = [
  { key: 'total_transactions', field: 'total_transactions', label: 'Total Transactions' },
  { key: 'offplan_transactions', field: 'offplan_transactions', label: 'Off-Plan Tx' },
  { key: 'secondary_transactions', field: 'secondary_transactions', label: 'Secondary Tx' },
  { key: 'mortgage_registrations', field: 'mortgage_registrations', label: 'Mortgages' },
  { key: 'total_value_aed_billions', field: 'total_value_aed_billions', label: 'Value (AED B)' },
  { key: 'dfm_re_index', field: 'dfm_re_index', label: 'DFM RE Index' },
  { key: 'emaar_share_price', field: 'emaar_share_price', label: 'Emaar (AED)' },
  { key: 'listing_inventory', field: 'listing_inventory', label: 'Listing Inventory' },
];

// A row counts as "has data" if at least one metric field is non-null
function hasData(w: WeeklyData): boolean {
  return WEEKLY_KPI_KEYS.some(({ field }) => (w[field] as number | null) != null);
}

export function computeKPIs(weeklyData: WeeklyData[], baselines: Baseline[]): KPIStat[] {
  const baselineMap = new Map(baselines.map(b => [b.metric_key, b.baseline_value]));
  const sorted = [...weeklyData].sort((a, b) => new Date(b.week_date).getTime() - new Date(a.week_date).getTime());

  // Skip rows that are entirely empty — find the most recent row with actual data
  const nonEmpty = sorted.filter(hasData);
  const latest = nonEmpty[0];
  const recent8 = nonEmpty.slice(0, 8).reverse();

  return WEEKLY_KPI_KEYS.map(({ key, field, label }) => {
    const value = latest ? (latest[field] as number | null) : null;
    const baseline = baselineMap.get(key) ?? 0;
    const changePercent = value != null && baseline > 0
      ? ((value - baseline) / baseline) * 100
      : null;
    const trend = recent8
      .map(w => (w[field] as number | null))
      .filter((v): v is number => v != null);

    return { key, label, value, baseline, changePercent, trend };
  });
}

export function computeOffplanPercent(data: WeeklyData): number | null {
  if (data.total_transactions == null || data.offplan_transactions == null || data.total_transactions === 0) return null;
  return (data.offplan_transactions / data.total_transactions) * 100;
}

export function computeCashPercent(data: WeeklyData): number | null {
  if (data.total_transactions == null || data.cash_transactions == null || data.total_transactions === 0) return null;
  return (data.cash_transactions / data.total_transactions) * 100;
}
