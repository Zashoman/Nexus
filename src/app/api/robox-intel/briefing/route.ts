import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('robox_signals')
    .select('*')
    .eq('status', 'new')
    .eq('relevance', 'high')
    .order('date', { ascending: false })
    .limit(4);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ signals: data || [] });
}
