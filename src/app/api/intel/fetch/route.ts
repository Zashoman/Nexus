import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { fetchSource, ingestItems } from '@/lib/intel/fetcher';
import { deduplicateNewItems } from '@/lib/intel/deduplicator';
import type { IntelSource, FetchResult } from '@/types/intel';

export const maxDuration = 300;

// Items matching these patterns are always filtered out
const NOISE_PATTERNS = [
  // Events & meetups
  /schelling/i,
  /meetup/i,
  /meet-up/i,
  /conference registration/i,
  /register now/i,
  /join us (at|for|in)/i,
  /save the date/i,
  /call for (papers|proposals|abstracts|submissions)/i,
  /workshop at /i,
  /spring \d{4}|fall \d{4}|summer \d{4}|winter \d{4}/i,
  /ACX .* \d{4}/i,
  /rationalist|lesswrong meetup|SSC meetup/i,
  /tickets (available|on sale)/i,
  /early bird/i,
  /\bcfp\b/i,
  /hackathon/i,
  /webinar/i,
  /office hours/i,
  /AMA with/i,
  /fireside chat/i,
  /panel discussion/i,
  /roundtable/i,
  // Career advice & academia noise
  /advice for.*researcher/i,
  /junior researcher/i,
  /career advice/i,
  /how to get into/i,
  /tips for (phd|grad|student|researcher)/i,
  /applying to (phd|grad school|programs)/i,
  /my journey/i,
  /lessons learned/i,
  /what i wish i knew/i,
  /how to write.*paper/i,
  /academic job market/i,
  /tenure track/i,
  /postdoc/i,
  /hiring (for|at) (our|the) lab/i,
  /we.re hiring/i,
  /job opening/i,
  /internship/i,
];

function isNoise(title: string, summary: string): boolean {
  const text = `${title} ${summary}`;
  return NOISE_PATTERNS.some((pattern) => pattern.test(text));
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const db = getServiceSupabase();
  const startTime = Date.now();
  const errors: string[] = [];
  let filtered = 0;

  const { data: sources } = await db
    .from('intel_sources')
    .select('*')
    .eq('is_active', true);

  if (!sources || sources.length === 0) {
    return NextResponse.json({ message: 'No active sources configured' });
  }

  let totalFetched = 0;
  let totalNew = 0;
  let totalDuplicates = 0;

  const batchSize = 5;
  for (let i = 0; i < sources.length; i += batchSize) {
    const batch = sources.slice(i, i + batchSize) as IntelSource[];
    const results = await Promise.allSettled(
      batch.map(async (source) => {
        const fetchStart = Date.now();
        const { items, error } = await fetchSource(source);

        if (error) {
          await db
            .from('intel_sources')
            .update({ error_count: source.error_count + 1 })
            .eq('id', source.id);

          errors.push(`${source.name}: ${error}`);

          await db.from('intel_fetch_log').insert({
            source_id: source.id,
            items_fetched: 0,
            items_new: 0,
            items_duplicate: 0,
            error_message: error,
            duration_ms: Date.now() - fetchStart,
          });

          return { fetched: 0, new_count: 0, dup_count: 0 };
        }

        const { new_count, dup_count } = await ingestItems(source, items);

        await db.from('intel_fetch_log').insert({
          source_id: source.id,
          items_fetched: items.length,
          items_new: new_count,
          items_duplicate: dup_count,
          duration_ms: Date.now() - fetchStart,
        });

        return { fetched: items.length, new_count, dup_count };
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        totalFetched += result.value.fetched;
        totalNew += result.value.new_count;
        totalDuplicates += result.value.dup_count;
      }
    }
  }

  // Post-ingestion: filter out noise (events, career advice, etc.)
  const { data: recentItems } = await db
    .from('intel_items')
    .select('id, title, summary')
    .eq('is_filtered_out', false)
    .gte('ingested_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

  if (recentItems) {
    for (const item of recentItems) {
      if (isNoise(item.title || '', item.summary || '')) {
        await db
          .from('intel_items')
          .update({ is_filtered_out: true, filter_reason: 'Noise: event/career/meetup' })
          .eq('id', item.id);
        filtered++;
      }
    }
  }

  // Deduplication only — no batch AI processing (summaries generate on-demand when clicked)
  try {
    await deduplicateNewItems();
  } catch (err) {
    errors.push(`Dedup: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  const result: FetchResult = {
    total_fetched: totalFetched,
    new_items: totalNew,
    duplicates: totalDuplicates,
    filtered,
    errors,
  };

  return NextResponse.json({
    ...result,
    duration_ms: Date.now() - startTime,
  });
}
