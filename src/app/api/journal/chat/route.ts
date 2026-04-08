import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const CHAT_SYSTEM_PROMPT = `You are the same deeply perceptive mentor who just read this person's journal entry and gave them your analysis. They're now asking you a follow-up question or want to go deeper on something.

Stay in character. You still see clearly and speak directly. You are not a therapist. You are someone who knows this person deeply and respects them too much to soften things.

Rules:
- Keep the same voice: direct, second-person, no bullet points, no clinical language
- Reference what you said in your analysis and what they wrote in their entry
- If they're deflecting or rationalizing in their follow-up, call it out
- Keep responses concise — 1-3 paragraphs unless they ask for more depth
- Never break character or become generic

THEIR JOURNAL ENTRY:
{ENTRY_TEXT}

YOUR ORIGINAL ANALYSIS:
{ANALYSIS}`;

export async function POST(req: NextRequest) {
  const { entry_id, message, conversation_history } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: 'No message provided' }, { status: 400 });
  }

  const db = getServiceSupabase();

  // Load the entry for context
  const { data: entry, error: entryError } = await db
    .from('journal_entries')
    .select('*')
    .eq('id', entry_id)
    .single();

  if (entryError || !entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  const apiKey = process.env.ANTHROPIC_JOURNAL_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'No API key configured' }, { status: 500 });
  }

  const system = CHAT_SYSTEM_PROMPT
    .replace('{ENTRY_TEXT}', entry.entry_text)
    .replace('{ANALYSIS}', entry.analysis || '');

  // Build messages array with conversation history
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  if (conversation_history && Array.isArray(conversation_history)) {
    for (const msg of conversation_history) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: 'user', content: message });

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system,
      messages,
    });

    const reply = response.content[0].type === 'text' ? response.content[0].text : '';

    return NextResponse.json({ reply });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
