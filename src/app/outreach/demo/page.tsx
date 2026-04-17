'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Target,
  PenTool,
  Inbox,
  Brain,
  Bell,
  Database,
  BarChart3,
  Star,
  Send,
  Check,
  ExternalLink,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card, { CardHeader } from '@/components/outreach/ui/Card';
import Button from '@/components/outreach/ui/Button';

interface FeatureSpec {
  key: string;
  label: string;
  href: string;
  icon: typeof Target;
  pitch: string;
  slack_moment?: string;
}

const features: FeatureSpec[] = [
  {
    key: 'sales',
    label: 'Prospect Search',
    href: '/outreach/sales',
    icon: Target,
    pitch: 'Apollo-powered prospect discovery with natural-language queries and AI-generated personalized openers.',
  },
  {
    key: 'pitch-studio',
    label: 'Pitch Studio',
    href: '/outreach/pitch-studio',
    icon: PenTool,
    pitch: 'Review AI-drafted pitches with quick chips (shorter / warmer / stronger CTA). Vocabulary enforcement blocks spam phrases.',
  },
  {
    key: 'inbox',
    label: 'Inbox Intelligence',
    href: '/outreach/inbox',
    icon: Inbox,
    pitch: 'Classify Instantly replies, draft responses, and push to Slack for team review.',
    slack_moment: 'This is where the Slack loop starts — click "Send to Slack" and watch the channel light up.',
  },
  {
    key: 'learning',
    label: 'Learning Loop',
    href: '/outreach/learning',
    icon: Brain,
    pitch: 'Every thread reply in Slack is captured as a durable lesson. Before/after diffs show exactly what the team corrected.',
    slack_moment: 'Reply in the Slack thread, refresh this page, and watch the lesson appear.',
  },
  {
    key: 'reminders',
    label: 'Reminders',
    href: '/outreach/reminders',
    icon: Bell,
    pitch: 'Auto-detected follow-ups ("reach out in 6 months") plus manual reminders. Nothing falls through the cracks.',
  },
  {
    key: 'training',
    label: 'Training Engine',
    href: '/outreach/training',
    icon: Database,
    pitch: 'Pattern extraction across historical Instantly emails — which subject lines + openers actually get replies.',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    href: '/outreach/analytics',
    icon: BarChart3,
    pitch: 'One-screen scorecard: campaigns, approvals, revisions, reminder health, Instantly sync.',
  },
];

interface FeedbackRow {
  id: string;
  feature_key: string;
  feature_label: string | null;
  rating: number | null;
  what_works: string | null;
  what_is_missing: string | null;
  would_use: string | null;
  reviewer_name: string | null;
  created_at: string;
}

interface FeedbackSummary {
  count: number;
  avg_rating: number | null;
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5 hover:scale-110 transition-transform"
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
        >
          <Star
            className={`w-5 h-5 ${n <= value ? 'text-bt-amber fill-bt-amber' : 'text-bt-border'}`}
          />
        </button>
      ))}
    </div>
  );
}

export default function DemoHubPage() {
  const [activeKey, setActiveKey] = useState<string>(features[0].key);
  const [reviewerName, setReviewerName] = useState('');
  const [sessionLabel, setSessionLabel] = useState('');
  const [rating, setRating] = useState(0);
  const [whatWorks, setWhatWorks] = useState('');
  const [whatIsMissing, setWhatIsMissing] = useState('');
  const [wouldUse, setWouldUse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [summary, setSummary] = useState<Record<string, FeedbackSummary>>({});
  const [loading, setLoading] = useState(false);

  const activeFeature = useMemo(
    () => features.find((f) => f.key === activeKey) ?? features[0],
    [activeKey]
  );

  useEffect(() => {
    // Default session label to today's date
    if (!sessionLabel) {
      setSessionLabel(`team-call-${new Date().toISOString().split('T')[0]}`);
    }
    // Try to remember the reviewer name across features
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('demo_feedback_reviewer') : null;
    if (stored && !reviewerName) setReviewerName(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setRating(0);
    setWhatWorks('');
    setWhatIsMissing('');
    setWouldUse('');
    setJustSubmitted(false);
    loadFeedback(activeKey);
  }, [activeKey]);

  const loadFeedback = async (key: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/outreach/demo-feedback?feature_key=${encodeURIComponent(key)}&limit=50`);
      const data = await res.json();
      setItems(data.items || []);
      setSummary(data.summary || {});
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (rating === 0 && !whatWorks.trim() && !whatIsMissing.trim() && !wouldUse.trim()) return;
    setSubmitting(true);
    setJustSubmitted(false);
    try {
      if (reviewerName) {
        window.localStorage.setItem('demo_feedback_reviewer', reviewerName);
      }
      await fetch('/api/outreach/demo-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_key: activeFeature.key,
          feature_label: activeFeature.label,
          rating: rating > 0 ? rating : undefined,
          what_works: whatWorks.trim() || undefined,
          what_is_missing: whatIsMissing.trim() || undefined,
          would_use: wouldUse.trim() || undefined,
          reviewer_name: reviewerName.trim() || undefined,
          session_label: sessionLabel.trim() || undefined,
        }),
      });
      setRating(0);
      setWhatWorks('');
      setWhatIsMissing('');
      setWouldUse('');
      setJustSubmitted(true);
      await loadFeedback(activeFeature.key);
    } catch {
      /* silent */
    } finally {
      setSubmitting(false);
    }
  };

  const Icon = activeFeature.icon;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demo Hub"
        subtitle="Walk the team through each feature and capture their feedback in one place"
        action={
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Your name"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              className="h-8 px-3 rounded-md border border-bt-border bg-bt-surface text-xs text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary"
            />
            <input
              type="text"
              placeholder="Session label"
              value={sessionLabel}
              onChange={(e) => setSessionLabel(e.target.value)}
              className="h-8 px-3 rounded-md border border-bt-border bg-bt-surface text-xs text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary"
            />
          </div>
        }
      />

      {/* Feature tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {features.map((f) => {
          const FIcon = f.icon;
          const s = summary[f.key];
          const isActive = f.key === activeKey;
          // per-tab summary is loaded only for the active feature, so
          // only the active feature shows count/avg below the label.
          return (
            <button
              key={f.key}
              onClick={() => setActiveKey(f.key)}
              className={`
                flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border transition-all text-left
                ${isActive
                  ? 'border-bt-primary bg-bt-primary-bg/40'
                  : 'border-bt-border bg-bt-surface hover:border-bt-primary/50'
                }
              `}
            >
              <FIcon className={`w-5 h-5 ${isActive ? 'text-bt-primary' : 'text-bt-text-secondary'}`} />
              <span className={`text-xs font-medium text-center leading-tight ${isActive ? 'text-bt-primary' : 'text-bt-text'}`}>
                {f.label}
              </span>
              {isActive && s && s.count > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] text-bt-text-tertiary tabular-nums">{s.count}</span>
                  {s.avg_rating !== null && (
                    <>
                      <Star className="w-2.5 h-2.5 text-bt-amber fill-bt-amber" />
                      <span className="text-[10px] text-bt-text-tertiary tabular-nums">{s.avg_rating.toFixed(1)}</span>
                    </>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Active feature card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: feature summary + links */}
        <Card>
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-bt-primary-bg">
              <Icon className="w-5 h-5 text-bt-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-bt-text">{activeFeature.label}</h2>
                <Link href={activeFeature.href} className="text-bt-primary hover:text-bt-primary-dark">
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
              <p className="text-xs text-bt-text-secondary mt-1 leading-relaxed">{activeFeature.pitch}</p>
              {activeFeature.slack_moment && (
                <div className="flex items-start gap-2 mt-3 p-2.5 rounded-md bg-bt-teal-bg/30">
                  <MessageSquare className="w-4 h-4 text-bt-teal shrink-0 mt-0.5" />
                  <p className="text-[11px] text-bt-text leading-relaxed">
                    <strong>Slack moment:</strong> {activeFeature.slack_moment}
                  </p>
                </div>
              )}
              <div className="mt-4">
                <Link href={activeFeature.href}>
                  <Button variant="primary" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                    Open {activeFeature.label}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>

        {/* Right: feedback form */}
        <Card>
          <CardHeader title="Give feedback" subtitle={`Your input on "${activeFeature.label}"`} />
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-bt-text mb-1.5">How useful is this for you?</label>
              <StarInput value={rating} onChange={setRating} />
            </div>

            <div>
              <label className="block text-xs font-medium text-bt-text mb-1.5">What works well?</label>
              <textarea
                rows={2}
                maxLength={4000}
                value={whatWorks}
                onChange={(e) => setWhatWorks(e.target.value)}
                placeholder="What did you like? What would you use today?"
                className="w-full px-3 py-2 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-bt-text mb-1.5">What&apos;s missing or confusing?</label>
              <textarea
                rows={2}
                maxLength={4000}
                value={whatIsMissing}
                onChange={(e) => setWhatIsMissing(e.target.value)}
                placeholder="Gaps, friction, things that would stop you using this"
                className="w-full px-3 py-2 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-bt-text mb-1.5">Would you use it weekly?</label>
              <input
                type="text"
                maxLength={2000}
                value={wouldUse}
                onChange={(e) => setWouldUse(e.target.value)}
                placeholder="Yes / no / maybe — and why"
                className="w-full h-9 px-3 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={submitFeedback}
                loading={submitting}
                icon={<Send className="w-3.5 h-3.5" />}
              >
                Submit feedback
              </Button>
              {justSubmitted && (
                <span className="flex items-center gap-1 text-xs text-bt-green">
                  <Check className="w-3.5 h-3.5" /> Saved
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent feedback on this feature */}
      <Card padding="none">
        <div className="flex items-center justify-between p-5 pb-3">
          <CardHeader title="Team feedback" subtitle={`On "${activeFeature.label}" — most recent first`} />
          <Button variant="ghost" size="sm" onClick={() => loadFeedback(activeFeature.key)} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="px-5 py-6 text-center text-xs text-bt-text-tertiary">Loading...</div>
        ) : items.length === 0 ? (
          <div className="px-5 py-6 text-center text-xs text-bt-text-tertiary">
            No feedback yet for this feature. Be the first — the team sees everything you submit.
          </div>
        ) : (
          <div className="divide-y divide-bt-border">
            {items.map((row) => (
              <div key={row.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-bt-text">
                      {row.reviewer_name || 'Anonymous'}
                    </span>
                    {row.rating && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < (row.rating || 0) ? 'text-bt-amber fill-bt-amber' : 'text-bt-border'}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-bt-text-tertiary tabular-nums">
                    {new Date(row.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                {row.what_works && (
                  <p className="text-xs text-bt-text-secondary mt-1.5">
                    <span className="text-bt-green font-medium">Works:</span> {row.what_works}
                  </p>
                )}
                {row.what_is_missing && (
                  <p className="text-xs text-bt-text-secondary mt-1">
                    <span className="text-bt-amber font-medium">Missing:</span> {row.what_is_missing}
                  </p>
                )}
                {row.would_use && (
                  <p className="text-xs text-bt-text-secondary mt-1">
                    <span className="text-bt-primary font-medium">Weekly use:</span> {row.would_use}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
