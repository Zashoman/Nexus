import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceSupabase();
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.tier !== undefined) updates.tier = body.tier;
  if (body.status !== undefined) updates.status = body.status;
  if (body.raised !== undefined) updates.raised = body.raised;
  if (body.valuation !== undefined) updates.valuation = body.valuation;
  if (body.notes !== undefined) updates.notes = body.notes;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('robox_companies')
    .update(updates)
    .eq('id', parseInt(id))
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceSupabase();

  const { error } = await supabase
    .from('robox_companies')
    .delete()
    .eq('id', parseInt(id));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
