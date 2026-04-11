'use client';

import { useState } from 'react';
import { RefreshResult } from '@/types/realestate';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

const FIELD_LABELS: Record<string, string> = {
  total_transactions: 'Total Transactions',
  offplan_transactions: 'Off-Plan Transactions',
  secondary_transactions: 'Secondary Transactions',
  mortgage_registrations: 'Mortgage Registrations',
  cash_transactions: 'Cash Transactions',
  total_value_aed_billions: 'Total Value (AED B)',
  dfm_re_index: 'DFM RE Index',
  emaar_share_price: 'Emaar Share Price',
  listing_inventory: 'Listing Inventory',
};

export default function RefreshModal({ isOpen, onClose, token }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RefreshResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/re/refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResult(json.data);
      // Initialize edit values
      const vals: Record<string, string> = {};
      for (const [key, val] of Object.entries(json.data)) {
        if (key !== 'data_date' && key !== 'sources' && val != null) {
          vals[key] = String(val);
        }
      }
      setEditValues(vals);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const now = new Date(result.data_date || new Date().toISOString());
      const weekNum = Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);
      const weekLabel = `W${String(weekNum).padStart(2, '0')}-${now.getFullYear()}`;

      const payload: Record<string, unknown> = {
        week_label: weekLabel,
        week_date: result.data_date,
        data_source: 'auto_refresh',
        notes: `Sources: ${result.sources?.join(', ') || 'AI search'}`,
      };

      let metricCount = 0;
      for (const [key, val] of Object.entries(editValues)) {
        if (val !== '' && val !== 'null') {
          const n = parseFloat(val);
          if (!isNaN(n)) {
            payload[key] = n;
            metricCount++;
          }
        }
      }

      if (metricCount === 0) {
        throw new Error('Cannot save — no metric values were filled in. Edit the fields or cancel.');
      }

      const res = await fetch('/api/re/weekly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }

      onClose();
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-[#1E2A3A] flex items-center justify-between">
          <h2 className="text-sm font-mono uppercase tracking-wider text-[#E8EAED]">
            Auto-Refresh Data
          </h2>
          <button onClick={onClose} className="text-[#5A6A7A] hover:text-[#E8EAED]">
            &times;
          </button>
        </div>

        <div className="p-4">
          {!result && !loading && (
            <div className="text-center py-8">
              <p className="text-sm text-[#8899AA] font-mono mb-4">
                Search for the latest Dubai RE data using AI web search?
              </p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-[#4488FF] text-white text-xs font-mono uppercase tracking-wider rounded-sm hover:bg-[#3377EE]"
              >
                Search Now
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <div className="inline-block w-6 h-6 border-2 border-[#4488FF] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-[#5A6A7A] font-mono mt-3">Searching for latest data...</p>
            </div>
          )}

          {error && (
            <div className="bg-[#FF4444]/10 border border-[#FF4444]/30 rounded-sm p-3 mb-4">
              <p className="text-xs text-[#FF4444] font-mono">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <p className="text-xs text-[#5A6A7A] font-mono">
                Data date: {result.data_date} — Edit values before saving:
              </p>
              {Object.entries(FIELD_LABELS).map(([key, label]) => {
                const val = editValues[key];
                return (
                  <div key={key} className="flex items-center gap-3">
                    <label className="text-xs font-mono text-[#8899AA] w-40 flex-shrink-0">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={val ?? ''}
                      onChange={e => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder="null"
                      className="flex-1 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs font-mono text-[#E8EAED] focus:border-[#4488FF] outline-none"
                    />
                  </div>
                );
              })}

              {result.sources && result.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#1E2A3A]">
                  <p className="text-[10px] text-[#5A6A7A] font-mono uppercase mb-1">Sources</p>
                  {result.sources.map((s, i) => (
                    <p key={i} className="text-[10px] text-[#4488FF] font-mono truncate">{s}</p>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-[#00CC66] text-black text-xs font-mono uppercase tracking-wider rounded-sm hover:bg-[#00BB55] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Data'}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-[#1E2A3A] text-[#8899AA] text-xs font-mono uppercase tracking-wider rounded-sm hover:bg-[#2A3A4A]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
