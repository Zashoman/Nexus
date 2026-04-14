'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  Signal,
  Company,
  Source,
  MediaContact,
  PitchAngle,
  StatsResponse,
} from '@/types/robox-intel';
import { Header } from '@/components/robox-intel/Header';
import { ActionBar } from '@/components/robox-intel/ActionBar';
import { Briefing } from '@/components/robox-intel/Briefing';
import { SignalsTab } from '@/components/robox-intel/SignalsTab';
import { CompaniesTab } from '@/components/robox-intel/CompaniesTab';
import { SourcesTab } from '@/components/robox-intel/SourcesTab';
import { MediaTab } from '@/components/robox-intel/MediaTab';
import { QuickAddModal } from '@/components/robox-intel/QuickAddModal';

type Tab = 'signals' | 'companies' | 'sources' | 'media';

export default function RoboXIntelPage() {
  const [activeTab, setActiveTab] = useState<Tab>('signals');
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const [signals, setSignals] = useState<Signal[]>([]);
  const [briefing, setBriefing] = useState<Signal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [mediaContacts, setMediaContacts] = useState<MediaContact[]>([]);
  const [pitches, setPitches] = useState<PitchAngle[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSignals = useCallback(async () => {
    const res = await fetch('/api/robox-intel/signals?limit=200');
    const data = await res.json();
    setSignals(data.signals || []);
  }, []);

  const loadBriefing = useCallback(async () => {
    const res = await fetch('/api/robox-intel/briefing');
    const data = await res.json();
    setBriefing(data.signals || []);
  }, []);

  const loadCompanies = useCallback(async () => {
    const res = await fetch('/api/robox-intel/companies');
    const data = await res.json();
    setCompanies(data.companies || []);
  }, []);

  const loadSources = useCallback(async () => {
    const res = await fetch('/api/robox-intel/sources');
    const data = await res.json();
    setSources(data.sources || []);
  }, []);

  const loadMedia = useCallback(async () => {
    const [cRes, pRes] = await Promise.all([
      fetch('/api/robox-intel/media/contacts'),
      fetch('/api/robox-intel/media/pitches'),
    ]);
    const cData = await cRes.json();
    const pData = await pRes.json();
    setMediaContacts(cData.contacts || []);
    setPitches(pData.pitches || []);
  }, []);

  const loadStats = useCallback(async () => {
    const res = await fetch('/api/robox-intel/stats');
    const data = await res.json();
    setStats(data);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadSignals(),
      loadBriefing(),
      loadCompanies(),
      loadSources(),
      loadMedia(),
      loadStats(),
    ]);
    setLoading(false);
  }, [loadSignals, loadBriefing, loadCompanies, loadSources, loadMedia, loadStats]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleBriefingClick = (signal: Signal) => {
    setActiveTab('signals');
    setHighlightId(signal.id);
    // Clear highlight after scroll
    setTimeout(() => setHighlightId(null), 1500);
  };

  const handleSignalsUpdate = () => {
    loadSignals();
    loadBriefing();
    loadStats();
  };

  // Last scan time = most recent last_fetched across sources
  const lastScan = sources
    .filter((s) => s.last_fetched)
    .map((s) => s.last_fetched!)
    .sort()
    .reverse()[0];

  return (
    <>
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        stats={stats}
        lastScan={lastScan}
      />

      <ActionBar stats={stats} />

      {briefing.length > 0 && activeTab === 'signals' && (
        <Briefing signals={briefing} onSignalClick={handleBriefingClick} />
      )}

      <main className="max-w-[1000px] mx-auto px-6 py-6 relative min-h-[400px]">
        {loading ? (
          <div className="text-center py-16 text-[#71717A] text-[13px]">
            Loading...
          </div>
        ) : (
          <>
            {activeTab === 'signals' && (
              <SignalsTab
                signals={signals}
                onUpdate={handleSignalsUpdate}
                highlightSignalId={highlightId}
              />
            )}
            {activeTab === 'companies' && <CompaniesTab companies={companies} />}
            {activeTab === 'sources' && (
              <SourcesTab sources={sources} onUpdate={loadSources} />
            )}
            {activeTab === 'media' && (
              <MediaTab contacts={mediaContacts} pitches={pitches} />
            )}
          </>
        )}
      </main>

      {activeTab === 'signals' && (
        <button
          onClick={() => setQuickAddOpen(true)}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white text-2xl flex items-center justify-center shadow-lg shadow-black/50 transition-colors z-20"
          title="Quick Add Signal"
        >
          +
        </button>
      )}

      <QuickAddModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onAdded={handleSignalsUpdate}
        companies={companies}
      />
    </>
  );
}
