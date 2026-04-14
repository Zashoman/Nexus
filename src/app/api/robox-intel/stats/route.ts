import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  const supabase = getServiceSupabase();

  // Run all queries in parallel
  const [
    newRes,
    highRes,
    closedRes,
    sourcesRes,
    companiesRes,
    hotLeadRes,
    weekRes,
    actionRes,
  ] = await Promise.all([
    supabase
      .from('robox_signals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new'),
    supabase
      .from('robox_signals')
      .select('id', { count: 'exact', head: true })
      .eq('relevance', 'high')
      .eq('status', 'new'),
    supabase
      .from('robox_signals')
      .select('id', { count: 'exact', head: true })
      .in('status', ['acted', 'dismissed']),
    supabase
      .from('robox_sources')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('robox_companies')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('robox_companies')
      .select('id', { count: 'exact', head: true })
      .eq('tier', 'hot_lead'),
    supabase
      .from('robox_signals')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from('robox_signals')
      .select('created_at, acted_at')
      .eq('status', 'acted')
      .not('acted_at', 'is', null)
      .limit(100),
  ]);

  // Calculate avg time to action in hours
  let avgTimeToAction = 0;
  const actedSignals = actionRes.data || [];
  if (actedSignals.length > 0) {
    const totalHours = actedSignals.reduce((sum, s) => {
      const created = new Date(s.created_at).getTime();
      const acted = new Date(s.acted_at).getTime();
      return sum + (acted - created) / (1000 * 60 * 60);
    }, 0);
    avgTimeToAction = Math.round(totalHours / actedSignals.length);
  }

  return NextResponse.json({
    newCount: newRes.count || 0,
    highPriorityCount: highRes.count || 0,
    closedCount: closedRes.count || 0,
    activeSourcesCount: sourcesRes.count || 0,
    trackedCompaniesCount: companiesRes.count || 0,
    hotLeadCount: hotLeadRes.count || 0,
    signalsThisWeek: weekRes.count || 0,
    avgTimeToAction,
  });
}
