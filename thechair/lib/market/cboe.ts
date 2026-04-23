// Phase 3: CBOE public JSON endpoints — VIX, VXN, VVIX, SKEW, VIX term, equity P/C.
// Wrap every call in try/catch with a yfinance fallback for level data.

export async function getCboeIndex(symbol: string) {
  const url = `https://cdn.cboe.com/api/global/delayed_quotes/charts/historical/${symbol}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CBOE ${symbol} ${res.status}`);
  return res.json();
}

export async function getEquityPutCall() {
  // Daily equity-only put/call from cboe.com/us/options/market_statistics
  const url = 'https://www.cboe.com/us/options/market_statistics/daily/';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CBOE pc ${res.status}`);
  return res.text();
}
