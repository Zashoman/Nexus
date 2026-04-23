import type { Regime } from '../../lib/types';

const COPY: Record<Regime, { title: string; sub: string }> = {
  calm: {
    title: 'Calm',
    sub: 'Benign tape. Signals quiet. Stay patient.',
  },
  elevated: {
    title: 'Elevated',
    sub: 'Signals waking up. Stress is entering the tape.',
  },
  stressed: {
    title: 'Stressed',
    sub: 'Real stress. Correlations rising. Liquidity thinning.',
  },
  dislocation: {
    title: 'Dislocation',
    sub: 'Indiscriminate moves. Names are breaking.',
  },
};

export default function RegimeBanner({
  regime,
  score,
}: {
  regime: Regime;
  score: number;
}) {
  const { title, sub } = COPY[regime];
  return (
    <div className={`tile regime-${regime} flex items-center justify-between px-6 py-5`}>
      <div>
        <div className="mono text-[10px] uppercase tracking-[0.25em] text-bone-400">
          Current Regime
        </div>
        <div className="mt-1 flex items-baseline gap-4">
          <span
            className="mono text-3xl font-medium tracking-tightest"
            style={{ color: 'var(--regime-color)' }}
          >
            {title}
          </span>
          <span className="mono text-sm text-bone-300">score {score.toFixed(0)} / 100</span>
        </div>
        <div className="mt-1 text-sm text-bone-200">{sub}</div>
      </div>
      <div className="flex h-16 w-48 items-end gap-1">
        <ScoreBar score={score} />
      </div>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  // 20 segments, fill by score
  const segments = 20;
  const filled = Math.round((score / 100) * segments);
  return (
    <div className="flex h-full w-full items-end gap-[2px]">
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className="flex-1"
          style={{
            height: `${25 + (i / segments) * 75}%`,
            background:
              i < filled
                ? 'var(--regime-color)'
                : 'rgba(155, 152, 141, 0.1)',
          }}
        />
      ))}
    </div>
  );
}
