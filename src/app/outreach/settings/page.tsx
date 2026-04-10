'use client';

import { useState, useEffect } from 'react';
import {
  Zap,
  Globe,
  MessageSquare,
  Users,
  Shield,
  Bell,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card, { CardHeader } from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';

type SettingsTab = 'integrations' | 'team' | 'guardrails' | 'notifications';

const settingsTabs: { id: SettingsTab; label: string; icon: typeof Zap }[] = [
  { id: 'integrations', label: 'Integrations', icon: Zap },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'guardrails', label: 'Guardrails', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

interface InstantlyCampaign {
  id: string;
  name: string;
  status: string;
}

const mockTeam = [
  { name: 'Blue Tree', email: 'admin@bluetree.digital', role: 'Admin', status: 'Active' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('integrations');

  // Instantly connection state
  const [instantlyConnected, setInstantlyConnected] = useState(false);
  const [instantlyLoading, setInstantlyLoading] = useState(false);
  const [instantlyError, setInstantlyError] = useState<string | null>(null);
  const [instantlyCampaigns, setInstantlyCampaigns] = useState<InstantlyCampaign[]>([]);
  const [campaignCount, setCampaignCount] = useState<number>(0);

  const testInstantly = async () => {
    setInstantlyLoading(true);
    setInstantlyError(null);
    try {
      const res = await fetch('/api/outreach/instantly/test');
      const data = await res.json();
      if (data.ok) {
        setInstantlyConnected(true);
        setCampaignCount(data.campaign_count || 0);
      } else {
        setInstantlyError(data.error || 'Connection failed');
        setInstantlyConnected(false);
      }
    } catch {
      setInstantlyError('Failed to reach API');
      setInstantlyConnected(false);
    } finally {
      setInstantlyLoading(false);
    }
  };

  const loadInstantlyCampaigns = async () => {
    try {
      const res = await fetch('/api/outreach/instantly/campaigns');
      const data = await res.json();
      setInstantlyCampaigns(data.campaigns || []);
    } catch {
      setInstantlyError('Failed to load campaigns');
    }
  };

  useEffect(() => {
    testInstantly();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Configure integrations, team access, and guardrails"
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-bt-border">
        {settingsTabs.map((tab) => {
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

      {/* Integrations tab */}
      {activeTab === 'integrations' && (
        <div className="space-y-4">
          {/* Instantly — LIVE */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-bt-bg-alt">
                  <Zap className="w-5 h-5 text-bt-text-secondary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-bt-text">Instantly</h3>
                    {instantlyLoading ? (
                      <Badge variant="default" size="sm"><Loader2 className="w-3 h-3 animate-spin" /> Checking...</Badge>
                    ) : instantlyConnected ? (
                      <Badge variant="success" size="sm" dot>Connected — {campaignCount} campaigns</Badge>
                    ) : (
                      <Badge variant="danger" size="sm" dot>Not connected</Badge>
                    )}
                  </div>
                  <p className="text-xs text-bt-text-secondary mt-0.5">
                    Email automation platform — READ-ONLY mode (no emails will be sent)
                  </p>
                  {instantlyError && (
                    <p className="text-xs text-bt-red mt-1">{instantlyError}</p>
                  )}
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={testInstantly}
                loading={instantlyLoading}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Test
              </Button>
            </div>

            {/* Show campaigns when connected */}
            {instantlyConnected && (
              <div className="mt-4 pt-4 border-t border-bt-border">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-bt-text-secondary uppercase tracking-wider">
                    Instantly Campaigns
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadInstantlyCampaigns}
                    icon={<RefreshCw className="w-3 h-3" />}
                  >
                    Load campaigns
                  </Button>
                </div>

                {instantlyCampaigns.length === 0 ? (
                  <p className="text-xs text-bt-text-tertiary">
                    Click &quot;Load campaigns&quot; to see your Instantly campaigns
                  </p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {instantlyCampaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-bt-bg-alt"
                      >
                        <div>
                          <p className="text-sm text-bt-text">{campaign.name}</p>
                          <p className="text-[10px] text-bt-text-tertiary font-mono">{campaign.id}</p>
                        </div>
                        <Badge
                          variant={
                            campaign.status === 'active' ? 'success' :
                            campaign.status === 'paused' ? 'warning' :
                            campaign.status === 'completed' ? 'info' :
                            'default'
                          }
                          size="sm"
                        >
                          {campaign.status || 'unknown'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Apollo — not connected yet */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-bt-bg-alt">
                  <Globe className="w-5 h-5 text-bt-text-secondary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-bt-text">Apollo</h3>
                    <Badge variant="default" size="sm" dot>Not connected</Badge>
                  </div>
                  <p className="text-xs text-bt-text-secondary mt-0.5">Prospect enrichment and contact data for sales campaigns</p>
                </div>
              </div>
              <Button variant="primary" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                Connect
              </Button>
            </div>
          </Card>

          {/* HubSpot — not connected yet */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-bt-bg-alt">
                  <Globe className="w-5 h-5 text-bt-text-secondary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-bt-text">HubSpot</h3>
                    <Badge variant="default" size="sm" dot>Not connected</Badge>
                  </div>
                  <p className="text-xs text-bt-text-secondary mt-0.5">CRM for contact management, deal tracking, and activity logging</p>
                </div>
              </div>
              <Button variant="primary" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                Connect
              </Button>
            </div>
          </Card>

          {/* Slack — not connected yet */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-bt-bg-alt">
                  <MessageSquare className="w-5 h-5 text-bt-text-secondary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-bt-text">Slack</h3>
                    <Badge variant="default" size="sm" dot>Not connected</Badge>
                  </div>
                  <p className="text-xs text-bt-text-secondary mt-0.5">Team notifications, draft approvals, and command interface</p>
                </div>
              </div>
              <Button variant="primary" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                Connect
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Team tab */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-bt-text-secondary">Manage who has access to the outreach platform</p>
            <Button size="sm" icon={<Users className="w-3.5 h-3.5" />}>Invite member</Button>
          </div>
          <Card padding="none">
            <table className="w-full">
              <thead>
                <tr className="border-b border-bt-border">
                  <th className="text-left text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-5 py-3">Name</th>
                  <th className="text-left text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">Email</th>
                  <th className="text-left text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">Role</th>
                  <th className="text-left text-[11px] font-semibold text-bt-text-secondary uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-bt-border">
                {mockTeam.map((member) => (
                  <tr key={member.email} className="hover:bg-bt-surface-hover transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-bt-primary-light to-bt-teal flex items-center justify-center text-xs font-bold text-white">
                          {member.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <span className="text-sm font-medium text-bt-text">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-bt-text-secondary">{member.email}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant={member.role === 'Admin' ? 'primary' : 'default'} size="sm">
                        {member.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="success" size="sm" dot>{member.status}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Guardrails tab */}
      {activeTab === 'guardrails' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Send Limits" subtitle="Maximum emails per inbox per day" />
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-bt-text">Default daily send limit</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    defaultValue={50}
                    className="w-20 h-8 px-3 rounded-md border border-bt-border bg-bt-surface text-sm text-bt-text text-right focus:outline-none focus:ring-2 focus:ring-bt-primary tabular-nums"
                  />
                  <span className="text-xs text-bt-text-secondary">per inbox</span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Blacklist" subtitle="Contacts and domains that should never be contacted" />
            <div className="mt-4">
              <div className="h-24 rounded-lg bg-bt-bg-alt border border-bt-border border-dashed flex items-center justify-center">
                <div className="text-center">
                  <XCircle className="w-6 h-6 text-bt-text-tertiary mx-auto mb-1" />
                  <p className="text-xs text-bt-text-tertiary">No blacklisted contacts yet</p>
                  <Button variant="ghost" size="sm" className="mt-2">Add entry</Button>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Escalation Triggers" subtitle="Keywords and patterns that trigger automatic escalation" />
            <div className="mt-4 space-y-2">
              {['angry', 'legal', 'lawsuit', 'unsubscribe', 'stop emailing', 'competitor mention'].map((keyword) => (
                <div key={keyword} className="flex items-center justify-between py-1.5">
                  <Badge variant="danger" size="sm">{keyword}</Badge>
                  <button className="text-xs text-bt-text-tertiary hover:text-bt-red transition-colors">Remove</button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Notifications tab */}
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
                <input
                  type="time"
                  defaultValue="09:00"
                  className="h-8 px-3 rounded-md border border-bt-border bg-bt-surface text-sm text-bt-text focus:outline-none focus:ring-2 focus:ring-bt-primary"
                />
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
              <div className="flex items-center justify-between">
                <span className="text-sm text-bt-text">Day of week</span>
                <select className="h-8 px-3 rounded-md border border-bt-border bg-bt-surface text-sm text-bt-text focus:outline-none focus:ring-2 focus:ring-bt-primary">
                  <option>Monday</option>
                  <option>Tuesday</option>
                  <option>Wednesday</option>
                  <option>Thursday</option>
                  <option>Friday</option>
                </select>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Slack Channels" subtitle="Where notifications are delivered" />
            <div className="mt-4">
              <div className="h-16 rounded-lg bg-bt-bg-alt border border-bt-border border-dashed flex items-center justify-center">
                <p className="text-xs text-bt-text-tertiary">Connect Slack to configure channels</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
