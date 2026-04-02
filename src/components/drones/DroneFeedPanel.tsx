'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { IntelItem, RatingValue } from '@/types/intel';
import DroneItemCard from './DroneItemCard';

interface DroneFeedPanelProps {
  subcategory: string;
  selectedItemId: string | null;
  onSelectItem: (item: IntelItem) => void;
}

// Map sub-tabs to subcategory values in the database
const SUBCATEGORY_MAP: Record<string, string[]> = {
  all: [],
  combat: ['combat', 'military'],
  counter_uas: ['counter_uas', 'defense'],
  commercial: ['commercial', 'industry'],
  funding: ['funding', 'procurement', 'finance'],
  policy: ['policy', 'legal'],
};

export default function DroneFeedPanel({
  subcategory,
  selectedItemId,
  onSelectItem,
}: DroneFeedPanelProps) {
  const [items, setItems] = useState<IntelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [ratings, setRatings] = useState<Record<string, RatingValue>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: '30',
          category: 'drones_autonomous',
        });

        const res = await fetch(`/api/intel/items?${params}`);
        const data = await res.json();
        let newItems: IntelItem[] = data.items || [];

        // Client-side subcategory filter
        const subs = SUBCATEGORY_MAP[subcategory];
        if (subs && subs.length > 0) {
          newItems = newItems.filter((item: IntelItem) => {
            const itemSub = (item.subcategories || []).map((s: string) => s.toLowerCase());
            const titleLower = item.title.toLowerCase();
            const summaryLower = (item.summary || '').toLowerCase();
            const text = `${titleLower} ${summaryLower}`;
            return subs.some((s: string) => itemSub.includes(s) || text.includes(s));
          });
        }

        if (append) {
          setItems((prev) => [...prev, ...newItems]);
        } else {
          setItems(newItems);
        }
        setHasMore(newItems.length >= 10);

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
      } catch {
        // Silent
      } finally {
        setLoading(false);
      }
    },
    [subcategory]
  );

  useEffect(() => {
    setPage(1);
    fetchItems(1);
  }, [fetchItems]);

  useEffect(() => {
    const interval = setInterval(() => fetchItems(1), 300000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  function handleRate(itemId: string, rating: RatingValue) {
    setRatings((prev) => ({ ...prev, [itemId]: rating }));
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
            Loading drone intel...
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <div className="text-center">
            <p className="text-[#5A6A7A] text-xs font-mono">No drone articles yet</p>
            <p className="text-[#5A6A7A] text-[10px] font-mono mt-1">
              Articles will appear after the next fetch cycle
            </p>
          </div>
        </div>
      ) : (
        <>
          {items.map((item) => (
            <DroneItemCard
              key={item.id}
              item={item}
              isSelected={item.id === selectedItemId}
              onClick={() => onSelectItem(item)}
              currentRating={ratings[item.id] || null}
              onRate={(rating) => handleRate(item.id, rating)}
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
        </>
      )}
    </div>
  );
}
