import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import Card from './Card';

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  iconBg?: string;
}

export default function MetricCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  iconBg = 'bg-bt-primary-bg',
}: MetricCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change !== undefined && change === 0;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-bt-text-secondary uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-bold text-bt-text tabular-nums">
            {value}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1">
              {isPositive && <ArrowUp className="w-3 h-3 text-bt-green" />}
              {isNegative && <ArrowDown className="w-3 h-3 text-bt-red" />}
              {isNeutral && <Minus className="w-3 h-3 text-bt-text-tertiary" />}
              <span
                className={`text-xs font-medium ${
                  isPositive
                    ? 'text-bt-green'
                    : isNegative
                      ? 'text-bt-red'
                      : 'text-bt-text-tertiary'
                }`}
              >
                {isPositive ? '+' : ''}
                {change}%
              </span>
              {changeLabel && (
                <span className="text-xs text-bt-text-tertiary">
                  {changeLabel}
                </span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-2.5 rounded-lg ${iconBg}`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
