// ============================================================
// Instantly API Client — READ-ONLY
// ============================================================
// SAFETY: This client only makes READ operations against Instantly.
// Most endpoints use GET. The one exception is POST /leads/list,
// which is a read-only filter-query endpoint (Instantly's standard
// pattern for leads); no leads are ever created or mutated here.
// No emails are sent through this client, and there are no write
// methods for campaigns, inboxes, or accounts.
// ============================================================

const INSTANTLY_API_V2 = 'https://api.instantly.ai/api/v2';

function getApiKey(): string {
  const key = process.env.INSTANTLY_API_KEY;
  if (!key) throw new Error('INSTANTLY_API_KEY is not set');
  return key;
}

async function instantlyGet<T>(endpoint: string, params?: Record<string, string>, retries = 3): Promise<T> {
  const url = new URL(`${INSTANTLY_API_V2}${endpoint}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiKey()}`,
        },
      });

      // Retry on rate limit
      if (res.status === 429 && attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Instantly API error (${res.status}): ${text.substring(0, 300)}`);
      }

      // Handle non-JSON responses safely
      const text = await res.text();
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new Error(`Instantly API returned non-JSON (${res.status}): ${text.substring(0, 200)}`);
      }
    } catch (err) {
      if (attempt < retries - 1 && err instanceof Error && (err.message.includes('429') || err.message.includes('fetch'))) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }

  throw new Error('Instantly API: max retries exceeded');
}

// -----------------------------------------------------------
// Campaign endpoints (READ-ONLY)
// -----------------------------------------------------------

export interface InstantlyCampaign {
  id: string;
  name: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

/** List all campaigns in the Instantly workspace */
export async function listCampaigns(): Promise<InstantlyCampaign[]> {
  const data = await instantlyGet<{ items: InstantlyCampaign[] } | InstantlyCampaign[]>('/campaigns', {
    limit: '100',
    skip: '0',
  });

  if (Array.isArray(data)) return data;
  if ('items' in data) return data.items;
  return [];
}

/** Get campaign summary/status */
export async function getCampaignSummary(campaignId: string) {
  return instantlyGet<Record<string, unknown>>(`/campaigns/${campaignId}/analytics`, {});
}

// -----------------------------------------------------------
// Inbox / Email endpoints (READ-ONLY)
// -----------------------------------------------------------

export interface InstantlyEmail {
  id: string;
  from_address_email?: string;
  from_address?: string;
  to_address_email_list?: string;
  to_address_email?: string;
  to_address?: string;
  from_name?: string;
  to_name?: string;
  subject?: string;
  body?: unknown;
  text_body?: string;
  html_body?: string;
  timestamp?: string;
  timestamp_created?: string;
  created_at?: string;
  date?: string;
  is_read?: boolean;
  campaign_id?: string;
  campaign_name?: string;
  thread_id?: string;
  message_type?: string;
  direction?: string;
  lead_email?: string;
  lead?: string;
  account_email?: string;
  eaccount?: string;
  ue_type?: number;
  i_status?: number;
  content_preview?: string;
  from_address_json?: Array<{ address: string; name: string }>;
  to_address_json?: Array<{ address: string; name: string }>;
  [key: string]: unknown;
}

/** Read emails from the unibox — all campaigns or filtered */
export async function listEmails(params?: {
  campaign_id?: string;
  email_type?: string;
  limit?: number;
  skip?: number;
}): Promise<InstantlyEmail[]> {
  const queryParams: Record<string, string> = {
    limit: String(params?.limit || 50),
  };

  if (params?.campaign_id) queryParams.campaign_id = params.campaign_id;
  if (params?.email_type) queryParams.email_type = params.email_type;
  if (params?.skip) queryParams.skip = String(params.skip);

  const data = await instantlyGet<{ items: InstantlyEmail[] } | InstantlyEmail[] | { data: InstantlyEmail[] }>('/emails', queryParams);

  if (Array.isArray(data)) return data;
  if ('items' in data && Array.isArray((data as { items: unknown }).items)) return (data as { items: InstantlyEmail[] }).items;
  if ('data' in data && Array.isArray((data as { data: unknown }).data)) return (data as { data: InstantlyEmail[] }).data;
  return [];
}

/** Read unibox emails — the main inbox view */
export async function listUniboxEmails(params?: {
  campaign_id?: string;
  limit?: number;
  skip?: number;
  email_type?: string;
}): Promise<InstantlyEmail[]> {
  const queryParams: Record<string, string> = {
    limit: String(params?.limit || 50),
  };

  if (params?.campaign_id) queryParams.campaign_id = params.campaign_id;
  if (params?.skip) queryParams.skip = String(params.skip);
  if (params?.email_type) queryParams.email_type = params.email_type;

  try {
    const data = await instantlyGet<{ items: InstantlyEmail[] } | InstantlyEmail[] | { data: InstantlyEmail[] }>('/unibox/emails', queryParams);
    if (Array.isArray(data)) return data;
    if ('items' in data && Array.isArray((data as { items: unknown }).items)) return (data as { items: InstantlyEmail[] }).items;
    if ('data' in data && Array.isArray((data as { data: unknown }).data)) return (data as { data: InstantlyEmail[] }).data;
    return [];
  } catch {
    return listEmails(params);
  }
}

// -----------------------------------------------------------
// Connection test (READ-ONLY)
// -----------------------------------------------------------

/** Test if the API key is valid by listing campaigns */
export async function testConnection(): Promise<{ ok: boolean; error?: string; campaign_count?: number }> {
  try {
    const campaigns = await listCampaigns();
    return { ok: true, campaign_count: campaigns.length };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

// -----------------------------------------------------------
// Leads (READ-ONLY POST — /leads/list uses POST with a JSON
// body for filtering, but is itself a pure read operation.
// No leads are created or modified here.)
// -----------------------------------------------------------

export interface InstantlyLead {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  campaign?: string;
  status?: number | string;
  created_at?: string;
  last_step_from?: string;
  last_step_timestamp_executed?: string;
  personalization?: string;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

/** List leads, optionally filtered by search string, campaign, or status.
 *  Uses POST /api/v2/leads/list (Instantly's standard filter-query pattern
 *  for leads). This is a pure read operation; no leads are mutated. */
export async function listLeads(params: {
  search?: string;
  campaign_id?: string;
  limit?: number;
  starting_after?: string;
}): Promise<{ items: InstantlyLead[]; next_starting_after?: string }> {
  const body: Record<string, unknown> = {
    limit: params.limit || 50,
  };
  if (params.search) body.search = params.search;
  if (params.campaign_id) body.campaign = params.campaign_id;
  if (params.starting_after) body.starting_after = params.starting_after;

  const url = `${INSTANTLY_API_V2}/leads/list`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify(body),
      });

      if (res.status === 429 && attempt < 2) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Instantly leads API error (${res.status}): ${text.substring(0, 300)}`);
      }
      const text = await res.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Instantly leads API returned non-JSON: ${text.substring(0, 200)}`);
      }

      const d = data as Record<string, unknown>;
      const items = (d.items || d.data || []) as InstantlyLead[];
      const next = d.next_starting_after as string | undefined;
      return { items, next_starting_after: next };
    } catch (err) {
      if (attempt < 2 && err instanceof Error && (err.message.includes('429') || err.message.includes('fetch'))) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }

  throw new Error('Instantly leads API: max retries exceeded');
}
