'use client';

import { useState } from 'react';
import type { CompanyTier } from '@/types/robox-intel';
import { TIER_COLORS } from '@/types/robox-intel';

interface AddCompanyModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

const TIER_OPTIONS: { key: CompanyTier; label: string }[] = [
  { key: 'hot_lead', label: 'Hot Lead' },
  { key: 'prospect', label: 'Prospect' },
  { key: 'academic', label: 'Academic' },
  { key: 'competitor', label: 'Competitor' },
];

export function AddCompanyModal({ open, onClose, onAdded }: AddCompanyModalProps) {
  const [name, setName] = useState('');
  const [tier, setTier] = useState<CompanyTier>('prospect');
  const [status, setStatus] = useState('');
  const [raised, setRaised] = useState('');
  const [valuation, setValuation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch('/api/robox-intel/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        tier,
        status: status || undefined,
        raised: raised || undefined,
        valuation: valuation || undefined,
        notes: notes || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to add company');
      setSubmitting(false);
      return;
    }
    setName('');
    setStatus('');
    setRaised('');
    setValuation('');
    setNotes('');
    setSubmitting(false);
    onAdded();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#131316] border border-[#27272A] rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#131316] border-b border-[#27272A] px-5 py-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-[#FAFAFA]">
            Add Company
          </h2>
          <button
            onClick={onClose}
            className="text-[#71717A] hover:text-[#FAFAFA] text-xl w-7 h-7 flex items-center justify-center rounded hover:bg-[#27272A]"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="Name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input"
              placeholder="Figure AI"
            />
          </Field>

          <Field label="Tier">
            <div className="flex gap-1">
              {TIER_OPTIONS.map((t) => {
                const active = tier === t.key;
                const color = TIER_COLORS[t.key];
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTier(t.key)}
                    className={`flex-1 px-2 py-2 text-[11px] rounded-md border transition-all font-medium ${
                      active
                        ? 'text-[#FAFAFA]'
                        : 'text-[#71717A] border-[#27272A] hover:text-[#D4D4D8]'
                    }`}
                    style={
                      active
                        ? {
                            backgroundColor: `${color}20`,
                            borderColor: `${color}60`,
                            color,
                          }
                        : undefined
                    }
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Raised">
              <input
                type="text"
                value={raised}
                onChange={(e) => setRaised(e.target.value)}
                className="input"
                placeholder="$500M"
              />
            </Field>
            <Field label="Valuation">
              <input
                type="text"
                value={valuation}
                onChange={(e) => setValuation(e.target.value)}
                className="input"
                placeholder="$5B"
              />
            </Field>
          </div>

          <Field label="Status">
            <input
              type="text"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input"
              placeholder="e.g. Series C, YC S24, Stealth"
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input min-h-[70px] resize-y"
              placeholder="Free-form notes..."
            />
          </Field>

          {error && (
            <div className="text-[12px] text-[#F87171] bg-[#EF4444]/10 border border-[#EF4444]/20 rounded p-2">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-[12px] rounded-md border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#3F3F46]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 text-[12px] rounded-md bg-[#3B82F6] hover:bg-[#2563EB] text-white font-medium disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Company'}
            </button>
          </div>
        </form>

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
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1.5 tracking-wide">
        {label} {required && <span className="text-[#EF4444]">*</span>}
      </label>
      {children}
    </div>
  );
}
