'use client';

import { useState } from 'react';
import { KPIStat } from '@/types/realestate';

const METRIC_INFO: Record<string, string> = {
  total_transactions: 'Total weekly DLD-registered property transactions including sales, mortgages, and gifts. Source: Dubai REST app / transactions.dubailand.gov.ae',
  offplan_transactions: 'Off-plan (under construction) property sales registered with DLD. High off-plan share signals speculative/investor demand.',
  secondary_transactions: 'Ready/completed property resales. A drop signals reduced end-user and secondary market confidence.',
  mortgage_registrations: 'Weekly mortgage registrations at DLD. Declining mortgages indicate tightening credit or buyer hesitation.',
  total_value_aed_billions: 'Total weekly transaction value in AED billions. Tracks capital flow into Dubai RE market.',
  dfm_re_index: 'Dubai Financial Market Real Estate Index. Tracks listed RE stocks. Sharp drops signal institutional concern. Source: dfm.ae',
  emaar_share_price: 'Emaar Properties share price on DFM (AED). Largest developer — proxy for market sentiment. Source: dfm.ae',
  listing_inventory: 'Approximate active listing count on Bayut and Property Finder. Rising inventory = more sellers entering market.',
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="mt-1">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-flex ml-1 cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-[#5A6A7A] hover:text-[#8899AA] transition-colors">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="5" r="0.75" fill="currentColor" />
      </svg>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-[#1A2332] border border-[#1E2A3A] rounded-sm shadow-lg">
          <p className="text-[10px] font-mono text-[#8899AA] leading-relaxed whitespace-normal">{text}</p>
        </div>
      )}
    </span>
  );
}

export default function KPICard({ stat }: { stat: KPIStat }) {
  const { label, value, changePercent, trend, key } = stat;

  let statusColor = '#5A6A7A';
  let arrow = '';
  if (changePercent != null) {
    if (Math.abs(changePercent) <= 5) {
      statusColor = '#FFB020';
      arrow = changePercent >= 0 ? '\u25B2' : '\u25BC';
    } else if (changePercent > 0) {
      statusColor = '#00CC66';
      arrow = '\u25B2';
    } else {
      statusColor = '#FF4444';
      arrow = '\u25BC';
    }
  }

  const formatValue = (v: number | null) => {
    if (v == null) return '--';
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return v.toLocaleString();
    if (v % 1 !== 0) return v.toFixed(2);
    return v.toLocaleString();
  };

  const info = METRIC_INFO[key];

  return (
    <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3 min-w-[160px]">
      <div className="text-[10px] uppercase tracking-wider text-[#5A6A7A] font-mono mb-1 flex items-center">
        {label}
        {info && <InfoTooltip text={info} />}
      </div>
      <div className="text-xl font-mono font-semibold text-[#E8EAED]">
        {formatValue(value)}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs font-mono" style={{ color: statusColor }}>
          {arrow} {changePercent != null ? `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%` : '--'}
        </span>
        <span className="text-[10px] text-[#5A6A7A] font-mono">vs baseline</span>
      </div>
      <Sparkline data={trend} color={statusColor} />
    </div>
  );
}
