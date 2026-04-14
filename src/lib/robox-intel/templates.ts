import type { SignalType } from '@/types/robox-intel';

interface TemplateInput {
  type: SignalType;
  title: string;
  company: string;
  source: string;
  date: string;
  rawContent: string;
  tags?: string[];
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trim() + '...';
}

export function generateSummary(input: TemplateInput): string {
  const { type, title, company, source, date, rawContent } = input;
  const excerpt = truncate(rawContent.replace(/\s+/g, ' ').trim(), 200);

  switch (type) {
    case 'funding':
      return `${company} has announced new funding. ${excerpt}`;
    case 'hiring':
      return `${company} is hiring: "${title}". ${excerpt}`;
    case 'press_release':
      return `${company} announced: ${title}. Published via ${source} on ${date}. ${excerpt}`;
    case 'research':
      return `New paper: "${title}". ${excerpt}`;
    case 'competitor':
      return `${company} (competitor) announced: ${title}. ${excerpt}`;
    case 'dataset':
      return `New dataset published: "${title}" on ${source}. ${excerpt}`;
    case 'grant':
      return `Grant awarded to ${company} for "${title}". ${excerpt}`;
    case 'quote':
      return `${company}: "${truncate(rawContent, 150)}". Context: ${title}`;
    case 'social':
      return `${source} discussion: "${title}". ${excerpt}`;
    case 'conference':
      return `Conference: ${title}. ${excerpt}`;
    case 'news':
      return `${source}: "${title}". ${excerpt}`;
    default:
      return `${title} — ${excerpt}`;
  }
}

export function generateAction(input: TemplateInput): string {
  const { type } = input;
  const isZeroCoverage = input.tags?.includes('zero-coverage');

  if (type === 'press_release' && isZeroCoverage) {
    return 'ZERO MEDIA COVERAGE — your outreach lands in an empty inbox. Reach out immediately. Reference their press release directly.';
  }

  const actions: Record<SignalType, string> = {
    funding:
      'Reach out within 48 hours. They have fresh budget and are likely scaling their data infrastructure. Reference their announcement in your connection note.',
    hiring:
      'They are building data capacity. Connect with the hiring manager or VP Engineering on LinkedIn. Position RoboX as a vendor that augments their team.',
    press_release:
      'Review the release for buyer signals. If they mention data needs or training infrastructure, reach out to their BD or engineering lead.',
    research:
      'Review the paper for data gap mentions. If they cite dataset limitations, reach out to the lab PI. Academic labs are primary pilot customers.',
    competitor:
      'Log competitive intelligence. Update positioning if needed. Check if their announcement reveals customer names or pricing we can learn from.',
    dataset:
      'Monitor the uploading lab — they are actively working on robot training. Check community comments for complaints about data gaps that RoboX fills.',
    grant:
      'Grant-funded labs have earmarked budget for data. Reach out to the PI directly. Reference their stated research goals.',
    quote:
      "Engage with this publicly (like, comment). Then reach out directly via LinkedIn or email. Use their own words about data needs in your outreach.",
    social:
      'Do NOT self-promote on the platform (will backfire). Identify participants who express data needs and reach out via LinkedIn or email.',
    conference:
      "Cross-reference speakers with prospect list. Reach out BEFORE the event: 'I see you will be presenting on X — would love to connect about training data.'",
    news:
      'Review for named companies, quoted founders, or data-related themes. Each name is a potential contact. Each quote about data scarcity is an outreach hook.',
  };

  return actions[type] || 'Review this signal for potential outreach opportunities.';
}
