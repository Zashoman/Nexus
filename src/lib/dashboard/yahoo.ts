// Fetch real commodity futures prices from Yahoo Finance
// Yahoo Finance doesn't require an API key for basic quotes

export async function fetchYahooQuote(symbol: string): Promise<{
  price: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  name: string;
  validated?: boolean;
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

    // Validate price is reasonable (not an ETF unit price when we expect a futures price)
    const EXPECTED_RANGES: Record<string, [number, number]> = {
      'BZ=F': [30, 200],     // Brent crude $30-200/bbl
      'CL=F': [30, 200],     // WTI crude $30-200/bbl
      'GC=F': [1000, 5000],  // Gold $1000-5000/oz
      'SI=F': [10, 80],      // Silver $10-80/oz
      'HG=F': [1, 10],       // Copper $1-10/lb
      'NG=F': [1, 15],       // Natural Gas $1-15/MMBtu
      'ZW=F': [300, 1500],   // Wheat 300-1500 cents/bu
      'ZC=F': [200, 1000],   // Corn 200-1000 cents/bu
      'DX-Y.NYB': [80, 130], // DXY 80-130
    };

    const range = EXPECTED_RANGES[symbol];
    const isValid = !range || (price >= range[0] && price <= range[1]);

    return {
      price,
      change: +change.toFixed(2),
      changePct: +changePct.toFixed(2),
      high: meta.regularMarketDayHigh || price,
      low: meta.regularMarketDayLow || price,
      name: meta.shortName || meta.symbol || symbol,
      validated: isValid,
    };
  } catch {
    return null;
  }
}
