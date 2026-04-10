import type { HealthStatus } from '@/types/outreach';

type StatusVariant = 'on_track' | 'needs_attention' | 'behind' | 'active' | 'paused' | 'draft' | 'completed';

interface StatusIndicatorProps {
  status: StatusVariant | HealthStatus;
  label?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

const statusConfig: Record<
  StatusVariant,
  { color: string; bg: string; label: string }
> = {
  on_track: { color: 'bg-bt-green', bg: 'bg-bt-green-bg', label: 'On Track' },
  active: { color: 'bg-bt-green', bg: 'bg-bt-green-bg', label: 'Active' },
  needs_attention: { color: 'bg-bt-amber', bg: 'bg-bt-amber-bg', label: 'Needs Attention' },
  paused: { color: 'bg-bt-amber', bg: 'bg-bt-amber-bg', label: 'Paused' },
  behind: { color: 'bg-bt-red', bg: 'bg-bt-red-bg', label: 'Behind' },
  draft: { color: 'bg-bt-text-tertiary', bg: 'bg-bt-bg-alt', label: 'Draft' },
  completed: { color: 'bg-bt-blue', bg: 'bg-bt-blue-bg', label: 'Completed' },
};

export default function StatusIndicator({
  status,
  label,
  size = 'md',
  pulse = false,
}: StatusIndicatorProps) {
  const config = statusConfig[status] || statusConfig.draft;
  const displayLabel = label || config.label;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${config.bg}
        ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}
      `}
    >
      <span className="relative flex">
        <span
          className={`
            rounded-full ${config.color}
            ${size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'}
          `}
        />
        {pulse && (
          <span
            className={`
              absolute inset-0 rounded-full ${config.color} opacity-40 animate-ping
            `}
          />
        )}
      </span>
      <span className="text-bt-text">{displayLabel}</span>
    </span>
  );
}
