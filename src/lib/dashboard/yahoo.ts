// Fetch real commodity futures prices from Yahoo Finance
// Yahoo Finance doesn't require an API key for basic quotes

export async function fetchYahooQuote(symbol: string): Promise<{
  price: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  name: string;
} | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta.regularMarketPrice || 0;
    const prevClose = meta.chartPreviousClose || meta.previousClose || price;
    const change = price - prevClose;
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

    return {
      price,
      change: +change.toFixed(2),
      changePct: +changePct.toFixed(2),
      high: meta.regularMarketDayHigh || price,
      low: meta.regularMarketDayLow || price,
      name: meta.shortName || meta.symbol || symbol,
    };
  } catch {
    return null;
  }
}
