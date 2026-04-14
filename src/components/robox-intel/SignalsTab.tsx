'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import type { Signal, SignalType, SignalStatus } from '@/types/robox-intel';
import {
  SIGNAL_COLORS,
  SIGNAL_TYPE_LABELS,
  SIGNAL_TYPE_ICONS,
  STATUS_ORDER,
  RELEVANCE_ORDER,
} from '@/types/robox-intel';

interface SignalsTabProps {
  signals: Signal[];
  onUpdate: () => void;
  highlightSignalId?: number | null;
  companyFilter?: string | null;
  onClearCompanyFilter?: () => void;
}

const TYPES: SignalType[] = [
  'funding', 'hiring', 'press_release', 'research', 'competitor',
  'dataset', 'grant', 'quote', 'social', 'conference', 'news',
];

const STATUS_OPTIONS: { key: SignalStatus; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'reviewing', label: 'Reviewing' },
  { key: 'queued', label: 'Queued' },
  { key: 'acted', label: 'Acted On' },
];

const STATUS_COLORS: Record<SignalStatus, string> = {
  new: '#3b82f6',
  reviewing: '#f59e0b',
  queued: '#a855f7',
  acted: '#22c55e',
  dismissed: '#64748b',
};

function buildExportUrl(
  typeFilter: SignalType | 'all',
  highOnly: boolean
): string {
  const params = new URLSearchParams({ format: 'csv' });
  if (typeFilter !== 'all') params.set('type', typeFilter);
  if (highOnly) params.set('relevance', 'high');
  return `/api/robox-intel/export?${params.toString()}`;
}

export function SignalsTab({
  signals,
  onUpdate,
  highlightSignalId,
  companyFilter,
  onClearCompanyFilter,
}: SignalsTabProps) {
  const [typeFilter, setTypeFilter] = useState<SignalType | 'all'>('all');
  const [highOnly, setHighOnly] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Global "/" shortcut to focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Auto-expand highlighted signal — syncing external prop to internal state
  useEffect(() => {
    if (highlightSignalId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedIds((prev) => new Set(prev).add(highlightSignalId));
      const el = document.getElementById(`signal-${highlightSignalId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightSignalId]);

  const filtered = useMemo(() => {
    let result = signals;
    if (companyFilter) {
      const needle = companyFilter.toLowerCase();
      result = result.filter((s) => s.company.toLowerCase().includes(needle));
    }
    if (typeFilter !== 'all') result = result.filter((s) => s.type === typeFilter);
    if (highOnly) result = result.filter((s) => s.relevance === 'high');
    if (!showClosed) result = result.filter((s) => s.status !== 'dismissed');
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      result = result.filter((s) => {
        return (
          s.title.toLowerCase().includes(needle) ||
          s.company.toLowerCase().includes(needle) ||
          s.summary.toLowerCase().includes(needle) ||
          (s.tags || []).some((t) => t.toLowerCase().includes(needle))
        );
      });
    }

    // Sort by status then relevance
    return [...result].sort((a, b) => {
      const statusDiff =
        STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      if (statusDiff !== 0) return statusDiff;
      return RELEVANCE_ORDER.indexOf(a.relevance) - RELEVANCE_ORDER.indexOf(b.relevance);
    });
  }, [signals, typeFilter, highOnly, showClosed, companyFilter, search]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateSignal = async (id: number, updates: Partial<Signal>) => {
    await fetch(`/api/robox-intel/signals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    onUpdate();
  };

  const dismissSignal = async (id: number) => {
    await updateSignal(id, { status: 'dismissed' });
  };

  const reopenSignal = async (id: number) => {
    await updateSignal(id, { status: 'new' });
  };

  const dismissFilteredNew = async (ids: number[]) => {
    if (ids.length === 0) return;
    if (
      !confirm(
        `Dismiss ${ids.length} signal${ids.length === 1 ? '' : 's'}? You can restore them from "Show closed".`
      )
    ) {
      return;
    }
    await fetch('/api/robox-intel/signals/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, status: 'dismissed' }),
    });
    onUpdate();
  };

  return (
    <div className="space-y-4">
      {companyFilter && (
        <div className="flex items-center gap-2 text-[12px] bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-md px-3 py-2">
          <span className="text-[#A1A1AA]">Filtering by company:</span>
          <span className="text-[#FAFAFA] font-medium">{companyFilter}</span>
          {onClearCompanyFilter && (
            <button
              onClick={onClearCompanyFilter}
              className="ml-auto text-[#71717A] hover:text-[#FAFAFA] text-[14px] px-1.5"
              title="Clear filter"
            >
              ×
            </button>
          )}
        </div>
      )}
      {/* Filter bar */}
      <div className="space-y-3">
        <div className="relative">
          <input
            ref={searchRef}
            type="text"
            placeholder="Search title, company, summary, tags... ( / to focus)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 pl-9 bg-[#0B0B0D] border border-[#27272A] rounded-md text-[12px] text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:border-[#3F3F46]"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA] w-5 h-5 flex items-center justify-center rounded hover:bg-[#27272A]"
            >
              ×
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterButton
            active={typeFilter === 'all'}
            onClick={() => setTypeFilter('all')}
            label="All"
          />
          {TYPES.map((t) => (
            <FilterButton
              key={t}
              active={typeFilter === t}
              onClick={() => setTypeFilter(t)}
              label={SIGNAL_TYPE_LABELS[t]}
              color={SIGNAL_COLORS[t]}
              icon={SIGNAL_TYPE_ICONS[t]}
            />
          ))}
        </div>

        <div className="flex gap-4 text-[12px] items-center">
          <label className="flex items-center gap-2 cursor-pointer text-[#A1A1AA] hover:text-[#FAFAFA]">
            <input
              type="checkbox"
              checked={highOnly}
              onChange={(e) => setHighOnly(e.target.checked)}
              className="accent-[#EF4444]"
            />
            High priority only
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-[#A1A1AA] hover:text-[#FAFAFA]">
            <input
              type="checkbox"
              checked={showClosed}
              onChange={(e) => setShowClosed(e.target.checked)}
              className="accent-[#EF4444]"
            />
            Show closed
          </label>
          <div className="ml-auto flex items-center gap-1">
            {filtered.length > 0 && filtered.some((s) => s.status === 'new') && (
              <button
                onClick={() =>
                  dismissFilteredNew(
                    filtered.filter((s) => s.status === 'new').map((s) => s.id)
                  )
                }
                className="text-[11px] text-[#71717A] hover:text-[#F87171] px-2 py-1 rounded hover:bg-[#F87171]/10 transition-colors"
                title="Dismiss all new signals matching current filters"
              >
                Dismiss filtered
              </button>
            )}
            <a
              href={buildExportUrl(typeFilter, highOnly)}
              className="text-[11px] text-[#60A5FA] hover:text-[#93C5FD] px-2 py-1 rounded hover:bg-[#60A5FA]/10 transition-colors"
              title="Download filtered signals as CSV"
            >
              Export CSV
            </a>
          </div>
        </div>
      </div>

      {/* Signal cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[#71717A] text-[13px]">
          No signals matching current filters.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              expanded={expandedIds.has(signal.id)}
              onToggle={() => toggleExpand(signal.id)}
              onDismiss={() => dismissSignal(signal.id)}
              onReopen={() => reopenSignal(signal.id)}
              onUpdate={(updates) => updateSignal(signal.id, updates)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
  color,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
  icon?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-[11px] rounded-md border transition-all flex items-center gap-1.5 ${
        active
          ? 'bg-[#27272A] border-[#3F3F46] text-[#FAFAFA]'
          : 'bg-[#0F0F11] border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#3F3F46]'
      }`}
      style={active && color ? { borderColor: color } : undefined}
    >
      {icon && (
        <span
          className="inline-block w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-[9px] font-bold"
          style={{ backgroundColor: color ? `${color}30` : '#27272A', color }}
        >
          {icon}
        </span>
      )}
      {label}
    </button>
  );
}

function SignalCard({
  signal,
  expanded,
  onToggle,
  onDismiss,
  onReopen,
  onUpdate,
}: {
  signal: Signal;
  expanded: boolean;
  onToggle: () => void;
  onDismiss: () => void;
  onReopen: () => void;
  onUpdate: (updates: Partial<Signal>) => void;
}) {
  const color = SIGNAL_COLORS[signal.type];
  const isDismissed = signal.status === 'dismissed';
  const isActed = signal.status === 'acted';

  const bgClass =
    signal.status === 'new'
      ? 'bg-[#131316]'
      : isDismissed || isActed
        ? 'bg-[#0D0D10]'
        : 'bg-[#101013]';

  return (
    <div
      id={`signal-${signal.id}`}
      className={`rounded-md border border-[#27272A] ${bgClass} transition-all ${
        isDismissed ? 'opacity-45' : ''
      }`}
      style={{ borderLeftWidth: '3px', borderLeftColor: color }}
    >
      {/* Collapsed header */}
      <div
        className="p-3 flex items-start gap-3 cursor-pointer"
        onClick={onToggle}
      >
        <div
          className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center text-[11px] font-bold mt-0.5"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {SIGNAL_TYPE_ICONS[signal.type]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color }}
            >
              {SIGNAL_TYPE_LABELS[signal.type]}
            </span>
            {signal.relevance === 'high' && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#EF4444]/15 text-[#F87171] tracking-wider">
                HIGH
              </span>
            )}
            <span className="text-[10px] text-[#71717A] font-mono">
              {signal.date}
            </span>
          </div>
          <h3 className="text-[14px] font-medium text-[#FAFAFA] leading-snug">
            {signal.title}
          </h3>
          <p className="text-[11px] text-[#71717A] mt-1">
            <span className="text-[#A1A1AA]">{signal.company}</span>
            {' · '}
            {signal.source}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <a
            href={signal.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] text-[#60A5FA] hover:text-[#93C5FD] px-2 py-1 rounded hover:bg-[#60A5FA]/10 transition-colors"
          >
            Open ↗
          </a>
          {isDismissed ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReopen();
              }}
              className="text-[11px] text-[#A1A1AA] hover:text-[#FAFAFA] px-2 py-1 rounded hover:bg-[#27272A] transition-colors"
            >
              Reopen
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="text-[14px] text-[#52525B] hover:text-[#F87171] w-6 h-6 flex items-center justify-center rounded hover:bg-[#F87171]/10 transition-colors"
              title="Dismiss"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[#27272A] p-3 space-y-3">
          <p className="text-[12px] text-[#D4D4D8] leading-relaxed">
            {signal.summary}
          </p>

          <div className="rounded-md bg-[#4ADE80]/10 border border-[#4ADE80]/20 p-3">
            <p className="text-[9px] font-semibold tracking-[0.2em] text-[#4ADE80] mb-1.5">
              SUGGESTED ACTION
            </p>
            <p className="text-[12px] text-[#E4E4E7] leading-relaxed">
              {signal.suggested_action}
            </p>
          </div>

          {signal.tags && signal.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {signal.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] text-[#A1A1AA] font-mono"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 pt-1">
            <span className="text-[10px] text-[#71717A] mr-2">STATUS:</span>
            {STATUS_OPTIONS.map((opt) => {
              const isActive = signal.status === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => onUpdate({ status: opt.key })}
                  className={`text-[11px] px-2 py-1 rounded transition-all ${
                    isActive
                      ? 'text-[#FAFAFA] font-medium'
                      : 'text-[#71717A] hover:text-[#D4D4D8]'
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: `${STATUS_COLORS[opt.key]}20`,
                          borderLeft: `2px solid ${STATUS_COLORS[opt.key]}`,
                        }
                      : undefined
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
