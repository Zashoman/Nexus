import { NextResponse } from 'next/server';
import { listUniboxEmails } from '@/lib/outreach/instantly';

// GET-only: list emails from Instantly unibox
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaign_id') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const emails = await listUniboxEmails({
      campaign_id: campaignId,
      limit,
      skip,
    });

    return NextResponse.json({ emails, count: emails.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch emails';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
