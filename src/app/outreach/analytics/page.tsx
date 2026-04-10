'use client';

import { useState } from 'react';
import {
  TrendingUp,
  Mail,
  Send,
  Target,
  Calendar,
} from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card, { CardHeader } from '@/components/outreach/ui/Card';
import MetricCard from '@/components/outreach/ui/MetricCard';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';

type TimeRange = '7d' | '30d' | '90d';

const dateRanges: { id: TimeRange; label: string }[] = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
];

const mockSubjectLines = [
  { subject: 'Exclusive: [Topic] trends your readers need to know', open_rate: 42.3, reply_rate: 8.1, sends: 89 },
  { subject: 'Quick question about guest contributors', open_rate: 38.7, reply_rate: 12.4, sends: 156 },
  { subject: '[Name], unique take on [topic] for [Publication]', open_rate: 36.2, reply_rate: 7.8, sends: 203 },
  { subject: 'Data-backed piece on [topic] — ready to publish', open_rate: 34.1, reply_rate: 6.2, sends: 112 },
  { subject: 'Following up: guest post opportunity', open_rate: 28.4, reply_rate: 4.1, sends: 287 },
];

const mockCampaignPerformance = [
  { name: 'Atera Guest Posts — Q2', type: 'editorial' as const, sent: 234, replies: 33, positive: 16, placements: 8, rate: 14.1 },
  { name: 'BT Sales — Series B Fintech', type: 'sales' as const, sent: 89, replies: 20, positive: 10, placements: 3, rate: 22.5 },
  { name: 'Sponsored Links — Cyber', type: 'sponsored_link' as const, sent: 512, replies: 45, positive: 22, placements: 22, rate: 8.8 },
];

const typeBadge: Record<string, 'info' | 'teal' | 'primary'> = {
  editorial: 'info',
  sales: 'teal',
  sponsored_link: 'primary',
};

export default function AnalyticsPage() {
  const [range, setRange] = useState<TimeRange>('30d');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Performance metrics across all campaigns"
        action={
          <div className="flex items-center gap-1 p-1 bg-bt-bg-alt rounded-lg">
            {dateRanges.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  range === r.id
                    ? 'bg-bt-surface text-bt-text shadow-sm'
                    : 'text-bt-text-secondary hover:text-bt-text'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Top-level metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Sent"
          value="835"
          change={18}
          changeLabel="vs prev period"
          icon={<Send className="w-5 h-5 text-bt-primary" />}
          iconBg="bg-bt-primary-bg"
        />
        <MetricCard
          label="Total Replies"
          value="98"
          change={7}
          changeLabel="vs prev period"
          icon={<Mail className="w-5 h-5 text-bt-blue" />}
          iconBg="bg-bt-blue-bg"
        />
        <MetricCard
          label="Positive Reply Rate"
          value="5.7%"
          change={1.2}
          changeLabel="vs prev period"
          icon={<TrendingUp className="w-5 h-5 text-bt-green" />}
          iconBg="bg-bt-green-bg"
        />
        <MetricCard
          label="Placements / Meetings"
          value="33"
          change={24}
          changeLabel="vs prev period"
          icon={<Target className="w-5 h-5 text-bt-teal" />}
          iconBg="bg-bt-teal-bg"
        />
      </div>

      {/* Charts placeholder + Campaign performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reply rate trend chart placeholder */}
        <Card padding="none">
          <div className="p-5 pb-3">
            <CardHeader
              title="Reply Rate Trend"
              subtitle="Daily positive reply rate over time"
              action={<Button variant="ghost" size="sm" icon={<Calendar className="w-3.5 h-3.5" />}>{range}</Button>}
            />
          </div>
          <div className="px-5 pb-5">
            {/* Chart area — will integrate Recharts in Phase 7 */}
            <div className="h-[240px] rounded-lg bg-bt-bg-alt border border-bt-border border-dashed flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="w-8 h-8 text-bt-text-tertiary mx-auto mb-2" />
                <p className="text-xs text-bt-text-tertiary">Reply rate chart</p>
                <p className="text-[10px] text-bt-text-tertiary mt-0.5">Recharts integration in Phase 7</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Send volume chart placeholder */}
        <Card padding="none">
          <div className="p-5 pb-3">
            <CardHeader
              title="Send Volume"
              subtitle="Daily email volume by campaign"
              action={<Button variant="ghost" size="sm" icon={<Calendar className="w-3.5 h-3.5" />}>{range}</Button>}
            />
          </div>
          <div className="px-5 pb-5">
            <div className="h-[240px] rounded-lg bg-bt-bg-alt border border-bt-border border-dashed flex items-center justify-center">
              <div className="text-center">
                <Send className="w-8 h-8 text-bt-text-tertiary mx-auto mb-2" />
                <p className="text-xs text-bt-text-tertiary">Volume chart</p>
                <p className="text-[10px] text-bt-text-tertiary mt-0.5">Recharts integration in Phase 7</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Campaign performance table */}
      <Card padding="none">
        <div className="p-5 pb-3">
          <CardHeader title="Campaign Performance" subtitle="Breakdown by campaign" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-y border-bt-border">
                <th className="text-left text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-5 py-3">Campaign</th>
                <th className="text-right text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">Sent</th>
                <th className="text-right text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">Replies</th>
                <th className="text-right text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">Positive</th>
                <th className="text-right text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">Reply Rate</th>
                <th className="text-right text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">Results</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bt-border">
              {mockCampaignPerformance.map((c) => (
                <tr key={c.name} className="hover:bg-bt-surface-hover transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-bt-text">{c.name}</span>
                      <Badge variant={typeBadge[c.type]} size="sm">{c.type === 'sponsored_link' ? 'Sponsored' : c.type === 'sales' ? 'Sales' : 'Editorial'}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-bt-text tabular-nums">{c.sent}</td>
                  <td className="px-4 py-3.5 text-right text-sm text-bt-text tabular-nums">{c.replies}</td>
                  <td className="px-4 py-3.5 text-right text-sm text-bt-green font-medium tabular-nums">{c.positive}</td>
                  <td className="px-4 py-3.5 text-right text-sm font-semibold text-bt-text tabular-nums">{c.rate}%</td>
                  <td className="px-4 py-3.5 text-right text-sm font-semibold text-bt-primary tabular-nums">{c.placements}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Subject line leaderboard */}
      <Card padding="none">
        <div className="p-5 pb-3">
          <CardHeader title="Subject Line Performance" subtitle="Top performing subject lines by reply rate" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-y border-bt-border">
                <th className="text-left text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-5 py-3 w-8">#</th>
                <th className="text-left text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">Subject Line</th>
                <th className="text-right text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">Open Rate</th>
                <th className="text-right text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">Reply Rate</th>
                <th className="text-right text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">Sends</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bt-border">
              {mockSubjectLines.map((sl, i) => (
                <tr key={i} className="hover:bg-bt-surface-hover transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-bold text-bt-text-tertiary tabular-nums">{i + 1}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-bt-text">{sl.subject}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-bt-text tabular-nums">{sl.open_rate}%</td>
                  <td className="px-4 py-3.5 text-right text-sm font-semibold text-bt-primary tabular-nums">{sl.reply_rate}%</td>
                  <td className="px-4 py-3.5 text-right text-sm text-bt-text-secondary tabular-nums">{sl.sends}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
