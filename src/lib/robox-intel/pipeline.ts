import { getServiceSupabase } from '@/lib/supabase';
import { generateDedupHash } from './dedup';
import { scoreRelevance } from './scoring';
import { generateSummary, generateAction } from './templates';
import { runAllFetchers, SOURCE_TYPE_MAP, FETCHERS } from './fetchers';
import { enhanceSignal, isLLMEnabled } from './llm';
import { postSignalToSlack, isSlackEnabled } from './slack';
import { appendHistory } from './history';
import type { SignalType, Company, Signal } from '@/types/robox-intel';

interface PipelineResult {
  totalFetched: number;
  newSignals: number;
  duplicatesSkipped: number;
  llmEnhanced: number;
  slackPosted: number;
  errors: string[];
}

/**
 * Check if a company name matches a known competitor.
 */
function checkCompetitor(company: string, companies: Company[]): boolean {
  const lower = company.toLowerCase();
  return companies.some(
    (c) => c.tier === 'competitor' && c.name.toLowerCase() === lower
  );
}

/**
 * Run the full ingestion pipeline.
 * Optionally filter to specific source keys.
 */
export async function runPipeline(sourceKeys?: string[]): Promise<PipelineResult> {
  const supabase = getServiceSupabase();
  const errors: string[] = [];
  let totalFetched = 0;
  let newSignals = 0;
  let duplicatesSkipped = 0;
  let llmEnhanced = 0;
  let slackPosted = 0;
  const llmEnabled = isLLMEnabled();
  const slackEnabled = isSlackEnabled();

  // Load tracked companies for relevance scoring
  const { data: companies } = await supabase
    .from('robox_companies')
    .select('*');
  const trackedCompanies: Company[] = companies || [];

  // Fetch from all sources
  const results = await runAllFetchers(sourceKeys);
  totalFetched = results.length;

  // Process each result
  for (const result of results) {
    try {
      // Generate dedup hash
      const dedupHash = await generateDedupHash(result.url, result.title);

      // Check for duplicate
      const { data: existing } = await supabase
        .from('robox_signals')
        .select('id')
        .eq('dedup_hash', dedupHash)
        .limit(1);

      if (existing && existing.length > 0) {
        duplicatesSkipped++;
        continue;
      }

      // Determine signal type
      let signalType = (SOURCE_TYPE_MAP[result.sourceKey] || 'news') as SignalType;

      // Check if company is a known competitor
      if (checkCompetitor(result.company, trackedCompanies)) {
        signalType = 'competitor';
      }

      // Detect funding signals from PR wires
      if (
        signalType === 'press_release' &&
        /\b(raises?|raised|funding|series [a-c]|seed round|investment)\b/i.test(
          result.title + ' ' + result.rawContent
        )
      ) {
        signalType = 'funding';
      }

      // Get source display name and current signal count
      const { data: sourceRow } = await supabase
        .from('robox_sources')
        .select('name, signal_count')
        .eq('source_key', result.sourceKey)
        .maybeSingle();
      const sourceName = sourceRow?.name || result.sourceKey;
      const currentCount = sourceRow?.signal_count || 0;

      // Score relevance
      const relevance = scoreRelevance(
        signalType,
        result.title,
        '',
        null,
        result.company,
        result.rawContent,
        trackedCompanies
      );

      // Generate summary and action using templates (baseline)
      const templateInput = {
        type: signalType,
        title: result.title,
        company: result.company,
        source: sourceName,
        date: result.date,
        rawContent: result.rawContent,
      };
      let summary = generateSummary(templateInput);
      let suggestedAction = generateAction(templateInput);

      // Enhance with LLM for high-relevance signals only (cost control).
      // Falls back to templates on any failure.
      if (llmEnabled && relevance === 'high') {
        const enhanced = await enhanceSignal(templateInput);
        if (enhanced) {
          summary = enhanced.summary;
          suggestedAction = enhanced.suggestedAction;
          llmEnhanced++;
        }
      }

      // Insert signal
      const { data: inserted, error: insertError } = await supabase
        .from('robox_signals')
        .insert({
          type: signalType,
          title: result.title,
          company: result.company,
          source: sourceName,
          source_key: result.sourceKey,
          url: result.url,
          date: result.date,
          summary,
          suggested_action: suggestedAction,
          relevance,
          status: 'new',
          tags: [],
          raw_content: result.rawContent,
          dedup_hash: dedupHash,
        })
        .select()
        .single();

      if (insertError) {
        // Could be a race condition duplicate
        if (insertError.code === '23505') {
          duplicatesSkipped++;
        } else {
          errors.push(`Insert error for "${result.title}": ${insertError.message}`);
        }
        continue;
      }

      newSignals++;

      // Record creation in history
      if (inserted) {
        await appendHistory(inserted.id, 'created', null, 'new', {
          source_key: result.sourceKey,
          source: sourceName,
          initial_relevance: relevance,
        });
      }

      // Post Tier 1 (high-relevance) signals to Slack
      if (slackEnabled && inserted && relevance === 'high') {
        const posted = await postSignalToSlack(inserted as Signal);
        if (posted) slackPosted++;
      }

      // Update source signal count
      await supabase
        .from('robox_sources')
        .update({
          signal_count: currentCount + 1,
          last_fetched: new Date().toISOString(),
        })
        .eq('source_key', result.sourceKey);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Processing error for "${result.title}": ${msg}`);
    }
  }

  // Update last_fetched for all fetched sources
  const fetchedKeys = sourceKeys || Object.keys(FETCHERS);
  for (const key of fetchedKeys) {
    await supabase
      .from('robox_sources')
      .update({ last_fetched: new Date().toISOString() })
      .eq('source_key', key);
  }

  return {
    totalFetched,
    newSignals,
    duplicatesSkipped,
    llmEnhanced,
    slackPosted,
    errors,
  };
}
