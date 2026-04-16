import { NextResponse } from 'next/server';
import { listUniboxEmails, listLeads, listCampaigns } from '@/lib/outreach/instantly';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ============================================================
// Diagnostic endpoint — shows what Instantly ACTUALLY returns
// for a specific query, across multiple data sources.
// ============================================================
// Use this when the deep search says "not found" but the user knows
// the person exists in Instantly. Returns raw results from:
//   1. /leads/list (POST)  — the contact list
//   2. /unibox/emails      — email feed (sent + received)
// Plus field-name metadata so we can see what Instantly is storing.
// ============================================================

function deepSearchAnyString(value: unknown, queryLower: string, depth = 0): boolean {
  if (depth > 10) return false;
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const stripped = value.includes('<') ? value.replace(/<[^>]*>/g, ' ') : value;
    return stripped.toLowerCase().includes(queryLower);
  }
  if (Array.isArray(value)) {
    return value.some((v) => deepSearchAnyString(v, queryLower, depth + 1));
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((v) =>
      deepSearchAnyString(v, queryLower, depth + 1),
    );
  }
  return false;
}

function summariseLead(lead: Record<string, unknown>) {
  return {
    id: lead.id,
    email: lead.email,
    first_name: lead.first_name,
    last_name: lead.last_name,
    company_name: lead.company_name,
    campaign: lead.campaign,
    status: lead.status,
    status_summary: lead.status_summary,
    created_at: lead.created_at,
    last_step_from: lead.last_step_from,
    last_step_timestamp_executed: lead.last_step_timestamp_executed,
    // keep ALL keys visible so we can see the full shape
    all_keys: Object.keys(lead),
  };
}

function summariseEmail(email: Record<string, unknown>) {
  return {
    id: email.id,
    from_address_email: email.from_address_email,
    to_address_email: email.to_address_email,
    to_address_email_list: email.to_address_email_list,
    lead: email.lead,
    subject: email.subject,
    campaign_id: email.campaign_id,
    eaccount: email.eaccount,
    timestamp_email: email.timestamp_email,
    timestamp_created: email.timestamp_created,
    ue_type: email.ue_type,
    direction_from_address_json: email.from_address_json,
    direction_to_address_json: email.to_address_json,
    all_keys: Object.keys(email),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  const campaignName = url.searchParams.get('campaign_name') || '';
  const campaignIdParam = url.searchParams.get('campaign_id') || '';

  if (!q) {
    return NextResponse.json({ error: 'q query parameter is required (e.g. ?q=vterenina)' }, { status: 400 });
  }

  const queryLower = q.toLowerCase();
  const report: Record<string, unknown> = { query: q };

  // 1. Resolve campaign_id if user gave a name
  let campaignId = campaignIdParam;
  let campaignMatchedByName: { id: string; name: string } | null = null;
  try {
    const campaigns = await listCampaigns();
    report.total_campaigns = campaigns.length;
    if (campaignName && !campaignId) {
      const match = campaigns.find((c) => c.name.toLowerCase().includes(campaignName.toLowerCase()));
      if (match) {
        campaignId = match.id;
        campaignMatchedByName = { id: match.id, name: match.name };
      }
    }
    if (campaignId) {
      const match = campaigns.find((c) => c.id === campaignId);
      if (match) campaignMatchedByName = { id: match.id, name: match.name };
    }
    report.campaign_resolved = campaignMatchedByName;
  } catch (err) {
    report.campaigns_error = err instanceof Error ? err.message : String(err);
  }

  // 2. Query leads — this is the one we've been blind to
  try {
    const leadsResult = await listLeads({
      search: q,
      campaign_id: campaignId || undefined,
      limit: 100,
    });
    const leadMatches = (leadsResult.items || []).filter((lead) =>
      deepSearchAnyString(lead as unknown, queryLower),
    );
    report.leads_api_ok = true;
    report.leads_total_returned = leadsResult.items?.length || 0;
    report.leads_matching_query = leadMatches.length;
    report.leads_sample = leadMatches.slice(0, 10).map((l) => summariseLead(l as Record<string, unknown>));
    report.leads_next_page = leadsResult.next_starting_after || null;
  } catch (err) {
    report.leads_api_ok = false;
    report.leads_error = err instanceof Error ? err.message : String(err);
  }

  // 3. Query unibox (single page) — what deep search has been using
  try {
    const uniboxBatch = await listUniboxEmails({
      limit: 100,
      campaign_id: campaignId || undefined,
    });
    const emailMatches = uniboxBatch.filter((e) =>
      deepSearchAnyString(e as unknown, queryLower),
    );
    report.unibox_api_ok = true;
    report.unibox_total_returned = uniboxBatch.length;
    report.unibox_matching_query = emailMatches.length;
    report.unibox_sample = emailMatches.slice(0, 10).map((e) => summariseEmail(e as Record<string, unknown>));
    // Also show the shape of the FIRST email regardless of match, so we
    // can confirm what fields Instantly populates.
    if (uniboxBatch.length > 0) {
      report.unibox_first_email_keys = Object.keys(uniboxBatch[0] as Record<string, unknown>);
    }
  } catch (err) {
    report.unibox_api_ok = false;
    report.unibox_error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(report);
}
