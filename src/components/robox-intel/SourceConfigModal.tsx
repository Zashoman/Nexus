'use client';

import { useState, useEffect } from 'react';
import type { Source } from '@/types/robox-intel';

interface Props {
  source: Source | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Modal for editing a source's config JSON. Renders a purpose-specific
 * form for known source types (google_scholar, conferences) and falls
 * back to a raw JSON editor otherwise.
 */
export function SourceConfigModal({ source, onClose, onSaved }: Props) {
  const [feeds, setFeeds] = useState<string>('');
  const [confRows, setConfRows] = useState<Array<{
    name: string;
    url: string;
    selector: string;
  }>>([]);
  const [rawJson, setRawJson] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!source) return;
    const cfg = (source.config || {}) as Record<string, unknown>;
    if (source.source_key === 'google_scholar') {
      const feedsList = Array.isArray(cfg.feeds) ? (cfg.feeds as string[]) : [];
      setFeeds(feedsList.join('\n'));
    } else if (source.source_key === 'conferences') {
      const raw = Array.isArray(cfg.conferences)
        ? (cfg.conferences as Array<{ name: string; url: string; selector?: string }>)
        : [];
      setConfRows(
        raw.map((c) => ({
          name: c.name || '',
          url: c.url || '',
          selector: c.selector || '',
        }))
      );
    } else {
      setRawJson(JSON.stringify(cfg, null, 2));
    }
    setError(null);
  }, [source]);

  if (!source) return null;

  const save = async () => {
    if (!source) return;
    setSaving(true);
    setError(null);

    let configValue: Record<string, unknown> = {};
    try {
      if (source.source_key === 'google_scholar') {
        configValue = {
          feeds: feeds
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        };
      } else if (source.source_key === 'conferences') {
        configValue = {
          conferences: confRows
            .filter((c) => c.name.trim() && c.url.trim())
            .map((c) => ({
              name: c.name.trim(),
              url: c.url.trim(),
              ...(c.selector.trim() ? { selector: c.selector.trim() } : {}),
            })),
        };
      } else {
        configValue = rawJson ? JSON.parse(rawJson) : {};
      }

      const res = await fetch(`/api/robox-intel/sources/${source.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: configValue }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#131316] border border-[#27272A] rounded-lg w-full max-w-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#131316] border-b border-[#27272A] px-5 py-3 flex items-center justify-between z-10">
          <div>
            <h2 className="text-[14px] font-semibold text-[#FAFAFA]">
              Configure {source.name}
            </h2>
            <p className="text-[10px] text-[#71717A] font-mono mt-0.5">
              {source.source_key}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#71717A] hover:text-[#FAFAFA] text-xl w-7 h-7 flex items-center justify-center rounded hover:bg-[#27272A]"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          {source.source_key === 'google_scholar' && (
            <>
              <HowTo>
                <p>
                  Create a Google Scholar alert for each paper you want to track
                  citations of (e.g. Open X-Embodiment, DROID, RT-X).
                </p>
                <ol className="list-decimal ml-5 mt-2 space-y-1 text-[11px]">
                  <li>
                    Go to{' '}
                    <a
                      href="https://scholar.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#60A5FA] underline"
                    >
                      scholar.google.com
                    </a>{' '}
                    and find the paper.
                  </li>
                  <li>Click &quot;Cited by X&quot; to see citations.</li>
                  <li>Click the envelope icon → Create alert.</li>
                  <li>
                    Pick &quot;RSS&quot; delivery. Copy the feed URL and paste
                    it below (one per line).
                  </li>
                </ol>
              </HowTo>
              <Field label="Scholar alert RSS URLs">
                <textarea
                  value={feeds}
                  onChange={(e) => setFeeds(e.target.value)}
                  className="input min-h-[120px] resize-y font-mono text-[11px]"
                  placeholder="https://scholar.google.com/scholar_alert?..."
                />
              </Field>
            </>
          )}

          {source.source_key === 'conferences' && (
            <>
              <HowTo>
                <p>
                  Add conferences to scrape for speaker/exhibitor lists. URLs
                  typically change each year — update annually.
                </p>
                <p className="mt-2">
                  Leave <code>selector</code> empty to use the default
                  name-extraction heuristic. For sites with a specific CSS
                  class, enter e.g. <code>.speaker-name</code>.
                </p>
              </HowTo>
              <Field label="Conferences">
                <div className="space-y-2">
                  {confRows.map((c, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-start"
                    >
                      <input
                        type="text"
                        placeholder="ICRA 2026"
                        value={c.name}
                        onChange={(e) => {
                          const next = [...confRows];
                          next[idx] = { ...c, name: e.target.value };
                          setConfRows(next);
                        }}
                        className="input col-span-3 text-[11px]"
                      />
                      <input
                        type="url"
                        placeholder="https://..."
                        value={c.url}
                        onChange={(e) => {
                          const next = [...confRows];
                          next[idx] = { ...c, url: e.target.value };
                          setConfRows(next);
                        }}
                        className="input col-span-6 text-[11px] font-mono"
                      />
                      <input
                        type="text"
                        placeholder=".speaker"
                        value={c.selector}
                        onChange={(e) => {
                          const next = [...confRows];
                          next[idx] = { ...c, selector: e.target.value };
                          setConfRows(next);
                        }}
                        className="input col-span-2 text-[11px] font-mono"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setConfRows(confRows.filter((_, i) => i !== idx))
                        }
                        className="col-span-1 text-[14px] text-[#52525B] hover:text-[#F87171] h-8 flex items-center justify-center rounded hover:bg-[#F87171]/10"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setConfRows([
                        ...confRows,
                        { name: '', url: '', selector: '' },
                      ])
                    }
                    className="text-[11px] text-[#60A5FA] hover:text-[#93C5FD] px-2 py-1 rounded hover:bg-[#60A5FA]/10"
                  >
                    + Add conference
                  </button>
                </div>
              </Field>
            </>
          )}

          {source.source_key !== 'google_scholar' &&
            source.source_key !== 'conferences' && (
              <Field label="Raw config JSON">
                <textarea
                  value={rawJson}
                  onChange={(e) => setRawJson(e.target.value)}
                  className="input min-h-[180px] resize-y font-mono text-[11px]"
                  placeholder="{}"
                  spellCheck={false}
                />
              </Field>
            )}

          {error && (
            <div className="text-[12px] text-[#F87171] bg-[#EF4444]/10 border border-[#EF4444]/20 rounded p-2">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-[12px] rounded-md border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#3F3F46]"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 px-4 py-2 text-[12px] rounded-md bg-[#3B82F6] hover:bg-[#2563EB] text-white font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save config'}
            </button>
          </div>
        </div>

        <style jsx>{`
          .input {
            width: 100%;
            background: #0B0B0D;
            border: 1px solid #27272A;
            border-radius: 6px;
            padding: 8px 10px;
            color: #FAFAFA;
            font-size: 12px;
            outline: none;
            transition: border-color 0.15s;
          }
          .input:focus {
            border-color: #3F3F46;
          }
        `}</style>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1.5 tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

function HowTo({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md bg-[#3B82F6]/5 border border-[#3B82F6]/20 p-3 text-[12px] text-[#A1A1AA] leading-relaxed">
      {children}
    </div>
  );
}
