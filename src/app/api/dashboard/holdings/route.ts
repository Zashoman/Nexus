import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  const db = getServiceSupabase();
  const { data } = await db
    .from('dashboard_holdings')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return NextResponse.json({ holdings: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const db = getServiceSupabase();
  const { ticker, display_name, category } = await req.json();
  if (!ticker || !display_name) {
    return NextResponse.json({ error: 'ticker and display_name required' }, { status: 400 });
  }
  const { data, error } = await db
    .from('dashboard_holdings')
    .insert({ ticker: ticker.toUpperCase(), display_name, category: category || 'other' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ holding: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const db = getServiceSupabase();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await db.from('dashboard_holdings').update({ is_active: false }).eq('id', id);
  return NextResponse.json({ success: true });
}
