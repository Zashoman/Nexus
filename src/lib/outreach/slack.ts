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
  const replySnippet = params.reply_preview.substring(0, 200).replace(/\n/g, ' ');
  const draftSnippet = params.draft_reply.substring(0, 500).replace(/\n/g, ' ');

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${priorityEmoji} *${params.sender_name}* — ${params.classification}\n${params.sender_email} · ${params.campaign_name} · via ${params.account_email}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `>${replySnippet}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `✏️ *Draft:* ${draftSnippet}`,
      },
    },
    { type: 'divider' },
  ];

  return slackPost('/chat.postMessage', {
    channel,
    text: `${priorityEmoji} ${params.sender_name} — ${params.classification}`,
    blocks,
    unfurl_links: false,
    unfurl_media: false,
  });
}

/** Post a batch summary header to Slack */
export async function postBatchHeader(count: number, accounts?: string[], campaigns?: string[]) {
  const channel = getChannel();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const inboxList = accounts?.length ? accounts.join(', ') : 'all';
  const campaignList = campaigns?.length ? campaigns.join(', ') : 'all';

  const blocks: Record<string, unknown>[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📬 *${today}* — *${count}* replies need attention\nInboxes: ${inboxList}\nCampaigns: ${campaignList}`,
      },
    },
    { type: 'divider' },
  ];

  return slackPost('/chat.postMessage', {
    channel,
    text: `📬 Daily Reply Summary — ${today} — ${count} replies need attention`,
    blocks,
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
