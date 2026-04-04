'use client';

import { useEffect, useState } from 'react';
import type { IntelBelief, SynthesisNarrative } from '@/types/intel';
import BeliefCard from './BeliefCard';
import AddBeliefModal from './AddBeliefModal';

interface WeeklySynthesis {
  id: string;
  week_start: string;
  week_end: string;
  starred_item_count: number;
  synthesis_text: string;
  created_at: string;
}

interface MonthlySynthesis {
  id: string;
  month_start: string;
  month_end: string;
  synthesis_text: string;
  created_at: string;
}

export default function SynthesisView() {
  const [beliefs, setBeliefs] = useState<IntelBelief[]>([]);
  const [synthesis, setSynthesis] = useState<SynthesisNarrative | null>(null);
  const [weeklySyntheses, setWeeklySyntheses] = useState<WeeklySynthesis[]>([]);
  const [monthlySyntheses, setMonthlySyntheses] = useState<MonthlySynthesis[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editBelief, setEditBelief] = useState<IntelBelief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingSynthesis, setGeneratingSynthesis] = useState(false);
  const [generatingWeekly, setGeneratingWeekly] = useState(false);
  const [generatingMonthly, setGeneratingMonthly] = useState(false);
  const [expandedWeekly, setExpandedWeekly] = useState<string | null>(null);
  const [expandedMonthly, setExpandedMonthly] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [beliefsRes, synthRes, weeklyRes, monthlyRes] = await Promise.all([
        fetch('/api/intel/beliefs'),
        fetch('/api/intel/synthesis'),
        fetch('/api/intel/weekly-synthesis'),
        fetch('/api/intel/monthly-synthesis'),
      ]);
      const beliefsData = await beliefsRes.json();
      const synthData = await synthRes.json();
      const weeklyData = await weeklyRes.json();
      const monthlyData = await monthlyRes.json();

      setBeliefs(beliefsData.beliefs || []);
      setSynthesis(synthData);
      setWeeklySyntheses(weeklyData.syntheses || []);
      setMonthlySyntheses(monthlyData.syntheses || []);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }

  async function generateWeekly() {
    setGeneratingWeekly(true);
    try {
      const res = await fetch('/api/intel/weekly-synthesis', { method: 'POST' });
      const data = await res.json();
      if (data.synthesis) {
        setWeeklySyntheses((prev) => [data.synthesis, ...prev]);
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      // Silent
    } finally {
      setGeneratingWeekly(false);
    }
  }

  async function generateMonthly() {
    setGeneratingMonthly(true);
    try {
      const res = await fetch('/api/intel/monthly-synthesis', { method: 'POST' });
      const data = await res.json();
      if (data.synthesis) {
        setMonthlySyntheses((prev) => [data.synthesis, ...prev]);
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      // Silent
    } finally {
      setGeneratingMonthly(false);
    }
  }

  async function handleRetire(id: string) {
    await fetch(`/api/intel/beliefs?id=${id}`, { method: 'DELETE' });
    fetchAll();
  }

  function handleEdit(belief: IntelBelief) {
    setEditBelief(belief);
    setShowModal(true);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0E11] p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#E8EAED]">Synthesis</h2>
          <p className="text-xs font-mono text-[#5A6A7A]">Worldview Tracker + Intelligence Briefs</p>
        </div>
        <button
          onClick={() => { setEditBelief(null); setShowModal(true); }}
          className="px-3 py-1.5 text-xs font-mono bg-[#4488FF] text-white rounded-sm hover:bg-[#5599FF] cursor-pointer"
        >
          + Add Belief
        </button>
      </div>

      {/* Monthly Briefs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono text-[#FF8C00] uppercase tracking-wider">Monthly Briefs</h3>
          <button onClick={generateMonthly} disabled={generatingMonthly} className="text-[10px] font-mono text-[#FF8C00] hover:text-[#FFaa33] cursor-pointer">
            {generatingMonthly ? 'Generating...' : 'Generate Monthly Synthesis'}
          </button>
        </div>
        {monthlySyntheses.length === 0 ? (
          <p className="text-[11px] text-[#5A6A7A] font-mono">No monthly briefs yet. Generate weekly briefs first.</p>
        ) : (
          monthlySyntheses.map((ms) => (
            <div key={ms.id} className="bg-[#141820] border border-[#1E2A3A] rounded-sm">
              <button
                onClick={() => setExpandedMonthly(expandedMonthly === ms.id ? null : ms.id)}
                className="w-full px-3 py-2 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#FF8C00]">{ms.month_start} to {ms.month_end}</span>
                </div>
                <span className="text-[10px] text-[#5A6A7A]">{expandedMonthly === ms.id ? 'collapse' : 'expand'}</span>
              </button>
              {expandedMonthly === ms.id && (
                <div className="px-3 pb-3 text-[13px] text-[#E8EAED]/90 leading-relaxed whitespace-pre-wrap border-t border-[#1E2A3A]">
                  {ms.synthesis_text}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Weekly Briefs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono text-[#00CC66] uppercase tracking-wider">Weekly Briefs</h3>
          <button onClick={generateWeekly} disabled={generatingWeekly} className="text-[10px] font-mono text-[#00CC66] hover:text-[#33DD88] cursor-pointer">
            {generatingWeekly ? 'Generating...' : 'Generate Weekly Synthesis'}
          </button>
        </div>
        {generatingWeekly && (
          <div className="bg-[#141820] border border-[#00CC66]/20 rounded-sm p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#00CC66] rounded-full animate-pulse" />
              <p className="text-[11px] font-mono text-[#00CC66]">Generating weekly synthesis from starred items...</p>
            </div>
          </div>
        )}
        {weeklySyntheses.length === 0 && !generatingWeekly ? (
          <p className="text-[11px] text-[#5A6A7A] font-mono">No weekly briefs yet. Star items throughout the week, then generate.</p>
        ) : (
          weeklySyntheses.map((ws) => (
            <div key={ws.id} className="bg-[#141820] border border-[#1E2A3A] rounded-sm">
              <button
                onClick={() => setExpandedWeekly(expandedWeekly === ws.id ? null : ws.id)}
                className="w-full px-3 py-2 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#00CC66]">{ws.week_start} to {ws.week_end}</span>
                  <span className="text-[10px] font-mono text-[#5A6A7A]">{ws.starred_item_count} starred items</span>
                </div>
                <span className="text-[10px] text-[#5A6A7A]">{expandedWeekly === ws.id ? 'collapse' : 'expand'}</span>
              </button>
              {expandedWeekly === ws.id && (
                <div className="px-3 pb-3 text-[13px] text-[#E8EAED]/90 leading-relaxed whitespace-pre-wrap border-t border-[#1E2A3A]">
                  {ws.synthesis_text}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Beliefs */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono text-[#5A6A7A] uppercase tracking-wider">Active Beliefs</h3>
        {loading ? (
          <div className="text-xs font-mono text-[#5A6A7A] animate-pulse">Loading beliefs...</div>
        ) : beliefs.length === 0 ? (
          <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-6 text-center">
            <p className="text-sm text-[#8899AA]">No beliefs tracked yet</p>
            <p className="text-xs text-[#5A6A7A] mt-1">Add a belief to start tracking</p>
          </div>
        ) : (
          beliefs.map((belief) => (
            <BeliefCard key={belief.id} belief={belief} onEdit={handleEdit} onRetire={handleRetire} />
          ))
        )}
      </div>

      {/* Daily Synthesis */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono text-[#5A6A7A] uppercase tracking-wider">
            Daily Synthesis {synthesis?.date && <span className="text-[#8899AA]">- {synthesis.date}</span>}
          </h3>
          <button
            onClick={() => { setGeneratingSynthesis(true); fetch('/api/intel/synthesis').then(r => r.json()).then(d => { setSynthesis(d); setGeneratingSynthesis(false); }); }}
            disabled={generatingSynthesis}
            className="text-[10px] font-mono text-[#4488FF] hover:text-[#6699FF] cursor-pointer"
          >
            {generatingSynthesis ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
        <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-4">
          {generatingSynthesis ? (
            <p className="text-xs font-mono text-[#5A6A7A] animate-pulse">Generating synthesis...</p>
          ) : synthesis?.narrative ? (
            <p className="text-sm text-[#E8EAED]/90 leading-relaxed italic">{synthesis.narrative}</p>
          ) : (
            <p className="text-xs text-[#5A6A7A] font-mono">No synthesis available yet.</p>
          )}
        </div>
      </div>

      {showModal && (
        <AddBeliefModal
          onClose={() => { setShowModal(false); setEditBelief(null); }}
          onSave={fetchAll}
          editBelief={editBelief}
        />
      )}
    </div>
  );
}
