import { NextResponse } from 'next/server';
import { acknowledgeMessage, postThreadReply } from '@/lib/outreach/slack';
import { getSlackDraft, updateSlackDraft, updateDraftStatus } from '@/lib/outreach/draft-store';
import Anthropic from '@anthropic-ai/sdk';

// Slack Events API endpoint
// Handles URL verification, reaction_added, and message.channels events
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // URL verification challenge (required when first setting up Events API)
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge });
    }

    // Handle event callbacks
    if (body.type === 'event_callback') {
      const event = body.event;

      // Reaction added to a message
      if (event?.type === 'reaction_added') {
        // Fire and forget — don't block the response
        handleReaction(event).catch((err) => console.error('Reaction handler error:', err));
      }

      // Message in a channel (might be a thread reply with revision instructions)
      if (event?.type === 'message' && event.thread_ts && !event.bot_id && !event.subtype) {
        handleThreadReply(event).catch((err) => console.error('Thread reply handler error:', err));
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Slack events error:', err);
    return NextResponse.json({ ok: true }); // Always return 200 to Slack
  }
}

async function handleReaction(event: {
  reaction: string;
  user: string;
  item: { channel: string; ts: string };
}) {
  const { reaction, user, item } = event;
  const { channel, ts } = item;

  // Only handle specific reactions
  const actionMap: Record<string, { reply: string; ack: string; status?: 'approved' | 'skipped' | 'snoozed' }> = {
    white_check_mark: {
      reply: `✅ <@${user}> approved this draft. _Logged as ready to send. Sending happens once Instantly write access is enabled._`,
      ack: 'ballot_box_with_check',
      status: 'approved',
    },
    pencil2: {
      reply: `✏️ <@${user}> wants to revise. *Reply in this thread* with your changes (e.g. "make it shorter", "mention our case study", "tone it down").`,
      ack: 'eyes',
    },
    x: {
      reply: `❌ <@${user}> skipped this reply. _No response will be sent._`,
      ack: 'wastebasket',
      status: 'skipped',
    },
    zzz: {
      reply: `💤 <@${user}> snoozed this for later. _Will resurface in the next daily review._`,
      ack: 'clock1',
      status: 'snoozed',
    },
  };

  const action = actionMap[reaction];
  if (!action) return;

  await postThreadReply(channel, ts, action.reply);
  await acknowledgeMessage(channel, ts, action.ack);

  if (action.status) {
    await updateDraftStatus(channel, ts, action.status);
  }
}

async function handleThreadReply(event: {
  channel: string;
  thread_ts: string;
  ts: string;
  user: string;
  text: string;
}) {
  const { channel, thread_ts, user, text } = event;

  // Look up the original draft this thread is attached to
  const draft = await getSlackDraft(channel, thread_ts);
  if (!draft) return; // Not one of our draft messages — ignore

  // Skip empty messages or system messages
  if (!text || text.trim().length === 0) return;

  // Acknowledge we're processing
  await acknowledgeMessage(channel, event.ts, 'eyes');

  try {
    // Generate revised draft
    const client = new Anthropic();

    const cleanHtml = (draft.thread_html || '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<img[^>]*>/gi, '[image]')
      .substring(0, 8000);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are a professional email reply writer for Blue Tree Digital PR.

Blue Tree helps SaaS/tech companies grow through editorial placements, backlinks, and digital PR campaigns.

You're revising an existing draft based on team feedback. Apply the feedback exactly. Keep it concise, warm, professional. NEVER say the message "got cut off". Just the email body, no preamble.`,
      messages: [{
        role: 'user',
        content: `Revise this draft based on team feedback.

PROSPECT: ${draft.sender_name} <${draft.sender_email}>
SUBJECT: ${draft.subject}
CAMPAIGN: ${draft.campaign_name}
REPLYING AS: ${draft.account_email}

PROSPECT'S REPLY (their complete message):
"${draft.reply_text}"

FULL THREAD:
${cleanHtml}

PREVIOUS DRAFT:
${draft.current_draft}

TEAM FEEDBACK:
${text}

Write the revised draft. Just the email body.`,
      }],
    });

    const newDraft = message.content[0].type === 'text' ? message.content[0].text : '';

    if (!newDraft) {
      await postThreadReply(channel, thread_ts, `⚠️ Couldn't generate a revised draft. Try again with different instructions.`);
      return;
    }

    // Save the new draft
    await updateSlackDraft(channel, thread_ts, newDraft);

    // Post the revised draft in the thread
    await postThreadReply(
      channel,
      thread_ts,
      `✏️ *Revised draft based on <@${user}>'s feedback:*\n\`\`\`${newDraft}\`\`\`\n_React with ✅ to approve, or reply again with more changes._`,
    );

    // Acknowledge with a checkmark on the original feedback message
    await acknowledgeMessage(channel, event.ts, 'white_check_mark');
  } catch (err) {
    console.error('Revision error:', err);
    await postThreadReply(channel, thread_ts, `⚠️ Failed to generate revision: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
