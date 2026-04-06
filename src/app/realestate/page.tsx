'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/realestate/AuthProvider';
import KPICard from '@/components/realestate/KPICard';
import REChart from '@/components/realestate/REChart';
import { EventAnnotation } from '@/components/realestate/REChart';
import StressGauge from '@/components/realestate/StressGauge';
import HistoricalComparison from '@/components/realestate/HistoricalComparison';
import RefreshModal from '@/components/realestate/RefreshModal';
import { KPIStat, WeeklyData, MonthlyData, Baseline } from '@/types/realestate';

type Tab = 'overview' | 'weekly' | 'baselines' | 'log' | 'settings';

export default function RealEstateDashboard() {
  const { user, role, loading, token, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [kpis, setKpis] = useState<KPIStat[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [, setMonthlyData] = useState<MonthlyData[]>([]);
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshOpen, setRefreshOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/re/seed', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) alert(json.error);
      else {
        alert(`Seeded ${json.weeks_seeded} weeks of data!`);
        fetchData();
      }
    } catch { alert('Seed failed'); }
    finally { setSeeding(false); }
  };

  const fetchData = useCallback(async () => {
    const [statsRes, weeklyRes, monthlyRes, baselinesRes] = await Promise.all([
      fetch('/api/re/stats'),
      fetch('/api/re/weekly?limit=52'),
      fetch('/api/re/monthly?limit=24'),
      fetch('/api/re/baselines'),
    ]);
    const [statsJson, weeklyJson, monthlyJson, baselinesJson] = await Promise.all([
      statsRes.json(), weeklyRes.json(), monthlyRes.json(), baselinesRes.json(),
    ]);
    if (statsJson.kpis) setKpis(statsJson.kpis);
    if (statsJson.lastUpdated) setLastUpdated(statsJson.lastUpdated);
    if (weeklyJson.data) setWeeklyData(weeklyJson.data);
    if (monthlyJson.data) setMonthlyData(monthlyJson.data);
    if (baselinesJson.data) setBaselines(baselinesJson.data);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !kpis.length) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-sm font-mono text-[#5A6A7A]">Loading...</div>
      </div>
    );
  }

  const isOwner = role === 'owner';
  const isLoggedIn = !!user;
  const baselineMap = new Map(baselines.map(b => [b.metric_key, b.baseline_value]));

  // Prepare chart data (chronological)
  const weeklyChartData = [...weeklyData].reverse().map(w => ({
    week: new Date(w.week_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    total_transactions: w.total_transactions,
    offplan_transactions: w.offplan_transactions,
    secondary_transactions: w.secondary_transactions,
    mortgage_registrations: w.mortgage_registrations,
    cash_transactions: w.cash_transactions,
    total_value_aed_billions: w.total_value_aed_billions,
    dfm_re_index: w.dfm_re_index,
    emaar_share_price: w.emaar_share_price,
    damac_share_price: w.damac_share_price,
    listing_inventory: w.listing_inventory,
    offplan_pct: w.total_transactions && w.offplan_transactions
      ? +((w.offplan_transactions / w.total_transactions) * 100).toFixed(1)
      : null,
    cash_pct: w.total_transactions && w.cash_transactions
      ? +((w.cash_transactions / w.total_transactions) * 100).toFixed(1)
      : null,
  }));

  const events: EventAnnotation[] = [];

  const tabs: { key: Tab; label: string; ownerOnly?: boolean }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'weekly', label: 'Weekly Input', ownerOnly: true },
    { key: 'baselines', label: 'Baselines', ownerOnly: true },
    { key: 'log', label: 'Log', ownerOnly: true },
    { key: 'settings', label: 'Settings', ownerOnly: true },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 h-12 bg-[#0D1117] border-b border-[#1E2A3A] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-mono font-semibold text-[#E8EAED] tracking-wider uppercase">
            Dubai RE Monitor
          </h1>
          {lastUpdated && (
            <span className="text-[10px] font-mono text-[#5A6A7A]">
              Updated: {new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          <span className="text-[10px] font-mono text-[#5A6A7A]/50">
            Feb 1 – Apr 3, 2026
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <button onClick={handleSeed} disabled={seeding}
              className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#00CC66] border border-[#00CC66]/30 rounded-sm hover:bg-[#00CC66]/10 disabled:opacity-50">
              {seeding ? 'Loading...' : 'Load History'}
            </button>
          )}
          {isOwner && (
            <button onClick={() => setRefreshOpen(true)}
              className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#4488FF] border border-[#4488FF]/30 rounded-sm hover:bg-[#4488FF]/10">
              Refresh
            </button>
          )}
          <a href="/realestate/feedback"
            className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#8899AA] border border-[#1E2A3A] rounded-sm hover:bg-[#1A2332] hover:text-[#E8EAED]">
            Database
          </a>
          {isLoggedIn ? (
            <>
              <span className="text-[10px] font-mono text-[#5A6A7A]">{user!.email}</span>
              <button onClick={signOut} className="text-[10px] font-mono text-[#FF4444] hover:text-[#FF6666]">Logout</button>
            </>
          ) : (
            <a href="/realestate/login" className="text-[10px] font-mono text-[#4488FF] hover:text-[#6699FF]">Owner Login</a>
          )}
        </div>
      </header>

      {/* Tabs — only show if owner */}
      {isOwner && (
        <div className="flex-shrink-0 bg-[#0D1117] border-b border-[#1E2A3A] flex items-center gap-0 px-4 overflow-x-auto">
          {tabs.filter(t => !t.ownerOnly || isOwner).map(t => (
            <button
              key={t.key}
              onClick={() => {
                if (t.key === 'weekly') router.push('/realestate/input/weekly');
                else if (t.key === 'baselines') router.push('/realestate/baselines');
                else if (t.key === 'log') router.push('/realestate/log');
                else if (t.key === 'settings') router.push('/realestate/settings');
                else setActiveTab(t.key);
              }}
              className={`px-4 py-2.5 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === t.key ? 'text-[#4488FF] border-[#4488FF]' : 'text-[#5A6A7A] border-transparent hover:text-[#8899AA]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'overview' && (
          <>
            {/* Stress Index */}
            <StressGauge weeklyData={weeklyData} baselines={baselines} />

            {/* KPI Cards — 2 rows of 4 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {kpis.map(stat => (
                <KPICard key={stat.key} stat={stat} />
              ))}
            </div>

            {/* Historical comparison */}
            <HistoricalComparison />

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <REChart
                type="line"
                title="Total DLD Transactions"
                info="Weekly property transactions registered with Dubai Land Department. Amber line = pre-conflict Feb baseline."
                data={weeklyChartData}
                xKey="week"
                yKeys={[{ key: 'total_transactions', color: '#4488FF', name: 'Total Tx' }]}
                baseline={{ value: baselineMap.get('total_transactions') ?? 4400, label: 'Baseline' }}
                events={events}
              />
              <REChart
                type="area"
                title="Off-Plan vs Secondary Split"
                info="Off-plan (under construction) vs secondary (ready/resale). A shift away from off-plan signals cooling speculative demand."
                data={weeklyChartData}
                xKey="week"
                yKeys={[
                  { key: 'offplan_transactions', color: '#4488FF', name: 'Off-Plan' },
                  { key: 'secondary_transactions', color: '#00CC66', name: 'Secondary' },
                ]}
                events={events}
              />
              <REChart
                type="line"
                title="Off-Plan %"
                info="Off-plan share of total transactions. Pre-conflict ~65-70%. Drop below 40% = crisis signal."
                data={weeklyChartData}
                xKey="week"
                yKeys={[{ key: 'offplan_pct', color: '#FFB020', name: 'Off-Plan %' }]}
                baseline={{ value: 65, label: '65% pre-conflict' }}
                events={events}
              />
              <REChart
                type="line"
                title="Mortgage vs Cash"
                info="Mortgage (bank-financed) vs cash purchases. Dubai RE ~75-80% cash. Mortgage drops = credit tightening."
                data={weeklyChartData}
                xKey="week"
                yKeys={[
                  { key: 'mortgage_registrations', color: '#4488FF', name: 'Mortgage' },
                  { key: 'cash_transactions', color: '#FF8C00', name: 'Cash' },
                ]}
                events={events}
              />
              <REChart
                type="line"
                title="Transaction Value (AED B)"
                info="Weekly transaction value in AED billions. Value dropping faster than volume = falling prices."
                data={weeklyChartData}
                xKey="week"
                yKeys={[{ key: 'total_value_aed_billions', color: '#00CC66', name: 'Value (B)' }]}
                baseline={{ value: baselineMap.get('total_value_aed_billions') ?? 17.2, label: 'Baseline' }}
                events={events}
              />
              <REChart
                type="line"
                title="DFM RE Index + Emaar"
                info="DFM Real Estate Index (left) and Emaar share price (right). Leading indicators — stock reprices faster than physical RE."
                data={weeklyChartData}
                xKey="week"
                yKeys={[
                  { key: 'dfm_re_index', color: '#4488FF', name: 'DFM RE Index' },
                  { key: 'emaar_share_price', color: '#FFB020', name: 'Emaar (AED)' },
                ]}
                dualAxis
                baseline={{ value: baselineMap.get('dfm_re_index') ?? 16200, label: 'Feb baseline' }}
                events={events}
              />
              <REChart
                type="line"
                title="Cash Share %"
                info="Cash as % of total transactions. Rising during downturn = distressed/urgent sales."
                data={weeklyChartData}
                xKey="week"
                yKeys={[{ key: 'cash_pct', color: '#FF4444', name: 'Cash %' }]}
                baseline={{ value: 76, label: '76% Feb avg' }}
                events={events}
              />
              <REChart
                type="line"
                title="Listing Inventory"
                info="Active listings on Bayut + Property Finder. Rising = more sellers entering market, supply glut risk."
                data={weeklyChartData}
                xKey="week"
                yKeys={[{ key: 'listing_inventory', color: '#FF8C00', name: 'Listings' }]}
                baseline={{ value: baselineMap.get('listing_inventory') ?? 88000, label: 'Feb baseline' }}
                events={events}
              />
            </div>

            {/* Data Sources */}
            <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-[10px] font-mono text-[#5A6A7A]">
                <span><span className="text-[#8899AA]">DLD:</span> transactions.dubailand.gov.ae</span>
                <span><span className="text-[#8899AA]">DFM/Emaar:</span> dfm.ae</span>
                <span><span className="text-[#8899AA]">Listings:</span> bayut.com / propertyfinder.ae</span>
                <span><span className="text-[#8899AA]">Analysis:</span> gulfbusiness.com / economymiddleeast.com</span>
              </div>
            </div>
          </>
        )}
      </div>

      <RefreshModal
        isOpen={refreshOpen}
        onClose={() => { setRefreshOpen(false); fetchData(); }}
        token={token}
      />
    </div>
  );
}
