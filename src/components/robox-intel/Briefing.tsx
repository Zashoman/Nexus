'use client';

import type { Signal } from '@/types/robox-intel';
import { SIGNAL_COLORS, SIGNAL_TYPE_LABELS } from '@/types/robox-intel';

interface BriefingProps {
  signals: Signal[];
  onSignalClick: (signal: Signal) => void;
}

export function Briefing({ signals, onSignalClick }: BriefingProps) {
  if (signals.length === 0) return null;

  return (
    <section className="max-w-[1000px] mx-auto px-4 sm:px-6 mt-6">
      <div className="relative rounded-lg border border-[#27272A] bg-[#0F0F11] overflow-hidden">
        {/* Gradient accent line */}
        <div
          className="h-0.5 w-full"
          style={{
            background: 'linear-gradient(90deg, #ef4444 0%, #f97316 33%, #22c55e 66%, #3b82f6 100%)',
          }}
        />
        <div className="p-5">
          <h2 className="text-[10px] font-semibold tracking-[0.25em] text-[#71717A] mb-4">
            TODAY&apos;S BRIEFING
          </h2>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {signals.slice(0, 4).map((signal, idx) => {
              const color = SIGNAL_COLORS[signal.type];
              const firstSentence =
                signal.suggested_action.split(/[.!?]/)[0] + '.';
              return (
                <button
                  key={signal.id}
                  onClick={() => onSignalClick(signal)}
                  className="relative text-left rounded-md border border-[#27272A] bg-[#151517] hover:bg-[#1A1A1D] hover:border-[#3F3F46] p-3 transition-all cursor-pointer overflow-hidden"
                >
                  <span
                    className="absolute top-1 right-3 text-[60px] font-bold opacity-[0.04] select-none pointer-events-none leading-none"
                    aria-hidden
                  >
                    {idx + 1}
                  </span>
                  <div className="relative z-10">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span
                        className="text-[9px] font-semibold tracking-wider uppercase"
                        style={{ color }}
                      >
                        {SIGNAL_TYPE_LABELS[signal.type]}
                      </span>
                    </div>
                    <h3 className="text-[13px] font-semibold leading-snug text-[#FAFAFA] line-clamp-2 mb-1">
                      {signal.title}
                    </h3>
                    <p className="text-[11px] text-[#A1A1AA] mb-2">
                      {signal.company}
                    </p>
                    <p className="text-[11px] text-[#4ADE80] leading-snug line-clamp-3">
                      → {firstSentence}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
