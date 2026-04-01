import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { DEFAULT_SOURCES } from '@/lib/intel/sources-config';

export async function GET() {
  const db = getServiceSupabase();

  const { data: sources, error } = await db
    .from('intel_sources')
    .select('*')
    .order('tier', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get recent fetch logs for health status
  const { data: logs } = await db
    .from('intel_fetch_log')
    .select('source_id, items_fetched, items_new, error_message, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  // Map latest log per source
  const latestLogs = new Map<string, (typeof logs extends (infer T)[] | null ? T : never)>();
  for (const log of logs || []) {
    if (!latestLogs.has(log.source_id)) {
      latestLogs.set(log.source_id, log);
    }
  }

  const enriched = (sources || []).map((s) => ({
    ...s,
    latest_fetch: latestLogs.get(s.id) || null,
  }));

  return NextResponse.json({ sources: enriched });
}

export async function POST(req: NextRequest) {
  const db = getServiceSupabase();
  const body = await req.json();

  // Seed all default sources
  if (body.action === 'seed') {
    const results = [];
    for (const source of DEFAULT_SOURCES) {
      const { data, error } = await db
        .from('intel_sources')
        .upsert(
          {
            name: source.name,
            source_type: source.source_type,
            url: source.url,
            tier: source.tier,
            category: source.category,
            subcategory: source.subcategory,
          },
          { onConflict: 'url', ignoreDuplicates: true }
        )
        .select();

      results.push({ name: source.name, success: !error, error: error?.message });
    }
    return NextResponse.json({ results });
  }

  // Add single source
  const { name, source_type, url, tier, category, subcategory } = body;

  if (!name || !source_type || !url || !tier || !category) {
    return NextResponse.json(
      { error: 'name, source_type, url, tier, and category are required' },
      { status: 400 }
    );
  }

  const { data, error } = await db
    .from('intel_sources')
    .insert({ name, source_type, url, tier, category, subcategory })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ source: data }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const db = getServiceSupabase();
  const body = await req.json();

  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { data, error } = await db
    .from('intel_sources')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ source: data });
}
