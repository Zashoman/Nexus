import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

async function deleteFromGoogleSheet(webhookUrl: string, entryNumber: number): Promise<boolean> {
  const payload = JSON.stringify({ action: 'delete', entry_number: entryNumber });
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: payload,
      redirect: 'manual',
    });

    if (res.status >= 300 && res.status < 400) {
      const redirectUrl = res.headers.get('location');
      if (redirectUrl) {
        const res2 = await fetch(redirectUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: payload,
          redirect: 'follow',
        });
        return res2.ok;
      }
    }
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { entry_id } = await req.json();

  if (!entry_id) {
    return NextResponse.json({ error: 'No entry_id provided' }, { status: 400 });
  }

  const db = getServiceSupabase();

  // Get entry first (need entry_number for sheet deletion)
  const { data: entry, error: fetchError } = await db
    .from('journal_entries')
    .select('*')
    .eq('id', entry_id)
    .single();

  if (fetchError || !entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  // Delete from database
  const { error: deleteError } = await db
    .from('journal_entries')
    .delete()
    .eq('id', entry_id);

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete: ' + deleteError.message }, { status: 500 });
  }

  // Delete from Google Sheet (non-blocking, best effort)
  const gdocWebhook = process.env.JOURNAL_GDOC_WEBHOOK;
  if (gdocWebhook) {
    deleteFromGoogleSheet(gdocWebhook, entry.entry_number).catch(() => {});
  }

  return NextResponse.json({ status: 'ok', message: 'Entry deleted' });
}
