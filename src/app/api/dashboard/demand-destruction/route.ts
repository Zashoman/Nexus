import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getCached, setCache, fetchFRED, fetchFinnhubQuote } from '@/lib/dashboard/cache';

function scoreEMHY(price: number | null): { value: number | null; score: number } {
  if (!price) return { value: null, score: 0 };
  const baseline = 39.90;
  const pctDown = ((baseline - price) / baseline) * 100;
  if (pctDown < 3) return { value: price, score: 0 };
  if (pctDown < 5) return { value: price, score: 1 };
  return { value: price, score: 2 };
}

function scoreWTI(price: number | null): { value: number | null; score: number } {
  if (!price) return { value: null, score: 0 };
  if (price < 120) return { value: price, score: 0 };
  if (price < 130) return { value: price, score: 1 };
  return { value: price, score: 2 };
}

function scoreClaims(value: number | null): { value: number | null; score: number } {
  if (!value) return { value: null, score: 0 };
  if (value < 230) return { value, score: 0 };
  if (value < 260) return { value, score: 1 };
  return { value, score: 2 };
}

function scoreCopper(price: number | null): { value: number | null; score: number } {
  if (!price) return { value: null, score: 0 };
  if (price > 5.50) return { value: price, score: 0 };
  if (price > 5.21) return { value: price, score: 1 };
  return { value: price, score: 2 };
}

function getThreatLevel(score: number): string {
  if (score <= 4) return 'low';
  if (score <= 9) return 'elevated';
  if (score <= 14) return 'high';
  return 'critical';
}

export async function GET() {
  const db = getServiceSupabase();

  // Return latest score + history
  const { data: scores } = await db
    .from('demand_destruction_scores')
    .select('*')
    .order('scored_at', { ascending: false })
    .limit(10);

  return NextResponse.json({ scores: scores || [], latest: scores?.[0] || null });
}

export async function POST() {
  const db = getServiceSupabase();

  // Fetch all data
  const [emhyQuote, wtiQuote, copperQuote, claimsValue] = await Promise.all([
    fetchFinnhubQuote('EMHY'),
    fetchFinnhubQuote('USO'),
    fetchFinnhubQuote('COPX'),
    fetchFRED('ICSA'),
  ]);

  const emhy = scoreEMHY(emhyQuote?.c || null);
  const wti = scoreWTI(wtiQuote?.c || null);
  const claims = scoreClaims(claimsValue);
  const copper = scoreCopper(copperQuote?.c || null);

  // For indicators we can't auto-fetch (BDI, Korea exports, China PMI, UMich, gas price, force majeures)
  // Use cached values or default to 0 (manual update via UI later)
  const cached = await getCached('dd_manual_indicators') as Record<string, { value: number; score: number }> | null;

  const bdi = cached?.bdi || { value: null, score: 0 };
  const krExports = cached?.kr_exports || { value: null, score: 0 };
  const chinaPmi = cached?.china_pmi || { value: null, score: 0 };
  const forceMajeure = cached?.force_majeure || { value: 0, score: 0 };
  const umich = cached?.umich || { value: null, score: 0 };
  const gasPrice = cached?.gas_price || { value: null, score: 0 };

  const totalScore = emhy.score + bdi.score + krExports.score + chinaPmi.score +
    wti.score + (forceMajeure.score as number) + claims.score + copper.score +
    umich.score + gasPrice.score;

  const threatLevel = getThreatLevel(totalScore);

  const { data: score, error } = await db
    .from('demand_destruction_scores')
    .insert({
      total_score: totalScore,
      threat_level: threatLevel,
      emhy_value: emhy.value, emhy_score: emhy.score,
      bdi_value: bdi.value, bdi_score: bdi.score,
      kr_exports_value: krExports.value, kr_exports_score: krExports.score,
      china_pmi_value: chinaPmi.value, china_pmi_score: chinaPmi.score,
      wti_value: wti.value, wti_score: wti.score,
      force_majeure_count: forceMajeure.value, force_majeure_score: forceMajeure.score,
      claims_value: claims.value, claims_score: claims.score,
      copper_value: copper.value, copper_score: copper.score,
      umich_value: umich.value, umich_score: umich.score,
      gas_price_value: gasPrice.value, gas_price_score: gasPrice.score,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ score });
}
