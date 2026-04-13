import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/outreach/supabase';

// GET: list past Apollo searches
export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from('apollo_searches')
      .select('id, search_name, filters, total_results, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({ searches: data || [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
