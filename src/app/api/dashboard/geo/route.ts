import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getCached, setCache, fetchFinnhubQuote } from '@/lib/dashboard/cache';

export async function GET() {
  const cacheKey = 'dashboard_geo';
  const cached = await getCached(cacheKey);

  try {
    const [vix, wti, gold, ita, spy] = await Promise.all([
      fetchFinnhubQuote('VIX'),
      fetchFinnhubQuote('USO'),
      fetchFinnhubQuote('GLD'),
      fetchFinnhubQuote('ITA'),
      fetchFinnhubQuote('SPY'),
    ]);

    // Composite risk score
    let riskScore = 0;
    if (vix && vix.c > 25) riskScore++;
    if (wti && wti.c > 90) riskScore++;
    if (gold && gold.dp > 0) riskScore++; // Gold rising
    if (ita && spy && ita.dp > spy.dp) riskScore++; // Defense outperforming

    const riskLevel = riskScore <= 1 ? 'low' : riskScore <= 2 ? 'moderate' : 'elevated';

    // Get recent geopolitical intel items
    const db = getServiceSupabase();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: geoItems } = await db
      .from('intel_items')
      .select('id, title, source_name, source_tier, impact_level, published_at, original_url')
      .eq('category', 'geopolitics')
      .in('impact_level', ['high', 'critical'])
      .gte('ingested_at', weekAgo)
      .order('published_at', { ascending: false })
      .limit(10);

    // Get active geopolitical beliefs
    const { data: beliefs } = await db
      .from('intel_beliefs')
      .select('*')
      .eq('status', 'active');

    const result = {
      proxies: {
        vix: vix ? { price: vix.c, change: vix.d, changePct: vix.dp } : null,
        wti: wti ? { price: wti.c, change: wti.d, changePct: wti.dp } : null,
        gold: gold ? { price: gold.c, change: gold.d, changePct: gold.dp } : null,
        defense: ita ? { price: ita.c, change: ita.d, changePct: ita.dp } : null,
      },
      risk_score: riskScore,
      risk_level: riskLevel,
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
