'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Megaphone, Pen, Link2, MoreVertical } from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';
import StatusIndicator from '@/components/outreach/ui/StatusIndicator';
import EmptyState from '@/components/outreach/ui/EmptyState';
import type { Campaign, CampaignType } from '@/types/outreach';
import { apiFetch } from '@/lib/api-client';

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

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await apiFetch('/api/outreach/campaigns');
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = campaigns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        subtitle="Manage all outreach campaigns"
        action={
          <Link href="/outreach/campaigns/new">
            <Button icon={<Plus className="w-4 h-4" />}>New Campaign</Button>
          </Link>
        }
      />

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bt-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="w-full h-9 pl-9 pr-4 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary focus:border-transparent transition-shadow"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-bt-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && campaigns.length === 0 && (
        <EmptyState
          icon={<Megaphone className="w-8 h-8" />}
          title="No campaigns yet"
          description="Create your first outreach campaign to get started. Choose from editorial, sales, or sponsored link campaigns."
          action={
            <Link href="/outreach/campaigns/new">
              <Button icon={<Plus className="w-4 h-4" />}>Create Campaign</Button>
            </Link>
          }
        />
      )}

      {/* Campaign table */}
      {!loading && filtered.length > 0 && (
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
                  <th className="text-left text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">
                    Sensitivity
                  </th>
                  <th className="text-left text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">
                    Created
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-bt-border">
                {filtered.map((campaign) => {
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
                      <td className="px-4 py-4">
                        <Badge
                          variant={
                            campaign.sensitivity === 'very_high' ? 'danger' :
                            campaign.sensitivity === 'high' ? 'warning' :
                            'default'
                          }
                          size="sm"
                        >
                          {campaign.sensitivity.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm text-bt-text-secondary">
                        {new Date(campaign.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
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
      )}
    </div>
  );
}
