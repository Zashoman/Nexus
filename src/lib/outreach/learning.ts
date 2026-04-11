// ============================================================
// Feedback Learning Loop
// ============================================================
// Stores team revisions and queries them when generating new
// drafts so the agent learns from past corrections.
// ============================================================

import { getServiceSupabase } from './supabase';

export interface RevisionLog {
  slack_draft_id: string | null;
  revision_number: number;
  original_draft: string;
  revised_draft: string;
  feedback_text: string;
  persona_name?: string;
  campaign_name?: string;
  account_email?: string;
  sender_email?: string;
  slack_user_id?: string;
}

export interface PastRevision {
  feedback_text: string;
  persona_name: string | null;
  campaign_name: string | null;
  created_at: string;
}

/** Log a revision to the learning store */
export async function logRevision(rev: RevisionLog) {
  try {
    const supabase = getServiceSupabase();
    await supabase.from('draft_revisions').insert({
      slack_draft_id: rev.slack_draft_id,
      revision_number: rev.revision_number,
      original_draft: rev.original_draft,
      revised_draft: rev.revised_draft,
      feedback_text: rev.feedback_text,
      persona_name: rev.persona_name,
      campaign_name: rev.campaign_name,
      account_email: rev.account_email,
      sender_email: rev.sender_email,
      slack_user_id: rev.slack_user_id,
    });
  } catch (err) {
    console.error('Failed to log revision:', err);
  }
}

/**
 * Get past revisions for context. Pulls feedback from the same persona
 * and the same campaign so the new draft can avoid making the same mistakes.
 */
export async function getRelevantRevisions(params: {
  persona_name?: string;
  campaign_name?: string;
  account_email?: string;
  limit?: number;
}): Promise<PastRevision[]> {
  try {
    const supabase = getServiceSupabase();
    const limit = params.limit || 10;

    // Build OR query: match same persona OR same campaign
    const conditions: string[] = [];
    if (params.persona_name) conditions.push(`persona_name.eq.${params.persona_name}`);
    if (params.campaign_name) conditions.push(`campaign_name.eq.${params.campaign_name}`);
    if (params.account_email) conditions.push(`account_email.eq.${params.account_email}`);

    if (conditions.length === 0) return [];

    const { data } = await supabase
      .from('draft_revisions')
      .select('feedback_text, persona_name, campaign_name, created_at')
      .or(conditions.join(','))
      .order('created_at', { ascending: false })
      .limit(limit);

    return (data || []) as PastRevision[];
  } catch (err) {
    console.error('Failed to fetch revisions:', err);
    return [];
  }
}

/**
 * Format past revisions as a learnings block for inclusion in the draft prompt.
 * Returns null if there are no relevant lessons.
 */
export function formatLearnings(revisions: PastRevision[]): string | null {
  if (revisions.length === 0) return null;

  const lines = revisions
    .slice(0, 8)
    .map((r, i) => `${i + 1}. ${r.feedback_text}`)
    .join('\n');

  return `PAST FEEDBACK FROM THE TEAM (apply these lessons):
${lines}`;
}

/** Get stats for the learning UI page */
export async function getLearningStats() {
  try {
    const supabase = getServiceSupabase();

    const { count: totalRevisions } = await supabase
      .from('draft_revisions')
      .select('*', { count: 'exact', head: true });

    const { count: lastWeekRevisions } = await supabase
      .from('draft_revisions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const { count: lastDayRevisions } = await supabase
      .from('draft_revisions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { data: recent } = await supabase
      .from('draft_revisions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    return {
      total_revisions: totalRevisions || 0,
      last_week: lastWeekRevisions || 0,
      last_24h: lastDayRevisions || 0,
      recent: recent || [],
    };
  } catch (err) {
    console.error('Failed to get learning stats:', err);
    return { total_revisions: 0, last_week: 0, last_24h: 0, recent: [] };
  }
}
