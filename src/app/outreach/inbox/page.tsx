'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Mail,
  ChevronDown,
  Loader2,
  Inbox as InboxIcon,
  Clock,
  User,
  Building2,
  ArrowRight,
} from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';
import EmptyState from '@/components/outreach/ui/EmptyState';

interface InstantlyEmail {
  id: string;
  from_address_email?: string;
  from_address?: string;
  to_address_email_list?: string;
  to_address_email?: string;
  from_name?: string;
  to_name?: string;
  subject?: string;
  body?: unknown;
  text_body?: string;
  html_body?: string;
  timestamp?: string;
  timestamp_created?: string;
  timestamp_email?: string;
  created_at?: string;
  date?: string;
  is_read?: boolean;
  is_unread?: number;
  campaign_id?: string;
  campaign_name?: string;
  thread_id?: string;
  message_type?: string;
  direction?: string;
  lead_email?: string;
  lead?: string;
  account_email?: string;
  eaccount?: string;
  ue_type?: number;
  i_status?: number;
  content_preview?: string;
  from_address_json?: Array<{ address: string; name: string }>;
  to_address_json?: Array<{ address: string; name: string }>;
  [key: string]: unknown;
}

interface InstantlyCampaign {
  id: string;
  name: string;
  status: string;
}

function getEmailTime(email: InstantlyEmail): string {
  const ts = email.timestamp_email || email.timestamp_created || email.timestamp || email.created_at || email.date;
  if (!ts) return '';
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function getSenderName(email: InstantlyEmail): string {
  if (email.from_address_json?.[0]?.name) return email.from_address_json[0].name;
  return email.from_name || email.from_address_email || email.from_address || email.lead || 'Unknown';
}

function getSenderEmail(email: InstantlyEmail): string {
  if (email.from_address_json?.[0]?.address) return email.from_address_json[0].address;
  return email.from_address_email || email.from_address || email.lead || '';
}

function getLeadEmail(email: InstantlyEmail): string {
  return email.lead || email.lead_email || getSenderEmail(email);
}

function getAccountEmail(email: InstantlyEmail): string {
  return email.eaccount || email.account_email || '';
}

function getEmailBodyPlain(email: InstantlyEmail): string {
  try {
    let raw = '';
    if (email.content_preview && typeof email.content_preview === 'string') {
      return email.content_preview;
    }
    if (email.text_body && typeof email.text_body === 'string') {
      raw = email.text_body;
    } else if (email.body && typeof email.body === 'object' && email.body !== null) {
      const bodyObj = email.body as Record<string, string>;
      raw = bodyObj.text || bodyObj.html || '';
    } else if (email.body && typeof email.body === 'string') {
      raw = email.body;
    } else if (email.html_body && typeof email.html_body === 'string') {
      raw = email.html_body;
    }
    return raw.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  } catch {
    return String(email.content_preview || '');
  }
}

function getEmailBodyHtml(email: InstantlyEmail): string {
  try {
    if (email.body && typeof email.body === 'object' && email.body !== null) {
      const bodyObj = email.body as Record<string, string>;
      if (bodyObj.html) return bodyObj.html;
      if (bodyObj.text) return bodyObj.text.replace(/\n/g, '<br>');
    }
    if (email.html_body && typeof email.html_body === 'string') {
      return email.html_body;
    }
    if (email.body && typeof email.body === 'string') {
      return email.body;
    }
    if (email.text_body && typeof email.text_body === 'string') {
      return email.text_body.replace(/\n/g, '<br>');
    }
    return String(email.content_preview || '').replace(/\n/g, '<br>');
  } catch {
    return String(email.content_preview || '');
  }
}

function getSubject(email: InstantlyEmail): string {
  return email.subject || '(no subject)';
}

function getReplyStatusBadge(email: InstantlyEmail): { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' } {
  const iStatus = email.i_status;
  if (iStatus === 1) return { label: 'Action needed', variant: 'warning' };
  if (iStatus === 0) return { label: 'Auto-reply', variant: 'default' };
  return { label: 'New reply', variant: 'info' };
}

// Campaign name cache
const campaignNameCache: Record<string, string> = {};

export default function InboxPage() {
  const [emails, setEmails] = useState<InstantlyEmail[]>([]);
  const [campaigns, setCampaigns] = useState<InstantlyCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<InstantlyEmail | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [search, setSearch] = useState('');
  const [totalFetched, setTotalFetched] = useState(0);

  const fetchEmails = async (campaignId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '100', replies_only: 'true' });
      if (campaignId) params.set('campaign_id', campaignId);

      const res = await fetch(`/api/outreach/instantly/replies?${params}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setEmails([]);
      } else {
        const sortedEmails = (data.emails || []).sort((a: InstantlyEmail, b: InstantlyEmail) => {
          const aTs = a.timestamp_email || a.timestamp_created || '';
          const bTs = b.timestamp_email || b.timestamp_created || '';
          return new Date(bTs).getTime() - new Date(aTs).getTime();
        });
        setEmails(sortedEmails);
        setTotalFetched(data.total_fetched || 0);
        if (sortedEmails.length > 0 && !selectedEmail) {
          setSelectedEmail(sortedEmails[0]);
        }
      }
    } catch {
      setError('Failed to fetch emails');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/outreach/instantly/campaigns');
      const data = await res.json();
      const campaignList = data.campaigns || [];
      setCampaigns(campaignList);
      campaignList.forEach((c: InstantlyCampaign) => {
        campaignNameCache[c.id] = c.name;
      });
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchEmails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCampaignFilter = (campaignId: string) => {
    setSelectedCampaign(campaignId);
    setSelectedEmail(null);
    fetchEmails(campaignId || undefined);
  };

  const getCampaignName = (campaignId?: string): string => {
    if (!campaignId) return '';
    return campaignNameCache[campaignId] || campaignId.substring(0, 8) + '...';
  };

  const filtered = search
    ? emails.filter((e) => {
        const name = getSenderName(e).toLowerCase();
        const subject = getSubject(e).toLowerCase();
        const body = getEmailBodyPlain(e).toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || subject.includes(q) || body.includes(q);
      })
    : emails;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox — Replies"
        subtitle={loading ? 'Loading...' : `${emails.length} replies found (from ${totalFetched} total emails)`}
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchEmails(selectedCampaign || undefined)}
            loading={loading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bt-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search replies..."
            className="w-full h-9 pl-9 pr-4 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary focus:border-transparent transition-shadow"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-bt-text-tertiary pointer-events-none" />
          <select
            value={selectedCampaign}
            onChange={(e) => handleCampaignFilter(e.target.value)}
            className="h-9 pl-9 pr-8 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text focus:outline-none focus:ring-2 focus:ring-bt-primary appearance-none cursor-pointer"
          >
            <option value="">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-bt-text-tertiary pointer-events-none" />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-bt-primary animate-spin" />
            <span className="text-sm text-bt-text-secondary">Loading replies from Instantly...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <Card>
          <div className="text-center py-8">
            <p className="text-sm text-bt-red mb-2">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => fetchEmails()}>Try again</Button>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && emails.length === 0 && (
        <EmptyState
          icon={<InboxIcon className="w-8 h-8" />}
          title="No replies found"
          description="No inbound replies were found. Try selecting a different campaign or check back later."
          action={<Button variant="secondary" size="sm" onClick={() => fetchEmails()}>Refresh</Button>}
        />
      )}

      {/* Split view: reply list + detail */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[600px]">
          {/* Reply list */}
          <div className="lg:col-span-2">
            <Card padding="none" className="h-full overflow-hidden">
              <div className="divide-y divide-bt-border overflow-y-auto max-h-[700px]">
                {filtered.map((email) => {
                  const isSelected = selectedEmail?.id === email.id;
                  const statusBadge = getReplyStatusBadge(email);
                  return (
                    <button
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className={`
                        w-full text-left px-4 py-3.5 transition-colors
                        ${isSelected ? 'bg-bt-primary-bg/50' : 'hover:bg-bt-surface-hover'}
                      `}
                    >
                      {/* Sender + time */}
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-bt-bg-alt flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-bt-text-tertiary" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-bt-text truncate block">
                              {getSenderName(email)}
                            </span>
                            <span className="text-[11px] text-bt-text-tertiary truncate block">
                              {getSenderEmail(email)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                          <span className="text-[11px] text-bt-text-tertiary">
                            {getEmailTime(email)}
                          </span>
                          <Badge variant={statusBadge.variant} size="sm">{statusBadge.label}</Badge>
                        </div>
                      </div>

                      {/* Subject */}
                      <p className="text-xs text-bt-text truncate mt-1">
                        {getSubject(email)}
                      </p>

                      {/* Preview */}
                      <p className="text-xs text-bt-text-tertiary mt-1 line-clamp-2">
                        {getEmailBodyPlain(email).substring(0, 150)}
                      </p>

                      {/* Campaign tag */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <Badge variant="default" size="sm">
                          {getCampaignName(email.campaign_id)}
                        </Badge>
                        {email.eaccount && (
                          <Badge variant="info" size="sm">
                            via {email.eaccount?.split('@')[0]}
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Reply detail */}
          <div className="lg:col-span-3">
            {selectedEmail ? (
              <Card padding="none" className="h-full flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-bt-border">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-bt-text">
                      {getSubject(selectedEmail)}
                    </h3>
                    <Badge variant={getReplyStatusBadge(selectedEmail).variant} size="sm">
                      {getReplyStatusBadge(selectedEmail).label}
                    </Badge>
                  </div>

                  {/* Sender info */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-bt-bg-alt flex items-center justify-center">
                      <User className="w-4 h-4 text-bt-text-tertiary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-bt-text">{getSenderName(selectedEmail)}</p>
                      <p className="text-xs text-bt-text-secondary">{getSenderEmail(selectedEmail)}</p>
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-bt-text-tertiary">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {getEmailTime(selectedEmail)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {getCampaignName(selectedEmail.campaign_id)}
                    </span>
                    {selectedEmail.eaccount && (
                      <span className="flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" />
                        Sent via {selectedEmail.eaccount}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      Lead: {getLeadEmail(selectedEmail)}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                  <div
                    className="email-body text-sm text-bt-text leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: getEmailBodyHtml(selectedEmail) }}
                  />
                </div>

                {/* Account info */}
                <div className="px-5 py-3 border-t border-bt-border bg-bt-bg/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-bt-text-tertiary">
                      Account: {getAccountEmail(selectedEmail)} &middot; Thread: {selectedEmail.thread_id?.substring(0, 12)}...
                    </span>
                    <details className="text-[11px]">
                      <summary className="text-bt-text-tertiary cursor-pointer hover:text-bt-text-secondary">
                        Raw data
                      </summary>
                      <pre className="mt-2 text-[10px] text-bt-text-tertiary bg-bt-bg-alt rounded-lg p-3 overflow-x-auto max-h-48 absolute right-4 bottom-12 w-[500px] z-10 border border-bt-border shadow-lg">
                        {JSON.stringify(selectedEmail, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Mail className="w-10 h-10 text-bt-text-tertiary mx-auto mb-3" />
                  <p className="text-sm text-bt-text-secondary">Select a reply to view details</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
