'use client';

import useSWR from 'swr';
import Link from 'next/link';
import type { WatchlistItem } from '../../lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function WatchlistStrip({ initial }: { initial: WatchlistItem[] }) {
  const { data } = useSWR<WatchlistItem[]>('/api/watchlist', fetcher, {
    fallbackData: initial,
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });

  const items = data ?? initial;

  return (
    <section className="space-y-3 pt-2">
      <div className="flex items-baseline justify-between">
        <h2 className="mono text-[10px] uppercase tracking-[0.25em] text-bone-400">
          Watchlist
        </h2>
        <Link
          href="/watchlist"
          className="mono text-[10px] uppercase tracking-[0.2em] text-bone-400 hover:text-bone-100"
        >
          manage →
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="tile px-4 py-6 text-center text-bone-400 mono text-[11px] uppercase tracking-[0.2em]">
          empty — add a name
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {items.map((it) => (
            <WatchlistPill key={it.id} item={it} />
          ))}
        </div>
      )}
    </section>
  );
}

function WatchlistPill({ item }: { item: WatchlistItem }) {
  const pct = item.change_1d;
  const changeColor =
    pct === undefined
      ? 'text-bone-400'
      : pct > 0
        ? 'text-up'
        : pct < 0
          ? 'text-down'
          : 'text-bone-300';
  const changeSign = pct !== undefined && pct > 0 ? '+' : '';

  return (
    <Link
      href="/watchlist"
      className="tile group block px-4 py-3 hover:border-bone-400"
    >
      <div className="flex items-baseline justify-between">
        <span className="mono text-sm text-bone-50">{item.ticker}</span>
        {item.trigger_hit && (
          <span
            className="mono text-[9px] uppercase tracking-widest text-accent"
            title="Trigger price hit"
          >
            ● trigger
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="mono text-lg text-bone-50">
          {typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : '—'}
        </span>
        <span className={`mono text-xs ${changeColor}`}>
          {pct !== undefined ? `${changeSign}${pct.toFixed(2)}%` : ''}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between mono text-[10px] text-bone-400">
        <span title="IV rank (52w)">
          IV-rk {typeof item.iv_rank === 'number' ? item.iv_rank.toFixed(0) : '—'}
        </span>
        <span
          title="52-week drawdown"
          className={
            typeof item.drawdown_52w === 'number' && item.drawdown_52w < -15
              ? 'text-down'
              : ''
          }
        >
          {typeof item.drawdown_52w === 'number'
            ? `${item.drawdown_52w.toFixed(1)}% dd`
            : '—'}
        </span>
      </div>

      {typeof item.trigger_price === 'number' &&
        typeof item.price === 'number' && (
          <div className="mt-1.5 mono text-[10px] text-bone-400">
            trigger ${item.trigger_price.toFixed(0)} ·{' '}
            <span
              className={
                item.price <= item.trigger_price ? 'text-accent' : 'text-bone-400'
              }
            >
              {(((item.price - item.trigger_price) / item.trigger_price) * 100).toFixed(
                1
              )}
              % away
            </span>
          </div>
        )}
    </Link>
  );
}
