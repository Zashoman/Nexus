'use client';

import { useEffect, useState } from 'react';
import type { IntelBelief, SynthesisNarrative } from '@/types/intel';
import BeliefCard from './BeliefCard';
import AddBeliefModal from './AddBeliefModal';

export default function SynthesisView() {
  const [beliefs, setBeliefs] = useState<IntelBelief[]>([]);
  const [synthesis, setSynthesis] = useState<SynthesisNarrative | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editBelief, setEditBelief] = useState<IntelBelief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingSynthesis, setGeneratingSynthesis] = useState(false);

  useEffect(() => {
    fetchBeliefs();
    fetchSynthesis();
  }, []);

  async function fetchBeliefs() {
    try {
      const res = await fetch('/api/intel/beliefs');
      const data = await res.json();
      setBeliefs(data.beliefs || []);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }

  async function fetchSynthesis() {
    try {
      setGeneratingSynthesis(true);
      const res = await fetch('/api/intel/synthesis');
      const data = await res.json();
      setSynthesis(data);
    } catch {
      // Silent
    } finally {
      setGeneratingSynthesis(false);
    }
  }

  async function handleRetire(id: string) {
    await fetch(`/api/intel/beliefs?id=${id}`, { method: 'DELETE' });
    fetchBeliefs();
  }

  function handleEdit(belief: IntelBelief) {
    setEditBelief(belief);
    setShowModal(true);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0E11] p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#E8EAED]">Synthesis</h2>
          <p className="text-xs font-mono text-[#5A6A7A]">
            Your Worldview Tracker
          </p>
        </div>
        <button
          onClick={() => {
            setEditBelief(null);
            setShowModal(true);
          }}
          className="px-3 py-1.5 text-xs font-mono bg-[#4488FF] text-white rounded-sm hover:bg-[#5599FF] cursor-pointer"
        >
          + Add Belief
        </button>
      </div>

      {/* Belief cards */}
      {loading ? (
        <div className="text-xs font-mono text-[#5A6A7A] animate-pulse">
          Loading beliefs...
        </div>
      ) : beliefs.length === 0 ? (
        <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-6 text-center">
          <p className="text-sm text-[#8899AA]">No beliefs tracked yet</p>
          <p className="text-xs text-[#5A6A7A] mt-1">
            Add a belief to start tracking how evidence confirms or challenges
            your worldview
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {beliefs.map((belief) => (
            <BeliefCard
              key={belief.id}
              belief={belief}
              onEdit={handleEdit}
              onRetire={handleRetire}
            />
          ))}
        </div>
      )}

      {/* Daily Synthesis Narrative */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono text-[#5A6A7A] uppercase tracking-wider">
            Daily Synthesis{' '}
            {synthesis?.date && (
              <span className="text-[#8899AA]">— {synthesis.date}</span>
            )}
          </h3>
          <button
            onClick={fetchSynthesis}
            disabled={generatingSynthesis}
            className="text-[10px] font-mono text-[#4488FF] hover:text-[#6699FF] cursor-pointer"
          >
            {generatingSynthesis ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
        <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-4">
          {generatingSynthesis ? (
            <p className="text-xs font-mono text-[#5A6A7A] animate-pulse">
              Generating synthesis...
            </p>
          ) : synthesis?.narrative ? (
            <p className="text-sm text-[#E8EAED]/90 leading-relaxed italic">
              &ldquo;{synthesis.narrative}&rdquo;
            </p>
          ) : (
            <p className="text-xs text-[#5A6A7A] font-mono">
              No synthesis available yet. Fetch items and rate them to generate
              a synthesis.
            </p>
          )}
        </div>

        {/* Belief movements */}
        {synthesis?.belief_movements &&
          synthesis.belief_movements.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-[10px] font-mono text-[#5A6A7A] uppercase tracking-wider">
                Belief Movements
              </h4>
              {synthesis.belief_movements.map((bm) => (
                <div
                  key={bm.belief_id}
                  className="flex items-center gap-2 text-xs font-mono"
                >
                  <span
                    className={
                      bm.direction === 'up'
                        ? 'text-[#00CC66]'
                        : bm.direction === 'down'
                        ? 'text-[#FF4444]'
                        : 'text-[#5A6A7A]'
                    }
                  >
                    {bm.direction === 'up'
                      ? '▲'
                      : bm.direction === 'down'
                      ? '▼'
                      : '—'}
                  </span>
                  <span className="text-[#8899AA]">{bm.title}</span>
                  <span
                    className={
                      bm.change > 0
                        ? 'text-[#00CC66]'
                        : bm.change < 0
                        ? 'text-[#FF4444]'
                        : 'text-[#5A6A7A]'
                    }
                  >
                    {bm.change > 0 ? '+' : ''}
                    {bm.change.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Modal */}
      {showModal && (
        <AddBeliefModal
          onClose={() => {
            setShowModal(false);
            setEditBelief(null);
          }}
          onSave={fetchBeliefs}
          editBelief={editBelief}
        />
      )}
    </div>
  );
}
