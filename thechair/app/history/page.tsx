import Link from 'next/link';
import type { Session, Regime } from '../../lib/types';
import { store } from '../../lib/mock-store';

export const dynamic = 'force-dynamic';

function fetchSessions(): Session[] {
  // Phase 1: read from the in-memory store directly. Server components and API
  // routes share the same module, so this is the same data either way and
  // avoids an HTTP round-trip to ourselves.
  return store.listSessions();
}

const REGIME_COLOR: Record<Regime, string> = {
  calm: '#6ba97f',
  elevated: '#c9a15b',
  stressed: '#c97a5b',
  dislocation: '#b5455f',
};

export default function HistoryPage() {
  const sessions = fetchSessions();
  return (
    <section className="space-y-4">
      <header className="flex items-baseline justify-between border-b border-ink-700 pb-3">
        <div>
          <h1 className="mono text-[11px] uppercase tracking-[0.25em] text-bone-400">
            History
          </h1>
          <div className="mt-1 text-lg text-bone-100">
            {sessions.length} sessions recorded
          </div>
        </div>
        <div className="flex gap-2">
          {(['calm', 'elevated', 'stressed', 'dislocation'] as Regime[]).map((r) => (
            <span
              key={r}
              className="mono text-[10px] uppercase tracking-widest rounded border border-ink-600 bg-ink-800 px-2 py-1"
              style={{ color: REGIME_COLOR[r] }}
            >
              {r}
            </span>
          ))}
        </div>
      </header>

      <ul className="divide-y divide-ink-700 border-t border-ink-700">
        {sessions.length === 0 && (
          <li className="py-10 text-center text-bone-400">
            <span className="mono text-[11px] uppercase tracking-[0.2em]">
              no sessions yet — sit in the chair
            </span>
          </li>
        )}
        {sessions.map((s) => (
          <li key={s.session_number}>
            <Link
              href={`/history/${s.session_number}`}
              className="flex items-baseline justify-between py-4 hover:bg-ink-900/40"
            >
              <div className="flex items-baseline gap-4">
                <span className="mono text-sm text-bone-300">
                  #{String(s.session_number).padStart(3, '0')}
                </span>
                <span className="mono text-xs text-bone-400">
                  {new Date(s.created_at).toLocaleString()}
                </span>
                <span
                  className="mono text-[11px] uppercase tracking-widest"
                  style={{ color: REGIME_COLOR[s.regime] }}
                >
                  {s.regime}
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="mono text-xs text-bone-400">
                  {s.word_count} words
                </span>
                <span className="mono text-xs text-bone-400">
                  {s.questions.length}q
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
