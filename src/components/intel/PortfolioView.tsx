'use client';

import { useEffect, useState } from 'react';

interface WatchlistEntry {
  id: string;
  symbol: string;
  company_name: string;
  type: 'stock' | 'etf';
  sector: string | null;
  keywords: string[];
  top_holdings: string[];
}

interface MatchedItem {
  id: string;
  title: string;
  source_name: string;
  source_tier: number;
  impact_level: string | null;
  published_at: string | null;
  ingested_at: string;
  ai_summary: string | null;
  summary: string | null;
  original_url: string;
  category: string;
}

const TIER_DOT: Record<number, string> = {
  1: 'bg-[#00CC66]',
  2: 'bg-[#4488FF]',
  3: 'bg-[#888888]',
};

const IMPACT_COLORS: Record<string, string> = {
  critical: 'text-[#FF4444]',
  high: 'text-[#FF8C00]',
  medium: 'text-[#4488FF]',
  low: 'text-[#666666]',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function PortfolioView() {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [matches, setMatches] = useState<Record<string, MatchedItem[]>>({});
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    symbol: '',
    company_name: '',
    type: 'stock' as 'stock' | 'etf',
    sector: '',
    keywords: '',
  });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch('/api/intel/watchlist');
      const data = await res.json();
      setWatchlist(data.watchlist || []);
      setMatches(data.matches || {});
      if (!selectedSymbol && data.watchlist?.length > 0) {
        setSelectedSymbol(data.watchlist[0].symbol);
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!addForm.symbol.trim() || !addForm.company_name.trim()) return;
    setAdding(true);
    try {
      await fetch('/api/intel/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: addForm.symbol.toUpperCase(),
          company_name: addForm.company_name,
          type: addForm.type,
          sector: addForm.sector || null,
          keywords: addForm.keywords
            ? addForm.keywords.split(',').map(k => k.trim()).filter(Boolean)
            : [],
        }),
      });
      setAddForm({ symbol: '', company_name: '', type: 'stock', sector: '', keywords: '' });
      setShowAdd(false);
      fetchData();
    } catch {
      // Silent
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/intel/watchlist?id=${id}`, { method: 'DELETE' });
    fetchData();
  }

  const selectedEntry = watchlist.find(w => w.symbol === selectedSymbol);
  const selectedNews = selectedSymbol ? (matches[selectedSymbol] || []) : [];

  // All news across all positions, deduped
  const allNewsMap = new Map<string, { item: MatchedItem; symbols: string[] }>();
  for (const [symbol, items] of Object.entries(matches)) {
    for (const item of items) {
      if (allNewsMap.has(item.id)) {
        allNewsMap.get(item.id)!.symbols.push(symbol);
      } else {
        allNewsMap.set(item.id, { item, symbols: [symbol] });
      }
    }
  }
  const allNews = Array.from(allNewsMap.values())
    .sort((a, b) => new Date(b.item.published_at || b.item.ingested_at).getTime() - new Date(a.item.published_at || a.item.ingested_at).getTime());

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[#5A6A7A] text-xs font-mono animate-pulse">Loading portfolio...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0B0E11]">
      {/* Left Panel — Watchlist */}
      <div className="w-[320px] border-r border-[#1E2A3A] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2 border-b border-[#1E2A3A] flex items-center justify-between bg-[#0D1117]">
          <h3 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider">Watchlist</h3>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-[10px] font-mono text-[#4488FF] hover:text-[#6699FF] cursor-pointer"
          >
            {showAdd ? '✕ Cancel' : '+ Add'}
          </button>
        </div>

        {/* Add Form */}
        {showAdd && (
          <div className="px-3 py-2 border-b border-[#1E2A3A] bg-[#141820] space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={addForm.symbol}
                onChange={(e) => setAddForm({ ...addForm, symbol: e.target.value })}
                placeholder="Ticker"
                className="w-20 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF] uppercase"
              />
              <input
                type="text"
                value={addForm.company_name}
                onChange={(e) => setAddForm({ ...addForm, company_name: e.target.value })}
                placeholder="Company / ETF name"
                className="flex-1 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF]"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={addForm.type}
                onChange={(e) => setAddForm({ ...addForm, type: e.target.value as 'stock' | 'etf' })}
                className="bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] focus:outline-none focus:border-[#4488FF]"
              >
                <option value="stock">Stock</option>
                <option value="etf">ETF</option>
              </select>
              <input
                type="text"
                value={addForm.sector}
                onChange={(e) => setAddForm({ ...addForm, sector: e.target.value })}
                placeholder="Sector"
                className="flex-1 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF]"
              />
            </div>
            <input
              type="text"
              value={addForm.keywords}
              onChange={(e) => setAddForm({ ...addForm, keywords: e.target.value })}
              placeholder="Keywords (comma separated)"
              className="w-full bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF]"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !addForm.symbol.trim() || !addForm.company_name.trim()}
              className="w-full py-1 text-xs font-mono bg-[#4488FF] text-white rounded-sm hover:bg-[#5599FF] disabled:opacity-50 cursor-pointer"
            >
              {adding ? 'Adding...' : 'Add to Watchlist'}
            </button>
          </div>
        )}

        {/* Watchlist Rows */}
        <div className="flex-1 overflow-y-auto">
          {watchlist.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-xs text-[#5A6A7A] font-mono">No positions tracked</p>
              <p className="text-[10px] text-[#5A6A7A] font-mono mt-1">Click + Add to start</p>
            </div>
          ) : (
            watchlist.map((entry) => {
              const newsCount = (matches[entry.symbol] || []).length;
              const isSelected = selectedSymbol === entry.symbol;
              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedSymbol(entry.symbol)}
                  className={`px-3 py-2 cursor-pointer border-b border-[#1E2A3A]/50 transition-colors ${
                    isSelected ? 'bg-[#1A2332]' : 'bg-[#0D1117] hover:bg-[#141820]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-mono font-bold text-[#E8EAED]">
                        {entry.symbol}
                      </span>
                      <span className={`text-[9px] font-mono uppercase px-1 py-0 rounded-sm ${
                        entry.type === 'etf'
                          ? 'bg-[#FF8C00]/10 text-[#FF8C00]'
                          : 'bg-[#4488FF]/10 text-[#4488FF]'
                      }`}>
                        {entry.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {newsCount > 0 && (
                        <span className="text-[10px] font-mono text-[#00CC66]">
                          {newsCount} article{newsCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(entry.id);
                        }}
                        className="text-[#5A6A7A] hover:text-[#FF4444] text-[10px] cursor-pointer"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] text-[#5A6A7A] font-mono mt-0.5 truncate">
                    {entry.company_name}
                    {entry.sector && ` · ${entry.sector}`}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel — Detail / News Feed */}
      <div className="flex-1 overflow-y-auto">
        {selectedEntry ? (
          <div className="p-4 space-y-4">
            {/* Stock Header */}
            <div className="border-b border-[#1E2A3A] pb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-mono font-bold text-[#E8EAED]">{selectedEntry.symbol}</h2>
                <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-sm ${
                  selectedEntry.type === 'etf'
                    ? 'bg-[#FF8C00]/10 text-[#FF8C00]'
                    : 'bg-[#4488FF]/10 text-[#4488FF]'
                }`}>
                  {selectedEntry.type}
                </span>
              </div>
              <p className="text-[13px] text-[#8899AA] mt-0.5">{selectedEntry.company_name}</p>
              {selectedEntry.sector && (
                <p className="text-[11px] text-[#5A6A7A] font-mono mt-0.5">Sector: {selectedEntry.sector}</p>
              )}
              {selectedEntry.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedEntry.keywords.map((kw) => (
                    <span key={kw} className="text-[10px] font-mono text-[#4488FF]/60 bg-[#4488FF]/5 px-1.5 py-0 rounded-sm">
                      {kw}
                    </span>
                  ))}
                </div>
              )}
              {selectedEntry.top_holdings.length > 0 && (
                <div className="mt-1">
                  <span className="text-[10px] font-mono text-[#5A6A7A]">Top holdings: </span>
                  <span className="text-[10px] font-mono text-[#8899AA]">
                    {selectedEntry.top_holdings.join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Relevant News */}
            <div>
              <h3 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-2">
                Relevant News ({selectedNews.length})
              </h3>
              {selectedNews.length === 0 ? (
                <p className="text-[13px] text-[#5A6A7A]">No matching articles in the last 3 days</p>
              ) : (
                <div className="space-y-1">
                  {selectedNews.map((item) => (
                    <a
                      key={item.id}
                      href={item.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-3 py-2 bg-[#141820] border border-[#1E2A3A]/50 rounded-sm hover:bg-[#1A2030] transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${TIER_DOT[item.source_tier] || TIER_DOT[3]}`} />
                        <span className="text-[10px] font-mono text-[#5A6A7A]">{item.source_name}</span>
                        {item.impact_level && (
                          <span className={`text-[10px] font-mono ${IMPACT_COLORS[item.impact_level] || ''}`}>
                            {item.impact_level.toUpperCase()}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-[#5A6A7A] ml-auto">
                          {timeAgo(item.published_at || item.ingested_at)}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#E8EAED] leading-tight">{item.title}</p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* All Portfolio News */
          <div className="p-4 space-y-4">
            <h3 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider">
              All Portfolio News ({allNews.length})
            </h3>
            {allNews.length === 0 ? (
              <p className="text-[13px] text-[#5A6A7A]">No matching articles found</p>
            ) : (
              <div className="space-y-1">
                {allNews.map(({ item, symbols }) => (
                  <a
                    key={item.id}
                    href={item.original_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-3 py-2 bg-[#141820] border border-[#1E2A3A]/50 rounded-sm hover:bg-[#1A2030] transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      {symbols.map(s => (
                        <span key={s} className="text-[10px] font-mono font-bold text-[#FF8C00] bg-[#FF8C00]/10 px-1 rounded-sm">
                          {s}
                        </span>
                      ))}
                      <span className="text-[10px] font-mono text-[#5A6A7A]">{item.source_name}</span>
                      <span className="text-[10px] font-mono text-[#5A6A7A] ml-auto">
                        {timeAgo(item.published_at || item.ingested_at)}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#E8EAED] leading-tight">{item.title}</p>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
