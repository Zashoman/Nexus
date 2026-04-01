'use client';

import { useState, useEffect } from 'react';
import type { RatingValue } from '@/types/intel';

interface RatingButtonsProps {
  itemId: string;
  currentRating?: RatingValue | null;
  size?: 'sm' | 'lg';
  onRate?: (rating: RatingValue) => void;
}

export default function RatingButtons({
  itemId,
  currentRating,
  size = 'sm',
  onRate,
}: RatingButtonsProps) {
  const [rating, setRating] = useState<RatingValue | null>(currentRating || null);
  const [loading, setLoading] = useState(false);

  // Sync with prop when itemId changes
  useEffect(() => {
    setRating(currentRating || null);
  }, [itemId, currentRating]);

  async function handleRate(value: RatingValue) {
    if (loading) return;

    const newRating = rating === value ? null : value;
    setLoading(true);

    try {
      if (newRating) {
        const res = await fetch('/api/intel/rate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_id: itemId, rating: newRating }),
        });
        if (res.ok) {
          setRating(newRating);
          onRate?.(newRating);
        }
      } else {
        setRating(null);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }

  const btnClass = size === 'sm'
    ? 'px-1.5 py-0.5 text-[10px]'
    : 'px-3 py-1.5 text-xs';

  return (
    <div
      className="flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => handleRate('signal')}
        disabled={loading}
        className={`${btnClass} rounded-sm font-mono transition-all cursor-pointer ${
          rating === 'signal'
            ? 'bg-[#00CC66]/20 text-[#00CC66] ring-1 ring-[#00CC66]/50'
            : 'text-[#5A6A7A] hover:text-[#00CC66] hover:bg-[#00CC66]/10'
        }`}
        title="Signal — this is relevant"
      >
        ✓
      </button>
      <button
        onClick={() => handleRate('noise')}
        disabled={loading}
        className={`${btnClass} rounded-sm font-mono transition-all cursor-pointer ${
          rating === 'noise'
            ? 'bg-[#CC3333]/20 text-[#CC3333] ring-1 ring-[#CC3333]/50'
            : 'text-[#5A6A7A] hover:text-[#CC3333] hover:bg-[#CC3333]/10'
        }`}
        title="Noise — not relevant"
      >
        ✗
      </button>
      <button
        onClick={() => handleRate('starred')}
        disabled={loading}
        className={`${btnClass} rounded-sm font-mono transition-all cursor-pointer ${
          rating === 'starred'
            ? 'bg-[#FFD700]/20 text-[#FFD700] ring-1 ring-[#FFD700]/50'
            : 'text-[#5A6A7A] hover:text-[#FFD700] hover:bg-[#FFD700]/10'
        }`}
        title="Star — important, save this"
      >
        ★
      </button>
    </div>
  );
}
