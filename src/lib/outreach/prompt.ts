// ============================================================
// Blue Tree Draft Prompt — v3: dual intelligence brains
// ============================================================
// SINGLE SOURCE OF TRUTH for how all drafts are written.
// Sales brain: James's consultative playbook
// Editorial brain: writer-publication matching + persona voices
// ============================================================

import { getRelevantRevisions, formatLearnings } from './learning';
import { getServiceSupabase } from './supabase';
import { getRelationshipContext } from './relationship';

// -------------------------------------------------------
// HARDCODED RULES — apply to ALL campaign types
// -------------------------------------------------------
export const BLUE_TREE_RULES = `
WRITING RULES (non-negotiable, apply to every email):
1. NEVER use hyphens, em dashes, or en dashes in the email body. They look AI-generated. Use commas, periods, or restructure.
2. Write in natural, human language. If it sounds like AI wrote it, rewrite it.
3. Triple-check: Does this directly address what they said? Does it sound human? Is it the right type of response?
4. Keep it concise. 3-6 sentences for most replies. Less is more.
5. NEVER say the message "got cut off" or was incomplete. Short replies are complete.
6. Use the prospect's first name. Never "Dear." Use "Hi" or "Hey."
7. Sign off as the person in "REPLYING AS." Match their typical style.
8. Don't be salesy or use corporate buzzwords. Sound like a smart colleague.
9. If they declined, be gracious and brief. Don't re-pitch.
10. Always include a clear next step.
11. Don't repeat what was already said in the thread.
`;

// -------------------------------------------------------
// SALES INTELLIGENCE BRAIN — James Sheldon's playbook
// -------------------------------------------------------
export const SALES_BRAIN = `
SALES INTELLIGENCE BRAIN (James Sheldon's consultative playbook):

APPROACH:
- Research-first: lead with a specific, data-backed observation about their situation. Never generic.
- Consultative framing: earn the right to pitch by demonstrating understanding first.
- Evidence-led: every claim backed by a case study, metric, or guarantee.

PITCH STRUCTURE:
Permission-based opener → data-backed observation → tie to Blue Tree model → specific result (case study by industry) → soft close. Never hard-close. Always: "looking forward to this one."

VOCABULARY ENFORCEMENT:
MUST USE: "editorially earned," "writer-led," "editorial brief," "hands-off," "guaranteed" (DR 50+, 5K traffic, 1-year link), "long-term partnership," "syndication pickups are free," "month-to-month, 30 days' notice," "contextually natural"
MUST NEVER USE: "buying links," "paid links," "guest post farms," "PBN," "SEO juice," "cheap"

PRICING KNOWLEDGE:
- Startup/entry: 5-8 links/month, £2K-£3.5K
- Growth: 8-12 links/month, £5K
- Enterprise: 17+ links/month, £8K-£10K+
- Custom bulk: 20+ annual, per quote
- Every mention DR 50+ with 5K traffic minimum
- Month-to-month with 30 days' notice
- One-year link guarantee

TEAM ROLES:
- Dan Fries: Co-Founder, initial cold outreach
- James Sheldon: Head of Operations, discovery calls (Calendly: calendly.com/james-bluetree/30-minute-discovery-call-digital-pr)
- Sia Mohajer: Co-Founder, alternative cold sender
- Elena Adraneda: HR/Admin (recruitment only, separate track)

HANDOFF: Dan pitches → prospect responds → Dan introduces James → James books call
`;

// -------------------------------------------------------
// EDITORIAL INTELLIGENCE BRAIN
// -------------------------------------------------------
export const EDITORIAL_BRAIN = `
EDITORIAL INTELLIGENCE BRAIN:

Blue Tree operates through a network of 15+ freelance writers with pre-existing relationships at tech and business publications. Each writer covers specific verticals, writes in a specific voice, and has established relationships with specific editors.

APPROACH:
- Writer-publication matching: check which writer has an existing relationship with the target publication
- Draft in that writer's voice and persona
- Reference the writer's existing work on that publication
- Publication research: reference their recent articles and editorial direction
- Never pitch a topic they just covered

KEY PUBLICATIONS IN NETWORK:
AT&T Cybersecurity, SecureWorld, KDNuggets, Fast Company, The Penny Hoarder, Nasdaq, Entrepreneur, Investopedia, HBR, RSA Conference, Tripwire, Computer Weekly, The New Stack, Kitco, Payments Journal, TechCrunch, Training Industry, eLearning Industry, CSO Online, Varonis

When pitching, always mention the writer's existing relationship if one exists.
`;

// -------------------------------------------------------
// BLUE TREE CONTEXT — company overview
// -------------------------------------------------------
export const BLUE_TREE_CONTEXT = `
ABOUT BLUE TREE DIGITAL PR:
Blue Tree helps SaaS and tech companies grow through:
- Editorially earned placements in major publications (not paid links)
- Writer-led content placed through existing editorial relationships
- High-quality backlinks (DR 50+ guaranteed, 5K+ traffic minimum)
- Digital PR campaigns with proven organic traffic growth
- Case studies: Hostinger 211% growth, BrainStation 1,203% growth, Cloud Defense 1 to 16,679 visitors

KEY DIFFERENTIATORS:
- 15+ writer network with pre-existing publication relationships
- Editorially earned (not vendor-list placements)
- 1-year link guarantee
- Month-to-month, 30 days' notice
- Hands-off model with editorial briefs
- Syndication pickups are free bonus links

P.S. LINE (cold outreach only): "If this isn't your focus right now, please let me know, and I won't email again."
`;

// -------------------------------------------------------
// VOCABULARY ENFORCEMENT — pre-publish check
// -------------------------------------------------------
const FORBIDDEN_PHRASES = [
  'buying links', 'paid links', 'guest post farms', 'PBN',
  'SEO juice', 'cheap', 'link building service', 'link farm',
  'paid placement', 'sponsored post', 'buy backlinks',
];

const APPROVED_PHRASES = [
  'editorially earned', 'writer-led', 'editorial brief',
  'hands-off', 'guaranteed', 'long-term partnership',
  'syndication pickups', 'month-to-month', 'contextually natural',
];

export function checkVocabulary(draft: string): { passed: boolean; violations: string[] } {
  const lower = draft.toLowerCase();
  const violations: string[] = [];

  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      violations.push(`Forbidden phrase: "${phrase}"`);
    }
  }

  return { passed: violations.length === 0, violations };
}

export function getApprovedPhrases(): string[] {
  return APPROVED_PHRASES;
}

// -------------------------------------------------------
// DYNAMIC CONTEXT — loaded from Supabase at draft time
// -------------------------------------------------------

/** Load objection playbook for a campaign type */
async function getObjectionPlaybook(campaignType?: string): Promise<string | null> {
  try {
    const supabase = getServiceSupabase();
    const query = supabase
      .from('objection_playbook')
      .select('objection_pattern, counter_framework, example_response')
      .eq('active', true);

    if (campaignType) {
      query.or(`campaign_type.eq.${campaignType},campaign_type.eq.both`);
    }

    const { data } = await query.limit(15);
    if (!data || data.length === 0) return null;

    return `OBJECTION HANDLING PLAYBOOK (use these proven counter-frameworks when you detect an objection):
${data.map((o, i) => `${i + 1}. If they say something like "${o.objection_pattern}":
   Counter: ${o.counter_framework}${o.example_response ? `\n   Example: "${o.example_response.substring(0, 200)}"` : ''}`).join('\n')}`;
  } catch {
    return null;
  }
}

/** Load relevant case studies for a prospect's industry */
async function getRelevantCaseStudies(industry?: string): Promise<string | null> {
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from('case_studies')
      .select('client_name, industry_tags, result_headline')
      .eq('active', true)
      .limit(10);

    if (!data || data.length === 0) return null;

    // Sort: matching industry first
    const sorted = industry
      ? [...data].sort((a, b) => {
          const aMatch = (a.industry_tags as string[]).some((t: string) =>
            industry.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(industry.toLowerCase())
          ) ? 0 : 1;
          const bMatch = (b.industry_tags as string[]).some((t: string) =>
            industry.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(industry.toLowerCase())
          ) ? 0 : 1;
          return aMatch - bMatch;
        })
      : data;

    return `CASE STUDIES (use the most relevant one as social proof):
${sorted.map((cs, i) => `${i + 1}. ${cs.client_name} [${(cs.industry_tags as string[]).join(', ')}]: ${cs.result_headline}`).join('\n')}`;
  } catch {
    return null;
  }
}

/** Load writer info with publication matching for editorial campaigns */
async function getWriterContext(accountEmail?: string, targetPublication?: string): Promise<string | null> {
  try {
    const supabase = getServiceSupabase();

    // Get all active writers with their publication relationships
    const { data: writers } = await supabase
      .from('writers')
      .select('id, name, primary_verticals, bio, writing_style')
      .eq('active', true);

    if (!writers || writers.length === 0) return null;

    // Get publication counts and names per writer
    const { data: pubs } = await supabase
      .from('writer_publications')
      .select('writer_id, publication_name');

    const writerPubs: Record<string, string[]> = {};
    for (const pub of pubs || []) {
      if (!writerPubs[pub.writer_id]) writerPubs[pub.writer_id] = [];
      if (!writerPubs[pub.writer_id].includes(pub.publication_name)) {
        writerPubs[pub.writer_id].push(pub.publication_name);
      }
    }

    // If targeting a specific publication, find matching writers
    let matchedWriter: string | null = null;
    if (targetPublication) {
      const target = targetPublication.toLowerCase();
      for (const w of writers) {
        const pList = writerPubs[w.id] || [];
        if (pList.some((p) => p.toLowerCase().includes(target) || target.includes(p.toLowerCase()))) {
          matchedWriter = w.name;
          break;
        }
      }
    }

    const sections: string[] = [];

    if (matchedWriter) {
      sections.push(`WRITER MATCH: ${matchedWriter} has an existing relationship with ${targetPublication}. Draft under this writer's persona.`);
    }

    sections.push(`WRITER NETWORK:\n${writers.map((w) => {
      const pList = writerPubs[w.id] || [];
      return `- ${w.name}: ${(w.primary_verticals as string[]).join(', ')} | Publications: ${pList.slice(0, 4).join(', ')}${pList.length > 4 ? ` +${pList.length - 4}` : ''}`;
    }).join('\n')}`);

    return sections.join('\n\n');
  } catch {
    return null;
  }
}

export async function getDynamicPatterns(): Promise<string | null> {
  try {
    const supabase = getServiceSupabase();
    const { data: patterns } = await supabase
      .from('email_patterns')
      .select('pattern_type, pattern_data')
      .eq('is_active', true)
      .limit(20);

    if (!patterns || patterns.length === 0) return null;

    const insights = patterns.find((p) => p.pattern_type === 'follow_up');
    const subjectLines = patterns.filter((p) => p.pattern_type === 'subject_line').slice(0, 5);
    const openers = patterns.filter((p) => p.pattern_type === 'opener').slice(0, 5);

    const sections: string[] = [];

    if (insights?.pattern_data?.insights) {
      sections.push(`PERFORMANCE INSIGHTS:\n${insights.pattern_data.insights}`);
    }

    if (subjectLines.length > 0) {
      sections.push(
        `TOP SUBJECT LINES:\n${subjectLines.map((s, i) => `${i + 1}. "${(s.pattern_data as Record<string, string>).text}"`).join('\n')}`
      );
    }

    if (openers.length > 0) {
      sections.push(
        `TOP OPENERS:\n${openers.map((o, i) => `${i + 1}. "${String((o.pattern_data as Record<string, string>).text).substring(0, 200)}..."`).join('\n')}`
      );
    }

    return sections.length > 0 ? sections.join('\n\n') : null;
  } catch {
    return null;
  }
}

// -------------------------------------------------------
// FULL PROMPT BUILDER — dual brain system
// -------------------------------------------------------
export async function buildDraftSystemPrompt(campaignType?: string): Promise<string> {
  const brainSection = campaignType === 'editorial'
    ? EDITORIAL_BRAIN
    : SALES_BRAIN;

  return `You are a professional email writer for Blue Tree Digital PR.

${BLUE_TREE_CONTEXT}

${brainSection}

${BLUE_TREE_RULES}`;
}

export async function buildDraftContext(params: {
  campaignName?: string;
  campaignType?: string;
  accountEmail?: string;
  prospectIndustry?: string;
  contactEmail?: string;
}): Promise<string> {
  const sections: string[] = [];

  // Load relationship memory for this contact
  if (params.contactEmail) {
    const relCtx = await getRelationshipContext(params.contactEmail);
    if (relCtx) sections.push(relCtx);
  }

  // Load past team feedback
  const pastRevisions = await getRelevantRevisions({
    campaign_name: params.campaignName,
    account_email: params.accountEmail,
    limit: 10,
  });
  const learningsBlock = formatLearnings(pastRevisions);
  if (learningsBlock) sections.push(learningsBlock);

  // Load objection playbook
  const objections = await getObjectionPlaybook(params.campaignType);
  if (objections) sections.push(objections);

  // Load case studies (for sales) or writer context (for editorial)
  if (params.campaignType === 'editorial') {
    const writerCtx = await getWriterContext(params.accountEmail, params.prospectIndustry);
    if (writerCtx) sections.push(writerCtx);
  } else {
    const caseStudies = await getRelevantCaseStudies(params.prospectIndustry);
    if (caseStudies) sections.push(caseStudies);
  }

  // Load dynamic patterns from historical data
  const dynamicPatterns = await getDynamicPatterns();
  if (dynamicPatterns) sections.push(dynamicPatterns);

  return sections.join('\n\n');
}
