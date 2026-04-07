"use client";

interface Props {
  value: number | null;
  stressLevel: string;
}

export default function CreditStressGauge({ value, stressLevel }: Props) {
  if (value == null) return null;

  const bps = Math.round(value * 100);
  const maxBps = 1000;
  const pct = Math.min((bps / maxBps) * 100, 100);

  const zones = [
    { label: "CALM", start: 0, end: 35, color: "#00CC66" },
    { label: "ELEVATED", start: 35, end: 50, color: "#FFD700" },
    { label: "STRESS", start: 50, end: 80, color: "#FF8C00" },
    { label: "CRISIS", start: 80, end: 100, color: "#FF4444" },
  ];

  return (
    <div className="bg-[#0D1117] border border-[#1E2A3A] rounded-sm p-3">
      <h4 className="text-[10px] font-mono text-[#5A6A7A] uppercase tracking-wider mb-2">HY Credit Stress</h4>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-[24px] font-mono font-bold text-[#E8EAED]">{bps}</span>
        <span className="text-[12px] font-mono text-[#5A6A7A]">bps</span>
        <span className={`text-[11px] font-mono font-bold ml-2 px-1.5 py-0.5 rounded-sm ${
          stressLevel === 'crisis' ? 'bg-[#FF4444]/15 text-[#FF4444]' :
          stressLevel === 'stress' ? 'bg-[#FF8C00]/15 text-[#FF8C00]' :
          stressLevel === 'elevated' ? 'bg-[#FFD700]/15 text-[#FFD700]' :
          'bg-[#00CC66]/15 text-[#00CC66]'
        }`}>
          {stressLevel.toUpperCase()}
        </span>
      </div>

      {/* Gauge bar */}
      <div className="relative h-4 rounded-sm overflow-hidden">
        <div className="absolute inset-0 flex">
          {zones.map((z) => (
            <div
              key={z.label}
              className="h-full"
              style={{ width: `${z.end - z.start}%`, backgroundColor: z.color, opacity: 0.15 }}
            />
          ))}
        </div>
        {/* Needle */}
        <div
          className="absolute top-0 h-full w-0.5 bg-[#E8EAED]"
          style={{ left: `${pct}%` }}
        />
        <div
          className="absolute -top-1 w-2 h-2 bg-[#E8EAED] rounded-full"
          style={{ left: `calc(${pct}% - 4px)` }}
        />
      </div>

      <div className="flex justify-between mt-1">
        {zones.map((z) => (
          <span key={z.label} className="text-[7px] font-mono" style={{ color: z.color, opacity: 0.6 }}>{z.label}</span>
        ))}
      </div>
    </div>
  );
}
