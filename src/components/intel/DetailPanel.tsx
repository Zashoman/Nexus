'use client';

import { useEffect, useState } from 'react';
import type { IntelItem, IntelBeliefEvidence, RatingValue } from '@/types/intel';
import RatingButtons from './RatingButtons';

interface DetailPanelProps {
  item: IntelItem | null;
  onClose?: () => void;
}

const TIER_COLORS: Record<number, string> = {
  1: 'text-[#00CC66]',
  2: 'text-[#4488FF]',
  3: 'text-[#888888]',
};

const IMPACT_COLORS: Record<string, string> = {
  critical: 'text-[#FF4444]',
  high: 'text-[#FF8C00]',
  medium: 'text-[#4488FF]',
  low: 'text-[#666666]',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DetailPanel({ item, onClose }: DetailPanelProps) {
  const [beliefEvidence, setBeliefEvidence] = useState<
    (IntelBeliefEvidence & { belief_title?: string })[]
  >([]);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!item) return;
    // We could fetch belief evidence linked to this item
    // For now, this data comes from the synthesis view
    setBeliefEvidence([]);
    setFeedback('');
  }, [item?.id]);

  if (!item) {
    return (
      <div className="flex-1 bg-[#141820] flex items-center justify-center">
        <p className="text-[#5A6A7A] text-sm font-mono">
          Select an item to view details
        </p>
      </div>
    );
  }

  const tierColor = TIER_COLORS[item.source_tier] || TIER_COLORS[3];
  const impactColor = IMPACT_COLORS[item.impact_level || 'low'] || IMPACT_COLORS.low;
  const published = item.published_at || item.ingested_at;
  const keywords = (item.metadata as { keywords?: string[] })?.keywords || [];

  return (
    <div className="flex-1 bg-[#141820] overflow-y-auto border-l border-[#1E2A3A]">
      {/* Mobile close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="lg:hidden absolute top-2 right-2 text-[#5A6A7A] hover:text-[#E8EAED] text-lg px-2 cursor-pointer"
        >
          ✕
        </button>
      )}

      <div className="p-4 space-y-4">
        {/* Title */}
        <h2 className="text-lg font-semibold text-[#E8EAED] leading-tight">
          {item.title}
        </h2>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-[#8899AA]">{item.source_name}</span>
          <span className={tierColor}>T{item.source_tier}</span>
          <span className={impactColor}>
            {(item.impact_level || 'low').toUpperCase()}
          </span>
          <span className="text-[#5A6A7A]">{timeAgo(published)}</span>
          {item.relevance_score != null && (
            <span className="text-[#5A6A7A]">
              Relevance: {(item.relevance_score * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {/* AI Summary */}
        {item.ai_summary && (
          <div className="space-y-1">
            <h4 className="text-[10px] font-mono text-[#5A6A7A] uppercase tracking-wider">
              AI Summary
            </h4>
            <p className="text-sm text-[#E8EAED]/90 leading-relaxed">
              {item.ai_summary}
            </p>
          </div>
        )}

        {/* Original summary fallback */}
        {!item.ai_summary && item.summary && (
          <div className="space-y-1">
            <h4 className="text-[10px] font-mono text-[#5A6A7A] uppercase tracking-wider">
              Summary
            </h4>
            <p className="text-sm text-[#E8EAED]/90 leading-relaxed">
              {item.summary}
            </p>
          </div>
        )}

        {/* Keywords */}
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {keywords.map((kw) => (
              <span
                key={kw}
                className="text-[10px] font-mono text-[#4488FF]/70 bg-[#4488FF]/5 px-1.5 py-0.5 rounded-sm"
              >
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* Subcategories */}
        {item.subcategories && item.subcategories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.subcategories.map((sub) => (
              <span
                key={sub}
                className="text-[10px] font-mono text-[#8899AA] bg-[#8899AA]/10 px-1.5 py-0.5 rounded-sm"
              >
                #{sub}
              </span>
            ))}
          </div>
        )}

        {/* Belief Impact */}
        {beliefEvidence.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-[10px] font-mono text-[#5A6A7A] uppercase tracking-wider">
              Belief Impact
            </h4>
            {beliefEvidence.map((ev) => (
              <div key={ev.id} className="flex items-center gap-2 text-xs">
                <span
                  className={
                    ev.direction === 'supports'
                      ? 'text-[#00CC66]'
                      : 'text-[#FF4444]'
                  }
                >
                  {ev.direction === 'supports' ? '▲' : '▼'}
                </span>
                <span className="text-[#8899AA]">
                  {ev.direction === 'supports' ? 'Supports' : 'Challenges'}{' '}
                  &quot;{ev.belief_title}&quot;
                </span>
                <span className="text-[#5A6A7A]">
                  (strength: {(ev.strength * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Source link */}
        <a
          href={item.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-mono text-[#4488FF] hover:text-[#6699FF] transition-colors"
        >
          Open Source →
        </a>

        {/* Rating buttons (large) */}
        <div className="pt-2 border-t border-[#1E2A3A]">
          <h4 className="text-[10px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-2">
            Rate This Item
          </h4>
          <RatingButtons
            itemId={item.id}
            currentRating={item.rating as RatingValue | undefined}
            size="lg"
          />
        </div>

        {/* Feedback */}
        <div className="space-y-1">
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Optional feedback..."
            className="w-full bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1.5 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF]"
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && feedback.trim()) {
                await fetch('/api/intel/rate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    item_id: item.id,
                    rating: 'signal',
                    feedback_note: feedback,
                  }),
                });
                setFeedback('');
              }
            }}
          />
        </div>

        {/* Multi-source indicator */}
        {item.group_source_count && item.group_source_count > 1 && (
          <div className="text-xs font-mono text-[#8899AA] bg-[#8899AA]/5 px-2 py-1 rounded-sm">
            Reported by {item.group_source_count} sources
          </div>
        )}
      </div>
    </div>
  );
}
