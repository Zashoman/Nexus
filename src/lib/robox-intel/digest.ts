import { getServiceSupabase } from '@/lib/supabase';
import type { Signal } from '@/types/robox-intel';
import { SIGNAL_TYPE_LABELS } from '@/types/robox-intel';

const SIGNAL_TYPE_EMOJI: Record<string, string> = {
  funding: '💰',
  hiring: '👥',
  press_release: '📢',
  research: '📄',
  competitor: '⚠️',
  dataset: '📊',
  grant: '🎯',
  quote: '💬',
  social: '📱',
  conference: '🎤',
  news: '📰',
};

interface DigestBundle {
  date: string;
  signalsFound: number;
  signals: Signal[];
  html: string;
  text: string;
}

/**
 * Build the daily digest payload: all high-relevance signals with
 * status=new, created in the last 24h. Returns plain text and HTML.
 */
export async function buildDailyDigest(): Promise<DigestBundle> {
  const supabase = getServiceSupabase();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('robox_signals')
    .select('*')
    .eq('relevance', 'high')
    .eq('status', 'new')
    .gte('created_at', since)
    .order('date', { ascending: false })
    .limit(20);

  const signals = (data || []) as Signal[];
  const date = new Date().toISOString().split('T')[0];

  return {
    date,
    signalsFound: signals.length,
    signals,
    text: buildTextDigest(date, signals),
    html: buildHtmlDigest(date, signals),
  };
}

function buildTextDigest(date: string, signals: Signal[]): string {
  if (signals.length === 0) {
    return `RoboX Intel — ${date}\n\nNo high-priority signals in the last 24 hours.\nKeep watch. We will flag anything urgent the moment it lands.`;
  }

  const lines = [
    `RoboX Intel — Daily Digest — ${date}`,
    `${signals.length} high-priority signal${signals.length === 1 ? '' : 's'}\n`,
  ];

  signals.forEach((s, i) => {
    const typeLabel = SIGNAL_TYPE_LABELS[s.type] || s.type;
    lines.push(
      `${i + 1}. [${typeLabel.toUpperCase()}] ${s.title}`,
      `   Company: ${s.company}`,
      `   Source:  ${s.source} (${s.date})`,
      `   Link:    ${s.url}`,
      ``,
      `   ${s.summary}`,
      ``,
      `   ACTION: ${s.suggested_action}`,
      ``
    );
  });

  lines.push('---');
  lines.push('Reply "queued" to move a signal to this week.');
  lines.push('Reply "acted" once outreach is sent.');

  return lines.join('\n');
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtmlDigest(date: string, signals: Signal[]): string {
  const header = `<h1 style="font-family:system-ui,sans-serif;font-size:18px;margin:0 0 4px 0;">RoboX Intel — Daily Digest</h1>
<p style="color:#666;margin:0 0 20px 0;font-family:system-ui,sans-serif;font-size:13px;">${escape(date)} · ${signals.length} high-priority signal${signals.length === 1 ? '' : 's'}</p>`;

  if (signals.length === 0) {
    return `${header}<p style="font-family:system-ui,sans-serif;">No high-priority signals in the last 24 hours. Keep watch.</p>`;
  }

  const cards = signals
    .map((s) => {
      const typeLabel = SIGNAL_TYPE_LABELS[s.type] || s.type;
      const emoji = SIGNAL_TYPE_EMOJI[s.type] || '•';
      return `<div style="border:1px solid #e5e5e5;border-radius:8px;padding:16px;margin-bottom:12px;font-family:system-ui,sans-serif;">
  <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">${emoji} ${escape(typeLabel)}</div>
  <div style="font-size:15px;font-weight:600;margin-bottom:4px;"><a href="${escape(s.url)}" style="color:#111;text-decoration:none;">${escape(s.title)}</a></div>
  <div style="font-size:12px;color:#666;margin-bottom:12px;">${escape(s.company)} · ${escape(s.source)} · ${escape(s.date)}</div>
  <div style="font-size:13px;color:#333;margin-bottom:12px;line-height:1.5;">${escape(s.summary)}</div>
  <div style="background:#f0fdf4;border-left:3px solid #22c55e;padding:10px 12px;font-size:12px;color:#166534;line-height:1.5;"><strong>Action:</strong> ${escape(s.suggested_action)}</div>
</div>`;
    })
    .join('\n');

  return `${header}${cards}`;
}

/**
 * Send the digest via email using a webhook-style provider (e.g. Resend,
 * Postmark) — configured via DIGEST_WEBHOOK_URL. Falls back to just
 * returning the payload when no webhook is configured.
 */
export async function sendDailyDigest(
  recipient?: string
): Promise<{ sent: boolean; reason?: string; bundle: DigestBundle }> {
  const bundle = await buildDailyDigest();
  const webhookUrl = process.env.DIGEST_WEBHOOK_URL;
  const to = recipient || process.env.DIGEST_RECIPIENT;

  if (!webhookUrl || !to) {
    return {
      sent: false,
      reason: !webhookUrl
        ? 'DIGEST_WEBHOOK_URL not set'
        : 'no recipient (set DIGEST_RECIPIENT)',
      bundle,
    };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DIGEST_WEBHOOK_TOKEN || ''}`,
      },
      body: JSON.stringify({
        to,
        subject: `RoboX Intel — ${bundle.date} — ${bundle.signalsFound} signal${bundle.signalsFound === 1 ? '' : 's'}`,
        html: bundle.html,
        text: bundle.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { sent: false, reason: `webhook ${res.status}: ${body}`, bundle };
    }
    return { sent: true, bundle };
  } catch (err) {
    return {
      sent: false,
      reason: err instanceof Error ? err.message : String(err),
      bundle,
    };
  }
}
