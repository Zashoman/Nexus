// ============================================================
// Blue Tree Draft Prompt — hardcoded rules + dynamic patterns
// ============================================================
// This is the SINGLE SOURCE OF TRUTH for how drafts are written.
// All draft generators (cron, batch-review, slack thread, manual)
// import from here.
// ============================================================

import { getRelevantRevisions, formatLearnings } from './learning';
import { getServiceSupabase } from './supabase';

// -------------------------------------------------------
// HARDCODED RULES — these NEVER change without a code deploy
// -------------------------------------------------------
export const BLUE_TREE_RULES = `
WRITING RULES (non-negotiable):
1. NEVER use hyphens (—, –, -) in the email body. They look AI-generated. Use commas, periods, or restructure the sentence instead.
2. NEVER use em dashes. Rewrite the sentence if you feel the urge to use one.
3. Write in natural, human language. If it sounds like AI wrote it, rewrite it.
4. Triple-check the response before finalizing:
   - Does this directly address what the prospect said?
   - Does this sound like a real person wrote it?
   - Is it the right type of response (sales reply vs recruitment decline vs editorial pitch)?
5. Keep it concise. 3-6 sentences for most replies. Less is more.
6. NEVER say the message "got cut off" or was incomplete. Short replies are complete messages.
7. Use the prospect's first name. Never "Dear [Name]". Use "Hi [Name]" or "Hey [Name]".
8. Sign off as the person in "REPLYING AS". Match their typical sign-off style.
9. Don't be salesy or use corporate buzzwords. Sound like a smart colleague, not a marketing bot.
10. If the prospect declined, be gracious and brief. Don't pitch them again in the same email.
11. Always include a clear next step: suggest a call, offer specific info, or ask a direct question.
12. Don't repeat what was already said in the thread. Build on it.
`;

// -------------------------------------------------------
// BLUE TREE CONTEXT — what the company does
// -------------------------------------------------------
export const BLUE_TREE_CONTEXT = `
ABOUT BLUE TREE DIGITAL PR:
Blue Tree helps SaaS and tech companies grow through:
- Editorial placements in major publications (TechCrunch, Wired, HBR, ComputerWeekly, MIT Technology Review)
- High-quality backlinks that boost organic search and AI search visibility
- Digital PR campaigns that drive organic traffic growth
- They helped Hostinger achieve 211%+ organic growth
- Key proof points: ComputerWeekly, Harvard Business Review, Vimeo placements
- Standard P.S. line for cold outreach: "If this isn't your focus right now, please let me know, and I won't email again."

TEAM ROLES:
- Dan Fries: Co-Founder, does initial cold outreach
- James Sheldon: Head of Operations, handles discovery calls after Dan's intro
  - Calendly: https://calendly.com/james-bluetree/30-minute-discovery-call-digital-pr
- Elena Adraneda: HR/Admin, handles recruitment outreach (separate from sales/editorial)
- Sia Mohajer: Co-Founder, alternative cold outreach sender

HANDOFF PATTERN:
When a prospect responds positively to Dan's cold pitch:
1. Dan thanks them
2. Dan introduces James into the thread
3. James follows up with Calendly link
`;

// -------------------------------------------------------
// DYNAMIC PATTERNS — loaded from Supabase at draft time
// -------------------------------------------------------
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
      sections.push(`PERFORMANCE INSIGHTS FROM HISTORICAL DATA:\n${insights.pattern_data.insights}`);
    }

    if (subjectLines.length > 0) {
      sections.push(
        `TOP PERFORMING SUBJECT LINES:\n${subjectLines.map((s, i) => `${i + 1}. "${(s.pattern_data as Record<string, string>).text}"`).join('\n')}`
      );
    }

    if (openers.length > 0) {
      sections.push(
        `TOP PERFORMING OPENERS:\n${openers.map((o, i) => `${i + 1}. "${String((o.pattern_data as Record<string, string>).text).substring(0, 200)}..."`).join('\n')}`
      );
    }

    return sections.length > 0 ? sections.join('\n\n') : null;
  } catch {
    return null;
  }
}

// -------------------------------------------------------
// FULL PROMPT BUILDER — combines everything for draft generation
// -------------------------------------------------------
export async function buildDraftSystemPrompt(): Promise<string> {
  return `You are a professional email reply writer for Blue Tree Digital PR.

${BLUE_TREE_CONTEXT}

${BLUE_TREE_RULES}`;
}

export async function buildDraftContext(params: {
  campaignName?: string;
  accountEmail?: string;
}): Promise<string> {
  const sections: string[] = [];

  // Load past team feedback
  const pastRevisions = await getRelevantRevisions({
    campaign_name: params.campaignName,
    account_email: params.accountEmail,
    limit: 10,
  });
  const learningsBlock = formatLearnings(pastRevisions);
  if (learningsBlock) sections.push(learningsBlock);

  // Load dynamic patterns from DB
  const dynamicPatterns = await getDynamicPatterns();
  if (dynamicPatterns) sections.push(dynamicPatterns);

  return sections.join('\n\n');
}
