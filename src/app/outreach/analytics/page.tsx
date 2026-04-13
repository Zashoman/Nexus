'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Mail,
  Send,
  Target,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card, { CardHeader } from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';

interface AnalyticsData {
  campaigns: Array<{ id: string; name: string; type: string; status: string }>;
  drafts_total: number;
  drafts_approved: number;
  drafts_pending: number;
  revisions_total: number;
  revisions_this_week: number;
  reminders_overdue: number;
  reminders_due_soon: number;
  instantly_connected: boolean;
  instantly_campaigns: number;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [dashRes, learnRes, remRes, instRes] = await Promise.all([
        fetch('/api/outreach/dashboard').then((r) => r.json()).catch(() => ({})),
        fetch('/api/outreach/learning').then((r) => r.json()).catch(() => ({})),
        fetch('/api/outreach/reminders').then((r) => r.json()).catch(() => ({ counts: {} })),
        fetch('/api/outreach/instantly/test').then((r) => r.json()).catch(() => ({ ok: false })),
      ]);

      setData({
        campaigns: dashRes.campaigns || [],
        drafts_total: 0,
        drafts_approved: 0,
        drafts_pending: dashRes.metrics?.pending_approvals || 0,
        revisions_total: learnRes.total_revisions || 0,
        revisions_this_week: learnRes.last_week || 0,
        reminders_overdue: remRes.counts?.overdue || 0,
        reminders_due_soon: remRes.counts?.due_soon || 0,
        instantly_connected: instRes.ok || false,
        instantly_campaigns: instRes.campaign_count || 0,
      });
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 text-bt-primary animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Performance metrics across all campaigns"
        action={<Button variant="secondary" size="sm" onClick={fetchAnalytics} icon={<RefreshCw className="w-3.5 h-3.5" />}>Refresh</Button>}
      />

      {/* Top metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-bt-text-secondary uppercase tracking-wider">Active Campaigns</p>
              <p className="text-2xl font-bold text-bt-text mt-2 tabular-nums">{data?.campaigns.filter((c) => c.status === 'active').length || 0}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-bt-primary-bg"><Target className="w-5 h-5 text-bt-primary" /></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-bt-text-secondary uppercase tracking-wider">Pending Approvals</p>
              <p className="text-2xl font-bold text-bt-text mt-2 tabular-nums">{data?.drafts_pending || 0}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-bt-amber-bg"><Mail className="w-5 h-5 text-bt-amber" /></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-bt-text-secondary uppercase tracking-wider">Agent Revisions</p>
              <p className="text-2xl font-bold text-bt-text mt-2 tabular-nums">{data?.revisions_total || 0}</p>
              <p className="text-xs text-bt-text-tertiary mt-0.5">{data?.revisions_this_week || 0} this week</p>
            </div>
            <div className="p-2.5 rounded-lg bg-bt-green-bg"><TrendingUp className="w-5 h-5 text-bt-green" /></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-bt-text-secondary uppercase tracking-wider">Instantly</p>
              <p className="text-2xl font-bold text-bt-text mt-2 tabular-nums">{data?.instantly_campaigns || 0}</p>
              <p className="text-xs text-bt-text-tertiary mt-0.5">{data?.instantly_connected ? 'Connected' : 'Not connected'}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-bt-teal-bg"><Send className="w-5 h-5 text-bt-teal" /></div>
          </div>
        </Card>
      </div>

      {/* Campaign breakdown */}
      <Card padding="none">
        <div className="p-5 pb-3"><CardHeader title="Campaign Overview" subtitle="All campaigns with current status" /></div>
        {data?.campaigns && data.campaigns.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-y border-bt-border">
                <th className="text-left text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-5 py-3">Campaign</th>
                <th className="text-left text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">Type</th>
                <th className="text-left text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bt-border">
              {data.campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-bt-surface-hover transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-bt-text">{c.name}</td>
                  <td className="px-4 py-3"><Badge variant={c.type === 'sales' ? 'teal' : c.type === 'editorial' ? 'info' : 'primary'} size="sm">{c.type}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={c.status === 'active' ? 'success' : 'default'} size="sm">{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-bt-text-secondary">No campaigns yet</p>
          </div>
        )}
      </Card>

      {/* Reminders status */}
      <Card>
        <CardHeader title="Reminder Health" subtitle="Follow-up tracking" />
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="text-center p-4 rounded-lg bg-bt-red-bg/30 border border-bt-red/10">
            <p className="text-2xl font-bold text-bt-red tabular-nums">{data?.reminders_overdue || 0}</p>
            <p className="text-xs text-bt-text-secondary mt-1">Overdue</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-bt-amber-bg/30 border border-bt-amber/10">
            <p className="text-2xl font-bold text-bt-amber tabular-nums">{data?.reminders_due_soon || 0}</p>
            <p className="text-xs text-bt-text-secondary mt-1">Due This Week</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
