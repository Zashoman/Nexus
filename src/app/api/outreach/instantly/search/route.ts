import { NextResponse } from 'next/server';
import { listUniboxEmails, listCampaigns } from '@/lib/outreach/instantly';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ============================================================
// Deep search across the Instantly unibox
// ============================================================
// The normal /api/outreach/instantly/replies endpoint only
// fetches the most recent 100 emails because that's Instantly's
// per-request cap. When a user or team member asks "why didn't
// we reply to <specific person>?" the answer is often "that
// email is older than the 100 most recent and nobody saw it".
//
// This endpoint paginates through Instantly up to MAX_PAGES
// pages (100 per page) looking for any match on:
//   - sender email (case-insensitive substring)
//   - sender name
//   - subject line
//   - visible body preview
// Returns every match with enough context to act on it.
// ============================================================

const PAGE_SIZE = 100;
const MAX_PAGES = 10; // Up to 1,000 emails — balances coverage vs. rate limit
// Instantly caps at 20 requests/minute. We need a gap between page fetches
// so a 10-page crawl fits under the cap AND leaves headroom for the user's
// other traffic (weekly summary, daily summary, inbox page, etc.).
// 3,500ms between calls = 17 requests/min max per endpoint invocation.
const DELAY_BETWEEN_PAGES_MS = 3500;

function normalise(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return String(value);
  } catch {
    return '';
  }
}

function matches(email: Record<string, unknown>, queryLower: string): boolean {
  // Check from_address_json first (most reliable for sender info)
  const fromJson = email.from_address_json as Array<{ address?: string; name?: string }> | undefined;
  const addrFromJson = fromJson?.[0]?.address || '';
  const nameFromJson = fromJson?.[0]?.name || '';

  const candidates = [
    addrFromJson,
    nameFromJson,
    normalise(email.from_address_email),
    normalise(email.from_name),
    normalise(email.lead),
    normalise(email.subject),
    normalise(email.content_preview),
    normalise(email.text_body),
  ];

  // Also consider the body payload (can be object or string)
  const body = email.body;
  if (body && typeof body === 'object' && body !== null) {
    const b = body as Record<string, unknown>;
    candidates.push(normalise(b.text));
    candidates.push(normalise(b.html).replace(/<[^>]*>/g, ' '));
  } else if (typeof body === 'string') {
    candidates.push(body.replace(/<[^>]*>/g, ' '));
  }

  const hay = candidates.join(' | ').toLowerCase();
  return hay.includes(queryLower);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim();
    const maxPagesParam = parseInt(url.searchParams.get('max_pages') || String(MAX_PAGES), 10);
    const maxPages = Math.max(1, Math.min(MAX_PAGES, maxPagesParam));
    const campaignId = url.searchParams.get('campaign_id') || undefined;

    if (!q) {
      return NextResponse.json({ error: 'q query parameter is required' }, { status: 400 });
    }

    const queryLower = q.toLowerCase();

    // Campaigns for friendly name lookup
    const campaigns = await listCampaigns();
    const campaignMap: Record<string, string> = {};
    campaigns.forEach((c) => { campaignMap[c.id] = c.name; });

    const matchedEmails: Array<Record<string, unknown>> = [];
    let pagesFetched = 0;
    let totalScanned = 0;

    for (let page = 0; page < maxPages; page++) {
      // Throttle: skip the delay on the first page, pause between subsequent
      // pages so we stay under Instantly's 20/minute limit and don't
      // starve other concurrent endpoints (weekly summary, etc.).
      if (page > 0) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_PAGES_MS));
      }

      const batch = await listUniboxEmails({
        limit: PAGE_SIZE,
        skip: page * PAGE_SIZE,
        campaign_id: campaignId,
      });
      pagesFetched = page + 1;
      if (batch.length === 0) break;
      totalScanned += batch.length;

      for (const email of batch) {
        const raw = email as unknown as Record<string, unknown>;
        if (matches(raw, queryLower)) {
          matchedEmails.push(raw);
        }
      }

      // Short page = no more data
      if (batch.length < PAGE_SIZE) break;
    }

    // Build a clean response payload
    const results = matchedEmails.map((raw) => {
      const fromJson = raw.from_address_json as Array<{ address?: string; name?: string }> | undefined;
      const senderEmail = fromJson?.[0]?.address || normalise(raw.from_address_email) || normalise(raw.lead);
      const senderName =
        fromJson?.[0]?.name ||
        normalise(raw.from_name) ||
        senderEmail ||
        'Unknown';
      const campaignId = normalise(raw.campaign_id);
      const campaignName = campaignMap[campaignId] || 'Unknown campaign';
      const subject = normalise(raw.subject) || '(no subject)';
      const eaccount = normalise(raw.eaccount);
      const timestamp =
        normalise(raw.timestamp_email) ||
        normalise(raw.timestamp_created) ||
        normalise(raw.timestamp) ||
        normalise(raw.date);

      // Short preview of the body
      let preview = normalise(raw.content_preview);
      if (!preview && typeof raw.body === 'object' && raw.body !== null) {
        const b = raw.body as Record<string, unknown>;
        preview = (normalise(b.text) || normalise(b.html)).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      } else if (!preview && typeof raw.body === 'string') {
        preview = (raw.body as string).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }
      preview = preview.substring(0, 400);

      return {
        id: normalise(raw.id),
        sender_email: senderEmail,
        sender_name: senderName,
        subject,
        campaign_id: campaignId,
        campaign_name: campaignName,
        inbox: eaccount,
        timestamp,
        preview,
      };
    });

    // Sort newest first by timestamp when we have one
    results.sort((a, b) => {
      const at = new Date(a.timestamp || 0).getTime();
      const bt = new Date(b.timestamp || 0).getTime();
      return bt - at;
    });

    return NextResponse.json({
      ok: true,
      query: q,
      campaign_id: campaignId,
      campaign_name: campaignId ? (campaignMap[campaignId] || null) : null,
      match_count: results.length,
      pages_fetched: pagesFetched,
      emails_scanned: totalScanned,
      matches: results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Search failed';
    return NextResponse.json({ error: message, matches: [] }, { status: 500 });
  }
}
