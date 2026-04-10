'use client';

import { useState } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  Star,
  TrendingUp,
  BookOpen,
  BarChart3,
} from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card, { CardHeader } from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';

type FeedbackTab = 'recent' | 'teach' | 'scorecard';

const tabs: { id: FeedbackTab; label: string; icon: typeof Star }[] = [
  { id: 'recent', label: 'Recent Drafts', icon: Star },
  { id: 'teach', label: 'Teach the Agent', icon: BookOpen },
  { id: 'scorecard', label: 'Accuracy Scorecard', icon: BarChart3 },
];

interface RecentDraft {
  id: string;
  contact_name: string;
  campaign_name: string;
  persona_name?: string;
  original_draft: string;
  final_version: string;
  was_revised: boolean;
  feedback_type: string;
  quality_rating?: number;
  time_ago: string;
}

const mockDrafts: RecentDraft[] = [
  {
    id: '1',
    contact_name: 'David Kim — TechCrunch',
    campaign_name: 'Atera Guest Posts',
    persona_name: 'Sarah',
    original_draft: 'Hi David, Thanks for your interest! I\'d love to send over a draft. The piece would focus on how SMBs can leverage AI-powered cybersecurity tools without enterprise budgets. I can have it ready by next Wednesday. Would that timeline work for you?',
    final_version: 'Hi David, Thanks for your interest! I\'d love to send over a draft. The piece would focus on how SMBs can leverage AI-powered cybersecurity tools without enterprise budgets. I can have it ready by next Wednesday. Would that timeline work for you?',
    was_revised: false,
    feedback_type: 'confirmed',
    quality_rating: 5,
    time_ago: '2 hours ago',
  },
  {
    id: '2',
    contact_name: 'Lisa Wang — Wired',
    campaign_name: 'Atera Guest Posts',
    persona_name: 'James',
    original_draft: 'Dear Lisa, Thank you for your response. We would be pleased to adjust the angle of our proposed article to focus more on the regulatory implications of AI in cybersecurity.',
    final_version: 'Hi Lisa, That\'s a great suggestion — the regulatory angle is fascinating and timely. I\'ll rework the pitch to center on how new EU regulations are forcing mid-market companies to rethink their security stack. Should have a revised outline to you by Thursday.',
    was_revised: true,
    feedback_type: 'revised',
    quality_rating: 2,
    time_ago: '5 hours ago',
  },
  {
    id: '3',
    contact_name: 'Marcus Rodriguez — Fintech Weekly',
    campaign_name: 'BT Sales — Fintech',
    original_draft: 'Hi Marcus, Great to hear you\'re interested! I have availability next Tuesday at 2pm, Wednesday at 10am, or Thursday at 3pm EST. Would any of those work?',
    final_version: 'Hi Marcus, Great to hear you\'re interested! I have availability next Tuesday at 2pm, Wednesday at 10am, or Thursday at 3pm EST. Would any of those work? Looking forward to showing you how we helped Stripe\'s content team scale their thought leadership.',
    was_revised: true,
    feedback_type: 'revised',
    quality_rating: 4,
    time_ago: '8 hours ago',
  },
];

const weeklyScores = [
  { week: 'This week', confirmed: 68, minor_edit: 22, major_rewrite: 8, wrong: 2 },
  { week: 'Last week', confirmed: 62, minor_edit: 25, major_rewrite: 10, wrong: 3 },
  { week: '2 weeks ago', confirmed: 55, minor_edit: 28, major_rewrite: 12, wrong: 5 },
  { week: '3 weeks ago', confirmed: 48, minor_edit: 30, major_rewrite: 15, wrong: 7 },
];

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < rating ? 'text-bt-amber fill-bt-amber' : 'text-bt-border'}`}
        />
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const [activeTab, setActiveTab] = useState<FeedbackTab>('recent');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback & Training"
        subtitle="Review agent drafts and help it learn your voice"
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-bt-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
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
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Recent Drafts */}
      {activeTab === 'recent' && (
        <div className="space-y-4">
          {mockDrafts.map((draft) => (
            <Card key={draft.id} padding="none">
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-bt-text">{draft.contact_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="default" size="sm">{draft.campaign_name}</Badge>
                      {draft.persona_name && <Badge variant="info" size="sm">{draft.persona_name}</Badge>}
                      {draft.was_revised ? (
                        <Badge variant="warning" size="sm" dot>Revised</Badge>
                      ) : (
                        <Badge variant="success" size="sm" dot>Confirmed as-is</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-bt-text-tertiary">{draft.time_ago}</span>
                    {draft.quality_rating && (
                      <div className="mt-1">
                        <StarRating rating={draft.quality_rating} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Side by side comparison if revised */}
                {draft.was_revised ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold text-bt-text-tertiary uppercase tracking-wider mb-2">Agent Draft</p>
                      <div className="bg-bt-red-bg/30 rounded-lg p-3">
                        <p className="text-xs text-bt-text leading-relaxed">{draft.original_draft}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-bt-text-tertiary uppercase tracking-wider mb-2">Final Version</p>
                      <div className="bg-bt-green-bg/30 rounded-lg p-3">
                        <p className="text-xs text-bt-text leading-relaxed">{draft.final_version}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[10px] font-semibold text-bt-text-tertiary uppercase tracking-wider mb-2">Agent Draft (approved as-is)</p>
                    <div className="bg-bt-green-bg/30 rounded-lg p-3">
                      <p className="text-xs text-bt-text leading-relaxed">{draft.final_version}</p>
                    </div>
                  </div>
                )}

                {/* Quick feedback */}
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-bt-border">
                  <span className="text-xs text-bt-text-secondary">How close was this draft?</span>
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" icon={<ThumbsUp className="w-3.5 h-3.5" />}>Perfect</Button>
                    <Button variant="ghost" size="sm">Minor edits</Button>
                    <Button variant="ghost" size="sm">Major rewrite</Button>
                    <Button variant="ghost" size="sm" icon={<ThumbsDown className="w-3.5 h-3.5" />}>Wrong approach</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Teach the Agent */}
      {activeTab === 'teach' && (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Submit Example Emails"
              subtitle="Paste emails you've written that you consider excellent. Tag by campaign type and persona."
            />
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-bt-text mb-1.5">Campaign Type</label>
                <select className="w-full h-9 px-3 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text focus:outline-none focus:ring-2 focus:ring-bt-primary">
                  <option>Editorial</option>
                  <option>Sales</option>
                  <option>Sponsored Link</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-bt-text mb-1.5">Persona (optional)</label>
                <select className="w-full h-9 px-3 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text focus:outline-none focus:ring-2 focus:ring-bt-primary">
                  <option value="">Select persona...</option>
                  <option>Sarah Mitchell</option>
                  <option>James Crawford</option>
                  <option>Emily Chen</option>
                  <option>David Park</option>
                  <option>Rachel Torres</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-bt-text mb-1.5">Email content</label>
                <textarea
                  rows={6}
                  placeholder="Paste your example email here..."
                  className="w-full px-3 py-2 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-bt-text mb-1.5">Context / notes (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., 'This landed a placement on TechCrunch'"
                  className="w-full h-9 px-3 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary"
                />
              </div>
              <Button icon={<BookOpen className="w-4 h-4" />}>Submit Example</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Accuracy Scorecard */}
      {activeTab === 'scorecard' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <div className="text-center">
                <TrendingUp className="w-8 h-8 text-bt-green mx-auto mb-2" />
                <p className="text-3xl font-bold text-bt-text">68%</p>
                <p className="text-xs text-bt-text-secondary mt-1">Confirmed as-is this week</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <Star className="w-8 h-8 text-bt-amber mx-auto mb-2" />
                <p className="text-3xl font-bold text-bt-text">4.1</p>
                <p className="text-xs text-bt-text-secondary mt-1">Average quality rating</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <TrendingUp className="w-8 h-8 text-bt-primary mx-auto mb-2" />
                <p className="text-3xl font-bold text-bt-text">+20%</p>
                <p className="text-xs text-bt-text-secondary mt-1">Improvement over 4 weeks</p>
              </div>
            </Card>
          </div>

          {/* Weekly breakdown */}
          <Card padding="none">
            <div className="p-5 pb-3">
              <CardHeader title="Weekly Accuracy Trend" subtitle="Percentage of drafts by feedback type" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-y border-bt-border">
                    <th className="text-left text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-5 py-3">Week</th>
                    <th className="text-right text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">Confirmed</th>
                    <th className="text-right text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">Minor Edit</th>
                    <th className="text-right text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">Major Rewrite</th>
                    <th className="text-right text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">Wrong</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bt-border">
                  {weeklyScores.map((week) => (
                    <tr key={week.week} className="hover:bg-bt-surface-hover transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-bt-text">{week.week}</td>
                      <td className="px-4 py-3.5 text-right text-sm font-semibold text-bt-green tabular-nums">{week.confirmed}%</td>
                      <td className="px-4 py-3.5 text-right text-sm text-bt-amber tabular-nums">{week.minor_edit}%</td>
                      <td className="px-4 py-3.5 text-right text-sm text-bt-red tabular-nums">{week.major_rewrite}%</td>
                      <td className="px-4 py-3.5 text-right text-sm text-bt-red tabular-nums">{week.wrong}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
