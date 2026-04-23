'use client';

import type { MarketTile } from '../../lib/types';

export default function Tile({ tile }: { tile: MarketTile }) {
  const dirColor =
    tile.direction === 'up'
      ? 'text-up'
      : tile.direction === 'down'
        ? 'text-down'
        : 'text-bone-300';

  const arrow =
    tile.direction === 'up' ? '▲' : tile.direction === 'down' ? '▼' : '—';

  return (
    <div className="tile relative flex flex-col justify-between px-4 py-3">
      <div className="flex items-start justify-between">
        <span className="tile-label">{tile.label}</span>
        <div className="flex items-center gap-1.5">
          {tile.stale && (
            <span className="mono text-[9px] uppercase tracking-widest text-elevated">
              stale
            </span>
          )}
          {tile.note && <InfoIcon note={tile.note} />}
        </div>
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <span className="tile-value">{tile.value}</span>
        <span className={`mono text-xs ${dirColor}`}>{arrow}</span>
      </div>

      {tile.description && (
        <div className="mt-1.5 text-[11px] leading-snug text-bone-300">
          {tile.description}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <PercentileMeter value={tile.percentile} />
        {tile.duration && (
          <span className="mono shrink-0 text-[10px] uppercase tracking-wider text-bone-300">
            {tile.duration}
          </span>
        )}
      </div>
    </div>
  );
}

function PercentileMeter({ value }: { value?: number }) {
  if (typeof value !== 'number') {
    return <div className="flex-1 mono text-[10px] text-bone-400">5y —</div>;
  }
  const pct = Math.max(0, Math.min(100, value));
  // Color gradient: low=calm green, mid=elevated amber, high=stressed red
  const barColor =
    pct < 33
      ? 'bg-calm/70'
      : pct < 66
        ? 'bg-elevated/80'
        : 'bg-stressed/80';
  return (
    <div
      className="group/meter relative flex flex-1 items-center gap-2"
      title={`${pct.toFixed(0)}th percentile vs 5-year history`}
    >
      <span className="mono text-[9px] uppercase tracking-widest text-bone-400">
        5y
      </span>
      <div className="relative h-1 flex-1 overflow-hidden rounded-sm bg-ink-700">
        <div
          className={`absolute left-0 top-0 h-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="mono text-[10px] tabular-nums text-bone-200">
        {pct.toFixed(0)}
      </span>
    </div>
  );
}

function InfoIcon({ note }: { note: string }) {
  return (
    <span className="group relative inline-block">
      <button
        type="button"
        tabIndex={0}
        aria-label="What is this?"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-ink-600 text-[9px] font-medium text-bone-400 hover:border-bone-300 hover:text-bone-100 focus:outline-none focus:border-bone-300 focus:text-bone-100"
      >
        i
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute right-0 top-5 z-20 w-64 rounded border border-ink-600 bg-ink-900 px-3 py-2 text-[11px] leading-snug text-bone-100 opacity-0 shadow-xl transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        {note}
      </span>
    </span>
  );
}
