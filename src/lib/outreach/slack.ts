// ============================================================
// Slack Client — posts reply notifications to Slack
// ============================================================

const SLACK_API = 'https://slack.com/api';

function getToken(): string {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error('SLACK_BOT_TOKEN is not set');
  return token;
}

function getChannel(): string {
  const channel = process.env.SLACK_CHANNEL;
  if (!channel) throw new Error('SLACK_CHANNEL is not set');
  return channel.replace(/^#/, '');
}

async function slackPost(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`${SLACK_API}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }
  return data;
}

async function addReaction(channel: string, ts: string, name: string) {
  try {
    await slackPost('/reactions.add', { channel, timestamp: ts, name });
  } catch {
    // Silently fail if reaction can't be added
  }
}

/** Post a single reply notification with AI draft to Slack */
export async function postReplyToSlack(params: {
  sender_name: string;
  sender_email: string;
  subject: string;
  reply_preview: string;
  campaign_name: string;
  classification: string;
  confidence: number;
  priority: string;
  ai_summary: string;
  draft_reply: string;
  account_email: string;
}) {
  const channel = getChannel();

  const priorityEmoji = params.priority === 'high' ? '🔴' : params.priority === 'medium' ? '🟡' : '⚪';
  const replySnippet = params.reply_preview.substring(0, 100).replace(/\n+/g, ' ').trim();
  const draftText = params.draft_reply.trim();
  const draftFirstLine = draftText.split('\n').find((l) => l.trim().length > 0) || '';
  const draftPreview = draftFirstLine.substring(0, 120);

  // Ultra-compact main message: 2 lines total
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${priorityEmoji} *${params.sender_name}* · _${params.classification}_ · ${params.campaign_name}\n>💬 ${replySnippet}${params.reply_preview.length > 100 ? '...' : ''}\n>✏️ ${draftPreview}${draftText.length > 120 ? '...' : ''}`,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `<mailto:${params.sender_email}|${params.sender_email}> · via \`${params.account_email}\` · 👇 full draft in thread`,
        },
      ],
    },
  ];

  const result = await slackPost('/chat.postMessage', {
    channel,
    text: `${priorityEmoji} ${params.sender_name} — ${params.classification}`,
    blocks,
    unfurl_links: false,
    unfurl_media: false,
  });

  // Post full context as thread reply (team clicks to expand)
  if (result.ts) {
    // Add reactions first so they appear instantly
    await addReaction(channel, result.ts, 'white_check_mark');
    await addReaction(channel, result.ts, 'pencil2');
    await addReaction(channel, result.ts, 'x');
    await addReaction(channel, result.ts, 'zzz');

    // Then post the full details as a thread reply
    await slackPost('/chat.postMessage', {
      channel,
      thread_ts: result.ts,
      text: `Full details`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Subject:* ${params.subject}\n*AI Summary:* ${params.ai_summary}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*💬 Their full reply:*\n\`\`\`${params.reply_preview.substring(0, 2500)}\`\`\``,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*✏️ Full draft:*\n\`\`\`${draftText.substring(0, 2500)}\`\`\``,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `_Reply in this thread with feedback to revise (e.g. "make it shorter", "mention our case study")_`,
            },
          ],
        },
      ],
      unfurl_links: false,
      unfurl_media: false,
    });
  }

  return result;
}

/** Post a polished daily summary header with priority breakdown */
export async function postBatchHeader(
  count: number,
  accounts?: string[],
  campaigns?: string[],
  priorityCounts?: { high: number; medium: number; low: number },
) {
  const channel = getChannel();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const high = priorityCounts?.high || 0;
  const medium = priorityCounts?.medium || 0;
  const low = priorityCounts?.low || 0;

  const priorityLine = priorityCounts
    ? `${high > 0 ? `🔴 *${high}* urgent  ` : ''}${medium > 0 ? `🟡 *${medium}* medium  ` : ''}${low > 0 ? `⚪ *${low}* low` : ''}`.trim()
    : '';

  const blocks: Record<string, unknown>[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📬 Daily Review — ${today}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${count}* ${count === 1 ? 'reply needs' : 'replies need'} your attention${priorityLine ? `\n${priorityLine}` : ''}`,
      },
    },
  ];

  if (accounts?.length || campaigns?.length) {
    const fields: Record<string, unknown>[] = [];
    if (accounts?.length) {
      fields.push({
        type: 'mrkdwn',
        text: `*Inboxes scanned:*\n${accounts.map((a) => `• \`${a}\``).join('\n')}`,
      });
    }
    if (campaigns?.length) {
      const display = campaigns.slice(0, 8);
      fields.push({
        type: 'mrkdwn',
        text: `*Campaigns:*\n${display.map((c) => `• ${c}`).join('\n')}${campaigns.length > 8 ? `\n_+${campaigns.length - 8} more_` : ''}`,
      });
    }
    blocks.push({ type: 'section', fields });
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: '👇 Each reply below has the AI draft ready · React to take action: ✅ send · ✏️ revise · ❌ skip · 💤 later',
      },
    ],
  });
  blocks.push({ type: 'divider' });

  return slackPost('/chat.postMessage', {
    channel,
    text: `📬 Daily Review — ${today} — ${count} replies need attention`,
    blocks,
    unfurl_links: false,
  });
}

/** Post a section header for grouping replies by inbox */
export async function postInboxSectionHeader(inbox: string, count: number) {
  const channel = getChannel();

  return slackPost('/chat.postMessage', {
    channel,
    text: `Inbox: ${inbox} (${count})`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `📥 *${inbox}* — ${count} ${count === 1 ? 'reply' : 'replies'}`,
        },
      },
    ],
    unfurl_links: false,
  });
}

/** Test Slack connection */
export async function testSlackConnection(): Promise<{ ok: boolean; error?: string; channel?: string }> {
  try {
    const channel = getChannel();
    await slackPost('/chat.postMessage', {
      channel,
      text: '✅ Blue Tree Brain connected to Slack successfully.',
    });
    return { ok: true, channel };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/** Lightweight Slack health check — does NOT post a message.
 *  Calls auth.test to verify the bot token is valid. Safe to call on every page load. */
export async function getSlackStatus(): Promise<{
  ok: boolean;
  error?: string;
  channel?: string;
  team?: string;
  bot_user?: string;
}> {
  try {
    // Don't throw if env vars are missing — return a clean "not configured" state
    const token = process.env.SLACK_BOT_TOKEN;
    const rawChannel = process.env.SLACK_CHANNEL;
    if (!token || !rawChannel) {
      return { ok: false, error: 'Slack not configured (SLACK_BOT_TOKEN or SLACK_CHANNEL missing)' };
    }
    const channel = rawChannel.replace(/^#/, '');

    const res = await fetch(`${SLACK_API}/auth.test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (!data.ok) return { ok: false, error: data.error || 'auth.test failed', channel };
    return { ok: true, channel, team: data.team, bot_user: data.user };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/** Add an acknowledgment reaction to a message */
export async function acknowledgeMessage(channel: string, ts: string, reaction: string) {
  return addReaction(channel, ts, reaction);
}

/** Post a threaded reply to an existing message */
export async function postThreadReply(channel: string, ts: string, text: string) {
  return slackPost('/chat.postMessage', {
    channel,
    thread_ts: ts,
    text,
  });
}
