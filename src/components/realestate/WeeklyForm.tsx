'use client';

import { useState, useEffect } from 'react';
import { WeeklyData } from '@/types/realestate';

interface Props {
  token: string;
}

const FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: 'total_transactions', label: 'Total DLD Transactions', placeholder: '~7,000' },
  { key: 'offplan_transactions', label: 'Off-Plan Transactions', placeholder: '~4,200' },
  { key: 'secondary_transactions', label: 'Secondary Transactions', placeholder: '~2,800' },
  { key: 'mortgage_registrations', label: 'Mortgage Registrations', placeholder: '~1,400' },
  { key: 'cash_transactions', label: 'Cash Transactions', placeholder: '~5,600' },
  { key: 'total_value_aed_billions', label: 'Total Value (AED Billions)', placeholder: '~20.0' },
  { key: 'dfm_re_index', label: 'DFM RE Index', placeholder: '~5,200' },
  { key: 'emaar_share_price', label: 'Emaar Share Price (AED)', placeholder: '~9.50' },
  { key: 'damac_share_price', label: 'DAMAC Share Price (AED)', placeholder: '' },
  { key: 'listing_inventory', label: 'Listing Inventory', placeholder: '~40,000' },
];

function getCurrentWeekLabel() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `W${String(week).padStart(2, '0')}-${now.getFullYear()}`;
}

function getWeekEndDate() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  const end = new Date(now);
  end.setDate(now.getDate() + diff);
  return end.toISOString().split('T')[0];
}

export default function WeeklyForm({ token }: Props) {
  const [weekLabel, setWeekLabel] = useState(getCurrentWeekLabel());
  const [weekDate, setWeekDate] = useState(getWeekEndDate());
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [existing, setExisting] = useState<WeeklyData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchExisting = async () => {
    const res = await fetch('/api/re/weekly?limit=12');
    const json = await res.json();
    if (json.data) setExisting(json.data);
  };

  useEffect(() => { fetchExisting(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    const payload: Record<string, unknown> = {
      week_label: weekLabel,
      week_date: weekDate,
      notes: notes || null,
    };

    for (const f of FIELDS) {
      const val = values[f.key];
      payload[f.key] = val ? parseFloat(val) : null;
    }

    try {
      const method = editingId ? 'PUT' : 'POST';
      if (editingId) payload.id = editingId;

      const res = await fetch('/api/re/weekly', {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessage(editingId ? 'Updated successfully' : 'Saved successfully');
      setEditingId(null);
      setValues({});
      setNotes('');
      fetchExisting();
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : 'Failed'}`);
    } finally {
      setSaving(false);
    }
  };

  const loadForEdit = (entry: WeeklyData) => {
    setEditingId(entry.id);
    setWeekLabel(entry.week_label);
    setWeekDate(entry.week_date);
    setNotes(entry.notes || '');
    const vals: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = entry[f.key as keyof WeeklyData];
      if (v != null) vals[f.key] = String(v);
    }
    setValues(vals);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-4">
        <h3 className="text-xs uppercase tracking-wider text-[#5A6A7A] font-mono mb-4">
          {editingId ? 'Edit Weekly Entry' : 'New Weekly Entry'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[10px] uppercase text-[#5A6A7A] font-mono">Week Label</label>
            <input
              type="text"
              value={weekLabel}
              onChange={e => setWeekLabel(e.target.value)}
              className="w-full bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-3 py-2 text-sm font-mono text-[#E8EAED] focus:border-[#4488FF] outline-none mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase text-[#5A6A7A] font-mono">Week Ending Date</label>
            <input
              type="date"
              value={weekDate}
              onChange={e => setWeekDate(e.target.value)}
              className="w-full bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-3 py-2 text-sm font-mono text-[#E8EAED] focus:border-[#4488FF] outline-none mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {FIELDS.map(f => (
            <div key={f.key}>
              <label className="text-[10px] uppercase text-[#5A6A7A] font-mono">{f.label}</label>
              <input
                type="number"
                step="any"
                value={values[f.key] ?? ''}
                onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-3 py-2 text-sm font-mono text-[#E8EAED] placeholder:text-[#2A3A4A] focus:border-[#4488FF] outline-none mt-1"
              />
            </div>
          ))}
        </div>

        <div className="mb-4">
          <label className="text-[10px] uppercase text-[#5A6A7A] font-mono">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-3 py-2 text-sm font-mono text-[#E8EAED] focus:border-[#4488FF] outline-none mt-1 resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-[#00CC66] text-black text-xs font-mono uppercase tracking-wider rounded-sm hover:bg-[#00BB55] disabled:opacity-50"
          >
            {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
          </button>
          {editingId && (
            <button
              onClick={() => { setEditingId(null); setValues({}); setNotes(''); }}
              className="px-4 py-2 text-xs font-mono text-[#5A6A7A] hover:text-[#E8EAED]"
            >
              Cancel Edit
            </button>
          )}
          {message && (
            <span className={`text-xs font-mono ${message.startsWith('Error') ? 'text-[#FF4444]' : 'text-[#00CC66]'}`}>
              {message}
            </span>
          )}
        </div>
      </div>

      {/* Existing entries table */}
      <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm overflow-hidden">
        <div className="p-3 border-b border-[#1E2A3A]">
          <h3 className="text-xs uppercase tracking-wider text-[#5A6A7A] font-mono">Previous Entries</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1E2A3A]">
                <th className="text-left p-2 text-[#5A6A7A]">Week</th>
                <th className="text-right p-2 text-[#5A6A7A]">Total Tx</th>
                <th className="text-right p-2 text-[#5A6A7A]">Off-Plan</th>
                <th className="text-right p-2 text-[#5A6A7A]">Secondary</th>
                <th className="text-right p-2 text-[#5A6A7A]">Value (B)</th>
                <th className="text-right p-2 text-[#5A6A7A]">DFM RE</th>
                <th className="text-right p-2 text-[#5A6A7A]">Emaar</th>
                <th className="text-center p-2 text-[#5A6A7A]">Source</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {existing.map(e => (
                <tr key={e.id} className="border-b border-[#1E2A3A]/50 hover:bg-[#1A2332]">
                  <td className="p-2 text-[#E8EAED]">{e.week_label}</td>
                  <td className="p-2 text-right text-[#E8EAED]">{e.total_transactions?.toLocaleString() ?? '--'}</td>
                  <td className="p-2 text-right text-[#E8EAED]">{e.offplan_transactions?.toLocaleString() ?? '--'}</td>
                  <td className="p-2 text-right text-[#E8EAED]">{e.secondary_transactions?.toLocaleString() ?? '--'}</td>
                  <td className="p-2 text-right text-[#E8EAED]">{e.total_value_aed_billions ?? '--'}</td>
                  <td className="p-2 text-right text-[#E8EAED]">{e.dfm_re_index ?? '--'}</td>
                  <td className="p-2 text-right text-[#E8EAED]">{e.emaar_share_price ?? '--'}</td>
                  <td className="p-2 text-center">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-sm ${e.data_source === 'auto_refresh' ? 'bg-[#4488FF]/20 text-[#4488FF]' : 'bg-[#5A6A7A]/20 text-[#5A6A7A]'}`}>
                      {e.data_source}
                    </span>
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => loadForEdit(e)}
                      className="text-[#4488FF] hover:text-[#6699FF] text-[10px] uppercase"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {existing.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-[#5A6A7A]">No entries yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
