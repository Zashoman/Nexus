'use client';

import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export function AddPitchModal({ open, onClose, onAdded }: Props) {
  const [title, setTitle] = useState('');
  const [targetOutlets, setTargetOutlets] = useState('');
  const [hook, setHook] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/robox-intel/media/pitches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, targetOutlets, hook }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to add pitch angle');
      setSubmitting(false);
      return;
    }
    setTitle('');
    setTargetOutlets('');
    setHook('');
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
        className="bg-[#131316] border border-[#27272A] rounded-lg w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[#27272A] px-5 py-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-[#FAFAFA]">
            Add Pitch Angle
          </h2>
          <button
            onClick={onClose}
            className="text-[#71717A] hover:text-[#FAFAFA] text-xl w-7 h-7 flex items-center justify-center rounded hover:bg-[#27272A]"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="Title" required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="input"
              placeholder="e.g. Data Diversity = Robot Safety"
            />
          </Field>

          <Field label="Target Outlets" required>
            <input
              type="text"
              value={targetOutlets}
              onChange={(e) => setTargetOutlets(e.target.value)}
              required
              className="input"
              placeholder="TechCrunch, The Verge, WIRED"
            />
          </Field>

          <Field label="Hook" required>
            <textarea
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              required
              className="input min-h-[100px] resize-y"
              placeholder="The story angle. Why should this reporter care right now?"
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
              {submitting ? 'Adding...' : 'Add Angle'}
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
