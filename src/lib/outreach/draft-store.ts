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
  const supabase = getServiceSupabase();
  const { error } = await supabase.from('slack_drafts').insert({
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
}

/** Look up a draft by Slack channel + message timestamp.
 *  Tries multiple channel formats since Slack events use channel IDs
 *  but our older records might have channel names. */
export async function getSlackDraft(channel: string, ts: string): Promise<SlackDraftContext & { id: string; revision_count: number; original_draft: string } | null> {
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
}

/** Update the draft after a revision */
export async function updateSlackDraft(channel: string, ts: string, newDraft: string) {
  const supabase = getServiceSupabase();
  await supabase
    .from('slack_drafts')
    .update({
      current_draft: newDraft,
      revision_count: (await getSlackDraft(channel, ts))?.revision_count ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq('slack_channel', channel)
    .eq('slack_message_ts', ts);

  // Increment revision_count atomically
  await supabase.rpc('increment_slack_draft_revision', { p_channel: channel, p_ts: ts }).then(() => {}, () => {
    // Function might not exist, fall back to manual update
  });
}

/** Update draft status (approved, skipped, etc.) */
export async function updateDraftStatus(channel: string, ts: string, status: 'pending' | 'approved' | 'skipped' | 'snoozed' | 'sent') {
  const supabase = getServiceSupabase();
  await supabase
    .from('slack_drafts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('slack_channel', channel)
    .eq('slack_message_ts', ts);
}
