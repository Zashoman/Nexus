// ============================================================
// Prospect Exclusion — cross-reference against DNC + contacts
// ============================================================

import { getServiceSupabase } from './supabase';

/** Check if an email is on the do-not-contact list */
export async function isExcluded(email: string): Promise<boolean> {
  if (!email) return false;
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from('do_not_contact')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

/** Batch check emails against DNC list and return excluded set */
export async function getExcludedEmails(emails: string[]): Promise<Set<string>> {
  if (emails.length === 0) return new Set();
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from('do_not_contact')
      .select('email')
      .in('email', emails.map((e) => e.toLowerCase()));

    return new Set((data || []).map((d) => d.email.toLowerCase()));
  } catch {
    return new Set();
  }
}

/** Create follow-up cadence reminders for a new prospect */
export async function createFollowUpCadence(params: {
  contact_name: string;
  contact_email: string;
  company_name?: string;
  campaign_id?: string;
}) {
  try {
    const supabase = getServiceSupabase();
    const now = Date.now();
    const cadenceSteps = [
      { days: 3, step: 'warm_3d', note: 'First follow-up (3 days)' },
      { days: 7, step: 'warm_7d', note: 'Second follow-up (1 week)' },
      { days: 14, step: 'warm_14d', note: 'Third follow-up (2 weeks)' },
      { days: 30, step: 'monthly', note: 'Monthly check-in' },
      { days: 60, step: 'close_out', note: 'Close out if no response (60 days silence)' },
    ];

    const reminders = cadenceSteps.map((step) => ({
      type: 'cadence' as const,
      status: 'upcoming' as const,
      contact_name: params.contact_name,
      contact_email: params.contact_email,
      company_or_publication: params.company_name,
      campaign_id: params.campaign_id,
      due_date: new Date(now + step.days * 86400000).toISOString().split('T')[0],
      original_due_date: new Date(now + step.days * 86400000).toISOString().split('T')[0],
      cadence_step: step.step,
      manual_note: step.note,
      suggested_action: step.step === 'close_out'
        ? 'No response after 60 days. Close out and archive.'
        : `Follow up with ${params.contact_name}. Reference original conversation.`,
    }));

    await supabase.from('reminders').insert(reminders);
  } catch (err) {
    console.error('Failed to create follow-up cadence:', err);
  }
}
