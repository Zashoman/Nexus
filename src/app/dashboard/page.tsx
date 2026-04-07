"use client";

import { useState, useEffect } from "react";
import ScoreChart from "@/components/dashboard/ScoreChart";
import HormuzTab from "@/components/dashboard/HormuzTab";
import YieldCurveChart from "@/components/dashboard/YieldCurveChart";
import CreditStressGauge from "@/components/dashboard/CreditStressGauge";
import InfoTip from "@/components/dashboard/InfoTip";
import { TOOLTIPS } from "@/lib/dashboard/tooltips";

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
        {activeTab === "rates" && rates && (() => {
          const r = rates as Record<string, unknown>;
          const yields = r.yields as Record<string, number | null> || {};
          const credit = r.credit as Record<string, unknown> || {};
          const fed = r.fed as Record<string, number | null> || {};
          const fx = r.fx as Record<string, Record<string, number> | null> || {};
          const yieldCurve = (r.yield_curve as { label: string; value: number | null }[]) || [];
          const spread = yields.spread_2s10s;
          const isInverted = spread != null && spread < 0;

          return (
            <div className="space-y-4">
              {/* Score badge */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-sm font-mono font-bold rounded-sm ${THREAT_COLORS[(r.level as string) || "neutral"]}`}>
                  {((r.level as string) || "NEUTRAL").toUpperCase()}
                </span>
                <span className="text-[16px] font-mono font-bold text-[#E8EAED]">{r.score as number}/{r.max_score as number}</span>
              </div>

              {/* Yield Curve Chart */}
              <YieldCurveChart data={yieldCurve} />

              {/* 2s/10s Spread */}
              <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3 flex items-center gap-4">
                <span className="text-[10px] font-mono text-[#5A6A7A]">2s/10s Spread</span>
                <span className={`text-[22px] font-mono font-bold ${isInverted ? "text-[#FF4444]" : "text-[#00CC66]"}`}>
                  {spread != null ? (spread > 0 ? "+" : "") + spread.toFixed(2) + "%" : "--"}
                </span>
                {isInverted && <span className="text-[10px] font-mono bg-[#FF4444]/15 text-[#FF4444] px-1.5 py-0.5 rounded-sm">INVERTED</span>}
              </div>

              {/* Key Rates Table */}
              <div className="bg-[#0D1117] border border-[#1E2A3A] rounded-sm overflow-hidden">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#1E2A3A]">
                      <th className="text-left px-3 py-2 text-[#5A6A7A]">Indicator</th>
                      <th className="text-right px-3 py-2 text-[#5A6A7A]">Current</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "US 2Y Yield", val: yields.us2y, suffix: "%" },
                      { name: "US 10Y Yield", val: yields.us10y, suffix: "%" },
                      { name: "US 30Y Yield", val: yields.us30y, suffix: "%" },
                      { name: "2s/10s Spread", val: spread, suffix: "%" },
                      { name: "Fed Funds Rate", val: fed.funds_rate, suffix: "%" },
                      { name: "HY OAS", val: credit.hy_oas as number | null, suffix: "%" },
                      { name: "BBB OAS", val: credit.bbb_oas as number | null, suffix: "%" },
                      { name: "DXY (UUP)", tip: "DXY", val: (fx.dxy as Record<string, number> | null)?.price, suffix: "" },
                    ].map((row) => (
                      <tr key={row.name} className="border-b border-[#1E2A3A]/50">
                        <td className="px-3 py-1.5 text-[#8899AA]">{row.name}{TOOLTIPS[(row as Record<string, unknown>).tip as string || row.name] && <InfoTip text={TOOLTIPS[(row as Record<string, unknown>).tip as string || row.name]} />}</td>
                        <td className="px-3 py-1.5 text-right text-[#E8EAED] font-bold">{row.val != null ? fmt(row.val) + row.suffix : "--"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Credit Stress Gauge */}
              <CreditStressGauge value={credit.hy_oas as number | null} stressLevel={credit.stress_level as string || "calm"} />

              {/* JGB Placeholder */}
              <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3">
                <p className="text-[10px] font-mono text-[#5A6A7A]">JGB 10Y</p>
                <p className="text-[12px] font-mono text-[#5A6A7A]">Data source pending</p>
              </div>
            </div>
          );
        })()}

        {/* COMMODITIES TAB */}
        {activeTab === "commodities" && commodities && (() => {
          const c = commodities as Record<string, unknown>;
          const quotes = c.quotes as Record<string, Record<string, unknown>> || {};
          const ratios = c.ratios as Record<string, number | null> || {};

          const groups = [
            { label: "ENERGY", symbols: ["USO", "BNO", "UNG"] },
            { label: "PRECIOUS METALS", symbols: ["GLD", "SLV"] },
            { label: "INDUSTRIAL", symbols: ["COPX"] },
            { label: "NUCLEAR", symbols: ["SRUUF"] },
            { label: "AGRICULTURE", symbols: ["WEAT", "CORN"] },
          ];

          return (
            <div className="space-y-4">
              {/* Score badge */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-sm font-mono font-bold rounded-sm ${
                  THREAT_COLORS[(c.level as string) || "neutral"] || "bg-[#5A6A7A] text-[#E8EAED]"
                }`}>
                  {((c.level as string) || "NEUTRAL").toUpperCase().replace("_", " ")}
                </span>
                <span className="text-[16px] font-mono font-bold text-[#E8EAED]">{c.score as number}/{c.max_score as number}</span>
              </div>

              {groups.map((group) => (
                <div key={group.label}>
                  <h4 className="text-[10px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-2">{group.label}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {group.symbols.map((sym) => {
                      const q = quotes[sym];
                      if (!q) return null;
                      return (
                        <div key={sym} className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-2.5">
                          <p className="text-[10px] font-mono text-[#5A6A7A]">{q.name as string}{TOOLTIPS[q.name as string] && <InfoTip text={TOOLTIPS[q.name as string]} />}</p>
                          <p className="text-[9px] font-mono text-[#5A6A7A]/60">{q.displayNote as string}</p>
                          <p className="text-[18px] font-mono font-bold text-[#E8EAED]">${fmt(q.price as number)}</p>
                          <p className={`text-[11px] font-mono ${chgColor(q.changePct as number)}`}>{chg(q.changePct as number)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Ratios */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3">
                  <p className="text-[10px] font-mono text-[#5A6A7A]">Gold/Oil Ratio<InfoTip text={TOOLTIPS["Gold/Oil Ratio"]} /></p>
                  <p className="text-[18px] font-mono font-bold text-[#FFD700]">{ratios.gold_oil || "--"}</p>
                </div>
                <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3">
                  <p className="text-[10px] font-mono text-[#5A6A7A]">Copper/Gold Ratio<InfoTip text={TOOLTIPS["Copper/Gold Ratio"]} /></p>
                  <p className="text-[18px] font-mono font-bold text-[#FF8C00]">{ratios.copper_gold || "--"}</p>
                </div>
              </div>
            </div>
          );
        })()}

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

            {ddData && (ddData as Record<string, Record<string, unknown>>).latest && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { name: "EMHY", value: "emhy_value", score: "emhy_score", baseline: "$39.90", greenT: "Stable", yellowT: "-3-5%", redT: ">-5%" },
                  { name: "BDI", value: "bdi_value", score: "bdi_score", baseline: "1,972", greenT: "<2,500", yellowT: "-15%", redT: "-30%" },
                  { name: "Korea Exports", value: "kr_exports_value", score: "kr_exports_score", baseline: "+29%", greenT: "Positive", yellowT: "Slowing", redT: "Negative" },
                  { name: "China PMI", value: "china_pmi_value", score: "china_pmi_score", baseline: "49.0", greenT: ">50", yellowT: "49-50", redT: "<49" },
                  { name: "WTI", value: "wti_value", score: "wti_score", baseline: "$96-97", greenT: "<$120", yellowT: "$120-130", redT: ">$130" },
                  { name: "Force Majeures", value: "force_majeure_count", score: "force_majeure_score", baseline: "None", greenT: "None", yellowT: "1-2", redT: "3+" },
                  { name: "Jobless Claims", value: "claims_value", score: "claims_score", baseline: "212K", greenT: "<230K", yellowT: "230-260K", redT: ">260K" },
                  { name: "Copper", value: "copper_value", score: "copper_score", baseline: "$5.79", greenT: ">$5.50", yellowT: "-5%", redT: "-10%" },
                  { name: "UMich Sentiment", value: "umich_value", score: "umich_score", baseline: "56.6", greenT: ">55", yellowT: "45-55", redT: "<45" },
                  { name: "Gas Price", value: "gas_price_value", score: "gas_price_score", baseline: "$3.59", greenT: "<$4.50", yellowT: "$4.50-5.50", redT: ">$5.50" },
                ].map((ind) => {
                  const latest = (ddData as Record<string, Record<string, unknown>>).latest as Record<string, unknown>;
                  const s = (latest[ind.score] as number) || 0;
                  const signalColor = s === 0 ? "bg-[#00CC66]" : s === 1 ? "bg-[#FFD700]" : "bg-[#FF4444]";
                  const signalLabel = s === 0 ? "GREEN" : s === 1 ? "YELLOW" : "RED";
                  const signalTextColor = s === 0 ? "text-[#00CC66]" : s === 1 ? "text-[#FFD700]" : "text-[#FF4444]";
                  return (
                    <div key={ind.name} className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-mono text-[#5A6A7A]">{ind.name}{TOOLTIPS[ind.name] && <InfoTip text={TOOLTIPS[ind.name]} />}</span>
                        <span className={`text-[8px] font-mono px-1 py-0 rounded-sm ${signalTextColor} ${signalColor}/15`}>{signalLabel}</span>
                      </div>
                      <p className="text-[14px] font-mono font-bold text-[#E8EAED]">
                        {latest[ind.value] != null ? fmt(latest[ind.value] as number) : "--"}
                      </p>
                      <p className="text-[8px] font-mono text-[#5A6A7A]">Baseline: {ind.baseline}</p>
                      <p className="text-[7px] font-mono text-[#5A6A7A]/60">G: {ind.greenT} | Y: {ind.yellowT} | R: {ind.redT}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Version History Table */}
            {ddData && ((ddData as Record<string, unknown[]>).scores as Array<Record<string, unknown>>)?.length > 1 && (
              <div>
                <h4 className="text-[10px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-2">Score History</h4>
                <div className="bg-[#0D1117] border border-[#1E2A3A] rounded-sm overflow-x-auto">
                  <table className="w-full text-[9px] font-mono">
                    <thead>
                      <tr className="border-b border-[#1E2A3A]">
                        <th className="px-2 py-1 text-left text-[#5A6A7A]">Date</th>
                        <th className="px-2 py-1 text-center text-[#5A6A7A]">Score</th>
                        <th className="px-2 py-1 text-center text-[#5A6A7A]">Level</th>
                        {["EMHY","BDI","KR","PMI","WTI","FM","Claims","Cu","UMich","Gas"].map((h) => (
                          <th key={h} className="px-1 py-1 text-center text-[#5A6A7A]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {((ddData as Record<string, unknown[]>).scores as Array<Record<string, unknown>>).slice(0, 10).map((s, i) => {
                        const scoreFields = ["emhy_score","bdi_score","kr_exports_score","china_pmi_score","wti_score","force_majeure_score","claims_score","copper_score","umich_score","gas_price_score"];
                        return (
                          <tr key={i} className="border-b border-[#1E2A3A]/30">
                            <td className="px-2 py-1 text-[#8899AA]">{new Date(s.scored_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                            <td className="px-2 py-1 text-center text-[#E8EAED] font-bold">{s.total_score as number}</td>
                            <td className="px-2 py-1 text-center">{(s.threat_level as string || "").slice(0, 4).toUpperCase()}</td>
                            {scoreFields.map((f) => {
                              const v = (s[f] as number) || 0;
                              const c = v === 0 ? "text-[#00CC66]" : v === 1 ? "text-[#FFD700]" : "text-[#FF4444]";
                              return <td key={f} className={`px-1 py-1 text-center ${c}`}>{v}</td>;
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Score History Chart - at bottom */}
            {ddData && ((ddData as Record<string, unknown[]>).scores as Array<Record<string, unknown>>)?.length > 0 && (
              <div>
                <h4 className="text-[10px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-2">Score Trajectory</h4>
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
          <HormuzTab
            data={hormuzData}
            loading={loading}
            onRescore={() => rescore("hormuz")}
          />
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
                      <p className="text-[9px] font-mono text-[#5A6A7A]">{ind.name}{TOOLTIPS[ind.name + " Score"] && <InfoTip text={TOOLTIPS[ind.name + " Score"]} />}{TOOLTIPS[ind.name] && <InfoTip text={TOOLTIPS[ind.name]} />}</p>
                      <p className="text-[14px] font-mono font-bold text-[#E8EAED]">
                        {latest[ind.value] != null ? fmt(latest[ind.value] as number) : "--"}
                      </p>
                      <p className="text-[9px] font-mono text-[#5A6A7A]">Score: {s}/{ind.max}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Score History Chart - at bottom */}
            {creditData && ((creditData as Record<string, unknown[]>).scores as Array<Record<string, unknown>>)?.length > 0 && (
              <div>
                <h4 className="text-[10px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-2">Score Trajectory</h4>
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
        {activeTab === "geo" && geoData && (() => {
          const g = geoData as Record<string, unknown>;
          const proxies = g.proxies as Record<string, Record<string, number> | null> || {};
          const items = (g.intel_items as Array<Record<string, unknown>>) || [];

          // Group items by day
          const today = new Date().toDateString();
          const yesterday = new Date(Date.now() - 86400000).toDateString();
          const grouped: Record<string, Array<Record<string, unknown>>> = {};
          for (const item of items) {
            const d = new Date(item.published_at as string || item.ingested_at as string).toDateString();
            const label = d === today ? "Today" : d === yesterday ? "Yesterday" : d;
            if (!grouped[label]) grouped[label] = [];
            grouped[label].push(item);
          }

          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-sm font-mono font-bold rounded-sm ${THREAT_COLORS[(g.risk_level as string) || "calm"]}`}>
                  {((g.risk_level as string) || "CALM").toUpperCase()}
                </span>
                <span className="text-[16px] font-mono font-bold text-[#E8EAED]">
                  {g.risk_score as number}/{g.max_score as number}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(proxies).map(([key, val]) => (
                  <div key={key} className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3">
                    <p className="text-[10px] font-mono text-[#5A6A7A] uppercase">{key}{TOOLTIPS[key === "gold" ? "Gold" : key === "wti" ? "WTI Crude Oil" : key === "defense" ? "Defense ETF" : key === "spy" ? "SPY" : "VIX"] && <InfoTip text={TOOLTIPS[key === "gold" ? "Gold" : key === "wti" ? "WTI Crude Oil" : key === "defense" ? "Defense ETF" : key === "spy" ? "SPY" : "VIX"]} />}</p>
                    <p className="text-[18px] font-mono font-bold text-[#E8EAED]">{val?.price != null ? fmt(val.price) : "--"}</p>
                    <p className={`text-[11px] font-mono ${chgColor(val?.changePct)}`}>{chg(val?.changePct)}</p>
                  </div>
                ))}
              </div>

              {Object.keys(grouped).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider">Recent Geopolitical Intelligence</h3>
                  {Object.entries(grouped).map(([day, dayItems]) => (
                    <div key={day}>
                      <p className="text-[9px] font-mono text-[#5A6A7A] mb-1">{day}</p>
                      <div className="space-y-1">
                        {dayItems.map((item) => (
                          <a key={item.id as string} href={item.original_url as string} target="_blank" rel="noopener noreferrer" className="block px-3 py-1.5 bg-[#141820] border border-[#1E2A3A]/50 rounded-sm hover:bg-[#1A2030]">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-mono px-1 py-0 rounded-sm ${
                                item.impact_level === "critical" ? "bg-[#FF4444]/15 text-[#FF4444]" :
                                item.impact_level === "high" ? "bg-[#FF8C00]/15 text-[#FF8C00]" :
                                "bg-[#5A6A7A]/15 text-[#5A6A7A]"
                              }`}>
                                {(item.impact_level as string || "").toUpperCase()}
                              </span>
                              <span className="text-[10px] font-mono text-[#5A6A7A]">{item.source_name as string}</span>
                            </div>
                            <p className="text-[13px] text-[#E8EAED] mt-0.5">{item.title as string}</p>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* EARNINGS TAB */}
        {activeTab === "earnings" && earningsData && (() => {
          const earningsList = (earningsData as Record<string, unknown[]>).earnings as Array<Record<string, unknown>> || [];
          const thisWeek = earningsList.filter((e) => (e.days_until as number) >= 0 && (e.days_until as number) <= 7);

          return (
            <div className="space-y-4">
              {/* Earnings Heat */}
              <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3 flex items-center gap-3">
                <span className="text-[10px] font-mono text-[#5A6A7A]">THIS WEEK:</span>
                {thisWeek.length === 0 ? (
                  <span className="text-[13px] font-mono text-[#5A6A7A]">No holdings reporting this week</span>
                ) : (
                  <span className="text-[16px] font-mono font-bold text-[#FF8C00]">{thisWeek.length} earnings this week</span>
                )}
              </div>

              {/* Earnings list */}
              <div className="space-y-1.5">
                {earningsList.map((e) => (
                  <div key={e.ticker as string} className={`bg-[#141820] border rounded-sm px-3 py-2.5 ${
                    (e.days_until as number) <= 1 ? "border-[#FF4444]/30" : "border-[#1E2A3A]"
                  }`}>
                    <div className="flex items-center gap-4">
                      <span className="text-[15px] font-mono font-bold text-[#E8EAED] w-14">{e.ticker as string}</span>
                      <span className="text-[12px] text-[#8899AA] flex-1">{e.display_name as string}</span>
                      <span className="text-[12px] font-mono text-[#E8EAED]">{(e.date as string) || "TBD"}</span>
                      {e.days_until != null && (
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm ${
                          (e.days_until as number) === 0 ? "bg-[#FF4444]/15 text-[#FF4444] font-bold" :
                          (e.days_until as number) <= 3 ? "bg-[#FF8C00]/10 text-[#FF8C00]" :
                          "bg-[#5A6A7A]/10 text-[#5A6A7A]"
                        }`}>
                          {(e.days_until as number) === 0 ? "TODAY" : (e.days_until as number) === 1 ? "TOMORROW" : `in ${e.days_until} days`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-[9px] font-mono text-[#5A6A7A]">{e.category as string}</span>
                      {e.eps_estimate != null && (
                        <span className="text-[10px] font-mono text-[#5A6A7A]">EPS Est: ${fmt(e.eps_estimate as number)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

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
