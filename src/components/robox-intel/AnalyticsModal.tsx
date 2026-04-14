'use client';

import { useEffect, useState } from 'react';
import type { SignalType } from '@/types/robox-intel';
import { SIGNAL_COLORS, SIGNAL_TYPE_LABELS } from '@/types/robox-intel';

interface AnalyticsData {
  periodDays: number;
  total: number;
  perDay: Record<string, number>;
  byType: Record<string, number>;
  byRelevance: Record<string, number>;
  bySource: Record<string, number>;
  byStatus: Record<string, number>;
  funnel: {
    ingested: number;
    reviewed: number;
    actionable: number;
    acted: number;
  };
  timeToAction: Record<string, number>;
}

interface AnalyticsModalProps {
  open: boolean;
  onClose: () => void;
}

export function AnalyticsModal({ open, onClose }: AnalyticsModalProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/robox-intel/analytics')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#131316] border border-[#27272A] rounded-lg w-full max-w-3xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#131316] border-b border-[#27272A] px-5 py-3 flex items-center justify-between z-10">
          <div>
            <h2 className="text-[14px] font-semibold text-[#FAFAFA]">
              Analytics
            </h2>
            <p className="text-[10px] text-[#71717A] mt-0.5 tracking-wider">
              LAST {data?.periodDays ?? 30} DAYS
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#71717A] hover:text-[#FAFAFA] text-xl w-7 h-7 flex items-center justify-center rounded hover:bg-[#27272A]"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-6">
          {loading || !data ? (
            <div className="text-center py-12 text-[#71717A] text-[12px]">
              Loading analytics...
            </div>
          ) : (
            <>
              <FunnelSection funnel={data.funnel} />
              <PerDaySection perDay={data.perDay} />
              <TypeBreakdownSection byType={data.byType} total={data.total} />
              <RelevanceSection byRelevance={data.byRelevance} />
              <TimeToActionSection buckets={data.timeToAction} />
              <TopSourcesSection bySource={data.bySource} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FunnelSection({ funnel }: { funnel: AnalyticsData['funnel'] }) {
  const stages = [
    { label: 'Ingested', value: funnel.ingested, color: '#60A5FA' },
    { label: 'Reviewed', value: funnel.reviewed, color: '#A855F7' },
    { label: 'Actionable', value: funnel.actionable, color: '#F59E0B' },
    { label: 'Acted', value: funnel.acted, color: '#22C55E' },
  ];
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <section>
      <h3 className="text-[10px] font-semibold tracking-[0.2em] text-[#71717A] mb-3">
        FUNNEL
      </h3>
      <div className="space-y-2">
        {stages.map((stage) => (
          <div key={stage.label} className="flex items-center gap-3">
            <span className="text-[11px] text-[#A1A1AA] w-20">
              {stage.label}
            </span>
            <div className="flex-1 h-6 bg-[#0B0B0D] rounded-sm overflow-hidden relative">
              <div
                className="h-full transition-all"
                style={{
                  width: `${(stage.value / max) * 100}%`,
                  backgroundColor: `${stage.color}30`,
                  borderRight: `2px solid ${stage.color}`,
                }}
              />
              <span className="absolute inset-0 flex items-center px-2 text-[11px] font-mono text-[#FAFAFA]">
                {stage.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PerDaySection({ perDay }: { perDay: Record<string, number> }) {
  const entries = Object.entries(perDay);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <section>
      <h3 className="text-[10px] font-semibold tracking-[0.2em] text-[#71717A] mb-3">
        SIGNALS PER DAY
      </h3>
      <div className="flex items-end gap-0.5 h-24">
        {entries.map(([date, count]) => (
          <div
            key={date}
            className="flex-1 bg-[#3B82F6]/30 border-t-2 border-[#3B82F6] relative group"
            style={{ height: `${(count / max) * 100}%`, minHeight: '2px' }}
            title={`${date}: ${count}`}
          >
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-[#60A5FA] font-mono opacity-0 group-hover:opacity-100 whitespace-nowrap">
              {count}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-[#52525B] font-mono mt-1.5">
        <span>{entries[0]?.[0]}</span>
        <span>{entries[entries.length - 1]?.[0]}</span>
      </div>
    </section>
  );
}

function TypeBreakdownSection({
  byType,
  total,
}: {
  byType: Record<string, number>;
  total: number;
}) {
  const sorted = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  if (total === 0) return null;

  return (
    <section>
      <h3 className="text-[10px] font-semibold tracking-[0.2em] text-[#71717A] mb-3">
        BY TYPE
      </h3>
      <div className="space-y-1.5">
        {sorted.map(([type, count]) => {
          const color = SIGNAL_COLORS[type as SignalType] || '#64748b';
          const label = SIGNAL_TYPE_LABELS[type as SignalType] || type;
          const pct = (count / total) * 100;
          return (
            <div key={type} className="flex items-center gap-3">
              <span
                className="text-[11px] w-24"
                style={{ color }}
              >
                {label}
              </span>
              <div className="flex-1 h-4 bg-[#0B0B0D] rounded-sm overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: `${color}40`,
                    borderRight: `2px solid ${color}`,
                  }}
                />
              </div>
              <span className="text-[11px] text-[#A1A1AA] font-mono w-12 text-right">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RelevanceSection({
  byRelevance,
}: {
  byRelevance: Record<string, number>;
}) {
  const items = [
    { key: 'high', label: 'High', color: '#F87171' },
    { key: 'medium', label: 'Medium', color: '#FBBF24' },
    { key: 'low', label: 'Low', color: '#A1A1AA' },
  ];
  const total = items.reduce((sum, i) => sum + (byRelevance[i.key] || 0), 0);

  return (
    <section>
      <h3 className="text-[10px] font-semibold tracking-[0.2em] text-[#71717A] mb-3">
        BY RELEVANCE
      </h3>
      <div className="flex gap-2">
        {items.map((item) => {
          const count = byRelevance[item.key] || 0;
          const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
          return (
            <div
              key={item.key}
              className="flex-1 rounded-md border p-3"
              style={{
                borderColor: `${item.color}30`,
                backgroundColor: `${item.color}08`,
              }}
            >
              <div
                className="text-[10px] font-semibold tracking-wider uppercase"
                style={{ color: item.color }}
              >
                {item.label}
              </div>
              <div className="text-[22px] font-bold text-[#FAFAFA] font-mono mt-1">
                {count}
              </div>
              <div className="text-[10px] text-[#71717A] font-mono">
                {pct}%
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TimeToActionSection({
  buckets,
}: {
  buckets: Record<string, number>;
}) {
  const keys = ['< 1h', '1-4h', '4-24h', '1-3d', '> 3d'];
  const total = Object.values(buckets).reduce((s, v) => s + v, 0);
  const max = Math.max(...Object.values(buckets), 1);

  return (
    <section>
      <h3 className="text-[10px] font-semibold tracking-[0.2em] text-[#71717A] mb-3">
        TIME TO ACTION
      </h3>
      {total === 0 ? (
        <p className="text-[11px] text-[#71717A]">
          No signals have been acted on yet.
        </p>
      ) : (
        <div className="grid grid-cols-5 gap-1.5">
          {keys.map((k) => {
            const v = buckets[k] || 0;
            return (
              <div key={k} className="text-center">
                <div
                  className="h-16 bg-[#22C55E]/20 border-t-2 border-[#22C55E] rounded-sm relative"
                  style={{ height: `${(v / max) * 64 + 8}px` }}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-mono text-[#FAFAFA]">
                    {v}
                  </span>
                </div>
                <div className="text-[10px] text-[#71717A] mt-1 font-mono">
                  {k}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function TopSourcesSection({
  bySource,
}: {
  bySource: Record<string, number>;
}) {
  const sorted = Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  if (sorted.length === 0) return null;
  const max = sorted[0][1];

  return (
    <section>
      <h3 className="text-[10px] font-semibold tracking-[0.2em] text-[#71717A] mb-3">
        TOP SOURCES
      </h3>
      <div className="space-y-1">
        {sorted.map(([source, count]) => (
          <div key={source} className="flex items-center gap-3">
            <span className="text-[11px] text-[#A1A1AA] w-44 truncate">
              {source}
            </span>
            <div className="flex-1 h-3 bg-[#0B0B0D] rounded-sm overflow-hidden">
              <div
                className="h-full bg-[#60A5FA]/40 border-r-2 border-[#60A5FA]"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="text-[11px] text-[#A1A1AA] font-mono w-10 text-right">
              {count}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
