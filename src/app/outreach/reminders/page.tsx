'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Clock,
  AlertTriangle,
  CalendarDays,
  RefreshCw,
  Loader2,
  Sparkles,
  PenTool,
  X,
  Timer,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card, { CardHeader } from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';
import EmptyState from '@/components/outreach/ui/EmptyState';
import { apiFetch } from '@/lib/api-client';

interface Reminder {
  id: string;
  type: 'auto' | 'manual';
  status: string;
  contact_name: string;
  contact_title?: string;
  contact_email?: string;
  company_or_publication?: string;
  campaign_id?: string;
  due_date: string;
  original_due_date?: string;
  snooze_count: number;
  original_reply?: string;
  manual_note?: string;
  ai_summary?: string;
  suggested_action?: string;
  created_at: string;
}

interface ReminderCounts {
  overdue: number;
  due_soon: number;
  upcoming: number;
}

function daysUntil(dateStr: string): number {
  try {
    const due = new Date(dateStr);
    if (isNaN(due.getTime())) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return Math.round((due.getTime() - today.getTime()) / 86400000);
  } catch { return 0; }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [counts, setCounts] = useState<ReminderCounts>({ overdue: 0, due_soon: 0, upcoming: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReminder, setNewReminder] = useState({ contact_name: '', contact_email: '', company_or_publication: '', due_date: '', manual_note: '' });

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/outreach/reminders');
      const data = await res.json();
      setReminders(data.reminders || []);
      setCounts(data.counts || { overdue: 0, due_soon: 0, upcoming: 0 });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReminders(); }, []);

  const handleAction = async (id: string, action: 'snooze' | 'dismiss' | 'complete', days?: number) => {
    const reminder = reminders.find((r) => r.id === id);
    await apiFetch('/api/outreach/reminders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, days, current_snooze_count: reminder?.snooze_count || 0 }),
    });
    fetchReminders();
  };

  const addReminder = async () => {
    if (!newReminder.contact_name.trim() || !newReminder.due_date) return;
    await apiFetch('/api/outreach/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newReminder,
        contact_name: newReminder.contact_name.trim(),
        contact_email: newReminder.contact_email.trim(),
        company_or_publication: newReminder.company_or_publication.trim(),
        manual_note: newReminder.manual_note.trim(),
        type: 'manual',
      }),
    });
    setNewReminder({ contact_name: '', contact_email: '', company_or_publication: '', due_date: '', manual_note: '' });
    setShowAddForm(false);
    fetchReminders();
  };

  const statusConfig: Record<string, { color: string; badge: 'danger' | 'warning' | 'info' | 'default'; icon: typeof AlertTriangle }> = {
    overdue: { color: 'text-bt-red', badge: 'danger', icon: AlertTriangle },
    due_soon: { color: 'text-bt-amber', badge: 'warning', icon: Clock },
    upcoming: { color: 'text-bt-blue', badge: 'info', icon: CalendarDays },
    snoozed: { color: 'text-bt-text-tertiary', badge: 'default', icon: Timer },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reminders"
        subtitle="Never forget a warm lead"
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={fetchReminders} loading={loading} icon={<RefreshCw className="w-3.5 h-3.5" />}>Refresh</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddForm(!showAddForm)} icon={<Plus className="w-3.5 h-3.5" />}>Add Reminder</Button>
          </div>
        }
      />

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-5 py-3 rounded-xl bg-bt-surface border border-bt-border">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-bt-red" />
          <span className="text-lg font-bold text-bt-red tabular-nums">{counts.overdue}</span>
          <span className="text-xs text-bt-text-tertiary">Overdue</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-bt-amber" />
          <span className="text-lg font-bold text-bt-amber tabular-nums">{counts.due_soon}</span>
          <span className="text-xs text-bt-text-tertiary">Due This Week</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-bt-blue" />
          <span className="text-lg font-bold text-bt-blue tabular-nums">{counts.upcoming}</span>
          <span className="text-xs text-bt-text-tertiary">Upcoming</span>
        </div>
      </div>

      {/* Add reminder form */}
      {showAddForm && (
        <Card>
          <CardHeader title="Add Manual Reminder" />
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-bt-text mb-1">Contact name *</label>
                <input type="text" value={newReminder.contact_name} onChange={(e) => setNewReminder({ ...newReminder, contact_name: e.target.value })}
                  placeholder="Lisa Chen" className="w-full h-9 px-3 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-bt-text mb-1">Email</label>
                <input type="email" value={newReminder.contact_email} onChange={(e) => setNewReminder({ ...newReminder, contact_email: e.target.value })}
                  placeholder="lisa@company.com" className="w-full h-9 px-3 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-bt-text mb-1">Company / publication</label>
                <input type="text" value={newReminder.company_or_publication} onChange={(e) => setNewReminder({ ...newReminder, company_or_publication: e.target.value })}
                  placeholder="Finova Capital" className="w-full h-9 px-3 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-bt-text mb-1">Due date *</label>
                <input type="date" value={newReminder.due_date} onChange={(e) => setNewReminder({ ...newReminder, due_date: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text focus:outline-none focus:ring-2 focus:ring-bt-primary" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-bt-text mb-1">Note (why to follow up)</label>
              <textarea value={newReminder.manual_note} onChange={(e) => setNewReminder({ ...newReminder, manual_note: e.target.value })}
                placeholder="Lisa mentioned at SaaStr she's closing a round — follow up after announcement."
                rows={2} className="w-full px-3 py-2 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary resize-none" />
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={addReminder} icon={<Plus className="w-3.5 h-3.5" />}>Create</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-bt-primary animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && reminders.length === 0 && (
        <EmptyState
          icon={<Bell className="w-8 h-8" />}
          title="No reminders"
          description="When prospects say 'reach out later' or 'check back in 6 months', the agent will create reminders automatically. You can also add them manually."
          action={<Button variant="primary" size="sm" onClick={() => setShowAddForm(true)} icon={<Plus className="w-3.5 h-3.5" />}>Add Reminder</Button>}
        />
      )}

      {/* Reminder cards */}
      {!loading && reminders.length > 0 && (
        <div className="space-y-3">
          {reminders.map((reminder) => {
            const config = statusConfig[reminder.status] || statusConfig.upcoming;
            const days = daysUntil(reminder.due_date);
            const isExpanded = expandedId === reminder.id;
            const StatusIcon = config.icon;

            return (
              <Card key={reminder.id} padding="none">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : reminder.id)}
                  className="w-full text-left px-5 py-4 flex items-start justify-between hover:bg-bt-surface-hover transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <StatusIcon className={`w-5 h-5 ${config.color} mt-0.5 shrink-0`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-bt-text">{reminder.contact_name}</p>
                        <Badge variant={config.badge} size="sm">
                          {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d`}
                        </Badge>
                        <Badge variant={reminder.type === 'auto' ? 'primary' : 'default'} size="sm">
                          {reminder.type === 'auto' ? 'Auto-detected' : 'Manual'}
                        </Badge>
                      </div>
                      {(reminder.contact_title || reminder.company_or_publication) && (
                        <p className="text-xs text-bt-text-secondary mt-0.5">
                          {[reminder.contact_title, reminder.company_or_publication].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <p className="text-xs text-bt-text-tertiary mt-0.5">Due: {formatDate(reminder.due_date)}</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-bt-text-tertiary" /> : <ChevronDown className="w-4 h-4 text-bt-text-tertiary" />}
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-bt-border space-y-4">
                    {/* Original reply (auto-detected) */}
                    {reminder.original_reply && (
                      <div className="mt-4">
                        <p className="text-[10px] font-semibold text-bt-text-tertiary uppercase tracking-wider mb-1.5">Original Reply</p>
                        <div className="bg-bt-bg-alt border-l-2 border-bt-text-tertiary rounded-lg p-3">
                          <p className="text-sm text-bt-text leading-relaxed">{reminder.original_reply}</p>
                        </div>
                      </div>
                    )}

                    {/* Manual note */}
                    {reminder.manual_note && (
                      <div>
                        <p className="text-[10px] font-semibold text-bt-text-tertiary uppercase tracking-wider mb-1.5">Your Note</p>
                        <p className="text-sm text-bt-text">{reminder.manual_note}</p>
                      </div>
                    )}

                    {/* AI Summary */}
                    {reminder.ai_summary && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-bt-primary-bg/30 border border-bt-primary/10">
                        <Sparkles className="w-4 h-4 text-bt-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-bt-primary mb-0.5">AI Analysis</p>
                          <p className="text-sm text-bt-text">{reminder.ai_summary}</p>
                        </div>
                      </div>
                    )}

                    {/* Suggested action */}
                    {reminder.suggested_action && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-bt-teal-bg/30 border border-bt-teal/10">
                        <PenTool className="w-4 h-4 text-bt-teal shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-bt-teal mb-0.5">Suggested Action</p>
                          <p className="text-sm text-bt-text">{reminder.suggested_action}</p>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<PenTool className="w-3.5 h-3.5" />}
                        onClick={() => {
                          // Store reminder context and navigate to pitch studio
                          sessionStorage.setItem('pitch_studio_prospects', JSON.stringify([{
                            id: reminder.id,
                            first_name: reminder.contact_name.split(' ')[0],
                            last_name: reminder.contact_name.split(' ').slice(1).join(' '),
                            title: reminder.contact_title,
                            email: reminder.contact_email,
                            organization: { name: reminder.company_or_publication },
                            subject: `Follow-up: ${reminder.contact_name}`,
                            opener: reminder.suggested_action || reminder.manual_note || `Following up with ${reminder.contact_name}`,
                            status: 'pending',
                          }]));
                          window.location.href = '/outreach/pitch-studio';
                        }}
                      >
                        Draft Follow-up
                      </Button>
                      <div className="flex items-center gap-1">
                        <Button variant="secondary" size="sm" onClick={() => handleAction(reminder.id, 'snooze', 7)}>+7d</Button>
                        <Button variant="secondary" size="sm" onClick={() => handleAction(reminder.id, 'snooze', 14)}>+14d</Button>
                        <Button variant="secondary" size="sm" onClick={() => handleAction(reminder.id, 'snooze', 30)}>+30d</Button>
                      </div>
                      <div className="flex-1" />
                      <Button variant="success" size="sm" onClick={() => handleAction(reminder.id, 'complete')} icon={<CheckCircle2 className="w-3.5 h-3.5" />}>Done</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleAction(reminder.id, 'dismiss')} icon={<X className="w-3.5 h-3.5" />}>Dismiss</Button>
                    </div>

                    {reminder.snooze_count > 0 && (
                      <p className="text-[10px] text-bt-text-tertiary">Snoozed {reminder.snooze_count} time{reminder.snooze_count > 1 ? 's' : ''} · Originally due: {formatDate(reminder.original_due_date || reminder.due_date)}</p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
