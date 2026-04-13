-- ============================================================
-- Writer Publication Relationships — seed data
-- ============================================================
-- Links each writer to publications they have relationships with.
-- Used by the editorial brain for writer-publication matching.
-- ============================================================

-- Nahla Davies publications
INSERT INTO writer_publications (writer_id, publication_name, article_url, vertical_tags, category)
SELECT w.id, pub.name, pub.url, pub.tags, pub.cat FROM writers w,
(VALUES
  ('AT&T Cybersecurity', 'https://cybersecurity.att.com/blogs/security-essentials', '{"Cybersecurity/InfoSec"}', 'Cybersecurity'),
  ('SecureWorld', 'https://secureworld.io', '{"Cybersecurity/InfoSec"}', 'Cybersecurity'),
  ('KDNuggets', 'https://kdnuggets.com', '{"AI/ML","Data Science"}', 'AI/ML'),
  ('Fast Company', 'https://fastcompany.com', '{"SaaS/Marketing","HR/Future of Work"}', 'Business'),
  ('Dataversity', 'https://dataversity.net', '{"AI/ML","Data Science"}', 'Data'),
  ('Silicon Republic', 'https://siliconrepublic.com', '{"SaaS/Marketing","Cloud Tech"}', 'Tech'),
  ('StickyMinds', 'https://stickyminds.com', '{"SaaS/DevOps"}', 'Testing')
) AS pub(name, url, tags, cat)
WHERE w.name = 'Nahla Davies'
ON CONFLICT DO NOTHING;

-- Kiara Taylor publications
INSERT INTO writer_publications (writer_id, publication_name, article_url, vertical_tags, category)
SELECT w.id, pub.name, pub.url, pub.tags, pub.cat FROM writers w,
(VALUES
  ('The Penny Hoarder', 'https://thepennyhoarder.com', '{"Personal Finance"}', 'Finance'),
  ('Nasdaq', 'https://nasdaq.com', '{"Fintech/Investing"}', 'Finance'),
  ('Entrepreneur', 'https://entrepreneur.com', '{"Fintech/Investing"}', 'Business'),
  ('Investopedia', 'https://investopedia.com', '{"Personal Finance","Fintech/Investing"}', 'Finance'),
  ('HBR', 'https://hbr.org', '{"Fintech/Investing"}', 'Business'),
  ('Bitcoin Magazine', 'https://bitcoinmagazine.com', '{"Fintech/Crypto"}', 'Crypto'),
  ('Due.com', 'https://due.com', '{"Personal Finance"}', 'Finance')
) AS pub(name, url, tags, cat)
WHERE w.name = 'Kiara Taylor'
ON CONFLICT DO NOTHING;

-- Isla Sibanda publications
INSERT INTO writer_publications (writer_id, publication_name, article_url, vertical_tags, category)
SELECT w.id, pub.name, pub.url, pub.tags, pub.cat FROM writers w,
(VALUES
  ('RSA Conference', 'https://rsaconference.com', '{"Cybersecurity/Zero Trust"}', 'Cybersecurity'),
  ('Tripwire', 'https://tripwire.com', '{"Cybersecurity/InfoSec"}', 'Cybersecurity'),
  ('Computer Weekly', 'https://computerweekly.com', '{"Cybersecurity/Cloud"}', 'Tech'),
  ('ISACA', 'https://isaca.org', '{"Cybersecurity/Supply Chain"}', 'Cybersecurity'),
  ('Manufacturing.net', 'https://manufacturing.net', '{"Cybersecurity/Supply Chain"}', 'Manufacturing'),
  ('Computer.org', 'https://computer.org', '{"Cybersecurity/Zero Trust"}', 'Tech'),
  ('Petri', 'https://petri.com', '{"Cybersecurity/Cloud","SaaS/DevOps"}', 'Tech')
) AS pub(name, url, tags, cat)
WHERE w.name = 'Isla Sibanda'
ON CONFLICT DO NOTHING;

-- Alex Williams publications
INSERT INTO writer_publications (writer_id, publication_name, article_url, vertical_tags, category)
SELECT w.id, pub.name, pub.url, pub.tags, pub.cat FROM writers w,
(VALUES
  ('The New Stack', 'https://thenewstack.io', '{"SaaS/Frontend Dev","SaaS/DevOps","AI/Engineering"}', 'Dev'),
  ('TechTarget', 'https://techtarget.com', '{"SaaS/DevOps"}', 'Tech'),
  ('PhoenixNAP', 'https://phoenixnap.com', '{"SaaS/DevOps","Cloud Tech"}', 'Infrastructure')
) AS pub(name, url, tags, cat)
WHERE w.name = 'Alex Williams'
ON CONFLICT DO NOTHING;

-- Francois Moreau publications
INSERT INTO writer_publications (writer_id, publication_name, article_url, vertical_tags, category)
SELECT w.id, pub.name, pub.url, pub.tags, pub.cat FROM writers w,
(VALUES
  ('Kitco', 'https://kitco.com', '{"Fintech/Commodities"}', 'Finance'),
  ('Payments Journal', 'https://paymentsjournal.com', '{"Fintech/Payments"}', 'Fintech'),
  ('Bitcoin Magazine', 'https://bitcoinmagazine.com', '{"Fintech/Crypto"}', 'Crypto'),
  ('Global Trade Magazine', 'https://globaltrademag.com', '{"Fintech/Trade"}', 'Trade'),
  ('Finance Feeds', 'https://financefeeds.com', '{"Fintech/Commodities"}', 'Finance'),
  ('The Banker', 'https://thebanker.com', '{"Fintech/Payments"}', 'Finance')
) AS pub(name, url, tags, cat)
WHERE w.name = 'Francois Moreau'
ON CONFLICT DO NOTHING;

-- Courtney Lee Li publications
INSERT INTO writer_publications (writer_id, publication_name, article_url, vertical_tags, category)
SELECT w.id, pub.name, pub.url, pub.tags, pub.cat FROM writers w,
(VALUES
  ('TechCrunch', 'https://techcrunch.com', '{"Fintech/Southeast Asia"}', 'Tech'),
  ('BetaNews', 'https://betanews.com', '{"Cybersecurity/AI"}', 'Tech'),
  ('Jeff Bullas', 'https://jeffbullas.com', '{"SaaS/Marketing"}', 'Marketing'),
  ('HackerNoon', 'https://hackernoon.com', '{"Cybersecurity/AI","SaaS/Marketing"}', 'Tech'),
  ('Cloud Academy', 'https://cloudacademy.com', '{"SaaS/Marketing"}', 'Education'),
  ('LeadSquared', 'https://leadsquared.com', '{"SaaS/Marketing"}', 'Marketing')
) AS pub(name, url, tags, cat)
WHERE w.name = 'Courtney Lee Li'
ON CONFLICT DO NOTHING;

-- Gary Espinosa publications
INSERT INTO writer_publications (writer_id, publication_name, article_url, vertical_tags, category)
SELECT w.id, pub.name, pub.url, pub.tags, pub.cat FROM writers w,
(VALUES
  ('Turing.com', 'https://turing.com', '{"AI/SaaS"}', 'AI'),
  ('Unite.AI', 'https://unite.ai', '{"AI/SaaS","AI/HR Tech"}', 'AI'),
  ('IT Pro Today', 'https://itprotoday.com', '{"SaaS/Cloud","Cybersecurity/DevOps"}', 'IT'),
  ('Flatlogic', 'https://flatlogic.com', '{"SaaS/Cloud"}', 'Dev')
) AS pub(name, url, tags, cat)
WHERE w.name = 'Gary Espinosa'
ON CONFLICT DO NOTHING;

-- Ryan Harris publications
INSERT INTO writer_publications (writer_id, publication_name, article_url, vertical_tags, category)
SELECT w.id, pub.name, pub.url, pub.tags, pub.cat FROM writers w,
(VALUES
  ('SafeSearchKids', 'https://safesearchkids.com', '{"EdTech/Digital Safety"}', 'Education'),
  ('Kids Discover', 'https://kidsdiscover.com', '{"EdTech/Digital Safety"}', 'Education'),
  ('Training Industry', 'https://trainingindustry.com', '{"EdTech/AI"}', 'Education'),
  ('eLearning Industry', 'https://elearningindustry.com', '{"EdTech/SaaS"}', 'Education'),
  ('Podcastle', 'https://podcastle.ai', '{"EdTech/AI"}', 'Media')
) AS pub(name, url, tags, cat)
WHERE w.name = 'Ryan Harris'
ON CONFLICT DO NOTHING;

-- Shanice Jones publications
INSERT INTO writer_publications (writer_id, publication_name, article_url, vertical_tags, category)
SELECT w.id, pub.name, pub.url, pub.tags, pub.cat FROM writers w,
(VALUES
  ('Mention', 'https://mention.com', '{"SaaS/Marketing"}', 'Marketing'),
  ('Scoop.it', 'https://scoop.it', '{"SaaS/Marketing"}', 'Marketing'),
  ('POWR', 'https://powr.io', '{"SaaS/eCommerce"}', 'SaaS'),
  ('LandBot', 'https://landbot.io', '{"AI/Marketing"}', 'SaaS'),
  ('TechWyse', 'https://techwyse.com', '{"SaaS/Marketing"}', 'Marketing')
) AS pub(name, url, tags, cat)
WHERE w.name = 'Shanice Jones'
ON CONFLICT DO NOTHING;

-- Sam Bocetta publications
INSERT INTO writer_publications (writer_id, publication_name, article_url, vertical_tags, category)
SELECT w.id, pub.name, pub.url, pub.tags, pub.cat FROM writers w,
(VALUES
  ('Varonis', 'https://varonis.com', '{"Cybersecurity/InfoSec"}', 'Cybersecurity'),
  ('Twilio', 'https://twilio.com', '{"Cybersecurity/Privacy"}', 'Tech'),
  ('CSO Online', 'https://csoonline.com', '{"Cybersecurity/InfoSec"}', 'Cybersecurity'),
  ('Dataversity', 'https://dataversity.net', '{"Cybersecurity/Privacy"}', 'Data'),
  ('Clutch', 'https://clutch.co', '{"Cybersecurity/InfoSec"}', 'Business'),
  ('Tripwire', 'https://tripwire.com', '{"Cybersecurity/Network"}', 'Cybersecurity')
) AS pub(name, url, tags, cat)
WHERE w.name = 'Sam Bocetta'
ON CONFLICT DO NOTHING;

-- Gary Stevens publications
INSERT INTO writer_publications (writer_id, publication_name, article_url, vertical_tags, category)
SELECT w.id, pub.name, pub.url, pub.tags, pub.cat FROM writers w,
(VALUES
  ('Cloudwards', 'https://cloudwards.net', '{"Cybersecurity/Web"}', 'Tech'),
  ('Namecheap', 'https://namecheap.com', '{"Cybersecurity/Web"}', 'Hosting'),
  ('Tripwire', 'https://tripwire.com', '{"Cybersecurity/SMB"}', 'Cybersecurity'),
  ('The SSL Store', 'https://thesslstore.com', '{"Cybersecurity/Encryption"}', 'Security')
) AS pub(name, url, tags, cat)
WHERE w.name = 'Gary Stevens'
ON CONFLICT DO NOTHING;
