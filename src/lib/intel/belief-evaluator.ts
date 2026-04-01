import Anthropic from '@anthropic-ai/sdk';
import { getServiceSupabase } from '@/lib/supabase';
import type { IntelItem, IntelBelief, BeliefEvaluation } from '@/types/intel';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function evaluateItemsAgainstBeliefs(
  items: IntelItem[]
): Promise<number> {
  const db = getServiceSupabase();

  // Only evaluate items with relevance > 0.5
  const relevantItems = items.filter(
    (item) => item.relevance_score && item.relevance_score > 0.5
  );
  if (relevantItems.length === 0) return 0;

  // Get active beliefs
  const { data: beliefs } = await db
    .from('intel_beliefs')
    .select('*')
    .eq('status', 'active');

  if (!beliefs || beliefs.length === 0) return 0;

  let evidenceCount = 0;

  for (const item of relevantItems) {
    for (const belief of beliefs as IntelBelief[]) {
      const evaluation = await evaluateSingle(item, belief);
      if (!evaluation || evaluation.direction === 'neutral') continue;

      // Store evidence link
      await db.from('intel_belief_evidence').insert({
        belief_id: belief.id,
        item_id: item.id,
        direction: evaluation.direction,
        strength: evaluation.strength,
        ai_reasoning: evaluation.reasoning,
        source_tier: item.source_tier,
      });

      // Update belief confidence using weighted Bayesian update
      let newConfidence = belief.current_confidence;
      if (evaluation.direction === 'supports') {
        newConfidence =
          belief.current_confidence +
          evaluation.strength * (100 - belief.current_confidence) * 0.1;
      } else if (evaluation.direction === 'challenges') {
        newConfidence =
          belief.current_confidence -
          evaluation.strength * belief.current_confidence * 0.1;
      }

      // Clamp between 5 and 95
      newConfidence = Math.max(5, Math.min(95, newConfidence));

      const evidenceFor =
        belief.evidence_for + (evaluation.direction === 'supports' ? 1 : 0);
      const evidenceAgainst =
        belief.evidence_against + (evaluation.direction === 'challenges' ? 1 : 0);

      await db
        .from('intel_beliefs')
        .update({
          current_confidence: Math.round(newConfidence * 100) / 100,
          evidence_for: evidenceFor,
          evidence_against: evidenceAgainst,
          updated_at: new Date().toISOString(),
        })
        .eq('id', belief.id);

      evidenceCount++;
    }
  }

  return evidenceCount;
}

async function evaluateSingle(
  item: IntelItem,
  belief: IntelBelief
): Promise<BeliefEvaluation | null> {
  const prompt = `Given this belief: "${belief.title}: ${belief.description}"
Current confidence: ${belief.current_confidence}%

And this new evidence:
Title: ${item.title}
Summary: ${item.ai_summary || item.summary || ''}
Source tier: ${item.source_tier}
Impact level: ${item.impact_level || 'medium'}

Does this evidence:
1. SUPPORT the belief (makes it more likely to be true)
2. CHALLENGE the belief (makes it less likely to be true)
3. Have NO RELEVANCE to this belief

If relevant, rate the strength of evidence from 0.0 to 1.0 where:
- 0.1-0.3 = Weak (anecdotal, opinion, single data point)
- 0.4-0.6 = Moderate (credible reporting, limited data)
- 0.7-0.9 = Strong (primary source, significant data, peer-reviewed)
- 1.0 = Definitive (conclusive evidence)

Adjust strength based on source tier:
- Tier 1 source: multiply strength by 1.0
- Tier 2 source: multiply strength by 0.7
- Tier 3 source: multiply strength by 0.4

Provide a 1-2 sentence reasoning for your assessment.

Respond ONLY with valid JSON: {"direction": "supports" or "challenges" or "neutral", "strength": 0.0-1.0, "reasoning": "..."}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]) as BeliefEvaluation;
  } catch (err) {
    console.error('Belief evaluation error:', err);
    return null;
  }
}
