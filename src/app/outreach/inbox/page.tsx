'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Mail,
  Send,
  ChevronDown,
  Loader2,
  Inbox as InboxIcon,
  Clock,
  User,
  Building2,
  ArrowRight,
  Sparkles,
  MessageCircle,
  CalendarCheck,
  XCircle,
  Clock3,
  BotMessageSquare,
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
  from_name?: string;
  subject?: string;
  body?: unknown;
  text_body?: string;
  html_body?: string;
  timestamp_email?: string;
  timestamp_created?: string;
  timestamp?: string;
  created_at?: string;
  date?: string;
  is_unread?: number;
  campaign_id?: string;
  thread_id?: string;
  lead?: string;
  lead_email?: string;
  eaccount?: string;
  account_email?: string;
  ue_type?: number;
  i_status?: number;
  content_preview?: string;
  from_address_json?: Array<{ address: string; name: string }>;
  [key: string]: unknown;
}

interface Classification {
  category: string;
  confidence: number;
  summary: string;
  needs_reply: boolean;
  priority: 'high' | 'medium' | 'low' | 'none';
}

interface InstantlyCampaign {
  id: string;
  name: string;
  status: string;
}

type InboxTab = 'needs_reply' | 'auto_ooo' | 'not_interested' | 'all';

const tabs: { id: InboxTab; label: string; icon: typeof MessageCircle }[] = [
  { id: 'needs_reply', label: 'Needs Reply', icon: MessageCircle },
  { id: 'auto_ooo', label: 'Auto / OOO', icon: BotMessageSquare },
  { id: 'not_interested', label: 'Not Interested', icon: XCircle },
  { id: 'all', label: 'All Replies', icon: Mail },
];

const categoryConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'primary' | 'teal'; icon: typeof MessageCircle; tab: InboxTab }> = {
  interested: { label: 'Interested', variant: 'success', icon: MessageCircle, tab: 'needs_reply' },
  meeting_request: { label: 'Meeting Request', variant: 'teal', icon: CalendarCheck, tab: 'needs_reply' },
  question: { label: 'Question', variant: 'info', icon: MessageCircle, tab: 'needs_reply' },
  not_now_later: { label: 'Not Now', variant: 'warning', icon: Clock3, tab: 'needs_reply' },
  not_interested: { label: 'Not Interested', variant: 'danger', icon: XCircle, tab: 'not_interested' },
  unsubscribe: { label: 'Unsubscribe', variant: 'danger', icon: XCircle, tab: 'not_interested' },
  out_of_office: { label: 'Out of Office', variant: 'default', icon: BotMessageSquare, tab: 'auto_ooo' },
  auto_reply: { label: 'Auto-reply', variant: 'default', icon: BotMessageSquare, tab: 'auto_ooo' },
  wrong_person: { label: 'Wrong Person', variant: 'warning', icon: User, tab: 'needs_reply' },
  unclassified: { label: 'Unclassified', variant: 'default', icon: Mail, tab: 'all' },
};

const campaignNameCache: Record<string, string> = {};

// --- Helper functions ---

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
  } catch { return ''; }
}

function getSenderName(email: InstantlyEmail): string {
  if (email.from_address_json?.[0]?.name) return email.from_address_json[0].name;
  return email.from_name || email.from_address_email || email.lead || 'Unknown';
}

function getSenderEmail(email: InstantlyEmail): string {
  if (email.from_address_json?.[0]?.address) return email.from_address_json[0].address;
  return email.from_address_email || email.lead || '';
}

function getEmailBodyPlain(email: InstantlyEmail): string {
  try {
    if (email.content_preview && typeof email.content_preview === 'string') return email.content_preview;
    let raw = '';
    if (email.text_body && typeof email.text_body === 'string') raw = email.text_body;
    else if (email.body && typeof email.body === 'object' && email.body !== null) {
      const b = email.body as Record<string, string>;
      raw = b.text || b.html || '';
    } else if (typeof email.body === 'string') raw = email.body;
    else if (typeof email.html_body === 'string') raw = email.html_body;
    return raw.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  } catch { return String(email.content_preview || ''); }
}

function getEmailBodyHtml(email: InstantlyEmail): string {
  try {
    if (email.body && typeof email.body === 'object' && email.body !== null) {
      const b = email.body as Record<string, string>;
      if (b.html) return b.html;
      if (b.text) return b.text.replace(/\n/g, '<br>');
    }
    if (typeof email.html_body === 'string') return email.html_body;
    if (typeof email.body === 'string') return email.body;
    if (typeof email.text_body === 'string') return email.text_body.replace(/\n/g, '<br>');
    return String(email.content_preview || '').replace(/\n/g, '<br>');
  } catch { return String(email.content_preview || ''); }
}

function getSubject(email: InstantlyEmail): string {
  return email.subject || '(no subject)';
}

function getCampaignName(campaignId?: string): string {
  if (!campaignId) return '';
  return campaignNameCache[campaignId] || campaignId.substring(0, 8) + '...';
}

// --- Main component ---

export default function InboxPage() {
  const [emails, setEmails] = useState<InstantlyEmail[]>([]);
  const [campaigns, setCampaigns] = useState<InstantlyCampaign[]>([]);
  const [classifications, setClassifications] = useState<Record<string, Classification>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [draftLoading, setDraftLoading] = useState<string | null>(null);
  const [pushingToSlack, setPushingToSlack] = useState(false);
  const [slackResult, setSlackResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [classifying, setClassifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<InstantlyEmail | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [activeTab, setActiveTab] = useState<InboxTab>('all');
  const [search, setSearch] = useState('');
  const [totalFetched, setTotalFetched] = useState(0);

  const fetchEmails = useCallback(async (campaignId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '100', replies_only: 'true' });
      if (campaignId) params.set('campaign_id', campaignId);
      const res = await fetch(`/api/outreach/instantly/replies?${params}`);
      const data = await res.json();
      if (data.error) { setError(data.error); setEmails([]); }
      else {
        const sorted = (data.emails || []).sort((a: InstantlyEmail, b: InstantlyEmail) => {
          const aTs = a.timestamp_email || a.timestamp_created || '';
          const bTs = b.timestamp_email || b.timestamp_created || '';
          return new Date(bTs).getTime() - new Date(aTs).getTime();
        });
        setEmails(sorted);
        setTotalFetched(data.total_fetched || 0);
      }
    } catch { setError('Failed to fetch emails'); }
    finally { setLoading(false); }
  }, []);

  const pushToSlack = async () => {
    // Only push replies that have both a classification and a draft
    const repliesWithDrafts = emails.filter((e) => classifications[e.id] && drafts[e.id]);
    if (repliesWithDrafts.length === 0) {
      setSlackResult('No replies with drafts to send. Classify and draft replies first.');
      return;
    }

    setPushingToSlack(true);
    setSlackResult(null);
    try {
      const payload = repliesWithDrafts.map((e) => ({
        id: e.id,
        sender_name: getSenderName(e),
        sender_email: getSenderEmail(e),
        subject: getSubject(e),
        reply_preview: getEmailBodyPlain(e),
        campaign_name: getCampaignName(e.campaign_id),
        classification: categoryConfig[classifications[e.id]?.category]?.label || classifications[e.id]?.category,
        confidence: classifications[e.id]?.confidence || 0,
        priority: classifications[e.id]?.priority || 'medium',
        ai_summary: classifications[e.id]?.summary || '',
        draft_reply: drafts[e.id],
        account_email: e.eaccount || e.account_email || '',
      }));

      const res = await fetch('/api/outreach/slack/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replies: payload }),
      });
      const data = await res.json();
      if (data.error) {
        setSlackResult(`Error: ${data.error}`);
      } else {
        setSlackResult(`Sent ${data.sent} replies to #bluetree-ai`);
      }
    } catch {
      setSlackResult('Failed to push to Slack');
    } finally {
      setPushingToSlack(false);
    }
  };

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/outreach/instantly/campaigns');
      const data = await res.json();
      const list = data.campaigns || [];
      setCampaigns(list);
      list.forEach((c: InstantlyCampaign) => { campaignNameCache[c.id] = c.name; });
    } catch { /* silent */ }
  }, []);

  const classifyEmails = async () => {
    if (emails.length === 0) return;
    setClassifying(true);
    try {
      const replies = emails.map((e) => ({
        id: e.id,
        senderName: getSenderName(e),
        senderEmail: getSenderEmail(e),
        subject: getSubject(e),
        body: getEmailBodyPlain(e).substring(0, 1500),
        campaignContext: getCampaignName(e.campaign_id),
      }));

      const res = await fetch('/api/outreach/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replies }),
      });
      const data = await res.json();
      if (data.classifications) {
        setClassifications(data.classifications);
      }
    } catch (err) {
      console.error('Classification failed:', err);
    } finally {
      setClassifying(false);
    }
  };

  const generateDraft = async (email: InstantlyEmail) => {
    setDraftLoading(email.id);
    try {
      const classification = classifications[email.id];
      const res = await fetch('/api/outreach/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_name: getSenderName(email),
          sender_email: getSenderEmail(email),
          subject: getSubject(email),
          reply_text: getEmailBodyPlain(email),
          full_thread_html: getEmailBodyHtml(email),
          campaign_name: getCampaignName(email.campaign_id),
          account_email: email.eaccount || email.account_email || '',
          classification_summary: classification?.summary || '',
        }),
      });
      const data = await res.json();
      if (data.draft) {
        setDrafts((prev) => ({ ...prev, [email.id]: data.draft }));
      }
    } catch (err) {
      console.error('Draft generation failed:', err);
    } finally {
      setDraftLoading(null);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchEmails();
  }, [fetchCampaigns, fetchEmails]);

  const handleCampaignFilter = (campaignId: string) => {
    setSelectedCampaign(campaignId);
    setSelectedEmail(null);
    setClassifications({});
    setDrafts({});
    fetchEmails(campaignId || undefined);
  };

  const getEmailCategory = (email: InstantlyEmail): string => {
    if (classifications[email.id]) return classifications[email.id].category;
    return 'unclassified';
  };

  const getEmailTab = (email: InstantlyEmail): InboxTab => {
    const cat = getEmailCategory(email);
    const config = categoryConfig[cat];
    if (!config) return 'all';
    // Also use needs_reply flag from classification
    if (classifications[email.id]?.needs_reply) return 'needs_reply';
    return config.tab;
  };

  const isClassified = Object.keys(classifications).length > 0;

  // Filter by tab, then by search
  const tabFiltered = activeTab === 'all'
    ? emails
    : isClassified
      ? emails.filter((e) => getEmailTab(e) === activeTab)
      : emails;

  const searchFiltered = search
    ? tabFiltered.filter((e) => {
        const q = search.toLowerCase();
        return getSenderName(e).toLowerCase().includes(q) ||
               getSubject(e).toLowerCase().includes(q) ||
               getEmailBodyPlain(e).toLowerCase().includes(q);
      })
    : tabFiltered;

  // Tab counts
  const tabCounts: Record<InboxTab, number> = {
    needs_reply: isClassified ? emails.filter((e) => getEmailTab(e) === 'needs_reply').length : 0,
    auto_ooo: isClassified ? emails.filter((e) => getEmailTab(e) === 'auto_ooo').length : 0,
    not_interested: isClassified ? emails.filter((e) => getEmailTab(e) === 'not_interested').length : 0,
    all: emails.length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        subtitle={loading ? 'Loading...' : `${emails.length} replies from ${totalFetched} emails`}
        action={
          <div className="flex items-center gap-2">
            {!isClassified && emails.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={classifyEmails}
                loading={classifying}
                icon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Classify with AI
              </Button>
            )}
            {isClassified && (
              <Button
                variant="secondary"
                size="sm"
                onClick={classifyEmails}
                loading={classifying}
                icon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Re-classify
              </Button>
            )}
            {Object.keys(drafts).length > 0 && (
              <Button
                variant="success"
                size="sm"
                onClick={pushToSlack}
                loading={pushingToSlack}
                icon={<Send className="w-3.5 h-3.5" />}
              >
                Send to Slack ({Object.keys(drafts).length})
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchEmails(selectedCampaign || undefined)}
              loading={loading}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-bt-bg-alt rounded-lg w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count = tabCounts[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedEmail(null); }}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                ${activeTab === tab.id
                  ? 'bg-bt-surface text-bt-text shadow-sm'
                  : 'text-bt-text-secondary hover:text-bt-text'
                }
              `}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {(isClassified || tab.id === 'all') && (
                <span className={`
                  text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums
                  ${activeTab === tab.id
                    ? 'bg-bt-primary text-white'
                    : 'bg-bt-border text-bt-text-secondary'
                  }
                `}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Classifying banner */}
      {classifying && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-bt-primary-bg/50 border border-bt-primary/20">
          <Loader2 className="w-4 h-4 text-bt-primary animate-spin" />
          <span className="text-sm text-bt-text">Classifying {emails.length} replies with AI...</span>
        </div>
      )}

      {/* Slack result banner */}
      {slackResult && (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg ${slackResult.startsWith('Error') || slackResult.startsWith('Failed') ? 'bg-bt-red-bg/50 border border-bt-red/20' : slackResult.startsWith('No replies') ? 'bg-bt-amber-bg/50 border border-bt-amber/20' : 'bg-bt-green-bg/50 border border-bt-green/20'}`}>
          <span className="text-sm text-bt-text">{slackResult}</span>
          <button onClick={() => setSlackResult(null)} className="text-xs text-bt-text-tertiary hover:text-bt-text">Dismiss</button>
        </div>
      )}

      {/* Not classified hint */}
      {!isClassified && !classifying && emails.length > 0 && activeTab !== 'all' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-bt-bg-alt border border-bt-border">
          <Sparkles className="w-4 h-4 text-bt-text-tertiary" />
          <span className="text-sm text-bt-text-secondary">
            Click <strong>&quot;Classify with AI&quot;</strong> to sort replies into tabs automatically.
          </span>
        </div>
      )}

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
        <Card><div className="text-center py-8">
          <p className="text-sm text-bt-red mb-2">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => fetchEmails()}>Try again</Button>
        </div></Card>
      )}

      {/* Empty */}
      {!loading && !error && searchFiltered.length === 0 && (
        <EmptyState
          icon={<InboxIcon className="w-8 h-8" />}
          title={activeTab === 'all' ? 'No replies found' : `No replies in "${tabs.find(t => t.id === activeTab)?.label}"`}
          description={isClassified ? 'Try a different tab or campaign filter.' : 'Click "Classify with AI" to sort replies into tabs.'}
          action={activeTab !== 'all' ? <Button variant="ghost" size="sm" onClick={() => setActiveTab('all')}>View all replies</Button> : undefined}
        />
      )}

      {/* Split view */}
      {!loading && !error && searchFiltered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[600px]">
          {/* Reply list */}
          <div className="lg:col-span-2">
            <Card padding="none" className="h-full overflow-hidden">
              <div className="divide-y divide-bt-border overflow-y-auto max-h-[700px]">
                {searchFiltered.map((email) => {
                  const isSelected = selectedEmail?.id === email.id;
                  const cat = getEmailCategory(email);
                  const config = categoryConfig[cat] || categoryConfig.unclassified;
                  const classification = classifications[email.id];
                  return (
                    <button
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className={`w-full text-left px-4 py-3.5 transition-colors ${isSelected ? 'bg-bt-primary-bg/50' : 'hover:bg-bt-surface-hover'}`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-bt-bg-alt flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-bt-text-tertiary" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-bt-text truncate block">{getSenderName(email)}</span>
                            <span className="text-[11px] text-bt-text-tertiary truncate block">{getSenderEmail(email)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                          <span className="text-[11px] text-bt-text-tertiary">{getEmailTime(email)}</span>
                          <Badge variant={config.variant} size="sm">{config.label}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-bt-text truncate mt-1">{getSubject(email)}</p>
                      {classification?.summary ? (
                        <p className="text-xs text-bt-primary mt-1 truncate">{classification.summary}</p>
                      ) : (
                        <p className="text-xs text-bt-text-tertiary mt-1 line-clamp-2">{getEmailBodyPlain(email).substring(0, 150)}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-2">
                        <Badge variant="default" size="sm">{getCampaignName(email.campaign_id)}</Badge>
                        {classification && (
                          <Badge variant={classification.priority === 'high' ? 'success' : classification.priority === 'medium' ? 'warning' : 'default'} size="sm">
                            {classification.priority} priority
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Detail */}
          <div className="lg:col-span-3">
            {selectedEmail ? (
              <Card padding="none" className="h-full flex flex-col">
                <div className="p-5 border-b border-bt-border">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-bt-text">{getSubject(selectedEmail)}</h3>
                    {classifications[selectedEmail.id] && (
                      <Badge variant={categoryConfig[classifications[selectedEmail.id].category]?.variant || 'default'} size="sm">
                        {categoryConfig[classifications[selectedEmail.id].category]?.label || classifications[selectedEmail.id].category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-bt-bg-alt flex items-center justify-center">
                      <User className="w-4 h-4 text-bt-text-tertiary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-bt-text">{getSenderName(selectedEmail)}</p>
                      <p className="text-xs text-bt-text-secondary">{getSenderEmail(selectedEmail)}</p>
                    </div>
                  </div>
                  {/* AI classification summary */}
                  {classifications[selectedEmail.id] && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-bt-primary-bg/30 border border-bt-primary/10 mb-3">
                      <Sparkles className="w-4 h-4 text-bt-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-bt-primary">AI Classification</p>
                        <p className="text-sm text-bt-text mt-0.5">{classifications[selectedEmail.id].summary}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant={categoryConfig[classifications[selectedEmail.id].category]?.variant || 'default'} size="sm">
                            {categoryConfig[classifications[selectedEmail.id].category]?.label}
                          </Badge>
                          <span className="text-[10px] text-bt-text-tertiary">
                            {Math.round(classifications[selectedEmail.id].confidence * 100)}% confidence
                          </span>
                          {classifications[selectedEmail.id].needs_reply && (
                            <Badge variant="success" size="sm" dot>Needs reply</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-bt-text-tertiary">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{getEmailTime(selectedEmail)}</span>
                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{getCampaignName(selectedEmail.campaign_id)}</span>
                    {selectedEmail.eaccount && (
                      <span className="flex items-center gap-1"><ArrowRight className="w-3 h-3" />via {selectedEmail.eaccount}</span>
                    )}
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />Lead: {selectedEmail.lead || getSenderEmail(selectedEmail)}</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  <div className="email-body text-sm text-bt-text leading-relaxed" dangerouslySetInnerHTML={{ __html: getEmailBodyHtml(selectedEmail) }} />
                </div>
                {/* Draft Reply section */}
                <div className="px-5 py-4 border-t border-bt-border">
                  {drafts[selectedEmail.id] ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-bt-teal" />
                          <span className="text-xs font-semibold text-bt-teal">AI Draft Reply</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => generateDraft(selectedEmail)}
                          loading={draftLoading === selectedEmail.id}
                          icon={<RefreshCw className="w-3 h-3" />}
                        >
                          Regenerate
                        </Button>
                      </div>
                      <div className="bg-bt-teal/5 border border-bt-teal/20 rounded-lg p-4">
                        <div className="text-sm text-bt-text leading-relaxed whitespace-pre-wrap">
                          {drafts[selectedEmail.id]}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => generateDraft(selectedEmail)}
                      loading={draftLoading === selectedEmail.id}
                      icon={<Sparkles className="w-3.5 h-3.5" />}
                      className="w-full"
                    >
                      {draftLoading === selectedEmail.id ? 'Generating draft...' : 'Draft Reply'}
                    </Button>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-bt-border bg-bt-bg/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-bt-text-tertiary">
                      Account: {selectedEmail.eaccount || selectedEmail.account_email} &middot; Thread: {selectedEmail.thread_id?.substring(0, 12)}...
                    </span>
                    <details className="text-[11px]">
                      <summary className="text-bt-text-tertiary cursor-pointer hover:text-bt-text-secondary">Raw data</summary>
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
