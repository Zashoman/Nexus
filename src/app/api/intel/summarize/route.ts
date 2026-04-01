import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  const { item_id } = await req.json();

  if (!item_id) {
    return NextResponse.json({ error: 'item_id required' }, { status: 400 });
  }

  const db = getServiceSupabase();

  const { data: item, error } = await db
    .from('intel_items')
    .select('*')
    .eq('id', item_id)
    .single();

  if (error || !item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Already has a summary
  if (item.ai_summary) {
    return NextResponse.json({ summary: item.ai_summary });
  }

  const content = item.summary || item.raw_content || item.title;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `You are an intelligence analyst writing a brief for a tech investor and entrepreneur. Analyze this news item and produce a structured briefing.

Title: ${item.title}
Source: ${item.source_name} (Tier ${item.source_tier})
Content: ${content.slice(0, 2000)}

Format your response EXACTLY like this (use the exact headers):

THESIS: [Write 4-5 sentences explaining the core development, what happened, who is involved, and the immediate context. Do not bold this section. Write it as a flowing analytical paragraph.]

KEY POINTS:
- [Supporting point 1]
- [Supporting point 2]
- [Supporting point 3]

WHY IT MATTERS: [1-2 sentences — what changed, what's the implication for the AI/tech landscape]

DATA POINTS:
- [A specific quantitative fact: a number, percentage, dollar amount, date, or direct quote from the source]
- [Another specific quantitative fact]
- [Another specific quantitative fact]
- [Another specific quantitative fact]
- [Another specific quantitative fact]

IMPORTANT rules for DATA POINTS:
- Only include REAL quantitative data: numbers, percentages, dollar amounts, dates, or direct quotes
- Example of GOOD data point: "34% of AI researchers reported using open-source models"
- Example of BAD data point: "Traffic impact: vehicles stranded on highways" — this is a description, not data
- If there are fewer than 5 real data points in the source, only include what exists. Do NOT pad with descriptions.
- If there are zero quantitative data points, omit the DATA POINTS section entirely.`,
        },
      ],
    });

    const summary =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Save it for future use
    await db
      .from('intel_items')
      .update({ ai_summary: summary })
      .eq('id', item_id);

    return NextResponse.json({ summary });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
