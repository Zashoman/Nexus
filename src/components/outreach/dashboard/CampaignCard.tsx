'use client';

import Link from 'next/link';
import { Megaphone, Pen, Link2, ArrowRight } from 'lucide-react';
import Card from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import StatusIndicator from '@/components/outreach/ui/StatusIndicator';
import ProgressBar from '@/components/outreach/ui/ProgressBar';
import type { CampaignType, HealthStatus } from '@/types/outreach';

interface CampaignCardProps {
  id: string;
  name: string;
  type: CampaignType;
  health: HealthStatus;
  pending: number;
  achieved: number;
  target: number;
  metric_label: string;
  reply_rate: number;
  days_remaining?: number;
}

const typeIcons: Record<CampaignType, typeof Megaphone> = {
  sales: Megaphone,
  editorial: Pen,
  sponsored_link: Link2,
};

const typeLabels: Record<CampaignType, string> = {
  sales: 'Sales',
  editorial: 'Editorial',
  sponsored_link: 'Sponsored Link',
};

const healthColors: Record<HealthStatus, 'green' | 'amber' | 'red'> = {
  on_track: 'green',
  needs_attention: 'amber',
  behind: 'red',
};

export default function CampaignCard({
  id,
  name,
  type,
  health,
  pending,
  achieved,
  target,
  metric_label,
  reply_rate,
  days_remaining,
}: CampaignCardProps) {
  const Icon = typeIcons[type];

  return (
    <Link href={`/outreach/campaigns/${id}`}>
      <Card hover className="group">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-bt-primary-bg">
                <Icon className="w-4 h-4 text-bt-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-bt-text group-hover:text-bt-primary transition-colors">
                  {name}
                </h3>
                <Badge variant="default" size="sm">{typeLabels[type]}</Badge>
              </div>
            </div>
            <StatusIndicator status={health} size="sm" />
          </div>

          {/* Main metric */}
          <div className="mb-3">
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-2xl font-bold text-bt-text tabular-nums">{achieved}</span>
              <span className="text-sm text-bt-text-tertiary">/ {target}</span>
              <span className="text-xs text-bt-text-tertiary ml-1">{metric_label}</span>
            </div>
            <ProgressBar
              value={achieved}
              max={target}
              color={healthColors[health]}
              size="sm"
            />
          </div>

          {/* Footer stats */}
          <div className="flex items-center justify-between pt-3 border-t border-bt-border">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] text-bt-text-tertiary uppercase tracking-wider">Reply Rate</p>
                <p className="text-sm font-semibold text-bt-text tabular-nums">{reply_rate}%</p>
              </div>
              {days_remaining !== undefined && (
                <div>
                  <p className="text-[10px] text-bt-text-tertiary uppercase tracking-wider">Days Left</p>
                  <p className="text-sm font-semibold text-bt-text tabular-nums">{days_remaining}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {pending > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-bt-primary text-white text-[10px] font-bold tabular-nums">
                  {pending}
                </span>
              )}
              <ArrowRight className="w-4 h-4 text-bt-text-tertiary group-hover:text-bt-primary transition-colors" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
