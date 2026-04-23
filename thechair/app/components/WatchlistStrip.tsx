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
        <div className="tile overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-ink-700 text-left mono text-[9px] uppercase tracking-widest text-bone-400">
                <th className="px-4 py-2 font-normal">Symbol</th>
                <th className="px-3 py-2 font-normal text-right">Last</th>
                <th className="px-3 py-2 font-normal text-right">1D %</th>
                <th className="px-3 py-2 font-normal text-right">IV Rk</th>
                <th className="px-3 py-2 font-normal text-right">52W DD</th>
                <th className="px-3 py-2 font-normal text-right">Trigger</th>
                <th className="px-3 py-2 font-normal text-right">To Trg</th>
                <th className="px-4 py-2 font-normal">Status</th>
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

  const ivColor =
    item.iv_rank === undefined
      ? 'text-bone-300'
      : item.iv_rank >= 80
        ? 'text-accent'
        : item.iv_rank >= 50
          ? 'text-elevated'
          : 'text-bone-300';

  const ddColor =
    item.drawdown_52w === undefined
      ? 'text-bone-300'
      : item.drawdown_52w <= -20
        ? 'text-down'
        : item.drawdown_52w <= -10
          ? 'text-elevated'
          : 'text-bone-300';

  const distanceToTrigger =
    typeof item.price === 'number' && typeof item.trigger_price === 'number'
      ? ((item.price - item.trigger_price) / item.trigger_price) * 100
      : null;

  return (
    <tr className="border-b border-ink-800 hover:bg-ink-900/60 transition-colors">
      <td className="px-4 py-2.5">
        <Link
          href="/watchlist"
          className="mono text-sm text-bone-50 hover:text-accent"
        >
          {item.ticker}
        </Link>
      </td>
      <td className="px-3 py-2.5 mono tabular-nums text-right text-sm text-bone-100">
        {typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : '—'}
      </td>
      <td className={`px-3 py-2.5 mono tabular-nums text-right text-sm ${changeColor}`}>
        {pct !== undefined ? `${changeSign}${pct.toFixed(2)}%` : '—'}
      </td>
      <td className={`px-3 py-2.5 mono tabular-nums text-right text-xs ${ivColor}`}>
        {typeof item.iv_rank === 'number' ? item.iv_rank.toFixed(0) : '—'}
      </td>
      <td className={`px-3 py-2.5 mono tabular-nums text-right text-xs ${ddColor}`}>
        {typeof item.drawdown_52w === 'number'
          ? `${item.drawdown_52w.toFixed(1)}%`
          : '—'}
      </td>
      <td className="px-3 py-2.5 mono tabular-nums text-right text-xs text-bone-300">
        {typeof item.trigger_price === 'number'
          ? `$${item.trigger_price.toFixed(0)}`
          : '—'}
      </td>
      <td
        className={`px-3 py-2.5 mono tabular-nums text-right text-xs ${
          distanceToTrigger !== null && Math.abs(distanceToTrigger) < 3
            ? 'text-accent'
            : 'text-bone-300'
        }`}
      >
        {distanceToTrigger !== null
          ? `${distanceToTrigger > 0 ? '+' : ''}${distanceToTrigger.toFixed(1)}%`
          : '—'}
      </td>
      <td className="px-4 py-2.5 text-xs">
        {item.trigger_hit ? (
          <span className="mono text-[10px] uppercase tracking-widest text-accent">
            ● trigger hit
          </span>
        ) : (
          <span className="text-bone-400 truncate inline-block max-w-[180px]">
            {item.thesis}
          </span>
        )}
      </td>
    </tr>
  );
}
