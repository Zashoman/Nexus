import Parser from 'rss-parser';
import { getServiceSupabase } from '@/lib/supabase';
import type { Signal } from '@/types/robox-intel';

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'RoboX-Intel/1.0' },
});

/**
 * Extract the most distinctive 3 words from a title for searching.
 * Strips common stop words and punctuation.
 */
function extractKeyTerms(title: string, max = 3): string {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'for', 'to', 'of', 'in',
    'on', 'at', 'by', 'with', 'from', 'as', 'is', 'was', 'are',
    'announces', 'announced', 'launches', 'launched', 'raises',
    'raised', 'today', 'new', 'has', 'have', 'its', 'their',
  ]);
  const words = title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));
  return words.slice(0, max).join(' ');
}

/**
 * Search Google News RSS for a query and return the number of results.
 */
async function googleNewsSearchCount(query: string): Promise<number> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&when=1d`;
    const feed = await parser.parseURL(url);
    return (feed.items || []).length;
  } catch (err) {
    console.error('[zero-coverage] Google News search failed:', err);
    // On error, don't mark as zero-coverage (safe default)
    return -1;
  }
}

/**
 * Check whether a press release got any media pickup.
 * Applies a 4h window: signals older than 4h that got no pickup get
 * 'zero-coverage' tag and boost to high relevance.
 */
export async function checkZeroCoverage(signal: Signal): Promise<boolean> {
  const createdAt = new Date(signal.created_at).getTime();
  const ageHours = (Date.now() - createdAt) / (1000 * 60 * 60);

  // Only check signals that have aged 4+ hours
  if (ageHours < 4) return false;

  // Skip if already tagged
  if (signal.tags?.includes('zero-coverage')) return false;

  const keyTerms = extractKeyTerms(signal.title);
  const query = `${signal.company} ${keyTerms}`.trim();
  const count = await googleNewsSearchCount(query);

  // -1 means search failed; skip rather than false-positive
  if (count < 0) return false;
  if (count > 0) return false;

  return true;
}

/**
 * Apply the zero-coverage boost to a signal.
 */
export async function applyZeroCoverageBoost(signal: Signal): Promise<void> {
  const supabase = getServiceSupabase();
  const newTags = Array.from(new Set([...(signal.tags || []), 'zero-coverage']));
  const boostedAction =
    'ZERO MEDIA COVERAGE — your outreach lands in an empty inbox. ' +
    signal.suggested_action;

  await supabase
    .from('robox_signals')
    .update({
      tags: newTags,
      relevance: 'high',
      suggested_action: boostedAction,
      updated_at: new Date().toISOString(),
    })
    .eq('id', signal.id);
}

/**
 * Run zero-coverage detection across all eligible press release signals.
 * - Only press_release signals
 * - Only created 4-72 hours ago (avoid re-checking old signals)
 * - Skip already-tagged signals
 */
export async function runZeroCoverageSweep(): Promise<{
  checked: number;
  boosted: number;
}> {
  const supabase = getServiceSupabase();

  const now = Date.now();
  const fourHoursAgo = new Date(now - 4 * 60 * 60 * 1000).toISOString();
  const seventyTwoHoursAgo = new Date(now - 72 * 60 * 60 * 1000).toISOString();

  const { data: signals } = await supabase
    .from('robox_signals')
    .select('*')
    .eq('type', 'press_release')
    .lte('created_at', fourHoursAgo)
    .gte('created_at', seventyTwoHoursAgo)
    .limit(50);

  const list = (signals || []) as Signal[];
  let boosted = 0;

  for (const signal of list) {
    if (signal.tags?.includes('zero-coverage')) continue;
    const isZeroCoverage = await checkZeroCoverage(signal);
    if (isZeroCoverage) {
      await applyZeroCoverageBoost(signal);
      boosted++;
    }
  }

  return { checked: list.length, boosted };
}
