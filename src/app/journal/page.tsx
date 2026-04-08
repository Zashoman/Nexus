'use client';

import { useState, useEffect, useRef } from 'react';

// Accent color: warm amber gold
const A = '#D4A85C';
const A_HOVER = '#E0BC78';
const A_DIM = 'rgba(212,168,92,0.6)';

interface JournalEntry {
  id: string;
  entry_number: number;
  entry_text: string;
  analysis: string | null;
  created_at: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function JournalPage() {
  const [view, setView] = useState<'write' | 'history'>('write');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [entryText, setEntryText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  async function fetchEntries() {
    try {
      const res = await fetch('/api/journal/entries');
      const data = await res.json();
      if (data.entries) setEntries(data.entries);
    } catch { /* silent */ }
  }

  async function handleSubmit() {
    if (!entryText.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setActiveEntry(null);
    setChatMessages([]);

    try {
      const res = await fetch('/api/journal/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_text: entryText }),
      });
      const data = await res.json();
      if (data.analysis && data.entry) {
        setActiveEntry(data.entry);
        setChatMessages([]);
        setEntryText('');
        fetchEntries();
      }
    } catch { /* */ }
    finally { setIsAnalyzing(false); }
  }

  async function handleChat() {
    const entry = activeEntry || selectedEntry;
    if (!chatInput.trim() || isChatting || !entry) return;

    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsChatting(true);

    try {
      const res = await fetch('/api/journal/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_id: entry.id,
          message: userMsg.content,
          conversation_history: chatMessages,
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setChatMessages([...updatedMessages, { role: 'assistant', content: data.reply }]);
      }
    } catch { /* */ }
    finally { setIsChatting(false); }
  }

  function handleSelectEntry(entry: JournalEntry) {
    setSelectedEntry(entry);
    setChatMessages([]);
    setChatInput('');
    setMobileDetailOpen(true);
  }

  function handleChatKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChat();
    }
  }

  function handleEntryKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatFullDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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

  // Renders the right-side analysis + chat panel
  function renderMentorPanel(entry: JournalEntry | null, opts?: { onClose?: () => void }) {
    if (!entry) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-[280px]">
            <div className="w-12 h-12 rounded-sm flex items-center justify-center mx-auto mb-4 ring-1" style={{ background: `${A}08`, borderColor: `${A}18` }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={A_DIM} strokeWidth="1.5">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <p className="text-[11px] font-mono text-[#3A4A5A] leading-relaxed">
              Write your journal entry on the left.<br />
              Your mentor&apos;s read will appear here.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Close button for mobile */}
        {opts?.onClose && (
          <div className="px-4 py-3 border-b border-[#1E2A3A] bg-[#0D1117] flex items-center justify-between sticky top-0 z-10">
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: A }}>
              Entry #{entry.entry_number}
            </span>
            <button onClick={opts.onClose} className="text-[#5A6A7A] hover:text-[#E8EAED] transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Scrollable content: analysis + chat messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 lg:px-8 py-6">
            {/* Header */}
            <div className="mb-5 pb-3 border-b border-[#1E2A3A]/40">
              <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: A_DIM }}>
                Mentor Read — Entry #{entry.entry_number}
              </span>
              {entry.created_at && (
                <span className="text-[10px] font-mono text-[#3A4A5A] ml-3">{formatDate(entry.created_at)}</span>
              )}
            </div>

            {/* Analysis paragraphs */}
            {entry.analysis && (
              <div className="text-[14px] leading-[1.9] text-[#B8BCC4] space-y-5 mb-8">
                {entry.analysis.split('\n\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}

            {/* Chat thread */}
            {chatMessages.length > 0 && (
              <div className="border-t border-[#1E2A3A]/40 pt-6 space-y-4">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] px-4 py-3 rounded-sm text-[13px] leading-[1.8] ${
                        msg.role === 'user'
                          ? 'bg-[#1A2030] text-[#D0D4DA] border border-[#1E2A3A]'
                          : 'text-[#B8BCC4]'
                      }`}
                      style={msg.role === 'assistant' ? { borderLeft: `2px solid ${A}40` } : undefined}
                    >
                      {msg.content.split('\n\n').map((p, j) => (
                        <p key={j} className={j > 0 ? 'mt-3' : ''}>{p}</p>
                      ))}
                    </div>
                  </div>
                ))}

                {isChatting && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 px-4 py-3">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: A }} />
                      <span className="text-[11px] font-mono text-[#5A6A7A]">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Chat input */}
        <div className="border-t border-[#1E2A3A] bg-[#0D1117] px-4 lg:px-6 py-3">
          <div className="flex items-end gap-3">
            <textarea
              ref={chatInputRef}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder="Ask your mentor..."
              rows={1}
              disabled={isChatting}
              className="flex-1 bg-[#141820] border border-[#1E2A3A] rounded-sm px-3 py-2 text-[13px] text-[#D0D4DA] placeholder-[#3A4A5A] resize-none outline-none transition-colors"
              style={{ caretColor: A }}
              onFocus={(e) => e.target.style.borderColor = `${A}60`}
              onBlur={(e) => e.target.style.borderColor = '#1E2A3A'}
            />
            <button
              onClick={handleChat}
              disabled={!chatInput.trim() || isChatting}
              className="px-3 py-2 rounded-sm text-xs font-mono transition-all cursor-pointer flex-shrink-0"
              style={{
                background: chatInput.trim() ? `${A}20` : '#141820',
                color: chatInput.trim() ? A : '#3A4A5A',
                boxShadow: chatInput.trim() ? `inset 0 0 0 1px ${A}40` : 'none',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="text-[9px] font-mono text-[#2A3444] mt-1.5 pl-1">enter to send</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0B0E11] text-[#E8EAED]">
      {/* Header */}
      <div className="border-b border-[#1E2A3A] bg-[#0D1117] px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: A }}>
            Journal
          </h1>
          <span className="text-[10px] font-mono text-[#5A6A7A]">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-[#1E2A3A] bg-[#0D1117] overflow-x-auto">
        <button
          onClick={() => { setView('write'); setSelectedEntry(null); setActiveEntry(null); setChatMessages([]); }}
          className={`px-4 py-2 text-xs font-mono whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            view === 'write'
              ? 'text-[#E8EAED] bg-[#141820]'
              : 'border-transparent text-[#5A6A7A] hover:text-[#8899AA] hover:bg-[#141820]/50'
          }`}
          style={view === 'write' ? { borderBottomColor: A } : undefined}
        >
          Write
        </button>
        <button
          onClick={() => { setView('history'); setActiveEntry(null); setChatMessages([]); }}
          className={`px-4 py-2 text-xs font-mono whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            view === 'history'
              ? 'text-[#E8EAED] bg-[#141820]'
              : 'border-transparent text-[#5A6A7A] hover:text-[#8899AA] hover:bg-[#141820]/50'
          }`}
          style={view === 'history' ? { borderBottomColor: A } : undefined}
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
              <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                <div className="mb-4">
                  <span className="text-[10px] font-mono text-[#5A6A7A] uppercase tracking-widest">
                    {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <textarea
                  value={entryText}
                  onChange={(e) => setEntryText(e.target.value)}
                  onKeyDown={handleEntryKeyDown}
                  placeholder="What's on your mind..."
                  disabled={isAnalyzing}
                  className="flex-1 bg-transparent border-none outline-none resize-none text-[15px] leading-[1.8] text-[#D0D4DA] placeholder-[#2A3444] min-h-[300px]"
                  style={{ caretColor: A, WebkitTextFillColor: undefined }}
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
                  className="px-5 py-2 text-xs font-mono rounded-sm transition-all cursor-pointer"
                  style={{
                    background: isAnalyzing ? `${A}10` : entryText.trim() ? `${A}18` : '#141820',
                    color: isAnalyzing ? `${A}60` : entryText.trim() ? A : '#3A4A5A',
                    boxShadow: entryText.trim() && !isAnalyzing ? `inset 0 0 0 1px ${A}40` : 'none',
                    cursor: isAnalyzing ? 'wait' : !entryText.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isAnalyzing ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: `${A}30`, borderTopColor: A }} />
                      Reading...
                    </span>
                  ) : (
                    'Submit Entry'
                  )}
                </button>
              </div>
            </div>

            {/* Right: Analysis + Chat panel (desktop) */}
            <div className="hidden lg:flex flex-1 border-l border-[#1E2A3A] flex-col bg-[#0B0E11]">
              {isAnalyzing ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: `${A}20`, borderTopColor: A }} />
                    <p className="text-[11px] font-mono text-[#5A6A7A] tracking-wider uppercase">Analyzing entry</p>
                    <p className="text-[10px] font-mono text-[#3A4A5A] mt-1">Reading between the lines...</p>
                  </div>
                </div>
              ) : (
                renderMentorPanel(activeEntry)
              )}
            </div>

            {/* Mobile: Analysis overlay */}
            {activeEntry && (
              <div className="fixed inset-0 z-40 bg-[#0B0E11] lg:hidden overflow-hidden flex flex-col">
                {renderMentorPanel(activeEntry, { onClose: () => setActiveEntry(null) })}
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
                          ? 'bg-[#141820]'
                          : 'hover:bg-[#141820]/60'
                      }`}
                      style={{
                        borderLeft: selectedEntry?.id === entry.id ? `2px solid ${A}` : '2px solid transparent',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: `${A}AA` }}>
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

            {/* Right: Detail + Chat panel (desktop) */}
            <div className="hidden lg:flex flex-1 flex-col bg-[#0B0E11]">
              {selectedEntry ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Scrollable content */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="px-8 py-6">
                      {/* Entry header */}
                      <div className="mb-6 pb-4 border-b border-[#1E2A3A]/50">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: A }}>
                            Entry #{selectedEntry.entry_number}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-[#5A6A7A]">
                          {formatFullDate(selectedEntry.created_at)}
                        </span>
                      </div>

                      {/* Original entry */}
                      <div className="mb-8">
                        <span className="text-[9px] font-mono text-[#5A6A7A] uppercase tracking-widest mb-3 block">Your Entry</span>
                        <div className="text-[13px] leading-[1.8] text-[#8899AA] pl-4 border-l-2 border-[#1E2A3A]">
                          {selectedEntry.entry_text.split('\n').map((line, i) => (
                            <p key={i} className={line.trim() === '' ? 'h-4' : 'mb-2'}>{line}</p>
                          ))}
                        </div>
                      </div>

                      {/* Analysis */}
                      {selectedEntry.analysis && (
                        <div className="mb-8">
                          <span className="text-[9px] font-mono uppercase tracking-widest mb-3 block" style={{ color: A_DIM }}>Mentor Read</span>
                          <div className="text-[14px] leading-[1.9] text-[#B8BCC4] space-y-5">
                            {selectedEntry.analysis.split('\n\n').map((p, i) => (
                              <p key={i}>{p}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Chat thread */}
                      {chatMessages.length > 0 && (
                        <div className="border-t border-[#1E2A3A]/40 pt-6 space-y-4">
                          {chatMessages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`max-w-[85%] px-4 py-3 rounded-sm text-[13px] leading-[1.8] ${
                                  msg.role === 'user'
                                    ? 'bg-[#1A2030] text-[#D0D4DA] border border-[#1E2A3A]'
                                    : 'text-[#B8BCC4]'
                                }`}
                                style={msg.role === 'assistant' ? { borderLeft: `2px solid ${A}40` } : undefined}
                              >
                                {msg.content.split('\n\n').map((p, j) => (
                                  <p key={j} className={j > 0 ? 'mt-3' : ''}>{p}</p>
                                ))}
                              </div>
                            </div>
                          ))}
                          {isChatting && (
                            <div className="flex justify-start">
                              <div className="flex items-center gap-2 px-4 py-3">
                                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: A }} />
                                <span className="text-[11px] font-mono text-[#5A6A7A]">Thinking...</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  </div>

                  {/* Chat input */}
                  <div className="border-t border-[#1E2A3A] bg-[#0D1117] px-6 py-3">
                    <div className="flex items-end gap-3">
                      <textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleChatKeyDown}
                        placeholder="Ask your mentor..."
                        rows={1}
                        disabled={isChatting}
                        className="flex-1 bg-[#141820] border border-[#1E2A3A] rounded-sm px-3 py-2 text-[13px] text-[#D0D4DA] placeholder-[#3A4A5A] resize-none outline-none transition-colors"
                        style={{ caretColor: A }}
                        onFocus={(e) => e.target.style.borderColor = `${A}60`}
                        onBlur={(e) => e.target.style.borderColor = '#1E2A3A'}
                      />
                      <button
                        onClick={handleChat}
                        disabled={!chatInput.trim() || isChatting}
                        className="px-3 py-2 rounded-sm text-xs font-mono transition-all cursor-pointer flex-shrink-0"
                        style={{
                          background: chatInput.trim() ? `${A}20` : '#141820',
                          color: chatInput.trim() ? A : '#3A4A5A',
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-[9px] font-mono text-[#2A3444] mt-1.5 pl-1">enter to send</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center max-w-[280px]">
                    <div className="w-12 h-12 rounded-sm flex items-center justify-center mx-auto mb-4 ring-1 ring-[#D4A85C]/10" style={{ background: `${A}08` }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={A_DIM} strokeWidth="1.5">
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
              <div className="fixed inset-0 z-40 bg-[#0B0E11] lg:hidden overflow-hidden flex flex-col">
                {renderMentorPanel(selectedEntry, { onClose: () => setMobileDetailOpen(false) })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
