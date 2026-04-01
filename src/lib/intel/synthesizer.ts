import Anthropic from '@anthropic-ai/sdk';
import { getServiceSupabase } from '@/lib/supabase';
import type { SynthesisNarrative, IntelBelief, IntelItem } from '@/types/intel';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function generateSynthesis(): Promise<SynthesisNarrative> {
  const db = getServiceSupabase();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Get high-impact items from last 24h
  const { data: topItems } = await db
    .from('intel_items')
    .select('*')
    .gte('ingested_at', since)
    .eq('is_filtered_out', false)
    .not('ai_summary', 'is', null)
    .in('impact_level', ['high', 'critical'])
    .order('relevance_score', { ascending: false })
    .limit(15);

  // Get all active beliefs with recent evidence
  const { data: beliefs } = await db
    .from('intel_beliefs')
    .select('*')
    .eq('status', 'active');

  // Get recent evidence
  const { data: recentEvidence } = await db
    .from('intel_belief_evidence')
    .select('*, item:intel_items(*)')
    .gte('created_at', since);

  const items = (topItems || []) as IntelItem[];
  const beliefsList = (beliefs || []) as IntelBelief[];

  // Calculate belief movements
  const beliefMovements = beliefsList.map((b) => {
    const relatedEvidence = (recentEvidence || []).filter(
      (e) => e.belief_id === b.id
    );
    const netChange = b.current_confidence - b.initial_confidence;
    return {
      belief_id: b.id,
      title: b.title,
      direction: netChange > 1 ? 'up' as const : netChange < -1 ? 'down' as const : 'stable' as const,
      change: Math.round(netChange * 100) / 100,
      evidence_count: relatedEvidence.length,
    };
  });

  // Generate narrative via Claude
  const prompt = `You are an intelligence analyst writing a daily synthesis briefing.

Today's high-impact developments:
${items
  .map(
    (item) =>
      `- [${item.impact_level?.toUpperCase()}] ${item.title}: ${item.ai_summary || item.summary}`
  )
  .join('\n')}

Active belief tracker:
${beliefsList
  .map(
    (b) =>
      `- "${b.title}" — Confidence: ${b.current_confidence}% (started at ${b.initial_confidence}%). Evidence for: ${b.evidence_for}, against: ${b.evidence_against}`
  )
  .join('\n')}

Recent evidence linked to beliefs:
${(recentEvidence || [])
  .map((e) => `- ${e.direction}: "${e.ai_reasoning}" (strength: ${e.strength})`)
  .join('\n')}

Write a concise daily synthesis (3-5 sentences). Focus on:
1. The most significant developments and why they matter
2. Which beliefs were strengthened or challenged by today's evidence
3. Any key themes or patterns across different categories
4. A net assessment — what should the reader pay attention to

Be direct, analytical, and data-driven. No fluff. Write like a Bloomberg intelligence analyst.`;

  let narrative = 'No significant developments in the last 24 hours.';

  if (items.length > 0 || beliefMovements.some((b) => b.direction !== 'stable')) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });
      narrative =
        response.content[0].type === 'text'
          ? response.content[0].text
          : narrative;
    } catch (err) {
      console.error('Synthesis generation error:', err);
    }
  }

  return {
    date: new Date().toISOString().split('T')[0],
    narrative,
    belief_movements: beliefMovements,
    top_items: items,
  };
}
