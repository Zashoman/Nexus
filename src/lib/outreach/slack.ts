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
  const replySnippet = params.reply_preview.substring(0, 220).replace(/\n+/g, ' ').trim();
  const draftText = params.draft_reply.trim();

  const blocks = [
    // Header: sender + classification
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${priorityEmoji} *${params.sender_name}* _${params.classification}_\n<mailto:${params.sender_email}|${params.sender_email}> · ${params.campaign_name}`,
      },
    },
    // Their reply (quoted)
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `>💬 ${replySnippet}`,
      },
    },
    // The draft
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `\`\`\`${draftText.substring(0, 1500)}\`\`\``,
      },
    },
    // Action hint
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `React: ✅ send · ✏️ revise · ❌ skip · 💤 later · via \`${params.account_email}\``,
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

  // Add reaction shortcuts to make it easy to click
  if (result.ts) {
    await addReaction(channel, result.ts, 'white_check_mark');
    await addReaction(channel, result.ts, 'pencil2');
    await addReaction(channel, result.ts, 'x');
    await addReaction(channel, result.ts, 'zzz');
  }

  return result;
}

/** Post a batch summary header to Slack */
export async function postBatchHeader(count: number, accounts?: string[], campaigns?: string[]) {
  const channel = getChannel();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const inboxLine = accounts?.length ? `*Inboxes:* ${accounts.join(', ')}` : '';
  const campaignLine = campaigns?.length ? `*Campaigns:* ${campaigns.slice(0, 6).join(', ')}${campaigns.length > 6 ? ` +${campaigns.length - 6} more` : ''}` : '';

  const blocks: Record<string, unknown>[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📬 *Daily Review — ${today}*\n*${count}* replies need attention${inboxLine ? '\n' + inboxLine : ''}${campaignLine ? '\n' + campaignLine : ''}`,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: 'React to each draft: ✅ send as-is · ✏️ revise in thread · ❌ skip · 💤 remind later',
        },
      ],
    },
    { type: 'divider' },
  ];

  return slackPost('/chat.postMessage', {
    channel,
    text: `📬 Daily Review — ${today} — ${count} replies need attention`,
    blocks,
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
