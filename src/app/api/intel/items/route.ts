import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const db = getServiceSupabase();
  const { searchParams } = new URL(req.url);

  const category = searchParams.get('category');
  const impact_level = searchParams.get('impact_level');
  const include_filtered = searchParams.get('include_filtered') === 'true';
  const archive = searchParams.get('archive') === 'true';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = (page - 1) * limit;

  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  let query = db
    .from('intel_items')
    .select('*', { count: 'exact' })
    .order(archive ? 'dismissed_at' : 'published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Archive mode shows dismissed items, normal mode hides them
  if (archive) {
    query = query.eq('is_dismissed', true);
  } else {
    query = query.or('is_dismissed.eq.false,is_dismissed.is.null');
    query = query.or(`published_at.gte.${cutoff},and(published_at.is.null,ingested_at.gte.${cutoff})`);
    // Exclude items with future published_at dates (e.g. conference announcements)
    query = query.lte('published_at', now);
  }

  if (category) {
    query = query.eq('category', category);
  }
  if (impact_level) {
    query = query.eq('impact_level', impact_level);
  }
  if (!include_filtered) {
    query = query.eq('is_filtered_out', false);
  }

  const { data: items, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const itemIds = (items || []).map((i) => i.id);
  const { data: ratings } = await db
    .from('intel_ratings')
    .select('item_id, rating')
    .in('item_id', itemIds.length > 0 ? itemIds : ['__none__']);

  const { data: groups } = await db
    .from('intel_item_groups')
    .select('*')
    .overlaps('grouped_item_ids', itemIds.length > 0 ? itemIds : ['__none__']);

  const ratingsMap = new Map(
    (ratings || []).map((r) => [r.item_id, r.rating])
  );
  const groupsMap = new Map<string, number>();
  for (const group of groups || []) {
    for (const id of group.grouped_item_ids) {
      groupsMap.set(id, group.source_count);
    }
  }

  const enrichedItems = (items || []).map((item) => ({
    ...item,
    rating: ratingsMap.get(item.id) || null,
    group_source_count: groupsMap.get(item.id) || null,
  }));

  const groupedNonPrimary = new Set<string>();
  for (const group of groups || []) {
    for (const id of group.grouped_item_ids) {
      if (id !== group.primary_item_id) {
        groupedNonPrimary.add(id);
      }
    }
  }

  const finalItems = enrichedItems.filter(
    (item) => !groupedNonPrimary.has(item.id)
  );

  const { count: totalCount } = await db
    .from('intel_items')
    .select('*', { count: 'exact', head: true });

  const { count: filteredCount } = await db
    .from('intel_items')
    .select('*', { count: 'exact', head: true })
    .eq('is_filtered_out', false)
    .or('is_dismissed.eq.false,is_dismissed.is.null');

  const { count: highPriorityCount } = await db
    .from('intel_items')
    .select('*', { count: 'exact', head: true })
    .in('impact_level', ['high', 'critical'])
    .eq('is_filtered_out', false)
    .or('is_dismissed.eq.false,is_dismissed.is.null');

  return NextResponse.json({
    items: finalItems,
    total: count,
    page,
    limit,
    stats: {
      total_ingested: totalCount || 0,
      passed_filter: filteredCount || 0,
      high_priority: highPriorityCount || 0,
    },
  });
}

// Dismiss/archive an item
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const db = getServiceSupabase();
  const body = await req.json();
  const { item_id, is_dismissed } = body as { item_id: string; is_dismissed: boolean };

  if (!item_id) {
    return NextResponse.json({ error: 'item_id required' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { is_dismissed };
  if (is_dismissed) {
    updates.dismissed_at = new Date().toISOString();
  } else {
    updates.dismissed_at = null;
  }

  const { error } = await db
    .from('intel_items')
    .update(updates)
    .eq('id', item_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
