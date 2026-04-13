// ============================================================
// Prospect Qualification Scoring
// ============================================================
// Applies James's qualification criteria to prospects.
// Strong signals (+3), Yellow flags (+1), Red flags (-5)
// ============================================================

import { getServiceSupabase } from './supabase';

interface QualificationRule {
  signal_type: 'strong' | 'yellow' | 'red';
  description: string;
  score_weight: number;
  auto_action: 'boost' | 'warn' | 'exclude' | 'none';
}

interface QualificationResult {
  score: number;
  signals: Array<{ type: string; description: string; weight: number }>;
  action: 'boost' | 'warn' | 'exclude' | 'none';
}

// Hardcoded signal detection (supplements DB rules)
function detectSignals(prospect: {
  title?: string;
  company_size?: string;
  industry?: string;
  funding_stage?: string;
  enrichment_data?: Record<string, unknown>;
}): QualificationResult {
  const signals: QualificationResult['signals'] = [];
  let score = 0;
  let action: QualificationResult['action'] = 'none';

  const title = (prospect.title || '').toLowerCase();
  const industry = (prospect.industry || '').toLowerCase();
  const funding = (prospect.funding_stage || '').toLowerCase();
  const size = prospect.company_size || '';

  // Strong signals (+3)
  if (['ceo', 'cto', 'cmo', 'vp', 'head of', 'director'].some((t) => title.includes(t))) {
    signals.push({ type: 'strong', description: 'C-suite or senior leadership role', weight: 3 });
    score += 3;
  }

  if (['series a', 'series b', 'series c', 'series d', 'public'].some((f) => funding.includes(f))) {
    signals.push({ type: 'strong', description: `${prospect.funding_stage} funding stage`, weight: 3 });
    score += 3;
  }

  if (['51-200', '201-500', '501-1000', '1001-5000'].includes(size)) {
    signals.push({ type: 'strong', description: 'Mid-market company size (sweet spot)', weight: 2 });
    score += 2;
  }

  if (['saas', 'technology', 'software', 'fintech', 'cybersecurity'].some((i) => industry.includes(i))) {
    signals.push({ type: 'strong', description: 'Target vertical (SaaS/Tech/Fintech/Cyber)', weight: 2 });
    score += 2;
  }

  // Yellow flags (+1)
  if (funding.includes('seed') || funding.includes('pre-seed')) {
    signals.push({ type: 'yellow', description: 'Early stage (offer pilot)', weight: 1 });
    score += 1;
    action = 'warn';
  }

  if (['1-10', '11-50'].includes(size)) {
    signals.push({ type: 'yellow', description: 'Small company (may have limited budget)', weight: 1 });
    score += 1;
  }

  // Red flags (-5)
  if (['ecommerce', 'e-commerce', 'fashion', 'gambling', 'casino', 'adult'].some((i) => industry.includes(i))) {
    signals.push({ type: 'red', description: 'Excluded vertical (ecommerce/fashion/gambling/adult)', weight: -5 });
    score -= 5;
    action = 'exclude';
  }

  return { score, signals, action };
}

/** Score a single prospect */
export function scoreProspect(prospect: {
  title?: string;
  company_size?: string;
  industry?: string;
  funding_stage?: string;
  enrichment_data?: Record<string, unknown>;
}): QualificationResult {
  return detectSignals(prospect);
}

/** Score and sort an array of prospects */
export function scoreAndSortProspects<T extends {
  title?: string;
  company_size?: string;
  industry?: string;
  funding_stage?: string;
  organization?: { industry?: string; estimated_num_employees?: number };
}>(prospects: T[]): (T & { qualification: QualificationResult })[] {
  return prospects
    .map((p) => {
      const sizeStr = p.organization?.estimated_num_employees
        ? p.organization.estimated_num_employees <= 10 ? '1-10'
          : p.organization.estimated_num_employees <= 50 ? '11-50'
          : p.organization.estimated_num_employees <= 200 ? '51-200'
          : p.organization.estimated_num_employees <= 500 ? '201-500'
          : p.organization.estimated_num_employees <= 1000 ? '501-1000'
          : '1001-5000'
        : p.company_size;

      const qualification = scoreProspect({
        title: p.title,
        company_size: sizeStr,
        industry: p.organization?.industry || p.industry,
        funding_stage: p.funding_stage,
      });

      return { ...p, qualification };
    })
    .sort((a, b) => b.qualification.score - a.qualification.score);
}

/** Load qualification rules from database (for Settings display) */
export async function getQualificationRules(): Promise<QualificationRule[]> {
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from('qualification_rules')
      .select('*')
      .eq('active', true)
      .order('score_weight', { ascending: false });
    return (data || []) as QualificationRule[];
  } catch {
    return [];
  }
}
