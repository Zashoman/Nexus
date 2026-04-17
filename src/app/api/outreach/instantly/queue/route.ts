import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/outreach/supabase';

export const dynamic = 'force-dynamic';

interface QueuedProspect {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  title?: string;
  organization?: { name?: string; industry?: string };
  subject?: string;
  opener?: string;
}

// POST: stage approved pitches for a future Instantly import.
// This does NOT write to the Instantly API (the lib/outreach/instantly.ts
// client is intentionally read-only). It stores the pitches in Supabase
// so a human can review the batch and export/import it on their own.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prospects: QueuedProspect[];
      instantly_campaign_id?: string;
      instantly_campaign_name?: string;
      queued_by?: string;
      notes?: string;
    };

    const prospects = Array.isArray(body.prospects) ? body.prospects : [];
    if (prospects.length === 0) {
      return NextResponse.json({ error: 'prospects array is required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const rows = prospects.map((p) => ({
      prospect_id: p.id,
      first_name: p.first_name || null,
      last_name: p.last_name || null,
      email: p.email || null,
      title: p.title || null,
      organization_name: p.organization?.name || null,
      organization_industry: p.organization?.industry || null,
      subject: p.subject || null,
      opener: p.opener || null,
      instantly_campaign_id: body.instantly_campaign_id || null,
      instantly_campaign_name: body.instantly_campaign_name || null,
      status: 'queued',
      queued_by: body.queued_by || null,
      notes: body.notes || null,
    }));

    const { error } = await supabase.from('instantly_queue').insert(rows);
    if (error) throw new Error(error.message);

    return NextResponse.json({ queued: rows.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to queue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: list queued pitches. Supports ?status=queued,exported and ?limit=20
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = (url.searchParams.get('status') || 'queued').split(',').filter(Boolean);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

    const supabase = getServiceSupabase();

    const query = supabase
      .from('instantly_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status.length > 0) query.in('status', status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Aggregate counts by status for the UI badge
    const { data: countRows } = await supabase
      .from('instantly_queue')
      .select('status');

    const counts: Record<string, number> = { queued: 0, exported: 0, imported: 0, skipped: 0 };
    (countRows || []).forEach((r) => {
      const s = (r as { status: string }).status;
      counts[s] = (counts[s] || 0) + 1;
    });

    return NextResponse.json({ items: data || [], counts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list';
    return NextResponse.json({ error: message, items: [], counts: {} }, { status: 500 });
  }
}

// PATCH: update status (mark exported, imported, skipped)
export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { ids: string[]; status: string };
    const { ids, status } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }
    if (!['queued', 'exported', 'imported', 'skipped'].includes(status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from('instantly_queue')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', ids);

    if (error) throw new Error(error.message);
    return NextResponse.json({ updated: ids.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
