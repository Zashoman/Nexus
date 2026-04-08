import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

async function postToGoogleSheet(webhookUrl: string, payload: string): Promise<boolean> {
  // Attempt 1: POST with redirect manual + follow
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
  const gdocWebhook = process.env.JOURNAL_GDOC_WEBHOOK;
  if (!gdocWebhook) {
    return NextResponse.json({ error: 'JOURNAL_GDOC_WEBHOOK not configured' }, { status: 500 });
  }

  const { entry_id } = await req.json();

  if (!entry_id) {
    return NextResponse.json({ error: 'No entry_id provided' }, { status: 400 });
  }

  const db = getServiceSupabase();

  const { data: entry, error } = await db
    .from('journal_entries')
    .select('*')
    .eq('id', entry_id)
    .single();

  if (error || !entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  const dateStr = new Date(entry.created_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const payload = JSON.stringify({
    entry_number: entry.entry_number,
    date: dateStr,
    journal_entry: entry.entry_text,
    analysis: entry.analysis || '',
  });

  const success = await postToGoogleSheet(gdocWebhook, payload);

  if (success) {
    return NextResponse.json({ status: 'ok', message: 'Backed up to Google Sheet' });
  } else {
    return NextResponse.json({ error: 'Failed to send to Google Sheet. Check your webhook URL.' }, { status: 502 });
  }
}
