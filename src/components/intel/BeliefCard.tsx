'use client';

import { useState, useEffect } from 'react';
import type { IntelBelief, IntelBeliefEvidence } from '@/types/intel';

interface BeliefCardProps {
  belief: IntelBelief;
  onEdit: (belief: IntelBelief) => void;
  onRetire: (id: string) => void;
}

const TIER_COLORS: Record<number, string> = {
  1: 'text-[#00CC66]',
  2: 'text-[#4488FF]',
  3: 'text-[#888888]',
};

export default function BeliefCard({ belief, onEdit, onRetire }: BeliefCardProps) {
  const [evidence, setEvidence] = useState<IntelBeliefEvidence[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchEvidence();
  }, [belief.id]);

  async function fetchEvidence() {
    try {
      const res = await fetch(`/api/intel/beliefs/${belief.id}/evidence`);
      const data = await res.json();
      setEvidence(data.evidence || []);
    } catch {
      // Silent
    }
  }

  const change = belief.current_confidence - belief.initial_confidence;
  const changeColor =
    change > 0 ? 'text-[#00CC66]' : change < 0 ? 'text-[#FF4444]' : 'text-[#5A6A7A]';
  const changeIcon = change > 0 ? '▲' : change < 0 ? '▼' : '—';
  const confidencePct = Math.round(belief.current_confidence);
  const barWidth = `${confidencePct}%`;

  const recentEvidence = showAll ? evidence : evidence.slice(0, 3);

  return (
    <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-4 space-y-3">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-[#E8EAED]">
          {belief.title}
        </h3>
        <p className="text-xs text-[#8899AA]">{belief.description}</p>
      </div>

      {/* Confidence bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#8899AA]">Confidence</span>
          <span className="text-[#E8EAED]">
            {confidencePct}%{' '}
            <span className="text-[#5A6A7A]">
              (started at {Math.round(belief.initial_confidence)}%)
            </span>{' '}
            <span className={changeColor}>
              {changeIcon} {change > 0 ? '+' : ''}
              {change.toFixed(1)}%
            </span>
          </span>
        </div>
        <div className="w-full h-2 bg-[#0B0E11] rounded-sm overflow-hidden">
          <div
            className="h-full rounded-sm transition-all duration-500"
            style={{
              width: barWidth,
              background: `linear-gradient(90deg, #4488FF ${Math.min(confidencePct, 50)}%, ${
                confidencePct > 70 ? '#00CC66' : confidencePct < 30 ? '#FF4444' : '#4488FF'
              } 100%)`,
            }}
          />
        </div>
      </div>

      {/* Evidence count */}
      <div className="flex items-center gap-4 text-xs font-mono text-[#8899AA]">
        <span>
          Evidence For:{' '}
          <span className="text-[#00CC66]">{belief.evidence_for}</span>
        </span>
        <span>
          Evidence Against:{' '}
          <span className="text-[#FF4444]">{belief.evidence_against}</span>
        </span>
      </div>

      {/* Recent evidence */}
      {recentEvidence.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-[10px] font-mono text-[#5A6A7A] uppercase tracking-wider">
            Latest Evidence
          </h4>
          {recentEvidence.map((ev) => (
            <div
              key={ev.id}
              className="flex items-start gap-2 text-xs py-0.5"
            >
              <span
                className={
                  ev.direction === 'supports'
                    ? 'text-[#00CC66]'
                    : 'text-[#FF4444]'
                }
              >
                {ev.direction === 'supports' ? '▲' : '▼'}
              </span>
              <span className={TIER_COLORS[ev.source_tier] || 'text-[#888888]'}>
                T{ev.source_tier}
              </span>
              <span className="text-[#8899AA] flex-1">
                {ev.ai_reasoning}
              </span>
            </div>
          ))}
          {evidence.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-[10px] font-mono text-[#4488FF] hover:text-[#6699FF] cursor-pointer"
            >
              {showAll
                ? 'Show less'
                : `View all ${evidence.length} evidence items`}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-[#1E2A3A]">
        <button
          onClick={() => onEdit(belief)}
          className="text-[10px] font-mono text-[#4488FF] hover:text-[#6699FF] cursor-pointer"
        >
          Edit
        </button>
        <button
          onClick={() => onRetire(belief.id)}
          className="text-[10px] font-mono text-[#5A6A7A] hover:text-[#FF4444] cursor-pointer"
        >
          Retire
        </button>
      </div>
    </div>
  );
}
