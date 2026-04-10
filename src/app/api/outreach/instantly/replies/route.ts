import { NextResponse } from 'next/server';
import { listEmails } from '@/lib/outreach/instantly';

// GET-only: list replies for a specific campaign
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaign_id');

    if (!campaignId) {
      return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 });
    }

    const emails = await listEmails({
      campaign_id: campaignId,
      email_type: 'received',
      limit: 50,
    });

    return NextResponse.json({ emails });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch replies';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
