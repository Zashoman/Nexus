import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export const maxDuration = 120;

export async function GET() {
  const db = getServiceSupabase();

  const { data: syntheses } = await db
    .from('intel_weekly_synthesis')
    .select('*')
    .order('week_start', { ascending: false })
    .limit(12);

  return NextResponse.json({ syntheses: syntheses || [] });
}

export async function POST() {
  const db = getServiceSupabase();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  // Get starred items from the last 7 days
  const { data: starredRatings } = await db
    .from('intel_ratings')
    .select('item_id')
    .eq('rating', 'starred')
    .gte('created_at', weekAgo);

  if (!starredRatings || starredRatings.length === 0) {
    return NextResponse.json({ error: 'No starred items this week' }, { status: 400 });
  }

  const itemIds = starredRatings.map((r) => r.item_id);

  const { data: items } = await db
    .from('intel_items')
    .select('*')
    .in('id', itemIds);

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'No items found' }, { status: 400 });
  }

  // Get active beliefs
  const { data: beliefs } = await db
    .from('intel_beliefs')
    .select('*')
    .eq('status', 'active');

  const beliefsContext = (beliefs || [])
    .map((b) => `- "${b.title}" (Confidence: ${b.current_confidence}%): ${b.description}`)
    .join('\n');

  const itemsContext = items
    .map((item) => `- [${item.category}] ${item.title} (Source: ${item.source_name}, Tier ${item.source_tier})\n  Summary: ${item.ai_summary || item.summary || 'No summary'}\n  URL: ${item.original_url}`)
    .join('\n\n');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are an intelligence analyst producing a weekly synthesis brief. The user has flagged the following items as high-signal throughout the week. Your job is to:

1. Group related items together by theme, even if they come from different verticals/categories.
2. Identify CROSS-VERTICAL CONNECTIONS - items from different categories that relate to each other. These connections are the most valuable part of your analysis.
3. For each theme/group, write a 2-3 sentence synthesis of what happened and why it matters.
4. End with a "Key Signals" section - the 3-5 most important takeaways from the entire week, ranked by significance.
5. If any starred items relate to the user's active beliefs, note how they affect those beliefs.

Be concise. No filler. No hedging. Write like a senior intelligence analyst briefing a decision-maker.

USER'S ACTIVE BELIEFS:
${beliefsContext || 'No active beliefs configured.'}

THIS WEEK'S STARRED ITEMS (${items.length} items):
${itemsContext}`,
      }],
    });

    const synthesisText = response.content[0].type === 'text' ? response.content[0].text : '';

    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekEnd = new Date().toISOString().split('T')[0];

    const { data: synthesis, error } = await db
      .from('intel_weekly_synthesis')
      .insert({
        week_start: weekStart,
        week_end: weekEnd,
        starred_item_count: items.length,
        starred_item_ids: itemIds,
        synthesis_text: synthesisText,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ synthesis });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate synthesis' },
      { status: 500 }
    );
  }
}
