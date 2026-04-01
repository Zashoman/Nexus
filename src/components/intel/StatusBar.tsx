'use client';

import { useEffect, useState } from 'react';

interface Stats {
  total_ingested: number;
  passed_filter: number;
  high_priority: number;
}

interface SourceHealth {
  id: string;
  name: string;
  tier: number;
  is_active: boolean;
  last_fetched_at: string | null;
  error_count: number;
  latest_fetch: {
    items_fetched: number;
    items_new: number;
    error_message: string | null;
    created_at: string;
  } | null;
}

export default function StatusBar() {
  const [stats, setStats] = useState<Stats>({
    total_ingested: 0,
    passed_filter: 0,
    high_priority: 0,
  });
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [sources, setSources] = useState<SourceHealth[]>([]);
  const [activeSources, setActiveSources] = useState(0);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch('/api/intel/items?limit=1');
      const data = await res.json();
      if (data.stats) setStats(data.stats);

      const srcRes = await fetch('/api/intel/sources');
      const srcData = await srcRes.json();
      if (srcData.sources) {
        setSources(srcData.sources);
        setActiveSources(srcData.sources.filter((s: SourceHealth) => s.is_active).length);
        const latest = srcData.sources
          .filter((s: SourceHealth) => s.last_fetched_at)
          .sort((a: SourceHealth, b: SourceHealth) =>
            new Date(b.last_fetched_at!).getTime() - new Date(a.last_fetched_at!).getTime()
          )[0];
        if (latest?.last_fetched_at) {
          setLastFetch(latest.last_fetched_at);
        }
      }
    } catch {
      // Silent fail
    }
  }

  const timeSince = lastFetch
    ? `${Math.round((Date.now() - new Date(lastFetch).getTime()) / 60000)}m ago`
    : 'never';

  return (
    <div className="border-b border-[#1E2A3A] bg-[#0D1117]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-1.5 flex items-center gap-4 text-xs font-mono text-[#8899AA] hover:text-[#E8EAED] transition-colors cursor-pointer"
      >
        <span>
          ITEMS: <span className="text-[#E8EAED]">{stats.total_ingested}</span> ingested
        </span>
        <span className="text-[#1E2A3A]">|</span>
        <span>
          <span className="text-[#E8EAED]">{stats.passed_filter}</span> passed filter
        </span>
        <span className="text-[#1E2A3A]">|</span>
        <span>
          <span className="text-[#FF8C00]">{stats.high_priority}</span> high priority
        </span>
        <span className="text-[#1E2A3A]">|</span>
        <span>
          LAST FETCH: <span className="text-[#E8EAED]">{timeSince}</span>
        </span>
        <span className="text-[#1E2A3A]">|</span>
        <span>
          SOURCES: <span className="text-[#00CC66]">{activeSources}</span> active
        </span>
        <span className="ml-auto text-[#5A6A7A]">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 border-t border-[#1E2A3A] max-h-60 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 mt-2">
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-2 text-xs font-mono py-0.5"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    source.error_count > 3
                      ? 'bg-[#FF4444]'
                      : source.is_active
                      ? 'bg-[#00CC66]'
                      : 'bg-[#666666]'
                  }`}
                />
                <span className={`${
                  source.tier === 1
                    ? 'text-[#00CC66]'
                    : source.tier === 2
                    ? 'text-[#4488FF]'
                    : 'text-[#888888]'
                }`}>
                  T{source.tier}
                </span>
                <span className="text-[#8899AA] truncate">{source.name}</span>
                {source.latest_fetch?.error_message && (
                  <span className="text-[#FF4444] truncate text-[10px]">
                    ERR
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
