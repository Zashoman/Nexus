'use client';

import type { StatsResponse } from '@/types/robox-intel';

interface HeaderProps {
  activeTab: 'signals' | 'companies' | 'sources' | 'media';
  onTabChange: (tab: 'signals' | 'companies' | 'sources' | 'media') => void;
  stats: StatsResponse | null;
  lastScan?: string;
  onOpenAnalytics?: () => void;
}

const TABS: { key: 'signals' | 'companies' | 'sources' | 'media'; label: string }[] = [
  { key: 'signals', label: 'Signals' },
  { key: 'companies', label: 'Companies' },
  { key: 'sources', label: 'Sources' },
  { key: 'media', label: 'Media' },
];

function timeAgo(iso?: string): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Header({
  activeTab,
  onTabChange,
  stats,
  lastScan,
  onOpenAnalytics,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#09090B]/95 backdrop-blur border-b border-[#27272A]">
      <div className="max-w-[1000px] mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[17px] font-bold tracking-tight text-[#FAFAFA]">
            ROBOX
          </span>
          <span
            className="text-[11px] font-light tracking-[0.3em] text-[#71717A]"
          >
            INTEL
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`px-3 py-1.5 text-[13px] rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#27272A] text-[#FAFAFA]'
                  : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181B]'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {onOpenAnalytics && (
            <button
              onClick={onOpenAnalytics}
              title="Analytics"
              className="ml-1 px-2.5 py-1.5 text-[13px] rounded-md text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181B] transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </button>
          )}
        </nav>
      </div>

      <div className="max-w-[1000px] mx-auto px-6 pb-2 text-[11px] text-[#71717A] font-mono flex gap-4">
        <span>Last scan: {timeAgo(lastScan)}</span>
        <span>·</span>
        <span>{stats?.activeSourcesCount ?? 0} sources active</span>
        <span>·</span>
        <span>{stats?.newCount ?? 0} new signals</span>
      </div>
    </header>
  );
}
