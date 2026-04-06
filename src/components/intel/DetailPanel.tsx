'use client';

import React, { useEffect, useState } from 'react';
import type { IntelItem, IntelBeliefEvidence, RatingValue } from '@/types/intel';
import RatingButtons from './RatingButtons';

interface DetailPanelProps {
  item: IntelItem | null;
  onClose?: () => void;
}

const TIER_COLORS: Record<number, string> = {
  1: 'text-[#00CC66]',
  2: 'text-[#4488FF]',
  3: 'text-[#888888]',
};

const TIER_LABELS: Record<number, string> = {
  1: 'Primary Source',
  2: 'Quality Press',
  3: 'Commentary',
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
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function extractBullets(raw: string): string[] {
  return raw.split('\n').filter(l => l.trim().startsWith('-')).map(l => l.trim().replace(/^- /, ''));
}

function renderStructuredSummary(text: string) {
  const lines = text.replace(/\r\n/g, '\n');
  const thesisMatch = lines.match(/THESIS:\s*([^\n]+(?:\n(?!KEY POINTS:)[^\n]+)*)/);
  const pointsMatch = lines.match(/KEY POINTS:\s*\n((?:- [^\n]+\n?)+)/);
  const mattersMatch = lines.match(/WHY IT MATTERS:\s*([^\n]+(?:\n(?!DATA POINTS:|RELEVANCE)[^\n]+)*)/);
  const dataMatch = lines.match(/DATA POINTS:\s*\n((?:- [^\n]+\n?)+)/);
  const relevanceMatch = lines.match(/RELEVANCE TO YOU:\s*([^\n]+(?:\n(?!$|\n)[^\n]+)*)/);

  if (!thesisMatch) {
    return <p className="text-[13px] text-[#E8EAED]/90 leading-relaxed whitespace-pre-wrap">{text}</p>;
  }

  return (
    <div className="space-y-4">
      {thesisMatch && (
        <div>
          <h5 className="text-[11px] font-mono text-[#FF8C00] uppercase tracking-wider mb-1.5">Thesis</h5>
          <p className="text-[13px] text-[#E8EAED]/90 leading-relaxed">{thesisMatch[1].trim()}</p>
        </div>
      )}

      {pointsMatch && (
        <div>
          <h5 className="text-[11px] font-mono text-[#4488FF] uppercase tracking-wider mb-1.5">Key Points</h5>
          <ul className="space-y-1">
            {extractBullets(pointsMatch[1]).map((point, i) => (
              <li key={i} className="text-[13px] text-[#E8EAED]/80 leading-relaxed flex gap-2">
                <span className="text-[#4488FF] flex-shrink-0">&#8250;</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mattersMatch && (
        <div>
          <h5 className="text-[11px] font-mono text-[#00CC66] uppercase tracking-wider mb-1.5">Why It Matters</h5>
          <p className="text-[13px] text-[#E8EAED]/90 leading-relaxed">{mattersMatch[1].trim()}</p>
        </div>
      )}

      {dataMatch && (
        <div>
          <h5 className="text-[11px] font-mono text-[#8899AA] uppercase tracking-wider mb-1.5">Data</h5>
          <ul className="space-y-1">
            {extractBullets(dataMatch[1]).map((point, i) => (
              <li key={i} className="text-[13px] text-[#8899AA] leading-relaxed flex gap-2">
                <span className="text-[#5A6A7A] font-mono flex-shrink-0">{i + 1}.</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {relevanceMatch && (
        <div className="bg-[#4488FF]/5 border-l-2 border-[#4488FF]/30 px-3 py-2">
          <h5 className="text-[11px] font-mono text-[#4488FF] uppercase tracking-wider mb-1">Relevance to You</h5>
          <p className="text-[13px] text-[#E8EAED]/80 leading-relaxed">{relevanceMatch[1].trim()}</p>
        </div>
      )}
    </div>
  );
}

function cleanBold(text: string): string {
  return text.replace(new RegExp("\\*\\*([^*]+)\\*\\*", "g"), "$1");
}

function renderDeepAnalysis(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;
  let prevWasEmpty = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      if (!prevWasEmpty) {
        elements.push(<div key={key++} className="h-3" />);
        prevWasEmpty = true;
      }
      continue;
    }
    prevWasEmpty = false;

    if (trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
      const title = cleanBold(trimmed.replace(/^#{2,3}\s+/, ""));
      // Remove numbered prefixes like "1. " or "4. "
      const cleanTitle = title.replace(/^\d+\.\s*/, "");
      elements.push(
        <h4 key={key++} className="text-[15px] font-bold text-[#E8EAED] mt-5 mb-2">
          {cleanTitle}
        </h4>
      );
    } else if (trimmed.startsWith("# ")) {
      const title = cleanBold(trimmed.replace("# ", ""));
      elements.push(
        <h3 key={key++} className="text-[16px] font-bold text-[#E8EAED] mt-6 mb-2">
          {title}
        </h3>
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const bulletText = cleanBold(trimmed.substring(2));
      elements.push(
        <div key={key++} className="text-[13px] text-[#E8EAED]/80 leading-relaxed flex gap-2 ml-2 mb-1.5">
          <span className="text-[#4488FF] flex-shrink-0 mt-0.5">{">"}</span>
          <span>{bulletText}</span>
        </div>
      );
    } else if (trimmed.match(new RegExp("^\\d+\\."))) {
      const numText = cleanBold(trimmed);
      elements.push(
        <p key={key++} className="text-[13px] text-[#E8EAED]/80 leading-relaxed ml-2 mb-1.5">
          {numText}
        </p>
      );
    } else {
      // Detect sub-headings (short lines followed by longer content)
      const isSubHeading =
        trimmed.length < 80 &&
        !trimmed.endsWith(".") &&
        !trimmed.endsWith(",") &&
        !trimmed.startsWith("(") &&
        i + 1 < lines.length &&
        lines[i + 1].trim().length > 80;

      if (isSubHeading) {
        elements.push(
          <h5 key={key++} className="text-[14px] font-bold text-[#E8EAED] mt-4 mb-1">
            {cleanBold(trimmed)}
          </h5>
        );
      } else {
        elements.push(
          <p key={key++} className="text-[13px] text-[#E8EAED]/90 leading-relaxed mb-2">
            {cleanBold(trimmed)}
          </p>
        );
      }
    }
  }

  return <div>{elements}</div>;
}

export default function DetailPanel({ item, onClose }: DetailPanelProps) {
  const [beliefEvidence, setBeliefEvidence] = useState<
    (IntelBeliefEvidence & { belief_title?: string })[]
  >([]);
  const [feedback, setFeedback] = useState('');
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [deepAnalysis, setDeepAnalysis] = useState<string | null>(null);
  const [deepLoading, setDeepLoading] = useState(false);

  useEffect(() => {
    if (!item) return;
    setBeliefEvidence([]);
    setFeedback('');
    setAiSummary(item.ai_summary || null);
    setDeepAnalysis(((item.metadata as Record<string, unknown>)?.deep_analysis as string) || null);
    setDeepLoading(false);
    setIsStarred(item.rating === 'starred');

    if (!item.ai_summary) {
      setSummaryLoading(true);
      fetch('/api/intel/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.summary) setAiSummary(data.summary);
        })
        .catch(() => {})
        .finally(() => setSummaryLoading(false));
    }
  }, [item?.id]);

  if (!item) {
    return (
      <div className="flex-1 bg-[#141820] flex items-center justify-center">
        <p className="text-[#5A6A7A] text-sm font-mono">
          Select an item to view details
        </p>
      </div>
    );
  }

  const tierColor = TIER_COLORS[item.source_tier] || TIER_COLORS[3];
  const tierLabel = TIER_LABELS[item.source_tier] || 'Source';
  const impactColor = IMPACT_COLORS[item.impact_level || 'low'] || IMPACT_COLORS.low;
  const published = item.published_at || item.ingested_at;

  return (
    <div className="flex-1 bg-[#141820] overflow-y-auto border-l border-[#1E2A3A]">
      {onClose && (
        <button
          onClick={onClose}
          className="lg:hidden absolute top-2 right-2 text-[#5A6A7A] hover:text-[#E8EAED] text-lg px-2 cursor-pointer"
        >
          ✕
        </button>
      )}

      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-[#E8EAED] leading-tight">
            {item.title}
          </h2>
          <button
            onClick={async () => {
              const newStarred = !isStarred;
              setIsStarred(newStarred);
              await fetch('/api/intel/rate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: item.id, rating: newStarred ? 'starred' : 'signal' }),
              });
            }}
            className={`flex-shrink-0 px-1.5 py-0.5 text-sm cursor-pointer transition-all ${
              isStarred ? 'text-[#FFD700]' : 'text-[#5A6A7A] hover:text-[#FFD700]'
            }`}
            title={isStarred ? 'Starred for weekly synthesis' : 'Star for weekly synthesis'}
          >
            {isStarred ? '\u2605' : '\u2606'}
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-[#8899AA]">{item.source_name}</span>
          <span className={tierColor} title={tierLabel}>T{item.source_tier} {tierLabel}</span>
          <span className={impactColor}>
            {(item.impact_level || 'low').toUpperCase()}
          </span>
          <span className="text-[#5A6A7A]">{timeAgo(published)}</span>
        </div>

        <div className="space-y-1">
          <h4 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider">
            Intelligence Briefing
          </h4>
          {summaryLoading ? (
            <div className="space-y-2 py-2">
              <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-3/4" />
              <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-full" />
              <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-2/3" />
            </div>
          ) : aiSummary ? (
            renderStructuredSummary(aiSummary)
          ) : item.summary ? (
            <p className="text-[13px] text-[#E8EAED]/90 leading-relaxed">
              {item.summary}
            </p>
          ) : (
            <p className="text-[13px] text-[#5A6A7A]">No briefing available</p>
          )}
        </div>

        {beliefEvidence.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider">
              Belief Impact
            </h4>
            {beliefEvidence.map((ev) => (
              <div key={ev.id} className="flex items-center gap-2 text-[13px]">
                <span className={ev.direction === 'supports' ? 'text-[#00CC66]' : 'text-[#FF4444]'}>
                  {ev.direction === 'supports' ? '▲' : '▼'}
                </span>
                <span className="text-[#8899AA]">
                  {ev.direction === 'supports' ? 'Supports' : 'Challenges'}{' '}
                  &quot;{ev.belief_title}&quot;
                </span>
              </div>
            ))}
          </div>
        )}

        <a
          href={item.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[13px] font-mono text-[#4488FF] hover:text-[#6699FF] transition-colors"
        >
          Open Source -&gt;
        </a>

        <div className="space-y-2 pt-3 border-t border-[#1E2A3A]">
          {!deepAnalysis && !deepLoading && (
            <button
              onClick={async () => {
                setDeepLoading(true);
                try {
                  const res = await fetch('/api/intel/deep-analysis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ item_id: item.id }),
                  });
                  const data = await res.json();
                  if (data.analysis) setDeepAnalysis(data.analysis);
                } catch {
                  // silent
                } finally {
                  setDeepLoading(false);
                }
              }}
              className="w-full py-3 px-4 text-sm font-mono font-semibold text-[#0B0E11] rounded cursor-pointer transition-all duration-200 bg-[#4488FF] hover:bg-[#5599FF] active:bg-[#3377EE]"
            >
              Deep Analysis - Full Article Breakdown
            </button>
          )}
          {deepLoading && (
            <div className="bg-[#141820] border border-[#4488FF]/20 rounded-sm p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#4488FF] rounded-full animate-pulse" />
                <p className="text-[11px] font-mono text-[#4488FF]">Analyzing article...</p>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-full" />
                <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-5/6" />
                <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-full" />
                <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-4/5" />
              </div>
              <p className="text-[9px] font-mono text-[#5A6A7A]">This may take 15-30 seconds</p>
            </div>
          )}
          {deepAnalysis && (
            <div>
              <h4 className="text-[12px] font-mono text-[#4488FF] uppercase tracking-wider mb-3">Deep Analysis</h4>
              {renderDeepAnalysis(deepAnalysis)}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-[#1E2A3A]">
          <h4 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-2">
            Rate This Item
          </h4>
          <RatingButtons
            itemId={item.id}
            currentRating={item.rating as RatingValue | undefined}
            size="lg"
          />
        </div>

        <div className="space-y-1">
          {feedbackSaved && (
            <div className="text-[11px] font-mono text-[#00CC66] bg-[#00CC66]/10 px-2 py-1 rounded-sm">
              Success, added to database
            </div>
          )}
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Add feedback and press Enter"
            className="w-full bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1.5 text-[13px] text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF]"
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && feedback.trim()) {
                // Save to rating system
                await fetch('/api/intel/rate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    item_id: item.id,
                    rating: 'signal',
                    feedback_note: feedback,
                  }),
                });
                // Also save to feedback database for browsing/editing
                await fetch('/api/intel/feedback', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    item_id: item.id,
                    item_title: item.title,
                    source_name: item.source_name,
                    category: item.category,
                    rating: 'signal',
                    feedback_note: feedback,
                  }),
                });
                setFeedback('');
                setFeedbackSaved(true);
                setTimeout(() => setFeedbackSaved(false), 3000);
              }
            }}
          />
        </div>

        {item.group_source_count && item.group_source_count > 1 && (
          <div className="text-[13px] font-mono text-[#8899AA] bg-[#8899AA]/5 px-2 py-1 rounded-sm">
            Reported by {item.group_source_count} sources
          </div>
        )}
      </div>
    </div>
  );
}
