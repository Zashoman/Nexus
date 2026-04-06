import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getCached, setCache, fetchFinnhubQuote } from '@/lib/dashboard/cache';

export async function GET() {
  const cacheKey = 'dashboard_geo';
  const cached = await getCached(cacheKey);

  try {
    const [gold, ita, spy, wti] = await Promise.all([
      fetchFinnhubQuote('GLD'),
      fetchFinnhubQuote('ITA'),
      fetchFinnhubQuote('SPY'),
      fetchFinnhubQuote('USO'),
    ]);

    // Geopolitical Risk Score (0-16)
    let geoScore = 0;

    // Gold vs SPY (safe haven demand)
    const goldChg = gold?.dp || 0;
    const spyChg = spy?.dp || 0;
    const goldVsSpy = goldChg - spyChg;
    if (goldVsSpy > 2) geoScore += 3;
    else if (goldVsSpy > 0) geoScore += 2;
    else if (goldVsSpy > -1) geoScore += 1;

    // Defense ETF vs SPY
    const itaChg = ita?.dp || 0;
    const defenseVsSpy = itaChg - spyChg;
    if (defenseVsSpy > 2) geoScore += 3;
    else if (defenseVsSpy > 0) geoScore += 2;
    else if (defenseVsSpy > -1) geoScore += 1;

    // Oil change (supply disruption pricing)
    const oilChg = wti?.dp || 0;
    if (oilChg > 5) geoScore += 3;
    else if (oilChg > 2) geoScore += 2;
    else if (oilChg > 0) geoScore += 1;

    // Gold level as fear indicator
    if (goldChg > 3) geoScore += 4;
    else if (goldChg > 1) geoScore += 2;
    else if (goldChg > 0) geoScore += 1;

    geoScore = Math.min(geoScore, 16);

    let riskLevel = 'calm';
    if (geoScore >= 12) riskLevel = 'crisis';
    else if (geoScore >= 8) riskLevel = 'elevated';
    else if (geoScore >= 4) riskLevel = 'alert';

    // Get recent geopolitical intel items
    const db = getServiceSupabase();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: geoItems } = await db
      .from('intel_items')
      .select('id, title, source_name, source_tier, impact_level, published_at, original_url')
      .or('category.eq.geopolitics,category.eq.cybersecurity_ai')
      .in('impact_level', ['high', 'critical'])
      .gte('ingested_at', weekAgo)
      .order('published_at', { ascending: false })
      .limit(10);

    const { data: beliefs } = await db
      .from('intel_beliefs')
      .select('*')
      .eq('status', 'active');

    const result = {
      proxies: {
        gold: gold ? { price: gold.c, change: gold.d, changePct: gold.dp } : null,
        wti: wti ? { price: wti.c, change: wti.d, changePct: wti.dp } : null,
        defense: ita ? { price: ita.c, change: ita.d, changePct: ita.dp } : null,
        spy: spy ? { price: spy.c, change: spy.d, changePct: spy.dp } : null,
      },
      risk_score: geoScore,
      risk_level: riskLevel,
      max_score: 16,
      intel_items: geoItems || [],
      beliefs: beliefs || [],
      updated_at: new Date().toISOString(),
    };

    await setCache(cacheKey, result, 'finnhub+db', 15);
    return NextResponse.json(result);
  } catch {
    if (cached) return NextResponse.json(cached);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
