'use client';

import { useState } from 'react';

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
}

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

function renderFullSummary(text: string) {
  const overviewMatch = text.match(/OVERVIEW:\s*([^\n]+(?:\n(?!KEY ARGUMENTS:)[^\n]+)*)/);
  const argsMatch = text.match(/KEY ARGUMENTS:\s*\n((?:- [^\n]+\n?)+)/);
  const detailedMatch = text.match(/DETAILED SUMMARY:\s*([^\n]+(?:\n(?!NOTABLE QUOTES|BOTTOM LINE)[^\n]+)*)/);
  const quotesMatch = text.match(/NOTABLE QUOTES\/CLAIMS:\s*\n((?:- [^\n]+\n?)+)/);
  const bottomMatch = text.match(/BOTTOM LINE:\s*([^\n]+(?:\n(?!$)[^\n]+)*)/);

  if (!overviewMatch) {
    return <p className="text-[13px] text-[#E8EAED]/90 leading-relaxed whitespace-pre-wrap">{text}</p>;
  }

  return (
    <div className="space-y-4">
      {overviewMatch && (
        <div>
          <h5 className="text-[11px] font-mono text-[#FF4444] uppercase tracking-wider mb-1.5">Overview</h5>
          <p className="text-[13px] text-[#E8EAED]/90 leading-relaxed">{overviewMatch[1].trim()}</p>
        </div>
      )}
      {argsMatch && (
        <div>
          <h5 className="text-[11px] font-mono text-[#4488FF] uppercase tracking-wider mb-1.5">Key Arguments</h5>
          <ul className="space-y-1">
            {extractBullets(argsMatch[1]).map((point: string, i: number) => (
              <li key={i} className="text-[13px] text-[#E8EAED]/80 leading-relaxed flex gap-2">
                <span className="text-[#4488FF] flex-shrink-0">&#8250;</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {detailedMatch && (
        <div>
          <h5 className="text-[11px] font-mono text-[#FF8C00] uppercase tracking-wider mb-1.5">Detailed Summary</h5>
          <p className="text-[13px] text-[#E8EAED]/90 leading-relaxed">{detailedMatch[1].trim()}</p>
        </div>
      )}
      {quotesMatch && (
        <div>
          <h5 className="text-[11px] font-mono text-[#8899AA] uppercase tracking-wider mb-1.5">Notable Claims</h5>
          <ul className="space-y-1">
            {extractBullets(quotesMatch[1]).map((point: string, i: number) => (
              <li key={i} className="text-[13px] text-[#8899AA] leading-relaxed flex gap-2">
                <span className="text-[#5A6A7A] font-mono flex-shrink-0">{i + 1}.</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {bottomMatch && (
        <div className="bg-[#FF4444]/5 border-l-2 border-[#FF4444]/30 px-3 py-2">
          <h5 className="text-[11px] font-mono text-[#FF4444] uppercase tracking-wider mb-1">Bottom Line</h5>
          <p className="text-[13px] text-[#E8EAED]/80 leading-relaxed">{bottomMatch[1].trim()}</p>
        </div>
      )}
    </div>
  );
}

export default function VideoDetailPanel({ video, onClose }: VideoDetailPanelProps) {
  const [miniSummary, setMiniSummary] = useState<string | null>(null);
  const [fullSummary, setFullSummary] = useState<string | null>(null);
  const [miniLoading, setMiniLoading] = useState(false);
  const [fullLoading, setFullLoading] = useState(false);

  // Reset when video changes
  if (video && miniSummary === null && video.mini_summary) {
    setMiniSummary(video.mini_summary);
  }
  if (video && fullSummary === null && video.full_summary) {
    setFullSummary(video.full_summary);
  }

  async function generateMini() {
    if (!video || miniLoading) return;
    setMiniLoading(true);
    try {
      const res = await fetch('/api/youtube/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: video.video_id, mode: 'mini' }),
      });
      const data = await res.json();
      if (data.summary) setMiniSummary(data.summary);
    } catch { /* silent */ }
    finally { setMiniLoading(false); }
  }

  async function generateFull() {
    if (!video || fullLoading) return;
    setFullLoading(true);
    try {
      const res = await fetch('/api/youtube/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: video.video_id, mode: 'full' }),
      });
      const data = await res.json();
      if (data.summary) setFullSummary(data.summary);
    } catch { /* silent */ }
    finally { setFullLoading(false); }
  }

  if (!video) {
    return (
      <div className="flex-1 bg-[#141820] flex items-center justify-center">
        <p className="text-[#5A6A7A] text-sm font-mono">Select a video to view details</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#141820] overflow-y-auto border-l border-[#1E2A3A]">
      {onClose && (
        <button onClick={onClose} className="lg:hidden absolute top-2 right-2 text-[#5A6A7A] hover:text-[#E8EAED] text-lg px-2 cursor-pointer">&#10005;</button>
      )}

      <div className="p-4 space-y-4">
        {/* Title */}
        <h2 className="text-lg font-semibold text-[#E8EAED] leading-tight">{video.title}</h2>

        {/* Meta + small thumbnail row */}
        <div className="flex items-start gap-3">
          {video.thumbnail_url && (
            <div className="flex-shrink-0 w-[140px] h-[79px] bg-[#0B0E11] rounded-sm overflow-hidden">
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
              &#9654; Watch on YouTube
            </a>
          </div>
        </div>

        {/* Mini Summary */}
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
            <p className="text-[13px] text-[#E8EAED]/90 leading-relaxed">{miniSummary}</p>
          ) : (
            <p className="text-[11px] text-[#5A6A7A]">Click Generate for a quick 2-3 sentence summary</p>
          )}
        </div>

        {/* Full Summary */}
        <div className="space-y-1 pt-2 border-t border-[#1E2A3A]">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider">Full Analysis (600-800 words)</h4>
            {!fullSummary && !fullLoading && (
              <button onClick={generateFull} className="text-[10px] font-mono text-[#FF8C00] hover:text-[#FFaa33] cursor-pointer">
                Summarize Full Video
              </button>
            )}
          </div>
          {fullLoading ? (
            <div className="space-y-2 py-2">
              <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-full" />
              <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-5/6" />
              <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-full" />
              <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-4/5" />
              <div className="h-3 bg-[#1E2A3A] rounded animate-pulse w-full" />
              <p className="text-[10px] font-mono text-[#5A6A7A] animate-pulse mt-2">Analyzing transcript...</p>
            </div>
          ) : fullSummary ? (
            renderFullSummary(fullSummary)
          ) : (
            <p className="text-[11px] text-[#5A6A7A]">Click to generate a detailed 600-800 word analysis of this video</p>
          )}
        </div>

        {/* Description */}
        {video.description && (
          <div className="pt-2 border-t border-[#1E2A3A]">
            <h4 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-1">Description</h4>
            <p className="text-[11px] text-[#5A6A7A] leading-relaxed whitespace-pre-wrap line-clamp-6">{video.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
