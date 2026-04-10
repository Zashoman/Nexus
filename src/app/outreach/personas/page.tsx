'use client';

import { Plus, Pencil, BarChart3 } from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';
import StatusIndicator from '@/components/outreach/ui/StatusIndicator';

interface PersonaCard {
  id: string;
  pen_name: string;
  initials: string;
  gradient: string;
  writing_style: string;
  emails_sent: number;
  reply_rate: number;
  placement_rate: number;
  active_campaigns: number;
  tone_keywords: string[];
  is_active: boolean;
}

const mockPersonas: PersonaCard[] = [
  {
    id: '1',
    pen_name: 'Sarah Mitchell',
    initials: 'SM',
    gradient: 'from-sky-400 to-blue-600',
    writing_style: 'Warm, conversational, and direct. Uses first-person extensively. Keeps emails short (under 150 words). Prefers casual openers and clear CTAs.',
    emails_sent: 342,
    reply_rate: 16.4,
    placement_rate: 7.2,
    active_campaigns: 2,
    tone_keywords: ['warm', 'casual', 'concise', 'friendly'],
    is_active: true,
  },
  {
    id: '2',
    pen_name: 'James Crawford',
    initials: 'JC',
    gradient: 'from-emerald-400 to-teal-600',
    writing_style: 'Professional and authoritative. Cites specific data points and industry trends. Longer, more detailed pitches (200-300 words). Formal but not stiff.',
    emails_sent: 289,
    reply_rate: 12.8,
    placement_rate: 6.1,
    active_campaigns: 2,
    tone_keywords: ['authoritative', 'data-driven', 'professional', 'detailed'],
    is_active: true,
  },
  {
    id: '3',
    pen_name: 'Emily Chen',
    initials: 'EC',
    gradient: 'from-violet-400 to-purple-600',
    writing_style: 'Thoughtful and research-oriented. References the publication\'s recent coverage. Medium-length emails with a focus on editorial value.',
    emails_sent: 198,
    reply_rate: 19.2,
    placement_rate: 8.6,
    active_campaigns: 1,
    tone_keywords: ['thoughtful', 'research-focused', 'collaborative'],
    is_active: true,
  },
  {
    id: '4',
    pen_name: 'David Park',
    initials: 'DP',
    gradient: 'from-orange-400 to-red-500',
    writing_style: 'Energetic and trend-focused. Leads with breaking news angles and timely hooks. Short, punchy subject lines. Fast follow-up cadence.',
    emails_sent: 156,
    reply_rate: 10.3,
    placement_rate: 4.5,
    active_campaigns: 1,
    tone_keywords: ['energetic', 'timely', 'punchy', 'trend-aware'],
    is_active: true,
  },
  {
    id: '5',
    pen_name: 'Rachel Torres',
    initials: 'RT',
    gradient: 'from-pink-400 to-rose-600',
    writing_style: 'Relationship-first approach. Focuses on building long-term editorial relationships. Slow, thoughtful cadence. Personal touches and callbacks to previous interactions.',
    emails_sent: 124,
    reply_rate: 21.8,
    placement_rate: 9.7,
    active_campaigns: 1,
    tone_keywords: ['relationship-driven', 'personal', 'patient', 'warm'],
    is_active: true,
  },
];

export default function PersonasPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Personas"
        subtitle="Manage editorial pen names and writing profiles"
        action={
          <Button icon={<Plus className="w-4 h-4" />}>New Persona</Button>
        }
      />

      {/* Persona cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockPersonas.map((persona) => (
          <Card key={persona.id} hover>
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${persona.gradient} flex items-center justify-center text-sm font-bold text-white`}>
                    {persona.initials}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-bt-text">{persona.pen_name}</h3>
                    <StatusIndicator status={persona.is_active ? 'active' : 'paused'} size="sm" />
                  </div>
                </div>
                <button className="p-1.5 rounded-md text-bt-text-tertiary hover:text-bt-text hover:bg-bt-bg-alt transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Writing style */}
              <p className="text-xs text-bt-text-secondary leading-relaxed mb-3 line-clamp-3">
                {persona.writing_style}
              </p>

              {/* Tone tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {persona.tone_keywords.map((keyword) => (
                  <Badge key={keyword} variant="default" size="sm">{keyword}</Badge>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-bt-border">
                <div>
                  <p className="text-[10px] text-bt-text-tertiary uppercase tracking-wider">Sent</p>
                  <p className="text-sm font-semibold text-bt-text tabular-nums">{persona.emails_sent}</p>
                </div>
                <div>
                  <p className="text-[10px] text-bt-text-tertiary uppercase tracking-wider">Reply</p>
                  <p className="text-sm font-semibold text-bt-text tabular-nums">{persona.reply_rate}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-bt-text-tertiary uppercase tracking-wider">Placed</p>
                  <p className="text-sm font-semibold text-bt-text tabular-nums">{persona.placement_rate}%</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-bt-border">
                <span className="text-[11px] text-bt-text-tertiary">
                  {persona.active_campaigns} active campaign{persona.active_campaigns !== 1 ? 's' : ''}
                </span>
                <Button variant="ghost" size="sm" icon={<BarChart3 className="w-3.5 h-3.5" />}>
                  Performance
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
