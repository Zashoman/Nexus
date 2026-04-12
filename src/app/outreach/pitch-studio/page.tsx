'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  SkipForward,
  Pencil,
  ChevronDown,
  ChevronUp,
  Undo2,
  Upload,
  Loader2,
  Send,
  User,
  Building2,
  BookOpen,
  Zap,
} from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';
import EmptyState from '@/components/outreach/ui/EmptyState';

interface Prospect {
  id: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  email?: string;
  organization?: { name?: string; industry?: string; estimated_num_employees?: number };
  subject?: string;
  opener?: string;
  status: 'pending' | 'approved' | 'edited' | 'skipped';
  previousDraft?: string;
}

interface CaseStudy {
  id: string;
  client_name: string;
  industry_tags: string[];
  result_headline: string;
  result_detail?: string;
}

interface Article {
  id: string;
  title: string;
  topic_tags: string[];
  summary?: string;
  url?: string;
}

const quickChips = [
  { label: 'Shorter', prompt: 'Make this email significantly shorter. Cut unnecessary filler. Get to the point in 2-3 sentences max.' },
  { label: 'More direct intro', prompt: 'Rewrite the opening line to be more direct and less generic. Lead with a specific observation about their company.' },
  { label: 'Warmer tone', prompt: 'Make the tone warmer and more conversational. Less formal, more human.' },
  { label: 'Stronger CTA', prompt: 'Strengthen the call-to-action. Make it specific and easy to say yes to.' },
  { label: 'Add urgency', prompt: 'Add a subtle sense of urgency or timeliness. Reference something recent or time-sensitive.' },
  { label: 'Less salesy', prompt: 'Tone down the sales language. Make it sound like a peer reaching out, not a salesperson pitching.' },
];

export default function PitchStudioPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [revisionPanelId, setRevisionPanelId] = useState<string | null>(null);
  const [revisionPrompt, setRevisionPrompt] = useState('');
  const [revising, setRevising] = useState(false);
  const [campaignType] = useState<'sales' | 'editorial'>('sales');

  useEffect(() => {
    // Load prospects from sessionStorage (set by the Prospects/Sales page)
    const stored = sessionStorage.getItem('pitch_studio_prospects');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setProspects(parsed.map((p: Prospect) => ({ ...p, status: p.status || 'pending' })));
      } catch { /* ignore */ }
    }

    // Load content libraries
    fetch('/api/outreach/content')
      .then((r) => r.json())
      .then((data) => {
        setCaseStudies(data.case_studies || []);
        setArticles(data.articles || []);
      })
      .catch(() => {});
  }, []);

  const stats = {
    total: prospects.length,
    approved: prospects.filter((p) => p.status === 'approved').length,
    edited: prospects.filter((p) => p.status === 'edited').length,
    skipped: prospects.filter((p) => p.status === 'skipped').length,
    pending: prospects.filter((p) => p.status === 'pending').length,
  };

  const updateProspect = (id: string, updates: Partial<Prospect>) => {
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const approve = (id: string) => {
    updateProspect(id, { status: 'approved' });
    advanceToNext(id);
  };

  const skip = (id: string) => {
    updateProspect(id, { status: 'skipped' });
    advanceToNext(id);
  };

  const advanceToNext = (currentId: string) => {
    const idx = prospects.findIndex((p) => p.id === currentId);
    const next = prospects.slice(idx + 1).find((p) => p.status === 'pending');
    if (next) setExpandedId(next.id);
  };

  const revise = async (prospect: Prospect) => {
    if (!revisionPrompt.trim()) return;
    setRevising(true);

    try {
      const res = await fetch('/api/outreach/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_name: `${prospect.first_name} ${prospect.last_name}`,
          sender_email: prospect.email,
          subject: prospect.subject || '',
          reply_text: prospect.opener || '',
          full_thread_html: prospect.opener || '',
          campaign_name: '',
          account_email: '',
          classification_summary: `Revision request: ${revisionPrompt}`,
        }),
      });
      const data = await res.json();
      if (data.draft) {
        updateProspect(prospect.id, {
          previousDraft: prospect.opener,
          opener: data.draft,
          status: 'edited',
        });
      }
    } catch (err) {
      console.error('Revision failed:', err);
    } finally {
      setRevising(false);
      setRevisionPrompt('');
    }
  };

  const undoRevision = (id: string) => {
    const p = prospects.find((p) => p.id === id);
    if (p?.previousDraft) {
      updateProspect(id, { opener: p.previousDraft, previousDraft: undefined, status: 'pending' });
    }
  };

  const useCaseStudy = (cs: CaseStudy) => {
    setRevisionPrompt(`Incorporate the ${cs.client_name} case study. Reference: "${cs.result_headline}." Weave naturally as social proof, not a hard sell.`);
  };

  const useArticle = (article: Article) => {
    setRevisionPrompt(`Reference the article "${article.title}" as relevant thought leadership. Mention it naturally as something valuable to share.`);
  };

  const approvedProspects = prospects.filter((p) => p.status === 'approved' || p.status === 'edited');

  const downloadCsv = async () => {
    try {
      const res = await fetch('/api/outreach/apollo/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects: approvedProspects }),
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pitches-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const contentItems = campaignType === 'editorial' ? articles : caseStudies;
  const contentLabel = campaignType === 'editorial' ? 'Articles' : 'Case Studies';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pitch Studio"
        subtitle="Review, revise, and approve AI-generated pitches"
      />

      {/* Pipeline progress */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-bt-green flex items-center justify-center"><Check className="w-4 h-4 text-white" /></div>
          <span className="text-xs font-medium text-bt-text">Search Apollo</span>
        </div>
        <div className="flex-1 h-px bg-bt-green" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-bt-primary flex items-center justify-center"><Pencil className="w-3.5 h-3.5 text-white" /></div>
          <span className="text-xs font-medium text-bt-primary">Review Pitches</span>
        </div>
        <div className="flex-1 h-px bg-bt-border" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-bt-bg-alt border border-bt-border flex items-center justify-center"><Upload className="w-3.5 h-3.5 text-bt-text-tertiary" /></div>
          <span className="text-xs font-medium text-bt-text-tertiary">Import to Instantly</span>
        </div>
      </div>

      {/* Stats bar */}
      {prospects.length > 0 && (
        <div className="flex items-center gap-6 px-5 py-3 rounded-xl bg-bt-surface border border-bt-border">
          <div className="text-center"><p className="text-lg font-bold text-bt-text tabular-nums">{stats.total}</p><p className="text-[10px] text-bt-text-tertiary">Total</p></div>
          <div className="text-center"><p className="text-lg font-bold text-bt-green tabular-nums">{stats.approved + stats.edited}</p><p className="text-[10px] text-bt-text-tertiary">Approved</p></div>
          <div className="text-center"><p className="text-lg font-bold text-bt-text-tertiary tabular-nums">{stats.skipped}</p><p className="text-[10px] text-bt-text-tertiary">Skipped</p></div>
          <div className="text-center"><p className="text-lg font-bold text-bt-primary tabular-nums">{stats.pending}</p><p className="text-[10px] text-bt-text-tertiary">Pending</p></div>
        </div>
      )}

      {/* Empty state */}
      {prospects.length === 0 && (
        <EmptyState
          icon={<Sparkles className="w-8 h-8" />}
          title="No pitches to review"
          description="Go to the Prospects page, search for prospects, and click 'Generate pitches' to send them here for review."
          action={
            <a href="/outreach/sales"><Button variant="primary" icon={<User className="w-4 h-4" />}>Go to Prospects</Button></a>
          }
        />
      )}

      {/* Prospect cards */}
      {prospects.length > 0 && (
        <div className="space-y-3">
          {prospects.map((prospect) => {
            const isExpanded = expandedId === prospect.id;
            const showRevisionPanel = revisionPanelId === prospect.id;
            const statusColor = prospect.status === 'approved' || prospect.status === 'edited' ? 'success' : prospect.status === 'skipped' ? 'default' : 'info';

            return (
              <Card key={prospect.id} padding="none" className={prospect.status === 'skipped' ? 'opacity-40' : ''}>
                {/* Header — always visible */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : prospect.id)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-bt-surface-hover transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-bt-bg-alt flex items-center justify-center">
                      <User className="w-4 h-4 text-bt-text-tertiary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-bt-text">{prospect.first_name} {prospect.last_name}</p>
                      <p className="text-xs text-bt-text-secondary">{prospect.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="default" size="sm">{prospect.organization?.name}</Badge>
                        {prospect.organization?.industry && <Badge variant="info" size="sm">{prospect.organization.industry}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColor} size="sm">{prospect.status}</Badge>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-bt-text-tertiary" /> : <ChevronDown className="w-4 h-4 text-bt-text-tertiary" />}
                  </div>
                </button>

                {/* Expanded: email preview + actions */}
                {isExpanded && prospect.status !== 'skipped' && (
                  <div className="px-5 pb-5 border-t border-bt-border">
                    {/* Email preview */}
                    <div className="mt-4 rounded-lg border border-bt-border overflow-hidden">
                      <div className="px-4 py-2.5 bg-bt-bg-alt border-b border-bt-border flex items-center justify-between">
                        <div className="text-xs text-bt-text-secondary">
                          To: <span className="text-bt-text font-medium">{prospect.email}</span>
                        </div>
                      </div>
                      {prospect.subject && (
                        <div className="px-4 py-2 border-b border-bt-border">
                          <p className="text-xs text-bt-text-secondary">Subject: <span className="text-bt-text font-medium">{prospect.subject}</span></p>
                        </div>
                      )}
                      <div className="px-4 py-3">
                        <p className="text-sm text-bt-text leading-relaxed whitespace-pre-wrap">{prospect.opener || '(no draft generated)'}</p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-4">
                      <Button variant="success" size="sm" onClick={() => approve(prospect.id)} icon={<Check className="w-3.5 h-3.5" />}>Approve</Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setRevisionPanelId(showRevisionPanel ? null : prospect.id)}
                        icon={<Sparkles className="w-3.5 h-3.5" />}
                      >
                        AI revision & content
                      </Button>
                      {prospect.previousDraft && (
                        <Button variant="ghost" size="sm" onClick={() => undoRevision(prospect.id)} icon={<Undo2 className="w-3.5 h-3.5" />}>Undo</Button>
                      )}
                      <div className="flex-1" />
                      <Button variant="ghost" size="sm" onClick={() => skip(prospect.id)} icon={<SkipForward className="w-3.5 h-3.5" />}>Skip</Button>
                    </div>

                    {/* AI Revision Panel */}
                    {showRevisionPanel && (
                      <div className="mt-4 border border-bt-primary/20 rounded-lg bg-bt-primary-bg/10 p-4 space-y-4">
                        {/* Section 1: Content suggestions */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-3.5 h-3.5 text-bt-primary" />
                            <span className="text-xs font-semibold text-bt-primary">
                              {campaignType === 'editorial' ? 'Editorial mode — Articles' : 'Sales mode — Case Studies'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(contentItems as (CaseStudy | Article)[]).map((item) => {
                              const isCs = 'client_name' in item;
                              const label = isCs ? (item as CaseStudy).client_name : (item as Article).title;
                              const tags = isCs ? (item as CaseStudy).industry_tags : (item as Article).topic_tags;
                              const matchesIndustry = prospect.organization?.industry && tags.some((t) =>
                                prospect.organization?.industry?.toLowerCase().includes(t.toLowerCase()) ||
                                t.toLowerCase().includes(prospect.organization?.industry?.toLowerCase() || '')
                              );

                              return (
                                <button
                                  key={item.id}
                                  onClick={() => isCs ? useCaseStudy(item as CaseStudy) : useArticle(item as Article)}
                                  className={`
                                    text-xs px-2.5 py-1.5 rounded-lg border transition-colors text-left
                                    ${matchesIndustry
                                      ? 'border-bt-primary/40 bg-bt-primary-bg/30 text-bt-primary'
                                      : 'border-bt-border bg-bt-surface text-bt-text-secondary hover:border-bt-primary/30'
                                    }
                                  `}
                                >
                                  {matchesIndustry && <span className="text-[9px] font-bold mr-1">MATCH</span>}
                                  {label}
                                </button>
                              );
                            })}
                            {contentItems.length === 0 && (
                              <p className="text-xs text-bt-text-tertiary">No {contentLabel.toLowerCase()} loaded. Add them in Settings.</p>
                            )}
                          </div>
                        </div>

                        <hr className="border-bt-border" />

                        {/* Section 2: Quick chips */}
                        <div>
                          <p className="text-xs font-semibold text-bt-text-secondary mb-2">Quick adjustments</p>
                          <div className="flex flex-wrap gap-1.5">
                            {quickChips.map((chip) => (
                              <button
                                key={chip.label}
                                onClick={() => setRevisionPrompt(chip.prompt)}
                                className="text-xs px-2.5 py-1.5 rounded-full bg-bt-bg-alt text-bt-text-secondary hover:bg-bt-border hover:text-bt-text transition-colors"
                              >
                                {chip.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <hr className="border-bt-border" />

                        {/* Section 3: Freeform prompt */}
                        <div>
                          <p className="text-xs font-semibold text-bt-text-secondary mb-2">Natural language prompt</p>
                          <textarea
                            value={revisionPrompt}
                            onChange={(e) => setRevisionPrompt(e.target.value)}
                            placeholder="e.g., The pitch is too cheesy — make the intro more direct and reference their product launch instead of the funding round."
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary resize-none"
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => revise(prospect)}
                              loading={revising}
                              disabled={!revisionPrompt.trim()}
                              icon={<Sparkles className="w-3.5 h-3.5" />}
                            >
                              Revise
                            </Button>
                            <button onClick={() => setRevisionPanelId(null)} className="text-xs text-bt-text-tertiary hover:text-bt-text">Close panel</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Sticky bottom bar */}
      {approvedProspects.length > 0 && (
        <div className="sticky bottom-0 bg-bt-bg/90 backdrop-blur-sm border-t border-bt-border -mx-6 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-bt-text">
                {approvedProspects.length} pitches approved
              </p>
              <p className="text-xs text-bt-text-tertiary">Ready to import to Instantly</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={downloadCsv} icon={<Send className="w-3.5 h-3.5" />}>
                Download CSV
              </Button>
              <Button variant="success" size="lg" icon={<Upload className="w-4 h-4" />}>
                Import to Instantly
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
