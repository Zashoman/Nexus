import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import type { Signal } from '@/types/robox-intel';

/**
 * Analytics over the last 30 days:
 *   - signals per day
 *   - breakdown by type
 *   - breakdown by relevance
 *   - breakdown by source
 *   - conversion funnel (new -> acted)
 *   - time-to-action distribution
 */
export async function GET() {
  const supabase = getServiceSupabase();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('robox_signals')
    .select('id, type, relevance, status, source, created_at, acted_at')
    .gte('created_at', since);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const signals = (data || []) as Pick<
    Signal,
    'id' | 'type' | 'relevance' | 'status' | 'source' | 'created_at' | 'acted_at'
  >[];

  // signals per day (last 30 days)
  const perDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    perDay[d] = 0;
  }
  for (const s of signals) {
    const d = s.created_at.split('T')[0];
    if (d in perDay) perDay[d]++;
  }

  // breakdowns
  const byType: Record<string, number> = {};
  const byRelevance: Record<string, number> = { high: 0, medium: 0, low: 0 };
  const bySource: Record<string, number> = {};
  const byStatus: Record<string, number> = {
    new: 0,
    reviewing: 0,
    queued: 0,
    acted: 0,
    dismissed: 0,
  };

  for (const s of signals) {
    byType[s.type] = (byType[s.type] || 0) + 1;
    byRelevance[s.relevance] = (byRelevance[s.relevance] || 0) + 1;
    bySource[s.source] = (bySource[s.source] || 0) + 1;
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
  }

  // funnel
  const total = signals.length;
  const reviewed = signals.filter((s) => s.status !== 'new').length;
  const actionable = signals.filter((s) =>
    ['queued', 'acted'].includes(s.status)
  ).length;
  const acted = byStatus.acted;

  // time-to-action buckets (in hours)
  const buckets = {
    '< 1h': 0,
    '1-4h': 0,
    '4-24h': 0,
    '1-3d': 0,
    '> 3d': 0,
  };
  const actedSignals = signals.filter((s) => s.acted_at);
  for (const s of actedSignals) {
    const created = new Date(s.created_at).getTime();
    const actedTime = new Date(s.acted_at!).getTime();
    const hours = (actedTime - created) / (1000 * 60 * 60);
    if (hours < 1) buckets['< 1h']++;
    else if (hours < 4) buckets['1-4h']++;
    else if (hours < 24) buckets['4-24h']++;
    else if (hours < 72) buckets['1-3d']++;
    else buckets['> 3d']++;
  }

  return NextResponse.json({
    periodDays: 30,
    total,
    perDay,
    byType,
    byRelevance,
    bySource,
    byStatus,
    funnel: {
      ingested: total,
      reviewed,
      actionable,
      acted,
    },
    timeToAction: buckets,
  });
}
