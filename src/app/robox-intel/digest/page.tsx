'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Signal } from '@/types/robox-intel';

interface DigestBundle {
  date: string;
  signalsFound: number;
  signals: Signal[];
  html: string;
  text: string;
}

export default function DigestPreviewPage() {
  const [bundle, setBundle] = useState<DigestBundle | null>(null);
  const [view, setView] = useState<'html' | 'text'>('html');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [recipientsInput, setRecipientsInput] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await fetch('/api/robox-intel/digest?preview=true', {
        method: 'POST',
      });
      const data = await res.json();
      if (!cancelled) setBundle(data);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sendNow = async () => {
    setSending(true);
    setSendResult(null);
    const recipients = recipientsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await fetch('/api/robox-intel/digest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        recipients.length > 0 ? { recipients } : {}
      ),
    });
    const data = await res.json();
    setSending(false);
    setSendResult(
      data.sent
        ? `Sent via ${data.provider} to ${(data.deliveredTo || []).join(', ')}`
        : `Not sent: ${data.reason}`
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#09090B] text-[#FAFAFA]">
      <header className="sticky top-0 z-30 bg-[#09090B]/95 backdrop-blur border-b border-[#27272A]">
        <div className="max-w-[900px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[17px] font-bold tracking-tight">ROBOX</span>
            <span className="text-[11px] font-light tracking-[0.3em] text-[#71717A]">
              INTEL
            </span>
            <span className="text-[11px] text-[#71717A] ml-3">/ digest preview</span>
          </div>
          <Link
            href="/robox-intel"
            className="text-[12px] text-[#A1A1AA] hover:text-[#FAFAFA]"
          >
            ← Back
          </Link>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-6 py-6">
        {!bundle ? (
          <div className="text-center py-16 text-[#71717A] text-[13px]">
            Loading...
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg border border-[#27272A] bg-[#0F0F11] p-4">
              <h1 className="text-[14px] font-semibold mb-1">
                Tomorrow&apos;s digest ({bundle.date})
              </h1>
              <p className="text-[12px] text-[#71717A] mb-3">
                {bundle.signalsFound} high-priority signal
                {bundle.signalsFound === 1 ? '' : 's'} from the last 24 hours.
                Runs automatically at 08:00 UTC.
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Override recipients (comma-separated)"
                  value={recipientsInput}
                  onChange={(e) => setRecipientsInput(e.target.value)}
                  className="flex-1 min-w-[200px] px-3 py-1.5 bg-[#0B0B0D] border border-[#27272A] rounded-md text-[12px] text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:border-[#3F3F46]"
                />
                <button
                  onClick={sendNow}
                  disabled={sending}
                  className="px-4 py-1.5 text-[12px] rounded-md bg-[#3B82F6] hover:bg-[#2563EB] text-white font-medium disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send now'}
                </button>
              </div>
              {sendResult && (
                <p className="text-[12px] mt-2 text-[#A1A1AA] font-mono">
                  {sendResult}
                </p>
              )}
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => setView('html')}
                className={`text-[11px] px-3 py-1.5 rounded-md transition-colors ${
                  view === 'html'
                    ? 'bg-[#27272A] text-[#FAFAFA]'
                    : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                }`}
              >
                HTML
              </button>
              <button
                onClick={() => setView('text')}
                className={`text-[11px] px-3 py-1.5 rounded-md transition-colors ${
                  view === 'text'
                    ? 'bg-[#27272A] text-[#FAFAFA]'
                    : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                }`}
              >
                Plain text
              </button>
            </div>

            {view === 'html' ? (
              <div className="rounded-lg border border-[#27272A] bg-white text-black overflow-hidden">
                <iframe
                  title="Digest HTML preview"
                  srcDoc={`<html><body style="padding: 20px; font-family: system-ui, sans-serif; background: white; color: #111;">${bundle.html}</body></html>`}
                  className="w-full"
                  style={{ height: '70vh', border: 'none' }}
                />
              </div>
            ) : (
              <pre className="rounded-lg border border-[#27272A] bg-[#0F0F11] p-4 text-[11px] text-[#D4D4D8] font-mono whitespace-pre-wrap overflow-auto max-h-[70vh]">
                {bundle.text}
              </pre>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
