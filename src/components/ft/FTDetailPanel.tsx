"use client";

import React, { useEffect, useState } from "react";
import type { IntelItem, RatingValue } from "@/types/intel";
import { apiFetch } from "@/lib/api-client";

interface FTDetailPanelProps {
  item: IntelItem | null;
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

export default function FTDetailPanel({ item, onClose }: FTDetailPanelProps) {
  const [isStarred, setIsStarred] = useState(false);

  useEffect(() => {
    if (!item) return;
    setIsStarred(item.rating === "starred");
  }, [item?.id]);

  if (!item) {
    return (
      <div className="flex-1 bg-[#141820] flex items-center justify-center">
        <p className="text-[#5A6A7A] text-sm font-mono">Select an article to view details</p>
      </div>
    );
  }

  const published = item.published_at || item.ingested_at;
  const author = (item.metadata as Record<string, unknown>)?.author as string | undefined;

  return (
    <div className="flex-1 bg-[#141820] overflow-y-auto border-l border-[#1E2A3A]">
      {onClose && (
        <button onClick={onClose} className="lg:hidden absolute top-2 right-2 text-[#5A6A7A] hover:text-[#E8EAED] text-lg px-2 cursor-pointer">
          X
        </button>
      )}

      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-[#E8EAED] leading-tight">{item.title}</h2>
          <button
            onClick={async () => {
              const newStarred = !isStarred;
              setIsStarred(newStarred);
              await apiFetch("/api/intel/rate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ item_id: item.id, rating: newStarred ? "starred" : "signal" }),
              });
            }}
            className={`flex-shrink-0 px-1.5 py-0.5 text-sm cursor-pointer transition-all ${
              isStarred ? "text-[#FFD700]" : "text-[#5A6A7A] hover:text-[#FFD700]"
            }`}
            title={isStarred ? "Starred for weekly synthesis" : "Star for weekly synthesis"}
          >
            {isStarred ? "\u2605" : "\u2606"}
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-[#FCD0B1] font-bold bg-[#FCD0B1]/10 px-1.5 py-0.5 rounded-sm">FT</span>
          <span className="text-[#00CC66]">Tier 1</span>
          {author && <span className="text-[#8899AA]">{author}</span>}
          <span className="text-[#5A6A7A]">{timeAgo(published)}</span>
        </div>

        {item.summary && (
          <div className="space-y-1">
            <h4 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider">Excerpt</h4>
            <p className="text-[13px] text-[#E8EAED]/90 leading-relaxed">{item.summary}</p>
          </div>
        )}

        {item.ai_summary && item.ai_summary !== item.summary && (
          <div className="space-y-1">
            <h4 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider">AI Summary</h4>
            <p className="text-[13px] text-[#E8EAED]/90 leading-relaxed">{item.ai_summary}</p>
          </div>
        )}

        {item.subcategories && item.subcategories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.subcategories.map((sub: string) => (
              <span key={sub} className="text-[9px] font-mono text-[#FCD0B1]/60 bg-[#FCD0B1]/5 px-1.5 py-0 rounded-sm">
                {sub}
              </span>
            ))}
          </div>
        )}

        <a
          href={item.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 w-full justify-center py-2.5 text-sm font-mono font-semibold text-[#0B0E11] rounded cursor-pointer transition-all duration-200 bg-[#FCD0B1] hover:bg-[#FDDCC4] active:bg-[#ECC0A1]"
        >
          Read Full Article on FT
        </a>
      </div>
    </div>
  );
}
