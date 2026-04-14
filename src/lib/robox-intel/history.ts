import { getServiceSupabase } from '@/lib/supabase';

export type HistoryEvent =
  | 'created'
  | 'status_change'
  | 'relevance_change'
  | 'note_added'
  | 'note_updated'
  | 'snoozed'
  | 'unsnoozed'
  | 'auto_archived'
  | 'zero_coverage_boost'
  | 'velocity_alert';

/**
 * Append a history entry. Fire-and-forget; failures are logged but
 * don't throw — history is ancillary, we never want to fail a signal
 * update because the history insert failed.
 */
export async function appendHistory(
  signalId: number,
  event: HistoryEvent,
  fromValue: string | null = null,
  toValue: string | null = null,
  metadata: Record<string, unknown> | null = null
): Promise<void> {
  try {
    const supabase = getServiceSupabase();
    await supabase.from('robox_signal_history').insert({
      signal_id: signalId,
      event_type: event,
      from_value: fromValue,
      to_value: toValue,
      metadata,
    });
  } catch (err) {
    console.error('[history] append failed:', err);
  }
}
