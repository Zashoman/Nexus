import { NextResponse } from 'next/server';
import { listUniboxEmails, listCampaigns } from '@/lib/outreach/instantly';
import { classifyReply } from '@/lib/outreach/classifier';
import {
  postWeeklySummaryHeader,
  postInboxSectionHeader,
  postReplyToSlack,
  type WeeklyInboxBreakdown,
} from '@/lib/outreach/slack';
import { saveSlackDraft } from '@/lib/outreach/draft-store';
import { buildDraftSystemPrompt, buildDraftContext } from '@/lib/outreach/prompt';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ============================================================
// Weekly Inbox Digest — posts a 7-day summary to Slack
// ============================================================
// Pulls up to 500 unibox emails, filters to inbound replies from
// the last 7 days, classifies each, drafts replies for actionable
// ones, posts a header + per-inbox sections + actionable reply
// cards to Slack.
//
// Distinct from daily-summary: wider window, richer top-line
// stats, and ONLY actionable replies get their own card (the
// daily posts everything). This prevents Slack from drowning in
// 200 low-priority messages for a full-week digest.
//
// Can be triggered by:
//   - GET  (cron / manual browser hit, with Bearer CRON_SECRET)
//   - POST (dashboard button, same-origin)
// ============================================================

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
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
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
  if (!plain && typeof email.content_preview === 'string') plain = email.content_preview;
  return { plain: plain.substring(0, 2000), html };
}

function parseTimestamp(raw: Record<string, unknown>): number {
  const ts = String(
    raw.timestamp_email ||
    raw.timestamp_created ||
    raw.timestamp ||
    raw.date ||
    raw.created_at ||
    ''
  );
  if (!ts) return 0;
  const ms = new Date(ts).getTime();
  return Number.isFinite(ms) ? ms : 0;
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

PROSPECT'S REPLY:
"${replyText}"

FULL THREAD:
${cleanHtml}
${extraContext ? '\n' + extraContext + '\n' : ''}
Write the reply. Just the email body.`,
    }],
  });

  return message.content?.[0]?.type === 'text' ? message.content[0].text : '';
}

// The categories that deserve their own card (i.e. a human should act).
// Everything else is counted in the top-line summary but NOT posted.
const ACTIONABLE_CATEGORIES = new Set(['interested', 'meeting_request', 'question']);

// ============================================================
// Handler
// ============================================================

async function run() {
  const startTime = Date.now();
  const channel = (process.env.SLACK_CHANNEL || '').replace(/^#/, '');

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
  }

  // 1. Fetch campaigns for name lookup
  const campaigns = await listCampaigns();
  const campaignMap: Record<string, string> = {};
  campaigns.forEach((c) => { campaignMap[c.id] = c.name; });

  // 2. Pull 500 recent unibox emails (wider net for weekly window)
  const allEmails = await listUniboxEmails({ limit: 500 });

  // 3. Date window: last 7 days (to now)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400 * 1000);
  const windowStartMs = sevenDaysAgo.getTime();

  // 4. Filter to inbound replies within the 7-day window
  const inbound = allEmails.filter((e) => {
    const raw = e as unknown as Record<string, unknown>;
    const from = String(raw.from_address_email || '').toLowerCase();
    const eaccount = String(raw.eaccount || '').toLowerCase();
    if (isBlueTreeEmail(from)) return false;
    if (from && eaccount && from === eaccount) return false;
    const ts = parseTimestamp(raw);
    if (!ts || ts < windowStartMs) return false;
    return true;
  });

  const allAccounts = [
    ...new Set(
      allEmails
        .map((e) => String((e as Record<string, unknown>).eaccount || ''))
        .filter(Boolean)
    ),
  ];

  if (inbound.length === 0) {
    await postWeeklySummaryHeader({
      date_from: sevenDaysAgo,
      date_to: now,
      total_replies: 0,
      actionable_replies: 0,
      by_inbox: [],
      by_category: {},
      priority_counts: { high: 0, medium: 0, low: 0 },
      campaigns: [],
    });
    return NextResponse.json({
      ok: true,
      count: 0,
      window: { from: sevenDaysAgo.toISOString(), to: now.toISOString() },
      message: 'No prospect replies in the last 7 days',
    });
  }

  // 5. Classify every reply (and optionally draft for actionable ones)
  interface Processed {
    id: string;
    sender_name: string;
    sender_email: string;
    subject: string;
    reply_text: string;
    thread_html: string;
    campaign_name: string;
    account_email: string;
    category: string;
    priority: string;
    confidence: number;
    summary: string;
    needs_reply: boolean;
    draft: string;
  }

  const processed: Processed[] = [];
  const seenIds = new Set<string>();

  for (const email of inbound) {
    const raw = email as unknown as Record<string, unknown>;
    const emailId = String(raw.id || '');
    if (!emailId || seenIds.has(emailId)) continue;
    seenIds.add(emailId);

    const fromJson = raw.from_address_json as Array<{ address: string; name: string }> | undefined;
    const senderName =
      fromJson?.[0]?.name ||
      String(raw.from_name || raw.from_address_email || raw.lead || 'Unknown');
    const senderEmail =
      fromJson?.[0]?.address ||
      String(raw.from_address_email || raw.lead || '');
    const subject = String(raw.subject || '(no subject)');
    const campaignName = campaignMap[String(raw.campaign_id || '')] || 'Unknown campaign';
    const accountEmail = String(raw.eaccount || '');
    const { plain, html } = getBody(raw);
    if (!plain && !html) continue;

    const classification = await classifyReply(senderName, senderEmail, subject, plain, campaignName);

    const shouldDraft =
      classification.needs_reply && ACTIONABLE_CATEGORIES.has(classification.category);

    let draft = '';
    if (shouldDraft) {
      try {
        draft = await generateDraft(
          senderName, senderEmail, subject, plain, html,
          campaignName, accountEmail, classification.summary,
        );
      } catch {
        draft = '(Draft generation failed)';
      }
    }

    processed.push({
      id: emailId,
      sender_name: senderName,
      sender_email: senderEmail,
      subject,
      reply_text: plain.substring(0, 500),
      thread_html: html.substring(0, 8000),
      campaign_name: campaignName,
      account_email: accountEmail,
      category: classification.category,
      priority: classification.priority,
      confidence: classification.confidence,
      summary: classification.summary,
      needs_reply: classification.needs_reply,
      draft,
    });
  }

  // 6. Aggregate stats
  const byCategory: Record<string, number> = {};
  const byInboxMap = new Map<string, { total: number; actionable: number; by_category: Record<string, number> }>();
  let actionable = 0;
  const campaignNames = new Set<string>();
  const priorityCounts = { high: 0, medium: 0, low: 0 };

  for (const r of processed) {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    campaignNames.add(r.campaign_name);

    const inbox = r.account_email || 'Unknown';
    if (!byInboxMap.has(inbox)) {
      byInboxMap.set(inbox, { total: 0, actionable: 0, by_category: {} });
    }
    const row = byInboxMap.get(inbox)!;
    row.total += 1;
    row.by_category[r.category] = (row.by_category[r.category] || 0) + 1;

    if (ACTIONABLE_CATEGORIES.has(r.category)) {
      actionable += 1;
      row.actionable += 1;
      if (r.priority === 'high') priorityCounts.high += 1;
      else if (r.priority === 'medium') priorityCounts.medium += 1;
      else priorityCounts.low += 1;
    }
  }

  const byInbox: WeeklyInboxBreakdown[] = [...byInboxMap.entries()].map(([inbox, row]) => ({
    inbox,
    total: row.total,
    actionable: row.actionable,
    by_category: row.by_category,
  }));

  // 7. Post the weekly summary header
  await postWeeklySummaryHeader({
    date_from: sevenDaysAgo,
    date_to: now,
    total_replies: processed.length,
    actionable_replies: actionable,
    by_inbox: byInbox,
    by_category: byCategory,
    priority_counts: priorityCounts,
    campaigns: [...campaignNames].filter((n) => n !== 'Unknown campaign'),
  });

  // 8. Post individual cards ONLY for actionable replies, grouped by inbox
  const actionableReplies = processed.filter((r) => ACTIONABLE_CATEGORIES.has(r.category));

  // Group by inbox
  const byInboxActionable = new Map<string, Processed[]>();
  for (const r of actionableReplies) {
    const inbox = r.account_email || 'Unknown';
    if (!byInboxActionable.has(inbox)) byInboxActionable.set(inbox, []);
    byInboxActionable.get(inbox)!.push(r);
  }

  const sortedInboxes = [...byInboxActionable.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 };
  for (const [, replies] of sortedInboxes) {
    replies.sort((a, b) =>
      (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3)
    );
  }

  const categoryLabels: Record<string, string> = {
    interested: 'Interested',
    meeting_request: 'Meeting Request',
    question: 'Question',
  };

  for (const [inbox, replies] of sortedInboxes) {
    if (sortedInboxes.length > 1) {
      await postInboxSectionHeader(inbox, replies.length);
      await new Promise((r) => setTimeout(r, 300));
    }

    for (const reply of replies) {
      try {
        const slackResult = await postReplyToSlack({
          sender_name: reply.sender_name,
          sender_email: reply.sender_email,
          subject: reply.subject,
          reply_preview: reply.reply_text,
          campaign_name: reply.campaign_name,
          classification: categoryLabels[reply.category] || reply.category,
          confidence: reply.confidence,
          priority: reply.priority,
          ai_summary: reply.summary,
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
        console.error('Failed to push weekly reply to Slack:', err);
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return NextResponse.json({
    ok: true,
    window: { from: sevenDaysAgo.toISOString(), to: now.toISOString() },
    total_replies: processed.length,
    actionable_replies: actionable,
    priority_counts: priorityCounts,
    by_category: byCategory,
    inboxes: byInbox.map((r) => ({ inbox: r.inbox, total: r.total, actionable: r.actionable })),
    accounts_scanned: allAccounts,
    campaigns: [...campaignNames],
    duration_ms: Date.now() - startTime,
  });
}

export async function GET(request: Request) {
  // Cron auth: same rules as daily-summary.
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
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
    return await run();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Weekly summary failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: same-origin dashboard trigger. The site middleware already
// verifies that POST requests come from an allowed origin, so we don't
// need the CRON_SECRET here — that's specifically for external cron.
export async function POST() {
  try {
    return await run();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Weekly summary failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
