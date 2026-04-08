'use client';

import { useState, useEffect, useRef } from 'react';

interface JournalEntry {
  id: string;
  entry_number: number;
  entry_text: string;
  analysis: string | null;
  created_at: string;
}

export default function JournalPage() {
  const [view, setView] = useState<'write' | 'history'>('write');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [entryText, setEntryText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<{ analysis: string; entry_number: number } | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    try {
      const res = await fetch('/api/journal/entries');
      const data = await res.json();
      if (data.entries) setEntries(data.entries);
    } catch {
      // silent fail on load
    }
  }

  async function handleSubmit() {
    if (!entryText.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setLatestAnalysis(null);

    try {
      const res = await fetch('/api/journal/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_text: entryText }),
      });
      const data = await res.json();
      if (data.analysis) {
        setLatestAnalysis({ analysis: data.analysis, entry_number: data.entry_number });
        setEntryText('');
        fetchEntries();
      }
    } catch {
      // error handling
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleSelectEntry(entry: JournalEntry) {
    setSelectedEntry(entry);
    setMobileDetailOpen(true);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  function formatFullDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  function getTimeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }

  // Keyboard shortcut: Cmd+Enter to submit
  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#0B0E11] text-[#E8EAED]">
      {/* Header */}
      <div className="border-b border-[#1E2A3A] bg-[#0D1117] px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xs font-mono text-[#C8A2FF] font-bold uppercase tracking-wider">
            Journal Mentor
          </h1>
          <span className="text-[10px] font-mono text-[#5A6A7A]">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-[#1E2A3A] bg-[#0D1117] overflow-x-auto">
        <button
          onClick={() => { setView('write'); setSelectedEntry(null); setLatestAnalysis(null); }}
          className={`px-4 py-2 text-xs font-mono whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            view === 'write'
              ? 'border-[#C8A2FF] text-[#E8EAED] bg-[#141820]'
              : 'border-transparent text-[#5A6A7A] hover:text-[#8899AA] hover:bg-[#141820]/50'
          }`}
        >
          Write
        </button>
        <button
          onClick={() => { setView('history'); setLatestAnalysis(null); }}
          className={`px-4 py-2 text-xs font-mono whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            view === 'history'
              ? 'border-[#C8A2FF] text-[#E8EAED] bg-[#141820]'
              : 'border-transparent text-[#5A6A7A] hover:text-[#8899AA] hover:bg-[#141820]/50'
          }`}
        >
          History
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">

        {/* ─── WRITE VIEW ─── */}
        {view === 'write' && (
          <>
            {/* Left: Writing area */}
            <div className="flex-1 flex flex-col overflow-hidden lg:max-w-[600px]">
              {/* Writing surface */}
              <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                <div className="mb-4">
                  <span className="text-[10px] font-mono text-[#5A6A7A] uppercase tracking-widest">
                    {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={entryText}
                  onChange={(e) => setEntryText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What's on your mind..."
                  disabled={isAnalyzing}
                  className="flex-1 bg-transparent border-none outline-none resize-none text-[15px] leading-[1.8] text-[#D0D4DA] placeholder-[#2A3444] caret-[#C8A2FF] selection:bg-[#C8A2FF]/20 min-h-[300px]"
                  autoFocus
                />
              </div>

              {/* Bottom bar */}
              <div className="border-t border-[#1E2A3A] bg-[#0D1117] px-6 py-3 flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#3A4A5A]">
                  {entryText.length > 0 ? `${entryText.trim().split(/\s+/).filter(Boolean).length} words` : 'cmd+enter to submit'}
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={!entryText.trim() || isAnalyzing}
                  className={`px-5 py-2 text-xs font-mono rounded-sm transition-all cursor-pointer ${
                    isAnalyzing
                      ? 'bg-[#C8A2FF]/10 text-[#C8A2FF]/50 cursor-wait'
                      : entryText.trim()
                        ? 'bg-[#C8A2FF]/15 text-[#C8A2FF] hover:bg-[#C8A2FF]/25 ring-1 ring-[#C8A2FF]/30 hover:ring-[#C8A2FF]/50'
                        : 'bg-[#141820] text-[#3A4A5A] cursor-not-allowed'
                  }`}
                >
                  {isAnalyzing ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 border-2 border-[#C8A2FF]/30 border-t-[#C8A2FF] rounded-full animate-spin" />
                      Reading...
                    </span>
                  ) : (
                    'Submit Entry'
                  )}
                </button>
              </div>
            </div>

            {/* Right: Analysis panel */}
            <div className="hidden lg:flex flex-1 border-l border-[#1E2A3A] flex-col bg-[#0B0E11]">
              {latestAnalysis ? (
                <div className="flex-1 overflow-y-auto">
                  <div className="px-8 py-6">
                    <div className="mb-6">
                      <span className="text-[10px] font-mono text-[#C8A2FF]/60 uppercase tracking-widest">
                        Mentor Read — Entry #{latestAnalysis.entry_number}
                      </span>
                    </div>
                    <div className="text-[14px] leading-[1.9] text-[#B8BCC4] space-y-5">
                      {latestAnalysis.analysis.split('\n\n').map((paragraph, i) => (
                        <p key={i} className="first-letter:text-[#C8A2FF] first-letter:font-semibold">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ) : isAnalyzing ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-[#C8A2FF]/20 border-t-[#C8A2FF] rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[11px] font-mono text-[#5A6A7A] tracking-wider uppercase">Analyzing entry</p>
                    <p className="text-[10px] font-mono text-[#3A4A5A] mt-1">Reading between the lines...</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center max-w-[280px]">
                    <div className="w-12 h-12 rounded-sm bg-[#C8A2FF]/5 flex items-center justify-center mx-auto mb-4 ring-1 ring-[#C8A2FF]/10">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#C8A2FF]/40">
                        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </div>
                    <p className="text-[11px] font-mono text-[#3A4A5A] leading-relaxed">
                      Write your journal entry on the left.<br />
                      Your mentor&apos;s read will appear here.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile: Analysis overlay */}
            {latestAnalysis && (
              <div className="fixed inset-0 z-40 bg-[#0B0E11] lg:hidden overflow-y-auto">
                <div className="px-4 py-3 border-b border-[#1E2A3A] bg-[#0D1117] flex items-center justify-between sticky top-0 z-10">
                  <span className="text-[10px] font-mono text-[#C8A2FF] uppercase tracking-widest">
                    Mentor Read — #{latestAnalysis.entry_number}
                  </span>
                  <button
                    onClick={() => setLatestAnalysis(null)}
                    className="text-[#5A6A7A] hover:text-[#E8EAED] transition-colors cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="px-5 py-6">
                  <div className="text-[14px] leading-[1.9] text-[#B8BCC4] space-y-5">
                    {latestAnalysis.analysis.split('\n\n').map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── HISTORY VIEW ─── */}
        {view === 'history' && (
          <>
            {/* Left: Entry list */}
            <div className="flex-1 overflow-y-auto bg-[#0B0E11] min-w-0 lg:max-w-[420px] border-r border-[#1E2A3A]">
              {entries.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-[11px] font-mono text-[#3A4A5A]">No entries yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[#1E2A3A]/50">
                  {entries.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => handleSelectEntry(entry)}
                      className={`w-full text-left px-4 py-3.5 transition-colors cursor-pointer ${
                        selectedEntry?.id === entry.id
                          ? 'bg-[#141820] border-l-2 border-l-[#C8A2FF]'
                          : 'border-l-2 border-l-transparent hover:bg-[#141820]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-[#C8A2FF]/70 uppercase tracking-wider">
                          Entry #{entry.entry_number}
                        </span>
                        <span className="text-[10px] font-mono text-[#3A4A5A]">
                          {getTimeAgo(entry.created_at)}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#8899AA] line-clamp-2 leading-relaxed">
                        {entry.entry_text.substring(0, 150)}{entry.entry_text.length > 150 ? '...' : ''}
                      </p>
                      <div className="mt-1.5">
                        <span className="text-[9px] font-mono text-[#3A4A5A]">
                          {formatDate(entry.created_at)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Detail panel */}
            <div className="hidden lg:flex flex-1 flex-col bg-[#0B0E11]">
              {selectedEntry ? (
                <div className="flex-1 overflow-y-auto">
                  <div className="px-8 py-6">
                    {/* Entry header */}
                    <div className="mb-6 pb-4 border-b border-[#1E2A3A]/50">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] font-mono text-[#C8A2FF] uppercase tracking-widest">
                          Entry #{selectedEntry.entry_number}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[#5A6A7A]">
                        {formatFullDate(selectedEntry.created_at)}
                      </span>
                    </div>

                    {/* Original entry */}
                    <div className="mb-8">
                      <span className="text-[9px] font-mono text-[#5A6A7A] uppercase tracking-widest mb-3 block">
                        Your Entry
                      </span>
                      <div className="text-[13px] leading-[1.8] text-[#8899AA] pl-4 border-l-2 border-[#1E2A3A]">
                        {selectedEntry.entry_text.split('\n').map((line, i) => (
                          <p key={i} className={line.trim() === '' ? 'h-4' : 'mb-2'}>
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Analysis */}
                    {selectedEntry.analysis && (
                      <div>
                        <span className="text-[9px] font-mono text-[#C8A2FF]/60 uppercase tracking-widest mb-3 block">
                          Mentor Read
                        </span>
                        <div className="text-[14px] leading-[1.9] text-[#B8BCC4] space-y-5">
                          {selectedEntry.analysis.split('\n\n').map((paragraph, i) => (
                            <p key={i} className="first-letter:text-[#C8A2FF] first-letter:font-semibold">
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center max-w-[280px]">
                    <div className="w-12 h-12 rounded-sm bg-[#C8A2FF]/5 flex items-center justify-center mx-auto mb-4 ring-1 ring-[#C8A2FF]/10">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#C8A2FF]/40">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </div>
                    <p className="text-[11px] font-mono text-[#3A4A5A] leading-relaxed">
                      Select an entry to view<br />
                      its full content and analysis.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile: Detail overlay */}
            {mobileDetailOpen && selectedEntry && (
              <div className="fixed inset-0 z-40 bg-[#0B0E11] lg:hidden overflow-y-auto">
                <div className="px-4 py-3 border-b border-[#1E2A3A] bg-[#0D1117] flex items-center justify-between sticky top-0 z-10">
                  <span className="text-[10px] font-mono text-[#C8A2FF] uppercase tracking-widest">
                    Entry #{selectedEntry.entry_number}
                  </span>
                  <button
                    onClick={() => setMobileDetailOpen(false)}
                    className="text-[#5A6A7A] hover:text-[#E8EAED] transition-colors cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="px-5 py-6">
                  <div className="mb-4">
                    <span className="text-[11px] font-mono text-[#5A6A7A]">{formatFullDate(selectedEntry.created_at)}</span>
                  </div>
                  <div className="mb-8">
                    <span className="text-[9px] font-mono text-[#5A6A7A] uppercase tracking-widest mb-3 block">Your Entry</span>
                    <div className="text-[13px] leading-[1.8] text-[#8899AA] pl-4 border-l-2 border-[#1E2A3A]">
                      {selectedEntry.entry_text.split('\n').map((line, i) => (
                        <p key={i} className={line.trim() === '' ? 'h-4' : 'mb-2'}>{line}</p>
                      ))}
                    </div>
                  </div>
                  {selectedEntry.analysis && (
                    <div>
                      <span className="text-[9px] font-mono text-[#C8A2FF]/60 uppercase tracking-widest mb-3 block">Mentor Read</span>
                      <div className="text-[14px] leading-[1.9] text-[#B8BCC4] space-y-5">
                        {selectedEntry.analysis.split('\n\n').map((paragraph, i) => (
                          <p key={i}>{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
