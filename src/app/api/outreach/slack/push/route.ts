import { NextResponse } from 'next/server';
import { postReplyToSlack, postBatchHeader, postInboxSectionHeader } from '@/lib/outreach/slack';
import { saveSlackDraft } from '@/lib/outreach/draft-store';
import { requireAuth } from '@/lib/api-auth';

interface PushReply {
  id: string;
  sender_name?: string;
  sender_email?: string;
  subject?: string;
  reply_preview?: string;
  thread_html?: string;
  campaign_name?: string;
  classification?: string;
  confidence?: number;
  priority?: string;
  ai_summary?: string;
  draft_reply?: string;
  account_email?: string;
}

// POST: push classified replies with drafts to Slack
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const { replies, accounts, campaigns } = await request.json() as {
      replies: PushReply[];
      accounts?: string[];
      campaigns?: string[];
    };

    if (!replies || !Array.isArray(replies) || replies.length === 0) {
      return NextResponse.json({ error: 'replies array is required' }, { status: 400 });
    }

    const channel = (process.env.SLACK_CHANNEL || '').replace(/^#/, '');

    // Calculate priority counts
    const priorityCounts = {
      high: replies.filter((r) => r.priority === 'high').length,
      medium: replies.filter((r) => r.priority === 'medium').length,
      low: replies.filter((r) => r.priority === 'low').length,
    };

    // Group replies by inbox (account_email)
    const byInbox = new Map<string, PushReply[]>();
    for (const reply of replies) {
      const inbox = reply.account_email || 'Unknown';
      if (!byInbox.has(inbox)) byInbox.set(inbox, []);
      byInbox.get(inbox)!.push(reply);
    }

    // Sort inboxes alphabetically, but keep replies within each inbox sorted by priority
    const sortedInboxes = [...byInbox.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 };
    for (const [, inboxReplies] of sortedInboxes) {
      inboxReplies.sort((a, b) =>
        (priorityOrder[a.priority || 'none'] || 3) - (priorityOrder[b.priority || 'none'] || 3)
      );
    }

    // Post the daily summary header
    await postBatchHeader(replies.length, accounts, campaigns, priorityCounts);

    const results = [];

    // Post each inbox section
    for (const [inbox, inboxReplies] of sortedInboxes) {
      // Section header for this inbox
      if (sortedInboxes.length > 1) {
        await postInboxSectionHeader(inbox, inboxReplies.length);
        await new Promise((r) => setTimeout(r, 300));
      }

      // Post each reply in this inbox
      for (const reply of inboxReplies) {
        try {
          const slackResult = await postReplyToSlack({
            sender_name: reply.sender_name || 'Unknown',
            sender_email: reply.sender_email || '',
            subject: reply.subject || '(no subject)',
            reply_preview: reply.reply_preview || '',
            campaign_name: reply.campaign_name || 'Unknown campaign',
            classification: reply.classification || 'Unclassified',
            confidence: reply.confidence || 0,
            priority: reply.priority || 'medium',
            ai_summary: reply.ai_summary || '',
            draft_reply: reply.draft_reply || 'No draft generated',
            account_email: reply.account_email || '',
          });

          // Save draft context for thread feedback
          const actualChannelId = slackResult.channel || channel;
          if (slackResult.ts && actualChannelId) {
            await saveSlackDraft({
              slack_channel: actualChannelId,
              slack_message_ts: slackResult.ts,
              email_id: reply.id,
              sender_name: reply.sender_name || 'Unknown',
              sender_email: reply.sender_email || '',
              subject: reply.subject || '(no subject)',
              reply_text: reply.reply_preview || '',
              thread_html: reply.thread_html || reply.reply_preview || '',
              campaign_name: reply.campaign_name || 'Unknown campaign',
              account_email: reply.account_email || '',
              current_draft: reply.draft_reply || '',
            });
          }

          results.push({ id: reply.id, status: 'sent' });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed';
          results.push({ id: reply.id, status: 'error', error: msg });
        }

        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return NextResponse.json({ sent: results.filter(r => r.status === 'sent').length, results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to push to Slack';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
