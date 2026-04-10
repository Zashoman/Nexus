'use client';

import { Plus, Search, Filter, Megaphone, Pen, Link2, MoreVertical } from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';
import StatusIndicator from '@/components/outreach/ui/StatusIndicator';
import ProgressBar from '@/components/outreach/ui/ProgressBar';
import type { CampaignType, CampaignStatus } from '@/types/outreach';

interface CampaignRow {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  emails_sent: number;
  reply_rate: number;
  positive_rate: number;
  achieved: number;
  target: number;
  metric_label: string;
  team_count: number;
  last_activity: string;
}

const typeIcons: Record<CampaignType, typeof Megaphone> = {
  sales: Megaphone,
  editorial: Pen,
  sponsored_link: Link2,
};

const typeLabels: Record<CampaignType, string> = {
  sales: 'Sales',
  editorial: 'Editorial',
  sponsored_link: 'Sponsored',
};

const typeBadgeVariants: Record<CampaignType, 'primary' | 'info' | 'teal'> = {
  sales: 'teal',
  editorial: 'info',
  sponsored_link: 'primary',
};

const mockCampaigns: CampaignRow[] = [
  {
    id: '1',
    name: 'Atera Guest Posts — Q2',
    type: 'editorial',
    status: 'active',
    emails_sent: 234,
    reply_rate: 14.2,
    positive_rate: 6.8,
    achieved: 8,
    target: 15,
    metric_label: 'placements',
    team_count: 3,
    last_activity: '12 minutes ago',
  },
  {
    id: '2',
    name: 'Blue Tree Sales — Series B Fintech',
    type: 'sales',
    status: 'active',
    emails_sent: 89,
    reply_rate: 22.5,
    positive_rate: 11.2,
    achieved: 3,
    target: 10,
    metric_label: 'meetings',
    team_count: 2,
    last_activity: '45 minutes ago',
  },
  {
    id: '3',
    name: 'Sponsored Links — Cybersecurity',
    type: 'sponsored_link',
    status: 'active',
    emails_sent: 512,
    reply_rate: 8.7,
    positive_rate: 4.3,
    achieved: 22,
    target: 30,
    metric_label: 'placements',
    team_count: 1,
    last_activity: '2 hours ago',
  },
  {
    id: '4',
    name: 'Atera Guest Posts — Q1 (Completed)',
    type: 'editorial',
    status: 'completed',
    emails_sent: 456,
    reply_rate: 16.1,
    positive_rate: 8.3,
    achieved: 14,
    target: 15,
    metric_label: 'placements',
    team_count: 3,
    last_activity: '2 weeks ago',
  },
  {
    id: '5',
    name: 'DevOps SaaS — Cold Outreach',
    type: 'sales',
    status: 'paused',
    emails_sent: 120,
    reply_rate: 5.0,
    positive_rate: 1.7,
    achieved: 1,
    target: 8,
    metric_label: 'meetings',
    team_count: 1,
    last_activity: '5 days ago',
  },
];

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        subtitle="Manage all outreach campaigns"
        action={
          <Button icon={<Plus className="w-4 h-4" />}>New Campaign</Button>
        }
      />

      {/* Filters row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bt-text-tertiary" />
          <input
            type="text"
            placeholder="Search campaigns..."
            className="w-full h-9 pl-9 pr-4 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary focus:border-transparent transition-shadow"
          />
        </div>
        <Button variant="secondary" size="sm" icon={<Filter className="w-3.5 h-3.5" />}>
          Filters
        </Button>
      </div>

      {/* Campaign table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-bt-border">
                <th className="text-left text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-5 py-3">
                  Campaign
                </th>
                <th className="text-left text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-right text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">
                  Sent
                </th>
                <th className="text-right text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">
                  Reply Rate
                </th>
                <th className="text-left text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3 min-w-[180px]">
                  Progress
                </th>
                <th className="text-right text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">
                  Team
                </th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-bt-border">
              {mockCampaigns.map((campaign) => {
                const Icon = typeIcons[campaign.type];
                return (
                  <tr
                    key={campaign.id}
                    className="hover:bg-bt-surface-hover transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-bt-bg-alt shrink-0">
                          <Icon className="w-4 h-4 text-bt-text-secondary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-bt-text">{campaign.name}</p>
                          <Badge variant={typeBadgeVariants[campaign.type]} size="sm">
                            {typeLabels[campaign.type]}
                          </Badge>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusIndicator status={campaign.status} size="sm" />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-medium text-bt-text tabular-nums">
                        {campaign.emails_sent.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div>
                        <span className="text-sm font-medium text-bt-text tabular-nums">
                          {campaign.reply_rate}%
                        </span>
                        <p className="text-[10px] text-bt-text-tertiary tabular-nums">
                          {campaign.positive_rate}% positive
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <ProgressBar
                          value={campaign.achieved}
                          max={campaign.target}
                          color={
                            campaign.achieved / campaign.target >= 0.7
                              ? 'green'
                              : campaign.achieved / campaign.target >= 0.4
                                ? 'amber'
                                : 'red'
                          }
                          size="sm"
                          showLabel
                        />
                        <p className="text-[10px] text-bt-text-tertiary">{campaign.metric_label}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end -space-x-1.5">
                        {Array.from({ length: Math.min(campaign.team_count, 3) }).map((_, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full bg-gradient-to-br from-bt-primary-light to-bt-teal border-2 border-bt-surface flex items-center justify-center text-[9px] font-bold text-white"
                          >
                            {String.fromCharCode(65 + i)}
                          </div>
                        ))}
                        {campaign.team_count > 3 && (
                          <div className="w-6 h-6 rounded-full bg-bt-bg-alt border-2 border-bt-surface flex items-center justify-center text-[9px] font-medium text-bt-text-secondary">
                            +{campaign.team_count - 3}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <button className="p-1 rounded-md text-bt-text-tertiary hover:text-bt-text hover:bg-bt-bg-alt transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
