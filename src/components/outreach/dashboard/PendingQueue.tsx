'use client';

import { Check, Pencil, Clock, SkipForward, ChevronRight } from 'lucide-react';
import Card, { CardHeader } from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';

interface PendingDraft {
  id: string;
  contact_name: string;
  contact_email: string;
  campaign_name: string;
  persona_name?: string;
  classification: string;
  confidence: number;
  snippet: string;
  time_ago: string;
}

interface PendingQueueProps {
  drafts: PendingDraft[];
}

function getConfidenceBadge(confidence: number) {
  if (confidence >= 90) return 'success';
  if (confidence >= 70) return 'warning';
  return 'danger';
}

export default function PendingQueue({ drafts }: PendingQueueProps) {
  return (
    <Card padding="none">
      <div className="p-5 pb-3">
        <CardHeader
          title="Pending Approvals"
          subtitle={`${drafts.length} drafts awaiting review`}
          action={
            <Button variant="ghost" size="sm">
              View all
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          }
        />
      </div>
      <div className="divide-y divide-bt-border">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="px-5 py-4 hover:bg-bt-surface-hover transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-bt-text">
                    {draft.contact_name}
                  </p>
                  <Badge
                    variant={getConfidenceBadge(draft.confidence) as 'success' | 'warning' | 'danger'}
                    size="sm"
                  >
                    {draft.confidence}%
                  </Badge>
                </div>
                <p className="text-xs text-bt-text-secondary mt-0.5">
                  {draft.campaign_name}
                  {draft.persona_name && ` · ${draft.persona_name}`}
                </p>
              </div>
              <span className="text-[11px] text-bt-text-tertiary">{draft.time_ago}</span>
            </div>

            <p className="text-xs text-bt-text-secondary leading-relaxed mb-3 line-clamp-2">
              {draft.snippet}
            </p>

            <div className="flex items-center gap-1.5">
              <Button variant="success" size="sm" icon={<Check className="w-3.5 h-3.5" />}>
                Approve
              </Button>
              <Button variant="secondary" size="sm" icon={<Pencil className="w-3 h-3" />}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" icon={<Clock className="w-3.5 h-3.5" />}>
                Delay
              </Button>
              <Button variant="ghost" size="sm" icon={<SkipForward className="w-3.5 h-3.5" />}>
                Skip
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
