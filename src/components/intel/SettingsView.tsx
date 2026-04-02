'use client';

import { useEffect, useState } from 'react';

interface Source {
  id: string;
  name: string;
  source_type: string;
  url: string;
  tier: number;
  category: string;
  subcategory: string | null;
  is_active: boolean;
  error_count: number;
  last_fetched_at: string | null;
}

interface Expert {
  id: string;
  name: string;
  category: string;
  affiliation: string | null;
  blog_url: string | null;
  substack_url: string | null;
  twitter_handle: string | null;
  notes: string | null;
  is_active: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  frontier_models: 'Frontier AI',
  infrastructure_compute: 'Infrastructure',
  robotics_physical_ai: 'Robotics',
  health_bio_ai: 'Health & Bio',
  cybersecurity_ai: 'Cyber & Defense',
  regulation_policy: 'Regulation',
  drones_autonomous: 'Drones & Autonomous',
  safety_alignment: 'Safety & Alignment',
};

export default function SettingsView() {
  const [tab, setTab] = useState<'sources' | 'experts'>('sources');
  const [sources, setSources] = useState<Source[]>([]);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSource, setShowAddSource] = useState(false);
  const [showAddExpert, setShowAddExpert] = useState(false);
  const [addSourceForm, setAddSourceForm] = useState({ name: '', url: '', tier: '2', category: 'frontier_models', source_type: 'rss' });
  const [addExpertForm, setAddExpertForm] = useState({ name: '', category: 'frontier_models', affiliation: '', substack_url: '', twitter_handle: '', notes: '' });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [srcRes, expRes] = await Promise.all([
        fetch('/api/intel/sources'),
        fetch('/api/intel/experts'),
      ]);
      const srcData = await srcRes.json();
      const expData = await expRes.json();
      setSources(srcData.sources || []);
      setExperts(expData.experts || []);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }

  async function toggleSource(id: string, isActive: boolean) {
    await fetch('/api/intel/sources', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !isActive }),
    });
    fetchData();
  }

  async function addSource() {
    if (!addSourceForm.name || !addSourceForm.url) return;
    await fetch('/api/intel/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: addSourceForm.name,
        url: addSourceForm.url,
        tier: parseInt(addSourceForm.tier),
        category: addSourceForm.category,
        source_type: addSourceForm.source_type,
      }),
    });
    setAddSourceForm({ name: '', url: '', tier: '2', category: 'frontier_models', source_type: 'rss' });
    setShowAddSource(false);
    fetchData();
  }

  async function addExpert() {
    if (!addExpertForm.name) return;
    await fetch('/api/intel/experts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: addExpertForm.name,
        category: addExpertForm.category,
        affiliation: addExpertForm.affiliation || null,
        substack_url: addExpertForm.substack_url || null,
        twitter_handle: addExpertForm.twitter_handle || null,
        notes: addExpertForm.notes || null,
      }),
    });
    setAddExpertForm({ name: '', category: 'frontier_models', affiliation: '', substack_url: '', twitter_handle: '', notes: '' });
    setShowAddExpert(false);
    fetchData();
  }

  async function removeExpert(id: string) {
    await fetch(`/api/intel/experts?id=${id}`, { method: 'DELETE' });
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[#5A6A7A] text-xs font-mono animate-pulse">Loading settings...</p>
      </div>
    );
  }

  const activeSources = sources.filter((s: Source) => s.is_active).length;
  const errorSources = sources.filter((s: Source) => s.error_count > 3).length;

  // Group experts by category
  const expertsByCategory: Record<string, Expert[]> = {};
  for (const exp of experts) {
    if (!expertsByCategory[exp.category]) expertsByCategory[exp.category] = [];
    expertsByCategory[exp.category].push(exp);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0E11] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#E8EAED]">Settings</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setTab('sources')}
            className={`px-3 py-1 text-xs font-mono rounded-sm cursor-pointer ${tab === 'sources' ? 'bg-[#4488FF]/20 text-[#4488FF]' : 'text-[#5A6A7A] hover:text-[#8899AA]'}`}
          >
            Sources ({activeSources})
          </button>
          <button
            onClick={() => setTab('experts')}
            className={`px-3 py-1 text-xs font-mono rounded-sm cursor-pointer ${tab === 'experts' ? 'bg-[#4488FF]/20 text-[#4488FF]' : 'text-[#5A6A7A] hover:text-[#8899AA]'}`}
          >
            Experts ({experts.length})
          </button>
        </div>
      </div>

      {tab === 'sources' && (
        <div className="space-y-3">
          {/* Stats */}
          <div className="flex gap-4 text-xs font-mono">
            <span className="text-[#00CC66]">{activeSources} active</span>
            <span className="text-[#5A6A7A]">{sources.length - activeSources} disabled</span>
            {errorSources > 0 && <span className="text-[#FF4444]">{errorSources} errors</span>}
          </div>

          {/* Add source */}
          <button onClick={() => setShowAddSource(!showAddSource)} className="text-[10px] font-mono text-[#4488FF] hover:text-[#6699FF] cursor-pointer">
            {showAddSource ? '✕ Cancel' : '+ Add Source'}
          </button>

          {showAddSource && (
            <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3 space-y-2">
              <div className="flex gap-2">
                <input type="text" value={addSourceForm.name} onChange={(e) => setAddSourceForm({ ...addSourceForm, name: e.target.value })} placeholder="Source name" className="flex-1 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF]" />
                <select value={addSourceForm.tier} onChange={(e) => setAddSourceForm({ ...addSourceForm, tier: e.target.value })} className="bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED]">
                  <option value="1">Tier 1</option>
                  <option value="2">Tier 2</option>
                  <option value="3">Tier 3</option>
                </select>
              </div>
              <input type="text" value={addSourceForm.url} onChange={(e) => setAddSourceForm({ ...addSourceForm, url: e.target.value })} placeholder="RSS feed URL" className="w-full bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF]" />
              <div className="flex gap-2">
                <select value={addSourceForm.category} onChange={(e) => setAddSourceForm({ ...addSourceForm, category: e.target.value })} className="flex-1 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED]">
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button onClick={addSource} disabled={!addSourceForm.name || !addSourceForm.url} className="px-3 py-1 text-xs font-mono bg-[#4488FF] text-white rounded-sm hover:bg-[#5599FF] disabled:opacity-50 cursor-pointer">Add</button>
              </div>
            </div>
          )}

          {/* Source list */}
          <div className="space-y-1">
            {sources.map((source: Source) => (
              <div key={source.id} className="flex items-center gap-3 px-3 py-2 bg-[#141820] border border-[#1E2A3A]/50 rounded-sm">
                <button
                  onClick={() => toggleSource(source.id, source.is_active)}
                  className={`w-2 h-2 rounded-full cursor-pointer flex-shrink-0 ${
                    source.error_count > 3 ? 'bg-[#FF4444]' : source.is_active ? 'bg-[#00CC66]' : 'bg-[#666666]'
                  }`}
                  title={source.is_active ? 'Click to disable' : 'Click to enable'}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[13px] ${source.is_active ? 'text-[#E8EAED]' : 'text-[#5A6A7A]'}`}>{source.name}</span>
                    <span className={`text-[9px] font-mono ${source.tier === 1 ? 'text-[#00CC66]' : source.tier === 2 ? 'text-[#4488FF]' : 'text-[#888888]'}`}>T{source.tier}</span>
                    <span className="text-[9px] font-mono text-[#5A6A7A]">{CATEGORY_LABELS[source.category] || source.category}</span>
                    {source.subcategory && <span className="text-[9px] font-mono text-[#5A6A7A]">· {source.subcategory}</span>}
                  </div>
                  <div className="text-[9px] font-mono text-[#5A6A7A] truncate">{source.url}</div>
                </div>
                {source.last_fetched_at && (
                  <span className="text-[9px] font-mono text-[#5A6A7A] flex-shrink-0">
                    {new Date(source.last_fetched_at).toLocaleTimeString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'experts' && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-[#00CC66]">{experts.length} tracked</span>
          </div>

          <button onClick={() => setShowAddExpert(!showAddExpert)} className="text-[10px] font-mono text-[#4488FF] hover:text-[#6699FF] cursor-pointer">
            {showAddExpert ? '✕ Cancel' : '+ Add Expert'}
          </button>

          {showAddExpert && (
            <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3 space-y-2">
              <div className="flex gap-2">
                <input type="text" value={addExpertForm.name} onChange={(e) => setAddExpertForm({ ...addExpertForm, name: e.target.value })} placeholder="Name" className="flex-1 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF]" />
                <select value={addExpertForm.category} onChange={(e) => setAddExpertForm({ ...addExpertForm, category: e.target.value })} className="bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED]">
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <input type="text" value={addExpertForm.affiliation} onChange={(e) => setAddExpertForm({ ...addExpertForm, affiliation: e.target.value })} placeholder="Affiliation" className="flex-1 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF]" />
                <input type="text" value={addExpertForm.twitter_handle} onChange={(e) => setAddExpertForm({ ...addExpertForm, twitter_handle: e.target.value })} placeholder="@twitter" className="w-32 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF]" />
              </div>
              <div className="flex gap-2">
                <input type="text" value={addExpertForm.substack_url} onChange={(e) => setAddExpertForm({ ...addExpertForm, substack_url: e.target.value })} placeholder="Substack URL" className="flex-1 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF]" />
                <button onClick={addExpert} disabled={!addExpertForm.name} className="px-3 py-1 text-xs font-mono bg-[#4488FF] text-white rounded-sm hover:bg-[#5599FF] disabled:opacity-50 cursor-pointer">Add</button>
              </div>
              <input type="text" value={addExpertForm.notes} onChange={(e) => setAddExpertForm({ ...addExpertForm, notes: e.target.value })} placeholder="Notes (optional)" className="w-full bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF]" />
            </div>
          )}

          {/* Expert list by category */}
          {Object.entries(expertsByCategory).map(([cat, exps]) => (
            <div key={cat} className="space-y-1">
              <h4 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider">{CATEGORY_LABELS[cat] || cat}</h4>
              {exps.map((expert: Expert) => (
                <div key={expert.id} className="flex items-center gap-3 px-3 py-2 bg-[#141820] border border-[#1E2A3A]/50 rounded-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-[#E8EAED] font-medium">{expert.name}</span>
                      {expert.affiliation && <span className="text-[10px] text-[#5A6A7A] font-mono">{expert.affiliation}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {expert.twitter_handle && <span className="text-[9px] font-mono text-[#4488FF]">@{expert.twitter_handle}</span>}
                      {expert.substack_url && <span className="text-[9px] font-mono text-[#FF8C00]">Substack</span>}
                      {expert.notes && <span className="text-[9px] font-mono text-[#5A6A7A] truncate">{expert.notes}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => removeExpert(expert.id)}
                    className="text-[#5A6A7A] hover:text-[#FF4444] text-[10px] cursor-pointer flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
