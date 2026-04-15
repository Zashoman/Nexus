import { NextResponse, after } from 'next/server';
import { acknowledgeMessage, postThreadReply, getSlackStatus } from '@/lib/outreach/slack';
import { getSlackDraft, updateSlackDraft, updateDraftStatus } from '@/lib/outreach/draft-store';
import { getServiceSupabase } from '@/lib/outreach/supabase';
import { logRevision } from '@/lib/outreach/learning';
import { recordInteraction } from '@/lib/outreach/relationship';
import { buildDraftSystemPrompt, buildDraftContext } from '@/lib/outreach/prompt';
import Anthropic from '@anthropic-ai/sdk';

// Module-level cache of the bot's own Slack user ID.
// We need it to tell whether a thread reply was addressed to the bot
// (so we can revise) vs. team-to-team chatter in the thread (so we
// leave it alone). Cached so we don't hit auth.test on every event.
let cachedBotUserId: string | null = null;

async function getBotUserId(): Promise<string | null> {
  if (cachedBotUserId) return cachedBotUserId;
  if (process.env.SLACK_BOT_USER_ID) {
    cachedBotUserId = process.env.SLACK_BOT_USER_ID;
    return cachedBotUserId;
  }
  try {
    const status = await getSlackStatus();
    if (status.ok && status.bot_user) {
      // getSlackStatus returns the username ("bot_user"); auth.test also
      // gives back user_id. We need the user_id for @-mention matching,
      // so fetch it directly here.
      const token = process.env.SLACK_BOT_TOKEN;
      if (!token) return null;
      const res = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data?.ok && typeof data.user_id === 'string') {
        cachedBotUserId = data.user_id;
        return cachedBotUserId;
      }
    }
  } catch {
    /* fall through */
  }
  return null;
}

// Log every incoming event to Supabase for debugging
async function logEvent(eventType: string, data: Record<string, unknown>) {
  try {
    const supabase = getServiceSupabase();
    await supabase.from('slack_event_log').insert({
      event_type: eventType,
      event_data: data,
    });
  } catch {
    // Silently ignore logging errors
  }
}

// Slack Events API endpoint
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Log EVERY incoming request
    await logEvent('incoming', body);

    // URL verification challenge (required when first setting up Events API)
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge });
    }

    // Handle event callbacks
    if (body.type === 'event_callback') {
      const event = body.event;

      await logEvent(`event_${event?.type || 'unknown'}`, {
        type: event?.type,
        subtype: event?.subtype,
        thread_ts: event?.thread_ts,
        ts: event?.ts,
        channel: event?.channel || event?.item?.channel,
        user: event?.user,
        text: event?.text?.substring(0, 200),
        reaction: event?.reaction,
        bot_id: event?.bot_id,
      });

      // Reaction added to a message — use after() to continue processing
      // after responding to Slack (Vercel kills serverless functions otherwise)
      if (event?.type === 'reaction_added') {
        after(async () => {
          try {
            await handleReaction(event);
          } catch (err) {
            await logEvent('reaction_error', { error: String(err) });
          }
        });
      }

      // Message in a channel (might be a thread reply with revision instructions)
      if (event?.type === 'message' && event.thread_ts && !event.bot_id && !event.subtype) {
        after(async () => {
          try {
            await handleThreadReply(event);
          } catch (err) {
            await logEvent('thread_reply_error', { error: String(err), stack: err instanceof Error ? err.stack : undefined });
          }
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    await logEvent('outer_error', { error: String(err) });
    return NextResponse.json({ ok: true });
  }
}

// GET: view recent events for debugging
export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from('slack_event_log')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(30);

    return NextResponse.json({ events: data || [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
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
      reply: `✏️ <@${user}> wants to revise. *Tag me in your reply* below with what you want changed (e.g. \`@Blue Tree Brain make it shorter\` or \`@Blue Tree Brain mention our case study\`). Replies that don't tag me are ignored so the team can chat freely.`,
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

    // Record in relationship memory on approval
    if (action.status === 'approved') {
      const draft = await getSlackDraft(channel, ts);
      if (draft?.sender_email) {
        await recordInteraction({
          contact_email: draft.sender_email,
          contact_name: draft.sender_name,
          interaction: {
            type: 'draft_approved',
            campaign_name: draft.campaign_name,
            summary: `Reply approved for: ${draft.subject}`,
            date: new Date().toISOString(),
          },
        });
      }
    }
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

  // GUARDRAIL: only act as a revision request when the bot is explicitly
  // @-mentioned. Without this, any thread reply (including team-to-team
  // chatter like "@Elena @James let's send these daily") would be parsed
  // as revision feedback and would rewrite the draft. We exit silently
  // when not addressed — no "reminder" spam in the channel.
  const botUserId = await getBotUserId();
  if (!botUserId) {
    await logEvent('thread_reply_skipped', { reason: 'bot_user_id_unknown' });
    return;
  }
  const botMentionPattern = new RegExp(`<@${botUserId}>`);
  if (!botMentionPattern.test(text)) {
    await logEvent('thread_reply_skipped', {
      reason: 'bot_not_mentioned',
      text: text.substring(0, 140),
    });
    return;
  }

  // Clean the feedback text — strip the bot mention and any other Slack
  // mentions, plus any HTML to prevent prompt injection.
  const cleanText = text
    .replace(/<@[A-Z0-9]+>/g, '')  // Remove Slack @mentions (bot + humans)
    .replace(/<[^>]*>/g, '')        // Remove HTML/script tags
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')  // Decode HTML entities
    .replace(/<[^>]*>/g, '')        // Second pass after entity decode
    .trim();

  // If the only content was the mention itself, treat as a no-op.
  if (!cleanText) {
    await postThreadReply(
      channel,
      thread_ts,
      `👋 <@${user}> — tag me with what you want changed (e.g. "make it shorter", "mention our case study", "tone it down").`,
    );
    return;
  }

  // Acknowledge immediately with a text message — feels conversational
  await acknowledgeMessage(channel, event.ts, 'eyes');
  await postThreadReply(
    channel,
    thread_ts,
    `👀 Got it, <@${user}> — revising now...`,
  );

  try {
    const systemPrompt = await buildDraftSystemPrompt();
    const extraContext = await buildDraftContext({ campaignName: draft.campaign_name, accountEmail: draft.account_email });

    const client = new Anthropic();

    const cleanHtml = (draft.thread_html || '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<img[^>]*>/gi, '[image]')
      .substring(0, 8000);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt + '\n\nContext: You are REVISING an existing draft based on team feedback. Apply the feedback exactly.',
      messages: [{
        role: 'user',
        content: `Revise this draft based on team feedback.

PROSPECT: ${draft.sender_name} <${draft.sender_email}>
SUBJECT: ${draft.subject}
CAMPAIGN: ${draft.campaign_name}
REPLYING AS: ${draft.account_email}

PROSPECT'S REPLY:
"${draft.reply_text}"

FULL THREAD:
${cleanHtml}

PREVIOUS DRAFT (this may be wrong, listen to the feedback):
${draft.current_draft}

TEAM FEEDBACK:
${cleanText}
${extraContext ? '\n' + extraContext + '\n' : ''}
Write the revised draft. Just the email body.`,
      }],
    });

    const newDraft = message.content?.[0]?.type === 'text' ? message.content[0].text : '';

    if (!newDraft) {
      await postThreadReply(channel, thread_ts, `⚠️ Couldn't generate a revised draft. Try again with different instructions.`);
      return;
    }

    // Log this revision for future learning
    await logRevision({
      slack_draft_id: draft.id,
      revision_number: (draft.revision_count || 0) + 1,
      original_draft: draft.current_draft,
      revised_draft: newDraft,
      feedback_text: cleanText,
      campaign_name: draft.campaign_name,
      account_email: draft.account_email,
      sender_email: draft.sender_email,
      slack_user_id: user,
    });

    // Save the new draft
    await updateSlackDraft(channel, thread_ts, newDraft);

    // Post the revised draft in the thread
    await postThreadReply(
      channel,
      thread_ts,
      `✏️ *Here's the revised draft:*\n\`\`\`${newDraft}\`\`\`\n_React ✅ to approve, or reply again with more changes._`,
    );

    // Acknowledge with a checkmark on the feedback message
    await acknowledgeMessage(channel, event.ts, 'white_check_mark');
  } catch (err) {
    console.error('Revision error:', err);
    await postThreadReply(
      channel,
      thread_ts,
      `⚠️ Sorry, something went wrong: ${err instanceof Error ? err.message : 'Unknown error'}. Try again.`,
    );
  }
}
