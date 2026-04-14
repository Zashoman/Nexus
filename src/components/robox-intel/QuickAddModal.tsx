'use client';

import { useState } from 'react';
import type { SignalType, Relevance, Company } from '@/types/robox-intel';
import { SIGNAL_TYPE_LABELS } from '@/types/robox-intel';

interface QuickAddModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  companies: Company[];
}

const TYPES: SignalType[] = [
  'news', 'funding', 'hiring', 'press_release', 'research', 'competitor',
  'dataset', 'grant', 'quote', 'social', 'conference',
];

export function QuickAddModal({ open, onClose, onAdded, companies }: QuickAddModalProps) {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<SignalType>('news');
  const [relevance, setRelevance] = useState<Relevance>('medium');
  const [summary, setSummary] = useState('');
  const [suggestedAction, setSuggestedAction] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const filteredCompanies = company
    ? companies.filter((c) =>
        c.name.toLowerCase().includes(company.toLowerCase()) &&
        c.name.toLowerCase() !== company.toLowerCase()
      ).slice(0, 5)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const res = await fetch('/api/robox-intel/signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        company,
        url,
        type,
        relevance,
        summary,
        suggestedAction,
        source: 'Manual Entry',
        date: new Date().toISOString().split('T')[0],
        tags,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to add signal');
      setSubmitting(false);
      return;
    }

    // Reset form
    setTitle('');
    setCompany('');
    setUrl('');
    setType('news');
    setRelevance('medium');
    setSummary('');
    setSuggestedAction('');
    setTagsInput('');
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
            Quick Add Signal
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
              placeholder="e.g. Figure AI raises $500M Series B"
            />
          </Field>

          <Field label="Company" required>
            <div className="relative">
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                className="input"
                placeholder="Figure AI"
              />
              {filteredCompanies.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1C1C20] border border-[#27272A] rounded-md overflow-hidden z-10">
                  {filteredCompanies.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCompany(c.name)}
                      className="w-full text-left px-3 py-1.5 text-[12px] text-[#D4D4D8] hover:bg-[#27272A]"
                    >
                      {c.name}{' '}
                      <span className="text-[10px] text-[#71717A]">
                        ({c.tier})
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <Field label="URL" required>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="input"
              placeholder="https://..."
            />
          </Field>

          <Field label="Signal Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as SignalType)}
              className="input"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {SIGNAL_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Relevance">
            <div className="flex gap-1">
              {(['high', 'medium', 'low'] as Relevance[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRelevance(r)}
                  className={`flex-1 px-3 py-2 text-[12px] rounded-md border transition-all capitalize ${
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

          <Field label="Summary (optional)">
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="input min-h-[60px] resize-y"
              placeholder="Brief context..."
            />
          </Field>

          <Field label="Suggested Action (optional)">
            <textarea
              value={suggestedAction}
              onChange={(e) => setSuggestedAction(e.target.value)}
              className="input min-h-[60px] resize-y"
              placeholder="What should we do about this?"
            />
          </Field>

          <Field label="Tags (optional)">
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="input"
              placeholder="comma, separated, tags"
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
              className="flex-1 px-4 py-2 text-[12px] rounded-md bg-[#EF4444] hover:bg-[#DC2626] text-white font-medium disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Signal'}
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
