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

async function instantlyGet<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${INSTANTLY_API_V2}${endpoint}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly API error (${res.status}): ${text}`);
  }

  return res.json();
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

  // v2 API may return { items: [...] } or [...]
  if (Array.isArray(data)) return data;
  if ('items' in data) return data.items;
  return [];
}

/** Get campaign summary/status */
export async function getCampaignSummary(campaignId: string) {
  return instantlyGet<Record<string, unknown>>(`/campaigns/${campaignId}/analytics`, {});
}

// -----------------------------------------------------------
// Inbox / Reply endpoints (READ-ONLY)
// -----------------------------------------------------------

export interface InstantlyEmail {
  id: string;
  from_address?: string;
  to_address?: string;
  from_name?: string;
  to_name?: string;
  subject?: string;
  body?: string;
  timestamp?: string;
  is_read?: boolean;
  campaign_id?: string;
  thread_id?: string;
}

/** Read emails from the unibox (inbox) */
export async function listEmails(params?: {
  campaign_id?: string;
  email_type?: 'all' | 'received' | 'sent';
  limit?: number;
  skip?: number;
}): Promise<InstantlyEmail[]> {
  const queryParams: Record<string, string> = {};

  if (params?.campaign_id) queryParams.campaign_id = params.campaign_id;
  if (params?.email_type) queryParams.email_type = params.email_type;
  if (params?.limit) queryParams.limit = String(params.limit);
  if (params?.skip) queryParams.skip = String(params.skip);

  const data = await instantlyGet<{ items: InstantlyEmail[] } | InstantlyEmail[]>('/emails', queryParams);

  if (Array.isArray(data)) return data;
  if ('items' in data) return data.items;
  return [];
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
