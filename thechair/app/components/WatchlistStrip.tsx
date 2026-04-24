'use client';

import useSWR from 'swr';
import Link from 'next/link';
import type { WatchlistItem } from '../../lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Format price without pretending everything is USD. International tickers
// commonly have 4-6 digit prices (KRW / JPY); render those without a $.
function fmtPrice(p?: number): string {
  if (typeof p !== 'number') return '—';
  if (p >= 1000) {
    return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return `$${p.toFixed(2)}`;
}

export default function WatchlistStrip({ initial }: { initial: WatchlistItem[] }) {
  const { data } = useSWR<WatchlistItem[]>('/api/watchlist', fetcher, {
    fallbackData: initial,
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });

  const items = data ?? initial;

  return (
    <section className="space-y-2 pt-2">
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
        <div className="tile px-4 py-2">
          <table className="border-collapse">
            <colgroup>
              <col className="w-[96px]" />
              <col className="w-[112px]" />
              <col className="w-[88px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-ink-700 mono text-[9px] uppercase tracking-widest text-bone-400">
                <th className="py-2 text-left font-normal">Symbol</th>
                <th className="py-2 pl-4 text-right font-normal">Last</th>
                <th className="py-2 pl-4 text-right font-normal">1D %</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <Row key={it.id} item={it} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Row({ item }: { item: WatchlistItem }) {
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
    <tr className="border-b border-ink-800 transition-colors hover:bg-ink-900/60">
      <td className="py-2">
        <Link
          href="/watchlist"
          className="mono inline-flex items-baseline gap-1.5 text-sm text-bone-50 hover:text-accent"
        >
          {item.ticker}
          {item.deepest_level ? (
            <span
              className="mono text-[9px] text-stressed"
              title={`Crossed −${item.deepest_level}% off the high`}
            >
              ●
            </span>
          ) : null}
        </Link>
      </td>
      <td className="py-2 pl-4 mono tabular-nums text-right text-sm text-bone-100">
        {fmtPrice(item.price)}
      </td>
      <td className={`py-2 pl-4 mono tabular-nums text-right text-sm ${changeColor}`}>
        {pct !== undefined ? `${changeSign}${pct.toFixed(2)}%` : '—'}
      </td>
    </tr>
  );
}
