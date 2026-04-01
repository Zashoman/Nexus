import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { fetchSource, ingestItems } from '@/lib/intel/fetcher';
import { processItems, getUnprocessedItems } from '@/lib/intel/processor';
import { deduplicateNewItems } from '@/lib/intel/deduplicator';
import { evaluateItemsAgainstBeliefs } from '@/lib/intel/belief-evaluator';
import type { IntelSource, FetchResult } from '@/types/intel';

export const maxDuration = 300; // 5 minute timeout for Vercel

export async function GET(req: NextRequest) {
  // Verify cron secret for production
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Allow without secret in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const db = getServiceSupabase();
  const startTime = Date.now();
  const errors: string[] = [];

  // Get all active sources
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

  // Fetch all sources in parallel (batches of 5)
  const batchSize = 5;
  for (let i = 0; i < sources.length; i += batchSize) {
    const batch = sources.slice(i, i + batchSize) as IntelSource[];
    const results = await Promise.allSettled(
      batch.map(async (source) => {
        const fetchStart = Date.now();
        const { items, error } = await fetchSource(source);

        if (error) {
          // Increment error count
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

  // Step 2: AI Processing of new items
  let processed = 0;
  try {
    const unprocessed = await getUnprocessedItems();
    if (unprocessed.length > 0) {
      await processItems(unprocessed);
      processed = unprocessed.length;

      // Step 3: Deduplication
      await deduplicateNewItems();

      // Step 4: Belief evaluation
      // Re-fetch processed items (now they have AI summaries)
      const { data: processedItems } = await db
        .from('intel_items')
        .select('*')
        .not('ai_summary', 'is', null)
        .gte('ingested_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .gt('relevance_score', 0.5);

      if (processedItems && processedItems.length > 0) {
        await evaluateItemsAgainstBeliefs(processedItems);
      }
    }
  } catch (err) {
    errors.push(`Processing: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  const result: FetchResult = {
    total_fetched: totalFetched,
    new_items: totalNew,
    duplicates: totalDuplicates,
    filtered: 0,
    errors,
  };

  return NextResponse.json({
    ...result,
    processed,
    duration_ms: Date.now() - startTime,
  });
}
