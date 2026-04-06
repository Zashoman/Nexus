import { NextResponse } from 'next/server';
import { getCached, setCache, fetchFinnhubQuote } from '@/lib/dashboard/cache';

// Using ETF proxies since Finnhub free tier doesn't support futures
// Labels clearly indicate these are ETF prices
const COMMODITIES = [
  { symbol: 'USO', name: 'WTI Crude Oil', displayNote: 'USO ETF proxy', category: 'energy' },
  { symbol: 'BNO', name: 'Brent Crude Oil', displayNote: 'BNO ETF proxy', category: 'energy' },
  { symbol: 'UNG', name: 'Natural Gas', displayNote: 'UNG ETF proxy', category: 'energy' },
  { symbol: 'GLD', name: 'Gold', displayNote: 'GLD ETF proxy', category: 'precious' },
  { symbol: 'SLV', name: 'Silver', displayNote: 'SLV ETF proxy', category: 'precious' },
  { symbol: 'COPX', name: 'Copper Miners', displayNote: 'COPX ETF', category: 'industrial' },
  { symbol: 'SRUUF', name: 'Uranium', displayNote: 'Sprott Physical', category: 'nuclear' },
  { symbol: 'WEAT', name: 'Wheat', displayNote: 'WEAT ETF proxy', category: 'agriculture' },
  { symbol: 'CORN', name: 'Corn', displayNote: 'CORN ETF proxy', category: 'agriculture' },
];

export async function GET() {
  const cacheKey = 'dashboard_commodities';
  const cached = await getCached(cacheKey);

  try {
    const quotes: Record<string, {
      name: string;
      displayNote: string;
      category: string;
      price: number;
      change: number;
      changePct: number;
      high: number;
      low: number;
    }> = {};

    for (const commodity of COMMODITIES) {
      const quote = await fetchFinnhubQuote(commodity.symbol);
      if (quote) {
        quotes[commodity.symbol] = {
          name: commodity.name,
          displayNote: commodity.displayNote,
          category: commodity.category,
          price: quote.c,
          change: quote.d,
          changePct: quote.dp,
          high: quote.h,
          low: quote.l,
        };
      }
    }

    const goldPrice = quotes['GLD']?.price || 0;
    const oilPrice = quotes['USO']?.price || 1;
    const copperPrice = quotes['COPX']?.price || 1;

    // Calculate commodity score (0-22)
    let commodityScore = 0;

    // WTI level scoring (using USO as proxy - adjust thresholds for ETF price)
    const usoPrice = quotes['USO']?.price || 0;
    if (usoPrice > 80) commodityScore += 4;
    else if (usoPrice > 70) commodityScore += 3;
    else if (usoPrice > 60) commodityScore += 2;
    else if (usoPrice > 50) commodityScore += 1;

    // Gold trend
    const goldChg = quotes['GLD']?.changePct || 0;
    if (goldChg > 8) commodityScore += 3;
    else if (goldChg > 3) commodityScore += 2;
    else if (goldChg > 0) commodityScore += 1;

    // Copper trend (negative = demand destruction signal)
    const copperChg = quotes['COPX']?.changePct || 0;
    if (copperChg < -10) commodityScore += 3;
    else if (copperChg < -5) commodityScore += 2;
    else if (copperChg < 0) commodityScore += 1;

    // Gold/Oil ratio
    const goldOilRatio = goldPrice > 0 && oilPrice > 0 ? goldPrice / oilPrice : 0;
    if (goldOilRatio > 5) commodityScore += 3;
    else if (goldOilRatio > 3.5) commodityScore += 2;
    else if (goldOilRatio > 2.5) commodityScore += 1;

    // Natural gas
    const ngChg = quotes['UNG']?.changePct || 0;
    if (ngChg > 30) commodityScore += 3;
    else if (ngChg > 10) commodityScore += 2;
    else if (ngChg > 0) commodityScore += 1;

    // Brent-WTI spread (using ETF proxies)
    const brentPrice = quotes['BNO']?.price || 0;
    const brentWtiSpread = brentPrice > 0 && usoPrice > 0 ? Math.abs(brentPrice - usoPrice) : 0;
    if (brentWtiSpread > 10) commodityScore += 3;
    else if (brentWtiSpread > 5) commodityScore += 2;
    else if (brentWtiSpread > 3) commodityScore += 1;

    // Copper/Gold ratio direction
    const copperGoldRatio = copperPrice > 0 && goldPrice > 0 ? copperPrice / goldPrice : 0;
    if (copperChg < goldChg - 5) commodityScore += 3;
    else if (copperChg < goldChg - 2) commodityScore += 2;
    else if (copperChg < goldChg) commodityScore += 1;

    let commodityLevel = 'deflation';
    if (commodityScore >= 16) commodityLevel = 'supply_shock';
    else if (commodityScore >= 10) commodityLevel = 'inflation';
    else if (commodityScore >= 5) commodityLevel = 'neutral';

    const result = {
      quotes,
      ratios: {
        gold_oil: goldPrice > 0 && oilPrice > 0 ? +(goldPrice / oilPrice).toFixed(2) : null,
        copper_gold: copperPrice > 0 && goldPrice > 0 ? +(copperPrice / goldPrice).toFixed(4) : null,
      },
      score: commodityScore,
      level: commodityLevel,
      max_score: 22,
      updated_at: new Date().toISOString(),
    };

    await setCache(cacheKey, result, 'finnhub', 15);
    return NextResponse.json(result);
  } catch {
    if (cached) return NextResponse.json(cached);
    return NextResponse.json({ error: 'Failed to fetch commodities' }, { status: 500 });
  }
}
