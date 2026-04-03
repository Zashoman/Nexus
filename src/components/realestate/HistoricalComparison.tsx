'use client';

import { useState } from 'react';

interface CrisisData {
  name: string;
  period: string;
  trigger: string;
  dfmDrop: string;
  priceDrop: string;
  volumeDrop: string;
  timeToBottom: string;
  recoveryTime: string;
  keyDifference: string;
  color: string;
}

const CRISES: CrisisData[] = [
  {
    name: '2008 GFC',
    period: '2008–2009',
    trigger: 'Global financial crisis, Dubai World debt standstill',
    dfmDrop: '~70%',
    priceDrop: '50–60%',
    volumeDrop: 'Tx values collapsed from $3B/mo to $250M',
    timeToBottom: '~12 months',
    recoveryTime: '~5 years (full price recovery by 2013)',
    keyDifference: 'Highly leveraged, speculative bubble, oversupply, easy credit defaults',
    color: '#FF4444',
  },
  {
    name: '2014 Oil Crash',
    period: '2014–2019',
    trigger: 'Oil price collapse ($115 → $30), oversupply of housing',
    dfmDrop: '~35%',
    priceDrop: '25–30%',
    volumeDrop: '~20% decline in transaction activity',
    timeToBottom: '~2 years (gradual)',
    recoveryTime: '~5 years (slow grind, recovered by 2019-20)',
    keyDifference: 'Slow correction, not a crash. Supply glut + reduced Gulf liquidity',
    color: '#FF8C00',
  },
  {
    name: '2020 COVID',
    period: 'Mar–Jun 2020',
    trigger: 'Global pandemic, border closures, lockdowns',
    dfmDrop: '~25%',
    priceDrop: '5–10%',
    volumeDrop: 'Sales values –10.4%, volumes –11.7% (full year)',
    timeToBottom: '~8 weeks',
    recoveryTime: '~6 months (V-shaped, exceeded 2019 by 2021)',
    keyDifference: 'External shock, not structural. Borders reopened → instant demand return',
    color: '#FFB020',
  },
  {
    name: '2026 Current',
    period: 'Mar 2026–',
    trigger: 'US-Israel-Iran conflict, regional geopolitical escalation',
    dfmDrop: '–35% in 14 days',
    priceDrop: '5–10% luxury, flat mid-market (so far)',
    volumeDrop: '–35% weekly tx from Feb peak',
    timeToBottom: '~2 weeks (DFM), TBD (physical)',
    recoveryTime: 'TBD — 4 weeks in, DFM stabilizing ~11-12K',
    keyDifference: '87% cash buyers (vs leveraged 2008). 70% end-users. Stock crash ≠ property crash yet.',
    color: '#4488FF',
  },
];

export default function HistoricalComparison() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#5A6A7A]">
            Historical Crisis Comparison
          </span>
          <span className="text-[9px] font-mono text-[#5A6A7A]/60">
            2008 GFC · 2014 Oil · 2020 COVID · 2026 Current
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#4488FF]">
          {expanded ? 'Collapse' : 'Expand'}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Summary bars — peak-to-trough comparison */}
          <div className="space-y-2">
            <div className="text-[9px] font-mono uppercase text-[#5A6A7A] tracking-wider">DFM RE Index Peak-to-Trough Decline</div>
            {CRISES.map(c => {
              const pct = parseInt(c.dfmDrop.replace(/[^0-9]/g, '')) || 0;
              return (
                <div key={c.name} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono w-24 flex-shrink-0" style={{ color: c.color }}>{c.name}</span>
                  <div className="flex-1 h-4 bg-[#0B0E11] rounded-sm overflow-hidden relative">
                    <div
                      className="h-full rounded-sm flex items-center justify-end pr-1.5"
                      style={{ width: `${Math.min(100, pct)}%`, backgroundColor: c.color, opacity: 0.7 }}
                    >
                      <span className="text-[9px] font-mono text-white font-semibold">{c.dfmDrop}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recovery time comparison */}
          <div className="space-y-2">
            <div className="text-[9px] font-mono uppercase text-[#5A6A7A] tracking-wider">Time to Bottom</div>
            {CRISES.map(c => (
              <div key={c.name} className="flex items-center gap-2">
                <span className="text-[10px] font-mono w-24 flex-shrink-0" style={{ color: c.color }}>{c.name}</span>
                <span className="text-[10px] font-mono text-[#E8EAED]">{c.timeToBottom}</span>
                <span className="text-[9px] font-mono text-[#5A6A7A]">→ Recovery: {c.recoveryTime}</span>
              </div>
            ))}
          </div>

          {/* Detail table */}
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-[#1E2A3A]">
                  <th className="text-left p-1.5 text-[#5A6A7A]"></th>
                  {CRISES.map(c => (
                    <th key={c.name} className="text-left p-1.5" style={{ color: c.color }}>{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#1E2A3A]/30">
                  <td className="p-1.5 text-[#5A6A7A]">Trigger</td>
                  {CRISES.map(c => <td key={c.name} className="p-1.5 text-[#8899AA]">{c.trigger}</td>)}
                </tr>
                <tr className="border-b border-[#1E2A3A]/30">
                  <td className="p-1.5 text-[#5A6A7A]">DFM Drop</td>
                  {CRISES.map(c => <td key={c.name} className="p-1.5 text-[#E8EAED]">{c.dfmDrop}</td>)}
                </tr>
                <tr className="border-b border-[#1E2A3A]/30">
                  <td className="p-1.5 text-[#5A6A7A]">Price Drop</td>
                  {CRISES.map(c => <td key={c.name} className="p-1.5 text-[#E8EAED]">{c.priceDrop}</td>)}
                </tr>
                <tr className="border-b border-[#1E2A3A]/30">
                  <td className="p-1.5 text-[#5A6A7A]">Volume</td>
                  {CRISES.map(c => <td key={c.name} className="p-1.5 text-[#8899AA]">{c.volumeDrop}</td>)}
                </tr>
                <tr className="border-b border-[#1E2A3A]/30">
                  <td className="p-1.5 text-[#5A6A7A]">Recovery</td>
                  {CRISES.map(c => <td key={c.name} className="p-1.5 text-[#8899AA]">{c.recoveryTime}</td>)}
                </tr>
                <tr>
                  <td className="p-1.5 text-[#5A6A7A]">Key Factor</td>
                  {CRISES.map(c => <td key={c.name} className="p-1.5 text-[#5A6A7A]">{c.keyDifference}</td>)}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Key insight */}
          <div className="bg-[#0B0E11] rounded-sm p-2.5 border-l-2 border-[#4488FF]">
            <p className="text-[10px] font-mono text-[#8899AA] leading-relaxed">
              <span className="text-[#E8EAED] font-semibold">Key insight:</span> The 2026 DFM index dropped 35% in 14 days — faster than 2008 which took months.
              But the physical property market is behaving more like COVID (5-10% dip, quick stabilization)
              than 2008 (50-60% crash). The difference: 87% cash buyers today vs heavily leveraged in 2008.
              The stock market is pricing in worst-case while the transaction market says otherwise.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
