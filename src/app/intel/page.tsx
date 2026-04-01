'use client';

import { useState } from 'react';
import type { IntelItem, IntelCategory } from '@/types/intel';
import StatusBar from '@/components/intel/StatusBar';
import CategoryTabs from '@/components/intel/CategoryTabs';
import FeedPanel from '@/components/intel/FeedPanel';
import DetailPanel from '@/components/intel/DetailPanel';
import SynthesisView from '@/components/intel/SynthesisView';
import StockTicker from '@/components/intel/StockTicker';

export default function IntelPage() {
  const [activeTab, setActiveTab] = useState<IntelCategory | 'all' | 'synthesis'>('all');
  const [selectedItem, setSelectedItem] = useState<IntelItem | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  function handleSelectItem(item: IntelItem) {
    setSelectedItem(item);
    setMobileDetailOpen(true);
  }

  const isSynthesis = activeTab === 'synthesis';

  return (
    <div className="flex flex-col h-screen bg-[#0B0E11] text-[#E8EAED]">
      {/* Status Bar */}
      <StatusBar />

      {/* Category Tabs */}
      <CategoryTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {isSynthesis ? (
          <SynthesisView />
        ) : (
          <>
            {/* Feed Panel */}
            <FeedPanel
              category={activeTab === 'all' ? 'all' : activeTab}
              selectedItemId={selectedItem?.id || null}
              onSelectItem={handleSelectItem}
            />

            {/* Detail Panel — desktop */}
            <div className="hidden lg:flex flex-1">
              <DetailPanel item={selectedItem} />
            </div>

            {/* Detail Panel — mobile overlay */}
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

      {/* Stock Ticker */}
      <StockTicker />
    </div>
  );
}
