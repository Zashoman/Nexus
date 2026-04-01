import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getServiceSupabase();

  const { data: evidence, error } = await db
    .from('intel_belief_evidence')
    .select('*')
    .eq('belief_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get linked items
  const itemIds = (evidence || []).map((e) => e.item_id).filter(Boolean);
  const { data: items } = await db
    .from('intel_items')
    .select('id, title, source_name, source_tier, impact_level, published_at')
    .in('id', itemIds.length > 0 ? itemIds : ['__none__']);

  const itemsMap = new Map((items || []).map((i) => [i.id, i]));

  const enriched = (evidence || []).map((e) => ({
    ...e,
    item: itemsMap.get(e.item_id) || null,
  }));

  return NextResponse.json({ evidence: enriched });
}
