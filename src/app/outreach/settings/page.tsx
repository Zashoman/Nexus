'use client';

import { useState } from 'react';
import {
  Zap,
  Search as SearchIcon,
  Globe,
  MessageSquare,
  Users,
  Shield,
  Bell,
  CheckCircle2,
  XCircle,
  ExternalLink,
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

interface Integration {
  name: string;
  description: string;
  icon: typeof Zap;
  connected: boolean;
  status?: string;
}

const integrations: Integration[] = [
  {
    name: 'Instantly',
    description: 'Email automation platform for campaign management and inbox monitoring',
    icon: Zap,
    connected: false,
    status: 'Not connected',
  },
  {
    name: 'Apollo',
    description: 'Prospect enrichment and contact data for sales campaigns',
    icon: SearchIcon,
    connected: false,
    status: 'Not connected',
  },
  {
    name: 'HubSpot',
    description: 'CRM for contact management, deal tracking, and activity logging',
    icon: Globe,
    connected: false,
    status: 'Not connected',
  },
  {
    name: 'Slack',
    description: 'Team notifications, draft approvals, and command interface',
    icon: MessageSquare,
    connected: false,
    status: 'Not connected',
  },
];

const mockTeam = [
  { name: 'Zack Oman', email: 'zack@bluetree.digital', role: 'Admin', status: 'Active' },
  { name: 'Manila Team Lead', email: 'lead@bluetree.digital', role: 'Manager', status: 'Active' },
  { name: 'Team Member 1', email: 'team1@bluetree.digital', role: 'Team Member', status: 'Invited' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('integrations');

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
          {integrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <Card key={integration.name}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-bt-bg-alt">
                      <Icon className="w-5 h-5 text-bt-text-secondary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-bt-text">{integration.name}</h3>
                        {integration.connected ? (
                          <Badge variant="success" size="sm" dot>Connected</Badge>
                        ) : (
                          <Badge variant="default" size="sm" dot>Not connected</Badge>
                        )}
                      </div>
                      <p className="text-xs text-bt-text-secondary mt-0.5">{integration.description}</p>
                    </div>
                  </div>
                  <Button
                    variant={integration.connected ? 'secondary' : 'primary'}
                    size="sm"
                    icon={integration.connected
                      ? <CheckCircle2 className="w-3.5 h-3.5" />
                      : <ExternalLink className="w-3.5 h-3.5" />
                    }
                  >
                    {integration.connected ? 'Configure' : 'Connect'}
                  </Button>
                </div>
              </Card>
            );
          })}
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
                      <Badge variant={member.role === 'Admin' ? 'primary' : member.role === 'Manager' ? 'info' : 'default'} size="sm">
                        {member.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      {member.status === 'Active' ? (
                        <Badge variant="success" size="sm" dot>Active</Badge>
                      ) : (
                        <Badge variant="warning" size="sm" dot>Invited</Badge>
                      )}
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
