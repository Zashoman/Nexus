import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const SEED_COMPANIES = [
  { name: 'Skild AI', tier: 'hot_lead', raised: '$2B+', valuation: '$14B' },
  { name: 'Figure AI', tier: 'hot_lead', raised: '$1B+', valuation: '$39B' },
  { name: 'Physical Intelligence', tier: 'prospect', raised: '$1.1B', valuation: '$5.6B' },
  { name: 'Generalist AI', tier: 'prospect', raised: '$16M' },
  { name: 'Apptronik', tier: 'hot_lead', raised: '$175M' },
  { name: 'Agility Robotics', tier: 'prospect', raised: '$235M' },
  { name: 'Covariant', tier: 'prospect', raised: '$222M' },
  { name: '1X Technologies', tier: 'prospect', raised: '$125M' },
  { name: 'Sanctuary AI', tier: 'prospect', raised: '$175M' },
  { name: 'Tesla Optimus', tier: 'prospect', raised: 'Internal' },
  { name: 'Google DeepMind Robotics', tier: 'prospect', raised: 'Internal' },
  { name: 'Toyota Research Institute', tier: 'prospect', raised: 'Internal' },
  { name: 'NYU GRAIL Lab', tier: 'academic' },
  { name: 'Stanford IRIS Lab', tier: 'academic' },
  { name: 'UT Austin Robot Learning Lab', tier: 'academic' },
  { name: 'CMU Robotics Institute', tier: 'academic' },
  { name: 'UC Berkeley BAIR', tier: 'academic' },
  { name: 'MIT CSAIL', tier: 'academic' },
  { name: 'ETH Zurich RSL', tier: 'academic' },
  { name: 'Sensei', tier: 'competitor', raised: 'YC S24' },
  { name: 'Cortex AI', tier: 'competitor', raised: 'YC' },
  { name: 'Scale AI', tier: 'competitor', raised: '$1B+', valuation: '$14B' },
  { name: 'Micro1', tier: 'competitor' },
  { name: 'Objectways', tier: 'competitor' },
  { name: 'Labellerr', tier: 'competitor' },
  { name: 'Claru', tier: 'competitor' },
  { name: 'Luel', tier: 'competitor' },
  { name: 'Sunday AI', tier: 'competitor' },
  { name: 'Appen', tier: 'competitor' },
  { name: 'Sharpa', tier: 'prospect' },
  { name: 'Robo.ai / DaBoss.AI', tier: 'competitor', notes: 'UAE JV, VR headset-based' },
];

const SEED_SOURCES = [
  { name: 'PR Newswire', source_key: 'prnewswire', category: 'pr_wires', type: 'free', cost: '$0', status: 'active', description: 'Technology press releases. Filtered for robotics keywords.' },
  { name: 'Business Wire', source_key: 'businesswire', category: 'pr_wires', type: 'free', cost: '$0', status: 'active', description: 'Business press releases. Filtered for robotics keywords.' },
  { name: 'GlobeNewsWire', source_key: 'globenewswire', category: 'pr_wires', type: 'free', cost: '$0', status: 'active', description: 'Global press releases. Keyword-filtered for robotics.' },
  { name: 'Accesswire', source_key: 'accesswire', category: 'pr_wires', type: 'free', cost: '$0', status: 'active', description: 'Popular with early-stage startups. Keyword-filtered.' },
  { name: 'Google News Alerts', source_key: 'google_news', category: 'news', type: 'free', cost: '$0', status: 'active', description: 'RSS feeds for 6 robotics training data search queries.' },
  { name: 'The Robot Report', source_key: 'robot_report', category: 'news', type: 'free', cost: '$0', status: 'active', description: 'Industry-focused robotics news. Low volume, high relevance.' },
  { name: 'IEEE Spectrum Robotics', source_key: 'ieee_spectrum', category: 'news', type: 'free', cost: '$0', status: 'active', description: 'Technical robotics coverage. Filtered for training/data/learning.' },
  { name: 'Import AI Newsletter', source_key: 'import_ai', category: 'news', type: 'free', cost: '$0', status: 'active', description: "Jack Clark's AI research newsletter. Keyword-filtered for robotics." },
  { name: 'arXiv cs.RO + cs.CV', source_key: 'arxiv', category: 'research', type: 'free', cost: '$0', status: 'active', description: 'Academic papers on robotics, manipulation, embodied AI.' },
  { name: 'Google Scholar Alerts', source_key: 'google_scholar', category: 'research', type: 'free', cost: '$0', status: 'not_connected', description: 'Citation alerts for key robotics papers. Phase 2.' },
  { name: 'Crunchbase News', source_key: 'crunchbase', category: 'funding', type: 'free', cost: '$0', status: 'active', description: 'Startup funding news filtered for robotics.' },
  { name: 'Hugging Face Datasets', source_key: 'huggingface', category: 'datasets', type: 'free', cost: '$0', status: 'active', description: 'New robotics datasets. Track uploading labs and download volume.' },
  { name: 'GitHub Trending', source_key: 'github', category: 'datasets', type: 'free', cost: '$0', status: 'active', description: 'Trending robotics repos across 5 topic filters.' },
  { name: 'Reddit Monitoring', source_key: 'reddit', category: 'social', type: 'free', cost: '$0', status: 'active', description: 'r/robotics, r/MachineLearning, r/reinforcementlearning.' },
  { name: 'Twitter/X List', source_key: 'twitter_list', category: 'social', type: 'manual', cost: '$0', status: 'active', description: 'Curated list of 60-75 accounts. Manual entry via Quick-Add.' },
  { name: 'LinkedIn Feed', source_key: 'linkedin_feed', category: 'social', type: 'manual', cost: '$0', status: 'active', description: 'Manual entry from daily LinkedIn browsing.' },
  { name: 'Podcast Monitoring', source_key: 'podcasts', category: 'quotes', type: 'manual', cost: '$0', status: 'active', description: 'Robot Brains, Gradient Dissent, Practical AI, etc.' },
  { name: 'NSF Award Search', source_key: 'nsf', category: 'grants', type: 'free', cost: '$0', status: 'active', description: 'Federal grants for robotics research (> $500K last 30 days).' },
  { name: 'DARPA / SAM.gov', source_key: 'darpa', category: 'grants', type: 'free', cost: '$0', status: 'not_connected', description: 'Defense solicitations and awards. Phase 2.' },
  { name: 'Conference Trackers', source_key: 'conferences', category: 'events', type: 'manual', cost: '$0', status: 'active', description: 'ICRA, CoRL, RSS, NeurIPS workshops, Robotics Summit.' },
  { name: 'LinkedIn Jobs', source_key: 'linkedin_jobs', category: 'hiring', type: 'manual', cost: '$0', status: 'active', description: 'Weekly search for robotics data roles. Manual entry.' },
];

const SEED_MEDIA_CONTACTS = [
  { name: 'Evan Ackerman', outlet: 'IEEE Spectrum', type: 'journalist', beat: 'Robotics', relevance: 'high', notes: 'Senior robotics editor. Covers manipulation, humanoids, data. Best for technical announcements.' },
  { name: 'Brian Heater', outlet: 'TechCrunch', type: 'journalist', beat: 'Robotics / Hardware', relevance: 'high', notes: 'Covers robotics startups and funding. High volume — pitch needs strong hook.' },
  { name: 'Stephanie Yang', outlet: 'CNN Business', type: 'journalist', beat: 'Tech / Robotics', relevance: 'high', notes: 'Wrote the CNN egocentric data piece (April 2026). Already knows the space.' },
  { name: 'Steve Crowe', outlet: 'The Robot Report', type: 'journalist', beat: 'Robotics Industry', relevance: 'high', notes: 'Industry-focused. Lower barrier to coverage than mainstream press.' },
  { name: 'James Vincent', outlet: 'The Verge', type: 'journalist', beat: 'AI / Robotics', relevance: 'medium', notes: 'Covers AI broadly. Smartphone data collection angle could work.' },
  { name: 'Will Knight', outlet: 'WIRED', type: 'journalist', beat: 'AI / Robotics', relevance: 'medium', notes: "Strong for trend pieces. Pitch: 'the gig economy for robot training data.'" },
  { name: 'Melissa Heikkilä', outlet: 'MIT Technology Review', type: 'journalist', beat: 'AI', relevance: 'medium', notes: 'Covers training data ethics, labor, scaling. Good for distributed collection workforce angle.' },
  { name: 'Jack Clark', outlet: 'Import AI Newsletter', type: 'newsletter', beat: 'AI Research', relevance: 'high', notes: 'Former OpenAI. Newsletter reaches top AI researchers and VCs. Pitch research angle.' },
  { name: 'Pete Huang', outlet: 'The Neuron', type: 'newsletter', beat: 'AI Industry', relevance: 'medium', notes: '500K+ subscribers. Good for funding announcement or milestone.' },
  { name: 'Robotics & Automation News', outlet: 'Robotics & Automation News', type: 'publication', beat: 'Robotics', relevance: 'medium', notes: 'Trade pub. Will cover most robotics news with a press release. Low barrier.' },
  { name: 'Robotics Business Review', outlet: 'Robotics Business Review', type: 'publication', beat: 'Robotics Industry', relevance: 'medium', notes: 'Enterprise-focused. Accepts contributed articles.' },
];

const SEED_PITCHES = [
  { title: 'The Gig Economy for Robot Training Data', target_outlets: 'WIRED, The Verge, CNN', hook: 'Follow-up to CNN piece. Smartphone passive collection vs. headgear + contractors. The Uber model for robotics data.' },
  { title: 'Open Dataset or Milestone Announcement', target_outlets: 'TechCrunch, The Robot Report, IEEE Spectrum', hook: 'When you hit a volume milestone (e.g., 10K hours). Pair with sample data release for credibility.' },
  { title: 'Data Diversity = Robot Safety', target_outlets: 'MIT Tech Review, IEEE Spectrum', hook: 'Robots trained on lab-only data fail in real homes. Geographic diversity in training data is a safety issue.' },
  { title: 'State of Robotics Training Data (Contributed Article)', target_outlets: 'Robotics Business Review, The Robot Report', hook: 'Bylined thought piece by founder. Both publications accept contributed content. Position as industry expert.' },
];

export async function POST() {
  const supabase = getServiceSupabase();
  const results: Record<string, { inserted: number; errors: string[] }> = {};

  // Seed companies (upsert to avoid duplicates)
  const companyResults = { inserted: 0, errors: [] as string[] };
  for (const company of SEED_COMPANIES) {
    const { error } = await supabase
      .from('robox_companies')
      .upsert(company, { onConflict: 'name' });
    if (error) companyResults.errors.push(`${company.name}: ${error.message}`);
    else companyResults.inserted++;
  }
  results.companies = companyResults;

  // Seed sources (upsert on source_key)
  const sourceResults = { inserted: 0, errors: [] as string[] };
  for (const source of SEED_SOURCES) {
    const { error } = await supabase
      .from('robox_sources')
      .upsert(source, { onConflict: 'source_key' });
    if (error) sourceResults.errors.push(`${source.name}: ${error.message}`);
    else sourceResults.inserted++;
  }
  results.sources = sourceResults;

  // Seed media contacts
  const mediaResults = { inserted: 0, errors: [] as string[] };
  for (const contact of SEED_MEDIA_CONTACTS) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('robox_media_contacts')
      .select('id')
      .eq('name', contact.name)
      .eq('outlet', contact.outlet)
      .limit(1);
    if (existing && existing.length > 0) continue;

    const { error } = await supabase.from('robox_media_contacts').insert(contact);
    if (error) mediaResults.errors.push(`${contact.name}: ${error.message}`);
    else mediaResults.inserted++;
  }
  results.media_contacts = mediaResults;

  // Seed pitch angles
  const pitchResults = { inserted: 0, errors: [] as string[] };
  for (const pitch of SEED_PITCHES) {
    const { data: existing } = await supabase
      .from('robox_pitch_angles')
      .select('id')
      .eq('title', pitch.title)
      .limit(1);
    if (existing && existing.length > 0) continue;

    const { error } = await supabase.from('robox_pitch_angles').insert(pitch);
    if (error) pitchResults.errors.push(`${pitch.title}: ${error.message}`);
    else pitchResults.inserted++;
  }
  results.pitches = pitchResults;

  return NextResponse.json({ success: true, results });
}
