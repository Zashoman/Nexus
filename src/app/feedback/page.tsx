'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';

interface FeedbackEntry {
  id: string;
  item_id: string | null;
  item_title: string | null;
  source_name: string | null;
  category: string | null;
  rating: string | null;
  feedback_note: string;
  created_at: string;
  updated_at: string | null;
}

export default function FeedbackPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/intel/feedback?limit=100');
      const json = await res.json();
      if (json.data) setEntries(json.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFeedback(); }, []);

  const startEdit = (entry: FeedbackEntry) => {
    setEditingId(entry.id);
    setEditText(entry.feedback_note);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await apiFetch('/api/intel/feedback', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, feedback_note: editText }),
      });
      setEditingId(null);
      fetchFeedback();
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const deleteFeedback = async (id: string) => {
    try {
      await apiFetch(`/api/intel/feedback?id=${id}`, { method: 'DELETE' });
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch { /* silent */ }
  };

  const RATING_COLORS: Record<string, string> = {
    signal: 'text-[#00CC66] bg-[#00CC66]/10',
    noise: 'text-[#CC3333] bg-[#CC3333]/10',
    starred: 'text-[#FFD700] bg-[#FFD700]/10',
    irrelevant: 'text-[#5A6A7A] bg-[#5A6A7A]/10',
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0B0E11] text-[#E8EAED]">
      <header className="flex-shrink-0 h-12 bg-[#0D1117] border-b border-[#1E2A3A] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-[#5A6A7A] hover:text-[#E8EAED] font-mono text-xs">
            &larr; Back
          </button>
          <h1 className="text-sm font-mono font-semibold text-[#E8EAED] tracking-wider uppercase">
            Feedback Database
          </h1>
          <span className="text-[10px] font-mono text-[#5A6A7A]">{entries.length} entries</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-8 text-sm font-mono text-[#5A6A7A]">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-sm font-mono text-[#5A6A7A]">
            No feedback yet. Rate articles and add notes in the Intelligence feed.
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map(e => (
              <div key={e.id} className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Article title */}
                    {e.item_title && (
                      <h3 className="text-sm font-mono text-[#E8EAED] mb-1 truncate">{e.item_title}</h3>
                    )}
                    {/* Meta */}
                    <div className="flex items-center gap-2 mb-2">
                      {e.rating && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${RATING_COLORS[e.rating] ?? 'text-[#5A6A7A] bg-[#5A6A7A]/10'}`}>
                          {e.rating}
                        </span>
                      )}
                      {e.source_name && (
                        <span className="text-[10px] font-mono text-[#5A6A7A]">{e.source_name}</span>
                      )}
                      {e.category && (
                        <span className="text-[10px] font-mono text-[#5A6A7A] capitalize">{e.category}</span>
                      )}
                      <span className="text-[10px] font-mono text-[#5A6A7A]">
                        {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {/* Feedback text — editable or static */}
                    {editingId === e.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editText}
                          onChange={ev => setEditText(ev.target.value)}
                          className="flex-1 bg-[#0B0E11] border border-[#4488FF] rounded-sm px-2 py-1.5 text-xs font-mono text-[#E8EAED] outline-none"
                          autoFocus
                          onKeyDown={ev => { if (ev.key === 'Enter') saveEdit(); if (ev.key === 'Escape') setEditingId(null); }}
                        />
                        <button onClick={saveEdit} disabled={saving}
                          className="px-3 py-1 text-[10px] font-mono text-[#00CC66] border border-[#00CC66]/30 rounded-sm hover:bg-[#00CC66]/10">
                          {saving ? '...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="px-2 py-1 text-[10px] font-mono text-[#5A6A7A] hover:text-[#E8EAED]">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs font-mono text-[#8899AA] leading-relaxed">{e.feedback_note}</p>
                    )}
                  </div>
                  {/* Actions */}
                  {editingId !== e.id && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(e)}
                        className="text-[10px] font-mono text-[#4488FF] hover:text-[#6699FF]">
                        Edit
                      </button>
                      <button onClick={() => deleteFeedback(e.id)}
                        className="text-[10px] font-mono text-[#5A6A7A] hover:text-[#FF4444]">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
