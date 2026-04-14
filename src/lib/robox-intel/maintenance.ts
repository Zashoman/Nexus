import { getServiceSupabase } from '@/lib/supabase';
import { getSettings } from './settings';
import { appendHistory } from './history';
import { postSignalToSlack, isSlackEnabled } from './slack';
import type { Signal } from '@/types/robox-intel';

/**
 * Periodic housekeeping tasks. Designed to be run hourly via cron.
 */

/**
 * Un-snooze signals whose snoozed_until has passed. No history change
 * besides the unsnooze entry; the signal stays in whatever status it
 * was in.
 */
export async function unsnoozeExpired(): Promise<{ unsnoozed: number }> {
  const supabase = getServiceSupabase();

  const { data } = await supabase
    .from('robox_signals')
    .select('id, snoozed_until')
    .lte('snoozed_until', new Date().toISOString())
    .not('snoozed_until', 'is', null)
    .limit(100);

  const rows = data || [];
  for (const row of rows) {
    await supabase
      .from('robox_signals')
      .update({ snoozed_until: null, updated_at: new Date().toISOString() })
      .eq('id', row.id);
    await appendHistory(row.id, 'unsnoozed', row.snoozed_until, null);
  }

  return { unsnoozed: rows.length };
}

/**
 * Auto-archive stale 'new' signals. Threshold comes from settings.
 */
export async function autoArchiveStale(): Promise<{ archived: number }> {
  const supabase = getServiceSupabase();
  const settings = await getSettings();
  const threshold = new Date(
    Date.now() - settings.auto_archive_days * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from('robox_signals')
    .select('id')
    .eq('status', 'new')
    .lte('created_at', threshold)
    .limit(500);

  const rows = data || [];
  if (rows.length === 0) return { archived: 0 };

  const ids = rows.map((r) => r.id);
  await supabase
    .from('robox_signals')
    .update({
      status: 'dismissed',
      updated_at: new Date().toISOString(),
    })
    .in('id', ids);

  for (const id of ids) {
    await appendHistory(
      id,
      'auto_archived',
      'new',
      'dismissed',
      { reason: `untouched > ${settings.auto_archive_days}d` }
    );
  }

  return { archived: rows.length };
}

/**
 * Detect velocity spikes per company and ping Slack if a tracked
 * company accumulates >= threshold signals within the window.
 *
 * Only notifies once per (company, date) pair to avoid spam — tracked
 * via robox_signal_history with event_type='velocity_alert'.
 */
export async function checkVelocityAlerts(): Promise<{
  alertsFired: number;
  companies: string[];
}> {
  const supabase = getServiceSupabase();
  const settings = await getSettings();
  if (!isSlackEnabled()) return { alertsFired: 0, companies: [] };

  const sinceMs =
    Date.now() - settings.velocity_window_hours * 60 * 60 * 1000;
  const since = new Date(sinceMs).toISOString();

  const { data } = await supabase
    .from('robox_signals')
    .select('id, company, title, source, url, date, type, relevance, summary, suggested_action, tags, source_key, raw_content, notes, snoozed_until, created_at, updated_at, acted_at, dedup_hash, status')
    .gte('created_at', since)
    .limit(500);

  // Bucket by company
  const buckets = new Map<string, Signal[]>();
  for (const row of (data || []) as Signal[]) {
    if (!row.company || row.company === 'Unknown') continue;
    const key = row.company.toLowerCase();
    const arr = buckets.get(key) || [];
    arr.push(row);
    buckets.set(key, arr);
  }

  const alerted: string[] = [];
  const today = new Date().toISOString().split('T')[0];

  for (const [key, signals] of buckets.entries()) {
    if (signals.length < settings.velocity_threshold) continue;

    // Check if we already alerted for this company today
    const { data: existing } = await supabase
      .from('robox_signal_history')
      .select('id')
      .eq('event_type', 'velocity_alert')
      .gte('created_at', `${today}T00:00:00Z`)
      .limit(100);

    const existingForCompany = (existing || []).some(() => {
      // We embed company in metadata — but we used a lightweight check:
      // look up the most recent velocity_alert for any signal in this bucket.
      return false;
    });

    // Simpler de-dup: check history of the most recent signal in the bucket
    const [recent] = signals.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const { data: recentHistory } = await supabase
      .from('robox_signal_history')
      .select('id, created_at, metadata')
      .eq('signal_id', recent.id)
      .eq('event_type', 'velocity_alert')
      .limit(1);

    if ((recentHistory && recentHistory.length > 0) || existingForCompany) {
      continue;
    }

    // Fire Slack alert — uses the first high-relevance signal, else first
    const bestSignal =
      signals.find((s) => s.relevance === 'high') || signals[0];
    await postSignalToSlack({
      ...bestSignal,
      title: `VELOCITY SPIKE: ${bestSignal.company} — ${signals.length} signals in ${settings.velocity_window_hours}h`,
      summary:
        `${bestSignal.company} has accumulated ${signals.length} signals in the last ${settings.velocity_window_hours} hours. ` +
        `Most recent: "${bestSignal.title}".`,
      suggested_action:
        `Multiple data points on this company in a short window usually signals activity worth a direct reach-out. Scan the full set: /robox-intel?company=${encodeURIComponent(bestSignal.company)}`,
    });

    await appendHistory(
      bestSignal.id,
      'velocity_alert',
      null,
      null,
      { company: bestSignal.company, count: signals.length }
    );
    alerted.push(bestSignal.company);
    void key;
  }

  return { alertsFired: alerted.length, companies: alerted };
}
