import type { FetcherResult } from '@/types/robox-intel';
import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'RoboX-Intel/1.0',
  },
});

// ============================================
// Keyword filters shared across PR wire sources
// ============================================

const ROBOTICS_KEYWORDS = [
  'robotics', 'robot', 'humanoid', 'manipulation',
  'embodied ai', 'physical ai',
];

const BOOST_KEYWORDS = [
  'training data', 'data collection', 'dataset', 'egocentric',
  'demonstration data', 'vla', 'foundation model',
  'series a', 'series b', 'series c', 'funding', 'raised', 'investment',
];

function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

function extractCompanyFromText(text: string): string {
  // Try to extract company name from PR title patterns:
  // "Company Name Announces..." or "Company Name Raises..."
  const patterns = [
    /^([A-Z][A-Za-z0-9\s&.,']+?)\s+(?:Announces?|Raises?|Launches?|Unveils?|Introduces?|Secures?|Closes?|Receives?|Partners?|Expands?)/,
    /^([A-Z][A-Za-z0-9\s&.,']+?)\s*,\s/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const name = match[1].trim();
      if (name.length > 2 && name.length < 100) return name;
    }
  }
  return 'Unknown';
}

// ============================================
// PR Newswire Fetcher
// ============================================
async function fetchPRNewswire(): Promise<FetcherResult[]> {
  const results: FetcherResult[] = [];
  try {
    const feed = await parser.parseURL(
      'https://www.prnewswire.com/rss/technology-latest-news.rss'
    );
    for (const item of feed.items || []) {
      const text = (item.title || '') + ' ' + (item.contentSnippet || '');
      if (!matchesKeywords(text, ROBOTICS_KEYWORDS)) continue;
      results.push({
        title: (item.title || '').slice(0, 300),
        company: extractCompanyFromText(item.title || ''),
        url: item.link || '',
        date: item.isoDate || new Date().toISOString().split('T')[0],
        rawContent: item.contentSnippet || item.content || '',
        sourceKey: 'prnewswire',
      });
    }
  } catch (err) {
    console.error('[prnewswire] Fetch error:', err);
  }
  return results;
}

// ============================================
// Business Wire Fetcher
// ============================================
async function fetchBusinessWire(): Promise<FetcherResult[]> {
  const results: FetcherResult[] = [];
  try {
    const feed = await parser.parseURL(
      'https://feed.businesswire.com/rss/home/?rss=G1QFDERJXkJeEFpRWg=='
    );
    for (const item of feed.items || []) {
      const text = (item.title || '') + ' ' + (item.contentSnippet || '');
      if (!matchesKeywords(text, ROBOTICS_KEYWORDS)) continue;
      results.push({
        title: (item.title || '').slice(0, 300),
        company: extractCompanyFromText(item.title || ''),
        url: item.link || '',
        date: item.isoDate || new Date().toISOString().split('T')[0],
        rawContent: item.contentSnippet || item.content || '',
        sourceKey: 'businesswire',
      });
    }
  } catch (err) {
    console.error('[businesswire] Fetch error:', err);
  }
  return results;
}

// ============================================
// Google News Alerts Fetcher
// ============================================
async function fetchGoogleNews(): Promise<FetcherResult[]> {
  const results: FetcherResult[] = [];
  // Google News RSS search queries for robotics training data topics
  const queries = [
    'robotics+training+data',
    'humanoid+robot+training',
    'robot+manipulation+dataset',
    'physical+AI+data',
    'embodied+AI+training',
    'robot+foundation+model',
  ];

  for (const q of queries) {
    try {
      const feed = await parser.parseURL(
        `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`
      );
      for (const item of (feed.items || []).slice(0, 10)) {
        results.push({
          title: (item.title || '').slice(0, 300),
          company: extractCompanyFromText(item.title || ''),
          url: item.link || '',
          date: item.isoDate || new Date().toISOString().split('T')[0],
          rawContent: item.contentSnippet || item.content || '',
          sourceKey: 'google_news',
        });
      }
    } catch (err) {
      console.error(`[google_news] Fetch error for query "${q}":`, err);
    }
  }
  return results;
}

// ============================================
// arXiv Fetcher
// ============================================
async function fetchArxiv(): Promise<FetcherResult[]> {
  const results: FetcherResult[] = [];
  try {
    const query = encodeURIComponent(
      'cat:cs.RO AND (abs:"training data" OR abs:"egocentric" OR abs:"manipulation dataset" OR abs:"VLA" OR abs:"vision-language-action" OR abs:"embodied AI" OR abs:"demonstration data" OR abs:"sim-to-real" OR abs:"robot learning")'
    );
    const url = `http://export.arxiv.org/api/query?search_query=${query}&sortBy=submittedDate&sortOrder=descending&max_results=30`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'RoboX-Intel/1.0' },
      signal: AbortSignal.timeout(20000),
    });
    const xml = await res.text();

    // Parse Atom XML entries
    const entries = xml.split('<entry>').slice(1);
    for (const entry of entries) {
      const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/);
      const summaryMatch = entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
      const linkMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
      const dateMatch = entry.match(/<published>([\s\S]*?)<\/published>/);
      const authorMatches = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)];

      const title = (titleMatch?.[1] || '').replace(/\s+/g, ' ').trim();
      const abstract = (summaryMatch?.[1] || '').replace(/\s+/g, ' ').trim();
      const authors = authorMatches.map((m) => m[1].trim()).join(', ');

      results.push({
        title: title.slice(0, 300),
        company: authors.split(',')[0]?.trim() || 'Unknown',
        url: linkMatch?.[1]?.trim() || '',
        date: dateMatch?.[1]?.trim().split('T')[0] || new Date().toISOString().split('T')[0],
        rawContent: `Authors: ${authors}\n\nAbstract: ${abstract}`,
        sourceKey: 'arxiv',
      });
    }
  } catch (err) {
    console.error('[arxiv] Fetch error:', err);
  }
  return results;
}

// ============================================
// Crunchbase News Fetcher
// ============================================
async function fetchCrunchbase(): Promise<FetcherResult[]> {
  const results: FetcherResult[] = [];
  try {
    const feed = await parser.parseURL('https://news.crunchbase.com/feed/');
    for (const item of feed.items || []) {
      const text = (item.title || '') + ' ' + (item.contentSnippet || '');
      if (!matchesKeywords(text, ROBOTICS_KEYWORDS)) continue;
      results.push({
        title: (item.title || '').slice(0, 300),
        company: extractCompanyFromText(item.title || ''),
        url: item.link || '',
        date: item.isoDate || new Date().toISOString().split('T')[0],
        rawContent: item.contentSnippet || item.content || '',
        sourceKey: 'crunchbase',
      });
    }
  } catch (err) {
    console.error('[crunchbase] Fetch error:', err);
  }
  return results;
}

// ============================================
// The Robot Report Fetcher
// ============================================
async function fetchRobotReport(): Promise<FetcherResult[]> {
  const results: FetcherResult[] = [];
  try {
    const feed = await parser.parseURL('https://www.therobotreport.com/feed/');
    for (const item of (feed.items || []).slice(0, 20)) {
      results.push({
        title: (item.title || '').slice(0, 300),
        company: extractCompanyFromText(item.title || ''),
        url: item.link || '',
        date: item.isoDate || new Date().toISOString().split('T')[0],
        rawContent: item.contentSnippet || item.content || '',
        sourceKey: 'robot_report',
      });
    }
  } catch (err) {
    console.error('[robot_report] Fetch error:', err);
  }
  return results;
}

// ============================================
// Source-to-Type mapping
// ============================================
export const SOURCE_TYPE_MAP: Record<string, string> = {
  prnewswire: 'press_release',
  businesswire: 'press_release',
  globenewswire: 'press_release',
  accesswire: 'press_release',
  google_news: 'news',
  robot_report: 'news',
  ieee_spectrum: 'news',
  import_ai: 'news',
  arxiv: 'research',
  google_scholar: 'research',
  crunchbase: 'funding',
  huggingface: 'dataset',
  github: 'dataset',
  reddit: 'social',
  twitter_list: 'social',
  linkedin_feed: 'social',
  podcasts: 'quote',
  nsf: 'grant',
  darpa: 'grant',
  conferences: 'conference',
  linkedin_jobs: 'hiring',
};

// ============================================
// Fetcher registry
// ============================================
export const FETCHERS: Record<string, () => Promise<FetcherResult[]>> = {
  prnewswire: fetchPRNewswire,
  businesswire: fetchBusinessWire,
  google_news: fetchGoogleNews,
  arxiv: fetchArxiv,
  crunchbase: fetchCrunchbase,
  robot_report: fetchRobotReport,
};

/**
 * Run all automated fetchers and return combined results.
 */
export async function runAllFetchers(sourceKeys?: string[]): Promise<FetcherResult[]> {
  const keys = sourceKeys || Object.keys(FETCHERS);
  const allResults: FetcherResult[] = [];

  const promises = keys
    .filter((k) => FETCHERS[k])
    .map(async (key) => {
      try {
        const results = await FETCHERS[key]();
        return results;
      } catch (err) {
        console.error(`[${key}] Fetcher failed:`, err);
        return [];
      }
    });

  const results = await Promise.allSettled(promises);
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allResults.push(...result.value);
    }
  }

  return allResults;
}
