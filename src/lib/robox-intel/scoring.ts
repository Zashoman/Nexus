import type { SignalType, Relevance, Company } from '@/types/robox-intel';

/**
 * Extract dollar amounts from text. Returns amounts in raw dollars.
 * e.g. "$5M" → 5000000, "$1.2B" → 1200000000
 */
export function extractDollarAmounts(text: string): number[] {
  const amounts: number[] = [];
  const regex = /\$(\d+(?:\.\d+)?)\s*(B|M|K|billion|million|thousand)?/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    let value = parseFloat(match[1]);
    const unit = (match[2] || '').toLowerCase();
    if (unit === 'b' || unit === 'billion') value *= 1_000_000_000;
    else if (unit === 'm' || unit === 'million') value *= 1_000_000;
    else if (unit === 'k' || unit === 'thousand') value *= 1_000;
    amounts.push(value);
  }
  return amounts;
}

/**
 * Check if a company is tracked at the given tiers.
 */
export function isTrackedCompany(
  companyName: string,
  companies: Company[],
  tiers: string[]
): boolean {
  const name = companyName.toLowerCase();
  return companies.some(
    (c) => c.name.toLowerCase() === name && tiers.includes(c.tier)
  );
}

/**
 * Score relevance of a signal based on rules.
 */
export function scoreRelevance(
  type: SignalType,
  title: string,
  summary: string,
  tags: string[] | null,
  company: string,
  rawContent: string | null,
  trackedCompanies: Company[]
): Relevance {
  const text = (title + ' ' + summary + ' ' + (rawContent || '')).toLowerCase();

  // --- ALWAYS HIGH ---

  // Funding > $5M in robotics
  if (type === 'funding') {
    const amounts = extractDollarAmounts(text);
    if (amounts.some((a) => a >= 5_000_000)) return 'high';
  }

  // Hiring for data roles
  if (type === 'hiring') {
    const dataKeywords = [
      'training data', 'data collection', 'dataset',
      'data curator', 'data engineer', 'data strategy',
    ];
    if (dataKeywords.some((k) => text.includes(k))) return 'high';
  }

  // PR with zero media coverage
  if (type === 'press_release' && tags?.includes('zero-coverage')) {
    return 'high';
  }

  // PR mentioning data + robotics
  if (type === 'press_release') {
    const hasData = ['training data', 'data collection', 'dataset', 'demonstration data'].some(
      (k) => text.includes(k)
    );
    const hasRobot = ['robotics', 'robot', 'humanoid', 'manipulation', 'embodied'].some(
      (k) => text.includes(k)
    );
    if (hasData && hasRobot) return 'high';
  }

  // Research paper mentioning egocentric + robot
  if (type === 'research') {
    if (
      text.includes('egocentric') &&
      ['robot', 'manipulation'].some((k) => text.includes(k))
    ) {
      return 'high';
    }
  }

  // Any tracked competitor announcement
  if (type === 'competitor') return 'high';

  // Grant > $1M
  if (type === 'grant') {
    const amounts = extractDollarAmounts(text);
    if (amounts.some((a) => a >= 1_000_000)) return 'high';
  }

  // Company matches tracked hot lead or prospect
  if (isTrackedCompany(company, trackedCompanies, ['hot_lead', 'prospect'])) {
    return 'high';
  }

  // --- MEDIUM ---

  // HuggingFace dataset with > 100 downloads
  if (type === 'dataset') {
    const dlMatch = text.match(/(\d+)\s*downloads?/i);
    if (dlMatch && parseInt(dlMatch[1]) > 100) return 'medium';
  }

  // Social post mentioning data
  if ((type === 'social' || type === 'quote') && text.includes('data')) {
    return 'medium';
  }

  // Conference speaker list
  if (type === 'conference') return 'medium';

  // Research paper (baseline)
  if (type === 'research') return 'medium';

  // --- LOW ---
  return 'low';
}
