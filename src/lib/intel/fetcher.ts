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
  // Simple XML parse for arxiv entries
  const entries: FetchedItem[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim().replace(/\s+/g, ' ') || 'Untitled';
    const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim().replace(/\s+/g, ' ') || '';
    const url = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || source.url;
    const published = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim() || null;
    entries.push({
      title,
      summary: summary.slice(0, 500),
      url,
      published_at: published,
      raw_content: summary,
      content_hash: generateContentHash(title, summary),
    });
  }
  return entries.slice(0, 20);
}

async function fetchHackerNews(source: IntelSource): Promise<FetchedItem[]> {
  const res = await fetch(source.url, {
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  return (data.hits || []).slice(0, 20).map((hit: { title?: string; url?: string; story_text?: string; created_at?: string; objectID?: string }) => {
    const title = hit.title || 'Untitled';
    const url = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
    const summary = hit.story_text || '';
    return {
      title,
      summary: summary.slice(0, 500),
      url,
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
    // Check for existing hash (dedup layer 1)
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
      // Unique constraint violation = duplicate
      if (error.code === '23505') {
        dup_count++;
      }
      continue;
    }
    new_count++;
  }

  // Update source last_fetched_at
  await db
    .from('intel_sources')
    .update({ last_fetched_at: new Date().toISOString(), error_count: 0 })
    .eq('id', source.id);

  return { new_count, dup_count };
}
