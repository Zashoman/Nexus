import {
  Inbox,
  Send,
  Mail,
  TrendingUp,
} from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import MetricCard from '@/components/outreach/ui/MetricCard';
import CampaignCard from '@/components/outreach/dashboard/CampaignCard';
import ActivityFeed from '@/components/outreach/dashboard/ActivityFeed';
import PendingQueue from '@/components/outreach/dashboard/PendingQueue';
import type { ActivityItem } from '@/types/outreach';

// Demo data — replaced with Supabase queries in Phase 2+
const mockMetrics = {
  pending_approvals: 7,
  emails_sent_today: 34,
  replies_received: 12,
  positive_reply_rate: 18.4,
};

const mockCampaigns = [
  {
    id: '1',
    name: 'Atera Guest Posts — Q2',
    type: 'editorial' as const,
    health: 'on_track' as const,
    pending: 3,
    achieved: 8,
    target: 15,
    metric_label: 'placements',
    reply_rate: 14.2,
    days_remaining: 52,
  },
  {
    id: '2',
    name: 'Blue Tree Sales — Series B Fintech',
    type: 'sales' as const,
    health: 'needs_attention' as const,
    pending: 2,
    achieved: 3,
    target: 10,
    metric_label: 'meetings',
    reply_rate: 22.5,
    days_remaining: 18,
  },
  {
    id: '3',
    name: 'Sponsored Links — Cybersecurity',
    type: 'sponsored_link' as const,
    health: 'on_track' as const,
    pending: 2,
    achieved: 22,
    target: 30,
    metric_label: 'placements',
    reply_rate: 8.7,
    days_remaining: 37,
  },
];

const mockPendingDrafts = [
  {
    id: '1',
    contact_name: 'Sarah Chen',
    contact_email: 'sarah@techcrunch.com',
    campaign_name: 'Atera Guest Posts — Q2',
    persona_name: 'Sarah',
    classification: 'Interested in topic',
    confidence: 94,
    snippet: '"Thanks for reaching out. We\'re interested in the cybersecurity angle. Can you send me a draft by Friday?"',
    time_ago: '12m ago',
  },
  {
    id: '2',
    contact_name: 'Marcus Rodriguez',
    contact_email: 'marcus@fintech-weekly.com',
    campaign_name: 'Blue Tree Sales — Series B Fintech',
    classification: 'Meeting request',
    confidence: 88,
    snippet: '"This sounds interesting. Could we set up a 30-minute call next week to discuss further?"',
    time_ago: '45m ago',
  },
  {
    id: '3',
    contact_name: 'Emma Johnson',
    contact_email: 'emma@wired.com',
    campaign_name: 'Atera Guest Posts — Q2',
    persona_name: 'James',
    classification: 'Wants different angle',
    confidence: 76,
    snippet: '"We covered something similar last month. Do you have a different take on this? Maybe focused on SMB rather than enterprise?"',
    time_ago: '2h ago',
  },
];

const mockActivity: ActivityItem[] = [
  {
    id: '1',
    type: 'reply_received',
    title: 'New reply from Sarah Chen',
    description: 'Interested in the cybersecurity angle — wants a draft by Friday',
    campaign_name: 'Atera Guest Posts',
    campaign_type: 'editorial',
    persona_name: 'Sarah',
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
  },
  {
    id: '2',
    type: 'draft_approved',
    title: 'Draft approved for David Kim',
    description: 'Follow-up email sent with updated pricing for DR 60+ sites',
    campaign_name: 'Sponsored Links',
    campaign_type: 'sponsored_link',
    timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
  },
  {
    id: '3',
    type: 'email_sent',
    title: 'Email sent to Marcus Rodriguez',
    description: 'Meeting scheduling email — proposed 3 time slots for next week',
    campaign_name: 'BT Sales',
    campaign_type: 'sales',
    timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
  },
  {
    id: '4',
    type: 'escalation',
    title: 'Escalation — angry reply from Tom Baker',
    description: '"Stop emailing me" — flagged for senior review. Contact added to cool-off list.',
    campaign_name: 'Sponsored Links',
    campaign_type: 'sponsored_link',
    timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: '5',
    type: 'feedback',
    title: 'Draft revised by Zack',
    description: 'Changed tone from formal to casual for VentureBeat pitch — persona: James',
    campaign_name: 'Atera Guest Posts',
    campaign_type: 'editorial',
    persona_name: 'James',
    timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: '6',
    type: 'campaign_created',
    title: 'New campaign created',
    description: 'Blue Tree Sales — Series B Fintech CTOs targeting 50 prospects',
    campaign_name: 'BT Sales',
    campaign_type: 'sales',
    timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function OutreachOverview() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`${getGreeting()}`}
        subtitle={today}
      />

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Pending Approvals"
          value={mockMetrics.pending_approvals}
          icon={<Inbox className="w-5 h-5 text-bt-primary" />}
          iconBg="bg-bt-primary-bg"
        />
        <MetricCard
          label="Sent Today"
          value={mockMetrics.emails_sent_today}
          change={12}
          changeLabel="vs yesterday"
          icon={<Send className="w-5 h-5 text-bt-teal" />}
          iconBg="bg-bt-teal-bg"
        />
        <MetricCard
          label="Replies Today"
          value={mockMetrics.replies_received}
          change={-5}
          changeLabel="vs yesterday"
          icon={<Mail className="w-5 h-5 text-bt-blue" />}
          iconBg="bg-bt-blue-bg"
        />
        <MetricCard
          label="Positive Reply Rate"
          value={`${mockMetrics.positive_reply_rate}%`}
          change={2.3}
          changeLabel="7d trend"
          icon={<TrendingUp className="w-5 h-5 text-bt-green" />}
          iconBg="bg-bt-green-bg"
        />
      </div>

      {/* Active Campaigns */}
      <div>
        <h2 className="text-sm font-semibold text-bt-text mb-3">Active Campaigns</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {mockCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} {...campaign} />
          ))}
        </div>
      </div>

      {/* Bottom section: Pending approvals + Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PendingQueue drafts={mockPendingDrafts} />
        <ActivityFeed items={mockActivity} />
      </div>
    </div>
  );
}
