import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export const maxDuration = 120;

export async function GET() {
  const db = getServiceSupabase();

  const { data: syntheses } = await db
    .from('intel_monthly_synthesis')
    .select('*')
    .order('month_start', { ascending: false })
    .limit(6);

  return NextResponse.json({ syntheses: syntheses || [] });
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const db = getServiceSupabase();

  // Get last month's date range
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

  // Get weekly syntheses from last month
  const { data: weeklySyntheses } = await db
    .from('intel_weekly_synthesis')
    .select('*')
    .gte('week_start', monthStart)
    .lte('week_end', monthEnd)
    .order('week_start', { ascending: true });

  if (!weeklySyntheses || weeklySyntheses.length === 0) {
    return NextResponse.json({ error: 'No weekly syntheses for this month' }, { status: 400 });
  }

  // Get belief movements
  const { data: beliefs } = await db
    .from('intel_beliefs')
    .select('*')
    .eq('status', 'active');

  const beliefContext = (beliefs || [])
    .map((b) => `- "${b.title}": Current confidence ${b.current_confidence}%, started at ${b.initial_confidence}%, Evidence for: ${b.evidence_for}, Against: ${b.evidence_against}`)
    .join('\n');

  const weeklyContext = weeklySyntheses
    .map((ws) => `Week of ${ws.week_start} to ${ws.week_end} (${ws.starred_item_count} starred items):\n${ws.synthesis_text}`)
    .join('\n\n---\n\n');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      messages: [{
        role: 'user',
        content: `You are a senior intelligence analyst producing a monthly meta-synthesis.

1. Identify dominant themes that persisted across multiple weeks. What narratives gained strength? What faded?
2. Track belief movements: For each active belief, summarize how confidence changed and what evidence drove the change.
3. Identify EMERGING themes - topics that appeared later that weren't present early. New developments to watch.
4. Identify FADING themes - topics prominent early that disappeared. Why?
5. End with "Strategic Assessment" - 3-5 sentences on the overall intelligence picture heading into next month.

Write like a monthly intelligence estimate. Concise, analytical, no filler.

WEEKLY SYNTHESES:
${weeklyContext}

BELIEF CONFIDENCE MOVEMENTS:
${beliefContext || 'No active beliefs configured.'}`,
      }],
    });

    const synthesisText = response.content[0].type === 'text' ? response.content[0].text : '';

    const { data: synthesis, error } = await db
      .from('intel_monthly_synthesis')
      .insert({
        month_start: monthStart,
        month_end: monthEnd,
        weekly_synthesis_ids: weeklySyntheses.map((ws) => ws.id),
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
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    );
  }
}
