'use client';

interface DroneTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'combat', label: 'Combat Systems' },
  { key: 'counter_uas', label: 'Counter-UAS' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'funding', label: 'Funding & Business' },
  { key: 'policy', label: 'Policy' },
];

export default function DroneTabs({ activeTab, onTabChange }: DroneTabsProps) {
  return (
    <div className="flex items-center gap-0 border-b border-[#1E2A3A] bg-[#0D1117] overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`px-4 py-2 text-xs font-mono whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            activeTab === tab.key
              ? 'border-[#FF8C00] text-[#E8EAED] bg-[#141820]'
              : 'border-transparent text-[#5A6A7A] hover:text-[#8899AA] hover:bg-[#141820]/50'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
