"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";

interface Video {
  id: string;
  video_id: string;
  channel_name: string;
  category: string;
  title: string;
  description: string | null;
  published_at: string | null;
  thumbnail_url: string | null;
  video_url: string;
  mini_summary: string | null;
  full_summary: string | null;
}

interface VideoDetailPanelProps {
  video: Video | null;
  onClose?: () => void;
  onVideoUpdate?: (videoId: string, updates: Partial<Video>) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + "m ago";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.floor(hours / 24);
  return days + "d ago";
}

function cleanBold(text: string): string {
  return text.replace(new RegExp("\\*\\*([^*]+)\\*\\*", "g"), "$1");
}

// Parse markdown-style sections from the summary
interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

function parseSections(text: string): Section[] {
  const sections: Section[] = [];
  const lines = text.split("\n");
  let currentTitle = "";
  let currentLines: string[] = [];
  let sectionIndex = 0;

  function flushSection() {
    if (currentTitle && currentLines.length > 0) {
      const id = `section-${sectionIndex++}`;
      sections.push({
        id,
        title: currentTitle,
        content: renderSectionContent(currentLines),
      });
    }
    currentLines = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip phase headers and horizontal rules
    if (trimmed.startsWith("# PHASE") || trimmed === "---" || trimmed === "RULES:") continue;
    if (trimmed.startsWith("- Only analyze") || trimmed.startsWith("- You have") || trimmed.startsWith("- Be analytical") || trimmed.startsWith("- Use direct") || trimmed.startsWith("- Target")) continue;

    if (trimmed.startsWith("## ")) {
      flushSection();
      currentTitle = cleanBold(trimmed.replace("## ", ""));
    } else if (trimmed.startsWith("# ")) {
      flushSection();
      currentTitle = cleanBold(trimmed.replace("# ", ""));
    } else {
      currentLines.push(line);
    }
  }
  flushSection();

  return sections;
}

function renderSectionContent(lines: string[]): React.ReactNode {
  const elements: React.ReactNode[] = [];
  let key = 0;
  let prevWasEmpty = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      if (!prevWasEmpty && elements.length > 0) {
        elements.push(<div key={key++} className="h-2" />);
        prevWasEmpty = true;
      }
      continue;
    }
    prevWasEmpty = false;

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const bulletText = cleanBold(trimmed.substring(2));
      elements.push(
        <div key={key++} className="flex gap-2.5 mb-2">
          <span className="text-[#4488FF] flex-shrink-0 mt-[3px] text-[10px]">{"\u25B8"}</span>
          <span className="text-[14px] text-[#C8CACD] leading-[1.65]">{bulletText}</span>
        </div>
      );
    } else if (trimmed.match(new RegExp("^\\d+\\."))) {
      elements.push(
        <p key={key++} className="text-[14px] text-[#C8CACD] leading-[1.65] mb-2 ml-1">
          {cleanBold(trimmed)}
        </p>
      );
    } else {
      // Detect sub-headings: Title Case lines or short lines before longer content
      const words = trimmed.split(" ");
      const capitalizedWords = words.filter((w: string) => w.length > 0 && w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase());
      const isTitleCase = words.length > 3 && capitalizedWords.length >= words.length * 0.6;

      const isSubHeading =
        trimmed.length < 100 &&
        !trimmed.endsWith(".") &&
        !trimmed.endsWith(",") &&
        !trimmed.startsWith("(") &&
        ((i + 1 < lines.length && lines[i + 1].trim().length > 40) || isTitleCase);

      if (isSubHeading && trimmed.length < 100) {
        elements.push(
          <h5 key={key++} className="text-[16px] font-bold text-[#E8EAED] mt-5 mb-2">
            {cleanBold(trimmed)}
          </h5>
        );
      } else {
        elements.push(
          <p key={key++} className="text-[14px] text-[#C8CACD] leading-[1.65] mb-3">
            {cleanBold(trimmed)}
          </p>
        );
      }
    }
  }

  return <div>{elements}</div>;
}

// Collapsible section component
function AnalysisSection({ section }: { section: Section }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-[#1E2A3A]/50 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 text-left group"
      >
        <h4 className="text-[13px] font-mono font-semibold text-[#E8EAED] uppercase tracking-wider group-hover:text-[#4488FF] transition-colors">
          {section.title}
        </h4>
        <span className={`text-[#5A6A7A] text-xs transition-transform ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="pb-5">
          {section.content}
        </div>
      )}
    </div>
  );
}

function FeedbackInput({ videoId }: { videoId: string }) {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSubmit() {
    if (!value.trim()) return;
    // Store feedback (for now just show confirmation - could save to DB)
    setSaved(true);
    setValue("");
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="What did you think of this video?"
          className="flex-1 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1.5 text-[12px] text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF]"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="px-2 py-1 text-[10px] font-mono bg-[#4488FF] text-white rounded-sm hover:bg-[#5599FF] disabled:opacity-30 cursor-pointer"
        >
          Save
        </button>
      </div>
      {saved && <p className="text-[10px] font-mono text-[#00CC66]">Feedback saved</p>}
    </div>
  );
}

export default function VideoDetailPanel({ video, onClose, onVideoUpdate }: VideoDetailPanelProps) {
  const [miniSummary, setMiniSummary] = useState<string | null>(null);
  const [fullSummary, setFullSummary] = useState<string | null>(null);
  const [extendedSummary, setExtendedSummary] = useState<string | null>(null);
  const [factCheck, setFactCheck] = useState<string | null>(null);
  const [miniLoading, setMiniLoading] = useState(false);
  const [fullLoading, setFullLoading] = useState(false);
  const [extendedLoading, setExtendedLoading] = useState(false);
  const [factCheckLoading, setFactCheckLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isStarred, setIsStarred] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Track current video ID to prevent stale async updates
  const currentVideoIdRef = useRef<string | null>(null);
  // Cache summaries across video switches
  const cacheRef = useRef<Map<string, { mini?: string; full?: string; extended?: string; factcheck?: string }>>(new Map());

  useEffect(() => {
    if (!video) return;
    currentVideoIdRef.current = video.video_id;

    // Load from cache first, then fall back to video props
    const cached = cacheRef.current.get(video.video_id);
    setMiniSummary(cached?.mini || video.mini_summary || null);
    setFullSummary(cached?.full || video.full_summary || null);
    setExtendedSummary(cached?.extended || null);
    setFactCheck(cached?.factcheck || null);
    setMiniLoading(false);
    setFullLoading(false);
    setExtendedLoading(false);
    setFactCheckLoading(false);
    setSummaryError(null);
    setIsStarred(false);
    setReadProgress(0);
  }, [video?.video_id]);

  // Helper: only update state if we're still on the same video
  function updateIfCurrent(videoId: string, setter: (v: string) => void, cacheKey: 'mini' | 'full' | 'extended' | 'factcheck', summary: string) {
    // Always cache regardless of current view
    const entry = cacheRef.current.get(videoId) || {};
    entry[cacheKey] = summary;
    cacheRef.current.set(videoId, entry);

    // Only update displayed state if still viewing this video
    if (currentVideoIdRef.current === videoId) {
      setter(summary);
    }
  }

  // Reading progress tracker
  const handleScroll = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight - el.clientHeight;
    if (scrollHeight > 0) {
      setReadProgress(Math.min(100, (scrollTop / scrollHeight) * 100));
    }
  }, []);

  async function generateMini() {
    if (!video || miniLoading) return;
    const targetId = video.video_id;
    setMiniLoading(true);
    setSummaryError(null);
    try {
      const res = await apiFetch("/api/youtube/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: targetId, mode: "mini" }),
      });
      const data = await res.json();
      if (data.summary) {
        updateIfCurrent(targetId, setMiniSummary, 'mini', data.summary);
        onVideoUpdate?.(targetId, { mini_summary: data.summary });
      } else if (data.error && currentVideoIdRef.current === targetId) {
        setSummaryError(data.error);
      }
    } catch {
      if (currentVideoIdRef.current === targetId) setSummaryError('Network error, please retry');
    }
    finally {
      if (currentVideoIdRef.current === targetId) setMiniLoading(false);
    }
  }

  async function generateFull() {
    if (!video || fullLoading) return;
    const targetId = video.video_id;
    setFullLoading(true);
    setSummaryError(null);
    try {
      const res = await apiFetch("/api/youtube/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: targetId, mode: "full" }),
      });
      const data = await res.json();
      if (data.summary) {
        updateIfCurrent(targetId, setFullSummary, 'full', data.summary);
        onVideoUpdate?.(targetId, { full_summary: data.summary });
      } else if (data.error && currentVideoIdRef.current === targetId) {
        setSummaryError(data.error);
      }
    } catch {
      if (currentVideoIdRef.current === targetId) setSummaryError('Network error, please retry');
    }
    finally {
      if (currentVideoIdRef.current === targetId) setFullLoading(false);
    }
  }

  async function generateExtended() {
    if (!video || extendedLoading) return;
    const targetId = video.video_id;
    setExtendedLoading(true);
    setSummaryError(null);
    try {
      const res = await apiFetch("/api/youtube/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: targetId, mode: "extended" }),
      });
      const data = await res.json();
      if (data.summary) {
        updateIfCurrent(targetId, setExtendedSummary, 'extended', data.summary);
      } else if (data.error && currentVideoIdRef.current === targetId) {
        setSummaryError(data.error);
      }
    } catch {
      if (currentVideoIdRef.current === targetId) setSummaryError('Network error, please retry');
    }
    finally {
      if (currentVideoIdRef.current === targetId) setExtendedLoading(false);
    }
  }

  async function generateFactCheck() {
    if (!video || factCheckLoading) return;
    const targetId = video.video_id;
    setFactCheckLoading(true);
    setSummaryError(null);
    try {
      const res = await apiFetch("/api/youtube/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: targetId, mode: "factcheck" }),
      });
      const data = await res.json();
      if (data.summary) {
        updateIfCurrent(targetId, setFactCheck, 'factcheck', data.summary);
      } else if (data.error && currentVideoIdRef.current === targetId) {
        setSummaryError(data.error);
      }
    } catch {
      if (currentVideoIdRef.current === targetId) setSummaryError('Network error, please retry');
    }
    finally {
      if (currentVideoIdRef.current === targetId) setFactCheckLoading(false);
    }
  }

  if (!video) {
    return (
      <div className="flex-1 bg-[#141820] flex items-center justify-center">
        <p className="text-[#5A6A7A] text-sm font-mono">Select a video to view details</p>
      </div>
    );
  }

  // Use extended summary if available, otherwise fall back to full summary
  const displaySummary = extendedSummary || fullSummary;
  const sections = displaySummary ? parseSections(displaySummary) : [];

  return (
    <div className="flex-1 bg-[#141820] flex flex-col overflow-hidden border-l border-[#1E2A3A]">
      {/* Reading progress bar */}
      {displaySummary && (
        <div className="h-[2px] bg-[#1E2A3A] flex-shrink-0">
          <div
            className="h-full bg-[#4488FF] transition-all duration-150"
            style={{ width: `${readProgress}%` }}
          />
        </div>
      )}

      {onClose && (
        <button onClick={onClose} className="lg:hidden absolute top-2 right-2 text-[#5A6A7A] hover:text-[#E8EAED] text-lg px-2 cursor-pointer z-10">
          X
        </button>
      )}

      <div ref={contentRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        {/* Constrained reading width */}
        <div className="max-w-[620px] mx-auto px-5 py-5 space-y-4">

          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-[18px] font-semibold text-[#E8EAED] leading-snug">{video.title}</h2>
            <button
              onClick={() => setIsStarred(!isStarred)}
              className={`flex-shrink-0 px-1.5 py-0.5 text-sm cursor-pointer transition-all ${
                isStarred ? 'text-[#FFD700]' : 'text-[#5A6A7A] hover:text-[#FFD700]'
              }`}
            >
              {isStarred ? '\u2605' : '\u2606'}
            </button>
          </div>

          {/* Meta + thumbnail */}
          <div className="flex items-start gap-3">
            {video.thumbnail_url && (
              <div className="flex-shrink-0 w-[120px] h-[68px] bg-[#0B0E11] rounded-sm overflow-hidden">
                <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-[#FF4444] font-bold">{video.channel_name}</span>
                <span className="text-[#5A6A7A] capitalize">{video.category}</span>
                {video.published_at && <span className="text-[#5A6A7A]">{timeAgo(video.published_at)}</span>}
              </div>
              <a
                href={video.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono bg-[#FF4444]/10 text-[#FF4444] rounded-sm hover:bg-[#FF4444]/20 transition-colors"
              >
                Watch on YouTube
              </a>
            </div>
          </div>

          {/* Quick Summary */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider">Quick Summary</h4>
              {!miniSummary && !miniLoading && (
                <button onClick={generateMini} className="text-[10px] font-mono text-[#4488FF] hover:text-[#6699FF] cursor-pointer">
                  Generate
                </button>
              )}
            </div>
            {miniLoading ? (
              <div className="space-y-2 py-1">
                <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-full" />
                <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-3/4" />
              </div>
            ) : miniSummary ? (
              <p className="text-[14px] text-[#C8CACD] leading-[1.65]">{miniSummary}</p>
            ) : (
              <p className="text-[11px] text-[#5A6A7A]">Click Generate for a quick summary</p>
            )}
          </div>

          {/* Error message */}
          {summaryError && (
            <div className="bg-[#FF4444]/10 border border-[#FF4444]/30 rounded-sm px-3 py-2">
              <p className="text-[11px] font-mono text-[#FF6666]">
                <span className="font-bold">Error:</span> {summaryError}
              </p>
            </div>
          )}

          {/* Full Analysis */}
          <div className="space-y-2 pt-3 border-t border-[#1E2A3A]">
            {!fullSummary && !fullLoading && (
              <button
                onClick={generateFull}
                className="w-full py-3 px-4 text-sm font-mono font-semibold text-[#0B0E11] rounded cursor-pointer transition-all duration-200 bg-[#00CC66] hover:bg-[#00DD77] active:bg-[#00BB55]"
              >
                Full Summary
              </button>
            )}
            {fullLoading && (
              <div className="bg-[#0B0E11] border border-[#00CC66]/20 rounded-sm p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#00CC66] rounded-full animate-pulse" />
                  <p className="text-[11px] font-mono text-[#00CC66]">Analyzing transcript...</p>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-full" />
                  <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-5/6" />
                  <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-full" />
                </div>
                <p className="text-[9px] font-mono text-[#5A6A7A]">15-30 seconds</p>
              </div>
            )}
            {/* Action buttons — appear after Full Summary is loaded */}
            {fullSummary && !extendedLoading && (
              <div className="flex gap-2 mb-3">
                {!extendedSummary && (
                  <button
                    onClick={generateExtended}
                    className="flex-1 py-2.5 px-4 text-xs font-mono font-semibold rounded cursor-pointer transition-all duration-200 bg-[#4488FF] text-white hover:bg-[#5599FF] active:bg-[#3377EE]"
                  >
                    Longer Breakdown
                  </button>
                )}
                {!factCheck && !factCheckLoading && (
                  <button
                    onClick={generateFactCheck}
                    className="flex-1 py-2.5 px-4 text-xs font-mono font-semibold rounded cursor-pointer transition-all duration-200 bg-[#FF8C00] text-white hover:bg-[#FF9922] active:bg-[#EE7B00]"
                  >
                    Fact Check
                  </button>
                )}
              </div>
            )}
            {extendedLoading && (
              <div className="bg-[#0B0E11] border border-[#4488FF]/20 rounded-sm p-4 space-y-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#4488FF] rounded-full animate-pulse" />
                  <p className="text-[11px] font-mono text-[#4488FF]">Generating deep breakdown...</p>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-full" />
                  <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-5/6" />
                  <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-full" />
                  <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-4/6" />
                </div>
                <p className="text-[9px] font-mono text-[#5A6A7A]">30-60 seconds — this is a comprehensive analysis</p>
              </div>
            )}
            {displaySummary && sections.length > 0 && (
              <div>
                {/* Section nav — sticky jump links */}
                <div className="flex flex-wrap gap-1.5 mb-4 pb-3 border-b border-[#1E2A3A] sticky top-0 bg-[#141820] z-10 pt-1">
                  {sections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        const el = document.getElementById(s.id);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="px-2 py-1 text-[10px] font-mono text-[#5A6A7A] bg-[#0B0E11] rounded-sm hover:text-[#4488FF] hover:bg-[#4488FF]/10 transition-colors"
                    >
                      {s.title}
                    </button>
                  ))}
                </div>

                {/* Collapsible sections */}
                {sections.map((s) => (
                  <div key={s.id} id={s.id}>
                    <AnalysisSection section={s} />
                  </div>
                ))}
              </div>
            )}
            {displaySummary && sections.length === 0 && (
              <div>
                <h4 className="text-[12px] font-mono text-[#00CC66] uppercase tracking-wider mb-3">Analysis</h4>
                {renderSectionContent(displaySummary.split("\n"))}
              </div>
            )}
          </div>

          {/* Fact Check — separate section below analysis */}
          {factCheckLoading && (
            <div className="pt-3 border-t-2 border-[#FF8C00]/30">
              <div className="bg-[#0B0E11] border border-[#FF8C00]/20 rounded-sm p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#FF8C00] rounded-full animate-pulse" />
                  <p className="text-[11px] font-mono text-[#FF8C00]">Fact-checking claims against primary sources...</p>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-full" />
                  <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-5/6" />
                  <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-full" />
                  <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-full" />
                </div>
                <p className="text-[9px] font-mono text-[#5A6A7A]">45-90 seconds — verifying claims against credible sources</p>
              </div>
            </div>
          )}
          {factCheck && (
            <div className="pt-3 border-t-2 border-[#FF8C00]/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 bg-[#FF8C00] rounded-full" />
                <h3 className="text-[13px] font-mono font-bold text-[#FF8C00] uppercase tracking-wider">Independent Fact Check</h3>
              </div>
              {parseSections(factCheck).length > 0 ? (
                <div>
                  {parseSections(factCheck).map((s) => (
                    <div key={s.id} id={`fc-${s.id}`}>
                      <AnalysisSection section={s} />
                    </div>
                  ))}
                </div>
              ) : (
                <div>{renderSectionContent(factCheck.split("\n"))}</div>
              )}
            </div>
          )}

          {/* Feedback */}
          <div className="pt-3 border-t border-[#1E2A3A] space-y-2">
            <h4 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider">Feedback</h4>
            <FeedbackInput videoId={video.video_id} />
          </div>

          {/* Description */}
          {video.description && (
            <div className="pt-2 border-t border-[#1E2A3A]">
              <h4 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-1">Description</h4>
              <p className="text-[12px] text-[#5A6A7A] leading-relaxed whitespace-pre-wrap line-clamp-6">{video.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
