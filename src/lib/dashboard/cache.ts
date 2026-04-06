import { getServiceSupabase } from '@/lib/supabase';

export async function getCached(key: string): Promise<unknown | null> {
  const db = getServiceSupabase();
  const { data } = await db
    .from('dashboard_cache')
    .select('data_value, expires_at')
    .eq('data_key', key)
    .maybeSingle();

  if (!data) return null;
  // Return cached data even if expired (stale-while-revalidate)
  return data.data_value;
}

export async function isCacheExpired(key: string): Promise<boolean> {
  const db = getServiceSupabase();
  const { data } = await db
    .from('dashboard_cache')
    .select('expires_at')
    .eq('data_key', key)
    .maybeSingle();

  if (!data) return true;
  return new Date(data.expires_at) < new Date();
}

export async function setCache(key: string, value: unknown, source: string, ttlMinutes: number): Promise<void> {
  const db = getServiceSupabase();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  await db
    .from('dashboard_cache')
    .upsert(
      {
        data_key: key,
        data_value: value,
        source,
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt,
      },
      { onConflict: 'data_key' }
    );
}

// Fetch from FRED API
export async function fetchFRED(seriesId: string): Promise<number | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.observations && data.observations.length > 0) {
      const val = parseFloat(data.observations[0].value);
      return isNaN(val) ? null : val;
    }
    return null;
  } catch {
    return null;
  }
}

// Fetch from Finnhub
export async function fetchFinnhubQuote(symbol: string): Promise<{ c: number; d: number; dp: number; h: number; l: number; o: number; pc: number } | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.c && data.c > 0) return data;
    return null;
  } catch {
    return null;
  }
}

// Fetch multiple FRED series at once
export async function fetchFREDMultiple(seriesIds: string[]): Promise<Record<string, number | null>> {
  const results: Record<string, number | null> = {};
  for (const id of seriesIds) {
    results[id] = await fetchFRED(id);
  }
  return results;
}
