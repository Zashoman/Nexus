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
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Summarize this news item in 2-3 concise sentences. Focus on essential facts only. No filler.\n\nTitle: ${item.title}\nSource: ${item.source_name}\nContent: ${content.slice(0, 1000)}`,
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
