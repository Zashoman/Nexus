'use client';

import { useState } from 'react';
import { CATEGORY_LABELS, type IntelCategory, type IntelBelief } from '@/types/intel';
import { apiFetch } from '@/lib/api-client';

interface AddBeliefModalProps {
  onClose: () => void;
  onSave: () => void;
  editBelief?: IntelBelief | null;
}

export default function AddBeliefModal({
  onClose,
  onSave,
  editBelief,
}: AddBeliefModalProps) {
  const [title, setTitle] = useState(editBelief?.title || '');
  const [description, setDescription] = useState(editBelief?.description || '');
  const [category, setCategory] = useState(editBelief?.category || 'frontier_models');
  const [confidence, setConfidence] = useState(
    editBelief?.initial_confidence || 50
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim() || !description.trim()) return;
    setSaving(true);

    try {
      if (editBelief) {
        await apiFetch('/api/intel/beliefs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editBelief.id,
            title,
            description,
          }),
        });
      } else {
        await apiFetch('/api/intel/beliefs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            category,
            initial_confidence: confidence,
          }),
        });
      }
      onSave();
      onClose();
    } catch {
      // Silent
    } finally {
      setSaving(false);
    }
  }

  const confidenceLabel =
    confidence <= 10
      ? 'Very unlikely'
      : confidence <= 25
      ? 'Unlikely'
      : confidence <= 40
      ? 'Somewhat unlikely'
      : confidence <= 60
      ? 'Coin flip'
      : confidence <= 75
      ? 'Somewhat likely'
      : confidence <= 90
      ? 'Likely'
      : 'Very likely';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm w-full max-w-lg">
        <div className="px-4 py-3 border-b border-[#1E2A3A] flex items-center justify-between">
          <h3 className="text-sm font-mono text-[#E8EAED]">
            {editBelief ? 'Edit Belief' : '+ Add Belief'}
          </h3>
          <button
            onClick={onClose}
            className="text-[#5A6A7A] hover:text-[#E8EAED] cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[10px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., AI infrastructure buildout will require 2-3x grid capacity by 2028"
              className="w-full bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-3 py-2 text-sm text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of what you believe and why..."
              rows={3}
              className="w-full bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-3 py-2 text-sm text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF] resize-none"
            />
          </div>

          {/* Category (only for new beliefs) */}
          {!editBelief && (
            <div>
              <label className="block text-[10px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-3 py-2 text-sm text-[#E8EAED] focus:outline-none focus:border-[#4488FF]"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Confidence slider (only for new beliefs) */}
          {!editBelief && (
            <div>
              <label className="block text-[10px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-1">
                Initial Confidence:{' '}
                <span className="text-[#E8EAED]">
                  {Math.round(confidence)}%
                </span>{' '}
                <span className="text-[#4488FF]">— {confidenceLabel}</span>
              </label>
              <input
                type="range"
                min="5"
                max="95"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="w-full accent-[#4488FF]"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#5A6A7A] mt-0.5">
                <span>5% Very unlikely</span>
                <span>50% Coin flip</span>
                <span>95% Very likely</span>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-[#1E2A3A] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-mono text-[#5A6A7A] hover:text-[#8899AA] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !description.trim()}
            className="px-4 py-1.5 text-xs font-mono bg-[#4488FF] text-white rounded-sm hover:bg-[#5599FF] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? 'Saving...' : editBelief ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
