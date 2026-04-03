'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/realestate/AuthProvider';
import { UpdateLogEntry } from '@/types/realestate';

const TYPE_COLORS: Record<string, string> = {
  manual_weekly: 'bg-[#4488FF]/20 text-[#4488FF]',
  manual_monthly: 'bg-[#00CC66]/20 text-[#00CC66]',
  auto_refresh: 'bg-[#FFB020]/20 text-[#FFB020]',
  baseline_change: 'bg-[#FF8C00]/20 text-[#FF8C00]',
};

export default function LogPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<UpdateLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.push('/realestate/login');
  }, [user, loading, router]);

  useEffect(() => {
    fetch(`/api/re/log?page=${page}&limit=30`)
      .then(r => r.json())
      .then(json => {
        if (json.data) setEntries(json.data);
        if (json.total != null) setTotal(json.total);
      });
  }, [page]);

  if (loading || !user) {
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
            Update Log
          </h1>
          <span className="text-[10px] font-mono text-[#5A6A7A]">{total} entries</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {entries.map(e => (
            <div key={e.id} className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3 flex items-start gap-3">
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm flex-shrink-0 ${TYPE_COLORS[e.update_type] ?? 'bg-[#5A6A7A]/20 text-[#5A6A7A]'}`}>
                {e.update_type.replace(/_/g, ' ')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-[#E8EAED]">{e.description}</p>
                {e.data_snapshot && (
                  <details className="mt-1">
                    <summary className="text-[10px] font-mono text-[#5A6A7A] cursor-pointer hover:text-[#8899AA]">
                      View data
                    </summary>
                    <pre className="text-[10px] font-mono text-[#5A6A7A] mt-1 overflow-x-auto">
                      {JSON.stringify(e.data_snapshot, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
              <span className="text-[10px] font-mono text-[#5A6A7A] flex-shrink-0">
                {new Date(e.created_at).toLocaleString()}
              </span>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="text-center py-8 text-sm font-mono text-[#5A6A7A]">No log entries yet</div>
          )}
        </div>

        {total > 30 && (
          <div className="flex justify-center gap-3 mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-xs font-mono text-[#5A6A7A] border border-[#1E2A3A] rounded-sm hover:bg-[#1A2332] disabled:opacity-30"
            >
              Prev
            </button>
            <span className="text-xs font-mono text-[#5A6A7A] py-1">
              Page {page} of {Math.ceil(total / 30)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 30)}
              className="px-3 py-1 text-xs font-mono text-[#5A6A7A] border border-[#1E2A3A] rounded-sm hover:bg-[#1A2332] disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
