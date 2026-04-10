interface ProgressBarProps {
  value: number;
  max: number;
  color?: 'primary' | 'green' | 'amber' | 'red' | 'teal';
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

const colorStyles: Record<string, string> = {
  primary: 'bg-bt-primary',
  green: 'bg-bt-green',
  amber: 'bg-bt-amber',
  red: 'bg-bt-red',
  teal: 'bg-bt-teal',
};

export default function ProgressBar({
  value,
  max,
  color = 'primary',
  size = 'md',
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-bt-text tabular-nums">
            {value} / {max}
          </span>
          <span className="text-xs text-bt-text-secondary tabular-nums">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div
        className={`
          w-full rounded-full bg-bt-bg-alt overflow-hidden
          ${size === 'sm' ? 'h-1.5' : 'h-2'}
        `}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${colorStyles[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
