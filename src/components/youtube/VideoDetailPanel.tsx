"use client";

import React, { useState, useEffect } from "react";

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
  if (mins < 60) return mins + "m ago";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.floor(hours / 24);
  return days + "d ago";
}

export default function VideoDetailPanel({ video, onClose }: VideoDetailPanelProps) {
  const [miniSummary, setMiniSummary] = useState<string | null>(null);
  const [fullSummary, setFullSummary] = useState<string | null>(null);
  const [miniLoading, setMiniLoading] = useState(false);
  const [fullLoading, setFullLoading] = useState(false);

  useEffect(() => {
    if (!video) return;
    setMiniSummary(video.mini_summary || null);
    setFullSummary(video.full_summary || null);
  }, [video?.video_id]);

  async function generateMini() {
    if (!video || miniLoading) return;
    setMiniLoading(true);
    try {
      const res = await fetch("/api/youtube/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: video.video_id, mode: "mini" }),
      });
      const data = await res.json();
      if (data.summary) setMiniSummary(data.summary);
    } catch {
      // silent
    } finally {
      setMiniLoading(false);
    }
  }

  async function generateFull() {
    if (!video || fullLoading) return;
    setFullLoading(true);
    try {
      const res = await fetch("/api/youtube/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: video.video_id, mode: "full" }),
      });
      const data = await res.json();
      if (data.summary) setFullSummary(data.summary);
    } catch {
      // silent
    } finally {
      setFullLoading(false);
    }
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
        <button onClick={onClose} className="lg:hidden absolute top-2 right-2 text-[#5A6A7A] hover:text-[#E8EAED] text-lg px-2 cursor-pointer">
          X
        </button>
      )}

      <div className="p-4 space-y-4">
        <h2 className="text-lg font-semibold text-[#E8EAED] leading-tight">{video.title}</h2>

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
              Watch on YouTube
            </a>
          </div>
        </div>

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
            <p className="text-[11px] text-[#5A6A7A]">Click Generate for a quick summary</p>
          )}
        </div>

        <div className="space-y-2 pt-3 border-t border-[#1E2A3A]">
          {!fullSummary && !fullLoading && (
            <button
              onClick={generateFull}
              className="w-full py-3 text-sm font-mono font-bold text-[#E8EAED] rounded-sm cursor-pointer transition-all bg-gradient-to-r from-[#FF8C00] via-[#FF4444] to-[#FF8C00] hover:from-[#FF4444] hover:via-[#FF8C00] hover:to-[#FF4444]"
            >
              DEEP ANALYSIS - Full Video Synthesis
            </button>
          )}
          {fullLoading && (
            <div className="bg-[#141820] border border-[#FF8C00]/20 rounded-sm p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#FF8C00] rounded-full animate-pulse" />
                <p className="text-[11px] font-mono text-[#FF8C00]">Analyzing full transcript...</p>
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
          {fullSummary && (
            <div>
              <h4 className="text-[11px] font-mono text-[#FF8C00] uppercase tracking-wider mb-3">Deep Analysis</h4>
              <div className="text-[13px] text-[#E8EAED]/90 leading-relaxed whitespace-pre-wrap">
                {fullSummary}
              </div>
            </div>
          )}
        </div>

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
