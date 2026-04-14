'use client';

import { useState, useEffect } from 'react';
import {
  Zap,
  Globe,
  MessageSquare,
  Users,
  Shield,
  Bell,
  XCircle,
  ExternalLink,
  RefreshCw,
  Loader2,
  PenTool,
  BookOpen,
  FileText,
  Plus,
} from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card, { CardHeader } from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';
import { apiFetch } from '@/lib/api-client';

type SettingsTab = 'integrations' | 'team' | 'writers' | 'content' | 'training' | 'guardrails' | 'notifications';

const settingsTabs: { id: SettingsTab; label: string; icon: typeof Zap }[] = [
  { id: 'integrations', label: 'Integrations', icon: Zap },
  { id: 'writers', label: 'Writers', icon: PenTool },
  { id: 'content', label: 'Content', icon: BookOpen },
  { id: 'training', label: 'Training Docs', icon: FileText },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'guardrails', label: 'Guardrails', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

interface InstantlyCampaign { id: string; name: string; status: string; }
interface Writer { id: string; name: string; pen_name?: string; website?: string; primary_verticals: string[]; bio?: string; publication_count: number; publications: string[]; active: boolean; }
interface CaseStudy { id: string; client_name: string; industry_tags: string[]; result_headline: string; active: boolean; }
interface Article { id: string; title: string; topic_tags: string[]; url?: string; active: boolean; }
interface TrainingDoc { id: string; title: string; document_type: string; campaign_type?: string; created_at: string; }

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('integrations');

  // Instantly
  const [instantlyConnected, setInstantlyConnected] = useState(false);
  const [instantlyLoading, setInstantlyLoading] = useState(false);
  const [instantlyError, setInstantlyError] = useState<string | null>(null);
  const [instantlyCampaigns, setInstantlyCampaigns] = useState<InstantlyCampaign[]>([]);
  const [campaignCount, setCampaignCount] = useState(0);

  // Writers
  const [writers, setWriters] = useState<Writer[]>([]);
  const [writersLoading, setWritersLoading] = useState(false);

  // Content
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [contentLoading, setContentLoading] = useState(false);

  // Training
  const [trainingDocs, setTrainingDocs] = useState<TrainingDoc[]>([]);
  const [, setTrainingLoading] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('sales_playbook');
  const [newDocContent, setNewDocContent] = useState('');

  const testInstantly = async () => {
    setInstantlyLoading(true);
    setInstantlyError(null);
    try {
      const res = await apiFetch('/api/outreach/instantly/test');
      const data = await res.json();
      if (data.ok) { setInstantlyConnected(true); setCampaignCount(data.campaign_count || 0); }
      else { setInstantlyError(data.error || 'Connection failed'); setInstantlyConnected(false); }
    } catch { setInstantlyError('Failed to reach API'); setInstantlyConnected(false); }
    finally { setInstantlyLoading(false); }
  };

  const loadInstantlyCampaigns = async () => {
    try {
      const res = await apiFetch('/api/outreach/instantly/campaigns');
      const data = await res.json();
      setInstantlyCampaigns(data.campaigns || []);
    } catch { setInstantlyError('Failed to load campaigns'); }
  };

  const loadWriters = async () => {
    setWritersLoading(true);
    try {
      const res = await apiFetch('/api/outreach/writers');
      const data = await res.json();
      setWriters(data.writers || []);
    } catch { /* silent */ }
    finally { setWritersLoading(false); }
  };

  const loadContent = async () => {
    setContentLoading(true);
    try {
      const res = await apiFetch('/api/outreach/content');
      const data = await res.json();
      setCaseStudies(data.case_studies || []);
      setArticles(data.articles || []);
    } catch { /* silent */ }
    finally { setContentLoading(false); }
  };

  const loadTraining = async () => {
    setTrainingLoading(true);
    try {
      const res = await apiFetch('/api/outreach/training-docs');
      const data = await res.json();
      setTrainingDocs(data.documents || []);
    } catch { /* silent */ }
    finally { setTrainingLoading(false); }
  };

  const uploadTrainingDoc = async () => {
    if (!newDocTitle.trim() || !newDocContent.trim()) return;
    try {
      await apiFetch('/api/outreach/training-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newDocTitle.trim(), document_type: newDocType, content: newDocContent.trim() }),
      });
      setNewDocTitle(''); setNewDocContent('');
      loadTraining();
    } catch { /* silent */ }
  };

  useEffect(() => {
    testInstantly();
    if (activeTab === 'writers') loadWriters();
    if (activeTab === 'content') loadContent();
    if (activeTab === 'training') loadTraining();
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Configure integrations, team, writer network, and guardrails" />

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-bt-border">
        {settingsTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'border-bt-primary text-bt-primary' : 'border-transparent text-bt-text-secondary hover:text-bt-text hover:border-bt-border'
              }`}>
              <Icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Integrations */}
      {activeTab === 'integrations' && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-bt-bg-alt"><Zap className="w-5 h-5 text-bt-text-secondary" /></div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-bt-text">Instantly</h3>
                    {instantlyLoading ? <Badge variant="default" size="sm"><Loader2 className="w-3 h-3 animate-spin" /> Checking...</Badge>
                     : instantlyConnected ? <Badge variant="success" size="sm" dot>Connected ({campaignCount} campaigns)</Badge>
                     : <Badge variant="danger" size="sm" dot>Not connected</Badge>}
                  </div>
                  <p className="text-xs text-bt-text-secondary mt-0.5">READ-ONLY mode (no emails sent)</p>
                  {instantlyError && <p className="text-xs text-bt-red mt-1">{instantlyError}</p>}
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={testInstantly} loading={instantlyLoading} icon={<RefreshCw className="w-3.5 h-3.5" />}>Test</Button>
            </div>
            {instantlyConnected && (
              <div className="mt-4 pt-4 border-t border-bt-border">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-bt-text-secondary uppercase tracking-wider">Instantly Campaigns</h4>
                  <Button variant="ghost" size="sm" onClick={loadInstantlyCampaigns} icon={<RefreshCw className="w-3 h-3" />}>Load</Button>
                </div>
                {instantlyCampaigns.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {instantlyCampaigns.map((c) => (
                      <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-bt-bg-alt">
                        <p className="text-sm text-bt-text">{c.name}</p>
                        <Badge variant={c.status === 'active' ? 'success' : 'default'} size="sm">{c.status || 'unknown'}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
          {/* Other integrations */}
          {[
            { name: 'Apollo', icon: Globe, desc: 'Prospect enrichment and contact data' },
            { name: 'HubSpot', icon: Globe, desc: 'CRM for contact management and deal tracking' },
            { name: 'Slack', icon: MessageSquare, desc: 'Team notifications and draft approvals' },
          ].map((int) => (
            <Card key={int.name}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-bt-bg-alt"><int.icon className="w-5 h-5 text-bt-text-secondary" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-bt-text">{int.name}</h3>
                      <Badge variant="default" size="sm" dot>Not connected</Badge>
                    </div>
                    <p className="text-xs text-bt-text-secondary mt-0.5">{int.desc}</p>
                  </div>
                </div>
                <Button variant="primary" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>Connect</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Writers */}
      {activeTab === 'writers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-bt-text-secondary">Blue Tree writer network ({writers.length} writers)</p>
            <Button variant="secondary" size="sm" onClick={loadWriters} loading={writersLoading} icon={<RefreshCw className="w-3.5 h-3.5" />}>Refresh</Button>
          </div>
          {writers.map((w) => (
            <Card key={w.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-bt-text">{w.name}</h3>
                    {w.website && <a href={`https://${w.website}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-bt-primary hover:underline">{w.website}</a>}
                    <Badge variant={w.active ? 'success' : 'default'} size="sm">{w.active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  {w.bio && <p className="text-xs text-bt-text-secondary mt-1 line-clamp-2">{w.bio}</p>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(w.primary_verticals || []).map((v) => <Badge key={v} variant="info" size="sm">{v}</Badge>)}
                  </div>
                  {w.publications.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {w.publications.slice(0, 6).map((p) => <Badge key={p} variant="default" size="sm">{p}</Badge>)}
                      {w.publications.length > 6 && <Badge variant="default" size="sm">+{w.publications.length - 6}</Badge>}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-xl font-bold text-bt-text tabular-nums">{w.publication_count}</p>
                  <p className="text-[10px] text-bt-text-tertiary">publications</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Content Libraries */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-bt-text-secondary">Case studies and articles for AI content suggestions</p>
            <Button variant="secondary" size="sm" onClick={loadContent} loading={contentLoading} icon={<RefreshCw className="w-3.5 h-3.5" />}>Refresh</Button>
          </div>

          {/* Case Studies */}
          <div>
            <h2 className="text-sm font-semibold text-bt-text mb-3">Case Studies (Sales campaigns)</h2>
            <Card padding="none">
              <div className="divide-y divide-bt-border">
                {caseStudies.map((cs) => (
                  <div key={cs.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-bt-text">{cs.client_name}</p>
                      <p className="text-xs text-bt-text-secondary">{cs.result_headline}</p>
                      <div className="flex gap-1 mt-1">{(cs.industry_tags || []).map((t) => <Badge key={t} variant="info" size="sm">{t}</Badge>)}</div>
                    </div>
                    <Badge variant={cs.active ? 'success' : 'default'} size="sm">{cs.active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                ))}
                {caseStudies.length === 0 && <p className="px-5 py-4 text-xs text-bt-text-tertiary">No case studies loaded. Run v3 SQL migration.</p>}
              </div>
            </Card>
          </div>

          {/* Articles */}
          <div>
            <h2 className="text-sm font-semibold text-bt-text mb-3">Articles (Editorial campaigns)</h2>
            <Card padding="none">
              <div className="divide-y divide-bt-border">
                {articles.map((a) => (
                  <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-bt-text">{a.title}</p>
                      {a.url && <p className="text-xs text-bt-primary">{a.url}</p>}
                      <div className="flex gap-1 mt-1">{(a.topic_tags || []).map((t) => <Badge key={t} variant="teal" size="sm">{t}</Badge>)}</div>
                    </div>
                    <Badge variant={a.active ? 'success' : 'default'} size="sm">{a.active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                ))}
                {articles.length === 0 && <p className="px-5 py-4 text-xs text-bt-text-tertiary">No articles yet. Add editorial content pieces.</p>}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Training Documents */}
      {activeTab === 'training' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Upload Training Document" subtitle="Feed the agent sales playbooks, editorial guides, and example emails" />
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-bt-text mb-1">Title</label>
                  <input type="text" value={newDocTitle} onChange={(e) => setNewDocTitle(e.target.value)}
                    placeholder="e.g., James's Sales Training Doc"
                    className="w-full h-9 px-3 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-bt-text mb-1">Type</label>
                  <select value={newDocType} onChange={(e) => setNewDocType(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text focus:outline-none focus:ring-2 focus:ring-bt-primary">
                    <option value="sales_playbook">Sales Playbook</option>
                    <option value="editorial_guide">Editorial Guide</option>
                    <option value="persona_voice">Persona Voice</option>
                    <option value="email_examples">Email Examples</option>
                    <option value="call_transcript">Call Transcript</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-bt-text mb-1">Content</label>
                <textarea value={newDocContent} onChange={(e) => setNewDocContent(e.target.value)}
                  rows={8} maxLength={50000}
                  placeholder="Paste the full document content here..."
                  className="w-full px-3 py-2 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary resize-y" />
              </div>
              <Button variant="primary" size="sm" onClick={uploadTrainingDoc} disabled={!newDocTitle.trim() || !newDocContent.trim()} icon={<Plus className="w-3.5 h-3.5" />}>Upload</Button>
            </div>
          </Card>

          {trainingDocs.length > 0 && (
            <Card padding="none">
              <div className="p-5 pb-3"><CardHeader title="Uploaded Documents" subtitle={`${trainingDocs.length} documents`} /></div>
              <div className="divide-y divide-bt-border">
                {trainingDocs.map((doc) => (
                  <div key={doc.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-bt-text">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="primary" size="sm">{doc.document_type.replace('_', ' ')}</Badge>
                        {doc.campaign_type && <Badge variant="default" size="sm">{doc.campaign_type}</Badge>}
                      </div>
                    </div>
                    <span className="text-[11px] text-bt-text-tertiary">{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Team */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-bt-text-secondary">Manage who has access</p>
            <Button size="sm" icon={<Users className="w-3.5 h-3.5" />}>Invite member</Button>
          </div>
          <Card padding="none">
            <table className="w-full">
              <thead><tr className="border-b border-bt-border">
                <th className="text-left text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-5 py-3">Name</th>
                <th className="text-left text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">Role</th>
                <th className="text-left text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">Status</th>
              </tr></thead>
              <tbody>
                <tr className="hover:bg-bt-surface-hover transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-bt-text">Blue Tree</td>
                  <td className="px-4 py-3.5"><Badge variant="primary" size="sm">Admin</Badge></td>
                  <td className="px-4 py-3.5"><Badge variant="success" size="sm" dot>Active</Badge></td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Guardrails */}
      {activeTab === 'guardrails' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Send Limits" subtitle="Maximum emails per inbox per day" />
            <div className="mt-4 flex items-center justify-between py-2">
              <span className="text-sm text-bt-text">Default daily send limit</span>
              <div className="flex items-center gap-2">
                <input type="number" defaultValue={50} className="w-20 h-8 px-3 rounded-md border border-bt-border bg-bt-surface text-sm text-bt-text text-right focus:outline-none focus:ring-2 focus:ring-bt-primary tabular-nums" />
                <span className="text-xs text-bt-text-secondary">per inbox</span>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Vocabulary Enforcement" subtitle="Pre-publish scan on every draft" />
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-[10px] text-bt-text-tertiary uppercase tracking-wider mb-2">Forbidden Phrases (flagged before team sees draft)</p>
                <div className="flex flex-wrap gap-1.5">
                  {['buying links', 'paid links', 'guest post farms', 'PBN', 'SEO juice', 'cheap', 'link farm', 'paid placement'].map((w) => (
                    <Badge key={w} variant="danger" size="sm">{w}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-bt-text-tertiary uppercase tracking-wider mb-2">Approved Phrases (encouraged in drafts)</p>
                <div className="flex flex-wrap gap-1.5">
                  {['editorially earned', 'writer-led', 'editorial brief', 'hands-off', 'guaranteed', 'long-term partnership', 'month-to-month', 'contextually natural'].map((w) => (
                    <Badge key={w} variant="success" size="sm">{w}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Blacklist" subtitle="Contacts and domains that should never be contacted" />
            <div className="mt-4 h-24 rounded-lg bg-bt-bg-alt border border-bt-border border-dashed flex items-center justify-center">
              <div className="text-center">
                <XCircle className="w-6 h-6 text-bt-text-tertiary mx-auto mb-1" />
                <p className="text-xs text-bt-text-tertiary">No blacklisted contacts yet</p>
                <Button variant="ghost" size="sm" className="mt-2">Add entry</Button>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Escalation Triggers" subtitle="Keywords that trigger automatic escalation to senior team" />
            <div className="mt-4 flex flex-wrap gap-1.5">
              {['angry', 'legal', 'lawsuit', 'unsubscribe', 'stop emailing', 'competitor mention'].map((k) => (
                <Badge key={k} variant="danger" size="sm">{k}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Daily Digest" subtitle="Summary of the day's outreach activity" />
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-bt-text">Enable daily digest</span>
                <button className="relative w-10 h-6 rounded-full bg-bt-primary transition-colors">
                  <span className="absolute left-[18px] top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-bt-text">Delivery time</span>
                <input type="time" defaultValue="09:00" className="h-8 px-3 rounded-md border border-bt-border bg-bt-surface text-sm text-bt-text focus:outline-none focus:ring-2 focus:ring-bt-primary" />
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Weekly Report" subtitle="Campaign performance and optimization recommendations" />
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-bt-text">Enable weekly report</span>
                <button className="relative w-10 h-6 rounded-full bg-bt-primary transition-colors">
                  <span className="absolute left-[18px] top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform" />
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
