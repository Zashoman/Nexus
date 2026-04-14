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

const LEARNING_KEYWORDS = [
  'training', 'data', 'learning', 'foundation model',
  'manipulation', 'humanoid',
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
// GlobeNewsWire Fetcher
// ============================================
async function fetchGlobeNewsWire(): Promise<FetcherResult[]> {
  const results: FetcherResult[] = [];
  try {
    const feed = await parser.parseURL(
      'https://www.globenewswire.com/RssFeed/subjectcode/25-Technology/feedTitle/GlobeNewswire'
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
        sourceKey: 'globenewswire',
      });
    }
  } catch (err) {
    console.error('[globenewswire] Fetch error:', err);
  }
  return results;
}

// ============================================
// Accesswire Fetcher
// ============================================
async function fetchAccesswire(): Promise<FetcherResult[]> {
  const results: FetcherResult[] = [];
  try {
    const feed = await parser.parseURL('https://www.accesswire.com/api/rss');
    for (const item of feed.items || []) {
      const text = (item.title || '') + ' ' + (item.contentSnippet || '');
      if (!matchesKeywords(text, ROBOTICS_KEYWORDS)) continue;
      results.push({
        title: (item.title || '').slice(0, 300),
        company: extractCompanyFromText(item.title || ''),
        url: item.link || '',
        date: item.isoDate || new Date().toISOString().split('T')[0],
        rawContent: item.contentSnippet || item.content || '',
        sourceKey: 'accesswire',
      });
    }
  } catch (err) {
    console.error('[accesswire] Fetch error:', err);
  }
  return results;
}

// ============================================
// IEEE Spectrum Robotics Fetcher
// ============================================
async function fetchIEEESpectrum(): Promise<FetcherResult[]> {
  const results: FetcherResult[] = [];
  try {
    const feed = await parser.parseURL(
      'https://spectrum.ieee.org/feeds/topic/robotics.rss'
    );
    for (const item of feed.items || []) {
      const text = (item.title || '') + ' ' + (item.contentSnippet || '');
      if (!matchesKeywords(text, LEARNING_KEYWORDS)) continue;
      results.push({
        title: (item.title || '').slice(0, 300),
        company: extractCompanyFromText(item.title || ''),
        url: item.link || '',
        date: item.isoDate || new Date().toISOString().split('T')[0],
        rawContent: item.contentSnippet || item.content || '',
        sourceKey: 'ieee_spectrum',
      });
    }
  } catch (err) {
    console.error('[ieee_spectrum] Fetch error:', err);
  }
  return results;
}

// ============================================
// Import AI Newsletter Fetcher
// ============================================
async function fetchImportAI(): Promise<FetcherResult[]> {
  const results: FetcherResult[] = [];
  const keywords = [
    'robotics', 'robot', 'manipulation', 'embodied',
    'physical ai', 'training data',
  ];
  try {
    const feed = await parser.parseURL('https://importai.substack.com/feed');
    for (const item of feed.items || []) {
      const text = (item.title || '') + ' ' + (item.contentSnippet || '');
      if (!matchesKeywords(text, keywords)) continue;
      results.push({
        title: (item.title || '').slice(0, 300),
        company: 'Import AI Newsletter',
        url: item.link || '',
        date: item.isoDate || new Date().toISOString().split('T')[0],
        rawContent: item.contentSnippet || item.content || '',
        sourceKey: 'import_ai',
      });
    }
  } catch (err) {
    console.error('[import_ai] Fetch error:', err);
  }
  return results;
}

// ============================================
// Hugging Face Datasets Fetcher
// ============================================
interface HFDataset {
  id: string;
  author?: string;
  downloads?: number;
  description?: string;
  cardData?: { pretty_name?: string };
  tags?: string[];
  lastModified?: string;
}

async function fetchHuggingFace(): Promise<FetcherResult[]> {
  const results: FetcherResult[] = [];
  try {
    const res = await fetch(
      'https://huggingface.co/api/datasets?filter=task_categories:robotics&sort=lastModified&direction=-1&limit=30',
      {
        headers: { 'User-Agent': 'RoboX-Intel/1.0' },
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!res.ok) throw new Error(`HF API ${res.status}`);
    const datasets = (await res.json()) as HFDataset[];

    for (const ds of datasets) {
      const name =
        ds.cardData?.pretty_name || ds.id.split('/').pop() || ds.id;
      const author = ds.author || ds.id.split('/')[0] || 'Unknown';
      const downloads = ds.downloads ?? 0;
      const description = (ds.description || '').slice(0, 500);

      results.push({
        title: `HF dataset: ${name}`,
        company: author,
        url: `https://huggingface.co/datasets/${ds.id}`,
        date: (ds.lastModified || new Date().toISOString()).split('T')[0],
        rawContent: `Author: ${author}\nDownloads: ${downloads}\nTags: ${(ds.tags || []).join(', ')}\n\n${description}`,
        sourceKey: 'huggingface',
      });
    }
  } catch (err) {
    console.error('[huggingface] Fetch error:', err);
  }
  return results;
}

// ============================================
// GitHub Trending Fetcher
// ============================================
interface GHItem {
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  owner: { login: string };
  topics: string[];
  pushed_at: string;
}

async function fetchGitHub(): Promise<FetcherResult[]> {
  const results: FetcherResult[] = [];
  const topics = [
    'robotics', 'robot-manipulation', 'vla',
    'egocentric-video', 'robot-learning',
  ];

  for (const topic of topics) {
    try {
      const url = `https://api.github.com/search/repositories?q=topic:${topic}+stars:>50+pushed:>2025-10-01&sort=updated&order=desc&per_page=10`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'RoboX-Intel/1.0',
          Accept: 'application/vnd.github+json',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { items: GHItem[] };
      for (const repo of (data.items || []).slice(0, 10)) {
        results.push({
          title: `GitHub: ${repo.full_name}`,
          company: repo.owner.login,
          url: repo.html_url,
          date: (repo.pushed_at || new Date().toISOString()).split('T')[0],
          rawContent: `${repo.description || ''}\nStars: ${repo.stargazers_count}\nTopics: ${repo.topics.join(', ')}`,
          sourceKey: 'github',
        });
      }
    } catch (err) {
      console.error(`[github] Fetch error for topic "${topic}":`, err);
    }
  }
  return results;
}

// ============================================
// Reddit Fetcher
// ============================================
interface RedditItem {
  title?: string;
  link?: string;
  isoDate?: string;
  contentSnippet?: string;
  content?: string;
  creator?: string;
}

async function fetchReddit(): Promise<FetcherResult[]> {
  const results: FetcherResult[] = [];
  const feeds = [
    {
      subreddit: 'robotics',
      url: 'https://www.reddit.com/r/robotics/search.rss?q=training+data&sort=new&t=week',
    },
    {
      subreddit: 'MachineLearning',
      url: 'https://www.reddit.com/r/MachineLearning/search.rss?q=robotics+data&sort=new&t=week',
    },
    {
      subreddit: 'reinforcementlearning',
      url: 'https://www.reddit.com/r/reinforcementlearning/search.rss?q=robot+data&sort=new&t=week',
    },
  ];

  for (const { subreddit, url } of feeds) {
    try {
      const feed = await parser.parseURL(url);
      for (const item of (feed.items || []) as RedditItem[]) {
        results.push({
          title: (item.title || '').slice(0, 300),
          company: `r/${subreddit}`,
          url: item.link || '',
          date: (item.isoDate || new Date().toISOString()).split('T')[0],
          rawContent: `Posted by ${item.creator || 'unknown'}\n\n${item.contentSnippet || item.content || ''}`,
          sourceKey: 'reddit',
        });
      }
    } catch (err) {
      console.error(`[reddit] Fetch error for r/${subreddit}:`, err);
    }
  }
  return results;
}

// ============================================
// NSF Award Search Fetcher
// ============================================
interface NSFAward {
  id: string;
  title: string;
  abstractText?: string;
  piFirstName?: string;
  piLastName?: string;
  awardeeName?: string;
  startDate?: string;
  expDate?: string;
  fundsObligatedAmt?: string;
}

function formatMMDDYYYY(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

async function fetchNSF(): Promise<FetcherResult[]> {
  const results: FetcherResult[] = [];
  try {
    const dateStart = new Date();
    dateStart.setDate(dateStart.getDate() - 30);
    const params = new URLSearchParams({
      keyword: 'robotics manipulation training data embodied',
      dateStart: formatMMDDYYYY(dateStart),
      printFields:
        'id,title,abstractText,piFirstName,piLastName,awardeeName,startDate,expDate,fundsObligatedAmt',
      rpp: '30',
    });
    const res = await fetch(
      `https://api.nsf.gov/services/v1/awards.json?${params}`,
      {
        headers: { 'User-Agent': 'RoboX-Intel/1.0' },
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!res.ok) throw new Error(`NSF API ${res.status}`);
    const data = (await res.json()) as {
      response: { award: NSFAward[] };
    };

    for (const award of data.response?.award || []) {
      const funds = parseInt(award.fundsObligatedAmt || '0', 10);
      if (funds < 500_000) continue;

      const pi = [award.piFirstName, award.piLastName]
        .filter(Boolean)
        .join(' ');
      results.push({
        title: award.title || 'NSF Award',
        company: award.awardeeName || 'Unknown University',
        url: `https://www.nsf.gov/awardsearch/showAward?AWD_ID=${award.id}`,
        date: (award.startDate || new Date().toISOString()).slice(0, 10),
        rawContent: `PI: ${pi}\nAwardee: ${award.awardeeName}\nFunds: $${funds.toLocaleString()}\nStart: ${award.startDate}\n\n${award.abstractText || ''}`,
        sourceKey: 'nsf',
      });
    }
  } catch (err) {
    console.error('[nsf] Fetch error:', err);
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
  globenewswire: fetchGlobeNewsWire,
  accesswire: fetchAccesswire,
  google_news: fetchGoogleNews,
  robot_report: fetchRobotReport,
  ieee_spectrum: fetchIEEESpectrum,
  import_ai: fetchImportAI,
  arxiv: fetchArxiv,
  crunchbase: fetchCrunchbase,
  huggingface: fetchHuggingFace,
  github: fetchGitHub,
  reddit: fetchReddit,
  nsf: fetchNSF,
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
