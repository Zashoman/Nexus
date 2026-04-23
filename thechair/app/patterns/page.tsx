import type { Regime } from '../../lib/types';
import { buildPatternsReport } from '../../lib/patterns/report';

export const dynamic = 'force-dynamic';

const REGIME_COLOR: Record<Regime, string> = {
  calm: '#6ba97f',
  elevated: '#c9a15b',
  stressed: '#c97a5b',
  dislocation: '#b5455f',
};

export default function PatternsPage() {
  const report = buildPatternsReport();

  return (
    <section className="space-y-6">
      <header className="border-b border-ink-700 pb-3">
        <h1 className="mono text-[11px] uppercase tracking-[0.25em] text-bone-400">
          Patterns
        </h1>
        <div className="mt-1 text-lg text-bone-100">what the record shows</div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="tile px-5 py-4">
          <div className="tile-label">Current streak</div>
          <div className="tile-value mt-2">{report.streak_current}d</div>
          <div className="tile-meta mt-2">longest {report.streak_longest}d</div>
        </div>
        <div className="tile px-5 py-4">
          <div className="tile-label">Thesis → Execution gap</div>
          <div className="tile-value mt-2">
            {report.thesis_execution_gap.positions_entered} /{' '}
            {report.thesis_execution_gap.triggers_hit}
          </div>
          <div className="tile-meta mt-2">entries / triggers hit</div>
        </div>
        <div className="tile px-5 py-4">
          <div className="tile-label">Regime mix (90d)</div>
          <div className="mt-3 flex h-3 overflow-hidden rounded">
            {report.regime_distribution.map((d) => (
              <div
                key={d.regime}
                style={{
                  background: REGIME_COLOR[d.regime],
                  flex: d.count,
                }}
                title={`${d.regime}: ${d.count}`}
              />
            ))}
          </div>
          <div className="tile-meta mt-2">
            {report.regime_distribution
              .map((d) => `${d.regime.slice(0, 3)} ${d.count}`)
              .join(' · ')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="tile px-5 py-4">
          <div className="tile-label">Tag frequency</div>
          <ul className="mt-3 space-y-1">
            {report.tag_frequency.map((t) => (
              <li
                key={t.tag}
                className="flex items-baseline justify-between text-sm"
              >
                <span className="text-bone-100">{t.tag}</span>
                <span className="mono text-bone-400">{t.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="tile px-5 py-4">
          <div className="tile-label">Recurring phrases</div>
          <ul className="mt-3 space-y-1">
            {report.phrase_clusters.map((p) => (
              <li
                key={p.phrase}
                className="flex items-baseline justify-between text-sm"
              >
                <span className="italic text-bone-100">&ldquo;{p.phrase}&rdquo;</span>
                <span className="mono text-bone-400">{p.count}&times;</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
