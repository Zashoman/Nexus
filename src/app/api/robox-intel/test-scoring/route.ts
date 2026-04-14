import { NextResponse } from 'next/server';
import { scoreRelevance, extractDollarAmounts } from '@/lib/robox-intel/scoring';
import type { Company, Relevance, SignalType } from '@/types/robox-intel';

/**
 * Self-check: runs scoring assertions against fixed scenarios. Returns
 * pass/fail per case. Use as a smoke test before deploying changes to
 * scoring rules.
 */

interface TestCase {
  name: string;
  type: SignalType;
  title: string;
  summary: string;
  company: string;
  rawContent?: string;
  tags?: string[] | null;
  expected: Relevance;
}

const TRACKED_COMPANIES: Company[] = [
  {
    id: 1, name: 'Figure AI', tier: 'hot_lead',
    status: null, raised: null, valuation: null, notes: null,
    created_at: '', updated_at: '',
  },
  {
    id: 2, name: 'Stanford IRIS Lab', tier: 'academic',
    status: null, raised: null, valuation: null, notes: null,
    created_at: '', updated_at: '',
  },
  {
    id: 3, name: 'Scale AI', tier: 'competitor',
    status: null, raised: null, valuation: null, notes: null,
    created_at: '', updated_at: '',
  },
];

const CASES: TestCase[] = [
  {
    name: 'Funding > $5M → high',
    type: 'funding',
    title: 'RoboCorp raises $50M Series B',
    summary: '',
    company: 'RoboCorp',
    expected: 'high',
  },
  {
    name: 'Funding < $5M → low',
    type: 'funding',
    title: 'TinyBot raises $2M seed',
    summary: '',
    company: 'TinyBot',
    expected: 'low',
  },
  {
    name: 'Hiring for data role → high',
    type: 'hiring',
    title: 'Senior Data Engineer',
    summary: 'Build the training data pipeline for our robotics stack.',
    company: 'Acme Robotics',
    expected: 'high',
  },
  {
    name: 'Hiring non-data role → low',
    type: 'hiring',
    title: 'Marketing Director',
    summary: 'Lead brand and GTM.',
    company: 'Acme Robotics',
    expected: 'low',
  },
  {
    name: 'PR with zero-coverage tag → high',
    type: 'press_release',
    title: 'Foo announces bar',
    summary: 'Generic text',
    company: 'Foo',
    tags: ['zero-coverage'],
    expected: 'high',
  },
  {
    name: 'PR with data + robotics → high',
    type: 'press_release',
    title: 'Company scales robotics training data to 1M hours',
    summary: 'They built a dataset for humanoid manipulation',
    company: 'SomeCo',
    expected: 'high',
  },
  {
    name: 'Research w/ egocentric + robot → high',
    type: 'research',
    title: 'Egocentric video for robot manipulation',
    summary: 'New benchmark combining egocentric footage with robot arms',
    company: 'Lab X',
    expected: 'high',
  },
  {
    name: 'Research (baseline) → medium',
    type: 'research',
    title: 'Faster SLAM algorithm',
    summary: 'Improvements to LIDAR-based SLAM',
    company: 'Lab X',
    expected: 'medium',
  },
  {
    name: 'Competitor announcement → high',
    type: 'competitor',
    title: 'Scale AI launches RoboData',
    summary: 'New product aimed at humanoid training data',
    company: 'Scale AI',
    expected: 'high',
  },
  {
    name: 'Grant > $1M → high',
    type: 'grant',
    title: 'NSF awards $3.2M for humanoid manipulation research',
    summary: '',
    company: 'Stanford',
    expected: 'high',
  },
  {
    name: 'Tracked hot_lead → high',
    type: 'news',
    title: 'Figure AI partners with OpenAI',
    summary: '',
    company: 'Figure AI',
    expected: 'high',
  },
  {
    name: 'Dataset by academic prospect → high',
    type: 'dataset',
    title: 'New dataset released',
    summary: '',
    company: 'Stanford IRIS Lab',
    expected: 'high',
  },
  {
    name: 'Signal mentions Open X-Embodiment → high',
    type: 'news',
    title: 'New model beats Open X-Embodiment baseline',
    summary: 'Uses cross-embodiment transfer',
    company: 'Foo',
    expected: 'high',
  },
  {
    name: 'News + tracked company → medium',
    type: 'news',
    title: 'Interview with researcher',
    summary: 'About their recent work.',
    company: 'Stanford IRIS Lab',
    expected: 'medium',
  },
  {
    name: 'Generic news → low',
    type: 'news',
    title: 'Random article about general AI',
    summary: 'LLMs are cool',
    company: 'Random Corp',
    expected: 'low',
  },
];

export async function GET() {
  const results = CASES.map((c) => {
    const actual = scoreRelevance(
      c.type,
      c.title,
      c.summary,
      c.tags || null,
      c.company,
      c.rawContent || null,
      TRACKED_COMPANIES
    );
    return {
      name: c.name,
      expected: c.expected,
      actual,
      pass: actual === c.expected,
    };
  });

  // Test dollar extraction
  const dollarTests = [
    { input: '$5M', expected: 5_000_000 },
    { input: '$1.2B', expected: 1_200_000_000 },
    { input: '$500K', expected: 500_000 },
    { input: 'raised $50 million Series B', expected: 50_000_000 },
  ];
  const dollarResults = dollarTests.map((t) => {
    const amounts = extractDollarAmounts(t.input);
    const found = amounts.includes(t.expected);
    return {
      name: `extractDollarAmounts("${t.input}") includes ${t.expected}`,
      expected: t.expected,
      actual: amounts,
      pass: found,
    };
  });

  const all = [...results, ...dollarResults];
  const passed = all.filter((r) => r.pass).length;
  const failed = all.length - passed;

  return NextResponse.json(
    {
      passed,
      failed,
      total: all.length,
      results: all,
    },
    { status: failed === 0 ? 200 : 500 }
  );
}
