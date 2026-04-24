'use client';

import useSWR from 'swr';
import Link from 'next/link';
import type { Alert } from '../../lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const LEVEL_COLOR: Record<number, string> = {
  25: 'text-elevated border-elevated/50',
  30: 'text-stressed border-stressed/60',
  35: 'text-dislocation border-dislocation/60',
  40: 'text-dislocation border-dislocation font-medium',
};

export default function AlertsBanner({ initial }: { initial: Alert[] }) {
  const { data, mutate } = useSWR<Alert[]>(
    '/api/alerts?unacknowledged=true',
    fetcher,
    {
      fallbackData: initial,
      refreshInterval: 30_000,
      revalidateOnFocus: true,
    }
  );

  const alerts = data ?? initial;
  const drawdownAlerts = alerts.filter((a) => a.kind === 'drawdown_level');

  if (drawdownAlerts.length === 0) return null;

  async function dismiss() {
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ all: true, action: 'acknowledge' }),
    });
    mutate([]);
  }

  return (
    <section className="tile border-l-2 border-l-stressed px-5 py-3">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-3">
          <span className="mono text-[10px] uppercase tracking-[0.25em] text-stressed">
            ● {drawdownAlerts.length} drawdown alert{drawdownAlerts.length === 1 ? '' : 's'}
          </span>
          <span className="text-[12px] text-bone-300">
            names crossed into a buy-zone level
          </span>
        </div>
        <button
          onClick={dismiss}
          className="mono text-[10px] uppercase tracking-[0.2em] text-bone-400 hover:text-bone-100"
        >
          dismiss all
        </button>
      </div>
      <ul className="mt-2 flex flex-wrap gap-2">
        {drawdownAlerts.map((a) => (
          <li key={a.id}>
            <Link
              href="/watchlist"
              className={`mono inline-flex items-center gap-2 rounded border px-3 py-1.5 text-xs hover:bg-ink-800 ${LEVEL_COLOR[a.level ?? 25]}`}
              title={`At $${a.price.toFixed(2)} on ${new Date(a.captured_at).toLocaleString()}`}
            >
              <span className="text-bone-50">{a.ticker}</span>
              <span className="opacity-70">−{a.level}%</span>
              {typeof a.drawdown_from_high === 'number' && (
                <span className="opacity-50">
                  ({a.drawdown_from_high.toFixed(1)}%)
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
