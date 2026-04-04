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

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
}

interface CompanyNews {
  datetime: number;
  headline: string;
  source: string;
  summary: string;
  url: string;
  image: string;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts * 1000;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function PortfolioView() {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [news, setNews] = useState<Record<string, CompanyNews[]>>({});
  const [earnings, setEarnings] = useState<Record<string, { date: string; estimate: number | null }>>({});
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
      const [watchRes, stockRes] = await Promise.all([
        fetch('/api/intel/watchlist'),
        fetch('/api/intel/stocks'),
      ]);
      const watchData = await watchRes.json();
      const stockData = await stockRes.json();

      setWatchlist(watchData.watchlist || []);
      setQuotes(stockData.quotes || {});
      setNews(stockData.news || {});
      setEarnings(stockData.earnings || {});
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
            ? addForm.keywords.split(',').map((k: string) => k.trim()).filter(Boolean)
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
    if (watchlist.find((w: WatchlistEntry) => w.id === id)?.symbol === selectedSymbol) {
      setSelectedSymbol(null);
    }
    fetchData();
  }

  const selectedEntry = watchlist.find((w: WatchlistEntry) => w.symbol === selectedSymbol);
  const selectedQuote = selectedSymbol ? quotes[selectedSymbol] : null;
  const selectedNews = selectedSymbol ? (news[selectedSymbol] || []) : [];
  const selectedEarnings = selectedSymbol ? earnings[selectedSymbol] : null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[#5A6A7A] text-xs font-mono animate-pulse">Loading portfolio...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0B0E11]">
      <div className="border-b border-[#1E2A3A] bg-[#0D1117] px-4 py-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider">Portfolio Overview</h3>
          <button onClick={() => setShowAdd(!showAdd)} className="text-[10px] font-mono text-[#4488FF] hover:text-[#6699FF] cursor-pointer">
            {showAdd ? '✕ Cancel' : '+ Add Position'}
          </button>
        </div>

        {showAdd && (
          <div className="mb-3 p-2 bg-[#141820] border border-[#1E2A3A] rounded-sm space-y-2">
            <div className="flex gap-2">
              <input type="text" value={addForm.symbol} onChange={(e) => setAddForm({ ...addForm, symbol: e.target.value })} placeholder="Ticker" className="w-20 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF] uppercase" />
              <input type="text" value={addForm.company_name} onChange={(e) => setAddForm({ ...addForm, company_name: e.target.value })} placeholder="Company / ETF name" className="flex-1 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF]" />
              <select value={addForm.type} onChange={(e) => setAddForm({ ...addForm, type: e.target.value as 'stock' | 'etf' })} className="bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] focus:outline-none focus:border-[#4488FF]">
                <option value="stock">Stock</option>
                <option value="etf">ETF</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input type="text" value={addForm.sector} onChange={(e) => setAddForm({ ...addForm, sector: e.target.value })} placeholder="Sector" className="w-32 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF]" />
              <input type="text" value={addForm.keywords} onChange={(e) => setAddForm({ ...addForm, keywords: e.target.value })} placeholder="Keywords (comma separated)" className="flex-1 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF]" />
              <button onClick={handleAdd} disabled={adding || !addForm.symbol.trim() || !addForm.company_name.trim()} className="px-3 py-1 text-xs font-mono bg-[#4488FF] text-white rounded-sm hover:bg-[#5599FF] disabled:opacity-50 cursor-pointer whitespace-nowrap">
                {adding ? '...' : 'Add'}
              </button>
            </div>
          </div>
        )}

        {watchlist.length === 0 ? (
          <p className="text-xs text-[#5A6A7A] font-mono py-2">No positions tracked. Click + Add Position to start.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {watchlist.map((entry) => {
              const q = quotes[entry.symbol];
              const isSelected = selectedSymbol === entry.symbol;
              const newsCount = (news[entry.symbol] || []).length;
              return (
                <div key={entry.id} onClick={() => setSelectedSymbol(isSelected ? null : entry.symbol)} className={`px-3 py-2 rounded-sm cursor-pointer transition-colors border ${isSelected ? 'bg-[#1A2332] border-[#4488FF]/50' : 'bg-[#141820] border-[#1E2A3A]/50 hover:border-[#1E2A3A]'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-mono font-bold text-[#E8EAED]">{entry.symbol}</span>
                      <span className={`text-[8px] font-mono uppercase px-1 rounded-sm ${entry.type === 'etf' ? 'bg-[#FF8C00]/10 text-[#FF8C00]' : 'bg-[#4488FF]/10 text-[#4488FF]'}`}>{entry.type}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }} className="text-[#5A6A7A] hover:text-[#FF4444] text-[10px] cursor-pointer" title="Remove">✕</button>
                  </div>
                  {q ? (
                    <div>
                      <span className="text-[16px] font-mono text-[#E8EAED]">${q.price.toFixed(2)}</span>
                      <span className={`text-[11px] font-mono ml-2 ${q.changePercent >= 0 ? 'text-[#00CC66]' : 'text-[#FF4444]'}`}>
                        {q.changePercent >= 0 ? '▲' : '▼'} {Math.abs(q.changePercent).toFixed(2)}%
                      </span>
                      <div className="text-[9px] font-mono text-[#5A6A7A] mt-0.5">O: {q.open.toFixed(2)} H: {q.high.toFixed(2)} L: {q.low.toFixed(2)}</div>
                    </div>
                  ) : (
                    <span className="text-[13px] font-mono text-[#5A6A7A]">--</span>
                  )}
                  <div className="text-[9px] font-mono text-[#5A6A7A] mt-0.5 truncate">
                    {entry.company_name}
                    {newsCount > 0 && <span className="text-[#00CC66] ml-1">· {newsCount} news</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedEntry ? (
          <div className="flex h-full">
            <div className="w-[300px] border-r border-[#1E2A3A] p-4 space-y-3 overflow-y-auto">
              <div>
                <h2 className="text-xl font-mono font-bold text-[#E8EAED]">{selectedEntry.symbol}</h2>
                <p className="text-[13px] text-[#8899AA]">{selectedEntry.company_name}</p>
                {selectedEntry.sector && <p className="text-[11px] text-[#5A6A7A] font-mono">Sector: {selectedEntry.sector}</p>}
              </div>
              {selectedQuote && (
                <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[20px] font-mono font-bold text-[#E8EAED]">${selectedQuote.price.toFixed(2)}</span>
                    <span className={`text-[13px] font-mono ${selectedQuote.changePercent >= 0 ? 'text-[#00CC66]' : 'text-[#FF4444]'}`}>
                      {selectedQuote.changePercent >= 0 ? '+' : ''}{selectedQuote.change.toFixed(2)} ({selectedQuote.changePercent.toFixed(2)}%)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-mono">
                    <span className="text-[#5A6A7A]">Open</span><span className="text-[#8899AA] text-right">{selectedQuote.open.toFixed(2)}</span>
                    <span className="text-[#5A6A7A]">High</span><span className="text-[#8899AA] text-right">{selectedQuote.high.toFixed(2)}</span>
                    <span className="text-[#5A6A7A]">Low</span><span className="text-[#8899AA] text-right">{selectedQuote.low.toFixed(2)}</span>
                    <span className="text-[#5A6A7A]">Prev Close</span><span className="text-[#8899AA] text-right">{selectedQuote.prevClose.toFixed(2)}</span>
                  </div>
                </div>
              )}
              {selectedEarnings && (
                <div className="bg-[#FF8C00]/5 border border-[#FF8C00]/20 rounded-sm p-2">
                  <h4 className="text-[10px] font-mono text-[#FF8C00] uppercase tracking-wider mb-1">Next Earnings</h4>
                  <p className="text-[13px] font-mono text-[#E8EAED]">{selectedEarnings.date}</p>
                  {selectedEarnings.estimate != null && (
                    <p className="text-[10px] font-mono text-[#5A6A7A]">EPS Est: ${selectedEarnings.estimate.toFixed(2)}</p>
                  )}
                </div>
              )}
              {selectedEntry.keywords.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-1">Tracking Keywords</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedEntry.keywords.map((kw: string) => (
                      <span key={kw} className="text-[9px] font-mono text-[#4488FF]/60 bg-[#4488FF]/5 px-1.5 py-0 rounded-sm">{kw}</span>
                    ))}
                  </div>
                </div>
              )}
              {selectedEntry.top_holdings.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-1">Top Holdings</h4>
                  <p className="text-[10px] font-mono text-[#8899AA]">{selectedEntry.top_holdings.join(', ')}</p>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-3">
                News — {selectedEntry.symbol} ({selectedNews.length} articles, last 30 days)
              </h3>
              {selectedNews.length === 0 ? (
                <p className="text-[13px] text-[#5A6A7A]">No recent news found</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedNews.map((item: CompanyNews, idx: number) => (
                    <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="block px-3 py-2 bg-[#141820] border border-[#1E2A3A]/50 rounded-sm hover:bg-[#1A2030] transition-colors">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono text-[#5A6A7A]">{item.source}</span>
                        <span className="text-[10px] font-mono text-[#5A6A7A] ml-auto">{timeAgo(item.datetime)}</span>
                      </div>
                      <p className="text-[13px] text-[#E8EAED] leading-tight">{item.headline}</p>
                      {item.summary && <p className="text-[11px] text-[#5A6A7A] mt-0.5 line-clamp-2">{item.summary}</p>}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <h3 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-3">Recent News Across All Positions</h3>
            {(() => {
              const allItems: { item: CompanyNews; symbol: string }[] = [];
              for (const [sym, items] of Object.entries(news)) {
                for (const item of items) {
                  allItems.push({ item, symbol: sym });
                }
              }
              allItems.sort((a, b) => b.item.datetime - a.item.datetime);
              const top = allItems.slice(0, 30);
              if (top.length === 0) return <p className="text-[13px] text-[#5A6A7A]">No recent news</p>;
              return (
                <div className="space-y-1.5">
                  {top.map((entry, idx) => (
                    <a key={idx} href={entry.item.url} target="_blank" rel="noopener noreferrer" className="block px-3 py-2 bg-[#141820] border border-[#1E2A3A]/50 rounded-sm hover:bg-[#1A2030] transition-colors">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono font-bold text-[#FF8C00] bg-[#FF8C00]/10 px-1 rounded-sm">{entry.symbol}</span>
                        <span className="text-[10px] font-mono text-[#5A6A7A]">{entry.item.source}</span>
                        <span className="text-[10px] font-mono text-[#5A6A7A] ml-auto">{timeAgo(entry.item.datetime)}</span>
                      </div>
                      <p className="text-[13px] text-[#E8EAED] leading-tight">{entry.item.headline}</p>
                    </a>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
