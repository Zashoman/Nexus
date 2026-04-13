// ============================================================
// Relationship Memory — tracks all interactions per contact
// ============================================================

import { getServiceSupabase } from './supabase';

interface Interaction {
  type: 'email_sent' | 'reply_received' | 'draft_approved' | 'reminder_created';
  campaign_name?: string;
  persona_name?: string;
  summary: string;
  date: string;
}

/** Record an interaction with a contact */
export async function recordInteraction(params: {
  contact_email: string;
  contact_name?: string;
  contact_type?: string;
  interaction: Interaction;
  campaign_id?: string;
  persona_id?: string;
}) {
  try {
    const supabase = getServiceSupabase();
    const { data: existing } = await supabase
      .from('relationship_memory')
      .select('id, interactions')
      .eq('contact_email', params.contact_email)
      .maybeSingle();

    if (existing) {
      const interactions = Array.isArray(existing.interactions) ? existing.interactions : [];
      interactions.push(params.interaction);

      await supabase.from('relationship_memory').update({
        interactions,
        contact_name: params.contact_name || undefined,
        last_contact_date: new Date().toISOString(),
        last_campaign_id: params.campaign_id,
        last_persona_id: params.persona_id,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await supabase.from('relationship_memory').insert({
        contact_email: params.contact_email,
        contact_name: params.contact_name,
        contact_type: params.contact_type || 'prospect',
        interactions: [params.interaction],
        last_contact_date: new Date().toISOString(),
        last_campaign_id: params.campaign_id,
        last_persona_id: params.persona_id,
      });
    }
  } catch (err) {
    console.error('Failed to record interaction:', err);
  }
}

/** Get relationship context for a contact (for draft generation) */
export async function getRelationshipContext(contactEmail: string): Promise<string | null> {
  try {
    if (!contactEmail) return null;
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from('relationship_memory')
      .select('*')
      .eq('contact_email', contactEmail)
      .maybeSingle();

    if (!data) return null;

    const interactions = Array.isArray(data.interactions) ? data.interactions : [];
    if (interactions.length === 0) return null;

    const recent = interactions.slice(-5);
    const preferences = data.preferences && Object.keys(data.preferences).length > 0
      ? `Preferences: ${JSON.stringify(data.preferences)}`
      : '';
    const constraints = data.constraints && Object.keys(data.constraints).length > 0
      ? `Constraints: ${JSON.stringify(data.constraints)}`
      : '';

    return `RELATIONSHIP HISTORY with ${data.contact_name || contactEmail}:
${recent.map((i: Interaction) => `- ${i.date}: ${i.type} — ${i.summary}`).join('\n')}
${preferences}
${constraints}
Last contact: ${data.last_contact_date || 'unknown'}`;
  } catch {
    return null;
  }
}

/** Check for cross-campaign conflicts */
export async function checkCrossCampaignConflict(contactEmail: string, currentCampaignId?: string): Promise<string | null> {
  try {
    if (!contactEmail) return null;
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from('relationship_memory')
      .select('last_campaign_id, last_persona_id, last_contact_date')
      .eq('contact_email', contactEmail)
      .maybeSingle();

    if (!data || !data.last_campaign_id) return null;
    if (data.last_campaign_id === currentCampaignId) return null;

    const daysSince = data.last_contact_date
      ? Math.floor((Date.now() - new Date(data.last_contact_date).getTime()) / 86400000)
      : null;

    if (daysSince !== null && daysSince < 30) {
      return `WARNING: This contact was reached ${daysSince} days ago by a different campaign. Review before sending.`;
    }

    return null;
  } catch {
    return null;
  }
}
