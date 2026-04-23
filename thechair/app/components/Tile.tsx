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
    <div className="tile flex flex-col justify-between px-4 py-3" title={tile.note}>
      <div className="flex items-start justify-between">
        <span className="tile-label">{tile.label}</span>
        {tile.stale && (
          <span className="mono text-[9px] uppercase tracking-widest text-elevated">
            stale
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="tile-value">{tile.value}</span>
        <span className={`mono text-xs ${dirColor}`}>{arrow}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="tile-meta">
          {typeof tile.percentile === 'number'
            ? `p${tile.percentile.toFixed(0)}`
            : '—'}
        </span>
        <span className="tile-meta">{tile.duration ?? ''}</span>
      </div>
    </div>
  );
}
