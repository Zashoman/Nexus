-- Seed intel_sources with default data sources
-- Run this AFTER schema.sql

INSERT INTO intel_sources (name, source_type, url, tier, category, subcategory) VALUES
-- Tier 1: Primary / Authoritative
('ArXiv AI/ML', 'api', 'https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=20', 1, 'frontier_models', 'research'),
('OpenAI Blog', 'rss', 'https://openai.com/blog/rss.xml', 1, 'frontier_models', 'announcements'),
('Anthropic Blog', 'rss', 'https://www.anthropic.com/rss.xml', 1, 'frontier_models', 'announcements'),
('Google DeepMind Blog', 'rss', 'https://deepmind.google/blog/rss.xml', 1, 'frontier_models', 'research'),
('Meta AI Blog', 'rss', 'https://ai.meta.com/blog/rss/', 1, 'frontier_models', 'research'),
('DARPA News', 'rss', 'https://www.darpa.mil/news/rss', 1, 'cybersecurity_ai', 'defense'),
('NIST AI Publications', 'rss', 'https://www.nist.gov/artificial-intelligence/rss.xml', 1, 'regulation_policy', 'standards'),
('FDA AI/ML Devices', 'rss', 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medical-devices/rss.xml', 1, 'health_bio_ai', 'approvals'),
('CISA Advisories', 'rss', 'https://www.cisa.gov/news.xml', 1, 'cybersecurity_ai', 'advisories'),
('White House AI Policy', 'rss', 'https://www.whitehouse.gov/feed/', 1, 'regulation_policy', 'policy'),

-- Tier 2: Quality Journalism / Analysis
('Ars Technica AI', 'rss', 'https://feeds.arstechnica.com/arstechnica/technology-lab', 2, 'frontier_models', 'journalism'),
('MIT Technology Review AI', 'rss', 'https://www.technologyreview.com/feed/', 2, 'frontier_models', 'analysis'),
('Wired AI', 'rss', 'https://www.wired.com/feed/tag/ai/latest/rss', 2, 'frontier_models', 'journalism'),
('IEEE Spectrum Robotics/AI', 'rss', 'https://spectrum.ieee.org/feeds/topic/robotics.rss', 2, 'robotics_physical_ai', 'engineering'),
('Nature AI', 'rss', 'https://www.nature.com/subjects/artificial-intelligence.rss', 2, 'frontier_models', 'research'),
('Reuters Technology', 'rss', 'https://www.reuters.com/technology/rss', 2, 'infrastructure_compute', 'journalism'),
('TechCrunch AI', 'rss', 'https://techcrunch.com/category/artificial-intelligence/feed/', 2, 'frontier_models', 'journalism'),
('The Verge AI', 'rss', 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', 2, 'frontier_models', 'journalism'),

-- Tier 3: Commentary / Independent
('Import AI (Jack Clark)', 'rss', 'https://importai.substack.com/feed', 3, 'frontier_models', 'newsletter'),
('The Gradient', 'rss', 'https://thegradient.pub/rss/', 3, 'frontier_models', 'analysis'),
('Hacker News AI', 'api', 'https://hn.algolia.com/api/v1/search?query=AI+artificial+intelligence+machine+learning&tags=story&hitsPerPage=20', 3, 'frontier_models', 'community')
ON CONFLICT DO NOTHING;
