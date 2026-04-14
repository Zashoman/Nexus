'use client';

import { useState } from 'react';
import type { MediaContactType, Relevance } from '@/types/robox-intel';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

const TYPES: { key: MediaContactType; label: string }[] = [
  { key: 'journalist', label: 'Journalist' },
  { key: 'newsletter', label: 'Newsletter' },
  { key: 'publication', label: 'Publication' },
];

export function AddMediaContactModal({ open, onClose, onAdded }: Props) {
  const [name, setName] = useState('');
  const [outlet, setOutlet] = useState('');
  const [type, setType] = useState<MediaContactType>('journalist');
  const [beat, setBeat] = useState('');
  const [relevance, setRelevance] = useState<Relevance>('medium');
  const [notes, setNotes] = useState('');
  const [email, setEmail] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/robox-intel/media/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        outlet,
        type,
        beat: beat || undefined,
        relevance,
        notes: notes || undefined,
        email: email || undefined,
        linkedin_url: linkedin || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to add contact');
      setSubmitting(false);
      return;
    }
    setName('');
    setOutlet('');
    setBeat('');
    setNotes('');
    setEmail('');
    setLinkedin('');
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
            Add Media Contact
          </h2>
          <button
            onClick={onClose}
            className="text-[#71717A] hover:text-[#FAFAFA] text-xl w-7 h-7 flex items-center justify-center rounded hover:bg-[#27272A]"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input"
                placeholder="Evan Ackerman"
              />
            </Field>
            <Field label="Outlet" required>
              <input
                type="text"
                value={outlet}
                onChange={(e) => setOutlet(e.target.value)}
                required
                className="input"
                placeholder="IEEE Spectrum"
              />
            </Field>
          </div>

          <Field label="Type">
            <div className="flex gap-1">
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key)}
                  className={`flex-1 px-3 py-2 text-[11px] rounded-md border transition-all ${
                    type === t.key
                      ? 'bg-[#27272A] border-[#3F3F46] text-[#FAFAFA]'
                      : 'border-[#27272A] text-[#71717A] hover:text-[#D4D4D8]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Beat">
            <input
              type="text"
              value={beat}
              onChange={(e) => setBeat(e.target.value)}
              className="input"
              placeholder="Robotics / AI"
            />
          </Field>

          <Field label="Priority">
            <div className="flex gap-1">
              {(['high', 'medium', 'low'] as Relevance[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRelevance(r)}
                  className={`flex-1 px-3 py-2 text-[11px] rounded-md border transition-all capitalize ${
                    relevance === r
                      ? r === 'high'
                        ? 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#F87171]'
                        : r === 'medium'
                          ? 'bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#FBBF24]'
                          : 'bg-[#6B7280]/15 border-[#6B7280]/40 text-[#D4D4D8]'
                      : 'border-[#27272A] text-[#71717A] hover:text-[#D4D4D8]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="name@outlet.com"
              />
            </Field>
            <Field label="LinkedIn URL">
              <input
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                className="input"
                placeholder="https://linkedin.com/in/..."
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input min-h-[70px] resize-y"
              placeholder="Beat description, recent coverage, pitch angle..."
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
              className="flex-1 px-4 py-2 text-[12px] rounded-md bg-[#F97316] hover:bg-[#EA580C] text-white font-medium disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Contact'}
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
