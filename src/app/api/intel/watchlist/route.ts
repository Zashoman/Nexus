import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  const db = getServiceSupabase();

  const { data: watchlist, error } = await db
    .from('intel_watchlist')
    .select('*')
    .order('added_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get relevant news for each watchlist item
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentItems } = await db
    .from('intel_items')
    .select('id, title, source_name, source_tier, impact_level, published_at, ingested_at, ai_summary, summary, original_url, category')
    .gte('ingested_at', cutoff)
    .eq('is_filtered_out', false)
    .order('published_at', { ascending: false })
    .limit(200);

  const items = recentItems || [];

  // Match articles to watchlist entries
  const matches: Record<string, typeof items> = {};

  for (const entry of watchlist || []) {
    matches[entry.symbol] = [];

    const searchTerms = [
      entry.symbol.toLowerCase(),
      entry.company_name.toLowerCase(),
      ...(entry.keywords || []).map((k: string) => k.toLowerCase()),
      ...(entry.top_holdings || []).map((h: string) => h.toLowerCase()),
    ];

    for (const item of items) {
      const text = `${item.title} ${item.ai_summary || ''} ${item.summary || ''}`.toLowerCase();
      const matched = searchTerms.some(term => text.includes(term));
      if (matched) {
        matches[entry.symbol].push(item);
      }
    }
  }

  return NextResponse.json({
    watchlist: watchlist || [],
    matches,
  });
}

export async function POST(req: NextRequest) {
  const db = getServiceSupabase();
  const body = await req.json();

  const { symbol, company_name, type, sector, keywords, top_holdings } = body;

  if (!symbol || !company_name) {
    return NextResponse.json(
      { error: 'symbol and company_name are required' },
      { status: 400 }
    );
  }

  const { data, error } = await db
    .from('intel_watchlist')
    .insert({
      symbol: symbol.toUpperCase(),
      company_name,
      type: type || 'stock',
      sector: sector || null,
      keywords: keywords || [],
      top_holdings: top_holdings || [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const db = getServiceSupabase();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { error } = await db
    .from('intel_watchlist')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
