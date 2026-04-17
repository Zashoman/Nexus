'use client';

import { useEffect, useState } from 'react';
import {
  Database,
  Play,
  Loader2,
  CheckCircle2,
  Mail,
  RefreshCw,
  Lightbulb,
  Clock,
  Sparkles,
} from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card, { CardHeader } from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';
import EmptyState from '@/components/outreach/ui/EmptyState';

interface IngestionJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  emails_fetched: number;
  emails_classified: number;
  patterns_extracted: number;
  campaigns_processed: string[];
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface Pattern {
  id: string;
  pattern_type: string;
  campaign_type: string;
  pattern_data: Record<string, unknown>;
  success_rate: number | null;
  sample_size: number | null;
  created_at: string;
}

interface TrainingData {
  latest_job: IngestionJob | null;
  patterns: Pattern[];
  pattern_count: number;
}

function formatTime(ts: string | null): string {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return ''; }
}

function statusBadge(status: string) {
  if (status === 'completed') return <Badge variant="success" size="sm" dot>Completed</Badge>;
  if (status === 'running') return <Badge variant="info" size="sm" dot>Running</Badge>;
  if (status === 'failed') return <Badge variant="danger" size="sm" dot>Failed</Badge>;
  return <Badge variant="default" size="sm" dot>Pending</Badge>;
}

export default function TrainingPage() {
  const [data, setData] = useState<TrainingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/outreach/training/status');
      const json = await res.json();
      setData(json);
      // If a job is currently running, poll for updates
      if (json.latest_job?.status === 'running') {
        setTimeout(fetchData, 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startIngestion = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/outreach/training/ingest', { method: 'POST' });
      await res.json();
      // Start polling
      setTimeout(fetchData, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  const loadDemoData = async () => {
    setSeeding(true);
    try {
      await fetch('/api/outreach/training/seed-demo', { method: 'POST' });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  const subjectLines = data?.patterns.filter((p) => p.pattern_type === 'subject_line') || [];
  const openers = data?.patterns.filter((p) => p.pattern_type === 'opener') || [];
  const insights = data?.patterns.find((p) => p.pattern_type === 'follow_up');
  const insightText = insights?.pattern_data?.insights as string | undefined;

  const isRunning = data?.latest_job?.status === 'running';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training"
        subtitle="Train the agent on Blue Tree's historical email patterns"
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={fetchData} icon={<RefreshCw className="w-3.5 h-3.5" />}>
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadDemoData}
              loading={seeding}
              disabled={seeding || running || isRunning}
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Load demo data
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={startIngestion}
              loading={running || isRunning}
              disabled={running || isRunning}
              icon={<Play className="w-3.5 h-3.5" />}
            >
              {isRunning ? 'Ingesting...' : 'Run Ingestion'}
            </Button>
          </div>
        }
      />

      {/* How it works */}
      <Card>
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-bt-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-bt-text">What this does</h3>
            <p className="text-xs text-bt-text-secondary mt-1 leading-relaxed">
              Click <strong>Run Ingestion</strong> to scan recent emails from Instantly, identify which subject lines and openers got replies, and extract patterns the agent can learn from. The more historical data you ingest, the smarter future drafts become. Currently scans the most recent 100 emails per run — historical data ingestion will go deeper once we have batch API access.
            </p>
          </div>
        </div>
      </Card>

      {/* Latest job status */}
      {data?.latest_job && (
        <Card>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-bt-text">Latest Ingestion Job</h3>
                {statusBadge(data.latest_job.status)}
              </div>
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-[10px] text-bt-text-tertiary uppercase tracking-wider">Emails Scanned</p>
                  <p className="text-xl font-bold text-bt-text tabular-nums">{data.latest_job.emails_fetched}</p>
                </div>
                <div>
                  <p className="text-[10px] text-bt-text-tertiary uppercase tracking-wider">Threads Analyzed</p>
                  <p className="text-xl font-bold text-bt-text tabular-nums">{data.latest_job.emails_classified}</p>
                </div>
                <div>
                  <p className="text-[10px] text-bt-text-tertiary uppercase tracking-wider">Patterns Found</p>
                  <p className="text-xl font-bold text-bt-text tabular-nums">{data.latest_job.patterns_extracted}</p>
                </div>
                <div>
                  <p className="text-[10px] text-bt-text-tertiary uppercase tracking-wider">Campaigns</p>
                  <p className="text-xl font-bold text-bt-text tabular-nums">{data.latest_job.campaigns_processed?.length || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4 text-[11px] text-bt-text-tertiary">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Started: {formatTime(data.latest_job.started_at)}</span>
                {data.latest_job.completed_at && (
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Completed: {formatTime(data.latest_job.completed_at)}</span>
                )}
              </div>
              {data.latest_job.error_message && (
                <p className="text-xs text-bt-red mt-3">Error: {data.latest_job.error_message}</p>
              )}
            </div>
            {isRunning && <Loader2 className="w-5 h-5 text-bt-primary animate-spin" />}
          </div>
        </Card>
      )}

      {/* AI insights */}
      {insightText && (
        <Card>
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-bt-amber shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-bt-text mb-2">AI-Extracted Insights</h3>
              <div className="text-xs text-bt-text leading-relaxed whitespace-pre-wrap">{insightText}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Top subject lines */}
      {subjectLines.length > 0 && (
        <Card padding="none">
          <div className="p-5 pb-3">
            <CardHeader title="Top Subject Lines" subtitle={`${subjectLines.length} patterns extracted`} />
          </div>
          <div className="divide-y divide-bt-border">
            {subjectLines.slice(0, 10).map((pattern, i) => {
              const data = pattern.pattern_data as { text?: string; campaign?: string; send_count?: number };
              return (
                <div key={pattern.id} className="px-5 py-3 hover:bg-bt-surface-hover transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-bt-text-tertiary tabular-nums w-5">{i + 1}</span>
                      <Mail className="w-3.5 h-3.5 text-bt-text-tertiary shrink-0" />
                      <span className="text-sm text-bt-text truncate">{data.text}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {data.campaign && <Badge variant="default" size="sm">{data.campaign}</Badge>}
                      <Badge variant="success" size="sm">{data.send_count}× sent</Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Top openers */}
      {openers.length > 0 && (
        <Card padding="none">
          <div className="p-5 pb-3">
            <CardHeader title="Top Openers" subtitle={`${openers.length} patterns extracted`} />
          </div>
          <div className="divide-y divide-bt-border">
            {openers.slice(0, 10).map((pattern, i) => {
              const data = pattern.pattern_data as { text?: string; campaign?: string; send_count?: number };
              return (
                <div key={pattern.id} className="px-5 py-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold text-bt-text-tertiary tabular-nums w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-bt-text leading-relaxed line-clamp-2">{data.text}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {data.campaign && <Badge variant="default" size="sm">{data.campaign}</Badge>}
                        <Badge variant="success" size="sm">{data.send_count}× sent</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!loading && (!data?.latest_job || data?.patterns.length === 0) && (
        <EmptyState
          icon={<Database className="w-8 h-8" />}
          title="No training data yet"
          description="Click 'Run Ingestion' to scan recent emails and extract patterns. The agent will use these patterns to inform future drafts. For a quick demo, click 'Load demo data' to populate representative patterns instantly."
          action={
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={loadDemoData} loading={seeding} icon={<Sparkles className="w-3.5 h-3.5" />}>
                Load demo data
              </Button>
              <Button variant="primary" size="sm" onClick={startIngestion} loading={running} icon={<Play className="w-3.5 h-3.5" />}>
                Run Ingestion
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
}
