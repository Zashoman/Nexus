import { NextResponse } from 'next/server';
import { postReplyToSlack, postBatchHeader } from '@/lib/outreach/slack';

// POST: push classified replies with drafts to Slack
export async function POST(request: Request) {
  try {
    const { replies } = await request.json();

    if (!replies || !Array.isArray(replies) || replies.length === 0) {
      return NextResponse.json({ error: 'replies array is required' }, { status: 400 });
    }

    // Post batch header first
    await postBatchHeader(replies.length);

    // Post each reply
    const results = [];
    for (const reply of replies) {
      try {
        await postReplyToSlack({
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
        results.push({ id: reply.id, status: 'sent' });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed';
        results.push({ id: reply.id, status: 'error', error: msg });
      }

      // Small delay between messages to avoid Slack rate limits
      await new Promise((r) => setTimeout(r, 500));
    }

    return NextResponse.json({ sent: results.filter(r => r.status === 'sent').length, results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to push to Slack';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
