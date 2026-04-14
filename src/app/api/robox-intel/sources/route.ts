import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const supabase = getServiceSupabase();
  const params = req.nextUrl.searchParams;
  const category = params.get('category');
  const status = params.get('status');

  let query = supabase.from('robox_sources').select('*');

  if (category) query = query.eq('category', category);
  if (status) query = query.eq('status', status);

  query = query.order('name');

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sources: data || [] });
}
