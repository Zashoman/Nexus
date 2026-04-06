"use client";

import type { IntelItem } from "@/types/intel";

interface FTItemCardProps {
  item: IntelItem;
  isSelected: boolean;
  onClick: () => void;
  onDismiss: () => void;
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

export default function FTItemCard({ item, isSelected, onClick, onDismiss }: FTItemCardProps) {
  const time = item.published_at || item.ingested_at;

  function handleClick() {
    // Open FT article directly in new tab
    if (item.original_url) {
      window.open(item.original_url, '_blank', 'noopener');
    } else {
      onClick();
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`px-3 py-2 cursor-pointer transition-colors border-b ${
        isSelected
          ? "bg-[#1A2332] border-[#1E2A3A]"
          : "bg-[#141820] border-[#1E2A3A]/50 hover:bg-[#1A2030]"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-mono font-bold text-[#FCD0B1] bg-[#FCD0B1]/10 px-1.5 py-0 rounded-sm">FT</span>
        <span className="text-[10px] font-mono text-[#00CC66] font-bold">T1</span>
        <span className="text-[10px] font-mono text-[#5A6A7A] capitalize">{item.category}</span>
        <span className="text-[10px] font-mono text-[#5A6A7A] ml-auto">{timeAgo(time)}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          className="text-[#5A6A7A] hover:text-[#FF4444] text-[10px] cursor-pointer ml-1"
          title="Dismiss"
        >X</button>
      </div>

      <h3 className="text-sm font-medium text-[#E8EAED] leading-tight mb-1 line-clamp-2">
        {item.title}
      </h3>

      {(item.ai_summary || item.summary) && (
        <p className="text-xs text-[#8899AA] leading-relaxed line-clamp-2">
          {item.ai_summary || item.summary}
        </p>
      )}
    </div>
  );
}
