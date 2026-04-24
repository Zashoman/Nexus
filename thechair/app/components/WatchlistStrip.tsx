'use client';

import useSWR from 'swr';
import Link from 'next/link';
import type { WatchlistItem, DrawdownLevel } from '../../lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Coloring rules ----------------------------------------------------------

function entryColor(pct?: number): string {
  if (typeof pct !== 'number') return 'text-bone-300';
  if (pct <= -30) return 'text-dislocation font-medium';
  if (pct <= -15) return 'text-stressed';
  if (pct >= 15) return 'text-up';
  return 'text-bone-200';
}

// "From High" is the buy-zone signal. -30 is the act level — color it loud.
function fromHighColor(pct?: number): string {
  if (typeof pct !== 'number') return 'text-bone-300';
  if (pct <= -40) return 'text-dislocation font-semibold';
  if (pct <= -35) return 'text-dislocation font-medium';
  if (pct <= -30) return 'text-stressed font-medium';
  if (pct <= -25) return 'text-elevated';
  return 'text-bone-200';
}

const LEVEL_PILL: Record<DrawdownLevel, string> = {
  25: 'border-elevated/60 text-elevated',
  30: 'border-stressed/70 text-stressed',
  35: 'border-dislocation/70 text-dislocation',
  40: 'border-dislocation text-dislocation font-semibold',
};

function rowAccent(deepest?: DrawdownLevel): string {
  // Subtle row tint for names in the buy zone, cumulative by level.
  if (!deepest) return '';
  if (deepest >= 40) return 'bg-dislocation/[0.07]';
  if (deepest >= 35) return 'bg-dislocation/[0.05]';
  if (deepest >= 30) return 'bg-stressed/[0.05]';
  return 'bg-elevated/[0.04]';
}

// Component ---------------------------------------------------------------

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
          <table className="w-full min-w-[920px] border-collapse">
            <thead>
              <tr className="border-b border-ink-700 text-left mono text-[9px] uppercase tracking-widest text-bone-400">
                <th className="px-4 py-2 font-normal">Symbol</th>
                <th className="px-3 py-2 font-normal text-right">Last</th>
                <th className="px-3 py-2 font-normal text-right">1D %</th>
                <th
                  className="px-3 py-2 font-normal text-right"
                  title="% from the high-water mark since added — the buy-zone signal"
                >
                  From High
                </th>
                <th
                  className="px-3 py-2 font-normal"
                  title="Drawdown alert level crossed: 25 / 30 / 35 / 40"
                >
                  Level
                </th>
                <th className="px-3 py-2 font-normal text-right">Since Entry</th>
                <th className="px-3 py-2 font-normal text-right">IV Rk</th>
                <th className="px-3 py-2 font-normal text-right">Trigger</th>
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

  const distanceToTrigger =
    typeof item.price === 'number' && typeof item.trigger_price === 'number'
      ? ((item.price - item.trigger_price) / item.trigger_price) * 100
      : null;

  return (
    <tr
      className={`border-b border-ink-800 transition-colors hover:bg-ink-900/60 ${rowAccent(item.deepest_level)}`}
    >
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
      <td
        className={`px-3 py-2.5 mono tabular-nums text-right text-sm ${fromHighColor(item.drawdown_from_high)}`}
        title={
          typeof item.high_water_mark === 'number' && typeof item.high_water_mark_at === 'string'
            ? `High $${item.high_water_mark.toFixed(2)} on ${new Date(item.high_water_mark_at).toLocaleDateString()}`
            : 'No high recorded'
        }
      >
        {typeof item.drawdown_from_high === 'number'
          ? `${item.drawdown_from_high.toFixed(1)}%`
          : '—'}
      </td>
      <td className="px-3 py-2.5">
        {item.deepest_level ? (
          <span
            className={`mono inline-flex rounded border px-1.5 py-0.5 text-[10px] tracking-wider ${LEVEL_PILL[item.deepest_level]}`}
            title={`Crossed: ${item.levels_triggered?.map((l) => `−${l}%`).join(', ')}`}
          >
            −{item.deepest_level}
          </span>
        ) : (
          <span className="mono text-[10px] text-bone-400">—</span>
        )}
      </td>
      <td
        className={`px-3 py-2.5 mono tabular-nums text-right text-xs ${entryColor(item.drawdown_from_entry)}`}
        title={
          typeof item.entry_price === 'number' && typeof item.entry_at === 'string'
            ? `Entry: $${item.entry_price.toFixed(2)} on ${new Date(item.entry_at).toLocaleDateString()}`
            : 'No entry price recorded'
        }
      >
        {typeof item.drawdown_from_entry === 'number'
          ? `${item.drawdown_from_entry > 0 ? '+' : ''}${item.drawdown_from_entry.toFixed(1)}%`
          : '—'}
      </td>
      <td className={`px-3 py-2.5 mono tabular-nums text-right text-xs ${ivColor}`}>
        {typeof item.iv_rank === 'number' ? item.iv_rank.toFixed(0) : '—'}
      </td>
      <td className="px-3 py-2.5 mono tabular-nums text-right text-xs text-bone-300">
        {typeof item.trigger_price === 'number'
          ? `$${item.trigger_price.toFixed(0)}`
          : '—'}
        {distanceToTrigger !== null && (
          <span
            className={`ml-1 text-[10px] ${
              Math.abs(distanceToTrigger) < 3 ? 'text-accent' : 'text-bone-400'
            }`}
          >
            ({distanceToTrigger > 0 ? '+' : ''}
            {distanceToTrigger.toFixed(0)}%)
          </span>
        )}
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
