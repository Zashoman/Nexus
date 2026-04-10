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
  to_address_email?: string;
  to_address?: string;
  from_name?: string;
  to_name?: string;
  subject?: string;
  body?: string;
  text_body?: string;
  html_body?: string;
  timestamp?: string;
  timestamp_created?: string;
  created_at?: string;
  date?: string;
  is_read?: boolean;
  campaign_id?: string;
  campaign_name?: string;
  thread_id?: string;
  message_type?: string;
  direction?: string;
  lead_email?: string;
  account_email?: string;
  [key: string]: unknown;
}

interface InstantlyCampaign {
  id: string;
  name: string;
  status: string;
}

function getEmailTime(email: InstantlyEmail): string {
  const ts = email.timestamp || email.timestamp_created || email.created_at || email.date;
  if (!ts) return '';
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
}

function getSenderName(email: InstantlyEmail): string {
  return email.from_name || email.from_address_email || email.from_address || email.lead_email || 'Unknown';
}

function getSenderEmail(email: InstantlyEmail): string {
  return email.from_address_email || email.from_address || email.lead_email || '';
}

function getEmailBody(email: InstantlyEmail): string {
  // body can be a string or an object like { html: "...", text: "..." }
  let raw = '';
  if (email.text_body && typeof email.text_body === 'string') {
    raw = email.text_body;
  } else if (email.body && typeof email.body === 'object' && email.body !== null) {
    const bodyObj = email.body as Record<string, string>;
    raw = bodyObj.text || bodyObj.html || '';
  } else if (email.body && typeof email.body === 'string') {
    raw = email.body;
  } else if (email.html_body && typeof email.html_body === 'string') {
    raw = email.html_body;
  } else if (email.content_preview && typeof email.content_preview === 'string') {
    return email.content_preview as string;
  }
  // Strip HTML tags for display
  return raw.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function getSubject(email: InstantlyEmail): string {
  return email.subject || '(no subject)';
}

export default function InboxPage() {
  const [emails, setEmails] = useState<InstantlyEmail[]>([]);
  const [campaigns, setCampaigns] = useState<InstantlyCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<InstantlyEmail | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [search, setSearch] = useState('');

  const fetchEmails = async (campaignId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (campaignId) params.set('campaign_id', campaignId);

      const res = await fetch(`/api/outreach/instantly/replies?${params}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setEmails([]);
      } else {
        setEmails(data.emails || []);
        if (data.emails?.length > 0) {
          setSelectedEmail(data.emails[0]);
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
      setCampaigns(data.campaigns || []);
    } catch {
      // silently fail — campaigns are just for filtering
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchEmails();
  }, []);

  const handleCampaignFilter = (campaignId: string) => {
    setSelectedCampaign(campaignId);
    fetchEmails(campaignId || undefined);
  };

  const filtered = search
    ? emails.filter((e) => {
        const name = getSenderName(e).toLowerCase();
        const subject = getSubject(e).toLowerCase();
        const body = getEmailBody(e).toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || subject.includes(q) || body.includes(q);
      })
    : emails;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        subtitle={`${emails.length} emails from Instantly — READ-ONLY`}
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
            placeholder="Search emails..."
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
            <span className="text-sm text-bt-text-secondary">Loading emails from Instantly...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <Card>
          <div className="text-center py-8">
            <p className="text-sm text-bt-red mb-2">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => fetchEmails()}>
              Try again
            </Button>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && emails.length === 0 && (
        <EmptyState
          icon={<InboxIcon className="w-8 h-8" />}
          title="No emails found"
          description="No emails were returned from Instantly. Try selecting a different campaign or check that your campaigns have replies."
          action={
            <Button variant="secondary" size="sm" onClick={() => fetchEmails()}>
              Refresh
            </Button>
          }
        />
      )}

      {/* Split view: email list + detail */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[600px]">
          {/* Email list */}
          <div className="lg:col-span-2">
            <Card padding="none" className="h-full overflow-hidden">
              <div className="divide-y divide-bt-border overflow-y-auto max-h-[700px]">
                {filtered.map((email) => {
                  const isSelected = selectedEmail?.id === email.id;
                  return (
                    <button
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className={`
                        w-full text-left px-4 py-3.5 transition-colors
                        ${isSelected ? 'bg-bt-primary-bg/50' : 'hover:bg-bt-surface-hover'}
                      `}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          {!email.is_read && (
                            <span className="w-2 h-2 rounded-full bg-bt-primary shrink-0" />
                          )}
                          <span className="text-sm font-semibold text-bt-text truncate">
                            {getSenderName(email)}
                          </span>
                        </div>
                        <span className="text-[11px] text-bt-text-tertiary shrink-0 ml-2">
                          {getEmailTime(email)}
                        </span>
                      </div>
                      <p className="text-xs text-bt-text-secondary truncate mb-1">
                        {getSubject(email)}
                      </p>
                      <p className="text-xs text-bt-text-tertiary truncate">
                        {getEmailBody(email).substring(0, 120)}
                      </p>
                      {email.campaign_name && (
                        <Badge variant="default" size="sm" className="mt-1.5">
                          {email.campaign_name}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Email detail */}
          <div className="lg:col-span-3">
            {selectedEmail ? (
              <Card padding="none" className="h-full flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-bt-border">
                  <h3 className="text-sm font-semibold text-bt-text mb-1">
                    {getSubject(selectedEmail)}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-bt-text-secondary">
                    <span>
                      <span className="text-bt-text font-medium">{getSenderName(selectedEmail)}</span>
                      {' '}&lt;{getSenderEmail(selectedEmail)}&gt;
                    </span>
                    <span className="text-bt-text-tertiary">{getEmailTime(selectedEmail)}</span>
                  </div>
                  {selectedEmail.to_address_email && (
                    <p className="text-xs text-bt-text-tertiary mt-1">
                      To: {selectedEmail.to_name || selectedEmail.to_address_email || selectedEmail.to_address || selectedEmail.account_email}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {selectedEmail.campaign_name && (
                      <Badge variant="primary" size="sm">{selectedEmail.campaign_name}</Badge>
                    )}
                    {selectedEmail.campaign_id && !selectedEmail.campaign_name && (
                      <Badge variant="default" size="sm" className="font-mono">{selectedEmail.campaign_id}</Badge>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                  <div className="prose prose-sm max-w-none">
                    <div
                      className="text-sm text-bt-text leading-relaxed whitespace-pre-wrap"
                    >
                      {getEmailBody(selectedEmail)}
                    </div>
                  </div>
                </div>

                {/* Raw data (collapsible, for debugging) */}
                <details className="border-t border-bt-border">
                  <summary className="px-5 py-2.5 text-[11px] text-bt-text-tertiary cursor-pointer hover:text-bt-text-secondary transition-colors">
                    View raw email data
                  </summary>
                  <div className="px-5 pb-4">
                    <pre className="text-[10px] text-bt-text-tertiary bg-bt-bg-alt rounded-lg p-3 overflow-x-auto max-h-60">
                      {JSON.stringify(selectedEmail, null, 2)}
                    </pre>
                  </div>
                </details>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Mail className="w-10 h-10 text-bt-text-tertiary mx-auto mb-3" />
                  <p className="text-sm text-bt-text-secondary">Select an email to view details</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
