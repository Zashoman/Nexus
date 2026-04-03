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

  return NextResponse.json({
    kpis,
    lastUpdated: weeklyRes.data[0]?.week_date ?? null,
  });
}
