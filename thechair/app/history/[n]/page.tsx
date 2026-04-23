import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Regime } from '../../../lib/types';
import { store } from '../../../lib/mock-store';

export const dynamic = 'force-dynamic';

const REGIME_COLOR: Record<Regime, string> = {
  calm: '#6ba97f',
  elevated: '#c9a15b',
  stressed: '#c97a5b',
  dislocation: '#b5455f',
};

export default function SessionDetail({ params }: { params: { n: string } }) {
  const n = Number(params.n);
  if (!Number.isFinite(n)) notFound();
  const session = store.getSession(n);
  if (!session) notFound();

  return (
    <article className={`regime-${session.regime} space-y-6`}>
      <header className="flex items-baseline justify-between border-b border-ink-700 pb-3">
        <div>
          <Link
            href="/history"
            className="mono text-[10px] uppercase tracking-[0.2em] text-bone-400 hover:text-bone-100"
          >
            ← history
          </Link>
          <div className="mt-2 mono text-[10px] uppercase tracking-[0.25em] text-bone-400">
            Session {session.session_number} / 300
          </div>
          <div className="mono mt-1 text-sm text-bone-200">
            {new Date(session.created_at).toLocaleString()} · regime{' '}
            <span style={{ color: REGIME_COLOR[session.regime] }}>{session.regime}</span>{' '}
            · score {session.regime_score.toFixed(0)}
          </div>
        </div>
        <div className="mono text-xs text-bone-400">{session.word_count} words</div>
      </header>

      <div className="space-y-8">
        {session.questions.map((q, idx) => (
          <div key={q.n} className="space-y-2">
            <div className="mono text-[10px] uppercase tracking-[0.25em] text-bone-400">
              q{q.n.toString().padStart(2, '0')}
            </div>
            <div className="text-base leading-relaxed text-bone-50">{q.text}</div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-bone-200 border-l-2 border-ink-600 pl-4">
              {session.answers[idx] || '—'}
            </div>
          </div>
        ))}
      </div>

      {session.mentor_read && (
        <div className="tile px-6 py-5">
          <div className="mono text-[10px] uppercase tracking-[0.25em] text-bone-400">
            Stanley's read
          </div>
          <div className="mt-2 text-base leading-relaxed text-bone-50">
            {session.mentor_read.text}
          </div>
          {session.mentor_read.watch_for && (
            <div className="mt-2 mono text-xs text-bone-300">
              watch for: {session.mentor_read.watch_for}
            </div>
          )}
        </div>
      )}

      {session.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {session.tags.map((t) => (
            <span
              key={t}
              className="mono text-[10px] uppercase tracking-widest rounded border border-ink-600 px-2 py-1 text-bone-300"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
