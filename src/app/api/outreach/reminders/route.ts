import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/outreach/supabase';

// GET: list all reminders
export async function GET() {
  try {
    const supabase = getServiceSupabase();

    // Update statuses based on due dates
    const today = new Date().toISOString().split('T')[0];
    const weekFromNow = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    // Mark overdue
    await supabase
      .from('reminders')
      .update({ status: 'overdue' })
      .lt('due_date', today)
      .in('status', ['upcoming', 'due_soon']);

    // Mark due soon (within 7 days — exclusive upper bound)
    await supabase
      .from('reminders')
      .update({ status: 'due_soon' })
      .gte('due_date', today)
      .lt('due_date', weekFromNow)
      .eq('status', 'upcoming');

    // Fetch all active reminders
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .in('status', ['overdue', 'due_soon', 'upcoming', 'snoozed'])
      .order('due_date', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Count by status
    const overdue = (data || []).filter((r) => r.status === 'overdue').length;
    const dueSoon = (data || []).filter((r) => r.status === 'due_soon').length;
    const upcoming = (data || []).filter((r) => r.status === 'upcoming' || r.status === 'snoozed').length;

    return NextResponse.json({
      reminders: data || [],
      counts: { overdue, due_soon: dueSoon, upcoming },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

// POST: create a new reminder
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = getServiceSupabase();

    const { data, error } = await supabase.from('reminders').insert({
      type: body.type || 'manual',
      contact_name: body.contact_name,
      contact_title: body.contact_title,
      contact_email: body.contact_email,
      company_or_publication: body.company_or_publication,
      campaign_id: body.campaign_id,
      due_date: body.due_date,
      original_due_date: body.due_date,
      original_reply: body.original_reply,
      manual_note: body.manual_note,
      ai_summary: body.ai_summary,
      suggested_action: body.suggested_action,
      created_by: body.created_by,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ reminder: data }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

// PATCH: update a reminder (snooze, dismiss, complete)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const supabase = getServiceSupabase();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.action === 'snooze') {
      const days = body.days || 7;
      const newDate = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
      updates.due_date = newDate;
      updates.status = 'snoozed';
      updates.snooze_count = (body.current_snooze_count || 0) + 1;
    } else if (body.action === 'dismiss') {
      updates.status = 'dismissed';
    } else if (body.action === 'complete') {
      updates.status = 'completed';
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
