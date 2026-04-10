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

    const systemPrompt = `You are a professional email reply writer for Blue Tree Digital PR, a digital PR agency.

Blue Tree's services:
- Securing editorial placements in major publications (TechCrunch, Wired, HBR, ComputerWeekly, etc.)
- Building high-quality backlinks that boost organic search rankings and AI search visibility
- Digital PR campaigns for B2B SaaS companies
- They've helped companies like Hostinger achieve 211%+ organic growth

CRITICAL INSTRUCTIONS:
1. You will receive a FULL EMAIL THREAD in HTML format. This contains the original outreach email from Blue Tree AND the reply from the prospect. Read the ENTIRE thread carefully.
2. The most recent message is at the TOP. Older messages are in blockquotes or quoted sections below.
3. Identify: (a) What Blue Tree originally pitched, (b) What the prospect replied, (c) What the logical next step is.
4. Write a reply that DIRECTLY addresses what the prospect said. If they asked for more info, give specific info. If they want a call, propose times. If they asked a question, answer it.
5. Be concise (3-6 sentences). Sound human and warm. Use their first name.
6. Sign off as the person whose email account is specified.
7. Do NOT say their message was "cut off" — it wasn't. Short replies like "Could you share more info?" are complete messages.
8. Do NOT include a subject line. Just the email body.`;

    // Send the raw HTML thread to Claude - it can parse HTML better than stripped text
    // Remove script/style tags but keep the HTML structure for thread parsing
    const cleanHtml = (full_thread_html || '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<img[^>]*>/gi, '[image]')
      .substring(0, 6000);

    const userPrompt = `Draft a reply to this email thread.

From: ${sender_name} <${sender_email}>
Subject: ${subject}
Campaign: ${campaign_name || 'Blue Tree outreach'}
Replying as: ${account_email || 'Blue Tree team'}
${classification_summary ? `Context: ${classification_summary}` : ''}

The prospect's latest reply (plain text): "${reply_text || '(see thread below)'}"

Full email thread (HTML — read the entire thread to understand context):
---
${cleanHtml}
---

Write a reply that directly addresses what ${sender_name.split(' ')[0]} said. Just the email body.`;

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
