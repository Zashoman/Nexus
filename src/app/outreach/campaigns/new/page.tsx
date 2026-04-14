'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Megaphone,
  Pen,
  Link2,
  Target,
  Shield,
  Clock,
  MessageSquare,
} from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card from '@/components/outreach/ui/Card';
import Button from '@/components/outreach/ui/Button';
import Badge from '@/components/outreach/ui/Badge';
import { useAuth } from '@/components/outreach/AuthProvider';
import type { CampaignType, CampaignSensitivity } from '@/types/outreach';
import { apiFetch } from '@/lib/api-client';

type Step = 'type' | 'details' | 'goals' | 'constraints' | 'review';

const steps: { id: Step; label: string; icon: typeof Megaphone }[] = [
  { id: 'type', label: 'Campaign Type', icon: Megaphone },
  { id: 'details', label: 'Details', icon: MessageSquare },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'constraints', label: 'Constraints', icon: Shield },
  { id: 'review', label: 'Review & Launch', icon: Check },
];

const campaignTypes: {
  type: CampaignType;
  label: string;
  description: string;
  sensitivity: CampaignSensitivity;
  icon: typeof Megaphone;
  color: string;
}[] = [
  {
    type: 'editorial',
    label: 'Editorial Outreach',
    description: 'Secure guest post placements on target publications using distinct pen name personas.',
    sensitivity: 'very_high',
    icon: Pen,
    color: 'bg-bt-blue-bg text-bt-blue',
  },
  {
    type: 'sales',
    label: 'Sales Outreach',
    description: 'Convert prospects into paying Blue Tree clients with personalized, data-driven outreach.',
    sensitivity: 'high',
    icon: Megaphone,
    color: 'bg-bt-teal-bg text-bt-teal',
  },
  {
    type: 'sponsored_link',
    label: 'Sponsored Link',
    description: 'Broker sponsored link placements at scale with simple, high-volume outreach.',
    sensitivity: 'low',
    icon: Link2,
    color: 'bg-bt-primary-bg text-bt-primary',
  },
];

interface FormData {
  type: CampaignType | null;
  sensitivity: CampaignSensitivity;
  name: string;
  tone_guidelines: string;
  target_placements: string;
  target_meetings: string;
  deadline: string;
  max_daily_sends: string;
  polling_interval: string;
  timezone: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('type');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    type: null,
    sensitivity: 'medium',
    name: '',
    tone_guidelines: '',
    target_placements: '',
    target_meetings: '',
    deadline: '',
    max_daily_sends: '50',
    polling_interval: '15',
    timezone: 'America/New_York',
  });

  const stepIndex = steps.findIndex((s) => s.id === currentStep);

  const goNext = () => {
    const next = steps[stepIndex + 1];
    if (next) setCurrentStep(next.id);
  };

  const goBack = () => {
    const prev = steps[stepIndex - 1];
    if (prev) setCurrentStep(prev.id);
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'type': return form.type !== null;
      case 'details': return form.name.trim().length > 0;
      case 'goals': return true;
      case 'constraints': return true;
      case 'review': return true;
      default: return false;
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    setError(null);

    try {
      const goals: Record<string, unknown> = {};
      const placements = parseInt(form.target_placements);
      const meetings = parseInt(form.target_meetings);
      if (!isNaN(placements) && placements > 0) goals.target_placements = placements;
      if (!isNaN(meetings) && meetings > 0) goals.target_meetings = meetings;
      if (form.deadline) goals.deadline = form.deadline;

      const dailySends = parseInt(form.max_daily_sends);
      const pollingMin = parseInt(form.polling_interval);

      const res = await apiFetch('/api/outreach/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          sensitivity: form.sensitivity,
          status: 'draft',
          goals,
          constraints: {
            max_daily_sends: !isNaN(dailySends) && dailySends > 0 ? dailySends : 50,
          },
          tone_guidelines: form.tone_guidelines || null,
          polling_interval_minutes: !isNaN(pollingMin) && pollingMin > 0 ? pollingMin : 15,
          business_hours_timezone: form.timezone,
          created_by: user?.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create campaign');
      }

      router.push('/outreach/campaigns');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create campaign';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const selectType = (type: CampaignType, sensitivity: CampaignSensitivity) => {
    setForm({ ...form, type, sensitivity });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="New Campaign"
        subtitle="Set up a new outreach campaign step by step"
        action={
          <Button variant="ghost" onClick={() => router.push('/outreach/campaigns')} icon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
        }
      />

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((step, i) => {
          const isComplete = i < stepIndex;
          const isCurrent = step.id === currentStep;
          return (
            <div key={step.id} className="flex items-center gap-2 flex-1">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
                ${isComplete ? 'bg-bt-green text-white' : isCurrent ? 'bg-bt-primary text-white' : 'bg-bt-bg-alt text-bt-text-tertiary'}
              `}>
                {isComplete ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${isCurrent ? 'text-bt-text' : 'text-bt-text-tertiary'}`}>
                {step.label}
              </span>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px ${isComplete ? 'bg-bt-green' : 'bg-bt-border'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <Card>
        <div className="p-6">
          {/* Step 1: Campaign Type */}
          {currentStep === 'type' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-bt-text">What type of campaign?</h2>
              <div className="space-y-3">
                {campaignTypes.map((ct) => {
                  const Icon = ct.icon;
                  const selected = form.type === ct.type;
                  return (
                    <button
                      key={ct.type}
                      onClick={() => selectType(ct.type, ct.sensitivity)}
                      className={`
                        w-full text-left p-4 rounded-xl border-2 transition-all
                        ${selected
                          ? 'border-bt-primary bg-bt-primary-bg/30'
                          : 'border-bt-border hover:border-bt-border-strong hover:bg-bt-surface-hover'
                        }
                      `}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-lg ${ct.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-bt-text">{ct.label}</h3>
                            <Badge variant={ct.sensitivity === 'very_high' ? 'danger' : ct.sensitivity === 'high' ? 'warning' : 'default'} size="sm">
                              {ct.sensitivity.replace('_', ' ')} sensitivity
                            </Badge>
                          </div>
                          <p className="text-xs text-bt-text-secondary mt-1">{ct.description}</p>
                        </div>
                        {selected && (
                          <div className="w-5 h-5 rounded-full bg-bt-primary flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {currentStep === 'details' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-bt-text">Campaign details</h2>
              <div>
                <label className="block text-xs font-medium text-bt-text mb-1.5">Campaign name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Atera Guest Posts — Q2"
                  className="w-full h-10 px-4 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-bt-text mb-1.5">Tone guidelines (optional)</label>
                <textarea
                  value={form.tone_guidelines}
                  onChange={(e) => setForm({ ...form, tone_guidelines: e.target.value })}
                  rows={4}
                  placeholder="Describe the voice and tone for this campaign. e.g., 'Professional but warm. Reference specific details from the editor's recent articles. Keep under 200 words.'"
                  className="w-full px-4 py-2.5 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary focus:border-transparent resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 3: Goals */}
          {currentStep === 'goals' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-bt-text">Campaign goals</h2>
              <p className="text-xs text-bt-text-secondary">Set targets to track progress. All fields are optional.</p>
              <div className="grid grid-cols-2 gap-4">
                {(form.type === 'editorial' || form.type === 'sponsored_link') && (
                  <div>
                    <label className="block text-xs font-medium text-bt-text mb-1.5">
                      <Target className="w-3.5 h-3.5 inline mr-1" />
                      Target placements
                    </label>
                    <input
                      type="number"
                      value={form.target_placements}
                      onChange={(e) => setForm({ ...form, target_placements: e.target.value })}
                      placeholder="15"
                      className="w-full h-10 px-4 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary tabular-nums"
                    />
                  </div>
                )}
                {form.type === 'sales' && (
                  <div>
                    <label className="block text-xs font-medium text-bt-text mb-1.5">
                      <Target className="w-3.5 h-3.5 inline mr-1" />
                      Target meetings
                    </label>
                    <input
                      type="number"
                      value={form.target_meetings}
                      onChange={(e) => setForm({ ...form, target_meetings: e.target.value })}
                      placeholder="10"
                      className="w-full h-10 px-4 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary tabular-nums"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-bt-text mb-1.5">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="w-full h-10 px-4 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text focus:outline-none focus:ring-2 focus:ring-bt-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Constraints */}
          {currentStep === 'constraints' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-bt-text">Guardrails & constraints</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-bt-text mb-1.5">Max daily sends per inbox</label>
                  <input
                    type="number"
                    value={form.max_daily_sends}
                    onChange={(e) => setForm({ ...form, max_daily_sends: e.target.value })}
                    className="w-full h-10 px-4 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text focus:outline-none focus:ring-2 focus:ring-bt-primary tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-bt-text mb-1.5">Polling interval (minutes)</label>
                  <input
                    type="number"
                    value={form.polling_interval}
                    onChange={(e) => setForm({ ...form, polling_interval: e.target.value })}
                    className="w-full h-10 px-4 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text focus:outline-none focus:ring-2 focus:ring-bt-primary tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-bt-text mb-1.5">Timezone</label>
                <select
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  className="w-full h-10 px-4 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text focus:outline-none focus:ring-2 focus:ring-bt-primary"
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Asia/Manila">Manila (PHT)</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-bt-text">Review & launch</h2>

              {error && (
                <div className="p-3 rounded-lg bg-bt-red-bg border border-bt-red/20 text-sm text-bt-red">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-bt-border">
                  <span className="text-xs text-bt-text-secondary">Type</span>
                  <Badge variant="primary" size="sm">{form.type?.replace('_', ' ')}</Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-bt-border">
                  <span className="text-xs text-bt-text-secondary">Name</span>
                  <span className="text-sm font-medium text-bt-text">{form.name}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-bt-border">
                  <span className="text-xs text-bt-text-secondary">Sensitivity</span>
                  <Badge variant={form.sensitivity === 'very_high' ? 'danger' : form.sensitivity === 'high' ? 'warning' : 'default'} size="sm">
                    {form.sensitivity.replace('_', ' ')}
                  </Badge>
                </div>
                {(form.target_placements || form.target_meetings) && (
                  <div className="flex items-center justify-between py-2 border-b border-bt-border">
                    <span className="text-xs text-bt-text-secondary">Target</span>
                    <span className="text-sm font-medium text-bt-text">
                      {form.target_placements ? `${form.target_placements} placements` : `${form.target_meetings} meetings`}
                    </span>
                  </div>
                )}
                {form.deadline && (
                  <div className="flex items-center justify-between py-2 border-b border-bt-border">
                    <span className="text-xs text-bt-text-secondary">Deadline</span>
                    <span className="text-sm font-medium text-bt-text">{form.deadline}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b border-bt-border">
                  <span className="text-xs text-bt-text-secondary">Daily send limit</span>
                  <span className="text-sm font-medium text-bt-text tabular-nums">{form.max_daily_sends}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-bt-border">
                  <span className="text-xs text-bt-text-secondary">Polling interval</span>
                  <span className="text-sm font-medium text-bt-text tabular-nums">{form.polling_interval} min</span>
                </div>
              </div>

              <p className="text-xs text-bt-text-tertiary">
                Campaign will be created as a <strong>draft</strong>. You can activate it from the campaign detail page after connecting Instantly.
              </p>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between p-6 pt-0">
          <div>
            {stepIndex > 0 && (
              <Button variant="ghost" onClick={goBack} icon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
            )}
          </div>
          <div>
            {currentStep === 'review' ? (
              <Button onClick={handleCreate} loading={saving} icon={<Check className="w-4 h-4" />}>
                Create Campaign
              </Button>
            ) : (
              <Button onClick={goNext} disabled={!canProceed()} iconRight={<ArrowRight className="w-4 h-4" />}>
                Continue
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
