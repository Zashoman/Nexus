// ============================================================
// Instantly API Client — READ-ONLY
// ============================================================
// SAFETY: This client only exposes GET methods.
// No POST, PUT, DELETE, or PATCH methods exist.
// No emails can be sent through this client.
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
