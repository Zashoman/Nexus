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
  MessageSquare,
  Hash,
  Zap,
  MessageSquareHeart,
} from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';

interface DashboardData {
  campaigns: Array<{ id: string; name: string; type: string; status: string; created_at: string }>;
  metrics: { pending_approvals: number; emails_sent_today: number; replies_received_today: number };
  reminders: { overdue: number; due_soon: number; upcoming: number };
  instantly: { connected: boolean; campaign_count: number };
  learning: { total_revisions: number; last_week: number };
  slack: SlackActivity;
}

interface SlackActivity {
  connection: { ok: boolean; error?: string; channel?: string; team?: string };
  counts: Record<string, number>;
  revisions_total: number;
  revisions_last_24h: number;
  recent: Array<{
    id: string;
    slack_message_ts: string;
    sender_name: string;
    subject: string;
    campaign_name: string;
    status: string;
    revision_count: number;
    created_at: string;
  }>;
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
  const [slackTesting, setSlackTesting] = useState(false);
  const [slackTestResult, setSlackTestResult] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const emptySlack: SlackActivity = {
        connection: { ok: false },
        counts: {},
        revisions_total: 0,
        revisions_last_24h: 0,
        recent: [],
      };

      const [dashRes, remRes, learnRes, slackRes] = await Promise.all([
        fetch('/api/outreach/dashboard').then((r) => r.json()),
        fetch('/api/outreach/reminders').then((r) => r.json()).catch(() => ({ counts: { overdue: 0, due_soon: 0, upcoming: 0 } })),
        fetch('/api/outreach/learning').then((r) => r.json()).catch(() => ({ total_revisions: 0, last_week: 0 })),
        fetch('/api/outreach/slack/activity').then((r) => r.json()).catch(() => emptySlack),
      ]);

      // Check Instantly
      let instantlyData = { connected: false, campaign_count: 0 };
      try {
        const instRes = await fetch('/api/outreach/instantly/test');
        const inst = await instRes.json();
        instantlyData = { connected: inst.ok, campaign_count: inst.campaign_count || 0 };
      } catch { /* silent */ }

      const slackData: SlackActivity = {
        connection: slackRes.connection || { ok: false },
        counts: slackRes.counts || {},
        revisions_total: slackRes.revisions_total || 0,
        revisions_last_24h: slackRes.revisions_last_24h || 0,
        recent: slackRes.recent || [],
      };

      setData({
        campaigns: dashRes.campaigns || [],
        metrics: dashRes.metrics || { pending_approvals: 0, emails_sent_today: 0, replies_received_today: 0 },
        reminders: remRes.counts || { overdue: 0, due_soon: 0, upcoming: 0 },
        instantly: instantlyData,
        learning: { total_revisions: learnRes.total_revisions || 0, last_week: learnRes.last_week || 0 },
        slack: slackData,
      });
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const sendSlackTest = async () => {
    setSlackTesting(true);
    setSlackTestResult(null);
    try {
      const res = await fetch('/api/outreach/slack/test');
      const json = await res.json();
      if (json.ok) {
        setSlackTestResult(`Test message sent to #${json.channel || 'slack'} — check the channel.`);
        // Refresh activity to reflect any new state
        setTimeout(fetchDashboard, 800);
      } else {
        setSlackTestResult(`Failed: ${json.error || 'unknown error'}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed';
      setSlackTestResult(`Failed: ${msg}`);
    } finally {
      setSlackTesting(false);
    }
  };

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

      {/* Slack activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-bt-text-secondary" />
            <h2 className="text-sm font-semibold text-bt-text">Slack Activity</h2>
            {data?.slack.connection.ok ? (
              <Badge variant="success" size="sm" dot>Connected</Badge>
            ) : (
              <Badge variant="danger" size="sm" dot>Offline</Badge>
            )}
            {data?.slack.connection.channel && (
              <span className="inline-flex items-center gap-1 text-[11px] text-bt-text-tertiary">
                <Hash className="w-3 h-3" />{data.slack.connection.channel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={sendSlackTest}
              loading={slackTesting}
              icon={<Zap className="w-3.5 h-3.5" />}
            >
              Send test message
            </Button>
            <Link href="/outreach/inbox"><Button variant="ghost" size="sm">Push more</Button></Link>
          </div>
        </div>
        {slackTestResult && (
          <div className={`mb-3 text-[11px] px-3 py-2 rounded-md ${slackTestResult.startsWith('Failed') ? 'bg-bt-red-bg/50 text-bt-red' : 'bg-bt-green-bg/50 text-bt-green'}`}>
            {slackTestResult}
          </div>
        )}

        <Card padding="none">
          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-bt-border">
            <div className="px-5 py-4">
              <p className="text-[10px] text-bt-text-tertiary uppercase tracking-wider">Pending Review</p>
              <p className="text-xl font-bold text-bt-text mt-1 tabular-nums">{data?.slack.counts.pending || 0}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[10px] text-bt-text-tertiary uppercase tracking-wider">Approved</p>
              <p className="text-xl font-bold text-bt-text mt-1 tabular-nums">{data?.slack.counts.approved || 0}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[10px] text-bt-text-tertiary uppercase tracking-wider">Sent</p>
              <p className="text-xl font-bold text-bt-text mt-1 tabular-nums">{data?.slack.counts.sent || 0}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[10px] text-bt-text-tertiary uppercase tracking-wider">Thread Lessons</p>
              <p className="text-xl font-bold text-bt-text mt-1 tabular-nums">{data?.slack.revisions_total || 0}</p>
              <p className="text-[10px] text-bt-text-tertiary mt-0.5">{data?.slack.revisions_last_24h || 0} in last 24h</p>
            </div>
          </div>

          {/* Recent drafts */}
          {data?.slack.recent && data.slack.recent.length > 0 ? (
            <div className="divide-y divide-bt-border border-t border-bt-border">
              {data.slack.recent.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-5 py-3 hover:bg-bt-surface-hover transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-bt-text truncate">{d.sender_name || '(unknown sender)'}</p>
                      <span className="text-[11px] text-bt-text-tertiary">·</span>
                      <p className="text-[11px] text-bt-text-secondary truncate">{d.campaign_name}</p>
                    </div>
                    <p className="text-[11px] text-bt-text-tertiary truncate mt-0.5">{d.subject || '(no subject)'}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {d.revision_count > 0 && (
                      <Badge variant="info" size="sm">{d.revision_count} revision{d.revision_count === 1 ? '' : 's'}</Badge>
                    )}
                    <Badge
                      variant={
                        d.status === 'sent' ? 'success'
                        : d.status === 'approved' ? 'teal'
                        : d.status === 'skipped' ? 'default'
                        : d.status === 'snoozed' ? 'warning'
                        : 'primary'
                      }
                      size="sm"
                      dot
                    >
                      {d.status}
                    </Badge>
                    <span className="text-[11px] text-bt-text-tertiary tabular-nums">
                      {new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-t border-bt-border px-5 py-6 text-center">
              <p className="text-xs text-bt-text-secondary">
                No Slack drafts yet. Classify replies in the <Link href="/outreach/inbox" className="text-bt-primary underline">Inbox</Link> and click <strong>Send to Slack</strong>.
              </p>
              {!data?.slack.connection.ok && data?.slack.connection.error && (
                <p className="text-[11px] text-bt-red mt-2">{data.slack.connection.error}</p>
              )}
            </div>
          )}
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
          <Link href="/outreach/demo">
            <Card hover className="text-center py-4">
              <MessageSquareHeart className="w-6 h-6 text-bt-teal mx-auto mb-2" />
              <p className="text-xs font-medium text-bt-text">Demo Hub</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
