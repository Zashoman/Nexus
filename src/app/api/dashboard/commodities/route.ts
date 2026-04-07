import { NextResponse } from 'next/server';
import { getCached, setCache } from '@/lib/dashboard/cache';
import { fetchYahooQuote } from '@/lib/dashboard/yahoo';

// Real futures tickers from Yahoo Finance
const COMMODITIES = [
  { symbol: 'CL=F', name: 'WTI Crude Oil', category: 'energy' },
  { symbol: 'BZ=F', name: 'Brent Crude Oil', category: 'energy' },
  { symbol: 'NG=F', name: 'Natural Gas', category: 'energy' },
  { symbol: 'GC=F', name: 'Gold', category: 'precious' },
  { symbol: 'SI=F', name: 'Silver', category: 'precious' },
  { symbol: 'HG=F', name: 'Copper', category: 'industrial' },
  { symbol: 'SRUUF', name: 'Uranium (Sprott)', category: 'nuclear' },
  { symbol: 'ZW=F', name: 'Wheat', category: 'agriculture' },
  { symbol: 'ZC=F', name: 'Corn', category: 'agriculture' },
];

export async function GET() {
  const cacheKey = 'dashboard_commodities';
  const cached = await getCached(cacheKey);

  try {
    const quotes: Record<string, {
      name: string;
      category: string;
      price: number;
      change: number;
      changePct: number;
      high: number;
      low: number;
    }> = {};

    for (const commodity of COMMODITIES) {
      const quote = await fetchYahooQuote(commodity.symbol);
      if (quote && quote.price > 0) {
        quotes[commodity.symbol] = {
          name: commodity.name,
          category: commodity.category,
          price: quote.price,
          change: quote.change,
          changePct: quote.changePct,
          high: quote.high,
          low: quote.low,
        };
      }
    }

    const goldPrice = quotes['GC=F']?.price || 0;
    const oilPrice = quotes['CL=F']?.price || 1;
    const copperPrice = quotes['HG=F']?.price || 1;

    // Commodity Score (0-22)
    let commodityScore = 0;

    // WTI level scoring (actual futures price)
    if (oilPrice > 120) commodityScore += 4;
    else if (oilPrice > 100) commodityScore += 3;
    else if (oilPrice > 80) commodityScore += 2;
    else if (oilPrice > 60) commodityScore += 1;

    // Gold trend
    const goldChg = quotes['GC=F']?.changePct || 0;
    if (goldChg > 8) commodityScore += 3;
    else if (goldChg > 3) commodityScore += 2;
    else if (goldChg > 0) commodityScore += 1;

    // Copper trend
    const copperChg = quotes['HG=F']?.changePct || 0;
    if (copperChg < -10) commodityScore += 3;
    else if (copperChg < -5) commodityScore += 2;
    else if (copperChg < 0) commodityScore += 1;

    // Gold/Oil ratio
    const goldOilRatio = goldPrice > 0 && oilPrice > 0 ? goldPrice / oilPrice : 0;
    if (goldOilRatio > 50) commodityScore += 3;
    else if (goldOilRatio > 35) commodityScore += 2;
    else if (goldOilRatio > 25) commodityScore += 1;

    // Natural gas
    const ngChg = quotes['NG=F']?.changePct || 0;
    if (ngChg > 30) commodityScore += 3;
    else if (ngChg > 10) commodityScore += 2;
    else if (ngChg > 0) commodityScore += 1;

    // Brent-WTI spread
    const brentPrice = quotes['BZ=F']?.price || 0;
    const brentWtiSpread = brentPrice > 0 && oilPrice > 0 ? Math.abs(brentPrice - oilPrice) : 0;
    if (brentWtiSpread > 10) commodityScore += 3;
    else if (brentWtiSpread > 5) commodityScore += 2;
    else if (brentWtiSpread > 3) commodityScore += 1;

    // Copper/Gold ratio direction
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
        brent_wti_spread: brentWtiSpread > 0 ? +brentWtiSpread.toFixed(2) : null,
      },
      score: commodityScore,
      level: commodityLevel,
      max_score: 22,
      updated_at: new Date().toISOString(),
    };

    await setCache(cacheKey, result, 'yahoo_finance', 15);
    return NextResponse.json(result);
  } catch {
    if (cached) return NextResponse.json(cached);
    return NextResponse.json({ error: 'Failed to fetch commodities' }, { status: 500 });
  }
}
