import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { fetchFinnhubQuote, fetchFRED, getCached } from '@/lib/dashboard/cache';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const CRISIS_START = new Date('2026-02-28');

const SIGNAL_WEIGHTS = {
  transit: { green: 6, yellow: 3, red: 0 },
  mine: { green: 5, yellow: 3, red: 0 },
  brent: { green: 5, yellow: 3, red: 0 },
  vlcc: { green: 4, yellow: 2, red: 0 },
  ttf: { green: 4, yellow: 2, red: 0 },
  dxy: { green: 3, yellow: 2, red: 0 },
  fed: { green: 3, yellow: 2, red: 0 },
  storage: { green: 5, yellow: 3, red: 0 },
  stagflation: { green: 4, yellow: 2, red: 0 },
  diplomatic: { green: 4, yellow: 2, red: 0 },
  iea_spr: { green: 3, yellow: 2, red: 0 },
};

function getThesisLevel(score: number): string {
  if (score >= 36) return 'intact';
  if (score >= 25) return 'holding';
  if (score >= 15) return 'weakening';
  return 'broken';
}

function getConviction(green: number, red: number): string {
  if (green >= 9 && red === 0) return 'maximum';
  if (green >= 7 && red <= 1) return 'high';
  if (green >= 5 && red <= 2) return 'moderate';
  if (green >= 3) return 'low';
  return 'broken';
}

function getSignalScore(rating: string, signal: keyof typeof SIGNAL_WEIGHTS): number {
  const w = SIGNAL_WEIGHTS[signal];
  if (rating === 'green') return w.green;
  if (rating === 'yellow') return w.yellow;
  return w.red;
}

export async function GET() {
  const db = getServiceSupabase();
  const { data: scores } = await db
    .from('hormuz_risk_scores')
    .select('*')
    .order('scored_at', { ascending: false })
    .limit(10);
  return NextResponse.json({ scores: scores || [], latest: scores?.[0] || null });
}

export async function POST() {
  const db = getServiceSupabase();
  const dayOfCrisis = Math.floor((Date.now() - CRISIS_START.getTime()) / (1000 * 60 * 60 * 24));

  // Fetch market data - use tickers confirmed working on Finnhub
  const [usoQ, bnoQ, uupQ, goldQ, spyQ] = await Promise.all([
    fetchFinnhubQuote('USO'),
    fetchFinnhubQuote('BNO'),
    fetchFinnhubQuote('UUP'),
    fetchFinnhubQuote('GLD'),
    fetchFinnhubQuote('SPY'),
  ]);

  // Use whichever oil ticker returned data (USO and BNO are confirmed working)
  const brentPrice = (bnoQ?.c && bnoQ.c > 0) ? bnoQ.c : (usoQ?.c && usoQ.c > 0) ? usoQ.c : 0;
  // For DXY, use UUP if available, otherwise try FRED
  let dxyPrice = (uupQ?.c && uupQ.c > 0) ? uupQ.c : 0;
  if (dxyPrice === 0) {
    const dxyFred = await fetchFRED('DTWEXBGS');
    dxyPrice = dxyFred || 0;
  }

  // Auto-score market-based signals
  let brentRating = 'yellow';
  if (brentPrice > 100) brentRating = 'green';
  else if (brentPrice < 75) brentRating = 'red';

  let dxyRating = 'yellow';
  if (dxyPrice > 103 || (uupQ?.dp || 0) > 0) dxyRating = 'green';
  else if (dxyPrice < 95) dxyRating = 'red';

  let storageRating = 'green';
  if (dayOfCrisis < 15) storageRating = 'red';
  else if (dayOfCrisis < 25) storageRating = 'yellow';

  // Get recent intel items for AI scoring
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: hormuzItems } = await db
    .from('intel_items')
    .select('title, ai_summary, source_name, source_tier, published_at')
    .or('title.ilike.%hormuz%,title.ilike.%strait%,title.ilike.%iran%,title.ilike.%tanker%,title.ilike.%mine%,title.ilike.%lng%,title.ilike.%naval%,title.ilike.%ceasefire%,title.ilike.%escort%')
    .gte('ingested_at', weekAgo)
    .order('published_at', { ascending: false })
    .limit(20);

  const newsContext = (hormuzItems || []).map((i) => `- ${i.title} (${i.source_name}, Tier ${i.source_tier})`).join('\n');

  // Get previous scoring for upgrade/downgrade comparison
  const { data: prevScores } = await db
    .from('hormuz_risk_scores')
    .select('*')
    .order('scored_at', { ascending: false })
    .limit(1);
  const prev = prevScores?.[0];

  // AI scoring for qualitative signals
  let aiResult: Record<string, unknown> = {};
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `You are a crisis intelligence analyst scoring the Strait of Hormuz disruption framework. The crisis began February 28, 2026. Today is Day ${dayOfCrisis}.

MARKET DATA:
- Brent Crude: $${brentPrice.toFixed(2)}
- DXY: ${dxyPrice.toFixed(2)}

RECENT INTELLIGENCE (last 7 days):
${newsContext || 'No recent Hormuz-related intelligence items found.'}

Score these signals as GREEN, YELLOW, or RED:

1. Tanker Transit Count - GREEN: <30/day | YELLOW: 30-60/day | RED: >60/day
2. Mine Status - GREEN: Mines present, no clearance | YELLOW: Clearance beginning | RED: Mines cleared
3. VLCC Rates - GREEN: >$200K/day | YELLOW: $100-200K | RED: <$100K
4. TTF Gas - GREEN: >74 EUR/MWh | YELLOW: 47-74 | RED: <40
5. Fed Rhetoric - GREEN: Holds/hikes | YELLOW: Data dependent | RED: Emergency cuts
6. Stagflation - GREEN: Oil rising + weak economy | YELLOW: S&P -5% while oil flat | RED: Oil falling despite closure
7. Diplomatic - GREEN: No ceasefire, Iran defiant | YELLOW: Back-channel talks | RED: Ceasefire confirmed
8. IEA/SPR - GREEN: No release or failed | YELLOW: Release temporarily suppressing | RED: Release restoring supply

Also provide:
- Scenario probabilities: A (Extended closure), B (Partial), C (Quick resolution), D (Escalation). Must sum to 100.
- Scenario classification (A, A+, B, C, or D)
- 3 assessments: (1) current status, (2) most important signal change, (3) what to watch next 48-72 hours

Return ONLY valid JSON:
{"transit_rating":"green","transit_value":"<30/day estimated","mine_rating":"green","mine_status":"Mines confirmed active","vlcc_rating":"green","vlcc_value":"$250K+/day","ttf_rating":"green","ttf_value":"82","fed_rating":"green","fed_status":"Holding","stagflation_rating":"green","stagflation_status":"Oil rising, economy weakening","diplomatic_rating":"green","diplomatic_status":"No ceasefire","iea_spr_rating":"green","iea_spr_status":"No release","scenario_a_pct":55,"scenario_b_pct":25,"scenario_c_pct":10,"scenario_d_pct":10,"scenario_class":"A","assessment":"Current status.","key_change":"Most important change.","watch_next":"What to watch."}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      aiResult = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Use defaults
  }

  // Build signal ratings
  const signals = {
    transit: { rating: (aiResult.transit_rating as string) || 'green', value: (aiResult.transit_value as string) || 'Unknown' },
    mine: { rating: (aiResult.mine_rating as string) || 'green', value: (aiResult.mine_status as string) || 'Unknown' },
    brent: { rating: brentRating, value: brentPrice },
    vlcc: { rating: (aiResult.vlcc_rating as string) || 'yellow', value: (aiResult.vlcc_value as string) || 'Unknown' },
    ttf: { rating: (aiResult.ttf_rating as string) || 'yellow', value: parseFloat(aiResult.ttf_value as string) || 0 },
    dxy: { rating: dxyRating, value: dxyPrice },
    fed: { rating: (aiResult.fed_rating as string) || 'yellow', value: (aiResult.fed_status as string) || 'Unknown' },
    storage: { rating: storageRating, value: dayOfCrisis },
    stagflation: { rating: (aiResult.stagflation_rating as string) || 'yellow', value: (aiResult.stagflation_status as string) || 'Unknown' },
    diplomatic: { rating: (aiResult.diplomatic_rating as string) || 'green', value: (aiResult.diplomatic_status as string) || 'Unknown' },
    iea_spr: { rating: (aiResult.iea_spr_rating as string) || 'green', value: (aiResult.iea_spr_status as string) || 'Unknown' },
  };

  // Calculate scores
  let totalScore = 0;
  let greenCount = 0;
  let yellowCount = 0;
  let redCount = 0;

  for (const [key, sig] of Object.entries(signals)) {
    const score = getSignalScore(sig.rating, key as keyof typeof SIGNAL_WEIGHTS);
    totalScore += score;
    if (sig.rating === 'green') greenCount++;
    else if (sig.rating === 'yellow') yellowCount++;
    else redCount++;
  }

  const thesisLevel = getThesisLevel(totalScore);
  const convictionLevel = getConviction(greenCount, redCount);

  // Count upgrades/downgrades
  let upgradedCount = 0;
  let downgradedCount = 0;
  if (prev) {
    const prevSignals: Record<string, string> = {
      transit: prev.transit_rating, mine: prev.mine_rating, brent: prev.brent_rating,
      vlcc: prev.vlcc_rating, ttf: prev.ttf_rating, dxy: prev.dxy_rating,
      fed: prev.fed_rating, storage: prev.storage_rating, stagflation: prev.stagflation_rating,
      diplomatic: prev.diplomatic_rating, iea_spr: prev.iea_spr_rating,
    };
    const order = ['red', 'yellow', 'green'];
    for (const [key, sig] of Object.entries(signals)) {
      const prevRating = prevSignals[key];
      if (prevRating && order.indexOf(sig.rating) > order.indexOf(prevRating)) upgradedCount++;
      if (prevRating && order.indexOf(sig.rating) < order.indexOf(prevRating)) downgradedCount++;
    }
  }

  const { data: score, error } = await db
    .from('hormuz_risk_scores')
    .insert({
      total_score: totalScore,
      thesis_level: thesisLevel,
      scenario_classification: (aiResult.scenario_class as string) || 'A',
      transit_value: signals.transit.value, transit_rating: signals.transit.rating, transit_score: getSignalScore(signals.transit.rating, 'transit'),
      mine_status: signals.mine.value, mine_rating: signals.mine.rating, mine_score: getSignalScore(signals.mine.rating, 'mine'),
      brent_value: signals.brent.value, brent_rating: signals.brent.rating, brent_score: getSignalScore(signals.brent.rating, 'brent'),
      vlcc_value: signals.vlcc.value, vlcc_rating: signals.vlcc.rating, vlcc_score: getSignalScore(signals.vlcc.rating, 'vlcc'),
      ttf_value: signals.ttf.value, ttf_rating: signals.ttf.rating, ttf_score: getSignalScore(signals.ttf.rating, 'ttf'),
      dxy_value: signals.dxy.value, dxy_rating: signals.dxy.rating, dxy_score: getSignalScore(signals.dxy.rating, 'dxy'),
      fed_status: signals.fed.value, fed_rating: signals.fed.rating, fed_score: getSignalScore(signals.fed.rating, 'fed'),
      storage_days: dayOfCrisis, storage_rating: signals.storage.rating, storage_score: getSignalScore(signals.storage.rating, 'storage'),
      stagflation_status: signals.stagflation.value, stagflation_rating: signals.stagflation.rating, stagflation_score: getSignalScore(signals.stagflation.rating, 'stagflation'),
      diplomatic_status: signals.diplomatic.value, diplomatic_rating: signals.diplomatic.rating, diplomatic_score: getSignalScore(signals.diplomatic.rating, 'diplomatic'),
      iea_spr_status: signals.iea_spr.value, iea_spr_rating: signals.iea_spr.rating, iea_spr_score: getSignalScore(signals.iea_spr.rating, 'iea_spr'),
      scenario_a_pct: (aiResult.scenario_a_pct as number) || 50,
      scenario_b_pct: (aiResult.scenario_b_pct as number) || 25,
      scenario_c_pct: (aiResult.scenario_c_pct as number) || 15,
      scenario_d_pct: (aiResult.scenario_d_pct as number) || 10,
      green_count: greenCount,
      yellow_count: yellowCount,
      red_count: redCount,
      upgraded_count: upgradedCount,
      downgraded_count: downgradedCount,
      ai_assessment: (aiResult.assessment as string) || 'Assessment unavailable.',
      ai_key_change: (aiResult.key_change as string) || 'No significant changes.',
      ai_watch_next: (aiResult.watch_next as string) || 'Monitor daily.',
      conviction_level: convictionLevel,
      day_of_crisis: dayOfCrisis,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ score });
}
