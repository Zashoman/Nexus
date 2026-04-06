import { NextResponse } from 'next/server';
import { getCached, setCache, fetchFREDMultiple, fetchFinnhubQuote } from '@/lib/dashboard/cache';

export async function GET() {
  const cacheKey = 'dashboard_rates';
  const cached = await getCached(cacheKey);

  // Try to refresh in background, serve cached immediately
  const fredSeries = ['DGS2', 'DGS10', 'DGS30', 'T10Y2Y', 'FEDFUNDS', 'BAMLH0A0HYM2', 'BAMLC0A4CBBB'];

  try {
    const fredData = await fetchFREDMultiple(fredSeries);

    // FX via Finnhub
    const [uup, usdjpy, eurusd] = await Promise.all([
      fetchFinnhubQuote('UUP'),
      fetchFinnhubQuote('USDJPY'),
      fetchFinnhubQuote('EURUSD'),
    ]);

    const result = {
      yields: {
        us2y: fredData['DGS2'],
        us10y: fredData['DGS10'],
        us30y: fredData['DGS30'],
        spread_2s10s: fredData['T10Y2Y'],
      },
      fed: {
        funds_rate: fredData['FEDFUNDS'],
      },
      credit: {
        hy_oas: fredData['BAMLH0A0HYM2'],
        bbb_oas: fredData['BAMLC0A4CBBB'],
      },
      fx: {
        dxy: uup ? { price: uup.c, change: uup.d, changePct: uup.dp } : null,
        usdjpy: usdjpy ? { price: usdjpy.c, change: usdjpy.d, changePct: usdjpy.dp } : null,
        eurusd: eurusd ? { price: eurusd.c, change: eurusd.d, changePct: eurusd.dp } : null,
      },
      updated_at: new Date().toISOString(),
    };

    await setCache(cacheKey, result, 'fred+finnhub', 360); // 6 hour TTL
    return NextResponse.json(result);
  } catch {
    if (cached) return NextResponse.json(cached);
    return NextResponse.json({ error: 'Failed to fetch rates' }, { status: 500 });
  }
}
