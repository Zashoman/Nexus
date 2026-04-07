"use client";

import ScoreChart from "./ScoreChart";

interface HormuzScore {
  id: string;
  total_score: number;
  thesis_level: string;
  scenario_classification: string;
  transit_value: string; transit_rating: string; transit_score: number;
  mine_status: string; mine_rating: string; mine_score: number;
  brent_value: number; brent_rating: string; brent_score: number;
  vlcc_value: string; vlcc_rating: string; vlcc_score: number;
  ttf_value: number; ttf_rating: string; ttf_score: number;
  dxy_value: number; dxy_rating: string; dxy_score: number;
  fed_status: string; fed_rating: string; fed_score: number;
  storage_days: number; storage_rating: string; storage_score: number;
  stagflation_status: string; stagflation_rating: string; stagflation_score: number;
  diplomatic_status: string; diplomatic_rating: string; diplomatic_score: number;
  iea_spr_status: string; iea_spr_rating: string; iea_spr_score: number;
  scenario_a_pct: number;
  scenario_b_pct: number;
  scenario_c_pct: number;
  scenario_d_pct: number;
  green_count: number;
  yellow_count: number;
  red_count: number;
  upgraded_count: number;
  downgraded_count: number;
  ai_assessment: string;
  ai_key_change: string;
  ai_watch_next: string;
  conviction_level: string;
  day_of_crisis: number;
  scored_at: string;
}

interface Props {
  data: { latest: HormuzScore | null; scores: HormuzScore[] } | Record<string, unknown> | null;
  loading: boolean;
  onRescore: () => void;
}

const THESIS_COLORS: Record<string, string> = {
  intact: "bg-[#00CC66] text-[#0B0E11]",
  holding: "bg-[#FFD700] text-[#0B0E11]",
  weakening: "bg-[#FF8C00] text-[#0B0E11]",
  broken: "bg-[#FF0000] text-white",
};

const CONVICTION_COLORS: Record<string, string> = {
  maximum: "text-[#00CC66]",
  high: "text-[#00CC66]",
  moderate: "text-[#FFD700]",
  low: "text-[#FF8C00]",
  broken: "text-[#FF0000]",
};

const RATING_BADGE: Record<string, string> = {
  green: "bg-[#00CC66]/15 text-[#00CC66]",
  yellow: "bg-[#FFD700]/15 text-[#FFD700]",
  red: "bg-[#FF4444]/15 text-[#FF4444]",
};

const SIGNALS = [
  { key: "transit", name: "Tanker Transit Count", star: true, greenDesc: "<30/day", yellowDesc: "30-60/day", redDesc: ">60/day", maxScore: 6 },
  { key: "mine", name: "Mine Status", star: false, greenDesc: "Mines confirmed", yellowDesc: "Clearance begins", redDesc: "Mines cleared", maxScore: 5 },
  { key: "brent", name: "Brent Crude", star: false, greenDesc: ">$100", yellowDesc: "$85-100", redDesc: "<$75", maxScore: 5 },
  { key: "vlcc", name: "VLCC Rates (TD3C)", star: false, greenDesc: ">$200K/day", yellowDesc: "$100-200K", redDesc: "<$100K", maxScore: 4 },
  { key: "ttf", name: "TTF European Gas", star: false, greenDesc: ">74 EUR", yellowDesc: "47-74 EUR", redDesc: "<40 EUR", maxScore: 4 },
  { key: "dxy", name: "DXY Dollar Index", star: false, greenDesc: ">103", yellowDesc: "98-103", redDesc: "<95", maxScore: 3 },
  { key: "fed", name: "Fed Rhetoric", star: false, greenDesc: "Holds/hikes", yellowDesc: "Data dependent", redDesc: "Emergency cuts", maxScore: 3 },
  { key: "storage", name: "Gulf Storage / Day Count", star: false, greenDesc: "Past Day 25", yellowDesc: "Days 15-25", redDesc: "Pre-Day 25", maxScore: 5 },
  { key: "stagflation", name: "Stagflation Signal", star: false, greenDesc: "Oil up + weak econ", yellowDesc: "S&P -5%, oil flat", redDesc: "Oil falling", maxScore: 4 },
  { key: "diplomatic", name: "Diplomatic Status", star: false, greenDesc: "No ceasefire", yellowDesc: "Back-channel talks", redDesc: "Ceasefire confirmed", maxScore: 4 },
  { key: "iea_spr", name: "IEA/SPR Response", star: false, greenDesc: "No release", yellowDesc: "Release suppressing", redDesc: "Supply restored", maxScore: 3 },
];

const RULES = [
  "Daily transit count is the ONLY signal. Everything else is downstream.",
  "NEVER add TLT in inflationary supply shock. Yields ROSE on strikes.",
  "Tankers are a TRADE, not a hold. Trailing stops. Trim if VLCC -20%+.",
  "Dollar hedge is uncrowded. Don't abandon early.",
  "TRACK ACTIONS, NOT WORDS. Physical reality != headlines.",
  "MINES = STRUCTURAL DURATION. Even if ceasefire, wait for actual transit recovery.",
  "Volatility is TWO-DIRECTIONAL. Limit orders only. Scale in/out.",
];

export default function HormuzTab({ data, loading, onRescore }: Props) {
  const typedData = data as { latest: HormuzScore | null; scores: HormuzScore[] } | null;
  const latest = typedData?.latest;
  const scores = typedData?.scores || [];

  if (!latest && !loading) {
    return (
      <div className="text-center py-8">
        <p className="text-[#5A6A7A] text-sm font-mono">No Hormuz risk scores yet.</p>
        <button onClick={onRescore} className="mt-2 px-4 py-2 text-xs font-mono bg-[#4488FF] text-white rounded-sm cursor-pointer">
          Run First Score
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Day Counter */}
      <div className="text-center py-2">
        <p className="text-[28px] font-mono font-bold text-[#FF8C00]">
          DAY {latest?.day_of_crisis || "?"} OF HORMUZ CRISIS
        </p>
        <p className="text-[10px] font-mono text-[#5A6A7A]">Since February 28, 2026</p>
      </div>

      {/* Thesis + Conviction + Rescore */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {latest && (
            <>
              <span className={`px-3 py-1.5 text-sm font-mono font-bold rounded-sm ${THESIS_COLORS[latest.thesis_level] || THESIS_COLORS.holding}`}>
                THESIS {latest.thesis_level.toUpperCase()}
              </span>
              <span className="text-[18px] font-mono font-bold text-[#E8EAED]">
                {latest.total_score}/46
              </span>
              <span className={`text-[12px] font-mono ${CONVICTION_COLORS[latest.conviction_level] || "text-[#5A6A7A]"}`}>
                {latest.conviction_level?.toUpperCase()} CONVICTION
              </span>
            </>
          )}
        </div>
        <button onClick={onRescore} disabled={loading} className="text-[10px] font-mono text-[#4488FF] hover:text-[#6699FF] cursor-pointer">
          {loading ? "Scoring..." : "Rescore Now"}
        </button>
      </div>

      {/* Signal Summary */}
      {latest && (
        <div className="text-[11px] font-mono text-[#8899AA] bg-[#0D1117] px-3 py-1.5 rounded-sm">
          {latest.green_count}/11 Green, {latest.yellow_count}/11 Yellow, {latest.red_count}/11 Red
          {latest.upgraded_count > 0 && <span className="text-[#00CC66] ml-2">{latest.upgraded_count} upgraded</span>}
          {latest.downgraded_count > 0 && <span className="text-[#FF4444] ml-2">{latest.downgraded_count} downgraded</span>}
        </div>
      )}

      {/* 11 Signal Cards */}
      {latest && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {SIGNALS.map((sig) => {
            const rating = (latest as unknown as Record<string, unknown>)[`${sig.key}_rating`] as string || "yellow";
            const value = (latest as unknown as Record<string, unknown>)[sig.key === "mine" ? "mine_status" : sig.key === "fed" ? "fed_status" : sig.key === "stagflation" ? "stagflation_status" : sig.key === "diplomatic" ? "diplomatic_status" : sig.key === "iea_spr" ? "iea_spr_status" : sig.key === "storage" ? "storage_days" : sig.key === "transit" ? "transit_value" : sig.key === "vlcc" ? "vlcc_value" : `${sig.key}_value`];
            const score = (latest as unknown as Record<string, unknown>)[`${sig.key}_score`] as number || 0;

            return (
              <div key={sig.key} className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-[#8899AA]">
                    {sig.star && <span className="text-[#FFD700] mr-1">*</span>}
                    {sig.name}
                  </span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm ${RATING_BADGE[rating] || RATING_BADGE.yellow}`}>
                    {rating.toUpperCase()}
                  </span>
                </div>
                <p className="text-[15px] font-mono font-bold text-[#E8EAED] mb-1">
                  {value != null ? String(value) : "--"}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-mono text-[#5A6A7A]">
                    G: {sig.greenDesc} | Y: {sig.yellowDesc} | R: {sig.redDesc}
                  </span>
                  <span className="text-[9px] font-mono text-[#5A6A7A]">{score}/{sig.maxScore}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Scenario Probabilities */}
      {latest && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider">Scenario Probabilities</h3>
          {[
            { key: "a", label: "A: Extended Closure (2+ months)", pct: latest.scenario_a_pct, color: "#00CC66" },
            { key: "b", label: "B: Partial Closure (4-8 weeks)", pct: latest.scenario_b_pct, color: "#FFD700" },
            { key: "c", label: "C: Quick Resolution (<3 weeks)", pct: latest.scenario_c_pct, color: "#FF8C00" },
            { key: "d", label: "D: Escalation / Black Swan", pct: latest.scenario_d_pct, color: "#FF4444" },
          ].map((s) => (
            <div key={s.key} className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-[#8899AA] w-[220px]">{s.label}</span>
              <div className="flex-1 h-3 bg-[#0D1117] rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all" style={{ width: `${s.pct}%`, backgroundColor: s.color, opacity: 0.6 }} />
              </div>
              <span className="text-[12px] font-mono font-bold text-[#E8EAED] w-10 text-right">{s.pct}%</span>
            </div>
          ))}
        </div>
      )}

      {/* AI Assessment */}
      {latest && latest.ai_assessment && (
        <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3 space-y-2">
          <h3 className="text-[11px] font-mono text-[#4488FF] uppercase tracking-wider">AI Assessment</h3>
          <p className="text-[13px] text-[#E8EAED]/90 leading-relaxed">{latest.ai_assessment}</p>
          {latest.ai_key_change && (
            <p className="text-[12px] text-[#FF8C00]"><span className="font-bold">Key Change:</span> {latest.ai_key_change}</p>
          )}
          {latest.ai_watch_next && (
            <p className="text-[12px] text-[#FFD700]"><span className="font-bold">Watch Next 48-72h:</span> {latest.ai_watch_next}</p>
          )}
        </div>
      )}

      {/* Non-Negotiable Rules */}
      <div className="bg-[#0D1117] border border-[#FF8C00]/20 rounded-sm p-3">
        <h3 className="text-[10px] font-mono text-[#FF8C00] uppercase tracking-wider mb-2">Non-Negotiable Rules</h3>
        <div className="space-y-1">
          {RULES.map((rule, i) => (
            <p key={i} className="text-[11px] text-[#8899AA] leading-relaxed">
              <span className="text-[#FF8C00] font-bold mr-1">{i + 1}.</span> {rule}
            </p>
          ))}
        </div>
      </div>

      {/* Score History Chart - at bottom */}
      {scores.length > 0 && (
        <div>
          <h3 className="text-[11px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-2">Score Trajectory</h3>
          <ScoreChart
            data={scores.map((s) => ({ date: s.scored_at, score: s.total_score, level: s.thesis_level }))}
            maxScore={46}
            thresholds={[
              { value: 0, color: "#FF0000", label: "Broken" },
              { value: 15, color: "#FF8C00", label: "Weakening" },
              { value: 25, color: "#FFD700", label: "Holding" },
              { value: 36, color: "#00CC66", label: "Intact" },
            ]}
          />
        </div>
      )}
    </div>
  );
}
