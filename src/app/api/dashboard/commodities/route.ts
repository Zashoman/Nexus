import { NextResponse } from 'next/server';
import { getCached, setCache, fetchFinnhubQuote } from '@/lib/dashboard/cache';

const COMMODITIES = [
  { symbol: 'USO', name: 'WTI Crude (USO)', category: 'energy' },
  { symbol: 'BNO', name: 'Brent Crude (BNO)', category: 'energy' },
  { symbol: 'UNG', name: 'Natural Gas (UNG)', category: 'energy' },
  { symbol: 'GLD', name: 'Gold (GLD)', category: 'precious' },
  { symbol: 'SLV', name: 'Silver (SLV)', category: 'precious' },
  { symbol: 'COPX', name: 'Copper (COPX)', category: 'industrial' },
  { symbol: 'SRUUF', name: 'Uranium (Sprott)', category: 'industrial' },
  { symbol: 'WEAT', name: 'Wheat (WEAT)', category: 'agriculture' },
  { symbol: 'CORN', name: 'Corn (CORN)', category: 'agriculture' },
];

export async function GET() {
  const cacheKey = 'dashboard_commodities';
  const cached = await getCached(cacheKey);

  try {
    const quotes: Record<string, { name: string; category: string; price: number; change: number; changePct: number; high: number; low: number }> = {};

    for (const commodity of COMMODITIES) {
      const quote = await fetchFinnhubQuote(commodity.symbol);
      if (quote) {
        quotes[commodity.symbol] = {
          name: commodity.name,
          category: commodity.category,
          price: quote.c,
          change: quote.d,
          changePct: quote.dp,
          high: quote.h,
          low: quote.l,
        };
      }
    }

    // Calculate ratios
    const goldPrice = quotes['GLD']?.price || 0;
    const oilPrice = quotes['USO']?.price || 1;
    const copperPrice = quotes['COPX']?.price || 1;

    const result = {
      quotes,
      ratios: {
        gold_oil: goldPrice > 0 && oilPrice > 0 ? +(goldPrice / oilPrice).toFixed(2) : null,
        copper_gold: copperPrice > 0 && goldPrice > 0 ? +(copperPrice / goldPrice).toFixed(4) : null,
      },
      updated_at: new Date().toISOString(),
    };

    await setCache(cacheKey, result, 'finnhub', 15); // 15 min TTL
    return NextResponse.json(result);
  } catch {
    if (cached) return NextResponse.json(cached);
    return NextResponse.json({ error: 'Failed to fetch commodities' }, { status: 500 });
  }
}
