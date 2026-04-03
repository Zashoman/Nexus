'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/realestate/AuthProvider';
import KPICard from '@/components/realestate/KPICard';
import REChart from '@/components/realestate/REChart';
import RefreshModal from '@/components/realestate/RefreshModal';
import { KPIStat, WeeklyData, MonthlyData, Baseline } from '@/types/realestate';

type Tab = 'overview' | 'weekly' | 'monthly' | 'baselines' | 'log' | 'settings';

export default function RealEstateDashboard() {
  const { user, role, loading, token, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [kpis, setKpis] = useState<KPIStat[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshOpen, setRefreshOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const [statsRes, weeklyRes, monthlyRes, baselinesRes] = await Promise.all([
      fetch('/api/re/stats'),
      fetch('/api/re/weekly?limit=52'),
      fetch('/api/re/monthly?limit=24'),
      fetch('/api/re/baselines'),
    ]);

    const [statsJson, weeklyJson, monthlyJson, baselinesJson] = await Promise.all([
      statsRes.json(),
      weeklyRes.json(),
      monthlyRes.json(),
      baselinesRes.json(),
    ]);

    if (statsJson.kpis) setKpis(statsJson.kpis);
    if (statsJson.lastUpdated) setLastUpdated(statsJson.lastUpdated);
    if (weeklyJson.data) setWeeklyData(weeklyJson.data);
    if (monthlyJson.data) setMonthlyData(monthlyJson.data);
    if (baselinesJson.data) setBaselines(baselinesJson.data);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/realestate/login');
      return;
    }
    if (user) fetchData();
  }, [user, loading, router, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-sm font-mono text-[#5A6A7A]">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const isOwner = role === 'owner';
  const baselineMap = new Map(baselines.map(b => [b.metric_key, b.baseline_value]));

  // Prepare chart data (reverse for chronological order)
  const weeklyChartData = [...weeklyData].reverse().map(w => ({
    week: w.week_label,
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
      ? ((w.offplan_transactions / w.total_transactions) * 100).toFixed(1)
      : null,
    cash_pct: w.total_transactions && w.cash_transactions
      ? ((w.cash_transactions / w.total_transactions) * 100).toFixed(1)
      : null,
  }));

  const monthlyChartData = [...monthlyData].reverse().map(m => ({
    month: m.month_label,
    dewa_new_connections: m.dewa_new_connections,
    airport_passengers_millions: m.airport_passengers_millions,
    moasher_price_index: m.moasher_price_index,
    avg_price_psf_apartment: m.avg_price_psf_apartment,
    avg_price_psf_villa: m.avg_price_psf_villa,
    rental_index: m.rental_index,
  }));

  const tabs: { key: Tab; label: string; ownerOnly?: boolean }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'weekly', label: 'Weekly Input', ownerOnly: true },
    { key: 'monthly', label: 'Monthly Input', ownerOnly: true },
    { key: 'baselines', label: 'Baselines', ownerOnly: true },
    { key: 'log', label: 'Log' },
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
              Last Updated: {new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isOwner && (
            <button
              onClick={() => setRefreshOpen(true)}
              className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#4488FF] border border-[#4488FF]/30 rounded-sm hover:bg-[#4488FF]/10"
            >
              Refresh
            </button>
          )}
          <span className="text-[10px] font-mono text-[#5A6A7A]">
            {user.email} ({role})
          </span>
          <button
            onClick={signOut}
            className="text-[10px] font-mono text-[#FF4444] hover:text-[#FF6666]"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex-shrink-0 bg-[#0D1117] border-b border-[#1E2A3A] flex items-center gap-0 px-4 overflow-x-auto">
        {tabs.filter(t => !t.ownerOnly || isOwner).map(t => (
          <button
            key={t.key}
            onClick={() => {
              if (t.key === 'weekly') router.push('/realestate/input/weekly');
              else if (t.key === 'monthly') router.push('/realestate/input/monthly');
              else if (t.key === 'baselines') router.push('/realestate/baselines');
              else if (t.key === 'log') router.push('/realestate/log');
              else if (t.key === 'settings') router.push('/realestate/settings');
              else setActiveTab(t.key);
            }}
            className={`px-4 py-2.5 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === t.key
                ? 'text-[#4488FF] border-[#4488FF]'
                : 'text-[#5A6A7A] border-transparent hover:text-[#8899AA]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'overview' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {kpis.map(stat => (
                <KPICard key={stat.key} stat={stat} />
              ))}
            </div>

            {/* Weekly Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <REChart
                type="line"
                title="Total DLD Transactions"
                data={weeklyChartData}
                xKey="week"
                yKeys={[{ key: 'total_transactions', color: '#4488FF', name: 'Total Tx' }]}
                baseline={{ value: baselineMap.get('total_transactions') ?? 7000, label: 'Baseline' }}
              />
              <REChart
                type="area"
                title="Off-Plan vs Secondary Split"
                data={weeklyChartData}
                xKey="week"
                yKeys={[
                  { key: 'offplan_transactions', color: '#4488FF', name: 'Off-Plan' },
                  { key: 'secondary_transactions', color: '#00CC66', name: 'Secondary' },
                ]}
              />
              <REChart
                type="line"
                title="Off-Plan Percentage"
                data={weeklyChartData}
                xKey="week"
                yKeys={[{ key: 'offplan_pct', color: '#FFB020', name: 'Off-Plan %' }]}
                baseline={{ value: 60, label: '60% baseline' }}
              />
              <REChart
                type="line"
                title="Mortgage vs Cash Transactions"
                data={weeklyChartData}
                xKey="week"
                yKeys={[
                  { key: 'mortgage_registrations', color: '#4488FF', name: 'Mortgage' },
                  { key: 'cash_transactions', color: '#FF8C00', name: 'Cash' },
                ]}
              />
              <REChart
                type="line"
                title="Cash Transaction Share %"
                data={weeklyChartData}
                xKey="week"
                yKeys={[{ key: 'cash_pct', color: '#FF4444', name: 'Cash %' }]}
                baseline={{ value: 80, label: '80% baseline' }}
              />
              <REChart
                type="line"
                title="Total Value (AED Billions)"
                data={weeklyChartData}
                xKey="week"
                yKeys={[{ key: 'total_value_aed_billions', color: '#00CC66', name: 'Value (B)' }]}
                baseline={{ value: baselineMap.get('total_value_aed_billions') ?? 20, label: 'Baseline' }}
              />
              <REChart
                type="line"
                title="DFM RE Index + Emaar"
                data={weeklyChartData}
                xKey="week"
                yKeys={[
                  { key: 'dfm_re_index', color: '#4488FF', name: 'DFM RE Index' },
                  { key: 'emaar_share_price', color: '#FFB020', name: 'Emaar (AED)' },
                ]}
                dualAxis
                baseline={{ value: baselineMap.get('dfm_re_index') ?? 5200, label: 'DFM Baseline' }}
              />
              <REChart
                type="line"
                title="Listing Inventory"
                data={weeklyChartData}
                xKey="week"
                yKeys={[{ key: 'listing_inventory', color: '#FF8C00', name: 'Listings' }]}
                baseline={{ value: baselineMap.get('listing_inventory') ?? 40000, label: 'Baseline' }}
              />
            </div>

            {/* Monthly Charts */}
            <div className="pt-2">
              <h2 className="text-xs uppercase tracking-wider text-[#5A6A7A] font-mono mb-3">Monthly Indicators</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <REChart
                type="bar"
                title="DEWA New Connections"
                data={monthlyChartData}
                xKey="month"
                yKeys={[{ key: 'dewa_new_connections', color: '#4488FF', name: 'DEWA' }]}
                baseline={{ value: baselineMap.get('dewa_new_connections') ?? 13000, label: 'Baseline' }}
              />
              <REChart
                type="line"
                title="Airport Passengers (Millions)"
                data={monthlyChartData}
                xKey="month"
                yKeys={[{ key: 'airport_passengers_millions', color: '#00CC66', name: 'Passengers (M)' }]}
                baseline={{ value: baselineMap.get('airport_passengers_millions') ?? 8.5, label: 'Baseline' }}
              />
              <REChart
                type="line"
                title="Mo'asher Price Index"
                data={monthlyChartData}
                xKey="month"
                yKeys={[{ key: 'moasher_price_index', color: '#FFB020', name: "Mo'asher" }]}
              />
              <REChart
                type="line"
                title="Average Price per Sqft"
                data={monthlyChartData}
                xKey="month"
                yKeys={[
                  { key: 'avg_price_psf_apartment', color: '#4488FF', name: 'Apartment' },
                  { key: 'avg_price_psf_villa', color: '#FF8C00', name: 'Villa' },
                ]}
              />
            </div>

            {/* Data Sources */}
            <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-4 mt-4">
              <h3 className="text-[10px] uppercase tracking-wider text-[#5A6A7A] font-mono mb-2">Data Sources</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-[10px] font-mono text-[#5A6A7A]">
                <div><span className="text-[#8899AA]">DLD Transactions:</span> Dubai REST / transactions.dubailand.gov.ae</div>
                <div><span className="text-[#8899AA]">DFM RE / Emaar:</span> dfm.ae / Google Finance</div>
                <div><span className="text-[#8899AA]">Listing Inventory:</span> bayut.com / propertyfinder.ae</div>
                <div><span className="text-[#8899AA]">DEWA Connections:</span> dewa.gov.ae monthly reports</div>
                <div><span className="text-[#8899AA]">Airport Passengers:</span> dubaiairports.ae statistics</div>
                <div><span className="text-[#8899AA]">Mo&apos;asher Index:</span> dxbinteract.com</div>
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
