import {
  Mail,
  MailCheck,
  Send,
  Megaphone,
  AlertTriangle,
  ThumbsUp,
} from 'lucide-react';
import Card, { CardHeader } from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import type { ActivityItem, CampaignType } from '@/types/outreach';

const activityIcons: Record<ActivityItem['type'], typeof Mail> = {
  reply_received: Mail,
  draft_approved: ThumbsUp,
  email_sent: Send,
  campaign_created: Megaphone,
  escalation: AlertTriangle,
  feedback: MailCheck,
};

const activityColors: Record<ActivityItem['type'], string> = {
  reply_received: 'bg-bt-blue-bg text-bt-blue',
  draft_approved: 'bg-bt-green-bg text-bt-green',
  email_sent: 'bg-bt-teal-bg text-bt-teal',
  campaign_created: 'bg-bt-primary-bg text-bt-primary',
  escalation: 'bg-bt-red-bg text-bt-red',
  feedback: 'bg-bt-amber-bg text-bt-amber',
};

const campaignTypeBadge: Record<CampaignType, 'info' | 'teal' | 'primary'> = {
  editorial: 'info',
  sales: 'teal',
  sponsored_link: 'primary',
};

interface ActivityFeedProps {
  items: ActivityItem[];
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card padding="none">
      <div className="p-5 pb-3">
        <CardHeader title="Recent Activity" subtitle="Latest events across all campaigns" />
      </div>
      <div className="divide-y divide-bt-border">
        {items.map((item) => {
          const Icon = activityIcons[item.type];
          return (
            <div
              key={item.id}
              className="flex items-start gap-3 px-5 py-3.5 hover:bg-bt-surface-hover transition-colors"
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${activityColors[item.type]}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-bt-text">
                  <span className="font-medium">{item.title}</span>
                </p>
                <p className="text-xs text-bt-text-secondary mt-0.5 truncate">
                  {item.description}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant={campaignTypeBadge[item.campaign_type]} size="sm">
                    {item.campaign_name}
                  </Badge>
                  {item.persona_name && (
                    <Badge variant="default" size="sm">{item.persona_name}</Badge>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-bt-text-tertiary shrink-0 tabular-nums">
                {formatTimeAgo(item.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
