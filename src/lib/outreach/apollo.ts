// ============================================================
// Apollo API Client
// ============================================================
// Used to search prospects and pull enrichment data for sales
// outreach campaigns.
// ============================================================

const APOLLO_API_BASE = 'https://api.apollo.io/api/v1';

function getApiKey(): string {
  const key = process.env.APOLLO_API_KEY;
  if (!key) throw new Error('APOLLO_API_KEY is not set');
  return key;
}

async function apolloPost<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const apiKey = getApiKey();
  const res = await fetch(`${APOLLO_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'X-Api-Key': apiKey,
    },
    // Apollo accepts api_key in the body as well — some endpoints
    // require it there instead of (or in addition to) the header.
    body: JSON.stringify({ ...body, api_key: apiKey }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo API error (${res.status}): ${text.substring(0, 500)}`);
  }

  return res.json();
}

// -----------------------------------------------------------
// Person search
// -----------------------------------------------------------

export interface ApolloSearchFilters {
  // Job titles (e.g., "CTO", "VP Marketing")
  person_titles?: string[];
  // Industries
  organization_industries?: string[];
  // Company size buckets (e.g., "1-10", "11-50", "51-200")
  organization_num_employees_ranges?: string[];
  // Locations (countries, states, cities)
  person_locations?: string[];
  organization_locations?: string[];
  // Funding stage
  organization_funding_stage?: string[];
  // Keywords
  q_keywords?: string;
  // Page
  page?: number;
  per_page?: number;
}

export interface ApolloPerson {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  email?: string;
  email_status?: string;
  linkedin_url?: string;
  organization?: {
    id?: string;
    name?: string;
    website_url?: string;
    industry?: string;
    estimated_num_employees?: number;
    short_description?: string;
    founded_year?: number;
  };
  city?: string;
  state?: string;
  country?: string;
}

export interface ApolloSearchResponse {
  people: ApolloPerson[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

function normalizeSearchResponse(raw: Record<string, unknown>): ApolloSearchResponse {
  const people = (raw.people || raw.contacts || raw.results || []) as ApolloPerson[];
  const pagination = raw.pagination as Record<string, number> | undefined;
  return {
    people,
    pagination: {
      page: pagination?.page ?? 1,
      per_page: pagination?.per_page ?? people.length,
      total_entries: pagination?.total_entries ?? pagination?.total ?? people.length,
      total_pages: pagination?.total_pages ?? 1,
    },
  };
}

/** Search for prospects matching the filters.
 *  Uses URL query params (Apollo's documented approach for api_search). */
export async function searchPeople(filters: ApolloSearchFilters): Promise<ApolloSearchResponse> {
  const apiKey = getApiKey();
  const url = new URL(`${APOLLO_API_BASE}/mixed_people/api_search`);

  url.searchParams.set('page', String(filters.page || 1));
  url.searchParams.set('per_page', String(filters.per_page || 25));

  const appendArray = (key: string, values?: string[]) => {
    if (!values?.length) return;
    for (const v of values) url.searchParams.append(`${key}[]`, v);
  };

  appendArray('person_titles', filters.person_titles);
  appendArray('organization_industries', filters.organization_industries);
  appendArray('organization_num_employees_ranges', filters.organization_num_employees_ranges);
  appendArray('person_locations', filters.person_locations);
  appendArray('organization_locations', filters.organization_locations);
  appendArray('organization_funding_stage', filters.organization_funding_stage);

  if (filters.q_keywords) {
    url.searchParams.set('q_keywords', filters.q_keywords);
  }

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'accept': 'application/json',
      'X-Api-Key': apiKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo API error (${res.status}): ${text.substring(0, 500)}`);
  }

  const raw = await res.json();
  return normalizeSearchResponse(raw as Record<string, unknown>);
}

/** Test the API connection by doing a small search */
export async function testApolloConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    await searchPeople({ per_page: 1, person_titles: ['CEO'] });
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
