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

    const systemPrompt = `You are a professional email reply writer for Blue Tree Digital PR.

Blue Tree helps SaaS and tech companies grow through:
- Editorial placements in major publications (TechCrunch, Wired, HBR, ComputerWeekly)
- High-quality backlinks that boost organic search and AI search visibility
- Digital PR campaigns — they helped Hostinger achieve 211%+ organic growth

CRITICAL RULES:
1. You receive a FULL EMAIL THREAD in HTML. Read it ALL. The thread contains:
   - The prospect's reply (the message you're responding to)
   - Previous emails (Blue Tree's original outreach, any prior back-and-forth)
   - Quoted text in blockquotes
2. NEVER say the message "got cut off" or was incomplete. Short replies like "Could you share more info?" or "Send me details" are COMPLETE messages. People write brief emails. This is normal.
3. Write a reply that DIRECTLY addresses what they said:
   - "Share more info" → describe specific services or offer a call
   - "Not interested" → thank them politely and close
   - "Maybe later" → acknowledge and say you'll follow up
   - "Let's talk" → propose specific times
4. Reference their company name and what was discussed in the original outreach.
5. Be concise (3-6 sentences). Warm and professional. Use their first name.
6. Sign off as the person specified in "Replying as".
7. Do NOT include a subject line. Just the email body.`;

    // Send raw HTML to Claude — it can parse thread structure from HTML
    const cleanHtml = (full_thread_html || '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<img[^>]*>/gi, '[image]')
      .substring(0, 8000);

    const userPrompt = `Draft a reply to this prospect's email.

PROSPECT: ${sender_name} <${sender_email}>
SUBJECT: ${subject}
CAMPAIGN: ${campaign_name || 'Blue Tree outreach'}
REPLYING AS: ${account_email || 'Blue Tree team'}
${classification_summary ? `AI ASSESSMENT: ${classification_summary}` : ''}

PROSPECT'S REPLY (this is their complete message — it is NOT cut off):
"${reply_text}"

FULL EMAIL THREAD (HTML — contains the original outreach and all replies):
${cleanHtml}

Write a reply to ${sender_name.split(' ')[0]}. Just the email body, nothing else.`;

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
