'use client';

import { useEffect, useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  MessageSquareHeart,
  Loader2,
  RefreshCw,
  Brain,
} from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';
import EmptyState from '@/components/outreach/ui/EmptyState';

interface Revision {
  id: string;
  revision_number: number;
  original_draft: string;
  revised_draft: string;
  feedback_text: string;
  persona_name: string | null;
  campaign_name: string | null;
  account_email: string | null;
  sender_email: string | null;
  slack_user_id: string | null;
  created_at: string;
}

interface LearningData {
  total_revisions: number;
  last_week: number;
  last_24h: number;
  recent: Revision[];
}

function formatTime(ts: string): string {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60000);
    const hr = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (min < 1) return 'Just now';
    if (min < 60) return `${min}m ago`;
    if (hr < 24) return `${hr}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

export default function LearningPage() {
  const [data, setData] = useState<LearningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/outreach/learning');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning"
        subtitle="The agent learns from every revision your team makes"
        action={
          <Button variant="secondary" size="sm" onClick={fetchData} loading={loading} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
        }
      />

      {loading && !data && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-bt-primary animate-spin" />
        </div>
      )}

      {data && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-bt-text-secondary uppercase tracking-wider">Total Lessons</p>
                  <p className="text-3xl font-bold text-bt-text mt-2 tabular-nums">{data.total_revisions}</p>
                  <p className="text-xs text-bt-text-tertiary mt-1">All-time team feedback</p>
                </div>
                <div className="p-2.5 rounded-lg bg-bt-primary-bg">
                  <Brain className="w-5 h-5 text-bt-primary" />
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-bt-text-secondary uppercase tracking-wider">This Week</p>
                  <p className="text-3xl font-bold text-bt-text mt-2 tabular-nums">{data.last_week}</p>
                  <p className="text-xs text-bt-text-tertiary mt-1">Revisions in last 7 days</p>
                </div>
                <div className="p-2.5 rounded-lg bg-bt-teal-bg">
                  <TrendingUp className="w-5 h-5 text-bt-teal" />
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-bt-text-secondary uppercase tracking-wider">Last 24h</p>
                  <p className="text-3xl font-bold text-bt-text mt-2 tabular-nums">{data.last_24h}</p>
                  <p className="text-xs text-bt-text-tertiary mt-1">Recent corrections</p>
                </div>
                <div className="p-2.5 rounded-lg bg-bt-green-bg">
                  <MessageSquareHeart className="w-5 h-5 text-bt-green" />
                </div>
              </div>
            </Card>
          </div>

          {/* How it works */}
          <Card>
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-bt-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-bt-text">How learning works</h3>
                <p className="text-xs text-bt-text-secondary mt-1 leading-relaxed">
                  Every time someone replies in a Slack thread to revise a draft, the feedback gets logged here. Before generating any new draft, the agent looks up past feedback for the same campaign and account, and applies those lessons automatically. The more revisions you make, the smarter it gets.
                </p>
              </div>
            </div>
          </Card>

          {/* Recent revisions */}
          <div>
            <h2 className="text-sm font-semibold text-bt-text mb-3">Recent Feedback ({data.recent.length})</h2>

            {data.recent.length === 0 ? (
              <EmptyState
                icon={<MessageSquareHeart className="w-8 h-8" />}
                title="No revisions yet"
                description="When your team replies in Slack threads with revision instructions, they'll appear here. Each one teaches the agent how to draft better responses."
              />
            ) : (
              <div className="space-y-3">
                {data.recent.map((rev) => {
                  const isExpanded = expanded.has(rev.id);
                  return (
                    <Card key={rev.id} padding="none">
                      <div className="px-5 py-4">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-3.5 h-3.5 text-bt-primary" />
                              <span className="text-xs font-semibold text-bt-primary">Lesson #{data.total_revisions - data.recent.indexOf(rev)}</span>
                              <span className="text-[10px] text-bt-text-tertiary">·</span>
                              <span className="text-[11px] text-bt-text-tertiary">{formatTime(rev.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {rev.campaign_name && <Badge variant="info" size="sm">{rev.campaign_name}</Badge>}
                              {rev.account_email && <Badge variant="default" size="sm">{rev.account_email}</Badge>}
                              {rev.persona_name && <Badge variant="primary" size="sm">{rev.persona_name}</Badge>}
                              <Badge variant="default" size="sm">Revision #{rev.revision_number}</Badge>
                            </div>
                          </div>
                        </div>

                        {/* The feedback (always visible) */}
                        <div className="bg-bt-primary-bg/30 border border-bt-primary/20 rounded-lg p-3 mb-2">
                          <p className="text-[10px] font-semibold text-bt-primary uppercase tracking-wider mb-1">Team feedback</p>
                          <p className="text-sm text-bt-text leading-relaxed">{rev.feedback_text}</p>
                        </div>

                        {/* Expand button */}
                        <button
                          onClick={() => toggleExpand(rev.id)}
                          className="text-xs text-bt-text-tertiary hover:text-bt-text transition-colors"
                        >
                          {isExpanded ? '↑ Hide drafts' : '↓ Show before / after drafts'}
                        </button>

                        {/* Expanded: original vs revised */}
                        {isExpanded && (
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div>
                              <p className="text-[10px] font-semibold text-bt-text-tertiary uppercase tracking-wider mb-1.5">Before</p>
                              <div className="bg-bt-red-bg/20 border border-bt-red/20 rounded-lg p-3">
                                <p className="text-xs text-bt-text leading-relaxed whitespace-pre-wrap">{rev.original_draft}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-bt-text-tertiary uppercase tracking-wider mb-1.5">After</p>
                              <div className="bg-bt-green-bg/20 border border-bt-green/20 rounded-lg p-3">
                                <p className="text-xs text-bt-text leading-relaxed whitespace-pre-wrap">{rev.revised_draft}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
