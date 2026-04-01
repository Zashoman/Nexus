// Default source definitions for seeding intel_sources table

export interface SourceSeed {
  name: string;
  source_type: 'rss' | 'api' | 'scraper';
  url: string;
  tier: 1 | 2 | 3;
  category: string;
  subcategory?: string;
}

export const DEFAULT_SOURCES: SourceSeed[] = [
  // Tier 1: Primary / Authoritative
  {
    name: 'ArXiv AI/ML',
    source_type: 'api',
    url: 'https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=20',
    tier: 1,
    category: 'frontier_models',
    subcategory: 'research',
  },
  {
    name: 'OpenAI Blog',
    source_type: 'rss',
    url: 'https://openai.com/blog/rss.xml',
    tier: 1,
    category: 'frontier_models',
    subcategory: 'announcements',
  },
  {
    name: 'Anthropic Blog',
    source_type: 'rss',
    url: 'https://www.anthropic.com/rss.xml',
    tier: 1,
    category: 'frontier_models',
    subcategory: 'announcements',
  },
  {
    name: 'Google DeepMind Blog',
    source_type: 'rss',
    url: 'https://deepmind.google/blog/rss.xml',
    tier: 1,
    category: 'frontier_models',
    subcategory: 'research',
  },
  {
    name: 'Meta AI Blog',
    source_type: 'rss',
    url: 'https://ai.meta.com/blog/rss/',
    tier: 1,
    category: 'frontier_models',
    subcategory: 'research',
  },
  {
    name: 'DARPA News',
    source_type: 'rss',
    url: 'https://www.darpa.mil/news/rss',
    tier: 1,
    category: 'cybersecurity_ai',
    subcategory: 'defense',
  },
  {
    name: 'NIST AI Publications',
    source_type: 'rss',
    url: 'https://www.nist.gov/artificial-intelligence/rss.xml',
    tier: 1,
    category: 'regulation_policy',
    subcategory: 'standards',
  },
  {
    name: 'FDA AI/ML Devices',
    source_type: 'rss',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medical-devices/rss.xml',
    tier: 1,
    category: 'health_bio_ai',
    subcategory: 'approvals',
  },
  {
    name: 'CISA Advisories',
    source_type: 'rss',
    url: 'https://www.cisa.gov/news.xml',
    tier: 1,
    category: 'cybersecurity_ai',
    subcategory: 'advisories',
  },
  {
    name: 'White House AI Policy',
    source_type: 'rss',
    url: 'https://www.whitehouse.gov/feed/',
    tier: 1,
    category: 'regulation_policy',
    subcategory: 'policy',
  },
  // Tier 2: Quality Journalism / Analysis
  {
    name: 'Ars Technica AI',
    source_type: 'rss',
    url: 'https://feeds.arstechnica.com/arstechnica/technology-lab',
    tier: 2,
    category: 'frontier_models',
    subcategory: 'journalism',
  },
  {
    name: 'MIT Technology Review AI',
    source_type: 'rss',
    url: 'https://www.technologyreview.com/feed/',
    tier: 2,
    category: 'frontier_models',
    subcategory: 'analysis',
  },
  {
    name: 'Wired AI',
    source_type: 'rss',
    url: 'https://www.wired.com/feed/tag/ai/latest/rss',
    tier: 2,
    category: 'frontier_models',
    subcategory: 'journalism',
  },
  {
    name: 'IEEE Spectrum Robotics/AI',
    source_type: 'rss',
    url: 'https://spectrum.ieee.org/feeds/topic/robotics.rss',
    tier: 2,
    category: 'robotics_physical_ai',
    subcategory: 'engineering',
  },
  {
    name: 'Nature AI',
    source_type: 'rss',
    url: 'https://www.nature.com/subjects/artificial-intelligence.rss',
    tier: 2,
    category: 'frontier_models',
    subcategory: 'research',
  },
  {
    name: 'Reuters Technology',
    source_type: 'rss',
    url: 'https://www.reuters.com/technology/rss',
    tier: 2,
    category: 'infrastructure_compute',
    subcategory: 'journalism',
  },
  {
    name: 'TechCrunch AI',
    source_type: 'rss',
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    tier: 2,
    category: 'frontier_models',
    subcategory: 'journalism',
  },
  {
    name: 'The Verge AI',
    source_type: 'rss',
    url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
    tier: 2,
    category: 'frontier_models',
    subcategory: 'journalism',
  },
  {
    name: 'SEC EDGAR AI Filings',
    source_type: 'rss',
    url: 'https://efts.sec.gov/LATEST/search-index?q=%22artificial+intelligence%22&dateRange=custom&startdt=2024-01-01&forms=10-K,10-Q,8-K',
    tier: 2,
    category: 'infrastructure_compute',
    subcategory: 'filings',
  },
  // Tier 3: Commentary / Independent
  {
    name: 'Import AI (Jack Clark)',
    source_type: 'rss',
    url: 'https://importai.substack.com/feed',
    tier: 3,
    category: 'frontier_models',
    subcategory: 'newsletter',
  },
  {
    name: 'The Gradient',
    source_type: 'rss',
    url: 'https://thegradient.pub/rss/',
    tier: 3,
    category: 'frontier_models',
    subcategory: 'analysis',
  },
  {
    name: 'Hacker News AI',
    source_type: 'api',
    url: 'https://hn.algolia.com/api/v1/search?query=AI+artificial+intelligence+machine+learning&tags=story&hitsPerPage=20',
    tier: 3,
    category: 'frontier_models',
    subcategory: 'community',
  },
];

export const TRACKED_STOCKS = [
  'NVDA', 'AMD', 'MSFT', 'GOOGL', 'META', 'AMZN', 'TSM', 'SMCI', 'ARM', 'PLTR',
];
