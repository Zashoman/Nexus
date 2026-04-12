import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { SlackDraftContext } from '@/lib/outreach/draft-store';

// POST: regenerate a draft based on user feedback
export async function POST(request: Request) {
  try {
    const { context, feedback } = await request.json() as { context: SlackDraftContext; feedback: string };

    if (!context || !feedback) {
      return NextResponse.json({ error: 'context and feedback are required' }, { status: 400 });
    }

    const client = new Anthropic();

    const cleanHtml = (context.thread_html || '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<img[^>]*>/gi, '[image]')
      .substring(0, 8000);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are a professional email reply writer for Blue Tree Digital PR.

Blue Tree helps SaaS/tech companies grow through editorial placements, backlinks, and digital PR campaigns.

You're revising an existing draft based on user feedback. Your job:
1. Read the original prospect reply and the previous draft
2. Apply the user's feedback exactly
3. Keep the core structure unless feedback says otherwise
4. NEVER say the message "got cut off"
5. Be concise, warm, professional
6. Sign off as the person specified
7. Just the email body, no subject line, no preamble`,
      messages: [{
        role: 'user',
        content: `Revise this draft based on the feedback.

PROSPECT: ${context.sender_name} <${context.sender_email}>
SUBJECT: ${context.subject}
CAMPAIGN: ${context.campaign_name}
REPLYING AS: ${context.account_email}

PROSPECT'S REPLY (their complete message):
"${context.reply_text}"

FULL THREAD:
${cleanHtml}

PREVIOUS DRAFT:
${context.current_draft}

USER FEEDBACK / REVISION INSTRUCTIONS:
${feedback}

Write the revised draft. Just the email body.`,
      }],
    });

    const draft = message.content?.[0]?.type === 'text' ? message.content[0].text : '';

    return NextResponse.json({ draft });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Failed to revise draft';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
