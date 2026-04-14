'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Settings } from '@/lib/robox-intel/settings';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await fetch('/api/robox-intel/settings');
      const data = await res.json();
      if (!cancelled) {
        setSettings(data);
        setDraft(data);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/robox-intel/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      const data = await res.json();
      setSettings(data);
      setDraft(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const dirty = JSON.stringify(settings) !== JSON.stringify(draft);

  return (
    <div className="min-h-screen w-full bg-[#09090B] text-[#FAFAFA]">
      <header className="sticky top-0 z-30 bg-[#09090B]/95 backdrop-blur border-b border-[#27272A]">
        <div className="max-w-[720px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[17px] font-bold tracking-tight">ROBOX</span>
            <span className="text-[11px] font-light tracking-[0.3em] text-[#71717A]">
              INTEL
            </span>
            <span className="text-[11px] text-[#71717A] ml-3">/ settings</span>
          </div>
          <Link
            href="/robox-intel"
            className="text-[12px] text-[#A1A1AA] hover:text-[#FAFAFA]"
          >
            ← Back
          </Link>
        </div>
      </header>

      <main className="max-w-[720px] mx-auto px-6 py-6">
        {!draft ? (
          <div className="text-center py-16 text-[#71717A] text-[13px]">
            Loading...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Automation rules */}
            <Card
              title="Automation"
              description="Rules that the ingestion pipeline and cron jobs follow."
            >
              <NumberField
                label="Auto-archive threshold (days)"
                hint="New signals untouched for this many days get auto-dismissed."
                value={draft.auto_archive_days}
                onChange={(v) =>
                  setDraft({ ...draft, auto_archive_days: v })
                }
                min={7}
                max={365}
              />
              <ToggleField
                label="LLM-enhanced summaries"
                hint="Use Claude Haiku to rewrite summary + action for high-relevance signals. Falls back to templates on API failure. Requires ANTHROPIC_API_KEY."
                value={draft.llm_enabled}
                onChange={(v) => setDraft({ ...draft, llm_enabled: v })}
              />
            </Card>

            {/* Velocity alerts */}
            <Card
              title="Velocity alerts"
              description="When a tracked company accumulates multiple signals in a short window, Slack gets a velocity ping."
            >
              <NumberField
                label="Signal threshold"
                hint="Ping after this many signals"
                value={draft.velocity_threshold}
                onChange={(v) =>
                  setDraft({ ...draft, velocity_threshold: v })
                }
                min={2}
                max={20}
              />
              <NumberField
                label="Window (hours)"
                hint="Within this many hours"
                value={draft.velocity_window_hours}
                onChange={(v) =>
                  setDraft({ ...draft, velocity_window_hours: v })
                }
                min={1}
                max={168}
              />
            </Card>

            {/* Digest */}
            <Card
              title="Daily digest"
              description="Sends HTML email of high-relevance new signals from the last 24h. Runs at 08:00 UTC via cron. Requires RESEND_API_KEY (or legacy DIGEST_WEBHOOK_URL)."
            >
              <ArrayField
                label="Recipients"
                hint="One email per line."
                value={draft.digest_recipients}
                onChange={(v) =>
                  setDraft({ ...draft, digest_recipients: v })
                }
                placeholder="founder@example.com"
              />
              <Link
                href="/robox-intel/digest"
                className="inline-block text-[11px] text-[#60A5FA] hover:text-[#93C5FD] mt-2"
              >
                Preview tomorrow&apos;s digest →
              </Link>
            </Card>

            {/* Env status (read-only) */}
            <Card
              title="Environment"
              description="Server-side integrations. These read from env vars on the server; configure via your deployment."
            >
              <EnvRow name="RESEND_API_KEY" purpose="Send daily digest" />
              <EnvRow
                name="ROBOX_SLACK_WEBHOOK_URL"
                purpose="Tier 1 + velocity alerts"
              />
              <EnvRow
                name="ANTHROPIC_API_KEY"
                purpose="LLM summaries (toggle above)"
              />
              <EnvRow
                name="SAM_API_KEY"
                purpose="SAM.gov DARPA grant fetcher"
              />
            </Card>

            {error && (
              <div className="text-[12px] text-[#F87171] bg-[#EF4444]/10 border border-[#EF4444]/20 rounded p-3">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 sticky bottom-6 bg-[#09090B]/95 backdrop-blur py-3 border-t border-[#27272A]">
              <button
                onClick={save}
                disabled={!dirty || saving}
                className="px-4 py-2 text-[12px] rounded-md bg-[#3B82F6] hover:bg-[#2563EB] text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              {saved && (
                <span className="text-[12px] text-[#4ADE80]">✓ Saved</span>
              )}
              {dirty && !saved && (
                <span className="text-[12px] text-[#71717A]">
                  Unsaved changes
                </span>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[#27272A] bg-[#0F0F11] p-5">
      <h2 className="text-[14px] font-semibold text-[#FAFAFA] mb-1">{title}</h2>
      {description && (
        <p className="text-[12px] text-[#71717A] mb-4 leading-relaxed">
          {description}
        </p>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function NumberField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1 tracking-wide">
        {label}
      </label>
      {hint && <p className="text-[10px] text-[#52525B] mb-1.5">{hint}</p>}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className="w-32 px-3 py-1.5 bg-[#0B0B0D] border border-[#27272A] rounded-md text-[12px] text-[#FAFAFA] focus:outline-none focus:border-[#3F3F46]"
      />
    </div>
  );
}

function ToggleField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full flex-shrink-0 mt-0.5 transition-colors ${
          value ? 'bg-[#3B82F6]' : 'bg-[#27272A]'
        }`}
        aria-pressed={value}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
            value ? 'left-5' : 'left-0.5'
          }`}
        />
      </button>
      <div>
        <div className="text-[12px] font-medium text-[#FAFAFA]">{label}</div>
        {hint && (
          <div className="text-[11px] text-[#71717A] leading-relaxed mt-0.5">
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}

function ArrayField({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(value.join('\n'));

  // Sync external value → local text only when value set changes meaningfully
  useEffect(() => {
    setText(value.join('\n'));
  }, [value]);

  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1 tracking-wide">
        {label}
      </label>
      {hint && <p className="text-[10px] text-[#52525B] mb-1.5">{hint}</p>}
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(
            e.target.value
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean)
          );
        }}
        placeholder={placeholder}
        className="w-full min-h-[80px] px-3 py-2 bg-[#0B0B0D] border border-[#27272A] rounded-md text-[12px] text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:border-[#3F3F46] resize-y font-mono"
      />
    </div>
  );
}

function EnvRow({ name, purpose }: { name: string; purpose: string }) {
  return (
    <div className="flex items-baseline justify-between py-1 border-b border-[#1C1C1F] last:border-b-0">
      <code className="text-[11px] text-[#FAFAFA] font-mono">{name}</code>
      <span className="text-[11px] text-[#71717A]">{purpose}</span>
    </div>
  );
}
