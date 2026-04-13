import { NextResponse } from 'next/server';
import { listUniboxEmails, listCampaigns } from '@/lib/outreach/instantly';
import { classifyReply } from '@/lib/outreach/classifier';
import { postBatchHeader, postInboxSectionHeader, postReplyToSlack } from '@/lib/outreach/slack';
import { saveSlackDraft } from '@/lib/outreach/draft-store';
import { buildDraftSystemPrompt, buildDraftContext } from '@/lib/outreach/prompt';
import Anthropic from '@anthropic-ai/sdk';

// Cron endpoint — runs daily to fetch, classify, draft, and push to Slack
// Configured in vercel.json

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
  const systemPrompt = await buildDraftSystemPrompt();
  const extraContext = await buildDraftContext({ campaignName, accountEmail });

  const cleanHtml = threadHtml
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
      content: `Draft a reply.

PROSPECT: ${senderName} <${senderEmail}>
SUBJECT: ${subject}
CAMPAIGN: ${campaignName}
REPLYING AS: ${accountEmail}
AI ASSESSMENT: ${aiSummary}

PROSPECT'S REPLY (complete message, NOT cut off):
"${replyText}"

FULL THREAD:
${cleanHtml}
${extraContext ? '\n' + extraContext + '\n' : ''}
Write the reply. Just the email body.`,
    }],
  });

  return message.content?.[0]?.type === 'text' ? message.content[0].text : '';
}

// GET: triggered by Vercel Cron daily
export async function GET(request: Request) {
  // Verify it's Vercel Cron or authorized caller
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In production, CRON_SECRET must be set and must match
  if (process.env.NODE_ENV === 'production') {
    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    const channel = (process.env.SLACK_CHANNEL || '').replace(/^#/, '');

    // Validate required env vars
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
    }

    // 1. Fetch campaigns for name lookup
    const campaigns = await listCampaigns();
    const campaignMap: Record<string, string> = {};
    campaigns.forEach((c) => { campaignMap[c.id] = c.name; });

    // 2. Fetch emails from Instantly
    const allEmails = await listUniboxEmails({ limit: 100 });

    // 3. Filter to inbound replies only
    const inbound = allEmails.filter((e) => {
      const from = String((e as Record<string, unknown>).from_address_email || '').toLowerCase();
      const eaccount = String((e as Record<string, unknown>).eaccount || '').toLowerCase();
      if (isBlueTreeEmail(from)) return false;
      if (from && eaccount && from === eaccount) return false;
      return true;
    });

    // 4. Get unique accounts and campaigns
    const allAccounts = [...new Set(allEmails.map((e) => String((e as Record<string, unknown>).eaccount || '')).filter(Boolean))];

    if (inbound.length === 0) {
      // Always post a header so the team knows the cron ran
      await postBatchHeader(0, allAccounts, [], { high: 0, medium: 0, low: 0 });
      return NextResponse.json({ ok: true, message: 'No new replies today', count: 0 });
    }

    const accounts = [...new Set(inbound.map((e) => String((e as Record<string, unknown>).eaccount || '')).filter(Boolean))];
    const campaignNames = [...new Set(inbound.map((e) => campaignMap[String((e as Record<string, unknown>).campaign_id || '')] || 'Unknown').filter((n) => n !== 'Unknown'))];

    // 5. Process each reply: classify + draft
    const processed = [];
    const processedIds = new Set<string>();

    for (const email of inbound) {
      const raw = email as unknown as Record<string, unknown>;
      const emailId = String(raw.id || '');

      // Dedup: skip if we've already processed this email
      if (processedIds.has(emailId)) continue;
      processedIds.add(emailId);

      const fromJson = raw.from_address_json as Array<{ address: string; name: string }> | undefined;
      const senderName = fromJson?.[0]?.name || String(raw.from_name || raw.from_address_email || raw.lead || 'Unknown');
      const senderEmail = fromJson?.[0]?.address || String(raw.from_address_email || raw.lead || '');
      const subject = String(raw.subject || '(no subject)');
      const campaignName = campaignMap[String(raw.campaign_id || '')] || 'Unknown campaign';
      const accountEmail = String(raw.eaccount || '');
      const { plain, html } = getBody(raw);

      // Skip emails with no body
      if (!plain && !html) continue;

      const classification = await classifyReply(senderName, senderEmail, subject, plain, campaignName);

      if (!classification.needs_reply) continue; // Skip auto-replies, declines, etc.

      let draft = '';
      try {
        draft = await generateDraft(senderName, senderEmail, subject, plain, html, campaignName, accountEmail, classification.summary);
      } catch {
        draft = '(Draft generation failed)';
      }

      processed.push({
        id: String(raw.id),
        sender_name: senderName,
        sender_email: senderEmail,
        subject,
        reply_text: plain.substring(0, 500),
        thread_html: html.substring(0, 8000),
        campaign_name: campaignName,
        campaign_id: String(raw.campaign_id || ''),
        account_email: accountEmail,
        classification,
        draft,
      });
    }

    if (processed.length === 0) {
      return NextResponse.json({ ok: true, message: 'No actionable replies today', count: 0 });
    }

    // 6. Calculate priority counts
    const priorityCounts = {
      high: processed.filter((r) => r.classification.priority === 'high').length,
      medium: processed.filter((r) => r.classification.priority === 'medium').length,
      low: processed.filter((r) => r.classification.priority === 'low').length,
    };

    // 7. Group by inbox
    const byInbox = new Map<string, typeof processed>();
    for (const reply of processed) {
      const inbox = reply.account_email || 'Unknown';
      if (!byInbox.has(inbox)) byInbox.set(inbox, []);
      byInbox.get(inbox)!.push(reply);
    }

    const sortedInboxes = [...byInbox.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 };
    for (const [, inboxReplies] of sortedInboxes) {
      inboxReplies.sort((a, b) =>
        (priorityOrder[a.classification.priority] || 3) - (priorityOrder[b.classification.priority] || 3)
      );
    }

    // 8. Post the daily summary header
    await postBatchHeader(processed.length, accounts, campaignNames, priorityCounts);

    // 9. Post each inbox section + replies
    const categoryLabels: Record<string, string> = {
      interested: 'Interested',
      meeting_request: 'Meeting Request',
      question: 'Question',
      not_now_later: 'Not Now / Later',
      not_interested: 'Not Interested',
      out_of_office: 'Out of Office',
      auto_reply: 'Auto-reply',
      wrong_person: 'Wrong Person',
      unsubscribe: 'Unsubscribe',
    };

    for (const [inbox, inboxReplies] of sortedInboxes) {
      if (sortedInboxes.length > 1) {
        await postInboxSectionHeader(inbox, inboxReplies.length);
        await new Promise((r) => setTimeout(r, 300));
      }

      for (const reply of inboxReplies) {
        try {
          const slackResult = await postReplyToSlack({
            sender_name: reply.sender_name,
            sender_email: reply.sender_email,
            subject: reply.subject,
            reply_preview: reply.reply_text,
            campaign_name: reply.campaign_name,
            classification: categoryLabels[reply.classification.category] || reply.classification.category,
            confidence: reply.classification.confidence,
            priority: reply.classification.priority,
            ai_summary: reply.classification.summary,
            draft_reply: reply.draft,
            account_email: reply.account_email,
          });

          const actualChannelId = slackResult.channel || channel;
          if (slackResult.ts && actualChannelId) {
            await saveSlackDraft({
              slack_channel: actualChannelId,
              slack_message_ts: slackResult.ts,
              email_id: reply.id,
              sender_name: reply.sender_name,
              sender_email: reply.sender_email,
              subject: reply.subject,
              reply_text: reply.reply_text,
              thread_html: reply.thread_html,
              campaign_name: reply.campaign_name,
              account_email: reply.account_email,
              current_draft: reply.draft,
            });
          }
        } catch (err) {
          console.error('Failed to push reply to Slack:', err);
        }

        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return NextResponse.json({
      ok: true,
      count: processed.length,
      duration_ms: Date.now() - startTime,
      priority_counts: priorityCounts,
      inboxes: accounts,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cron failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
