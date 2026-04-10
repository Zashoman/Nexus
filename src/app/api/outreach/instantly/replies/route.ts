import { NextResponse } from 'next/server';
import { listUniboxEmails } from '@/lib/outreach/instantly';

// GET-only: list emails from Instantly unibox
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaign_id') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');
    const repliesOnly = searchParams.get('replies_only') !== 'false'; // default true

    const emails = await listUniboxEmails({
      campaign_id: campaignId,
      limit,
      skip,
    });

    // ue_type meanings from Instantly:
    // 1 = sent by you (outbound)
    // 2 = received reply (inbound)
    // 3 = manual/forwarded
    const filtered = repliesOnly
      ? emails.filter((e) => {
          const ueType = (e as Record<string, unknown>).ue_type;
          return ueType === 2 || ueType === 3;
        })
      : emails;

    return NextResponse.json({ emails: filtered, count: filtered.length, total_fetched: emails.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch emails';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
