'use client';

import { useState } from 'react';
import type { IntelItem } from '@/types/intel';
import DroneTabs from '@/components/drones/DroneTabs';
import DroneFeedPanel from '@/components/drones/DroneFeedPanel';
import DroneDetailPanel from '@/components/drones/DroneDetailPanel';

export default function DronesPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedItem, setSelectedItem] = useState<IntelItem | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  function handleSelectItem(item: IntelItem) {
    setSelectedItem(item);
    setMobileDetailOpen(true);
  }

  return (
    <div className="flex flex-col h-screen bg-[#0B0E11] text-[#E8EAED]">
      {/* Header */}
      <div className="border-b border-[#1E2A3A] bg-[#0D1117] px-4 py-1.5 flex items-center gap-3">
        <h1 className="text-xs font-mono text-[#FF8C00] font-bold uppercase tracking-wider">Drones & Autonomous Systems</h1>
        <span className="text-[10px] font-mono text-[#5A6A7A]">Combat / Counter-UAS / Commercial / Policy</span>
      </div>

      {/* Sub-tabs */}
      <DroneTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <DroneFeedPanel
          subcategory={activeTab}
          selectedItemId={selectedItem?.id || null}
          onSelectItem={handleSelectItem}
        />
        <div className="hidden lg:flex flex-1">
          <DroneDetailPanel item={selectedItem} />
        </div>
        {mobileDetailOpen && selectedItem && (
          <div className="fixed inset-0 z-40 bg-[#0B0E11] lg:hidden overflow-y-auto">
            <DroneDetailPanel
              item={selectedItem}
              onClose={() => setMobileDetailOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
