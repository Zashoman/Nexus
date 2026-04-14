import type { Signal } from '@/types/robox-intel';
import { SIGNAL_TYPE_LABELS } from '@/types/robox-intel';

/**
 * Post a Tier 1 signal to Slack via incoming webhook.
 * Configure by setting ROBOX_SLACK_WEBHOOK_URL.
 *
 * Tier 1 = any high-relevance signal. The cron ingestion runs this
 * per newly-created signal with relevance === 'high'.
 */

const SIGNAL_TYPE_EMOJI: Record<string, string> = {
  funding: ':moneybag:',
  hiring: ':busts_in_silhouette:',
  press_release: ':loudspeaker:',
  research: ':page_facing_up:',
  competitor: ':warning:',
  dataset: ':bar_chart:',
  grant: ':dart:',
  quote: ':speech_balloon:',
  social: ':iphone:',
  conference: ':microphone:',
  news: ':newspaper:',
};

export function isSlackEnabled(): boolean {
  return !!process.env.ROBOX_SLACK_WEBHOOK_URL;
}

export async function postSignalToSlack(signal: Signal): Promise<boolean> {
  const url = process.env.ROBOX_SLACK_WEBHOOK_URL;
  if (!url) return false;

  const emoji = SIGNAL_TYPE_EMOJI[signal.type] || ':rotating_light:';
  const typeLabel = SIGNAL_TYPE_LABELS[signal.type] || signal.type;

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} Tier 1 signal — ${typeLabel}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*<${signal.url}|${signal.title}>*\n${signal.company} · ${signal.source} · ${signal.date}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: signal.summary.slice(0, 500),
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Action:* ${signal.suggested_action.slice(0, 500)}`,
      },
    },
  ];

  if (signal.tags?.includes('zero-coverage')) {
    blocks.splice(1, 0, {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ':zap: *Zero media coverage* — outreach lands in an empty inbox.',
      },
    });
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `Tier 1 signal: ${signal.company} — ${signal.title}`,
        blocks,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[slack] post failed:', err);
    return false;
  }
}
