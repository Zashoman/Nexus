// Phase 3: Menthor Q client — dealer gamma exposure and gamma flip levels.
// Docs: confirm endpoint with vendor. Cache last-good value on stale response.

const BASE = process.env.MENTHORQ_API_BASE || 'https://api.menthorq.com/v1';
const KEY = process.env.MENTHORQ_API_KEY;

export async function getDealerGamma(symbol: string) {
  if (!KEY) throw new Error('MENTHORQ_API_KEY not set');
  const res = await fetch(`${BASE}/gamma/${symbol}`, {
    headers: { 'x-api-key': KEY },
  });
  if (!res.ok) throw new Error(`MenthorQ ${symbol} ${res.status}`);
  return res.json();
}
