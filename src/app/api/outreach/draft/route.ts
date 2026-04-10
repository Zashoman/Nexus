import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// POST: generate a draft reply to an email
export async function POST(request: Request) {
  try {
    const { sender_name, sender_email, subject, email_body, campaign_name, account_email } = await request.json();

    if (!email_body) {
      return NextResponse.json({ error: 'email_body is required' }, { status: 400 });
    }

    const client = new Anthropic();

    const systemPrompt = `You are a professional email reply writer for Blue Tree Digital PR, a digital PR agency that helps SaaS and tech companies grow through editorial placements, strategic backlinks, and content marketing.

Your job is to draft concise, professional replies to inbound emails. The reply should:
- Match the tone of the original email (formal if they're formal, friendly if they're casual)
- Be brief and to the point (2-5 sentences for most replies)
- Move the conversation forward (suggest a call, share more info, answer questions)
- Sound human, not robotic — no corporate buzzwords
- Use the sender's first name
- Sign off as the person whose email account sent the original outreach (shown as "Replying from" below)

Do NOT include a subject line. Just write the email body text.
Do NOT include "Dear" — use "Hi [name]" or "Hey [name]" based on the tone.
Do NOT be overly enthusiastic or salesy.`;

    const userPrompt = `Reply to this email:

From: ${sender_name} <${sender_email}>
Subject: ${subject}
Campaign: ${campaign_name || 'Unknown'}
Replying from: ${account_email || 'Blue Tree team'}

Their email:
${email_body.substring(0, 3000)}

Write a draft reply. Just the email body, nothing else.`;

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
