'use client';

import { useState } from 'react';
import type { Source, SourceCategory } from '@/types/robox-intel';

interface SourcesTabProps {
  sources: Source[];
  onUpdate: () => void;
}

const CATEGORIES: { key: SourceCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'news', label: 'News' },
  { key: 'research', label: 'Research' },
  { key: 'pr_wires', label: 'PR Wires' },
  { key: 'funding', label: 'Funding' },
  { key: 'datasets', label: 'Datasets' },
  { key: 'social', label: 'Social' },
  { key: 'grants', label: 'Grants' },
  { key: 'events', label: 'Events' },
  { key: 'hiring', label: 'Hiring' },
  { key: 'quotes', label: 'Quotes' },
];

const STATUS_DOT_COLORS = {
  active: '#22c55e',
  paused: '#f59e0b',
  not_connected: '#52525B',
};

const TYPE_BADGE_COLORS = {
  free: { bg: '#22c55e20', color: '#4ADE80', label: 'Free' },
  manual: { bg: '#f59e0b20', color: '#FBBF24', label: 'Manual' },
  paid: { bg: '#6B728020', color: '#A1A1AA', label: 'Paid' },
};

export function SourcesTab({ sources, onUpdate }: SourcesTabProps) {
  const [category, setCategory] = useState<SourceCategory | 'all'>('all');
  const [fetchingId, setFetchingId] = useState<number | null>(null);

  const filtered = sources.filter(
    (s) => category === 'all' || s.category === category
  );

  const toggleSource = async (source: Source) => {
    const newStatus =
      source.status === 'active'
        ? 'paused'
        : source.status === 'paused'
          ? 'active'
          : 'active';
    await fetch(`/api/robox-intel/sources/${source.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    onUpdate();
  };

  const fetchSource = async (source: Source) => {
    setFetchingId(source.id);
    try {
      await fetch(`/api/robox-intel/sources/${source.id}/fetch`, {
        method: 'POST',
      });
      onUpdate();
    } finally {
      setFetchingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`px-2.5 py-1 text-[11px] rounded-md border transition-all ${
              category === cat.key
                ? 'bg-[#27272A] border-[#3F3F46] text-[#FAFAFA]'
                : 'bg-[#0F0F11] border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sources list */}
      <div className="space-y-2">
        {filtered.map((source) => {
          const typeBadge = TYPE_BADGE_COLORS[source.type];
          return (
            <div
              key={source.id}
              className="flex items-start gap-3 p-3 rounded-md border border-[#27272A] bg-[#0F0F11] hover:bg-[#131316] transition-colors"
            >
              <div
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{ backgroundColor: STATUS_DOT_COLORS[source.status] }}
                title={source.status}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium text-[#FAFAFA]">
                    {source.name}
                  </span>
                  <span className="text-[10px] text-[#52525B] font-mono">
                    ({source.signal_count} signals)
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-semibold tracking-wider"
                    style={{
                      backgroundColor: typeBadge.bg,
                      color: typeBadge.color,
                    }}
                  >
                    {source.cost ? source.cost : typeBadge.label}
                  </span>
                  <span className="text-[10px] text-[#52525B] uppercase tracking-wider">
                    {source.category.replace('_', ' ')}
                  </span>
                </div>
                {source.description && (
                  <p className="text-[11px] text-[#71717A] mt-1 leading-relaxed">
                    {source.description}
                  </p>
                )}
                {source.last_fetched && (
                  <p className="text-[10px] text-[#52525B] mt-1 font-mono">
                    Last: {new Date(source.last_fetched).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {source.type === 'free' && source.status === 'active' && (
                  <button
                    onClick={() => fetchSource(source)}
                    disabled={fetchingId === source.id}
                    className="text-[10px] px-2 py-1 rounded border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#3F3F46] disabled:opacity-50"
                  >
                    {fetchingId === source.id ? 'Fetching...' : 'Fetch'}
                  </button>
                )}
                {source.status !== 'not_connected' && (
                  <button
                    onClick={() => toggleSource(source)}
                    className="text-[10px] px-2 py-1 rounded border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#3F3F46]"
                  >
                    {source.status === 'active' ? 'Pause' : 'Resume'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upgrade path callout */}
      <div className="mt-6 rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/5 p-4">
        <h3 className="text-[12px] font-semibold text-[#60A5FA] mb-2 tracking-wide">
          UPGRADE PATH
        </h3>
        <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
          All currently active sources are free. Add paid sources only when you
          consistently miss signals that matter:
        </p>
        <ul className="mt-2 space-y-1 text-[11px] text-[#A1A1AA]">
          <li>
            <span className="text-[#D4D4D8]">LinkedIn Sales Navigator (+$99/mo):</span>{' '}
            better job posting coverage, direct prospect filters.
          </li>
          <li>
            <span className="text-[#D4D4D8]">Crunchbase Pro (+$49/mo):</span>{' '}
            earlier funding detection, structured round data.
          </li>
          <li>
            <span className="text-[#D4D4D8]">PitchBook (+$20K/yr):</span> only
            justified post-revenue when you need deal flow predictions.
          </li>
        </ul>
      </div>
    </div>
  );
}
