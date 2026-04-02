import RSSParser from 'rss-parser';
import crypto from 'crypto';
import { getServiceSupabase } from '@/lib/supabase';
import type { IntelSource } from '@/types/intel';

const parser = new RSSParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'IntelBriefingBot/1.0',
  },
});

export function generateContentHash(title: string, content?: string): string {
  const normalized =
    (title || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim() +
    '|' +
    (content || '').slice(0, 200).toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

interface FetchedItem {
  title: string;
  summary: string;
  url: string;
  published_at: string | null;
  raw_content: string;
  content_hash: string;
}

// Papers from these labs ALWAYS pass (if title doesn't match skip patterns)
const ARXIV_TRUSTED_LABS = [
  'openai', 'anthropic', 'deepmind', 'google deepmind', 'google research',
  'google brain', 'meta fair', 'meta ai research', 'microsoft research',
  'nvidia research', 'apple machine learning',
];

// Title patterns that ALWAYS get skipped — academic noise
const ARXIV_SKIP_PATTERNS = [
  /survey/i, /review of/i, /tutorial/i, /overview of/i,
  /benchmark/i, /dataset/i, /leaderboard/i, /evaluation of/i,
  /mathematical/i, /theoretical/i, /convergence/i, /bounds for/i,
  /stochastic/i, /optimization/i, /variational/i, /bayesian inference/i,
  /graph neural/i, /graph network/i, /knowledge graph/i,
  /time series/i, /forecasting/i, /anomaly detection/i,
  /recommendation/i, /collaborative filtering/i,
  /sentiment/i, /named entity/i, /text classification/i, /text mining/i,
  /speech recognition/i, /speech synthesis/i, /speaker/i,
  /weather/i, /climate/i, /ocean/i, /seismic/i, /geophysic/i,
  /medical image segmentation/i, /lesion/i, /tumor detection/i,
  /point cloud/i, /3d reconstruction/i, /mesh/i, /nerf/i,
  /federated learning/i, /privacy preserving/i, /differential privacy/i,
  /decoder/i, /encoder/i, /autoencoder/i, /recurrent/i,
  /recipe/i, /pipeline/i, /shallow/i, /latent phase/i,
  /hippocam/i, /contextual agent.*personal/i,
  /improved .* via/i, /improving .* using/i, /improving .* with/i,
  /novel approach/i, /new method/i, /efficient method/i,
  /low-resource/i, /cross-lingual/i, /multilingual/i,
  /image classification/i, /object detection/i, /semantic segmentation/i,
  /video understanding/i, /action recognition/i,
  /network pruning/i, /model compression/i,
  /contrastive learning/i, /self-supervised/i, /semi-supervised/i,
  /knowledge distill/i,
  /music generat/i, /art generat/i, /style transfer/i,
];

// Only papers about these HIGH-SIGNAL topics pass (need 2+ matches from different groups)
const ARXIV_SIGNAL_GROUPS = [
  // Group 1: Scale & frontier capability
  ['large language model', 'llm', 'foundation model', 'gpt-4', 'gpt-5', 'claude', 'gemini', 'llama'],
  // Group 2: Reasoning & intelligence
  ['reasoning', 'chain of thought', 'planning', 'world model', 'system 2'],
  // Group 3: Safety & alignment
  ['ai safety', 'alignment', 'constitutional ai', 'rlhf', 'red team', 'jailbreak', 'deception'],
  // Group 4: Robotics breakthroughs
  ['humanoid', 'dexterous manipulation', 'legged locomotion', 'sim to real', 'whole body control'],
  // Group 5: Agents & autonomy
  ['autonomous agent', 'tool use', 'code generation', 'web agent', 'computer use'],
  // Group 6: Infrastructure & scaling
  ['scaling law', 'mixture of experts', 'training at scale', 'inference optimization'],
  // Group 7: Bio & health breakthroughs
  ['drug discovery', 'protein structure', 'alphafold', 'clinical trial', 'fda'],
];

function isArxivPaperRelevant(title: string, summary: string): boolean {
  const text = `${title} ${summary}`.toLowerCase();

  // Always skip papers matching noise patterns
  for (const pattern of ARXIV_SKIP_PATTERNS) {
    if (pattern.test(title)) return false;
  }

  // Always include papers from trusted labs (checked in abstract/affiliations)
  for (const lab of ARXIV_TRUSTED_LABS) {
    if (text.includes(lab)) return true;
  }

  // For everything else: must match keywords from 2+ different signal groups
  let groupsMatched = 0;
  for (const group of ARXIV_SIGNAL_GROUPS) {
    const hasMatch = group.some((keyword: string) => text.includes(keyword));
    if (hasMatch) groupsMatched++;
  }

  return groupsMatched >= 2;
}

async function fetchRSS(source: IntelSource): Promise<FetchedItem[]> {
  const feed = await parser.parseURL(source.url);
  return (feed.items || []).slice(0, 30).map((item) => {
    const title = item.title || 'Untitled';
    const summary = item.contentSnippet || item.content || '';
    const url = item.link || source.url;
    return {
      title,
      summary: summary.slice(0, 500),
      url,
      published_at: item.isoDate || item.pubDate || null,
      raw_content: item.content || item.contentSnippet || '',
      content_hash: generateContentHash(title, summary),
    };
  });
}

async function fetchArxiv(source: IntelSource): Promise<FetchedItem[]> {
  const res = await fetch(source.url, {
    headers: { 'User-Agent': 'IntelBriefingBot/1.0' },
    signal: AbortSignal.timeout(15000),
  });
  const xml = await res.text();
  const entries: FetchedItem[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim().replace(/\s+/g, ' ') || 'Untitled';
    const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim().replace(/\s+/g, ' ') || '';
    const url = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || source.url;
    const published = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim() || null;

    if (!isArxivPaperRelevant(title, summary)) continue;

    entries.push({
      title,
      summary: summary.slice(0, 500),
      url,
      published_at: published,
      raw_content: summary,
      content_hash: generateContentHash(title, summary),
    });
  }
  // Only take top 5 — very selective
  return entries.slice(0, 5);
}

async function fetchHackerNews(source: IntelSource): Promise<FetchedItem[]> {
  const oneDayAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
  const url = `${source.url}&numericFilters=created_at_i>${oneDayAgo}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  return (data.hits || []).slice(0, 20).map((hit: { title?: string; url?: string; story_text?: string; created_at?: string; objectID?: string }) => {
    const title = hit.title || 'Untitled';
    const hitUrl = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
    const summary = hit.story_text || '';
    return {
      title,
      summary: summary.slice(0, 500),
      url: hitUrl,
      published_at: hit.created_at || null,
      raw_content: summary,
      content_hash: generateContentHash(title, summary),
    };
  });
}

export async function fetchSource(source: IntelSource): Promise<{
  items: FetchedItem[];
  error?: string;
}> {
  try {
    let items: FetchedItem[];
    if (source.source_type === 'api' && source.url.includes('arxiv.org')) {
      items = await fetchArxiv(source);
    } else if (source.source_type === 'api' && source.url.includes('hn.algolia.com')) {
      items = await fetchHackerNews(source);
    } else {
      items = await fetchRSS(source);
    }
    return { items };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown fetch error';
    return { items: [], error: message };
  }
}

export async function ingestItems(
  source: IntelSource,
  items: FetchedItem[]
): Promise<{ new_count: number; dup_count: number }> {
  const db = getServiceSupabase();
  let new_count = 0;
  let dup_count = 0;

  for (const item of items) {
    const { data: existing } = await db
      .from('intel_items')
      .select('id')
      .eq('content_hash', item.content_hash)
      .maybeSingle();

    if (existing) {
      dup_count++;
      continue;
    }

    const { error } = await db.from('intel_items').insert({
      content_hash: item.content_hash,
      title: item.title,
      summary: item.summary,
      original_url: item.url,
      source_id: source.id,
      source_name: source.name,
      source_tier: source.tier,
      category: source.category,
      published_at: item.published_at,
      raw_content: item.raw_content,
    });

    if (error) {
      if (error.code === '23505') {
        dup_count++;
      }
      continue;
    }
    new_count++;
  }

  await db
    .from('intel_sources')
    .update({ last_fetched_at: new Date().toISOString(), error_count: 0 })
    .eq('id', source.id);

  return { new_count, dup_count };
}
