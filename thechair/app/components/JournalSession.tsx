'use client';

import { useState, useEffect, useRef } from 'react';
import type { MentorQuestion, MentorRead, Regime } from '../../lib/types';

interface StartResponse {
  session_number: number;
  regime: Regime;
  regime_score: number;
  questions: MentorQuestion[];
}

interface SubmitResponse {
  session_number: number;
  mentor_read: MentorRead;
  word_count: number;
}

function renderQuestion(q: MentorQuestion): React.ReactNode {
  if (!q.highlight_terms || q.highlight_terms.length === 0) return q.text;
  const escaped = q.highlight_terms.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const splitter = new RegExp(`(${escaped.join('|')})`, 'gi');
  const matcher = new RegExp(`^(?:${escaped.join('|')})$`, 'i');
  const parts = q.text.split(splitter);
  return parts.map((part, i) =>
    matcher.test(part) ? (
      <span key={i} className="highlight-term">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function JournalSession() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<StartResponse | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const didStart = useRef(false);

  useEffect(() => {
    if (didStart.current) return;
    didStart.current = true;

    (async () => {
      try {
        const res = await fetch('/api/mentor/questions', { method: 'POST' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: StartResponse = await res.json();
        setSession(data);
        setAnswers(new Array(data.questions.length).fill(''));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to start session');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function submit() {
    if (!session) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          session_number: session.session_number,
          answers,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SubmitResponse = await res.json();
      setFinished(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-bone-300">
        <span className="mono text-[11px] uppercase tracking-[0.25em]">
          stanley is reading the tape…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tile px-6 py-8 text-down">
        <div className="mono text-[11px] uppercase tracking-widest">error</div>
        <div className="mt-2 text-sm">{error}</div>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="space-y-6">
        <div className="tile px-6 py-6">
          <div className="mono text-[11px] uppercase tracking-[0.25em] text-bone-400">
            Session {finished.session_number} complete · {finished.word_count} words
          </div>
          <div className="mt-4 text-lg leading-relaxed text-bone-50">
            {finished.mentor_read.text}
          </div>
          {finished.mentor_read.watch_for && (
            <div className="mt-3 mono text-xs text-bone-300">
              watch for: {finished.mentor_read.watch_for}
            </div>
          )}
        </div>
        <a
          href="/history"
          className="mono inline-block text-[11px] uppercase tracking-[0.2em] rounded border border-ink-600 bg-ink-800 px-4 py-2 text-bone-100 hover:border-bone-300"
        >
          see history →
        </a>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className={`regime-${session.regime} space-y-6`}>
      <header className="flex items-baseline justify-between border-b border-ink-700 pb-3">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.25em] text-bone-400">
            Session {session.session_number} / 300
          </div>
          <div className="mono mt-1 text-sm text-bone-200">
            regime:{' '}
            <span style={{ color: 'var(--regime-color)' }}>{session.regime}</span>{' '}
            · score {session.regime_score.toFixed(0)}
          </div>
        </div>
        <div className="mono text-xs text-bone-400">
          {session.questions.length} questions
        </div>
      </header>

      <div className="space-y-10">
        {session.questions.map((q, idx) => (
          <div key={q.n} className="space-y-2">
            <div className="mono text-[10px] uppercase tracking-[0.25em] text-bone-400">
              q{q.n.toString().padStart(2, '0')}
            </div>
            <div className="text-lg leading-relaxed text-bone-50">
              {renderQuestion(q)}
            </div>
            <textarea
              className="journal-input"
              rows={4}
              value={answers[idx] ?? ''}
              onChange={(e) => {
                const next = [...answers];
                next[idx] = e.target.value;
                setAnswers(next);
              }}
              placeholder="…"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-ink-700 pt-4">
        <span className="mono text-[10px] uppercase tracking-[0.2em] text-bone-400">
          {answers.reduce((n, a) => n + (a.trim() ? a.trim().split(/\s+/).length : 0), 0)}{' '}
          words
        </span>
        <button
          onClick={submit}
          disabled={submitting || answers.every((a) => a.trim() === '')}
          className="mono text-[11px] uppercase tracking-[0.2em] rounded border border-ink-600 bg-ink-800 px-4 py-2 text-bone-100 hover:border-bone-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'reading back…' : 'submit →'}
        </button>
      </div>
    </div>
  );
}
