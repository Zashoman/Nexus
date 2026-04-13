// ============================================================
// Slack Draft Store — persist draft context for thread feedback
// ============================================================

import { getServiceSupabase } from './supabase';

export interface SlackDraftContext {
  slack_channel: string;
  slack_message_ts: string;
  email_id?: string;
  sender_name: string;
  sender_email: string;
  subject: string;
  reply_text: string;
  thread_html: string;
  campaign_name: string;
  account_email: string;
  current_draft: string;
}

/** Save a draft posted to Slack so we can regenerate it later */
export async function saveSlackDraft(ctx: SlackDraftContext) {
  try {
    const supabase = getServiceSupabase();
    const { error } = await supabase.from('slack_drafts').upsert({
      slack_channel: ctx.slack_channel,
      slack_message_ts: ctx.slack_message_ts,
      email_id: ctx.email_id,
      sender_name: ctx.sender_name,
      sender_email: ctx.sender_email,
      subject: ctx.subject,
      reply_text: ctx.reply_text,
      thread_html: ctx.thread_html,
      campaign_name: ctx.campaign_name,
      account_email: ctx.account_email,
      current_draft: ctx.current_draft,
      original_draft: ctx.current_draft,
      status: 'pending',
    });

    if (error) {
      console.error('Failed to save slack draft:', error.message);
    }
  } catch (err) {
    console.error('Failed to save slack draft:', err);
  }
}

/** Look up a draft by Slack channel + message timestamp.
 *  Tries exact match first, then falls back to ts-only match
 *  to handle channel name vs ID mismatch from older records. */
export async function getSlackDraft(channel: string, ts: string): Promise<SlackDraftContext & { id: string; revision_count: number; original_draft: string } | null> {
  try {
    const supabase = getServiceSupabase();

    // Try exact match first
    const { data } = await supabase
      .from('slack_drafts')
      .select('*')
      .eq('slack_channel', channel)
      .eq('slack_message_ts', ts)
      .maybeSingle();

    if (data) return data;

    // Fall back: match only by ts (handles channel name vs ID mismatch)
    const { data: fallback } = await supabase
      .from('slack_drafts')
      .select('*')
      .eq('slack_message_ts', ts)
      .maybeSingle();

    return fallback || null;
  } catch (err) {
    console.error('Failed to lookup slack draft:', err);
    return null;
  }
}

/** Update the draft after a revision — uses simple increment, no RPC */
export async function updateSlackDraft(channel: string, ts: string, newDraft: string) {
  try {
    const supabase = getServiceSupabase();

    // First get the current draft to get revision_count
    const current = await getSlackDraft(channel, ts);
    const newCount = (current?.revision_count || 0) + 1;

    // Update with the new draft and incremented count
    await supabase
      .from('slack_drafts')
      .update({
        current_draft: newDraft,
        revision_count: newCount,
        updated_at: new Date().toISOString(),
      })
      .eq('slack_message_ts', ts);
  } catch (err) {
    console.error('Failed to update slack draft:', err);
  }
}

/** Update draft status (approved, skipped, etc.) */
export async function updateDraftStatus(channel: string, ts: string, status: 'pending' | 'approved' | 'skipped' | 'snoozed' | 'sent') {
  try {
    const supabase = getServiceSupabase();
    await supabase
      .from('slack_drafts')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('slack_message_ts', ts);
  } catch (err) {
    console.error('Failed to update draft status:', err);
  }
}
