'use client';

import { useEffect, useState } from 'react';
import type { WatchlistItem } from '../../lib/types';

export default function WatchlistEditor() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({
    ticker: '',
    thesis: '',
    trigger_price: '',
    invalidator: '',
  });

  async function load() {
    const res = await fetch('/api/watchlist');
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addItem() {
    if (!draft.ticker.trim() || !draft.thesis.trim()) return;
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ticker: draft.ticker.toUpperCase().trim(),
        thesis: draft.thesis.trim(),
        trigger_price: draft.trigger_price ? Number(draft.trigger_price) : null,
        invalidator: draft.invalidator.trim() || null,
      }),
    });
    if (res.ok) {
      setDraft({ ticker: '', thesis: '', trigger_price: '', invalidator: '' });
      load();
    }
  }

  async function archive(id: number) {
    await fetch(`/api/watchlist?id=${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <section className="space-y-6">
      <header className="border-b border-ink-700 pb-3">
        <h1 className="mono text-[11px] uppercase tracking-[0.25em] text-bone-400">
          Watchlist
        </h1>
        <div className="mt-1 text-lg text-bone-100">
          {items.length} names · edit thesis in place
        </div>
      </header>

      <div className="tile space-y-2 px-5 py-4">
        <div className="tile-label">Add a name</div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <input
            className="mono bg-ink-950 border border-ink-700 rounded px-3 py-2 text-sm text-bone-100 focus:border-bone-300 outline-none"
            placeholder="ticker"
            value={draft.ticker}
            onChange={(e) => setDraft({ ...draft, ticker: e.target.value })}
          />
          <input
            className="md:col-span-2 bg-ink-950 border border-ink-700 rounded px-3 py-2 text-sm text-bone-100 focus:border-bone-300 outline-none"
            placeholder="thesis (one sentence)"
            value={draft.thesis}
            onChange={(e) => setDraft({ ...draft, thesis: e.target.value })}
          />
          <input
            className="mono bg-ink-950 border border-ink-700 rounded px-3 py-2 text-sm text-bone-100 focus:border-bone-300 outline-none"
            placeholder="trigger $"
            inputMode="decimal"
            value={draft.trigger_price}
            onChange={(e) => setDraft({ ...draft, trigger_price: e.target.value })}
          />
          <input
            className="md:col-span-3 bg-ink-950 border border-ink-700 rounded px-3 py-2 text-sm text-bone-100 focus:border-bone-300 outline-none"
            placeholder="invalidator — what kills the thesis?"
            value={draft.invalidator}
            onChange={(e) => setDraft({ ...draft, invalidator: e.target.value })}
          />
          <button
            onClick={addItem}
            className="mono text-[11px] uppercase tracking-[0.2em] rounded border border-ink-600 bg-ink-800 px-4 py-2 text-bone-100 hover:border-bone-300"
          >
            add
          </button>
        </div>
      </div>

      <ul className="divide-y divide-ink-700 border-t border-ink-700">
        {loading && (
          <li className="py-6 text-center text-bone-400 mono text-[11px] uppercase tracking-[0.2em]">
            loading…
          </li>
        )}
        {!loading && items.length === 0 && (
          <li className="py-6 text-center text-bone-400 mono text-[11px] uppercase tracking-[0.2em]">
            empty — add a name above
          </li>
        )}
        {items.map((it) => (
          <li key={it.id} className="py-4">
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex items-baseline gap-4">
                <span className="mono text-base text-bone-50">{it.ticker}</span>
                {typeof it.price === 'number' && (
                  <span className="mono text-xs text-bone-400">
                    ${it.price.toFixed(2)}
                  </span>
                )}
                {typeof it.iv_rank === 'number' && (
                  <span className="mono text-xs text-bone-400">
                    IV-rk {it.iv_rank.toFixed(0)}
                  </span>
                )}
                {typeof it.drawdown_52w === 'number' && (
                  <span className="mono text-xs text-down">
                    {it.drawdown_52w.toFixed(1)}% dd
                  </span>
                )}
                {it.trigger_hit && (
                  <span className="mono text-[10px] uppercase tracking-widest text-accent">
                    ● trigger hit
                  </span>
                )}
              </div>
              <button
                onClick={() => archive(it.id)}
                className="mono text-[10px] uppercase tracking-widest text-bone-400 hover:text-down"
              >
                archive
              </button>
            </div>
            <div className="mt-2 text-sm text-bone-100">{it.thesis}</div>
            <div className="mt-1 flex gap-6 mono text-xs text-bone-400">
              {it.trigger_price !== null && <span>trigger ${it.trigger_price}</span>}
              {it.invalidator && <span>invalidator — {it.invalidator}</span>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
