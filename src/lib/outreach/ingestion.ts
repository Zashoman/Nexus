// ============================================================
// Historical Email Ingestion
// ============================================================
// Pulls existing emails from Instantly, classifies outcomes,
// extracts patterns into the email_patterns table for future
// drafts to learn from.
// ============================================================

import { listUniboxEmails, listCampaigns } from './instantly';
import { getServiceSupabase } from './supabase';
import Anthropic from '@anthropic-ai/sdk';

const BLUE_TREE_DOMAINS = [
  'bluetree.ai', 'bluetreesaas.org', 'bluetreeailinks.org',
  'bluetreegrow.org', 'bluetreedigitalpr.com', 'bluetreeaidigital.org',
  'bluetreeteams.org', 'bluetreedigitalpr.org', 'bluetreeaidigital.com',
];

function isBlueTreeEmail(email: string): boolean {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return BLUE_TREE_DOMAINS.some((d) => domain === d);
}

function stripHtml(html: string): string {
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface EmailPattern {
  pattern_type: 'subject_line' | 'opener' | 'follow_up';
  campaign_type: string;
  pattern_data: Record<string, unknown>;
  vertical?: string;
  success_rate?: number;
  sample_size?: number;
}

/** Create a new ingestion job */
export async function createIngestionJob(): Promise<string> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('ingestion_jobs')
    .insert({
      job_type: 'historical_ingestion',
      status: 'pending',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

/** Update ingestion job status */
export async function updateIngestionJob(jobId: string, updates: Record<string, unknown>) {
  const supabase = getServiceSupabase();
  await supabase
    .from('ingestion_jobs')
    .update(updates)
    .eq('id', jobId);
}

/** Get the latest ingestion job */
export async function getLatestIngestionJob() {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from('ingestion_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

/** Get all extracted patterns */
export async function getExtractedPatterns() {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from('email_patterns')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}

/**
 * Run the ingestion job.
 * Pulls recent emails from Instantly, identifies outbound emails sent
 * by Blue Tree, extracts patterns from successful threads.
 */
export async function runIngestion(jobId: string, limit = 100) {
  const supabase = getServiceSupabase();

  try {
    await updateIngestionJob(jobId, { status: 'running' });

    // 1. Get campaign list for context
    const campaigns = await listCampaigns();
    const campaignMap: Record<string, string> = {};
    campaigns.forEach((c) => { campaignMap[c.id] = c.name; });

    // 2. Pull recent emails (we only have read access to recent ones)
    const allEmails = await listUniboxEmails({ limit });

    let fetched = 0;
    let classified = 0;
    let patternsExtracted = 0;
    const campaignsProcessed = new Set<string>();

    // 3. Group emails by thread_id so we can analyze conversations
    const threadMap = new Map<string, Array<Record<string, unknown>>>();
    for (const email of allEmails) {
      const raw = email as unknown as Record<string, unknown>;
      const threadId = String(raw.thread_id || raw.id);
      if (!threadMap.has(threadId)) threadMap.set(threadId, []);
      threadMap.get(threadId)!.push(raw);
      fetched++;
    }

    await updateIngestionJob(jobId, { emails_fetched: fetched });

    // 4. Analyze each thread for patterns
    const client = new Anthropic();
    const subjectLines = new Map<string, { count: number; gotReply: boolean; campaign: string }>();
    const openers = new Map<string, { count: number; gotReply: boolean; campaign: string }>();

    for (const [, messages] of threadMap) {
      // Sort messages chronologically
      messages.sort((a, b) => {
        const aTs = String(a.timestamp_email || a.timestamp_created || '');
        const bTs = String(b.timestamp_email || b.timestamp_created || '');
        return new Date(aTs).getTime() - new Date(bTs).getTime();
      });

      // Find the first outbound (Blue Tree) message
      const firstOutbound = messages.find((m) => {
        const from = String(m.from_address_email || '').toLowerCase();
        return isBlueTreeEmail(from);
      });

      if (!firstOutbound) continue;

      // Check if any reply came back from a non-Blue-Tree address
      const gotReply = messages.some((m) => {
        const from = String(m.from_address_email || '').toLowerCase();
        return from && !isBlueTreeEmail(from);
      });

      const campaignId = String(firstOutbound.campaign_id || '');
      const campaignName = campaignMap[campaignId] || 'Unknown';
      campaignsProcessed.add(campaignName);

      // Extract subject line
      const subject = String(firstOutbound.subject || '').trim();
      if (subject) {
        const cleanSubject = subject.replace(/^Re:\s*/i, '').substring(0, 150);
        const existing = subjectLines.get(cleanSubject) || { count: 0, gotReply: false, campaign: campaignName };
        existing.count++;
        if (gotReply) existing.gotReply = true;
        subjectLines.set(cleanSubject, existing);
      }

      // Extract first 2-3 sentences as opener
      let body = '';
      if (firstOutbound.body && typeof firstOutbound.body === 'object') {
        const b = firstOutbound.body as Record<string, string>;
        body = stripHtml(b.text || b.html || '');
      } else if (typeof firstOutbound.body === 'string') {
        body = stripHtml(firstOutbound.body);
      }

      if (body) {
        const sentences = body.split(/[.!?]\s+/).slice(0, 3).join('. ').substring(0, 300);
        const existing = openers.get(sentences) || { count: 0, gotReply: false, campaign: campaignName };
        existing.count++;
        if (gotReply) existing.gotReply = true;
        openers.set(sentences, existing);
      }

      classified++;
    }

    // 5. Use Claude to extract higher-level patterns from the top performers
    const topSubjects = [...subjectLines.entries()]
      .filter(([, data]) => data.gotReply)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20);

    const topOpeners = [...openers.entries()]
      .filter(([, data]) => data.gotReply)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20);

    let patternInsights = '';
    if (topSubjects.length > 0 || topOpeners.length > 0) {
      try {
        const analysisMessage = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          system: `You are analyzing email outreach patterns for Blue Tree Digital PR. Look at the subject lines and openers that got replies, and extract concrete actionable insights about what's working.`,
          messages: [{
            role: 'user',
            content: `Analyze these Blue Tree subject lines and openers that got replies:

TOP SUBJECT LINES (with reply rates):
${topSubjects.map(([s, d], i) => `${i + 1}. "${s}" (${d.count}x sent, replied)`).join('\n')}

TOP OPENERS:
${topOpeners.map(([o, d], i) => `${i + 1}. "${o.substring(0, 200)}..." (${d.count}x sent, replied)`).join('\n')}

Extract 5-10 specific insights about what's working. Things like:
- Subject line patterns that perform best
- Opener structures that get replies
- Tone patterns
- Length recommendations
- Specific phrases that work

Be concrete and actionable. Format as a numbered list.`,
          }],
        });
        patternInsights = analysisMessage.content[0].type === 'text' ? analysisMessage.content[0].text : '';
      } catch (err) {
        console.error('Pattern analysis failed:', err);
      }
    }

    // 6. Save patterns to database
    const patternsToInsert: EmailPattern[] = [];

    for (const [subject, data] of topSubjects) {
      patternsToInsert.push({
        pattern_type: 'subject_line',
        campaign_type: 'sales',
        pattern_data: {
          text: subject,
          campaign: data.campaign,
          got_reply: data.gotReply,
          send_count: data.count,
        },
        sample_size: data.count,
        success_rate: data.gotReply ? 1.0 : 0.0,
      });
    }

    for (const [opener, data] of topOpeners) {
      patternsToInsert.push({
        pattern_type: 'opener',
        campaign_type: 'sales',
        pattern_data: {
          text: opener,
          campaign: data.campaign,
          got_reply: data.gotReply,
          send_count: data.count,
        },
        sample_size: data.count,
        success_rate: data.gotReply ? 1.0 : 0.0,
      });
    }

    if (patternInsights) {
      patternsToInsert.push({
        pattern_type: 'follow_up',
        campaign_type: 'general',
        pattern_data: {
          text: 'AI-extracted insights from historical performance',
          insights: patternInsights,
        },
      });
    }

    if (patternsToInsert.length > 0) {
      // Clear old patterns first
      await supabase.from('email_patterns').delete().eq('is_active', true);
      // Insert new ones
      await supabase.from('email_patterns').insert(patternsToInsert);
      patternsExtracted = patternsToInsert.length;
    }

    await updateIngestionJob(jobId, {
      status: 'completed',
      emails_fetched: fetched,
      emails_classified: classified,
      patterns_extracted: patternsExtracted,
      campaigns_processed: [...campaignsProcessed],
      completed_at: new Date().toISOString(),
    });

    return {
      ok: true,
      fetched,
      classified,
      patterns_extracted: patternsExtracted,
      campaigns: [...campaignsProcessed],
      insights: patternInsights,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ingestion failed';
    await updateIngestionJob(jobId, {
      status: 'failed',
      error_message: message,
      completed_at: new Date().toISOString(),
    });
    throw err;
  }
}
