'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { IntelItem, IntelCategory } from '@/types/intel';
import StatusBar from '@/components/intel/StatusBar';
import CategoryTabs from '@/components/intel/CategoryTabs';
import FeedPanel from '@/components/intel/FeedPanel';
import DetailPanel from '@/components/intel/DetailPanel';
import SynthesisView from '@/components/intel/SynthesisView';
import PortfolioView from '@/components/intel/PortfolioView';
import StockTicker from '@/components/intel/StockTicker';

type TabKey = IntelCategory | 'all' | 'synthesis' | 'portfolio';

export default function IntelPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabKey) || 'all';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [selectedItem, setSelectedItem] = useState<IntelItem | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab') as TabKey;
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  function handleSelectItem(item: IntelItem) {
    setSelectedItem(item);
    setMobileDetailOpen(true);
  }

  const isSynthesis = activeTab === 'synthesis';
  const isPortfolio = activeTab === 'portfolio';

  return (
    <div className="flex flex-col h-screen bg-[#0B0E11] text-[#E8EAED]">
      <StatusBar />
      <CategoryTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 flex overflow-hidden">
        {isPortfolio ? (
          <PortfolioView />
        ) : isSynthesis ? (
          <SynthesisView />
        ) : (
          <>
            <FeedPanel
              category={activeTab === 'all' ? 'all' : activeTab as IntelCategory}
              selectedItemId={selectedItem?.id || null}
              onSelectItem={handleSelectItem}
            />
            <div className="hidden lg:flex flex-1">
              <DetailPanel item={selectedItem} />
            </div>
            {mobileDetailOpen && selectedItem && (
              <div className="fixed inset-0 z-40 bg-[#0B0E11] lg:hidden overflow-y-auto">
                <DetailPanel
                  item={selectedItem}
                  onClose={() => setMobileDetailOpen(false)}
                />
              </div>
            )}
          </>
        )}
      </div>

      <StockTicker />
    </div>
  );
}
