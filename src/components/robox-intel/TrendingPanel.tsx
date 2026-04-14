'use client';

import { useEffect, useState } from 'react';
import type { CompanyTier } from '@/types/robox-intel';
import { TIER_COLORS } from '@/types/robox-intel';

interface TrendingCompany {
  company: string;
  tier: CompanyTier | null;
  signalCount: number;
  highCount: number;
  typeCounts: Record<string, number>;
  latest: {
    title: string;
    source: string;
    url: string;
    date: string;
  } | null;
}

interface TrendingResponse {
  periodDays: number;
  trending: TrendingCompany[];
}

interface TrendingPanelProps {
  onCompanyClick: (company: string) => void;
}

export function TrendingPanel({ onCompanyClick }: TrendingPanelProps) {
  const [data, setData] = useState<TrendingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await fetch('/api/robox-intel/trending');
      const d = await res.json();
      if (!cancelled) {
        setData(d);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="text-[12px] text-[#71717A] py-4">Loading trending...</div>
    );
  }
  if (!data || data.trending.length === 0) return null;

  return (
    <div className="rounded-lg border border-[#27272A] bg-[#0F0F11] p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-semibold tracking-[0.2em] text-[#71717A]">
          TRENDING (LAST {data.periodDays} DAYS)
        </h3>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {data.trending.slice(0, 8).map((c) => (
          <button
            key={c.company}
            onClick={() => onCompanyClick(c.company)}
            className="text-left rounded-md border border-[#27272A] bg-[#151517] hover:bg-[#1A1A1D] p-3 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[13px] font-semibold text-[#FAFAFA] truncate">
                {c.company}
              </span>
              {c.tier && (
                <span
                  className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: `${TIER_COLORS[c.tier]}20`,
                    color: TIER_COLORS[c.tier],
                  }}
                >
                  {c.tier.replace('_', ' ')}
                </span>
              )}
            </div>
            <div className="flex gap-3 text-[10px] text-[#71717A] font-mono mb-1">
              <span>
                <span className="text-[#F87171]">{c.highCount}</span> high
              </span>
              <span>
                <span className="text-[#D4D4D8]">{c.signalCount}</span> total
              </span>
            </div>
            {c.latest && (
              <p className="text-[11px] text-[#A1A1AA] line-clamp-2 leading-snug">
                {c.latest.title}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
