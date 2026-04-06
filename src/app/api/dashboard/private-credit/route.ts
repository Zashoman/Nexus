import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { fetchFRED, fetchFinnhubQuote } from '@/lib/dashboard/cache';

function getStressLevel(score: number): string {
  if (score <= 5) return 'calm';
  if (score <= 10) return 'watchful';
  if (score <= 17) return 'stressed';
  return 'crisis';
}

function scoreHYOAS(val: number | null): number {
  if (!val) return 0;
  if (val < 4) return 0;
  if (val < 5.5) return 1;
  if (val < 7) return 2;
  if (val < 8) return 3;
  if (val < 10) return 4;
  return 5;
}

function scoreCCCBBSpread(val: number | null): number {
  if (!val) return 0;
  const bps = val * 100;
  if (bps < 300) return 0;
  if (bps < 400) return 1;
  if (bps < 500) return 2;
  if (bps < 600) return 3;
  if (bps < 700) return 4;
  return 5;
}

function scoreBIZD(changePct: number | null): number {
  if (!changePct) return 0;
  const drop = -changePct;
  if (drop < 2) return 0;
  if (drop < 5) return 1;
  if (drop < 8) return 2;
  if (drop < 12) return 3;
  if (drop < 16) return 4;
  return 5;
}

function scoreBKLN(changePct: number | null): number {
  if (!changePct) return 0;
  const drop = -changePct;
  if (drop < 1) return 0;
  if (drop < 3) return 1;
  if (drop < 5) return 2;
  if (drop < 7) return 3;
  if (drop < 10) return 4;
  return 5;
}

export async function GET() {
  const db = getServiceSupabase();
  const { data: scores } = await db
    .from('private_credit_scores')
    .select('*')
    .order('scored_at', { ascending: false })
    .limit(10);
  return NextResponse.json({ scores: scores || [], latest: scores?.[0] || null });
}

export async function POST() {
  const db = getServiceSupabase();

  const [hyOas, cccOas, bbOas, bizdQuote, bklnQuote, arccQuote, obdcQuote, fskQuote] = await Promise.all([
    fetchFRED('BAMLH0A0HYM2'),
    fetchFRED('BAMLH0A3HYC'),
    fetchFRED('BAMLH0A1HYBB'),
    fetchFinnhubQuote('BIZD'),
    fetchFinnhubQuote('BKLN'),
    fetchFinnhubQuote('ARCC'),
    fetchFinnhubQuote('OBDC'),
    fetchFinnhubQuote('FSK'),
  ]);

  const cccBbSpread = cccOas != null && bbOas != null ? cccOas - bbOas : null;
  const bizdChange = bizdQuote ? bizdQuote.dp : null;
  const bklnChange = bklnQuote ? bklnQuote.dp : null;

  // News scan for redemption/gate signals
  const weekAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: creditNews } = await db
    .from('intel_items')
    .select('id')
    .or('title.ilike.%redemption%,title.ilike.%gate%,title.ilike.%private credit%,title.ilike.%BDC%,title.ilike.%leveraged loan default%')
    .gte('ingested_at', weekAgo);

  const newsCount = creditNews?.length || 0;
  const newsScore = newsCount >= 3 ? 5 : newsCount >= 1 ? 2 : 0;

  const hyScore = scoreHYOAS(hyOas);
  const cccBbScore = scoreCCCBBSpread(cccBbSpread);
  const bizdScore = scoreBIZD(bizdChange);
  const bklnScore = scoreBKLN(bklnChange);

  const totalScore = hyScore + cccBbScore + bizdScore + bklnScore + newsScore;
  const stressLevel = getStressLevel(totalScore);

  const bdcPrices = {
    BIZD: bizdQuote ? { price: bizdQuote.c, change: bizdQuote.dp } : null,
    ARCC: arccQuote ? { price: arccQuote.c, change: arccQuote.dp } : null,
    OBDC: obdcQuote ? { price: obdcQuote.c, change: obdcQuote.dp } : null,
    FSK: fskQuote ? { price: fskQuote.c, change: fskQuote.dp } : null,
    BKLN: bklnQuote ? { price: bklnQuote.c, change: bklnQuote.dp } : null,
  };

  const { data: score, error } = await db
    .from('private_credit_scores')
    .insert({
      total_score: totalScore,
      stress_level: stressLevel,
      hy_oas_value: hyOas, hy_oas_score: hyScore,
      ccc_bb_spread: cccBbSpread, ccc_bb_score: cccBbScore,
      bizd_30d_change: bizdChange, bizd_score: bizdScore,
      bkln_30d_change: bklnChange, bkln_score: bklnScore,
      news_redemption_count: newsCount, news_score: newsScore,
      bdc_prices: bdcPrices,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ score });
}
