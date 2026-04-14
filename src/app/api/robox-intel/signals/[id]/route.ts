import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('robox_signals')
    .select('*')
    .eq('id', parseInt(id))
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceSupabase();
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.relevance !== undefined) updates.relevance = body.relevance;
  if (body.tags !== undefined) updates.tags = body.tags;
  updates.updated_at = new Date().toISOString();

  // Set acted_at when status changes to 'acted'
  if (body.status === 'acted') {
    updates.acted_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('robox_signals')
    .update(updates)
    .eq('id', parseInt(id))
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
