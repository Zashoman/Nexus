'use client';

import { useEffect, useState, useRef } from 'react';
import type { IntelItem, RatingValue } from '@/types/intel';
import RatingButtons from '@/components/intel/RatingButtons';

interface DroneDetailPanelProps {
  item: IntelItem | null;
  onClose?: () => void;
}

const TIER_LABELS: Record<number, string> = {
  1: 'Primary Source',
  2: 'Quality Press',
  3: 'Commentary',
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
  return raw.split('\n').filter((l: string) => l.trim().startsWith('-')).map((l: string) => l.trim().replace(/^- /, ''));
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
            {extractBullets(pointsMatch[1]).map((point: string, i: number) => (
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
            {extractBullets(dataMatch[1]).map((point: string, i: number) => (
              <li key={i} className="text-[13px] text-[#8899AA] leading-relaxed flex gap-2">
                <span className="text-[#5A6A7A] font-mono flex-shrink-0">{i + 1}.</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {relevanceMatch && (
        <div className="bg-[#FF8C00]/5 border-l-2 border-[#FF8C00]/30 px-3 py-2">
          <h5 className="text-[11px] font-mono text-[#FF8C00] uppercase tracking-wider mb-1">Relevance to You</h5>
          <p className="text-[13px] text-[#E8EAED]/80 leading-relaxed">{relevanceMatch[1].trim()}</p>
        </div>
      )}
    </div>
  );
}

export default function DroneDetailPanel({ item, onClose }: DroneDetailPanelProps) {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const currentItemIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!item) return;
    const targetId = item.id;
    currentItemIdRef.current = targetId;
    setFeedback('');
    setAiSummary(item.ai_summary || null);

    if (!item.ai_summary) {
      setSummaryLoading(true);
      fetch('/api/intel/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: targetId }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.summary && currentItemIdRef.current === targetId) {
            setAiSummary(data.summary);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (currentItemIdRef.current === targetId) setSummaryLoading(false);
        });
    }
  }, [item?.id]);

  if (!item) {
    return (
      <div className="flex-1 bg-[#141820] flex items-center justify-center">
        <p className="text-[#5A6A7A] text-sm font-mono">Select an article to view details</p>
      </div>
    );
  }

  const tierLabel = TIER_LABELS[item.source_tier] || 'Source';
  const published = item.published_at || item.ingested_at;

  return (
    <div className="flex-1 bg-[#141820] overflow-y-auto border-l border-[#1E2A3A]">
      {onClose && (
        <button onClick={onClose} className="lg:hidden absolute top-2 right-2 text-[#5A6A7A] hover:text-[#E8EAED] text-lg px-2 cursor-pointer">
          ✕
        </button>
      )}

      <div className="p-4 space-y-4">
        <h2 className="text-lg font-semibold text-[#E8EAED] leading-tight">{item.title}</h2>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-[#8899AA]">{item.source_name}</span>
          <span className="text-[#FF8C00]">T{item.source_tier} {tierLabel}</span>
          <span className="text-[#5A6A7A]">{timeAgo(published)}</span>
        </div>

        <div className="space-y-1">
          <h4 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider">Intelligence Briefing</h4>
          {summaryLoading ? (
            <div className="space-y-2 py-2">
              <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-3/4" />
              <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-full" />
              <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-2/3" />
            </div>
          ) : aiSummary ? (
            renderStructuredSummary(aiSummary)
          ) : item.summary ? (
            <p className="text-[13px] text-[#E8EAED]/90 leading-relaxed">{item.summary}</p>
          ) : (
            <p className="text-[13px] text-[#5A6A7A]">No briefing available</p>
          )}
        </div>

        <a href={item.original_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-mono text-[#FF8C00] hover:text-[#FFaa33] transition-colors">
          Open Source →
        </a>

        <div className="pt-2 border-t border-[#1E2A3A]">
          <h4 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-2">Rate This Item</h4>
          <RatingButtons itemId={item.id} currentRating={item.rating as RatingValue | undefined} size="lg" />
        </div>

        <div className="space-y-1">
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Quick note — why did you rate this way?"
            className="w-full bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1.5 text-[13px] text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#FF8C00]"
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && feedback.trim()) {
                await fetch('/api/intel/rate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ item_id: item.id, rating: 'signal', feedback_note: feedback }),
                });
                setFeedback('');
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
