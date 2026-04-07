"use client";

interface YieldPoint {
  label: string;
  value: number | null;
}

interface Props {
  data: YieldPoint[];
}

export default function YieldCurveChart({ data }: Props) {
  const validPoints = data.filter((d) => d.value != null) as { label: string; value: number }[];
  if (validPoints.length < 3) return null;

  const width = 600;
  const height = 160;
  const padding = { top: 15, right: 30, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minY = Math.min(...validPoints.map((p) => p.value)) - 0.3;
  const maxY = Math.max(...validPoints.map((p) => p.value)) + 0.3;
  const rangeY = maxY - minY || 1;

  const points = validPoints.map((d, i) => ({
    x: padding.left + (i / (validPoints.length - 1)) * chartW,
    y: padding.top + chartH - ((d.value - minY) / rangeY) * chartH,
    label: d.label,
    value: d.value,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = pathD + ` L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <div className="bg-[#0D1117] border border-[#1E2A3A] rounded-sm p-3">
      <h4 className="text-[10px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-2">US Treasury Yield Curve</h4>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height }}>
        {/* Grid */}
        {[0.25, 0.5, 0.75].map((frac) => {
          const y = padding.top + chartH * (1 - frac);
          const val = minY + rangeY * frac;
          return (
            <g key={frac}>
              <line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y} stroke="#1E2A3A" strokeWidth={0.5} />
              <text x={padding.left - 5} y={y + 3} fill="#5A6A7A" fontSize="8" fontFamily="monospace" textAnchor="end">{val.toFixed(1)}%</text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="#4488FF" opacity={0.06} />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#4488FF" strokeWidth={2} strokeLinejoin="round" />

        {/* Dots and labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill="#4488FF" />
            <text x={p.x} y={p.y - 8} fill="#E8EAED" fontSize="8" fontFamily="monospace" textAnchor="middle">{p.value.toFixed(2)}</text>
            <text x={p.x} y={height - 5} fill="#5A6A7A" fontSize="7" fontFamily="monospace" textAnchor="middle">{p.label}</text>
          </g>
        ))}

        {/* Axes */}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartH} stroke="#1E2A3A" strokeWidth={0.5} />
        <line x1={padding.left} y1={padding.top + chartH} x2={padding.left + chartW} y2={padding.top + chartH} stroke="#1E2A3A" strokeWidth={0.5} />
      </svg>
    </div>
  );
}
