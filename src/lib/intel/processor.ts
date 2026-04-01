import Anthropic from '@anthropic-ai/sdk';
import { getServiceSupabase } from '@/lib/supabase';
import type { AIProcessedItem, IntelItem } from '@/types/intel';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function processItems(items: IntelItem[]): Promise<void> {
  if (items.length === 0) return;

  const db = getServiceSupabase();

  // Get filter profile for context
  const { data: profile } = await db
    .from('intel_filter_profile')
    .select('*')
    .order('weight', { ascending: false })
    .limit(50);

  const filterContext = profile
    ? profile.map((p) => `${p.profile_type}: ${p.profile_key} (weight: ${p.weight})`).join('\n')
    : 'No filter profile yet — user has not rated any items.';

  // Process in batches of 10
  const batchSize = 10;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await processBatch(batch, filterContext, db);
  }
}

async function processBatch(
  items: IntelItem[],
  filterContext: string,
  db: ReturnType<typeof getServiceSupabase>
): Promise<void> {
  const itemsForPrompt = items.map((item, idx) => ({
    index: idx,
    id: item.id,
    title: item.title,
    summary: item.summary || item.raw_content?.slice(0, 500) || '',
    source: item.source_name,
    source_tier: item.source_tier,
  }));

  const prompt = `You are an intelligence analyst processing news items for a technology-focused intelligence briefing. For each item, provide:

1. A 2-3 sentence summary capturing ONLY the essential facts. No filler.
2. A category assignment from: frontier_models, infrastructure_compute, robotics_physical_ai, health_bio_ai, cybersecurity_ai, regulation_policy
3. Subcategory tags (up to 3) from the item's specific topics
4. A relevance score from 0.0 to 1.0 based on how significant this development is for someone tracking the frontier of AI
5. An impact level: "low" (incremental), "medium" (notable development), "high" (significant shift), "critical" (paradigm-changing)
6. Keywords for filtering (5-10 terms)

Rate HIGHER:
- Genuinely novel capabilities or breakthroughs
- Primary source announcements from major labs
- Government policy with real enforcement mechanisms
- Military/defense applications with confirmed programs
- Health AI with clinical trial results or FDA actions
- Cybersecurity incidents or capabilities that are new

Rate LOWER:
- Opinion pieces restating known positions
- Product launches that are iterative improvements
- "AI will change everything" think pieces
- Business productivity or enterprise tool announcements
- Crypto/blockchain AI intersections
- Speculation without evidence

USER'S FILTER PROFILE (learned from their ratings):
${filterContext}

Items to process:
${JSON.stringify(itemsForPrompt, null, 2)}

Respond ONLY with valid JSON array. Each element must have: { "index": number, "summary": string, "category": string, "subcategories": string[], "relevance_score": number, "impact_level": string, "keywords": string[] }`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const results: AIProcessedItem[] = JSON.parse(jsonMatch[0]);

    for (const result of results) {
      const item = items[(result as unknown as { index: number }).index];
      if (!item) continue;

      await db
        .from('intel_items')
        .update({
          ai_summary: result.summary,
          category: result.category,
          subcategories: result.subcategories,
          relevance_score: result.relevance_score,
          impact_level: result.impact_level,
          metadata: {
            ...(item.metadata || {}),
            keywords: result.keywords,
            processed_at: new Date().toISOString(),
          },
        })
        .eq('id', item.id);
    }
  } catch (err) {
    console.error('AI processing error:', err);
    // Items remain unprocessed — will be retried on next cycle
  }
}

export async function getUnprocessedItems(): Promise<IntelItem[]> {
  const db = getServiceSupabase();
  const { data } = await db
    .from('intel_items')
    .select('*')
    .is('ai_summary', null)
    .order('ingested_at', { ascending: false })
    .limit(50);
  return (data as IntelItem[]) || [];
}
