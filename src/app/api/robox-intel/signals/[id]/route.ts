import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { appendHistory } from '@/lib/robox-intel/history';

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
  const signalId = parseInt(id);
  const supabase = getServiceSupabase();
  const body = await req.json();

  // Load current state for history diff
  const { data: before } = await supabase
    .from('robox_signals')
    .select('status, relevance, notes, snoozed_until')
    .eq('id', signalId)
    .single();

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.relevance !== undefined) updates.relevance = body.relevance;
  if (body.tags !== undefined) updates.tags = body.tags;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.snoozed_until !== undefined) {
    updates.snoozed_until = body.snoozed_until;
  }
  updates.updated_at = new Date().toISOString();

  // Set acted_at when status changes to 'acted'
  if (body.status === 'acted') {
    updates.acted_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('robox_signals')
    .update(updates)
    .eq('id', signalId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Append history entries for any fields that changed
  if (before) {
    if (body.status !== undefined && body.status !== before.status) {
      await appendHistory(
        signalId,
        'status_change',
        before.status,
        body.status
      );
    }
    if (body.relevance !== undefined && body.relevance !== before.relevance) {
      await appendHistory(
        signalId,
        'relevance_change',
        before.relevance,
        body.relevance
      );
    }
    if (body.notes !== undefined && body.notes !== before.notes) {
      await appendHistory(
        signalId,
        before.notes ? 'note_updated' : 'note_added',
        null,
        null,
        { length: (body.notes || '').length }
      );
    }
    if (body.snoozed_until !== undefined) {
      await appendHistory(
        signalId,
        body.snoozed_until ? 'snoozed' : 'unsnoozed',
        before.snoozed_until,
        body.snoozed_until
      );
    }
  }

  return NextResponse.json(data);
}
