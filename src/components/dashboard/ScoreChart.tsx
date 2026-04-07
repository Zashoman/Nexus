"use client";

interface ScorePoint {
  date: string;
  score: number;
  level: string;
}

interface ScoreChartProps {
  data: ScorePoint[];
  maxScore: number;
  thresholds: { value: number; color: string; label: string }[];
  height?: number;
}

export default function ScoreChart({ data, maxScore, thresholds, height = 130 }: ScoreChartProps) {
  if (data.length === 0) return null;

  const width = 600;
  const padding = { top: 15, right: 50, bottom: 28, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const points = sorted.map((d, i) => ({
    x: padding.left + (sorted.length === 1 ? chartW / 2 : (i / (sorted.length - 1)) * chartW),
    y: padding.top + chartH - (d.score / maxScore) * chartH,
    score: d.score,
    level: d.level,
    date: d.date,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Fill area under the line
  const areaD = pathD + ` L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <div className="bg-[#0D1117] border border-[#1E2A3A] rounded-sm p-3 mb-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height }}>
        {/* Grid lines - subtle horizontal */}
        {[0.25, 0.5, 0.75].map((frac) => {
          const y = padding.top + chartH * (1 - frac);
          return (
            <line key={frac} x1={padding.left} y1={y} x2={padding.left + chartW} y2={y} stroke="#1E2A3A" strokeWidth={0.5} />
          );
        })}

        {/* Threshold lines - very subtle dashed */}
        {thresholds.slice(1).map((t) => {
          const y = padding.top + chartH - (t.value / maxScore) * chartH;
          return (
            <g key={t.label}>
              <line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y} stroke="#5A6A7A" strokeWidth={0.5} strokeDasharray="3,6" opacity={0.3} />
              <text x={padding.left + chartW + 4} y={y + 3} fill="#5A6A7A" fontSize="8" fontFamily="monospace" opacity={0.5}>{t.label}</text>
            </g>
          );
        })}

        {/* Area fill under line */}
        {points.length > 1 && (
          <path d={areaD} fill="#4488FF" opacity={0.06} />
        )}

        {/* Score line */}
        {points.length > 1 && (
          <path d={pathD} fill="none" stroke="#4488FF" strokeWidth={2} strokeLinejoin="round" />
        )}

        {/* Score dots */}
        {points.map((p, i) => {
          const isLast = i === points.length - 1;
          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isLast ? 4 : 2.5}
                fill={isLast ? "#4488FF" : "#4488FF"}
                opacity={isLast ? 1 : 0.6}
              />
              {isLast && (
                <>
                  <circle cx={p.x} cy={p.y} r={7} fill="none" stroke="#4488FF" strokeWidth={1.5} opacity={0.3} />
                  <text x={p.x} y={p.y - 12} fill="#E8EAED" fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="bold">{p.score}</text>
                </>
              )}
            </g>
          );
        })}

        {/* Date labels */}
        {points.filter((_, i) => i === 0 || i === points.length - 1 || (points.length <= 7 && points.length > 2)).map((p, i) => (
          <text key={i} x={p.x} y={height - 4} fill="#5A6A7A" fontSize="8" fontFamily="monospace" textAnchor="middle">
            {new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </text>
        ))}

        {/* Y axis */}
        <text x={padding.left - 8} y={padding.top + 4} fill="#5A6A7A" fontSize="8" fontFamily="monospace" textAnchor="end">{maxScore}</text>
        <text x={padding.left - 8} y={padding.top + chartH + 4} fill="#5A6A7A" fontSize="8" fontFamily="monospace" textAnchor="end">0</text>
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartH} stroke="#1E2A3A" strokeWidth={0.5} />
        <line x1={padding.left} y1={padding.top + chartH} x2={padding.left + chartW} y2={padding.top + chartH} stroke="#1E2A3A" strokeWidth={0.5} />
      </svg>
    </div>
  );
}
