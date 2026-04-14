'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { IntelItem, IntelCategory, RatingValue } from '@/types/intel';
import ItemCard from './ItemCard';
import { apiFetch } from '@/lib/api-client';

interface FeedPanelProps {
  category: IntelCategory | 'all';
  selectedItemId: string | null;
  onSelectItem: (item: IntelItem) => void;
}

export default function FeedPanel({
  category,
  selectedItemId,
  onSelectItem,
}: FeedPanelProps) {
  const [items, setItems] = useState<IntelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showFiltered, setShowFiltered] = useState(false);
  const [filteredCount, setFilteredCount] = useState(0);
  // Track ratings centrally so they persist across re-renders
  const [ratings, setRatings] = useState<Record<string, RatingValue>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: '30',
          include_filtered: showFiltered.toString(),
        });
        if (category !== 'all') {
          params.set('category', category);
        }

        const res = await apiFetch(`/api/intel/items?${params}`);
        const data = await res.json();
        const newItems = data.items || [];

        if (append) {
          setItems((prev) => [...prev, ...newItems]);
        } else {
          setItems(newItems);
        }
        setHasMore(newItems.length === 30);

        // Initialize ratings from fetched data
        const newRatings: Record<string, RatingValue> = {};
        for (const item of newItems) {
          if (item.rating) {
            newRatings[item.id] = item.rating;
          }
        }
        if (append) {
          setRatings((prev) => ({ ...prev, ...newRatings }));
        } else {
          setRatings(newRatings);
        }

        if (!showFiltered) {
          const filteredRes = await apiFetch(
            `/api/intel/items?category=${category !== 'all' ? category : ''}&include_filtered=true&limit=1`
          );
          const filteredData = await filteredRes.json();
          const totalWithFiltered = filteredData.total || 0;
          const totalWithout = data.total || 0;
          setFilteredCount(totalWithFiltered - totalWithout);
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    },
    [category, showFiltered]
  );

  useEffect(() => {
    setPage(1);
    fetchItems(1);
  }, [fetchItems]);

  useEffect(() => {
    const interval = setInterval(() => fetchItems(1), 300000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  const [rateFlash, setRateFlash] = useState<string | null>(null);

  async function handleRate(itemId: string, rating: RatingValue) {
    setRatings((prev) => ({ ...prev, [itemId]: rating }));
    try {
      const res = await apiFetch('/api/intel/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, rating }),
      });
      if (res.ok) {
        setRateFlash(itemId);
        setTimeout(() => setRateFlash(null), 1500);
      }
    } catch {
      // silent
    }
  }

  async function handleDismiss(itemId: string) {
    try {
      await apiFetch('/api/intel/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, is_dismissed: true }),
      });
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch {
      // silent
    }
  }

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchItems(nextPage, true);
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto bg-[#0B0E11] min-w-0 lg:max-w-[500px]"
    >
      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <div className="text-[#5A6A7A] text-xs font-mono animate-pulse">
            Loading feed...
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <div className="text-center">
            <p className="text-[#5A6A7A] text-xs font-mono">No items yet</p>
            <p className="text-[#5A6A7A] text-[10px] font-mono mt-1">
              Trigger a fetch cycle to populate the feed
            </p>
          </div>
        </div>
      ) : (
        <>
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              isSelected={item.id === selectedItemId}
              onClick={() => onSelectItem(item)}
              currentRating={ratings[item.id] || null}
              onRate={(rating) => handleRate(item.id, rating)}
              onDismiss={() => handleDismiss(item.id)}
              showRateConfirm={rateFlash === item.id}
            />
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full py-2 text-xs font-mono text-[#5A6A7A] hover:text-[#8899AA] hover:bg-[#141820] transition-colors cursor-pointer"
            >
              {loading ? 'Loading...' : 'Load more'}
            </button>
          )}

          {filteredCount > 0 && !showFiltered && (
            <button
              onClick={() => setShowFiltered(true)}
              className="w-full py-2 text-xs font-mono text-[#5A6A7A] hover:text-[#8899AA] bg-[#0D1117] border-t border-[#1E2A3A] transition-colors cursor-pointer"
            >
              Show {filteredCount} filtered items
            </button>
          )}
          {showFiltered && (
            <button
              onClick={() => setShowFiltered(false)}
              className="w-full py-2 text-xs font-mono text-[#4488FF] hover:text-[#6699FF] bg-[#0D1117] border-t border-[#1E2A3A] transition-colors cursor-pointer"
            >
              Hide filtered items
            </button>
          )}
        </>
      )}
    </div>
  );
}
