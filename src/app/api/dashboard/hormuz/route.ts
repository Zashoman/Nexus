import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { fetchFinnhubQuote, fetchFRED } from '@/lib/dashboard/cache';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

function getRiskLevel(score: number): string {
  if (score <= 15) return 'hold';
  if (score <= 25) return 'monitor';
  if (score <= 35) return 'reduce';
  return 'sell_now';
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

  // Fetch market data
  const [brent, wti, gold, ita, spy] = await Promise.all([
    fetchFinnhubQuote('BNO'),
    fetchFinnhubQuote('USO'),
    fetchFinnhubQuote('GLD'),
    fetchFinnhubQuote('ITA'),
    fetchFinnhubQuote('SPY'),
  ]);

  const hyOas = await fetchFRED('BAMLH0A0HYM2');

  // Category 2: Energy Markets (max 10) - more granular scoring
  let cat2Score = 0;
  const brentPrice = brent?.c || 0;
  if (brentPrice > 150) cat2Score += 10;
  else if (brentPrice > 130) cat2Score += 8;
  else if (brentPrice > 110) cat2Score += 6;
  else if (brentPrice > 95) cat2Score += 4;
  else if (brentPrice > 80) cat2Score += 2;

  // Brent-WTI spread widening
  const wtiPrice = wti?.c || 0;
  if (brentPrice > 0 && wtiPrice > 0) {
    const spread = brentPrice - wtiPrice;
    if (spread > 5) cat2Score = Math.min(cat2Score + 2, 10);
  }

  const cat2Detail = {
    brent: brentPrice,
    wti: wtiPrice,
    spread: brentPrice > 0 && wtiPrice > 0 ? +(brentPrice - wtiPrice).toFixed(2) : null,
    brent_change: brent?.dp || 0,
  };

  // Category 4: Market Stress (max 10) - use actual market proxies
  let cat4Score = 0;

  // Gold trend as fear indicator
  const goldChg = gold?.dp || 0;
  if (goldChg > 5) cat4Score += 3;
  else if (goldChg > 2) cat4Score += 2;
  else if (goldChg > 0) cat4Score += 1;

  // Credit spreads from FRED
  if (hyOas) {
    if (hyOas > 8) cat4Score += 3;
    else if (hyOas > 5) cat4Score += 2;
    else if (hyOas > 4) cat4Score += 1;
  }

  // Defense outperforming SPY
  if (ita && spy) {
    const defenseOutperform = (ita.dp || 0) - (spy.dp || 0);
    if (defenseOutperform > 2) cat4Score += 2;
    else if (defenseOutperform > 0) cat4Score += 1;
  }

  // Oil rising sharply
  if (brent && (brent.dp || 0) > 3) cat4Score += 2;

  cat4Score = Math.min(cat4Score, 10);

  const cat4Detail = {
    gold: gold?.c,
    gold_change: goldChg,
    hy_oas: hyOas,
    ita_vs_spy: ita && spy ? +((ita.dp || 0) - (spy.dp || 0)).toFixed(2) : null,
    defense: ita?.c,
  };

  // Categories 1, 3, 5: News-based (use AI)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: hormuzItems } = await db
    .from('intel_items')
    .select('title, ai_summary, source_name, source_tier, published_at')
    .or('title.ilike.%hormuz%,title.ilike.%strait%,title.ilike.%iran%,title.ilike.%tanker%')
    .gte('ingested_at', weekAgo)
    .limit(20);

  let cat1Score = 0;
  let cat3Score = 0;
  let cat5Score = 0;
  let scenarioA = 10, scenarioB = 30, scenarioC = 40, scenarioD = 20;
  let aiAssessment = 'No recent Hormuz-related intelligence available for assessment.';

  if (hormuzItems && hormuzItems.length > 0) {
    const newsContext = hormuzItems.map((i) => `- ${i.title} (${i.source_name})`).join('\n');

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Score the Strait of Hormuz risk based on these recent news items. Return ONLY valid JSON.

News items from the last 7 days:
${newsContext}

Return this exact JSON structure:
{"cat1_score": 0-12, "cat3_score": 0-10, "cat5_score": 0-8, "scenario_a_pct": 0-100, "scenario_b_pct": 0-100, "scenario_c_pct": 0-100, "scenario_d_pct": 0-100, "assessment": "1-2 sentence summary"}

cat1 (Physical Disruption, max 12): tanker incidents, mine reports, insurance withdrawal
cat3 (Geopolitical Escalation, max 10): military actions, diplomacy status, allied responses
cat5 (Scenario Assessment, max 8): based on all evidence
Scenarios: A=extended closure, B=partial resolution, C=quick resolution, D=wider conflict. Must sum to 100.`,
        }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        cat1Score = Math.min(parsed.cat1_score || 0, 12);
        cat3Score = Math.min(parsed.cat3_score || 0, 10);
        cat5Score = Math.min(parsed.cat5_score || 0, 8);
        scenarioA = parsed.scenario_a_pct || 10;
        scenarioB = parsed.scenario_b_pct || 30;
        scenarioC = parsed.scenario_c_pct || 40;
        scenarioD = parsed.scenario_d_pct || 20;
        aiAssessment = parsed.assessment || aiAssessment;
      }
    } catch {
      // Use defaults
    }
  }

  const totalScore = cat1Score + cat2Score + cat3Score + cat4Score + cat5Score;
  const riskLevel = getRiskLevel(totalScore);

  const { data: score, error } = await db
    .from('hormuz_risk_scores')
    .insert({
      total_score: totalScore,
      risk_level: riskLevel,
      category_1_score: cat1Score, category_1_detail: { items: hormuzItems?.length || 0 },
      category_2_score: cat2Score, category_2_detail: cat2Detail,
      category_3_score: cat3Score, category_3_detail: { items: hormuzItems?.length || 0 },
      category_4_score: cat4Score, category_4_detail: cat4Detail,
      category_5_score: cat5Score, category_5_detail: { scenarios: true },
      scenario_a_pct: scenarioA,
      scenario_b_pct: scenarioB,
      scenario_c_pct: scenarioC,
      scenario_d_pct: scenarioD,
      ai_assessment: aiAssessment,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ score });
}
