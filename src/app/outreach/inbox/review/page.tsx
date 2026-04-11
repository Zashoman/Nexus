'use client';

import { useState, useEffect } from 'react';
import {
  Loader2,
  Send,
  RefreshCw,
  CheckCircle2,
  Mail,
  Sparkles,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';

interface ReviewReply {
  id: string;
  sender_name: string;
  sender_email: string;
  subject: string;
  reply_text: string;
  thread_html?: string;
  campaign_name: string;
  campaign_id: string;
  account_email: string;
  timestamp: string;
  classification: {
    category: string;
    confidence: number;
    summary: string;
    needs_reply: boolean;
    priority: 'high' | 'medium' | 'low' | 'none';
  };
  draft: string;
}

interface BatchData {
  date: string;
  total_emails_fetched: number;
  inbound_replies: number;
  needs_reply: number;
  accounts_pulled_from: string[];
  campaign_names: string[];
  replies: ReviewReply[];
}

const priorityConfig: Record<string, { emoji: string; color: string; badge: 'success' | 'warning' | 'danger' | 'default' }> = {
  high: { emoji: '🔴', color: 'text-bt-red', badge: 'danger' },
  medium: { emoji: '🟡', color: 'text-bt-amber', badge: 'warning' },
  low: { emoji: '⚪', color: 'text-bt-text-tertiary', badge: 'default' },
  none: { emoji: '⚪', color: 'text-bt-text-tertiary', badge: 'default' },
};

const categoryLabels: Record<string, string> = {
  interested: 'Interested',
  meeting_request: 'Meeting Request',
  question: 'Question',
  not_now_later: 'Not Now / Later',
  not_interested: 'Not Interested',
  out_of_office: 'Out of Office',
  auto_reply: 'Auto-reply',
  wrong_person: 'Wrong Person',
  unsubscribe: 'Unsubscribe',
};

function formatTime(ts: string): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return ''; }
}

export default function ReviewPage() {
  const [data, setData] = useState<BatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editedDrafts, setEditedDrafts] = useState<Record<string, string>>({});
  const [pushingToSlack, setPushingToSlack] = useState(false);
  const [slackResult, setSlackResult] = useState<string | null>(null);

  const fetchReview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/outreach/batch-review');
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
        // Initialize edited drafts
        const drafts: Record<string, string> = {};
        json.replies?.forEach((r: ReviewReply) => {
          if (r.draft) drafts[r.id] = r.draft;
        });
        setEditedDrafts(drafts);
      }
    } catch {
      setError('Failed to load review data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReview(); }, []);

  const toggleExclude = (id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const updateDraft = (id: string, text: string) => {
    setEditedDrafts((prev) => ({ ...prev, [id]: text }));
  };

  const actionableReplies = data?.replies.filter((r) => r.classification.needs_reply && r.draft && !excluded.has(r.id)) || [];

  const pushToSlack = async () => {
    if (actionableReplies.length === 0) return;
    setPushingToSlack(true);
    setSlackResult(null);
    try {
      const payload = actionableReplies.map((r) => ({
        id: r.id,
        sender_name: r.sender_name,
        sender_email: r.sender_email,
        subject: r.subject,
        reply_preview: r.reply_text,
        thread_html: r.thread_html || r.reply_text,
        campaign_name: r.campaign_name,
        classification: categoryLabels[r.classification.category] || r.classification.category,
        confidence: r.classification.confidence,
        priority: r.classification.priority,
        ai_summary: r.classification.summary,
        draft_reply: editedDrafts[r.id] || r.draft,
        account_email: r.account_email,
      }));

      const res = await fetch('/api/outreach/slack/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replies: payload,
          accounts: data?.accounts_pulled_from,
          campaigns: data?.campaign_names,
        }),
      });
      const result = await res.json();
      if (result.error) {
        setSlackResult(`Error: ${result.error}`);
      } else {
        setSlackResult(`Sent ${result.sent} replies to #bluetree-ai`);
      }
    } catch {
      setSlackResult('Failed to push to Slack');
    } finally {
      setPushingToSlack(false);
    }
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-bt-primary animate-spin mb-4" />
        <p className="text-sm text-bt-text-secondary">Fetching replies, classifying, and drafting responses...</p>
        <p className="text-xs text-bt-text-tertiary mt-1">This may take 30-60 seconds</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-20">
        <Card>
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 text-bt-red mx-auto mb-3" />
            <p className="text-sm text-bt-red mb-3">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchReview}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const needsReply = data.replies.filter((r) => r.classification.needs_reply);
  const noAction = data.replies.filter((r) => !r.classification.needs_reply);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Daily Review"
        subtitle={today}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={fetchReview} icon={<RefreshCw className="w-3.5 h-3.5" />}>
              Refresh
            </Button>
            {actionableReplies.length > 0 && (
              <Button
                variant="success"
                size="sm"
                onClick={pushToSlack}
                loading={pushingToSlack}
                icon={<Send className="w-3.5 h-3.5" />}
              >
                Send {actionableReplies.length} to Slack
              </Button>
            )}
          </div>
        }
      />

      {/* Slack result */}
      {slackResult && (
        <div className={`flex items-center justify-between px-4 py-3 rounded-lg ${
          slackResult.startsWith('Error') || slackResult.startsWith('Failed')
            ? 'bg-bt-red-bg/50 border border-bt-red/20'
            : 'bg-bt-green-bg/50 border border-bt-green/20'
        }`}>
          <span className="text-sm text-bt-text">{slackResult}</span>
          <button onClick={() => setSlackResult(null)} className="text-xs text-bt-text-tertiary hover:text-bt-text">Dismiss</button>
        </div>
      )}

      {/* Summary card */}
      <Card>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-bt-text tabular-nums">{data.total_emails_fetched}</p>
            <p className="text-[11px] text-bt-text-tertiary mt-0.5">Emails Scanned</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-bt-text tabular-nums">{data.inbound_replies}</p>
            <p className="text-[11px] text-bt-text-tertiary mt-0.5">Inbound Replies</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-bt-green tabular-nums">{data.needs_reply}</p>
            <p className="text-[11px] text-bt-text-tertiary mt-0.5">Need Response</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-bt-text-tertiary tabular-nums">{data.inbound_replies - data.needs_reply}</p>
            <p className="text-[11px] text-bt-text-tertiary mt-0.5">No Action Needed</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-bt-border">
          <span className="text-[11px] text-bt-text-tertiary">Inboxes:</span>
          {data.accounts_pulled_from.map((a) => (
            <Badge key={a} variant="default" size="sm">{a}</Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-[11px] text-bt-text-tertiary">Campaigns:</span>
          {data.campaign_names.map((c) => (
            <Badge key={c} variant="info" size="sm">{c}</Badge>
          ))}
        </div>
      </Card>

      {/* Needs Reply section */}
      {needsReply.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-bt-primary" />
            <h2 className="text-sm font-semibold text-bt-text">Needs Response ({needsReply.length})</h2>
          </div>

          <div className="space-y-3">
            {needsReply.map((reply) => {
              const isExcluded = excluded.has(reply.id);
              const isExpanded = expanded.has(reply.id);
              const pConfig = priorityConfig[reply.classification.priority];
              const currentDraft = editedDrafts[reply.id] || reply.draft;

              return (
                <Card key={reply.id} padding="none" className={isExcluded ? 'opacity-40' : ''}>
                  {/* Header */}
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">{pConfig.emoji}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-bt-text">{reply.sender_name}</p>
                            <Badge variant={pConfig.badge} size="sm">
                              {categoryLabels[reply.classification.category] || reply.classification.category}
                            </Badge>
                            <span className="text-[10px] text-bt-text-tertiary tabular-nums">{Math.round(reply.classification.confidence * 100)}%</span>
                          </div>
                          <p className="text-xs text-bt-text-secondary mt-0.5">{reply.sender_email}</p>
                          <p className="text-xs text-bt-text-tertiary mt-0.5">{reply.subject}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <Badge variant="default" size="sm">{reply.campaign_name}</Badge>
                          <p className="text-[10px] text-bt-text-tertiary mt-1">via {reply.account_email}</p>
                        </div>
                        <button
                          onClick={() => toggleExclude(reply.id)}
                          className={`text-xs px-2 py-1 rounded-md transition-colors ${
                            isExcluded
                              ? 'bg-bt-green-bg text-bt-green hover:bg-bt-green-bg/80'
                              : 'bg-bt-bg-alt text-bt-text-tertiary hover:text-bt-red hover:bg-bt-red-bg/50'
                          }`}
                        >
                          {isExcluded ? 'Include' : 'Skip'}
                        </button>
                      </div>
                    </div>

                    {/* AI Summary */}
                    <div className="mt-3 flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-bt-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-bt-primary">{reply.classification.summary}</p>
                    </div>
                  </div>

                  {/* Expandable detail */}
                  <div className="border-t border-bt-border">
                    <button
                      onClick={() => toggleExpand(reply.id)}
                      className="w-full flex items-center justify-between px-5 py-2.5 text-xs text-bt-text-secondary hover:bg-bt-surface-hover transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3" />
                        Their reply + AI draft
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && !isExcluded && (
                      <div className="px-5 pb-5 space-y-4">
                        {/* Their reply */}
                        <div>
                          <p className="text-[10px] font-semibold text-bt-text-tertiary uppercase tracking-wider mb-1.5">Their Reply</p>
                          <div className="bg-bt-bg-alt rounded-lg p-3 border-l-2 border-bt-text-tertiary">
                            <p className="text-sm text-bt-text leading-relaxed">{reply.reply_text}</p>
                          </div>
                          <p className="text-[10px] text-bt-text-tertiary mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatTime(reply.timestamp)}
                          </p>
                        </div>

                        {/* Editable draft */}
                        <div>
                          <p className="text-[10px] font-semibold text-bt-teal uppercase tracking-wider mb-1.5">Suggested Reply</p>
                          <textarea
                            value={currentDraft}
                            onChange={(e) => updateDraft(reply.id, e.target.value)}
                            rows={Math.max(4, currentDraft.split('\n').length + 1)}
                            className="w-full px-3 py-2.5 rounded-lg border border-bt-teal/30 bg-bt-teal/5 text-sm text-bt-text leading-relaxed focus:outline-none focus:ring-2 focus:ring-bt-teal/50 resize-y"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* No action section */}
      {noAction.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-bt-text-tertiary mb-3">No Action Needed ({noAction.length})</h2>
          <Card padding="none">
            <div className="divide-y divide-bt-border">
              {noAction.map((reply) => (
                <div key={reply.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-bt-text-tertiary">⚪</span>
                    <div className="min-w-0">
                      <p className="text-sm text-bt-text-secondary truncate">{reply.sender_name} — {reply.sender_email}</p>
                      <p className="text-xs text-bt-text-tertiary truncate">{reply.classification.summary}</p>
                    </div>
                  </div>
                  <Badge variant="default" size="sm">{categoryLabels[reply.classification.category] || reply.classification.category}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Bottom send bar */}
      {actionableReplies.length > 0 && (
        <div className="sticky bottom-0 bg-bt-bg/90 backdrop-blur-sm border-t border-bt-border -mx-6 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-bt-text">
                {actionableReplies.length} replies ready to send to <span className="text-bt-primary">#bluetree-ai</span>
              </p>
              <p className="text-xs text-bt-text-tertiary">
                {excluded.size > 0 && `${excluded.size} skipped · `}
                Drafts are editable above
              </p>
            </div>
            <Button
              variant="success"
              size="lg"
              onClick={pushToSlack}
              loading={pushingToSlack}
              icon={<Send className="w-4 h-4" />}
            >
              Send to Slack
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
