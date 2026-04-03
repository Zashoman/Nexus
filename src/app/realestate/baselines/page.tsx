'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/realestate/AuthProvider';
import { Baseline } from '@/types/realestate';

export default function BaselinesPage() {
  const { user, role, loading, token } = useAuth();
  const router = useRouter();
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/realestate/login');
    if (!loading && user && role !== 'owner') router.push('/realestate');
  }, [user, role, loading, router]);

  useEffect(() => {
    fetch('/api/re/baselines')
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setBaselines(json.data);
          const vals: Record<string, string> = {};
          json.data.forEach((b: Baseline) => { vals[b.metric_key] = String(b.baseline_value); });
          setEdits(vals);
        }
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    const changes = baselines
      .filter(b => String(b.baseline_value) !== edits[b.metric_key])
      .map(b => ({ metric_key: b.metric_key, baseline_value: parseFloat(edits[b.metric_key]) }));

    if (changes.length === 0) {
      setMessage('No changes to save');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/re/baselines', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ baselines: changes }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      setMessage(`Updated ${changes.length} baseline(s)`);
      // Refresh
      const fresh = await fetch('/api/re/baselines').then(r => r.json());
      if (fresh.data) setBaselines(fresh.data);
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : 'Failed'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user || role !== 'owner') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-sm font-mono text-[#5A6A7A]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex-shrink-0 h-12 bg-[#0D1117] border-b border-[#1E2A3A] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/realestate')} className="text-[#5A6A7A] hover:text-[#E8EAED] font-mono text-xs">
            &larr; Back
          </button>
          <h1 className="text-sm font-mono font-semibold text-[#E8EAED] tracking-wider uppercase">
            Baseline Values
          </h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1E2A3A]">
                <th className="text-left p-3 text-[#5A6A7A]">Metric</th>
                <th className="text-left p-3 text-[#5A6A7A]">Description</th>
                <th className="text-right p-3 text-[#5A6A7A]">Baseline Value</th>
              </tr>
            </thead>
            <tbody>
              {baselines.map(b => (
                <tr key={b.metric_key} className="border-b border-[#1E2A3A]/50 hover:bg-[#1A2332]">
                  <td className="p-3 text-[#E8EAED]">{b.label}</td>
                  <td className="p-3 text-[#5A6A7A]">{b.description}</td>
                  <td className="p-3 text-right">
                    <input
                      type="number"
                      step="any"
                      value={edits[b.metric_key] ?? ''}
                      onChange={e => setEdits(prev => ({ ...prev, [b.metric_key]: e.target.value }))}
                      className="w-32 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs font-mono text-[#E8EAED] text-right focus:border-[#4488FF] outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-[#00CC66] text-black text-xs font-mono uppercase tracking-wider rounded-sm hover:bg-[#00BB55] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {message && (
            <span className={`text-xs font-mono ${message.startsWith('Error') ? 'text-[#FF4444]' : 'text-[#00CC66]'}`}>
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
