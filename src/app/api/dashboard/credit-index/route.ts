import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getCached, setCache, fetchFRED } from '@/lib/dashboard/cache';

const COMPONENTS = [
  { key: 'b_rated', series: 'BAMLH0A2HYB', name: 'B-rated Bond OAS', weight: 0.25 },
  { key: 'ccc', series: 'BAMLH0A3HYC', name: 'CCC & Lower Bond OAS', weight: 0.25 },
  { key: 'hy', series: 'BAMLH0A0HYM2', name: 'HY Corporate Bond OAS', weight: 0.20 },
  { key: 'bb', series: 'BAMLH0A1HYBB', name: 'BB Corporate Bond OAS', weight: 0.10 },
  { key: 'ig_corp', series: 'BAMLC0A0CM', name: 'Corporate Bond Index OAS', weight: 0.10 },
  { key: 'aa', series: 'BAMLC0A2CAA', name: 'AA-rated Bond OAS', weight: 0.10 },
];

// Hardcoded 5-year ranges (will be updated monthly via cache)
// These are approximate historical ranges for each spread
const DEFAULT_5Y_RANGES: Record<string, [number, number]> = {
  'BAMLH0A2HYB': [2.5, 11.0],
  'BAMLH0A3HYC': [6.0, 20.0],
  'BAMLH0A0HYM2': [2.5, 11.0],
  'BAMLH0A1HYBB': [1.5, 6.0],
  'BAMLC0A0CM': [0.8, 4.0],
  'BAMLC0A2CAA': [0.3, 2.0],
};

function getStage(index: number): { stage: string; subLevel: string } {
  if (index < 25) {
    const sub = Math.min(6, Math.floor(index / 4) + 1);
    return { stage: '1', subLevel: `1.${sub}` };
  }
  if (index < 50) {
    const sub = Math.min(6, Math.floor((index - 25) / 4.17) + 1);
    return { stage: '2', subLevel: `2.${sub}` };
  }
  if (index < 75) {
    const sub = Math.min(6, Math.floor((index - 50) / 4.17) + 1);
    return { stage: '3', subLevel: `3.${sub}` };
  }
  const sub = Math.min(6, Math.floor((index - 75) / 4.17) + 1);
  return { stage: '4', subLevel: `4.${sub}` };
}

function getStageName(stage: string): string {
  switch (stage) {
    case '1': return 'Low Credit Stress';
    case '2': return 'Moderate Credit Stress';
    case '3': return 'High Credit Stress';
    case '4': return 'Extreme Credit Stress';
    default: return 'Unknown';
  }
}

export async function GET() {
  const db = getServiceSupabase();
  const cacheKey = 'credit_stress_index_current';
  const cached = await getCached(cacheKey);

  try {
    // Fetch current values for all 6 components
    const values: Record<string, number | null> = {};
    for (const comp of COMPONENTS) {
      values[comp.series] = await fetchFRED(comp.series);
    }

    // Calculate percentiles using 5-year ranges
    const percentiles: Record<string, number> = {};
    for (const comp of COMPONENTS) {
      const val = values[comp.series];
      if (val == null) { percentiles[comp.key] = 50; continue; }
      const [min, max] = DEFAULT_5Y_RANGES[comp.series] || [0, 10];
      const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
      percentiles[comp.key] = +pct.toFixed(1);
    }

    // Calculate weighted composite index
    let indexValue = 0;
    for (const comp of COMPONENTS) {
      indexValue += percentiles[comp.key] * comp.weight;
    }
    indexValue = +indexValue.toFixed(1);

    const { stage, subLevel } = getStage(indexValue);

    // Get previous index value for direction
    const { data: prevIndex } = await db
      .from('credit_stress_index')
      .select('index_value')
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let direction = 'stable';
    if (prevIndex) {
      const diff = indexValue - (prevIndex.index_value as number);
      if (diff > 1) direction = 'deteriorating';
      else if (diff < -1) direction = 'improving';
    }

    // Calculate z-scores (simplified - using deviation from current percentile midpoint)
    const zscores: Record<string, number> = {};
    for (const comp of COMPONENTS) {
      const pct = percentiles[comp.key];
      // Z-score approximation: how far from 50th percentile in standard units
      zscores[comp.key] = +((pct - 50) / 20).toFixed(2);
    }

    // CCC-BB spread
    const cccVal = values['BAMLH0A3HYC'] || 0;
    const bbVal = values['BAMLH0A1HYBB'] || 0;
    const cccBbSpread = cccVal > 0 && bbVal > 0 ? +(cccVal - bbVal).toFixed(2) : null;

    // Store in database
    await db.from('credit_stress_index').insert({
      index_value: indexValue,
      stage: stage,
      sub_level: subLevel,
      direction,
      b_rated_oas: values['BAMLH0A2HYB'],
      ccc_oas: values['BAMLH0A3HYC'],
      hy_oas: values['BAMLH0A0HYM2'],
      bb_oas: values['BAMLH0A1HYBB'],
      ig_corp_oas: values['BAMLC0A0CM'],
      aa_oas: values['BAMLC0A2CAA'],
      b_rated_pct: percentiles['b_rated'],
      ccc_pct: percentiles['ccc'],
      hy_pct: percentiles['hy'],
      bb_pct: percentiles['bb'],
      ig_corp_pct: percentiles['ig_corp'],
      aa_pct: percentiles['aa'],
      b_rated_zscore: zscores['b_rated'],
      ccc_zscore: zscores['ccc'],
      hy_zscore: zscores['hy'],
      bb_zscore: zscores['bb'],
      ig_corp_zscore: zscores['ig_corp'],
      aa_zscore: zscores['aa'],
      ccc_bb_spread: cccBbSpread,
      ccc_bb_direction: cccBbSpread != null && prevIndex ? (cccBbSpread > 0 ? 'widening' : 'narrowing') : 'stable',
    });

    // Build component cards data
    const components = COMPONENTS.map((comp) => ({
      key: comp.key,
      name: comp.name,
      series: comp.series,
      value: values[comp.series],
      percentile: percentiles[comp.key],
      zscore: zscores[comp.key],
      weight: comp.weight,
    })).sort((a, b) => Math.abs(b.zscore) - Math.abs(a.zscore));

    // Get history for chart
    const { data: history } = await db
      .from('credit_stress_index')
      .select('index_value, stage, sub_level, direction, recorded_at')
      .order('recorded_at', { ascending: true })
      .limit(365);

    const result = {
      index: indexValue,
      stage,
      sub_level: subLevel,
      stage_name: getStageName(stage),
      direction,
      components,
      ccc_bb_spread: cccBbSpread,
      history: history || [],
      updated_at: new Date().toISOString(),
    };

    await setCache(cacheKey, result, 'fred', 1440); // 24hr cache
    return NextResponse.json(result);
  } catch {
    if (cached) return NextResponse.json(cached);
    return NextResponse.json({ error: 'Failed to calculate credit stress index' }, { status: 500 });
  }
}
