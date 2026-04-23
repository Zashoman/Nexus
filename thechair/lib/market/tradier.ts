// Phase 3: Tradier Market Data client.
// Docs: https://documentation.tradier.com/brokerage-api/markets/get-markets-options
//
// Provides:
//   - getChain(symbol, expiration)  → full options chain with Greeks + IV
//   - getQuote(symbols[])           → underlying quotes
//   - getHistory(symbol, interval)  → daily OHLC for HV / IV-rank lookback

const BASE = process.env.TRADIER_API_BASE || 'https://api.tradier.com/v1';
const TOKEN = process.env.TRADIER_API_TOKEN;

async function tradier(path: string, params: Record<string, string> = {}) {
  if (!TOKEN) throw new Error('TRADIER_API_TOKEN not set');
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Tradier ${path} ${res.status}`);
  return res.json();
}

export async function getQuote(symbols: string[]) {
  // Phase 3 impl
  return tradier('/markets/quotes', { symbols: symbols.join(',') });
}

export async function getChain(symbol: string, expiration: string) {
  return tradier('/markets/options/chains', {
    symbol,
    expiration,
    greeks: 'true',
  });
}

export async function getExpirations(symbol: string) {
  return tradier('/markets/options/expirations', { symbol });
}
