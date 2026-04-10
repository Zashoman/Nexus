import { NextResponse } from 'next/server';
import { listUniboxEmails, listCampaigns } from '@/lib/outreach/instantly';
import { classifyReply } from '@/lib/outreach/classifier';
import Anthropic from '@anthropic-ai/sdk';

const BLUE_TREE_DOMAINS = [
  'bluetree.ai', 'bluetreesaas.org', 'bluetreeailinks.org',
  'bluetreegrow.org', 'bluetreedigitalpr.com', 'bluetreeaidigital.org',
  'bluetreeteams.org', 'bluetreedigitalpr.org', 'bluetreeaidigital.com',
];

function isBlueTreeEmail(email: string): boolean {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return BLUE_TREE_DOMAINS.some((d) => domain === d);
}

function stripHtml(html: string): string {
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getBody(email: Record<string, unknown>): { plain: string; html: string } {
  const body = email.body;
  let html = '';
  let plain = '';

  if (body && typeof body === 'object' && body !== null) {
    const b = body as Record<string, string>;
    html = b.html || '';
    plain = b.text || stripHtml(html);
  } else if (typeof body === 'string') {
    html = body;
    plain = stripHtml(body);
  }

  if (!plain && typeof email.content_preview === 'string') {
    plain = email.content_preview;
  }

  return { plain: plain.substring(0, 2000), html };
}

async function generateDraft(
  senderName: string,
  senderEmail: string,
  subject: string,
  replyText: string,
  threadHtml: string,
  campaignName: string,
  accountEmail: string,
  aiSummary: string,
): Promise<string> {
  const client = new Anthropic();

  const cleanHtml = threadHtml
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<img[^>]*>/gi, '[image]')
    .substring(0, 8000);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: `You are a professional email reply writer for Blue Tree Digital PR.

Blue Tree helps SaaS/tech companies grow through editorial placements in major publications, high-quality backlinks, and digital PR campaigns. They helped Hostinger achieve 211%+ organic growth.

RULES:
- NEVER say the message "got cut off" — short replies are complete messages
- Directly address what the prospect said
- Be concise (3-6 sentences), warm, professional
- Reference their company and what was discussed
- Sign off as the person specified in "Replying as"
- Just the email body, no subject line`,
    messages: [{
      role: 'user',
      content: `Draft a reply.

PROSPECT: ${senderName} <${senderEmail}>
SUBJECT: ${subject}
CAMPAIGN: ${campaignName}
REPLYING AS: ${accountEmail}
AI ASSESSMENT: ${aiSummary}

PROSPECT'S REPLY (complete message — NOT cut off):
"${replyText}"

FULL THREAD:
${cleanHtml}

Write the reply. Just the email body.`,
    }],
  });

  return message.content[0].type === 'text' ? message.content[0].text : '';
}

// GET: fetch all replies, classify, and generate drafts in one pass
export async function GET() {
  try {
    // Fetch campaigns for name lookup
    const campaigns = await listCampaigns();
    const campaignMap: Record<string, string> = {};
    campaigns.forEach((c) => { campaignMap[c.id] = c.name; });

    // Fetch emails
    const allEmails = await listUniboxEmails({ limit: 100 });

    // Filter to inbound replies only
    const inbound = allEmails.filter((e) => {
      const from = String((e as Record<string, unknown>).from_address_email || '').toLowerCase();
      const eaccount = String((e as Record<string, unknown>).eaccount || '').toLowerCase();
      if (isBlueTreeEmail(from)) return false;
      if (from && eaccount && from === eaccount) return false;
      return true;
    });

    // Get unique accounts being pulled from
    const accounts = [...new Set(inbound.map((e) => String((e as Record<string, unknown>).eaccount || '')).filter(Boolean))];

    // Process each reply: classify + draft
    const results = [];
    for (const email of inbound) {
      const raw = email as unknown as Record<string, unknown>;
      const fromJson = raw.from_address_json as Array<{ address: string; name: string }> | undefined;
      const senderName = fromJson?.[0]?.name || String(raw.from_name || raw.from_address_email || raw.lead || 'Unknown');
      const senderEmail = fromJson?.[0]?.address || String(raw.from_address_email || raw.lead || '');
      const subject = String(raw.subject || '(no subject)');
      const campaignName = campaignMap[String(raw.campaign_id || '')] || 'Unknown campaign';
      const accountEmail = String(raw.eaccount || '');
      const { plain, html } = getBody(raw);

      // Classify
      const classification = await classifyReply(senderName, senderEmail, subject, plain, campaignName);

      // Only draft for replies that need a response
      let draft = '';
      if (classification.needs_reply) {
        try {
          draft = await generateDraft(senderName, senderEmail, subject, plain, html, campaignName, accountEmail, classification.summary);
        } catch {
          draft = '(Draft generation failed)';
        }
      }

      results.push({
        id: String(raw.id),
        sender_name: senderName,
        sender_email: senderEmail,
        subject,
        reply_text: plain.substring(0, 500),
        campaign_name: campaignName,
        campaign_id: String(raw.campaign_id || ''),
        account_email: accountEmail,
        timestamp: String(raw.timestamp_email || raw.timestamp_created || ''),
        classification: {
          category: classification.category,
          confidence: classification.confidence,
          summary: classification.summary,
          needs_reply: classification.needs_reply,
          priority: classification.priority,
        },
        draft,
      });
    }

    // Sort: needs_reply first, then by priority (high > medium > low)
    const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 };
    results.sort((a, b) => {
      if (a.classification.needs_reply && !b.classification.needs_reply) return -1;
      if (!a.classification.needs_reply && b.classification.needs_reply) return 1;
      return (priorityOrder[a.classification.priority] || 3) - (priorityOrder[b.classification.priority] || 3);
    });

    return NextResponse.json({
      date: new Date().toISOString(),
      total_emails_fetched: allEmails.length,
      inbound_replies: inbound.length,
      needs_reply: results.filter((r) => r.classification.needs_reply).length,
      accounts_pulled_from: accounts,
      campaign_names: [...new Set(results.map((r) => r.campaign_name))],
      replies: results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
