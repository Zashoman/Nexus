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
  // Ensure it has the # prefix stripped (Slack API wants just the name or ID)
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

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${priorityEmoji} New Reply — ${params.sender_name}`,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*From:*\n${params.sender_name}\n<mailto:${params.sender_email}|${params.sender_email}>` },
        { type: 'mrkdwn', text: `*Campaign:*\n${params.campaign_name}` },
        { type: 'mrkdwn', text: `*Classification:*\n${params.classification} (${Math.round(params.confidence * 100)}%)` },
        { type: 'mrkdwn', text: `*Account:*\n${params.account_email}` },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Subject:* ${params.subject}`,
      },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*💬 Their Reply:*\n>${params.reply_preview.substring(0, 500).replace(/\n/g, '\n>')}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🤖 AI Summary:*\n${params.ai_summary}`,
      },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*✏️ Suggested Reply:*\n\`\`\`${params.draft_reply.substring(0, 2500)}\`\`\``,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `📧 Reply via *${params.account_email}* | Priority: *${params.priority}*`,
        },
      ],
    },
  ];

  return slackPost('/chat.postMessage', {
    channel,
    text: `${priorityEmoji} New reply from ${params.sender_name} — ${params.classification}`,
    blocks,
    unfurl_links: false,
    unfurl_media: false,
  });
}

/** Post a batch summary header to Slack */
export async function postBatchHeader(count: number) {
  const channel = getChannel();

  return slackPost('/chat.postMessage', {
    channel,
    text: `📬 ${count} new replies need attention`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📬 ${count} Replies Need Attention`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Blue Tree Brain found *${count}* new replies that need a response. Each one is posted below with an AI-drafted reply. Review, edit if needed, and send.`,
        },
      },
      { type: 'divider' },
    ],
    unfurl_links: false,
  });
}

/** Test Slack connection */
export async function testSlackConnection(): Promise<{ ok: boolean; error?: string; channel?: string }> {
  try {
    const channel = getChannel();
    // Test by posting a simple message
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
