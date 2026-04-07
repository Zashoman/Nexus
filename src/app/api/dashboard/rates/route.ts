import { NextResponse } from 'next/server';
import { getCached, setCache, fetchFRED, fetchFREDMultiple, fetchFinnhubQuote } from '@/lib/dashboard/cache';

export async function GET() {
  const cacheKey = 'dashboard_rates';
  const cached = await getCached(cacheKey);

  // Full yield curve series
  const yieldSeries = ['DGS1MO', 'DGS3MO', 'DGS6MO', 'DGS1', 'DGS2', 'DGS3', 'DGS5', 'DGS7', 'DGS10', 'DGS20', 'DGS30'];
  const otherSeries = ['T10Y2Y', 'FEDFUNDS', 'BAMLH0A0HYM2', 'BAMLC0A4CBBB', 'BAMLH0A3HYC', 'BAMLH0A1HYBB'];

  try {
    const [yieldData, otherData] = await Promise.all([
      fetchFREDMultiple(yieldSeries),
      fetchFREDMultiple(otherSeries),
    ]);

    const [uup] = await Promise.all([
      fetchFinnhubQuote('UUP'),
    ]);

    // Yield curve points
    const yieldCurve = [
      { label: '1M', value: yieldData['DGS1MO'] },
      { label: '3M', value: yieldData['DGS3MO'] },
      { label: '6M', value: yieldData['DGS6MO'] },
      { label: '1Y', value: yieldData['DGS1'] },
      { label: '2Y', value: yieldData['DGS2'] },
      { label: '3Y', value: yieldData['DGS3'] },
      { label: '5Y', value: yieldData['DGS5'] },
      { label: '7Y', value: yieldData['DGS7'] },
      { label: '10Y', value: yieldData['DGS10'] },
      { label: '20Y', value: yieldData['DGS20'] },
      { label: '30Y', value: yieldData['DGS30'] },
    ];

    const spread2s10s = otherData['T10Y2Y'];
    const hyOas = otherData['BAMLH0A0HYM2'];
    const bbbOas = otherData['BAMLC0A4CBBB'];
    const cccOas = otherData['BAMLH0A3HYC'];
    const bbOas = otherData['BAMLH0A1HYBB'];
    const fedFunds = otherData['FEDFUNDS'];
    const us10y = yieldData['DGS10'];
    const dxyChg = uup?.dp || 0;

    // Credit stress level
    let creditStressLevel = 'calm';
    if (hyOas != null) {
      if (hyOas > 8) creditStressLevel = 'crisis';
      else if (hyOas > 5) creditStressLevel = 'stress';
      else if (hyOas > 3.5) creditStressLevel = 'elevated';
    }

    // Rates Score (0-20)
    let ratesScore = 0;

    if (spread2s10s != null) {
      if (spread2s10s < -0.50) ratesScore += 4;
      else if (spread2s10s < -0.25) ratesScore += 2;
      else if (spread2s10s < 0) ratesScore += 1;
    }

    if (hyOas != null) {
      if (hyOas > 7) ratesScore += 4;
      else if (hyOas > 5.5) ratesScore += 3;
      else if (hyOas > 4.5) ratesScore += 2;
      else if (hyOas > 3.5) ratesScore += 1;
    }

    if (fedFunds != null && fedFunds > 5) ratesScore += 3;
    else if (fedFunds != null && fedFunds > 4) ratesScore += 1;

    if (dxyChg > 5) ratesScore += 3;
    else if (dxyChg > 2) ratesScore += 2;
    else if (dxyChg > 0) ratesScore += 1;

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
      yield_curve: yieldCurve,
      yields: {
        us2y: yieldData['DGS2'],
        us10y: yieldData['DGS10'],
        us30y: yieldData['DGS30'],
        spread_2s10s: spread2s10s,
      },
      fed: {
        funds_rate: fedFunds,
      },
      credit: {
        hy_oas: hyOas,
        bbb_oas: bbbOas,
        ccc_oas: cccOas,
        bb_oas: bbOas,
        ccc_bb_spread: cccOas != null && bbOas != null ? +(cccOas - bbOas).toFixed(2) : null,
        stress_level: creditStressLevel,
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
