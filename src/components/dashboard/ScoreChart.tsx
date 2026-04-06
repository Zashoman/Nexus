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

export default function ScoreChart({ data, maxScore, thresholds, height = 120 }: ScoreChartProps) {
  if (data.length === 0) return null;

  const width = 600;
  const padding = { top: 10, right: 40, bottom: 25, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Sort by date
  const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const points = sorted.map((d, i) => ({
    x: padding.left + (sorted.length === 1 ? chartW / 2 : (i / (sorted.length - 1)) * chartW),
    y: padding.top + chartH - (d.score / maxScore) * chartH,
    score: d.score,
    level: d.level,
    date: d.date,
  }));

  // Build path
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Threshold zones (draw as horizontal bands)
  const zones = thresholds.map((t, i) => {
    const nextVal = i < thresholds.length - 1 ? thresholds[i + 1].value : maxScore;
    const y1 = padding.top + chartH - (nextVal / maxScore) * chartH;
    const y2 = padding.top + chartH - (t.value / maxScore) * chartH;
    return { ...t, y1, y2, height: y2 - y1 };
  });

  return (
    <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-2 mb-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height }}>
        {/* Threshold zones */}
        {zones.map((zone) => (
          <rect
            key={zone.label}
            x={padding.left}
            y={zone.y1}
            width={chartW}
            height={Math.max(zone.height, 1)}
            fill={zone.color}
            opacity={0.08}
          />
        ))}

        {/* Threshold lines */}
        {thresholds.slice(1).map((t) => {
          const y = padding.top + chartH - (t.value / maxScore) * chartH;
          return (
            <g key={t.label}>
              <line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y} stroke={t.color} strokeWidth={0.5} strokeDasharray="4,4" opacity={0.4} />
              <text x={padding.left + chartW + 4} y={y + 3} fill={t.color} fontSize="8" fontFamily="monospace" opacity={0.6}>{t.value}</text>
            </g>
          );
        })}

        {/* Score line */}
        {points.length > 1 && (
          <path d={pathD} fill="none" stroke="#4488FF" strokeWidth={2} />
        )}

        {/* Score dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={i === points.length - 1 ? 5 : 3} fill={i === points.length - 1 ? "#E8EAED" : "#4488FF"} stroke={i === points.length - 1 ? "#4488FF" : "none"} strokeWidth={2} />
            {/* Score label on last point */}
            {i === points.length - 1 && (
              <text x={p.x} y={p.y - 10} fill="#E8EAED" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">{p.score}</text>
            )}
          </g>
        ))}

        {/* Date labels */}
        {points.filter((_, i) => i === 0 || i === points.length - 1 || points.length <= 5).map((p, i) => (
          <text key={i} x={p.x} y={height - 4} fill="#5A6A7A" fontSize="7" fontFamily="monospace" textAnchor="middle">
            {new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </text>
        ))}

        {/* Y axis labels */}
        <text x={padding.left - 8} y={padding.top + 4} fill="#5A6A7A" fontSize="8" fontFamily="monospace" textAnchor="end">{maxScore}</text>
        <text x={padding.left - 8} y={padding.top + chartH + 4} fill="#5A6A7A" fontSize="8" fontFamily="monospace" textAnchor="end">0</text>
      </svg>
    </div>
  );
}
