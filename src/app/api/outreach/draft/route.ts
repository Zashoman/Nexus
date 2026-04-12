import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildDraftSystemPrompt, buildDraftContext } from '@/lib/outreach/prompt';

// POST: generate a draft reply to an email
export async function POST(request: Request) {
  try {
    const { sender_name, sender_email, subject, reply_text, full_thread_html, campaign_name, account_email, classification_summary } = await request.json();

    if (!reply_text && !full_thread_html) {
      return NextResponse.json({ error: 'reply_text or full_thread_html is required' }, { status: 400 });
    }

    const client = new Anthropic();
    const systemPrompt = await buildDraftSystemPrompt();
    const extraContext = await buildDraftContext({ campaignName: campaign_name, accountEmail: account_email });

    const cleanHtml = (full_thread_html || '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<img[^>]*>/gi, '[image]')
      .substring(0, 8000);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Draft a reply to this prospect's email.

PROSPECT: ${sender_name} <${sender_email}>
SUBJECT: ${subject}
CAMPAIGN: ${campaign_name || 'Blue Tree outreach'}
REPLYING AS: ${account_email || 'Blue Tree team'}
${classification_summary ? `AI ASSESSMENT: ${classification_summary}` : ''}

PROSPECT'S REPLY (this is their complete message, it is NOT cut off):
"${reply_text}"

FULL EMAIL THREAD (HTML):
${cleanHtml}
${extraContext ? '\n' + extraContext + '\n' : ''}
Write a reply to ${sender_name?.split(' ')[0] || 'them'}. Just the email body, nothing else.`,
      }],
    });

    const draft = message.content[0].type === 'text' ? message.content[0].text : '';
    return NextResponse.json({ draft });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to generate draft';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
