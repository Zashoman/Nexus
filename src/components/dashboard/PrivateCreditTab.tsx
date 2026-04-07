"use client";

import { useState, useEffect } from "react";

interface CreditIndexData {
  index: number;
  stage: string;
  sub_level: string;
  stage_name: string;
  direction: string;
  components: Array<{
    key: string;
    name: string;
    series: string;
    value: number | null;
    percentile: number;
    zscore: number;
    weight: number;
  }>;
  ccc_bb_spread: number | null;
  history: Array<{ index_value: number; stage: string; recorded_at: string }>;
}

interface BDCData {
  quotes: Record<string, { name: string; group: string; price: number; change: number; changePct: number; high: number; low: number }>;
  bdc_avg_change: number | null;
}

interface QualSignal {
  signal_key: string;
  signal_label: string;
  is_checked: boolean;
}

const STAGE_COLORS: Record<string, string> = {
  "1": "bg-[#00CC66] text-[#0B0E11]",
  "2": "bg-[#FFD700] text-[#0B0E11]",
  "3": "bg-[#FF8C00] text-[#0B0E11]",
  "4": "bg-[#FF0000] text-white",
};

const DIRECTION_LABELS: Record<string, { text: string; color: string }> = {
  improving: { text: "IMPROVING", color: "text-[#00CC66]" },
  stable: { text: "STABLE", color: "text-[#5A6A7A]" },
  deteriorating: { text: "DETERIORATING", color: "text-[#FF4444]" },
};

function fmt(n: number | null, d = 2): string {
  return n != null ? n.toFixed(d) : "--";
}

export default function PrivateCreditTab() {
  const [indexData, setIndexData] = useState<CreditIndexData | null>(null);
  const [bdcData, setBdcData] = useState<BDCData | null>(null);
  const [qualData, setQualData] = useState<{ signals: QualSignal[]; checked_count: number; warning_level: string } | null>(null);
  const [newsItems, setNewsItems] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [idxRes, bdcRes, qualRes] = await Promise.all([
        fetch("/api/dashboard/credit-index").then(r => r.json()).catch(() => null),
        fetch("/api/dashboard/credit-bdc").then(r => r.json()).catch(() => null),
        fetch("/api/dashboard/credit-qualitative").then(r => r.json()).catch(() => null),
      ]);
      if (idxRes) setIndexData(idxRes);
      if (bdcRes) setBdcData(bdcRes);
      if (qualRes) setQualData(qualRes);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function toggleSignal(signalKey: string, checked: boolean) {
    await fetch("/api/dashboard/credit-qualitative", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signal_key: signalKey, is_checked: checked }),
    });
    // Update local state
    if (qualData) {
      setQualData({
        ...qualData,
        signals: qualData.signals.map(s =>
          s.signal_key === signalKey ? { ...s, is_checked: checked } : s
        ),
        checked_count: qualData.checked_count + (checked ? 1 : -1),
        warning_level: (qualData.checked_count + (checked ? 1 : -1)) >= 5 ? 'red' : (qualData.checked_count + (checked ? 1 : -1)) >= 3 ? 'amber' : 'none',
      });
    }
  }

  if (loading) {
    return <div className="text-xs font-mono text-[#5A6A7A] animate-pulse p-4">Loading credit data...</div>;
  }

  return (
    <div className="space-y-6">

      {/* Section 1: Credit Stress Index */}
      {indexData && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 text-sm font-mono font-bold rounded-sm ${STAGE_COLORS[indexData.stage] || STAGE_COLORS["2"]}`}>
                Stage {indexData.sub_level} - {indexData.stage_name}
              </span>
              <span className={`text-[14px] font-mono font-bold ${DIRECTION_LABELS[indexData.direction]?.color || "text-[#5A6A7A]"}`}>
                {indexData.direction === "deteriorating" ? "DETERIORATING \u2192" : indexData.direction === "improving" ? "\u2190 IMPROVING" : "\u2194 STABLE"}
              </span>
            </div>
            <span className="text-[12px] font-mono text-[#5A6A7A]">Index: {fmt(indexData.index, 1)}</span>
          </div>

          {/* Stage Gauge */}
          <div className="bg-[#0D1117] border border-[#1E2A3A] rounded-sm p-3">
            <div className="flex items-center justify-between text-[8px] font-mono mb-1">
              <span className="text-[#00CC66]">LOW</span>
              <span className="text-[#5A6A7A]">CREDIT STRESS</span>
              <span className="text-[#FF4444]">HIGH</span>
            </div>
            <div className="relative h-6 flex rounded-sm overflow-hidden">
              <div className="w-1/4 bg-[#00CC66]/20" />
              <div className="w-1/4 bg-[#FFD700]/20" />
              <div className="w-1/4 bg-[#FF8C00]/20" />
              <div className="w-1/4 bg-[#FF4444]/20" />
              {/* Needle */}
              <div
                className="absolute top-0 h-full w-0.5 bg-[#E8EAED]"
                style={{ left: `${Math.min(99, Math.max(1, indexData.index))}%` }}
              />
              <div
                className="absolute -top-1 w-3 h-3 bg-[#E8EAED] rotate-45"
                style={{ left: `calc(${Math.min(99, Math.max(1, indexData.index))}% - 6px)`, top: "-2px" }}
              />
            </div>
            <div className="flex justify-between text-[7px] font-mono text-[#5A6A7A] mt-1">
              <span>Stage 1</span><span>Stage 2</span><span>Stage 3</span><span>Stage 4</span>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Component Cards */}
      {indexData && indexData.components.length > 0 && (
        <div>
          <h3 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-2">Components (sorted by deviation)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {indexData.components.map((comp) => {
              const zColor = comp.zscore > 0 ? "text-[#FF4444]" : comp.zscore < 0 ? "text-[#00CC66]" : "text-[#5A6A7A]";
              const barPct = Math.min(100, Math.max(0, (comp.zscore + 3) / 6 * 100));
              return (
                <div key={comp.key} className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[12px] font-mono text-[#E8EAED] font-bold">{comp.name}</p>
                      <p className="text-[8px] font-mono text-[#5A6A7A]">{comp.series} | Weight: {(comp.weight * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                  <p className="text-[20px] font-mono font-bold text-[#E8EAED] mb-2">
                    {comp.value != null ? (comp.value * 100).toFixed(0) : "--"} <span className="text-[11px] text-[#5A6A7A]">bps</span>
                  </p>
                  {/* Deviation Force bar */}
                  <div className="mb-1">
                    <div className="flex items-center justify-between text-[9px] font-mono mb-0.5">
                      <span className="text-[#5A6A7A]">Deviation Force</span>
                      <span className={zColor}>{comp.zscore > 0 ? "+" : ""}{fmt(comp.zscore)}</span>
                    </div>
                    <div className="relative h-2 bg-[#0B0E11] rounded-sm">
                      {/* Center line */}
                      <div className="absolute left-1/2 top-0 h-full w-px bg-[#5A6A7A]/30" />
                      {/* Fill */}
                      {comp.zscore >= 0 ? (
                        <div className="absolute top-0 h-full bg-[#FF4444]/40 rounded-sm" style={{ left: "50%", width: `${Math.min(50, (comp.zscore / 3) * 50)}%` }} />
                      ) : (
                        <div className="absolute top-0 h-full bg-[#00CC66]/40 rounded-sm" style={{ right: "50%", width: `${Math.min(50, (Math.abs(comp.zscore) / 3) * 50)}%` }} />
                      )}
                    </div>
                  </div>
                  <div className="text-[9px] font-mono text-[#5A6A7A]">Percentile: {fmt(comp.percentile, 0)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 3: CCC-BB Divergence */}
      {indexData && indexData.ccc_bb_spread != null && (
        <div className="bg-[#0D1117] border border-[#1E2A3A] rounded-sm p-3">
          <h3 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-2">CCC-BB Spread Divergence</h3>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-[24px] font-mono font-bold text-[#E8EAED]">
              {(indexData.ccc_bb_spread * 100).toFixed(0)}
            </span>
            <span className="text-[12px] font-mono text-[#5A6A7A]">bps</span>
            <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded-sm ${
              indexData.ccc_bb_spread * 100 > 800 ? "bg-[#FF4444]/15 text-[#FF4444]" :
              indexData.ccc_bb_spread * 100 > 500 ? "bg-[#FF8C00]/15 text-[#FF8C00]" :
              indexData.ccc_bb_spread * 100 > 300 ? "bg-[#FFD700]/15 text-[#FFD700]" :
              "bg-[#00CC66]/15 text-[#00CC66]"
            }`}>
              {indexData.ccc_bb_spread * 100 > 800 ? "CRISIS" :
               indexData.ccc_bb_spread * 100 > 500 ? "STRESS" :
               indexData.ccc_bb_spread * 100 > 300 ? "ELEVATED" : "NORMAL"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-mono text-[#5A6A7A]">
            <span>Reference: Normal &lt;300 | Elevated 300-500 | Stress 500-800 | Crisis &gt;800</span>
          </div>
        </div>
      )}

      {/* Section 4: BDC Health */}
      {bdcData && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider">BDC & Leveraged Loan Health</h3>
            {bdcData.bdc_avg_change != null && (
              <span className={`text-[12px] font-mono font-bold ${bdcData.bdc_avg_change >= 0 ? "text-[#00CC66]" : "text-[#FF4444]"}`}>
                BDC Sector: {bdcData.bdc_avg_change >= 0 ? "+" : ""}{fmt(bdcData.bdc_avg_change)}%
              </span>
            )}
          </div>
          <div className="bg-[#0D1117] border border-[#1E2A3A] rounded-sm overflow-hidden">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="border-b border-[#1E2A3A]">
                  <th className="text-left px-3 py-1.5 text-[#5A6A7A]">Ticker</th>
                  <th className="text-left px-3 py-1.5 text-[#5A6A7A]">Name</th>
                  <th className="text-right px-3 py-1.5 text-[#5A6A7A]">Price</th>
                  <th className="text-right px-3 py-1.5 text-[#5A6A7A]">Change</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(bdcData.quotes).map(([symbol, q]) => (
                  <tr key={symbol} className={`border-b border-[#1E2A3A]/30 ${q.changePct < -5 ? "bg-[#FF4444]/5" : ""}`}>
                    <td className="px-3 py-1 text-[#E8EAED] font-bold">{symbol}</td>
                    <td className="px-3 py-1 text-[#8899AA]">{q.name}</td>
                    <td className="px-3 py-1 text-right text-[#E8EAED]">${fmt(q.price)}</td>
                    <td className={`px-3 py-1 text-right ${q.changePct >= 0 ? "text-[#00CC66]" : "text-[#FF4444]"}`}>
                      {q.changePct >= 0 ? "+" : ""}{fmt(q.changePct)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 5: Qualitative Signals */}
      {qualData && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider">Qualitative Signals</h3>
            {qualData.warning_level !== "none" && (
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${
                qualData.warning_level === "red" ? "bg-[#FF4444]/15 text-[#FF4444]" : "bg-[#FF8C00]/15 text-[#FF8C00]"
              }`}>
                {qualData.checked_count}/8 signals active
              </span>
            )}
          </div>
          <div className="space-y-1">
            {qualData.signals.map((signal) => (
              <div key={signal.signal_key} className="flex items-start gap-2 bg-[#141820] border border-[#1E2A3A] rounded-sm px-3 py-2">
                <button
                  onClick={() => toggleSignal(signal.signal_key, !signal.is_checked)}
                  className={`mt-0.5 w-4 h-4 rounded-sm border flex items-center justify-center cursor-pointer flex-shrink-0 ${
                    signal.is_checked
                      ? "bg-[#FF4444] border-[#FF4444] text-white"
                      : "border-[#5A6A7A] text-transparent hover:border-[#8899AA]"
                  }`}
                >
                  {signal.is_checked && <span className="text-[10px]">X</span>}
                </button>
                <span className={`text-[12px] ${signal.is_checked ? "text-[#E8EAED]" : "text-[#8899AA]"}`}>
                  {signal.signal_label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
