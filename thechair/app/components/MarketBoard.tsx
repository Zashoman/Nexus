'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import type { MarketSnapshot } from '../../lib/types';
import RegimeBanner from './RegimeBanner';
import Tile from './Tile';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Deterministic HH:MM:SS so SSR and client agree on first paint — avoids
// hydration mismatches from locale-specific toLocaleTimeString output
// (e.g. "a.m." vs "AM" across platforms).
function fmtTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export default function MarketBoard({ initial }: { initial: MarketSnapshot }) {
  const { data } = useSWR<MarketSnapshot>('/api/market/snapshot', fetcher, {
    fallbackData: initial,
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });

  const snap = data ?? initial;

  // Only render the "captured" timestamp after mount so it always reflects
  // the browser's local time and never differs from the SSR pass.
  const [captured, setCaptured] = useState<string | null>(null);
  useEffect(() => {
    setCaptured(fmtTime(snap.captured_at));
  }, [snap.captured_at]);

  return (
    <section className="space-y-4">
      <RegimeBanner regime={snap.regime} score={snap.regime_score} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {snap.tiles.map((t) => (
          <Tile key={t.key} tile={t} />
        ))}
      </div>
      <div className="flex items-center justify-between px-1 pt-2">
        <span
          className="mono text-[10px] uppercase tracking-[0.2em] text-bone-400"
          suppressHydrationWarning
        >
          captured {captured ?? '—'}
        </span>
        <a
          href="/journal"
          className="mono text-[11px] uppercase tracking-[0.2em] rounded border border-ink-600 bg-ink-800 px-4 py-2 text-bone-100 hover:border-bone-300"
        >
          sit in the chair →
        </a>
      </div>
    </section>
  );
}
