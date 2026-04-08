'use client';

interface YouTubeTabsProps {
  activeTab: string;
  categories: string[];
  onTabChange: (tab: string) => void;
}

export default function YouTubeTabs({ activeTab, categories, onTabChange }: YouTubeTabsProps) {
  const tabs = ['all', ...categories];

  return (
    <div className="flex items-center gap-0 border-b border-[#1E2A3A] bg-[#0D1117] overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`px-4 py-2 text-xs font-mono whitespace-nowrap border-b-2 transition-colors cursor-pointer capitalize ${
            activeTab === tab
              ? 'border-[#FF4444] text-[#E8EAED] bg-[#141820]'
              : 'border-transparent text-[#5A6A7A] hover:text-[#8899AA] hover:bg-[#141820]/50'
          }`}
        >
          {tab === 'all' ? 'All Channels' : tab === 'ai' ? 'AI' : tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  );
}
