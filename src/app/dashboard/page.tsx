"use client";

import { useState, useEffect } from "react";
import ScoreChart from "@/components/dashboard/ScoreChart";

const TABS = [
  { key: "calendar", label: "Economic Calendar" },
  { key: "rates", label: "Rates & Spreads" },
  { key: "commodities", label: "Commodities" },
  { key: "demand", label: "Demand Destruction" },
  { key: "hormuz", label: "Hormuz Risk" },
  { key: "credit", label: "Private Credit" },
  { key: "geo", label: "Geopolitical" },
  { key: "earnings", label: "Earnings" },
];

const THREAT_COLORS: Record<string, string> = {
  low: "bg-[#00CC66] text-[#0B0E11]",
  elevated: "bg-[#FF8C00] text-[#0B0E11]",
  high: "bg-[#FF4444] text-white",
  critical: "bg-[#FF0000] text-white animate-pulse",
  calm: "bg-[#00CC66] text-[#0B0E11]",
  watchful: "bg-[#FFD700] text-[#0B0E11]",
  stressed: "bg-[#FF8C00] text-[#0B0E11]",
  crisis: "bg-[#FF0000] text-white animate-pulse",
  hold: "bg-[#00CC66] text-[#0B0E11]",
  monitor: "bg-[#FFD700] text-[#0B0E11]",
  reduce: "bg-[#FF8C00] text-[#0B0E11]",
  sell_now: "bg-[#FF0000] text-white animate-pulse",
  moderate: "bg-[#FF8C00] text-[#0B0E11]",
};

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null) return "--";
  return n.toFixed(decimals);
}

function chg(n: number | null | undefined): string {
  if (n == null) return "";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function chgColor(n: number | null | undefined): string {
  if (n == null) return "text-[#5A6A7A]";
  return n >= 0 ? "text-[#00CC66]" : "text-[#FF4444]";
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("rates");
  const [rates, setRates] = useState<Record<string, unknown> | null>(null);
  const [commodities, setCommodities] = useState<Record<string, unknown> | null>(null);
  const [ddData, setDdData] = useState<Record<string, unknown> | null>(null);
  const [hormuzData, setHormuzData] = useState<Record<string, unknown> | null>(null);
  const [creditData, setCreditData] = useState<Record<string, unknown> | null>(null);
  const [geoData, setGeoData] = useState<Record<string, unknown> | null>(null);
  const [earningsData, setEarningsData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [headerScores, setHeaderScores] = useState<Record<string, { score: number; max: number; level: string }>>({});

  useEffect(() => {
    fetchHeaderScores();
    fetchTabData(activeTab);
  }, [activeTab]);

  async function fetchHeaderScores() {
    try {
      const [ratesRes, commRes, ddRes, hormuzRes, creditRes, geoRes] = await Promise.all([
        fetch("/api/dashboard/rates").then(r => r.json()).catch(() => null),
        fetch("/api/dashboard/commodities").then(r => r.json()).catch(() => null),
        fetch("/api/dashboard/demand-destruction").then(r => r.json()).catch(() => null),
        fetch("/api/dashboard/hormuz").then(r => r.json()).catch(() => null),
        fetch("/api/dashboard/private-credit").then(r => r.json()).catch(() => null),
        fetch("/api/dashboard/geo").then(r => r.json()).catch(() => null),
      ]);

      const scores: Record<string, { score: number; max: number; level: string }> = {};

      if (ratesRes?.score != null) scores.rates = { score: ratesRes.score, max: ratesRes.max_score || 20, level: ratesRes.level || "neutral" };
      if (commRes?.score != null) scores.commodities = { score: commRes.score, max: commRes.max_score || 22, level: commRes.level || "neutral" };
      if (ddRes?.latest?.total_score != null) scores.demand = { score: ddRes.latest.total_score, max: 20, level: ddRes.latest.threat_level || "low" };
      if (hormuzRes?.latest?.total_score != null) scores.hormuz = { score: hormuzRes.latest.total_score, max: 50, level: hormuzRes.latest.risk_level || "hold" };
      if (creditRes?.latest?.total_score != null) scores.credit = { score: creditRes.latest.total_score, max: 25, level: creditRes.latest.stress_level || "calm" };
      if (geoRes?.risk_score != null) scores.geo = { score: geoRes.risk_score, max: geoRes.max_score || 16, level: geoRes.risk_level || "calm" };

      setHeaderScores(scores);

      // Also populate tab data from the header fetch
      if (ratesRes && !rates) setRates(ratesRes);
      if (commRes && !commodities) setCommodities(commRes);
      if (ddRes && !ddData) setDdData(ddRes);
      if (hormuzRes && !hormuzData) setHormuzData(hormuzRes);
      if (creditRes && !creditData) setCreditData(creditRes);
      if (geoRes && !geoData) setGeoData(geoRes);
    } catch {
      // silent
    }
  }

  async function fetchTabData(tab: string) {
    setLoading(true);
    try {
      switch (tab) {
        case "rates": {
          const res = await fetch("/api/dashboard/rates");
          setRates(await res.json());
          break;
        }
        case "commodities": {
          const res = await fetch("/api/dashboard/commodities");
          setCommodities(await res.json());
          break;
        }
        case "demand": {
          const res = await fetch("/api/dashboard/demand-destruction");
          setDdData(await res.json());
          break;
        }
        case "hormuz": {
          const res = await fetch("/api/dashboard/hormuz");
          setHormuzData(await res.json());
          break;
        }
        case "credit": {
          const res = await fetch("/api/dashboard/private-credit");
          setCreditData(await res.json());
          break;
        }
        case "geo": {
          const res = await fetch("/api/dashboard/geo");
          setGeoData(await res.json());
          break;
        }
        case "earnings": {
          const res = await fetch("/api/dashboard/calendar/earnings");
          setEarningsData(await res.json());
          break;
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function rescore(endpoint: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/${endpoint}`, { method: "POST" });
      const data = await res.json();
      if (endpoint === "demand-destruction") setDdData({ latest: data.score, scores: [data.score] });
      if (endpoint === "hormuz") setHormuzData({ latest: data.score, scores: [data.score] });
      if (endpoint === "private-credit") setCreditData({ latest: data.score, scores: [data.score] });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#0B0E11] text-[#E8EAED]">
      {/* Master Header with all scores */}
      <div className="border-b border-[#1E2A3A] bg-[#0D1117] px-4 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <h1 className="text-xs font-mono text-[#4488FF] font-bold uppercase tracking-wider">Macro Dashboard</h1>
          {Object.keys(headerScores).length > 0 && (() => {
            const entries = Object.values(headerScores);
            const normalized = entries.map(e => (e.score / e.max) * 100);
            const composite = Math.round(normalized.reduce((a, b) => a + b, 0) / normalized.length);
            const compLevel = composite >= 66 ? "EXTREME" : composite >= 46 ? "HIGH RISK" : composite >= 26 ? "MODERATE" : "LOW RISK";
            const compColor = composite >= 66 ? "text-[#FF0000]" : composite >= 46 ? "text-[#FF4444]" : composite >= 26 ? "text-[#FF8C00]" : "text-[#00CC66]";
            return (
              <span className={`text-[14px] font-mono font-bold ${compColor}`}>
                MACRO RISK: {composite} - {compLevel}
              </span>
            );
          })()}
        </div>
        <div className="flex items-center gap-3 overflow-x-auto">
          {[
            { key: "rates", label: "RATES" },
            { key: "commodities", label: "COMM" },
            { key: "demand", label: "DD" },
            { key: "hormuz", label: "HORMUZ" },
            { key: "credit", label: "CREDIT" },
            { key: "geo", label: "GEO" },
          ].map((item) => {
            const s = headerScores[item.key];
            if (!s) return <span key={item.key} className="text-[9px] font-mono text-[#5A6A7A]">{item.label}: --</span>;
            const pct = (s.score / s.max) * 100;
            const color = pct >= 60 ? "text-[#FF4444]" : pct >= 40 ? "text-[#FF8C00]" : pct >= 20 ? "text-[#FFD700]" : "text-[#00CC66]";
            return (
              <button key={item.key} onClick={() => setActiveTab(item.key)} className={`text-[9px] font-mono ${color} hover:underline cursor-pointer whitespace-nowrap`}>
                {item.label}: {s.level.toUpperCase().replace("_", " ")} {s.score}/{s.max}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-0 border-b border-[#1E2A3A] bg-[#0D1117] overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-[11px] font-mono whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.key
                ? "border-[#4488FF] text-[#E8EAED] bg-[#141820]"
                : "border-transparent text-[#5A6A7A] hover:text-[#8899AA]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="text-xs font-mono text-[#5A6A7A] animate-pulse mb-4">Loading data...</div>
        )}

        {/* RATES TAB */}
        {activeTab === "rates" && rates && (
          <div className="space-y-4">
            <h3 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider">Treasury Yields</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "2Y Yield", val: (rates as Record<string, Record<string, unknown>>).yields?.us2y },
                { label: "10Y Yield", val: (rates as Record<string, Record<string, unknown>>).yields?.us10y },
                { label: "30Y Yield", val: (rates as Record<string, Record<string, unknown>>).yields?.us30y },
                { label: "2s/10s Spread", val: (rates as Record<string, Record<string, unknown>>).yields?.spread_2s10s },
              ].map((item) => (
                <div key={item.label} className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3">
                  <p className="text-[10px] font-mono text-[#5A6A7A]">{item.label}</p>
                  <p className={`text-[18px] font-mono font-bold ${Number(item.val) < 0 ? "text-[#FF4444]" : "text-[#E8EAED]"}`}>
                    {fmt(item.val as number | null)}%
                  </p>
                </div>
              ))}
            </div>

            <h3 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider mt-4">Credit Spreads</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3">
                <p className="text-[10px] font-mono text-[#5A6A7A]">HY OAS</p>
                <p className="text-[18px] font-mono font-bold text-[#E8EAED]">
                  {fmt((rates as Record<string, Record<string, unknown>>).credit?.hy_oas as number | null)}%
                </p>
              </div>
              <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3">
                <p className="text-[10px] font-mono text-[#5A6A7A]">Fed Funds Rate</p>
                <p className="text-[18px] font-mono font-bold text-[#E8EAED]">
                  {fmt((rates as Record<string, Record<string, unknown>>).fed?.funds_rate as number | null)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* COMMODITIES TAB */}
        {activeTab === "commodities" && commodities && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries((commodities as Record<string, Record<string, Record<string, unknown>>>).quotes || {}).map(([symbol, q]) => (
                <div key={symbol} className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3">
                  <p className="text-[10px] font-mono text-[#5A6A7A]">{q.name as string}</p>
                  <p className="text-[18px] font-mono font-bold text-[#E8EAED]">${fmt(q.price as number)}</p>
                  <p className={`text-[11px] font-mono ${chgColor(q.changePct as number)}`}>{chg(q.changePct as number)}</p>
                </div>
              ))}
            </div>
            {(commodities as Record<string, Record<string, unknown>>).ratios && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3">
                  <p className="text-[10px] font-mono text-[#5A6A7A]">Gold/Oil Ratio</p>
                  <p className="text-[18px] font-mono font-bold text-[#FFD700]">
                    {(commodities as Record<string, Record<string, unknown>>).ratios?.gold_oil as string || "--"}
                  </p>
                </div>
                <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3">
                  <p className="text-[10px] font-mono text-[#5A6A7A]">Copper/Gold Ratio</p>
                  <p className="text-[18px] font-mono font-bold text-[#FF8C00]">
                    {(commodities as Record<string, Record<string, unknown>>).ratios?.copper_gold as string || "--"}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DEMAND DESTRUCTION TAB */}
        {activeTab === "demand" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {ddData && (ddData as Record<string, Record<string, unknown>>).latest && (
                  <>
                    <span className={`px-3 py-1 text-sm font-mono font-bold rounded-sm ${THREAT_COLORS[((ddData as Record<string, Record<string, unknown>>).latest?.threat_level as string) || "low"]}`}>
                      {((ddData as Record<string, Record<string, unknown>>).latest?.threat_level as string || "LOW").toUpperCase()}
                    </span>
                    <span className="text-[16px] font-mono font-bold text-[#E8EAED]">
                      {(ddData as Record<string, Record<string, unknown>>).latest?.total_score as number}/20
                    </span>
                  </>
                )}
              </div>
              <button onClick={() => rescore("demand-destruction")} disabled={loading} className="text-[10px] font-mono text-[#4488FF] hover:text-[#6699FF] cursor-pointer">
                {loading ? "Scoring..." : "Rescore Now"}
              </button>
            </div>

            {/* Score History Chart */}
            {ddData && ((ddData as Record<string, unknown[]>).scores as Array<Record<string, unknown>>)?.length > 0 && (
              <ScoreChart
                data={((ddData as Record<string, unknown[]>).scores as Array<Record<string, unknown>>).map((s) => ({
                  date: s.scored_at as string,
                  score: s.total_score as number,
                  level: s.threat_level as string,
                }))}
                maxScore={20}
                thresholds={[
                  { value: 0, color: "#00CC66", label: "Low" },
                  { value: 5, color: "#FF8C00", label: "Elevated" },
                  { value: 10, color: "#FF4444", label: "High" },
                  { value: 15, color: "#FF0000", label: "Critical" },
                ]}
              />
            )}

            {ddData && (ddData as Record<string, Record<string, unknown>>).latest && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { name: "EMHY", value: "emhy_value", score: "emhy_score" },
                  { name: "BDI", value: "bdi_value", score: "bdi_score" },
                  { name: "Korea Exports", value: "kr_exports_value", score: "kr_exports_score" },
                  { name: "China PMI", value: "china_pmi_value", score: "china_pmi_score" },
                  { name: "WTI", value: "wti_value", score: "wti_score" },
                  { name: "Force Majeures", value: "force_majeure_count", score: "force_majeure_score" },
                  { name: "Jobless Claims", value: "claims_value", score: "claims_score" },
                  { name: "Copper", value: "copper_value", score: "copper_score" },
                  { name: "UMich Sentiment", value: "umich_value", score: "umich_score" },
                  { name: "Gas Price", value: "gas_price_value", score: "gas_price_score" },
                ].map((ind) => {
                  const latest = (ddData as Record<string, Record<string, unknown>>).latest as Record<string, unknown>;
                  const s = (latest[ind.score] as number) || 0;
                  const signalColor = s === 0 ? "bg-[#00CC66]" : s === 1 ? "bg-[#FFD700]" : "bg-[#FF4444]";
                  return (
                    <div key={ind.name} className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-mono text-[#5A6A7A]">{ind.name}</span>
                        <span className={`w-2 h-2 rounded-full ${signalColor}`} />
                      </div>
                      <p className="text-[14px] font-mono font-bold text-[#E8EAED]">
                        {latest[ind.value] != null ? fmt(latest[ind.value] as number) : "--"}
                      </p>
                      <p className="text-[9px] font-mono text-[#5A6A7A]">Score: {s}/2</p>
                    </div>
                  );
                })}
              </div>
            )}

            {!ddData?.latest && !loading && (
              <div className="text-center py-8">
                <p className="text-[#5A6A7A] text-xs font-mono">No scores yet.</p>
                <button onClick={() => rescore("demand-destruction")} className="mt-2 px-4 py-2 text-xs font-mono bg-[#4488FF] text-white rounded-sm cursor-pointer">
                  Run First Score
                </button>
              </div>
            )}
          </div>
        )}

        {/* HORMUZ TAB */}
        {activeTab === "hormuz" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {hormuzData && (hormuzData as Record<string, Record<string, unknown>>).latest && (
                  <>
                    <span className={`px-3 py-1 text-sm font-mono font-bold rounded-sm ${THREAT_COLORS[((hormuzData as Record<string, Record<string, unknown>>).latest?.risk_level as string) || "hold"]}`}>
                      {((hormuzData as Record<string, Record<string, unknown>>).latest?.risk_level as string || "HOLD").toUpperCase().replace("_", " ")}
                    </span>
                    <span className="text-[16px] font-mono font-bold text-[#E8EAED]">
                      {(hormuzData as Record<string, Record<string, unknown>>).latest?.total_score as number}/50
                    </span>
                  </>
                )}
              </div>
              <button onClick={() => rescore("hormuz")} disabled={loading} className="text-[10px] font-mono text-[#4488FF] hover:text-[#6699FF] cursor-pointer">
                {loading ? "Scoring..." : "Rescore Now"}
              </button>
            </div>

            {/* Score History Chart */}
            {hormuzData && ((hormuzData as Record<string, unknown[]>).scores as Array<Record<string, unknown>>)?.length > 0 && (
              <ScoreChart
                data={((hormuzData as Record<string, unknown[]>).scores as Array<Record<string, unknown>>).map((s) => ({
                  date: s.scored_at as string,
                  score: s.total_score as number,
                  level: s.risk_level as string,
                }))}
                maxScore={50}
                thresholds={[
                  { value: 0, color: "#00CC66", label: "Hold" },
                  { value: 16, color: "#FFD700", label: "Monitor" },
                  { value: 26, color: "#FF8C00", label: "Reduce" },
                  { value: 36, color: "#FF0000", label: "Sell Now" },
                ]}
              />
            )}

            {hormuzData && (hormuzData as Record<string, Record<string, unknown>>).latest && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  {["Physical Disruption", "Energy Markets", "Geopolitical", "Market Stress", "Scenario"].map((cat, i) => {
                    const latest = (hormuzData as Record<string, Record<string, unknown>>).latest as Record<string, unknown>;
                    const maxScores = [12, 10, 10, 10, 8];
                    const score = (latest[`category_${i + 1}_score`] as number) || 0;
                    return (
                      <div key={cat} className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3">
                        <p className="text-[10px] font-mono text-[#5A6A7A] mb-1">{cat}</p>
                        <p className="text-[16px] font-mono font-bold text-[#E8EAED]">{score}/{maxScores[i]}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3">
                  <p className="text-[10px] font-mono text-[#5A6A7A] mb-2">AI Assessment</p>
                  <p className="text-[13px] text-[#E8EAED]/90 leading-relaxed">
                    {((hormuzData as Record<string, Record<string, unknown>>).latest as Record<string, unknown>)?.ai_assessment as string || "No assessment available."}
                  </p>
                </div>
              </>
            )}

            {!hormuzData?.latest && !loading && (
              <div className="text-center py-8">
                <p className="text-[#5A6A7A] text-xs font-mono">No Hormuz risk scores yet.</p>
                <button onClick={() => rescore("hormuz")} className="mt-2 px-4 py-2 text-xs font-mono bg-[#4488FF] text-white rounded-sm cursor-pointer">
                  Run First Score
                </button>
              </div>
            )}
          </div>
        )}

        {/* PRIVATE CREDIT TAB */}
        {activeTab === "credit" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {creditData && (creditData as Record<string, Record<string, unknown>>).latest && (
                  <>
                    <span className={`px-3 py-1 text-sm font-mono font-bold rounded-sm ${THREAT_COLORS[((creditData as Record<string, Record<string, unknown>>).latest?.stress_level as string) || "calm"]}`}>
                      {((creditData as Record<string, Record<string, unknown>>).latest?.stress_level as string || "CALM").toUpperCase()}
                    </span>
                    <span className="text-[16px] font-mono font-bold text-[#E8EAED]">
                      {(creditData as Record<string, Record<string, unknown>>).latest?.total_score as number}/25
                    </span>
                  </>
                )}
              </div>
              <button onClick={() => rescore("private-credit")} disabled={loading} className="text-[10px] font-mono text-[#4488FF] hover:text-[#6699FF] cursor-pointer">
                {loading ? "Scoring..." : "Rescore Now"}
              </button>
            </div>

            {/* Score History Chart */}
            {creditData && ((creditData as Record<string, unknown[]>).scores as Array<Record<string, unknown>>)?.length > 0 && (
              <ScoreChart
                data={((creditData as Record<string, unknown[]>).scores as Array<Record<string, unknown>>).map((s) => ({
                  date: s.scored_at as string,
                  score: s.total_score as number,
                  level: s.stress_level as string,
                }))}
                maxScore={25}
                thresholds={[
                  { value: 0, color: "#00CC66", label: "Calm" },
                  { value: 6, color: "#FFD700", label: "Watchful" },
                  { value: 11, color: "#FF8C00", label: "Stressed" },
                  { value: 18, color: "#FF0000", label: "Crisis" },
                ]}
              />
            )}

            {creditData && (creditData as Record<string, Record<string, unknown>>).latest && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { name: "HY OAS", value: "hy_oas_value", score: "hy_oas_score", max: 5 },
                  { name: "CCC-BB Spread", value: "ccc_bb_spread", score: "ccc_bb_score", max: 5 },
                  { name: "BIZD 30d", value: "bizd_30d_change", score: "bizd_score", max: 5 },
                  { name: "BKLN 30d", value: "bkln_30d_change", score: "bkln_score", max: 5 },
                  { name: "News Signals", value: "news_redemption_count", score: "news_score", max: 5 },
                ].map((ind) => {
                  const latest = (creditData as Record<string, Record<string, unknown>>).latest as Record<string, unknown>;
                  const s = (latest[ind.score] as number) || 0;
                  return (
                    <div key={ind.name} className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-2">
                      <p className="text-[9px] font-mono text-[#5A6A7A]">{ind.name}</p>
                      <p className="text-[14px] font-mono font-bold text-[#E8EAED]">
                        {latest[ind.value] != null ? fmt(latest[ind.value] as number) : "--"}
                      </p>
                      <p className="text-[9px] font-mono text-[#5A6A7A]">Score: {s}/{ind.max}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {!creditData?.latest && !loading && (
              <div className="text-center py-8">
                <p className="text-[#5A6A7A] text-xs font-mono">No private credit scores yet.</p>
                <button onClick={() => rescore("private-credit")} className="mt-2 px-4 py-2 text-xs font-mono bg-[#4488FF] text-white rounded-sm cursor-pointer">
                  Run First Score
                </button>
              </div>
            )}
          </div>
        )}

        {/* GEOPOLITICAL TAB */}
        {activeTab === "geo" && geoData && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-3 py-1 text-sm font-mono font-bold rounded-sm ${THREAT_COLORS[(geoData as Record<string, unknown>).risk_level as string || "low"]}`}>
                {((geoData as Record<string, unknown>).risk_level as string || "LOW").toUpperCase()}
              </span>
              <span className="text-[14px] font-mono text-[#E8EAED]">
                Composite: {(geoData as Record<string, unknown>).risk_score as number}/4
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries((geoData as Record<string, Record<string, Record<string, unknown>>>).proxies || {}).map(([key, val]) => (
                <div key={key} className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3">
                  <p className="text-[10px] font-mono text-[#5A6A7A] uppercase">{key}</p>
                  <p className="text-[18px] font-mono font-bold text-[#E8EAED]">{val?.price != null ? fmt(val.price as number) : "--"}</p>
                  <p className={`text-[11px] font-mono ${chgColor(val?.changePct as number)}`}>{chg(val?.changePct as number)}</p>
                </div>
              ))}
            </div>

            {(geoData as Record<string, unknown[]>).intel_items && ((geoData as Record<string, unknown[]>).intel_items as Array<Record<string, unknown>>).length > 0 && (
              <div>
                <h3 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-2">Recent Geopolitical Intelligence</h3>
                <div className="space-y-1">
                  {((geoData as Record<string, unknown[]>).intel_items as Array<Record<string, unknown>>).map((item) => (
                    <a key={item.id as string} href={item.original_url as string} target="_blank" rel="noopener noreferrer" className="block px-3 py-1.5 bg-[#141820] border border-[#1E2A3A]/50 rounded-sm hover:bg-[#1A2030] text-[13px] text-[#E8EAED]">
                      {item.title as string}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* EARNINGS TAB */}
        {activeTab === "earnings" && earningsData && (
          <div className="space-y-2">
            {((earningsData as Record<string, unknown[]>).earnings as Array<Record<string, unknown>> || []).map((e) => (
              <div key={e.ticker as string} className="bg-[#141820] border border-[#1E2A3A] rounded-sm px-3 py-2 flex items-center gap-4">
                <span className="text-[14px] font-mono font-bold text-[#E8EAED] w-12">{e.ticker as string}</span>
                <span className="text-[12px] text-[#8899AA] flex-1">{e.display_name as string}</span>
                <span className="text-[12px] font-mono text-[#E8EAED]">{(e.date as string) || "TBD"}</span>
                {e.days_until != null && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${(e.days_until as number) <= 3 ? "bg-[#FF4444]/10 text-[#FF4444]" : "bg-[#5A6A7A]/10 text-[#5A6A7A]"}`}>
                    {(e.days_until as number) === 0 ? "TODAY" : (e.days_until as number) === 1 ? "TOMORROW" : `in ${e.days_until} days`}
                  </span>
                )}
                {e.eps_estimate != null && (
                  <span className="text-[10px] font-mono text-[#5A6A7A]">Est: ${fmt(e.eps_estimate as number)}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ECONOMIC CALENDAR TAB */}
        {activeTab === "calendar" && (
          <div className="text-center py-8">
            <p className="text-[#5A6A7A] text-sm font-mono">Economic Calendar</p>
            <p className="text-[#5A6A7A] text-[10px] font-mono mt-1">Coming soon - requires economic calendar API integration</p>
          </div>
        )}
      </div>
    </div>
  );
}
