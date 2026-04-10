import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// POST: generate a draft reply to an email
export async function POST(request: Request) {
  try {
    const { sender_name, sender_email, subject, reply_text, full_thread_html, campaign_name, account_email, classification_summary } = await request.json();

    if (!reply_text && !full_thread_html) {
      return NextResponse.json({ error: 'reply_text or full_thread_html is required' }, { status: 400 });
    }

    const client = new Anthropic();

    const systemPrompt = `You are a professional email reply writer for Blue Tree Digital PR, a digital PR agency that helps SaaS and tech companies grow through editorial placements in major publications, strategic backlinks, and content marketing.

Blue Tree's core services:
- Securing guest post placements on high-authority publications (TechCrunch, Wired, Harvard Business Review, etc.)
- Building high-quality backlinks that boost organic search rankings
- Digital PR campaigns that drive organic traffic growth
- Content marketing strategy for B2B SaaS companies

Context: You're replying to someone who responded to one of Blue Tree's outreach emails. The full email thread is provided so you understand the conversation history.

Your reply should:
- Directly address what the person asked or said in their reply
- Be brief and actionable (3-6 sentences for most replies)
- Move the conversation forward — suggest a call, offer to share specific examples, answer their question
- Reference specifics from the thread (their company name, what was discussed)
- Sound human, warm, and professional — not robotic or salesy
- Use the sender's first name
- Sign off as the person whose email account sent the original outreach

Do NOT include a subject line. Just write the email body.
Do NOT include "Dear" — use "Hi [name]" or "Hey [name]" matching the thread's tone.
Do NOT repeat what was already said in the thread. Build on it.
Do NOT be vague — if they asked for more info, give them something specific or concrete next step.`;

    // Strip HTML for the thread context but keep structure
    const threadContext = full_thread_html
      ? full_thread_html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 4000)
      : '';

    const userPrompt = `Reply to this email thread:

From: ${sender_name} <${sender_email}>
Subject: ${subject}
Campaign: ${campaign_name || 'Blue Tree outreach'}
Replying from account: ${account_email || 'Blue Tree team'}
${classification_summary ? `AI classification: ${classification_summary}` : ''}

Their latest reply:
"${reply_text || '(see full thread below)'}"

Full email thread (includes the original outreach and all replies):
${threadContext}

Write a draft reply that directly addresses what ${sender_name.split(' ')[0]} said. Just the email body, nothing else.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const draft = message.content[0].type === 'text' ? message.content[0].text : '';

    return NextResponse.json({ draft });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate draft';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
