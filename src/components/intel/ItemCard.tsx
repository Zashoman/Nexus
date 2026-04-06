'use client';

import type { IntelItem, RatingValue } from '@/types/intel';

interface ItemCardProps {
  item: IntelItem;
  isSelected: boolean;
  onClick: () => void;
  currentRating: RatingValue | null;
  onRate: (rating: RatingValue) => void;
  onDismiss: () => void;
}

const IMPACT_COLORS: Record<string, string> = {
  critical: 'text-[#FF4444] bg-[#FF4444]/10',
  high: 'text-[#FF8C00] bg-[#FF8C00]/10',
  medium: 'text-[#4488FF] bg-[#4488FF]/10',
  low: 'text-[#666666] bg-[#666666]/10',
};

const TIER_COLORS: Record<number, string> = {
  1: 'text-[#00CC66]',
  2: 'text-[#4488FF]',
  3: 'text-[#888888]',
};

const TIER_DOT_COLORS: Record<number, string> = {
  1: 'bg-[#00CC66]',
  2: 'bg-[#4488FF]',
  3: 'bg-[#888888]',
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

export default function ItemCard({ item, isSelected, onClick, currentRating, onRate, onDismiss }: ItemCardProps) {
  const impactLevel = item.impact_level || 'low';
  const impactClass = IMPACT_COLORS[impactLevel] || IMPACT_COLORS.low;
  const tierColor = TIER_COLORS[item.source_tier] || TIER_COLORS[3];
  const tierDot = TIER_DOT_COLORS[item.source_tier] || TIER_DOT_COLORS[3];
  const isStarred = currentRating === 'starred';

  const borderColor = isStarred
    ? 'border-l-[#FFD700]'
    : currentRating === 'signal'
    ? 'border-l-[#00CC66]'
    : currentRating === 'noise'
    ? 'border-l-[#333333]'
    : 'border-l-transparent';

  const time = item.published_at || item.ingested_at;
  const timeFormatted = new Date(time).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  async function handleStar(e: React.MouseEvent) {
    e.stopPropagation();
    if (isStarred) {
      // Unstar - rate as signal instead
      onRate('signal');
    } else {
      onRate('starred');
    }
  }

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    onDismiss();
  }

  return (
    <div
      onClick={onClick}
      className={`border-l-2 ${borderColor} px-3 py-2 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-[#1A2332] border-b border-[#1E2A3A]'
          : 'bg-[#141820] border-b border-[#1E2A3A]/50 hover:bg-[#1A2030]'
      } ${currentRating === 'noise' ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${tierDot} flex-shrink-0`} />
        <span className={`text-[10px] font-mono font-bold ${tierColor}`}>
          T{item.source_tier}
        </span>
        <span className="text-[#1E2A3A]">|</span>
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0 rounded-sm ${impactClass}`}>
          {impactLevel.toUpperCase()}
        </span>
        <span className="text-[#1E2A3A]">|</span>
        <span className="text-[10px] font-mono text-[#5A6A7A]">{timeFormatted}</span>
        <span className="text-[10px] font-mono text-[#5A6A7A] ml-auto">{timeAgo(time)}</span>
        <button
          onClick={handleDismiss}
          className="px-1 py-0.5 text-[10px] rounded-sm font-mono text-[#5A6A7A] hover:text-[#FF4444] transition-all cursor-pointer"
          title="Dismiss from feed"
        >
          X
        </button>
      </div>

      <h3 className="text-sm font-medium text-[#E8EAED] leading-tight mb-1 line-clamp-2">
        {item.title}
      </h3>

      {(item.ai_summary || item.summary) && (
        <p className="text-xs text-[#8899AA] leading-relaxed line-clamp-2 mb-1.5">
          {item.ai_summary || item.summary}
        </p>
      )}

      {item.group_source_count && item.group_source_count > 1 && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono text-[#8899AA] bg-[#8899AA]/10 px-1.5 py-0 rounded-sm">
            {item.group_source_count} sources
          </span>
        </div>
      )}
    </div>
  );
}
