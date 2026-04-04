import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const db = getServiceSupabase();
  const { searchParams } = new URL(req.url);
  const beliefId = searchParams.get('belief_id');

  if (!beliefId) {
    return NextResponse.json({ error: 'belief_id required' }, { status: 400 });
  }

  const { data: reports } = await db
    .from('intel_red_team_reports')
    .select('*')
    .eq('belief_id', beliefId)
    .order('created_at', { ascending: false });

  return NextResponse.json({ reports: reports || [] });
}

export async function POST(req: NextRequest) {
  const db = getServiceSupabase();
  const { belief_id } = await req.json();

  if (!belief_id) {
    return NextResponse.json({ error: 'belief_id required' }, { status: 400 });
  }

  // Get the belief
  const { data: belief } = await db
    .from('intel_beliefs')
    .select('*')
    .eq('id', belief_id)
    .single();

  if (!belief) {
    return NextResponse.json({ error: 'Belief not found' }, { status: 404 });
  }

  // Get all evidence for this belief
  const { data: evidence } = await db
    .from('intel_belief_evidence')
    .select('*')
    .eq('belief_id', belief_id)
    .order('created_at', { ascending: false });

  if (!evidence || evidence.length < 3) {
    return NextResponse.json({ error: 'Need at least 3 evidence items to Red Team' }, { status: 400 });
  }

  // Get linked items for context
  const itemIds = evidence.map((e) => e.item_id).filter(Boolean);
  const { data: items } = await db
    .from('intel_items')
    .select('id, title, source_name, source_tier, ai_summary, published_at')
    .in('id', itemIds.length > 0 ? itemIds : ['__none__']);

  const itemsMap = new Map((items || []).map((i) => [i.id, i]));

  const evidenceContext = evidence.map((e) => {
    const item = itemsMap.get(e.item_id);
    return `- [${e.direction.toUpperCase()}] Strength: ${e.strength} | Source: ${item?.source_name || 'Unknown'} (Tier ${e.source_tier}) | ${item?.title || 'No title'}\n  Reasoning: ${e.ai_reasoning}\n  Date: ${e.created_at}`;
  }).join('\n\n');

  const timeSinceCreated = Math.floor((Date.now() - new Date(belief.created_at).getTime()) / (1000 * 60 * 60 * 24));

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are a Red Team analyst. Your SOLE job is to construct the strongest possible argument AGAINST the following belief. You are not trying to be balanced. You are constructing the most rigorous, well-evidenced case that this belief is WRONG.

Rules:
1. Use ONLY the evidence items provided below. Do not invent arguments or cite external sources.
2. If supporting evidence has weaknesses (source quality issues, recency, logical gaps), exploit them.
3. If challenging evidence exists, build your case around it. Explain why it should be weighted more heavily.
4. If the evidence is overwhelmingly in favor of the belief, acknowledge this honestly and present whatever counter-arguments you can find.
5. End with a Vulnerability Assessment - rate the belief: Fortress (very hard to challenge), Sturdy (solid but with gaps), Exposed (significant counter-evidence), Critical (counter-case may be stronger).
6. Be specific. Reference actual items by title and source. No vague hand-waving.

BELIEF UNDER REVIEW:
Title: ${belief.title}
Description: ${belief.description}
Current Confidence: ${belief.current_confidence}%
Duration Held: ${timeSinceCreated} days

ALL LINKED EVIDENCE (${evidence.length} items):
${evidenceContext}`,
      }],
    });

    const reportText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract vulnerability rating from the text
    let vulnerabilityRating = 'sturdy';
    const ratingMatch = reportText.toLowerCase();
    if (ratingMatch.includes('fortress')) vulnerabilityRating = 'fortress';
    else if (ratingMatch.includes('critical')) vulnerabilityRating = 'critical';
    else if (ratingMatch.includes('exposed')) vulnerabilityRating = 'exposed';

    const { data: report, error } = await db
      .from('intel_red_team_reports')
      .insert({
        belief_id,
        evidence_item_count: evidence.length,
        report_text: reportText,
        vulnerability_rating: vulnerabilityRating,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ report });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    );
  }
}
