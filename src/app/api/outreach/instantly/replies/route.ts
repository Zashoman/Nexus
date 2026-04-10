import { NextResponse } from 'next/server';
import { listUniboxEmails } from '@/lib/outreach/instantly';

// Known Blue Tree email domains — emails FROM these are outbound, not prospect replies
const BLUE_TREE_DOMAINS = [
  'bluetree.ai',
  'bluetreesaas.org',
  'bluetreeailinks.org',
  'bluetreegrow.org',
  'bluetreedigitalpr.com',
  'bluetreeaidigital.org',
  'bluetreeteams.org',
  'bluetreedigitalpr.org',
  'bluetreeaidigital.com',
];

function isBlueTreeEmail(email: string): boolean {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return BLUE_TREE_DOMAINS.some((d) => domain === d || domain?.endsWith('.' + d));
}

function isInboundReply(email: Record<string, unknown>): boolean {
  const fromEmail = String(email.from_address_email || '').toLowerCase();
  const lead = String(email.lead || '').toLowerCase();
  const eaccount = String(email.eaccount || '').toLowerCase();

  // If sender is a Blue Tree email, it's outbound — not a prospect reply
  if (isBlueTreeEmail(fromEmail)) return false;

  // If sender matches the eaccount (Blue Tree sending account), it's outbound
  if (fromEmail && eaccount && fromEmail === eaccount) return false;

  // If sender matches the lead, it's definitely an inbound reply from the prospect
  if (fromEmail && lead && fromEmail === lead) return true;

  // If from_address_json exists, check the first entry
  const fromJson = email.from_address_json as Array<{ address: string }> | undefined;
  if (fromJson?.[0]?.address) {
    const jsonEmail = fromJson[0].address.toLowerCase();
    if (isBlueTreeEmail(jsonEmail)) return false;
    if (jsonEmail === lead) return true;
  }

  // Default: if ue_type is 2 (received), likely inbound
  return email.ue_type === 2;
}

// GET-only: list emails from Instantly unibox
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaign_id') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');
    const repliesOnly = searchParams.get('replies_only') !== 'false';

    const emails = await listUniboxEmails({
      campaign_id: campaignId,
      limit,
      skip,
    });

    const filtered = repliesOnly
      ? emails.filter((e) => isInboundReply(e as unknown as Record<string, unknown>))
      : emails;

    return NextResponse.json({ emails: filtered, count: filtered.length, total_fetched: emails.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch emails';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
