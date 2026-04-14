'use client';

import type { StatsResponse } from '@/types/robox-intel';

interface ActionBarProps {
  stats: StatsResponse | null;
}

export function ActionBar({ stats }: ActionBarProps) {
  if (!stats) return null;
  const hasAction = stats.highPriorityCount > 0;

  return (
    <div className="max-w-[1000px] mx-auto px-6 pt-5">
      <div className="flex items-center gap-3 text-[12px]">
        {hasAction && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-[#F87171] font-medium">
              {stats.highPriorityCount} action required
            </span>
            <span className="text-[#52525B]">|</span>
          </div>
        )}
        <span className="font-mono text-[#A1A1AA]">
          {stats.newCount} new · {stats.closedCount} closed ·{' '}
          {stats.activeSourcesCount} sources live
        </span>
      </div>
    </div>
  );
}
