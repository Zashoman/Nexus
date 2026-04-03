"use client";

interface TelegramTabsProps {
  activeTab: string;
  categories: string[];
  onTabChange: (tab: string) => void;
}

export default function TelegramTabs({ activeTab, categories, onTabChange }: TelegramTabsProps) {
  const tabs = ["all", ...categories];

  return (
    <div className="flex items-center gap-0 border-b border-[#1E2A3A] bg-[#0D1117] overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`px-4 py-2 text-xs font-mono whitespace-nowrap border-b-2 transition-colors cursor-pointer capitalize ${
            activeTab === tab
              ? "border-[#29B6F6] text-[#E8EAED] bg-[#141820]"
              : "border-transparent text-[#5A6A7A] hover:text-[#8899AA] hover:bg-[#141820]/50"
          }`}
        >
          {tab === "all" ? "All Channels" : tab}
        </button>
      ))}
    </div>
  );
}
