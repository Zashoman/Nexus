'use client';

import { useState } from 'react';
import type { Company, CompanyTier } from '@/types/robox-intel';
import { TIER_COLORS } from '@/types/robox-intel';
import { TrendingPanel } from './TrendingPanel';
import { AddCompanyModal } from './AddCompanyModal';

interface CompaniesTabProps {
  companies: Company[];
  onCompanyClick?: (company: Company) => void;
  onCompaniesUpdated?: () => void;
}

const TIER_LABELS: Record<CompanyTier, string> = {
  hot_lead: 'Hot Lead',
  prospect: 'Prospect',
  academic: 'Academic',
  competitor: 'Competitor',
};

export function CompaniesTab({
  companies,
  onCompanyClick,
  onCompaniesUpdated,
}: CompaniesTabProps) {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<CompanyTier | 'all'>('all');
  const [addOpen, setAddOpen] = useState(false);

  const filtered = companies.filter((c) => {
    if (tierFilter !== 'all' && c.tier !== tierFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleTrendingClick = (companyName: string) => {
    if (onCompanyClick) {
      // Find matching tracked company, else synthesize one
      const tracked = companies.find(
        (c) => c.name.toLowerCase() === companyName.toLowerCase()
      );
      if (tracked) {
        onCompanyClick(tracked);
      } else {
        // Fallback: pass a stub Company-shaped object
        onCompanyClick({
          id: -1,
          name: companyName,
          tier: 'prospect',
          status: null,
          raised: null,
          valuation: null,
          notes: null,
          created_at: '',
          updated_at: '',
          signal_count: 0,
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      {onCompanyClick && (
        <TrendingPanel onCompanyClick={handleTrendingClick} />
      )}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          <TierFilterButton
            active={tierFilter === 'all'}
            onClick={() => setTierFilter('all')}
            label="All"
          />
          {(Object.keys(TIER_LABELS) as CompanyTier[]).map((tier) => (
            <TierFilterButton
              key={tier}
              active={tierFilter === tier}
              onClick={() => setTierFilter(tier)}
              label={TIER_LABELS[tier]}
              color={TIER_COLORS[tier]}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 bg-[#0B0B0D] border border-[#27272A] rounded-md text-[12px] text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:border-[#3F3F46] w-40"
          />
          {onCompaniesUpdated && (
            <button
              onClick={() => setAddOpen(true)}
              className="px-3 py-1.5 text-[12px] rounded-md bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#60A5FA] hover:bg-[#3B82F6]/20 transition-colors"
            >
              + Add
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-[#27272A] overflow-x-auto">
        <table className="w-full text-[12px] min-w-[640px]">
          <thead>
            <tr className="bg-[#18181B] border-b border-[#27272A]">
              <th className="text-left px-3 py-2.5 font-semibold text-[#A1A1AA] tracking-wide">
                Company
              </th>
              <th className="text-left px-3 py-2.5 font-semibold text-[#A1A1AA] tracking-wide">
                Tier
              </th>
              <th className="text-left px-3 py-2.5 font-semibold text-[#A1A1AA] tracking-wide">
                Status
              </th>
              <th className="text-left px-3 py-2.5 font-semibold text-[#A1A1AA] tracking-wide">
                Raised
              </th>
              <th className="text-left px-3 py-2.5 font-semibold text-[#A1A1AA] tracking-wide">
                Valuation
              </th>
              <th className="text-right px-3 py-2.5 font-semibold text-[#A1A1AA] tracking-wide">
                Signals
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, idx) => {
              const clickable = onCompanyClick && (c.signal_count ?? 0) > 0;
              return (
              <tr
                key={c.id}
                onClick={clickable ? () => onCompanyClick!(c) : undefined}
                className={`border-b border-[#1C1C1F] last:border-b-0 ${
                  idx % 2 === 0 ? 'bg-[#0F0F11]' : 'bg-[#131316]'
                } ${clickable ? 'cursor-pointer hover:bg-[#1A1A1D]' : ''}`}
              >
                <td className="px-3 py-2.5 text-[#FAFAFA] font-medium">
                  {c.name}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${TIER_COLORS[c.tier]}20`,
                      color: TIER_COLORS[c.tier],
                    }}
                  >
                    {TIER_LABELS[c.tier]}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-[#A1A1AA]">
                  {c.status || '—'}
                </td>
                <td className="px-3 py-2.5 text-[#D4D4D8] font-mono">
                  {c.raised || '—'}
                </td>
                <td className="px-3 py-2.5 text-[#D4D4D8] font-mono">
                  {c.valuation || '—'}
                </td>
                <td className="px-3 py-2.5 text-right text-[#A1A1AA] font-mono">
                  {c.signal_count ?? 0}
                  {clickable && (
                    <span className="ml-1 text-[#60A5FA]">→</span>
                  )}
                </td>
              </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[#71717A]">
                  No companies matching filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {onCompaniesUpdated && (
        <AddCompanyModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onAdded={onCompaniesUpdated}
        />
      )}
    </div>
  );
}

function TierFilterButton({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-[11px] rounded-md border transition-all ${
        active
          ? 'bg-[#27272A] border-[#3F3F46] text-[#FAFAFA]'
          : 'bg-[#0F0F11] border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]'
      }`}
      style={active && color ? { borderColor: color, color } : undefined}
    >
      {label}
    </button>
  );
}
