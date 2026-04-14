import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import type { Signal, CompanyTier } from '@/types/robox-intel';

/**
 * GET /api/robox-intel/trending
 *
 * Returns the top 20 companies by signal volume in the last 14 days,
 * along with type breakdown and relevance mix. Surfaces companies whose
 * activity has spiked — perfect for proactive outreach.
 */
export async function GET() {
  const supabase = getServiceSupabase();
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch recent signals
  const { data: signals } = await supabase
    .from('robox_signals')
    .select('company, type, relevance, date, id, title, source, url, created_at')
    .gte('created_at', since);

  // Fetch tracked companies (for tier lookup)
  const { data: companies } = await supabase
    .from('robox_companies')
    .select('name, tier');

  const tierByName = new Map<string, CompanyTier>();
  for (const c of companies || []) {
    tierByName.set(c.name.toLowerCase(), c.tier as CompanyTier);
  }

  type CompanyBucket = {
    company: string;
    tier: CompanyTier | null;
    signalCount: number;
    highCount: number;
    typeCounts: Record<string, number>;
    latest: Pick<Signal, 'title' | 'source' | 'url' | 'date'> | null;
  };

  const buckets = new Map<string, CompanyBucket>();

  for (const s of (signals || []) as (Pick<
    Signal,
    'company' | 'type' | 'relevance' | 'date' | 'id' | 'title' | 'source' | 'url' | 'created_at'
  >)[]) {
    if (!s.company || s.company === 'Unknown') continue;
    const key = s.company.toLowerCase();
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        company: s.company,
        tier: tierByName.get(key) || null,
        signalCount: 0,
        highCount: 0,
        typeCounts: {},
        latest: null,
      };
      buckets.set(key, bucket);
    }

    bucket.signalCount++;
    if (s.relevance === 'high') bucket.highCount++;
    bucket.typeCounts[s.type] = (bucket.typeCounts[s.type] || 0) + 1;

    const isLatest = !bucket.latest || s.date > bucket.latest.date;
    if (isLatest) {
      bucket.latest = {
        title: s.title,
        source: s.source,
        url: s.url,
        date: s.date,
      };
    }
  }

  const trending = Array.from(buckets.values())
    .sort((a, b) => {
      // Sort by high count first, then total signal count
      if (b.highCount !== a.highCount) return b.highCount - a.highCount;
      return b.signalCount - a.signalCount;
    })
    .slice(0, 20);

  return NextResponse.json({
    periodDays: 14,
    trending,
  });
}
