// Phase 3: FRED client — HY OAS (BAMLH0A0HYM2), MOVE, DXY.

const KEY = process.env.FRED_API_KEY;
const BASE = 'https://api.stlouisfed.org/fred/series/observations';

export async function getSeries(seriesId: string, limit = 30) {
  if (!KEY) throw new Error('FRED_API_KEY not set');
  const url = new URL(BASE);
  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('api_key', KEY);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('sort_order', 'desc');
  url.searchParams.set('limit', String(limit));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${seriesId} ${res.status}`);
  return res.json();
}
