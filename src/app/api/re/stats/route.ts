import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/realestate/auth';
import { computeKPIs } from '@/lib/realestate/stats';

export async function GET() {
  const supabase = getServiceSupabase();

  const [weeklyRes, baselineRes] = await Promise.all([
    supabase
      .from('re_weekly_data')
      .select('*')
      .order('week_date', { ascending: false })
      .limit(52),
    supabase
      .from('re_baselines')
      .select('*'),
  ]);

  if (weeklyRes.error) return NextResponse.json({ error: weeklyRes.error.message }, { status: 500 });
  if (baselineRes.error) return NextResponse.json({ error: baselineRes.error.message }, { status: 500 });

  const kpis = computeKPIs(weeklyRes.data, baselineRes.data);

  // Find the most recent week that actually has data (not all nulls)
  const firstNonEmpty = weeklyRes.data.find((w) =>
    w.total_transactions != null ||
    w.offplan_transactions != null ||
    w.secondary_transactions != null ||
    w.mortgage_registrations != null ||
    w.cash_transactions != null ||
    w.total_value_aed_billions != null ||
    w.dfm_re_index != null ||
    w.emaar_share_price != null ||
    w.listing_inventory != null
  );

  return NextResponse.json({
    kpis,
    lastUpdated: firstNonEmpty?.week_date ?? weeklyRes.data[0]?.week_date ?? null,
  });
}
