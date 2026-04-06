"use client";

import { useState, useEffect, useCallback } from "react";
import type { IntelItem } from "@/types/intel";
import FTTabs from "@/components/ft/FTTabs";
import FTItemCard from "@/components/ft/FTItemCard";
import FTDetailPanel from "@/components/ft/FTDetailPanel";

export default function FTPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [items, setItems] = useState<IntelItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<IntelItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Map tabs to FT source name fragments for filtering
  const TAB_SOURCE_MAP: Record<string, string[]> = {
    all: [],
    markets: ["Markets"],
    energy: ["Energy"],
    commodities: ["Commodities"],
    technology: ["Technology"],
    ai: ["AI", "Artificial Intelligence"],
    macro: ["Global Economy", "Emerging Markets"],
    geopolitics: ["Middle East", "US", "China"],
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      const res = await fetch(`/api/intel/items?${params}`);
      const data = await res.json();
      // Filter to only FT items
      let ftItems = (data.items || []).filter((item: IntelItem) =>
        item.source_name.startsWith("Financial Times")
      );
      // Apply tab filter by source name
      const sourceFragments = TAB_SOURCE_MAP[activeTab];
      if (sourceFragments && sourceFragments.length > 0) {
        ftItems = ftItems.filter((item: IntelItem) =>
          sourceFragments.some((frag: string) => item.source_name.includes(frag))
        );
      }
      setItems(ftItems);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function handleSelectItem(item: IntelItem) {
    setSelectedItem(item);
    setMobileDetailOpen(true);
  }

  async function handleDismiss(itemId: string) {
    try {
      await fetch("/api/intel/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, is_dismissed: true }),
      });
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch {
      // silent
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#0B0E11] text-[#E8EAED]">
      <div className="border-b border-[#1E2A3A] bg-[#0D1117] px-4 py-1.5 flex items-center gap-3">
        <span className="text-[10px] font-mono font-bold text-[#FCD0B1] bg-[#FCD0B1]/10 px-2 py-0.5 rounded-sm">FT</span>
        <h1 className="text-xs font-mono text-[#FCD0B1] font-bold uppercase tracking-wider">Financial Times</h1>
        <span className="text-[10px] font-mono text-[#5A6A7A]">{items.length} articles</span>
      </div>

      <FTTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-[#0B0E11] min-w-0 lg:max-w-[500px]">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-[#5A6A7A] text-xs font-mono animate-pulse">Loading FT articles...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-center">
                <p className="text-[#5A6A7A] text-xs font-mono">No FT articles yet</p>
                <p className="text-[#5A6A7A] text-[10px] font-mono mt-1">Articles will appear after the next fetch cycle</p>
              </div>
            </div>
          ) : (
            items.map((item) => (
              <FTItemCard
                key={item.id}
                item={item}
                isSelected={selectedItem?.id === item.id}
                onClick={() => handleSelectItem(item)}
                onDismiss={() => handleDismiss(item.id)}
              />
            ))
          )}
        </div>

        <div className="hidden lg:flex flex-1">
          <FTDetailPanel item={selectedItem} />
        </div>

        {mobileDetailOpen && selectedItem && (
          <div className="fixed inset-0 z-40 bg-[#0B0E11] lg:hidden overflow-y-auto">
            <FTDetailPanel
              item={selectedItem}
              onClose={() => setMobileDetailOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
