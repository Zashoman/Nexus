'use client';

import { KPIStat } from '@/types/realestate';

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

export default function KPICard({ stat }: { stat: KPIStat }) {
  const { label, value, changePercent, trend } = stat;

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

  return (
    <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3 min-w-[160px]">
      <div className="text-[10px] uppercase tracking-wider text-[#5A6A7A] font-mono mb-1">
        {label}
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
