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

  async function saveField(id: number, field: string, value: unknown) {
    const res = await fetch('/api/watchlist', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, [field]: value }),
    });
    if (res.ok) load();
  }

  return (
    <section className="space-y-6">
      <header className="border-b border-ink-700 pb-3">
        <h1 className="mono text-[11px] uppercase tracking-[0.25em] text-bone-400">
          Watchlist
        </h1>
        <div className="mt-1 text-lg text-bone-100">
          {items.length} names · edit thesis, high, entry, trigger in place
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
            onChange={(e) =>
              setDraft({ ...draft, trigger_price: e.target.value })
            }
          />
          <input
            className="md:col-span-3 bg-ink-950 border border-ink-700 rounded px-3 py-2 text-sm text-bone-100 focus:border-bone-300 outline-none"
            placeholder="invalidator — what kills the thesis?"
            value={draft.invalidator}
            onChange={(e) =>
              setDraft({ ...draft, invalidator: e.target.value })
            }
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
            empty
          </li>
        )}
        {items.map((it) => (
          <li key={it.id} className="py-4">
            <Row item={it} onSave={saveField} onArchive={archive} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Row({
  item,
  onSave,
  onArchive,
}: {
  item: WatchlistItem;
  onSave: (id: number, field: string, value: unknown) => Promise<void>;
  onArchive: (id: number) => Promise<void>;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="mono text-base text-bone-50">{item.ticker}</span>
          {typeof item.price === 'number' && (
            <span className="mono text-xs text-bone-400">
              ${item.price.toFixed(2)}
            </span>
          )}
          {typeof item.drawdown_from_high === 'number' && (
            <span
              className={`mono text-xs ${
                item.drawdown_from_high <= -30
                  ? 'text-dislocation'
                  : item.drawdown_from_high <= -25
                    ? 'text-stressed'
                    : 'text-bone-400'
              }`}
            >
              {item.drawdown_from_high.toFixed(1)}% off high
            </span>
          )}
          {item.deepest_level && (
            <span className="mono text-[10px] uppercase tracking-widest text-stressed">
              ● −{item.deepest_level}
            </span>
          )}
        </div>
        <button
          onClick={() => onArchive(item.id)}
          className="mono text-[10px] uppercase tracking-widest text-bone-400 hover:text-down"
        >
          archive
        </button>
      </div>

      <InlineField
        label="thesis"
        value={item.thesis}
        onSave={(v) => onSave(item.id, 'thesis', v)}
        multiline
        placeholder="one-sentence thesis"
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <InlineNumberField
          label="high-water mark"
          value={item.high_water_mark}
          onSave={(v) => onSave(item.id, 'high_water_mark', v)}
          hint="used for the −25/-30/-35/-40 alerts"
        />
        <InlineNumberField
          label="entry price"
          value={item.entry_price}
          onSave={(v) => onSave(item.id, 'entry_price', v)}
          hint="what it cost when you added it"
        />
        <InlineNumberField
          label="trigger"
          value={item.trigger_price}
          onSave={(v) => onSave(item.id, 'trigger_price', v)}
          hint="user-defined buy level"
        />
      </div>
      <InlineField
        label="invalidator"
        value={item.invalidator ?? ''}
        onSave={(v) => onSave(item.id, 'invalidator', v || null)}
        placeholder="what kills the thesis?"
      />
    </div>
  );
}

function InlineField({
  label,
  value,
  onSave,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onSave: (next: string) => Promise<void>;
  placeholder?: string;
  multiline?: boolean;
}) {
  const [local, setLocal] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setLocal(value), [value]);

  async function commit() {
    if (local === value) return;
    setSaving(true);
    await onSave(local);
    setSaving(false);
  }

  const shared =
    'w-full bg-transparent border-b border-ink-700 focus:border-bone-300 outline-none text-sm text-bone-100 py-1.5';

  return (
    <label className="mt-2 block">
      <span className="mono text-[10px] uppercase tracking-widest text-bone-400">
        {label}
        {saving && <span className="ml-2 text-accent">saving…</span>}
      </span>
      {multiline ? (
        <textarea
          className={shared}
          rows={2}
          value={local}
          placeholder={placeholder}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
        />
      ) : (
        <input
          className={shared}
          value={local}
          placeholder={placeholder}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
        />
      )}
    </label>
  );
}

function InlineNumberField({
  label,
  value,
  onSave,
  hint,
}: {
  label: string;
  value: number | null;
  onSave: (next: number | null) => Promise<void>;
  hint?: string;
}) {
  const [local, setLocal] = useState(value !== null ? String(value) : '');
  const [saving, setSaving] = useState(false);
  useEffect(() => setLocal(value !== null ? String(value) : ''), [value]);

  async function commit() {
    const trimmed = local.trim();
    const next = trimmed === '' ? null : Number(trimmed);
    if (next !== null && !Number.isFinite(next)) return;
    const same = (value === null && next === null) || value === next;
    if (same) return;
    setSaving(true);
    await onSave(next);
    setSaving(false);
  }

  return (
    <label className="mt-2 block">
      <span className="mono text-[10px] uppercase tracking-widest text-bone-400">
        {label}
        {saving && <span className="ml-2 text-accent">saving…</span>}
      </span>
      <input
        className="mono w-full bg-transparent border-b border-ink-700 focus:border-bone-300 outline-none text-sm text-bone-100 py-1.5 tabular-nums"
        inputMode="decimal"
        value={local}
        placeholder={hint ?? ''}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
      />
      {hint && (
        <span className="mono text-[10px] text-bone-400 italic">{hint}</span>
      )}
    </label>
  );
}
