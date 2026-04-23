'use client';

import useSWR from 'swr';
import type { MarketSnapshot } from '../../lib/types';
import RegimeBanner from './RegimeBanner';
import Tile from './Tile';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MarketBoard({ initial }: { initial: MarketSnapshot }) {
  const { data } = useSWR<MarketSnapshot>('/api/market/snapshot', fetcher, {
    fallbackData: initial,
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });

  const snap = data ?? initial;

  return (
    <section className="space-y-4">
      <RegimeBanner regime={snap.regime} score={snap.regime_score} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {snap.tiles.map((t) => (
          <Tile key={t.key} tile={t} />
        ))}
      </div>
      <div className="flex items-center justify-between px-1 pt-2">
        <span className="mono text-[10px] uppercase tracking-[0.2em] text-bone-400">
          captured {new Date(snap.captured_at).toLocaleTimeString()}
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
