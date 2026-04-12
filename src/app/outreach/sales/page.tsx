'use client';

import { useState } from 'react';
import {
  Search,
  Sparkles,
  Download,
  Plus,
  X,
  Building2,
  User,
  Briefcase,
  Globe,
  Users,
  AlertCircle,
} from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card, { CardHeader } from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';

interface ApolloPerson {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  email?: string;
  email_status?: string;
  linkedin_url?: string;
  organization?: {
    name?: string;
    website_url?: string;
    industry?: string;
    estimated_num_employees?: number;
    short_description?: string;
  };
  subject?: string;
  opener?: string;
}

const sizeRanges = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001+'];
const fundingStages = ['Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Public', 'Acquired'];

export default function SalesPage() {
  const [titles, setTitles] = useState<string[]>(['CEO', 'Founder']);
  const [titleInput, setTitleInput] = useState('');
  const [industries, setIndustries] = useState<string[]>([]);
  const [industryInput, setIndustryInput] = useState('');
  const [sizes, setSizes] = useState<string[]>([]);
  const [funding, setFunding] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState('');
  const [keywords, setKeywords] = useState('');
  const [perPage, setPerPage] = useState(25);

  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [people, setPeople] = useState<ApolloPerson[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const addTag = (input: string, setInput: (v: string) => void, list: string[], setList: (l: string[]) => void) => {
    const trimmed = input.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      setInput('');
    }
  };

  const removeTag = (item: string, list: string[], setList: (l: string[]) => void) => {
    setList(list.filter((i) => i !== item));
  };

  const toggleSize = (size: string) => {
    setSizes(sizes.includes(size) ? sizes.filter((s) => s !== size) : [...sizes, size]);
  };

  const toggleFunding = (stage: string) => {
    setFunding(funding.includes(stage) ? funding.filter((f) => f !== stage) : [...funding, stage]);
  };

  const search = async () => {
    setSearching(true);
    setError(null);
    setPeople([]);
    setExcluded(new Set());
    try {
      const res = await fetch('/api/outreach/apollo/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_titles: titles,
          organization_industries: industries.length > 0 ? industries : undefined,
          organization_num_employees_ranges: sizes.length > 0 ? sizes : undefined,
          organization_funding_stage: funding.length > 0 ? funding : undefined,
          person_locations: locations.length > 0 ? locations : undefined,
          q_keywords: keywords || undefined,
          per_page: perPage,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setPeople(data.people || []);
        setTotalResults(data.total || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const generateOpeners = async () => {
    const active = people.filter((p) => !excluded.has(p.id));
    if (active.length === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/outreach/apollo/openers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects: active }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        // Merge openers back into people
        const openerMap = new Map<string, { subject: string; opener: string }>();
        for (const o of data.openers || []) {
          openerMap.set(o.person_id, { subject: o.subject, opener: o.opener });
        }
        setPeople(people.map((p) => {
          const o = openerMap.get(p.id);
          return o ? { ...p, ...o } : p;
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const downloadCsv = async () => {
    const active = people.filter((p) => !excluded.has(p.id) && p.opener);
    if (active.length === 0) return;
    setDownloading(true);
    try {
      const res = await fetch('/api/outreach/apollo/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects: active }),
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prospects-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const toggleExclude = (id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const updateOpener = (id: string, field: 'subject' | 'opener', value: string) => {
    setPeople(people.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const activeCount = people.filter((p) => !excluded.has(p.id)).length;
  const withOpenersCount = people.filter((p) => !excluded.has(p.id) && p.opener).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Prospects"
        subtitle="Find prospects on Apollo, generate personalized openers, export for Instantly"
      />

      {/* Search Filters */}
      <Card>
        <CardHeader title="Search Filters" subtitle="Build your prospect list" />

        <div className="space-y-4 mt-4">
          {/* Job Titles */}
          <div>
            <label className="block text-xs font-medium text-bt-text mb-1.5">
              <Briefcase className="w-3.5 h-3.5 inline mr-1" />
              Job Titles
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {titles.map((t) => (
                <Badge key={t} variant="primary" size="sm">
                  {t} <button onClick={() => removeTag(t, titles, setTitles)} className="ml-1 hover:text-bt-red"><X className="w-3 h-3 inline" /></button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(titleInput, setTitleInput, titles, setTitles))}
                placeholder="e.g., CTO, VP Marketing, Head of Growth"
                className="flex-1 h-9 px-3 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary"
              />
              <Button variant="secondary" size="sm" onClick={() => addTag(titleInput, setTitleInput, titles, setTitles)} icon={<Plus className="w-3.5 h-3.5" />}>Add</Button>
            </div>
          </div>

          {/* Industries */}
          <div>
            <label className="block text-xs font-medium text-bt-text mb-1.5">
              <Building2 className="w-3.5 h-3.5 inline mr-1" />
              Industries
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {industries.map((i) => (
                <Badge key={i} variant="info" size="sm">
                  {i} <button onClick={() => removeTag(i, industries, setIndustries)} className="ml-1 hover:text-bt-red"><X className="w-3 h-3 inline" /></button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={industryInput}
                onChange={(e) => setIndustryInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(industryInput, setIndustryInput, industries, setIndustries))}
                placeholder="e.g., Information Technology, SaaS, Fintech"
                className="flex-1 h-9 px-3 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary"
              />
              <Button variant="secondary" size="sm" onClick={() => addTag(industryInput, setIndustryInput, industries, setIndustries)} icon={<Plus className="w-3.5 h-3.5" />}>Add</Button>
            </div>
          </div>

          {/* Company Size */}
          <div>
            <label className="block text-xs font-medium text-bt-text mb-1.5">
              <Users className="w-3.5 h-3.5 inline mr-1" />
              Company Size
            </label>
            <div className="flex flex-wrap gap-1.5">
              {sizeRanges.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSize(s)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                    sizes.includes(s)
                      ? 'bg-bt-primary text-white'
                      : 'bg-bt-bg-alt text-bt-text-secondary hover:bg-bt-border'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Funding Stage */}
          <div>
            <label className="block text-xs font-medium text-bt-text mb-1.5">Funding Stage</label>
            <div className="flex flex-wrap gap-1.5">
              {fundingStages.map((f) => (
                <button
                  key={f}
                  onClick={() => toggleFunding(f)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                    funding.includes(f)
                      ? 'bg-bt-primary text-white'
                      : 'bg-bt-bg-alt text-bt-text-secondary hover:bg-bt-border'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div>
            <label className="block text-xs font-medium text-bt-text mb-1.5">
              <Globe className="w-3.5 h-3.5 inline mr-1" />
              Locations
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {locations.map((l) => (
                <Badge key={l} variant="teal" size="sm">
                  {l} <button onClick={() => removeTag(l, locations, setLocations)} className="ml-1 hover:text-bt-red"><X className="w-3 h-3 inline" /></button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(locationInput, setLocationInput, locations, setLocations))}
                placeholder="e.g., United States, San Francisco, London"
                className="flex-1 h-9 px-3 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary"
              />
              <Button variant="secondary" size="sm" onClick={() => addTag(locationInput, setLocationInput, locations, setLocations)} icon={<Plus className="w-3.5 h-3.5" />}>Add</Button>
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-xs font-medium text-bt-text mb-1.5">Keywords (optional)</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g., AI, machine learning, climate tech"
              className="w-full h-9 px-3 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary"
            />
          </div>

          {/* Per page */}
          <div>
            <label className="block text-xs font-medium text-bt-text mb-1.5">Results to fetch</label>
            <select
              value={perPage}
              onChange={(e) => setPerPage(parseInt(e.target.value))}
              className="h-9 px-3 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text focus:outline-none focus:ring-2 focus:ring-bt-primary"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="primary"
              onClick={search}
              loading={searching}
              icon={<Search className="w-4 h-4" />}
            >
              Search Apollo
            </Button>
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-bt-red-bg/50 border border-bt-red/20">
          <AlertCircle className="w-4 h-4 text-bt-red shrink-0 mt-0.5" />
          <p className="text-sm text-bt-red">{error}</p>
        </div>
      )}

      {/* Results */}
      {people.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-bt-text">{activeCount} of {people.length} prospects selected</h2>
              <p className="text-xs text-bt-text-tertiary">Found {totalResults.toLocaleString()} total matches in Apollo</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={generateOpeners}
                loading={generating}
                disabled={activeCount === 0}
                icon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Generate Openers
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={downloadCsv}
                loading={downloading}
                disabled={withOpenersCount === 0}
                icon={<Download className="w-3.5 h-3.5" />}
              >
                Download CSV ({withOpenersCount})
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {people.map((p) => {
              const isExcluded = excluded.has(p.id);
              return (
                <Card key={p.id} padding="none" className={isExcluded ? 'opacity-40' : ''}>
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-bt-bg-alt flex items-center justify-center">
                          <User className="w-4 h-4 text-bt-text-tertiary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-bt-text">{p.first_name} {p.last_name}</p>
                          <p className="text-xs text-bt-text-secondary">{p.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="default" size="sm">{p.organization?.name}</Badge>
                            {p.organization?.industry && <Badge variant="info" size="sm">{p.organization.industry}</Badge>}
                            {p.organization?.estimated_num_employees && (
                              <Badge variant="default" size="sm">{p.organization.estimated_num_employees} emp.</Badge>
                            )}
                          </div>
                          {p.email && <p className="text-[11px] text-bt-text-tertiary mt-1">{p.email}</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleExclude(p.id)}
                        className={`text-xs px-2 py-1 rounded-md transition-colors ${
                          isExcluded
                            ? 'bg-bt-green-bg text-bt-green'
                            : 'bg-bt-bg-alt text-bt-text-tertiary hover:text-bt-red hover:bg-bt-red-bg/50'
                        }`}
                      >
                        {isExcluded ? 'Include' : 'Skip'}
                      </button>
                    </div>

                    {p.opener && !isExcluded && (
                      <div className="mt-3 space-y-2">
                        <div>
                          <p className="text-[10px] font-semibold text-bt-teal uppercase tracking-wider mb-1">Subject</p>
                          <input
                            type="text"
                            value={p.subject || ''}
                            onChange={(e) => updateOpener(p.id, 'subject', e.target.value)}
                            className="w-full h-8 px-3 rounded-lg border border-bt-teal/30 bg-bt-teal/5 text-sm text-bt-text focus:outline-none focus:ring-2 focus:ring-bt-teal/50"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-bt-teal uppercase tracking-wider mb-1">Opener</p>
                          <textarea
                            value={p.opener}
                            onChange={(e) => updateOpener(p.id, 'opener', e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 rounded-lg border border-bt-teal/30 bg-bt-teal/5 text-sm text-bt-text focus:outline-none focus:ring-2 focus:ring-bt-teal/50 resize-y"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
