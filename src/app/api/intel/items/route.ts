import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const db = getServiceSupabase();
  const { searchParams } = new URL(req.url);

  const category = searchParams.get('category');
  const impact_level = searchParams.get('impact_level');
  const include_filtered = searchParams.get('include_filtered') === 'true';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = (page - 1) * limit;

  let query = db
    .from('intel_items')
    .select('*', { count: 'exact' })
    .order('ingested_at', { ascending: false })
    .range(offset, offset + limit - 1);

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

  // Get ratings for these items
  const itemIds = (items || []).map((i) => i.id);
  const { data: ratings } = await db
    .from('intel_ratings')
    .select('item_id, rating')
    .in('item_id', itemIds.length > 0 ? itemIds : ['__none__']);

  // Get group info
  const { data: groups } = await db
    .from('intel_item_groups')
    .select('*')
    .overlaps('grouped_item_ids', itemIds.length > 0 ? itemIds : ['__none__']);

  // Merge data
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

  // Filter out non-primary grouped items
  const primaryIds = new Set(
    (groups || []).map((g) => g.primary_item_id)
  );
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

  // Stats
  const { count: totalCount } = await db
    .from('intel_items')
    .select('*', { count: 'exact', head: true });

  const { count: filteredCount } = await db
    .from('intel_items')
    .select('*', { count: 'exact', head: true })
    .eq('is_filtered_out', false);

  const { count: highPriorityCount } = await db
    .from('intel_items')
    .select('*', { count: 'exact', head: true })
    .in('impact_level', ['high', 'critical'])
    .eq('is_filtered_out', false);

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
