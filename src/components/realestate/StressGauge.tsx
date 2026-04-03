'use client';

import { useState } from 'react';
import { WeeklyData, Baseline } from '@/types/realestate';

interface StressBreakdown {
  label: string;
  score: number;
  maxScore: number;
  detail: string;
}

interface StressResult {
  total: number;
  level: string;
  color: string;
  breakdown: StressBreakdown[];
}

function computeStress(latest: WeeklyData | null, previous: WeeklyData | null, baselines: Map<string, number>): StressResult {
  if (!latest) return { total: 0, level: 'NO DATA', color: '#5A6A7A', breakdown: [] };

  const breakdown: StressBreakdown[] = [];

  // 1. Transaction volume decline (0-20 pts)
  const txBaseline = baselines.get('total_transactions') ?? 4400;
  const txDecline = latest.total_transactions != null
    ? Math.max(0, (1 - latest.total_transactions / txBaseline)) * 100
    : 0;
  const txScore = Math.min(20, txDecline * 0.6);
  breakdown.push({
    label: 'Transaction Volume',
    score: Math.round(txScore * 10) / 10,
    maxScore: 20,
    detail: latest.total_transactions != null
      ? `${latest.total_transactions.toLocaleString()} vs ${txBaseline.toLocaleString()} baseline (${txDecline > 0 ? '-' : ''}${txDecline.toFixed(0)}%)`
      : 'No data',
  });

  // 2. DFM RE Index decline (0-25 pts) — heaviest weight, leading indicator
  const dfmBaseline = baselines.get('dfm_re_index') ?? 16200;
  const dfmDecline = latest.dfm_re_index != null
    ? Math.max(0, (1 - latest.dfm_re_index / dfmBaseline)) * 100
    : 0;
  const dfmScore = Math.min(25, dfmDecline * 0.7);
  breakdown.push({
    label: 'DFM RE Index',
    score: Math.round(dfmScore * 10) / 10,
    maxScore: 25,
    detail: latest.dfm_re_index != null
      ? `${latest.dfm_re_index.toLocaleString()} vs ${dfmBaseline.toLocaleString()} (${dfmDecline > 0 ? '-' : ''}${dfmDecline.toFixed(0)}%)`
      : 'No data',
  });

  // 3. Value decline (0-15 pts) — capital flight signal
  const valBaseline = baselines.get('total_value_aed_billions') ?? 17.2;
  const valDecline = latest.total_value_aed_billions != null
    ? Math.max(0, (1 - latest.total_value_aed_billions / valBaseline)) * 100
    : 0;
  const valScore = Math.min(15, valDecline * 0.4);
  breakdown.push({
    label: 'Transaction Value',
    score: Math.round(valScore * 10) / 10,
    maxScore: 15,
    detail: latest.total_value_aed_billions != null
      ? `AED ${latest.total_value_aed_billions}B vs ${valBaseline}B (${valDecline > 0 ? '-' : ''}${valDecline.toFixed(0)}%)`
      : 'No data',
  });

  // 4. Listing inventory surge (0-15 pts) — supply pressure
  const listBaseline = baselines.get('listing_inventory') ?? 88000;
  const listIncrease = latest.listing_inventory != null
    ? Math.max(0, (latest.listing_inventory / listBaseline - 1)) * 100
    : 0;
  const listScore = Math.min(15, listIncrease * 0.35);
  breakdown.push({
    label: 'Listing Inventory',
    score: Math.round(listScore * 10) / 10,
    maxScore: 15,
    detail: latest.listing_inventory != null
      ? `${latest.listing_inventory.toLocaleString()} vs ${listBaseline.toLocaleString()} (+${listIncrease.toFixed(0)}%)`
      : 'No data',
  });

  // 5. Mortgage decline (0-10 pts) — credit tightening
  const mortBaseline = baselines.get('mortgage_registrations') ?? 1050;
  const mortDecline = latest.mortgage_registrations != null
    ? Math.max(0, (1 - latest.mortgage_registrations / mortBaseline)) * 100
    : 0;
  const mortScore = Math.min(10, mortDecline * 0.25);
  breakdown.push({
    label: 'Mortgage Activity',
    score: Math.round(mortScore * 10) / 10,
    maxScore: 10,
    detail: latest.mortgage_registrations != null
      ? `${latest.mortgage_registrations.toLocaleString()} vs ${mortBaseline.toLocaleString()} (${mortDecline > 0 ? '-' : ''}${mortDecline.toFixed(0)}%)`
      : 'No data',
  });

  // 6. Week-over-week momentum (0-15 pts) — is it getting worse?
  let wowScore = 0;
  let wowDetail = 'No previous week';
  if (previous && latest.total_transactions != null && previous.total_transactions != null) {
    const txWow = ((latest.total_transactions - previous.total_transactions) / previous.total_transactions) * 100;
    const dfmWow = latest.dfm_re_index != null && previous.dfm_re_index != null
      ? ((latest.dfm_re_index - previous.dfm_re_index) / previous.dfm_re_index) * 100
      : 0;
    // Negative momentum adds stress
    const negMomentum = Math.max(0, -txWow) * 0.15 + Math.max(0, -dfmWow) * 0.2;
    wowScore = Math.min(15, negMomentum);
    wowDetail = `Tx WoW: ${txWow > 0 ? '+' : ''}${txWow.toFixed(1)}%, DFM WoW: ${dfmWow > 0 ? '+' : ''}${dfmWow.toFixed(1)}%`;
  }
  breakdown.push({
    label: 'Weekly Momentum',
    score: Math.round(wowScore * 10) / 10,
    maxScore: 15,
    detail: wowDetail,
  });

  const total = Math.round(breakdown.reduce((sum, b) => sum + b.score, 0));

  let level: string;
  let color: string;
  if (total <= 15) { level = 'NORMAL'; color = '#00CC66'; }
  else if (total <= 30) { level = 'ELEVATED'; color = '#88CC00'; }
  else if (total <= 45) { level = 'STRESSED'; color = '#FFB020'; }
  else if (total <= 65) { level = 'HIGH STRESS'; color = '#FF8C00'; }
  else if (total <= 80) { level = 'SEVERE'; color = '#FF4444'; }
  else { level = 'CRISIS'; color = '#CC0000'; }

  return { total, level, color, breakdown };
}

export default function StressGauge({ weeklyData, baselines }: { weeklyData: WeeklyData[]; baselines: Baseline[] }) {
  const [expanded, setExpanded] = useState(false);
  const baselineMap = new Map(baselines.map(b => [b.metric_key, b.baseline_value]));

  const sorted = [...weeklyData].sort((a, b) => new Date(b.week_date).getTime() - new Date(a.week_date).getTime());
  const latest = sorted[0] ?? null;
  const previous = sorted[1] ?? null;

  const stress = computeStress(latest, previous, baselineMap);

  // Build the bar segments
  const segments = 20;
  const filledSegments = Math.round((stress.total / 100) * segments);

  return (
    <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3">
      <div className="flex items-center gap-4">
        {/* Score */}
        <div className="flex-shrink-0 text-center" style={{ minWidth: '72px' }}>
          <div className="text-3xl font-mono font-bold" style={{ color: stress.color }}>
            {stress.total}
          </div>
          <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: stress.color }}>
            {stress.level}
          </div>
        </div>

        {/* Bar + label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#5A6A7A]">
              RE Stress Index
            </span>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] font-mono text-[#4488FF] hover:text-[#6699FF]"
            >
              {expanded ? 'Hide' : 'Breakdown'}
            </button>
          </div>
          {/* Segmented bar */}
          <div className="flex gap-[2px]">
            {Array.from({ length: segments }).map((_, i) => {
              let segColor = '#1E2A3A';
              if (i < filledSegments) {
                const pct = (i / segments) * 100;
                if (pct < 20) segColor = '#00CC66';
                else if (pct < 35) segColor = '#88CC00';
                else if (pct < 50) segColor = '#FFB020';
                else if (pct < 70) segColor = '#FF8C00';
                else segColor = '#FF4444';
              }
              return (
                <div
                  key={i}
                  className="h-2.5 flex-1 rounded-[1px]"
                  style={{ backgroundColor: segColor }}
                />
              );
            })}
          </div>
          {/* Scale labels */}
          <div className="flex justify-between mt-0.5">
            <span className="text-[8px] font-mono text-[#5A6A7A]">0 NORMAL</span>
            <span className="text-[8px] font-mono text-[#5A6A7A]">50 STRESSED</span>
            <span className="text-[8px] font-mono text-[#5A6A7A]">100 CRISIS</span>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#1E2A3A] grid grid-cols-2 md:grid-cols-3 gap-2">
          {stress.breakdown.map((b) => (
            <div key={b.label} className="bg-[#0B0E11] rounded-sm p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-mono text-[#5A6A7A] uppercase">{b.label}</span>
                <span className="text-[10px] font-mono font-semibold" style={{
                  color: b.score / b.maxScore > 0.6 ? '#FF4444' : b.score / b.maxScore > 0.3 ? '#FFB020' : '#00CC66'
                }}>
                  {b.score}/{b.maxScore}
                </span>
              </div>
              {/* Mini bar */}
              <div className="h-1 bg-[#1E2A3A] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(b.score / b.maxScore) * 100}%`,
                    backgroundColor: b.score / b.maxScore > 0.6 ? '#FF4444' : b.score / b.maxScore > 0.3 ? '#FFB020' : '#00CC66',
                  }}
                />
              </div>
              <div className="text-[8px] font-mono text-[#5A6A7A] mt-1">{b.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
