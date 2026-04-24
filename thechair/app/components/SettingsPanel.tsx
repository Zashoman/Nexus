'use client';

import { useEffect, useState } from 'react';

export default function SettingsPanel() {
  const [levels, setLevels] = useState<string[]>(['', '', '', '']);
  const [saved, setSaved] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/settings/drawdown-levels');
      if (!res.ok) return;
      const { levels: arr } = (await res.json()) as { levels: number[] };
      setSaved(arr);
      // Pad to 4 slots for the default editor layout.
      const padded = [...arr.map(String)];
      while (padded.length < 4) padded.push('');
      setLevels(padded);
    })();
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    const parsed = levels
      .map((s) => s.trim())
      .filter((s) => s !== '')
      .map(Number)
      .filter((n) => Number.isFinite(n));
    const res = await fetch('/api/settings/drawdown-levels', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ levels: parsed }),
    });
    setSaving(false);
    if (!res.ok) {
      setMsg('save failed');
      return;
    }
    const { levels: next } = (await res.json()) as { levels: number[] };
    setSaved(next);
    const padded = [...next.map(String)];
    while (padded.length < 4) padded.push('');
    setLevels(padded);
    setMsg('saved');
    setTimeout(() => setMsg(null), 1500);
  }

  return (
    <section className="space-y-6">
      <header className="border-b border-ink-700 pb-3">
        <h1 className="mono text-[11px] uppercase tracking-[0.25em] text-bone-400">
          Settings
        </h1>
        <div className="mt-1 text-lg text-bone-100">
          what The Chair alerts you on
        </div>
      </header>

      <div className="tile space-y-4 px-5 py-5">
        <div>
          <div className="tile-label">Drawdown alert levels</div>
          <p className="mt-2 text-sm text-bone-300">
            Percent off the high-water mark. When a watchlist name crosses any
            of these, an alert fires and the mentor leads the next session
            with it. Your buy-zone rule sits among these — usually the middle
            one.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {levels.map((v, i) => (
            <label key={i} className="block">
              <span className="mono text-[10px] uppercase tracking-widest text-bone-400">
                level {i + 1}
              </span>
              <div className="mt-1 flex items-baseline border-b border-ink-700 focus-within:border-bone-300">
                <span className="mono text-sm text-bone-400">−</span>
                <input
                  className="mono flex-1 bg-transparent px-1 py-1.5 text-lg text-bone-100 outline-none tabular-nums"
                  inputMode="decimal"
                  value={v}
                  placeholder="—"
                  onChange={(e) => {
                    const next = [...levels];
                    next[i] = e.target.value;
                    setLevels(next);
                  }}
                />
                <span className="mono text-sm text-bone-400">%</span>
              </div>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="mono text-[11px] text-bone-400">
            current: {saved.map((n) => `−${n}%`).join(' · ') || '—'}
          </span>
          <div className="flex items-center gap-3">
            {msg && (
              <span className="mono text-[10px] uppercase tracking-widest text-accent">
                {msg}
              </span>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="mono text-[11px] uppercase tracking-[0.2em] rounded border border-ink-600 bg-ink-800 px-4 py-2 text-bone-100 hover:border-bone-300 disabled:opacity-40"
            >
              {saving ? 'saving…' : 'save'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
