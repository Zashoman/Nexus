import { NextResponse } from 'next/server';
import { getCached, setCache } from '@/lib/dashboard/cache';
import { fetchYahooQuote } from '@/lib/dashboard/yahoo';

const BDC_TICKERS = [
  { symbol: 'BIZD', name: 'VanEck BDC Income ETF', group: 'bdc' },
  { symbol: 'ARCC', name: 'Ares Capital', group: 'bdc' },
  { symbol: 'OBDC', name: 'Blue Owl', group: 'bdc' },
  { symbol: 'FSK', name: 'FS KKR Capital', group: 'bdc' },
  { symbol: 'MAIN', name: 'Main Street Capital', group: 'bdc' },
  { symbol: 'BKLN', name: 'Invesco Senior Loan ETF', group: 'loan' },
  { symbol: 'SRLN', name: 'SPDR Blackstone Senior Loan', group: 'loan' },
];

export async function GET() {
  const cacheKey = 'dashboard_credit_bdc';
  const cached = await getCached(cacheKey);

  try {
    const quotes: Record<string, {
      name: string;
      group: string;
      price: number;
      change: number;
      changePct: number;
      high: number;
      low: number;
    }> = {};

    for (const ticker of BDC_TICKERS) {
      const q = await fetchYahooQuote(ticker.symbol);
      if (q && q.price > 0) {
        quotes[ticker.symbol] = {
          name: ticker.name,
          group: ticker.group,
          price: q.price,
          change: q.change,
          changePct: q.changePct,
          high: q.high,
          low: q.low,
        };
      }
    }

    // Calculate BDC sector average change
    const bdcTickers = BDC_TICKERS.filter(t => t.group === 'bdc');
    const bdcChanges = bdcTickers
      .map(t => quotes[t.symbol]?.changePct)
      .filter((c): c is number => c != null);
    const bdcAvgChange = bdcChanges.length > 0
      ? +(bdcChanges.reduce((a, b) => a + b, 0) / bdcChanges.length).toFixed(2)
      : null;

    const result = {
      quotes,
      bdc_avg_change: bdcAvgChange,
      updated_at: new Date().toISOString(),
    };

    await setCache(cacheKey, result, 'yahoo', 15);
    return NextResponse.json(result);
  } catch {
    if (cached) return NextResponse.json(cached);
    return NextResponse.json({ error: 'Failed to fetch BDC data' }, { status: 500 });
  }
}
