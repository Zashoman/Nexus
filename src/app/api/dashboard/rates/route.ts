import { NextResponse } from 'next/server';
import { getCached, setCache, fetchFREDMultiple, fetchFinnhubQuote } from '@/lib/dashboard/cache';

export async function GET() {
  const cacheKey = 'dashboard_rates';
  const cached = await getCached(cacheKey);

  const fredSeries = ['DGS2', 'DGS10', 'DGS30', 'T10Y2Y', 'FEDFUNDS', 'BAMLH0A0HYM2', 'BAMLC0A4CBBB'];

  try {
    const fredData = await fetchFREDMultiple(fredSeries);

    const [uup] = await Promise.all([
      fetchFinnhubQuote('UUP'),
    ]);

    const spread2s10s = fredData['T10Y2Y'];
    const hyOas = fredData['BAMLH0A0HYM2'];
    const us10y = fredData['DGS10'];
    const dxyChg = uup?.dp || 0;

    // Rates Score (0-20)
    let ratesScore = 0;

    // 2s/10s spread
    if (spread2s10s != null) {
      if (spread2s10s < -0.50) ratesScore += 4;
      else if (spread2s10s < -0.25) ratesScore += 2;
      else if (spread2s10s < 0) ratesScore += 1;
    }

    // HY OAS
    if (hyOas != null) {
      if (hyOas > 7) ratesScore += 4;
      else if (hyOas > 5.5) ratesScore += 3;
      else if (hyOas > 4.5) ratesScore += 2;
      else if (hyOas > 3.5) ratesScore += 1;
    }

    // Fed Funds direction (simplified - compare to 30d ago would need historical)
    const fedFunds = fredData['FEDFUNDS'];
    if (fedFunds != null && fedFunds > 5) ratesScore += 3;
    else if (fedFunds != null && fedFunds > 4) ratesScore += 1;

    // DXY 30d change
    if (dxyChg > 5) ratesScore += 3;
    else if (dxyChg > 2) ratesScore += 2;
    else if (dxyChg > 0) ratesScore += 1;

    // 10Y yield level
    if (us10y != null) {
      if (us10y > 5.5) ratesScore += 3;
      else if (us10y > 4.5) ratesScore += 2;
      else if (us10y > 3.5) ratesScore += 1;
    }

    ratesScore = Math.min(ratesScore, 20);

    let ratesLevel = 'loose';
    if (ratesScore >= 15) ratesLevel = 'restrictive';
    else if (ratesScore >= 10) ratesLevel = 'tight';
    else if (ratesScore >= 5) ratesLevel = 'neutral';

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
      },
      score: ratesScore,
      level: ratesLevel,
      max_score: 20,
      updated_at: new Date().toISOString(),
    };

    await setCache(cacheKey, result, 'fred+finnhub', 360);
    return NextResponse.json(result);
  } catch {
    if (cached) return NextResponse.json(cached);
    return NextResponse.json({ error: 'Failed to fetch rates' }, { status: 500 });
  }
}
