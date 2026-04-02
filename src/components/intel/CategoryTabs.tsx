'use client';

import type { IntelCategory } from '@/types/intel';

type TabKey = IntelCategory | 'all' | 'synthesis' | 'portfolio';

interface CategoryTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'frontier_models', label: 'Frontier' },
  { key: 'infrastructure_compute', label: 'Infrastructure' },
  { key: 'robotics_physical_ai', label: 'Robotics' },
  { key: 'health_bio_ai', label: 'Health' },
  { key: 'cybersecurity_ai', label: 'Cyber' },
  { key: 'regulation_policy', label: 'Regulation' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'synthesis', label: 'Synthesis' },
];

export default function CategoryTabs({ activeTab, onTabChange }: CategoryTabsProps) {
  return (
    <div className="flex items-center gap-0 border-b border-[#1E2A3A] bg-[#0D1117] overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`px-4 py-2 text-xs font-mono whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            activeTab === tab.key
              ? 'border-[#4488FF] text-[#E8EAED] bg-[#141820]'
              : 'border-transparent text-[#5A6A7A] hover:text-[#8899AA] hover:bg-[#141820]/50'
          } ${tab.key === 'synthesis' ? 'text-[#FFD700]' : ''} ${tab.key === 'portfolio' ? 'ml-auto text-[#00CC66]' : ''}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
