'use client';

import { useState, useEffect } from 'react';
import { MonthlyData } from '@/types/realestate';

interface Props {
  token: string;
}

const FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: 'dewa_new_connections', label: 'DEWA New Connections', placeholder: '~13,000' },
  { key: 'airport_passengers_millions', label: 'Airport Passengers (Millions)', placeholder: '~8.5' },
  { key: 'moasher_price_index', label: "Mo'asher Price Index", placeholder: '' },
  { key: 'avg_price_psf_apartment', label: 'Avg Price/sqft — Apartment', placeholder: '' },
  { key: 'avg_price_psf_villa', label: 'Avg Price/sqft — Villa', placeholder: '' },
  { key: 'rental_index', label: 'Rental Index', placeholder: '' },
  { key: 'new_supply_units', label: 'New Supply (Units)', placeholder: '' },
  { key: 'population_estimate', label: 'Population Estimate', placeholder: '' },
];

function getCurrentMonthLabel() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  return `${months[now.getMonth()]}-${now.getFullYear()}`;
}

function getMonthDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function MonthlyForm({ token }: Props) {
  const [monthLabel, setMonthLabel] = useState(getCurrentMonthLabel());
  const [monthDate, setMonthDate] = useState(getMonthDate());
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [existing, setExisting] = useState<MonthlyData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchExisting = async () => {
    const res = await fetch('/api/re/monthly?limit=12');
    const json = await res.json();
    if (json.data) setExisting(json.data);
  };

  useEffect(() => { fetchExisting(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    const payload: Record<string, unknown> = {
      month_label: monthLabel,
      month_date: monthDate,
      notes: notes || null,
    };
    for (const f of FIELDS) {
      const val = values[f.key];
      payload[f.key] = val ? parseFloat(val) : null;
    }

    try {
      const method = editingId ? 'PUT' : 'POST';
      if (editingId) payload.id = editingId;

      const res = await fetch('/api/re/monthly', {
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

  const loadForEdit = (entry: MonthlyData) => {
    setEditingId(entry.id);
    setMonthLabel(entry.month_label);
    setMonthDate(entry.month_date);
    setNotes(entry.notes || '');
    const vals: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = entry[f.key as keyof MonthlyData];
      if (v != null) vals[f.key] = String(v);
    }
    setValues(vals);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-4">
        <h3 className="text-xs uppercase tracking-wider text-[#5A6A7A] font-mono mb-4">
          {editingId ? 'Edit Monthly Entry' : 'New Monthly Entry'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[10px] uppercase text-[#5A6A7A] font-mono">Month Label</label>
            <input
              type="text"
              value={monthLabel}
              onChange={e => setMonthLabel(e.target.value)}
              className="w-full bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-3 py-2 text-sm font-mono text-[#E8EAED] focus:border-[#4488FF] outline-none mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase text-[#5A6A7A] font-mono">Month Date</label>
            <input
              type="date"
              value={monthDate}
              onChange={e => setMonthDate(e.target.value)}
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

      {/* Existing entries */}
      <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm overflow-hidden">
        <div className="p-3 border-b border-[#1E2A3A]">
          <h3 className="text-xs uppercase tracking-wider text-[#5A6A7A] font-mono">Previous Entries</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1E2A3A]">
                <th className="text-left p-2 text-[#5A6A7A]">Month</th>
                <th className="text-right p-2 text-[#5A6A7A]">DEWA</th>
                <th className="text-right p-2 text-[#5A6A7A]">Airport (M)</th>
                <th className="text-right p-2 text-[#5A6A7A]">Mo&apos;asher</th>
                <th className="text-right p-2 text-[#5A6A7A]">Apt PSF</th>
                <th className="text-right p-2 text-[#5A6A7A]">Villa PSF</th>
                <th className="text-right p-2 text-[#5A6A7A]">Rental Idx</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {existing.map(e => (
                <tr key={e.id} className="border-b border-[#1E2A3A]/50 hover:bg-[#1A2332]">
                  <td className="p-2 text-[#E8EAED]">{e.month_label}</td>
                  <td className="p-2 text-right text-[#E8EAED]">{e.dewa_new_connections?.toLocaleString() ?? '--'}</td>
                  <td className="p-2 text-right text-[#E8EAED]">{e.airport_passengers_millions ?? '--'}</td>
                  <td className="p-2 text-right text-[#E8EAED]">{e.moasher_price_index ?? '--'}</td>
                  <td className="p-2 text-right text-[#E8EAED]">{e.avg_price_psf_apartment ?? '--'}</td>
                  <td className="p-2 text-right text-[#E8EAED]">{e.avg_price_psf_villa ?? '--'}</td>
                  <td className="p-2 text-right text-[#E8EAED]">{e.rental_index ?? '--'}</td>
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
                  <td colSpan={8} className="p-4 text-center text-[#5A6A7A]">No entries yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
