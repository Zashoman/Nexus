'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ListPlus,
  Check,
  Download,
  RefreshCw,
  X,
  Inbox,
} from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';
import EmptyState from '@/components/outreach/ui/EmptyState';

interface QueueRow {
  id: string;
  prospect_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  title: string | null;
  organization_name: string | null;
  organization_industry: string | null;
  subject: string | null;
  opener: string | null;
  instantly_campaign_id: string | null;
  instantly_campaign_name: string | null;
  status: 'queued' | 'exported' | 'imported' | 'skipped';
  created_at: string;
}

const statusTabs: Array<{ id: QueueRow['status']; label: string }> = [
  { id: 'queued', label: 'Queued' },
  { id: 'exported', label: 'Exported' },
  { id: 'imported', label: 'Imported' },
  { id: 'skipped', label: 'Skipped' },
];

function csvEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows: QueueRow[]): string {
  const header = ['email', 'first_name', 'last_name', 'title', 'company', 'industry', 'subject', 'opener'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([
      csvEscape(r.email),
      csvEscape(r.first_name),
      csvEscape(r.last_name),
      csvEscape(r.title),
      csvEscape(r.organization_name),
      csvEscape(r.organization_industry),
      csvEscape(r.subject),
      csvEscape(r.opener),
    ].join(','));
  }
  return lines.join('\n');
}

export default function InstantlyQueuePage() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<QueueRow['status']>('queued');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState(false);

  const fetchQueue = async (status: QueueRow['status']) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/outreach/instantly/queue?status=${status}&limit=200`);
      const data = await res.json();
      setRows(data.items || []);
      setCounts(data.counts || {});
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue(activeTab);
    setSelectedIds(new Set());
  }, [activeTab]);

  const visible = rows;
  const selected = useMemo(() => visible.filter((r) => selectedIds.has(r.id)), [visible, selectedIds]);
  const allSelected = visible.length > 0 && selected.length === visible.length;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(visible.map((r) => r.id)));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportSelected = () => {
    const targets = selected.length > 0 ? selected : visible;
    if (targets.length === 0) return;
    const csv = rowsToCsv(targets);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instantly-queue-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    // Mark them exported
    markStatus(targets.map((r) => r.id), 'exported');
  };

  const markStatus = async (ids: string[], status: QueueRow['status']) => {
    if (ids.length === 0) return;
    setUpdating(true);
    try {
      await fetch('/api/outreach/instantly/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status }),
      });
      await fetchQueue(activeTab);
      setSelectedIds(new Set());
    } catch {
      /* silent */
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Instantly Queue"
        subtitle="Review staged pitches before they hit your Instantly campaigns"
        action={
          <div className="flex items-center gap-2">
            <Link href="/outreach/pitch-studio">
              <Button variant="ghost" size="sm" icon={<Inbox className="w-3.5 h-3.5" />}>Pitch Studio</Button>
            </Link>
            <Button variant="secondary" size="sm" onClick={() => fetchQueue(activeTab)} icon={<RefreshCw className="w-3.5 h-3.5" />}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-bt-border">
        {statusTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all
              ${activeTab === tab.id
                ? 'border-bt-primary text-bt-primary'
                : 'border-transparent text-bt-text-secondary hover:text-bt-text hover:border-bt-border'
              }
            `}
          >
            {tab.label}
            <Badge variant={activeTab === tab.id ? 'primary' : 'default'} size="sm">
              {counts[tab.id] || 0}
            </Badge>
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {activeTab === 'queued' && visible.length > 0 && (
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-bt-text">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
              {selected.length > 0 ? `${selected.length} selected` : `Select all (${visible.length})`}
            </label>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={exportSelected}
                disabled={updating}
                icon={<Download className="w-3.5 h-3.5" />}
              >
                Export CSV {selected.length > 0 ? `(${selected.length})` : ''}
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={() => markStatus([...selectedIds], 'imported')}
                disabled={selected.length === 0 || updating}
                icon={<Check className="w-3.5 h-3.5" />}
              >
                Mark imported
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markStatus([...selectedIds], 'skipped')}
                disabled={selected.length === 0 || updating}
                icon={<X className="w-3.5 h-3.5" />}
              >
                Skip
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <Card><div className="py-6 text-center text-xs text-bt-text-tertiary">Loading...</div></Card>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<ListPlus className="w-8 h-8" />}
          title={`No ${activeTab} pitches`}
          description={
            activeTab === 'queued'
              ? 'Approve pitches in Pitch Studio and click "Queue for Instantly" to stage them here for review.'
              : `Nothing in the ${activeTab} bucket yet.`
          }
          action={
            <Link href="/outreach/pitch-studio">
              <Button variant="primary" size="sm" icon={<Inbox className="w-3.5 h-3.5" />}>Go to Pitch Studio</Button>
            </Link>
          }
        />
      ) : (
        <Card padding="none">
          <div className="divide-y divide-bt-border">
            {visible.map((r) => {
              const fullName = [r.first_name, r.last_name].filter(Boolean).join(' ') || '(unknown)';
              return (
                <div key={r.id} className="px-5 py-3 hover:bg-bt-surface-hover transition-colors">
                  <div className="flex items-start gap-3">
                    {activeTab === 'queued' && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleOne(r.id)}
                        className="mt-1 rounded"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-bt-text truncate">{fullName}</p>
                        <span className="text-[11px] text-bt-text-tertiary">·</span>
                        <p className="text-[11px] text-bt-text-secondary truncate">{r.title || '(no title)'}</p>
                        {r.organization_name && (
                          <>
                            <span className="text-[11px] text-bt-text-tertiary">·</span>
                            <p className="text-[11px] text-bt-text-secondary truncate">{r.organization_name}</p>
                          </>
                        )}
                      </div>
                      {r.subject && (
                        <p className="text-[11px] text-bt-text-secondary mt-1 truncate">
                          <span className="text-bt-text-tertiary">Subject:</span> {r.subject}
                        </p>
                      )}
                      {r.opener && (
                        <p className="text-[11px] text-bt-text-secondary mt-1 line-clamp-2">{r.opener}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {r.instantly_campaign_name && (
                          <Badge variant="info" size="sm">{r.instantly_campaign_name}</Badge>
                        )}
                        <Badge
                          variant={
                            r.status === 'imported' ? 'success'
                            : r.status === 'exported' ? 'info'
                            : r.status === 'skipped' ? 'default'
                            : 'primary'
                          }
                          size="sm"
                          dot
                        >
                          {r.status}
                        </Badge>
                        <span className="text-[11px] text-bt-text-tertiary tabular-nums">
                          {new Date(r.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
