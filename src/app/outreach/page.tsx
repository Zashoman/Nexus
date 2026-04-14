'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Inbox,
  Send,
  Mail,
  TrendingUp,
  Bell,
  Megaphone,
  Loader2,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';
import { apiFetch } from '@/lib/api-client';

interface DashboardData {
  campaigns: Array<{ id: string; name: string; type: string; status: string; created_at: string }>;
  metrics: { pending_approvals: number; emails_sent_today: number; replies_received_today: number };
  reminders: { overdue: number; due_soon: number; upcoming: number };
  instantly: { connected: boolean; campaign_count: number };
  learning: { total_revisions: number; last_week: number };
  slack_drafts: { pending: number; approved: number; sent: number };
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [dashRes, remRes, learnRes] = await Promise.all([
        apiFetch('/api/outreach/dashboard').then((r) => r.json()),
        apiFetch('/api/outreach/reminders').then((r) => r.json()).catch(() => ({ counts: { overdue: 0, due_soon: 0, upcoming: 0 } })),
        apiFetch('/api/outreach/learning').then((r) => r.json()).catch(() => ({ total_revisions: 0, last_week: 0 })),
      ]);

      // Check Instantly
      let instantlyData = { connected: false, campaign_count: 0 };
      try {
        const instRes = await apiFetch('/api/outreach/instantly/test');
        const inst = await instRes.json();
        instantlyData = { connected: inst.ok, campaign_count: inst.campaign_count || 0 };
      } catch { /* silent */ }

      // Check slack drafts
      let slackData = { pending: 0, approved: 0, sent: 0 };
      try {
        const slackRes = await apiFetch('/api/outreach/dashboard');
        const slack = await slackRes.json();
        slackData = {
          pending: slack.metrics?.pending_approvals || 0,
          approved: 0,
          sent: slack.metrics?.emails_sent_today || 0,
        };
      } catch { /* silent */ }

      setData({
        campaigns: dashRes.campaigns || [],
        metrics: dashRes.metrics || { pending_approvals: 0, emails_sent_today: 0, replies_received_today: 0 },
        reminders: remRes.counts || { overdue: 0, due_soon: 0, upcoming: 0 },
        instantly: instantlyData,
        learning: { total_revisions: learnRes.total_revisions || 0, last_week: learnRes.last_week || 0 },
        slack_drafts: slackData,
      });
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-bt-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={getGreeting()}
        subtitle={today}
        action={<Button variant="secondary" size="sm" onClick={fetchDashboard} icon={<RefreshCw className="w-3.5 h-3.5" />}>Refresh</Button>}
      />

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-bt-text-secondary uppercase tracking-wider">Pending Approvals</p>
              <p className="text-2xl font-bold text-bt-text mt-2 tabular-nums">{data?.metrics.pending_approvals || 0}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-bt-primary-bg"><Inbox className="w-5 h-5 text-bt-primary" /></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-bt-text-secondary uppercase tracking-wider">Sent Today</p>
              <p className="text-2xl font-bold text-bt-text mt-2 tabular-nums">{data?.metrics.emails_sent_today || 0}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-bt-teal-bg"><Send className="w-5 h-5 text-bt-teal" /></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-bt-text-secondary uppercase tracking-wider">Replies Today</p>
              <p className="text-2xl font-bold text-bt-text mt-2 tabular-nums">{data?.metrics.replies_received_today || 0}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-bt-blue-bg"><Mail className="w-5 h-5 text-bt-blue" /></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-bt-text-secondary uppercase tracking-wider">Agent Lessons</p>
              <p className="text-2xl font-bold text-bt-text mt-2 tabular-nums">{data?.learning.total_revisions || 0}</p>
              <p className="text-xs text-bt-text-tertiary mt-0.5">{data?.learning.last_week || 0} this week</p>
            </div>
            <div className="p-2.5 rounded-lg bg-bt-green-bg"><TrendingUp className="w-5 h-5 text-bt-green" /></div>
          </div>
        </Card>
      </div>

      {/* Status cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Instantly connection */}
        <Card>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${data?.instantly.connected ? 'bg-bt-green' : 'bg-bt-red'}`} />
            <div>
              <p className="text-sm font-medium text-bt-text">Instantly</p>
              <p className="text-xs text-bt-text-secondary">
                {data?.instantly.connected ? `Connected (${data.instantly.campaign_count} campaigns)` : 'Not connected'}
              </p>
            </div>
          </div>
        </Card>

        {/* Reminders */}
        <Link href="/outreach/reminders">
          <Card hover>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-bt-amber" />
                <div>
                  <p className="text-sm font-medium text-bt-text">Reminders</p>
                  <p className="text-xs text-bt-text-secondary">
                    {(data?.reminders.overdue || 0) > 0
                      ? `${data?.reminders.overdue} overdue`
                      : `${data?.reminders.due_soon || 0} due this week`}
                  </p>
                </div>
              </div>
              {(data?.reminders.overdue || 0) > 0 && (
                <Badge variant="danger" size="sm" dot>{data?.reminders.overdue} overdue</Badge>
              )}
            </div>
          </Card>
        </Link>

        {/* Daily cron status */}
        <Card>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-bt-primary" />
            <div>
              <p className="text-sm font-medium text-bt-text">Daily Summary</p>
              <p className="text-xs text-bt-text-secondary">10:00 AM UK time, every day</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Active campaigns */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-bt-text">Active Campaigns</h2>
          <Link href="/outreach/campaigns"><Button variant="ghost" size="sm">View all</Button></Link>
        </div>
        {data?.campaigns && data.campaigns.length > 0 ? (
          <Card padding="none">
            <div className="divide-y divide-bt-border">
              {data.campaigns.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-bt-surface-hover transition-colors">
                  <div className="flex items-center gap-3">
                    <Megaphone className="w-4 h-4 text-bt-text-tertiary" />
                    <div>
                      <p className="text-sm font-medium text-bt-text">{c.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant={c.type === 'sales' ? 'teal' : c.type === 'editorial' ? 'info' : 'primary'} size="sm">{c.type}</Badge>
                        <Badge variant={c.status === 'active' ? 'success' : c.status === 'draft' ? 'default' : 'warning'} size="sm">{c.status}</Badge>
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-bt-text-tertiary">{new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card>
            <div className="text-center py-8">
              <Megaphone className="w-8 h-8 text-bt-text-tertiary mx-auto mb-2" />
              <p className="text-sm text-bt-text-secondary">No campaigns yet</p>
              <Link href="/outreach/campaigns/new"><Button variant="primary" size="sm" className="mt-3">Create Campaign</Button></Link>
            </div>
          </Card>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-bt-text mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/outreach/inbox/review">
            <Card hover className="text-center py-4">
              <CheckCircle2 className="w-6 h-6 text-bt-green mx-auto mb-2" />
              <p className="text-xs font-medium text-bt-text">Daily Review</p>
            </Card>
          </Link>
          <Link href="/outreach/sales">
            <Card hover className="text-center py-4">
              <Send className="w-6 h-6 text-bt-primary mx-auto mb-2" />
              <p className="text-xs font-medium text-bt-text">Find Prospects</p>
            </Card>
          </Link>
          <Link href="/outreach/inbox">
            <Card hover className="text-center py-4">
              <Inbox className="w-6 h-6 text-bt-blue mx-auto mb-2" />
              <p className="text-xs font-medium text-bt-text">Check Inbox</p>
            </Card>
          </Link>
          <Link href="/outreach/reminders">
            <Card hover className="text-center py-4">
              <AlertTriangle className="w-6 h-6 text-bt-amber mx-auto mb-2" />
              <p className="text-xs font-medium text-bt-text">Reminders ({(data?.reminders.overdue || 0) + (data?.reminders.due_soon || 0)})</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
