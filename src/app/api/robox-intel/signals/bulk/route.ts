import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import type { SignalStatus } from '@/types/robox-intel';

/**
 * PATCH /api/robox-intel/signals/bulk
 * Body: { ids: number[], status?, relevance?, tags? }
 *
 * Applies the same update to multiple signals in one call. Useful for
 * marking an entire company's backlog 'reviewed' or dismissing noise.
 */
export async function PATCH(req: NextRequest) {
  const supabase = getServiceSupabase();
  const body = await req.json();

  const ids = Array.isArray(body.ids)
    ? body.ids.map((n: unknown) => parseInt(String(n), 10)).filter(Number.isFinite)
    : [];
  if (ids.length === 0) {
    return NextResponse.json(
      { error: 'Body must include non-empty `ids` array of numbers' },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.status !== undefined) {
    const validStatuses: SignalStatus[] = [
      'new', 'reviewing', 'queued', 'acted', 'dismissed',
    ];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }
    updates.status = body.status;
    if (body.status === 'acted') {
      updates.acted_at = new Date().toISOString();
    }
  }
  if (body.relevance !== undefined) updates.relevance = body.relevance;
  if (body.tags !== undefined) updates.tags = body.tags;

  const { data, error } = await supabase
    .from('robox_signals')
    .update(updates)
    .in('id', ids)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    updated: (data || []).length,
    signals: data || [],
  });
}
